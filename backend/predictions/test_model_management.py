"""
Comprehensive test suite for Phase 9: Enterprise Model Management, Versioning & Evaluation.
"""

import json
import os
import shutil
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure root and backend are in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

import numpy as np
import pandas as pd
from unittest import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from xgboost import XGBClassifier

from ml.inference.exceptions import InferenceError, ModelNotFoundError
from ml.inference.prediction_service import PredictionService
from ml.models.model_registry import (
    ARTIFACT_DIR,
    ModelRegistry,
    load_metadata,
    load_model,
    save_model,
)
from ml.training.train_xgboost_classifier import (
    FEATURE_COLUMNS,
    evaluate_classifier,
    evaluate_majority_baseline,
    train_xgboost_classifier,
)
from predictions.models import ModelEvaluation, ModelVersion, Prediction
from stocks.models import Stock


class TestModelRegistryAndLifecycle(TestCase):
    """Test suite covering model registration, versioning, promotion, rollback, and cache invalidation."""

    def setUp(self):
        self.client = APIClient()
        self.symbol = "TEST.NS"
        self.model_type = "xgboost_classifier"

        # Clean up any test records and artifacts before each test
        ModelVersion.objects.filter(symbol=self.symbol).delete()
        safe_sym = self.symbol.replace(".", "_")
        for p in ARTIFACT_DIR.glob(f"*{safe_sym}*"):
            try:
                p.unlink()
            except Exception:
                pass

        # Create dummy stock
        self.stock, _ = Stock.objects.get_or_create(
            symbol=self.symbol,
            defaults={"company_name": "Test Company", "exchange": "NSE"},
        )

        # Clear PredictionService cache before each test
        PredictionService.clear_cache()

        # Dummy model & data
        self.dummy_model = XGBClassifier(n_estimators=10, max_depth=2, random_state=42)
        X = np.random.randn(20, len(FEATURE_COLUMNS))
        y = np.random.randint(0, 2, size=20)
        self.dummy_model.fit(X, y)

        self.dummy_metrics = {
            "accuracy": 0.85,
            "precision": 0.80,
            "recall": 0.90,
            "f1": 0.847,
            "roc_auc": 0.88,
        }

    def tearDown(self):
        PredictionService.clear_cache()
        # Clean up any test artifacts and DB records created during tests
        ModelVersion.objects.filter(symbol=self.symbol).delete()
        safe_sym = self.symbol.replace(".", "_")
        for p in ARTIFACT_DIR.glob(f"*{safe_sym}*"):
            try:
                p.unlink()
            except Exception:
                pass

    # 1. Register model
    def test_01_register_model(self):
        """Verify model can be registered with candidate status and persisted."""
        result = save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="candidate",
        )
        self.assertEqual(result["version"], "v1")
        self.assertEqual(result["status"], "candidate")
        self.assertTrue(Path(result["model_path"]).exists())
        self.assertTrue(Path(result["metadata_path"]).exists())

        # Check DB record
        mv = ModelVersion.objects.filter(symbol=self.symbol, version="v1").first()
        self.assertIsNotNone(mv)
        self.assertEqual(mv.status, "candidate")
        self.assertEqual(mv.feature_schema_version, "v1")
        self.assertEqual(len(mv.features), len(FEATURE_COLUMNS))

    # 2. Register multiple versions
    def test_02_register_multiple_versions(self):
        """Verify multiple versions can coexist for the same symbol without collision."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="production",
        )
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v2",
            status="candidate",
        )

        v1 = ModelVersion.objects.filter(symbol=self.symbol, version="v1").first()
        v2 = ModelVersion.objects.filter(symbol=self.symbol, version="v2").first()

        self.assertIsNotNone(v1)
        self.assertIsNotNone(v2)
        self.assertEqual(v1.status, "production")
        self.assertEqual(v2.status, "candidate")

    # 3. Duplicate version rejected / updated idempotently in registry
    def test_03_duplicate_version_handling(self):
        """Verify duplicate version registration updates record rather than corrupting DB."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="candidate",
        )
        # Re-save same version with updated metric
        updated_metrics = {**self.dummy_metrics, "accuracy": 0.95}
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=updated_metrics,
            version="v1",
            status="candidate",
        )

        count = ModelVersion.objects.filter(symbol=self.symbol, version="v1").count()
        self.assertEqual(count, 1)
        mv = ModelVersion.objects.get(symbol=self.symbol, version="v1")
        self.assertEqual(mv.metrics["accuracy"], 0.95)

    # 4. Metadata saved correctly
    def test_04_metadata_saved_correctly(self):
        """Verify metadata JSON contains all required provenance fields."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="candidate",
            hyperparameters={"n_estimators": 10},
        )
        meta = load_metadata(self.symbol, self.model_type, "v1")
        self.assertEqual(meta["symbol"], self.symbol)
        self.assertEqual(meta["model_type"], self.model_type)
        self.assertEqual(meta["version"], "v1")
        self.assertEqual(meta["status"], "candidate")
        self.assertEqual(meta["feature_schema_version"], "v1")
        self.assertEqual(meta["hyperparameters"]["n_estimators"], 10)
        self.assertEqual(meta["features"], FEATURE_COLUMNS)
        self.assertIn("accuracy", meta["metrics"])

    # 5. Artifact existence validated
    def test_05_artifact_existence_validated(self):
        """Verify validation fails if artifact file does not exist on disk."""
        is_valid, reason, _ = ModelRegistry.validate_model_for_promotion(
            symbol="NONEXISTENT",
            model_type=self.model_type,
            version="v99",
        )
        self.assertFalse(is_valid)
        self.assertIn("not found", reason.lower())

    # 6. Production model lookup
    def test_06_production_model_lookup(self):
        """Verify get_production_version returns the actively promoted version."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="production",
        )
        prod_ver = ModelRegistry.get_production_version(self.symbol, self.model_type)
        self.assertEqual(prod_ver, "v1")

    # 7. Candidate model lookup
    def test_07_candidate_model_lookup(self):
        """Verify list_models includes candidates and does not confuse them with production."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v2",
            status="candidate",
        )
        models = ModelRegistry.list_models(symbol=self.symbol)
        versions = [m["version"] for m in models]
        self.assertIn("v2", versions)
        candidate_entry = next(m for m in models if m["version"] == "v2")
        self.assertEqual(candidate_entry["status"], "candidate")

    # 8. Candidate -> Staging promotion
    def test_08_candidate_to_staging_promotion(self):
        """Verify candidate model can be promoted to staging."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v2",
            status="candidate",
        )
        res = ModelRegistry.promote_model(self.symbol, self.model_type, "v2", target_status="staging")
        self.assertEqual(res["status"], "staging")
        meta = load_metadata(self.symbol, self.model_type, "v2")
        self.assertEqual(meta["status"], "staging")

    # 9 & 10. Staging/Candidate -> Production and previous production retirement
    def test_09_10_promotion_and_retirement(self):
        """Verify promoting v2 to production sets v2 to production and retires v1."""
        # 1. Register v1 as production
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="production",
        )
        # 2. Register v2 as candidate
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v2",
            status="candidate",
        )

        # 3. Promote v2 to production
        res = ModelRegistry.promote_model(self.symbol, self.model_type, "v2", target_status="production")
        self.assertEqual(res["status"], "production")

        # Verify DB states
        v1_db = ModelVersion.objects.get(symbol=self.symbol, version="v1")
        v2_db = ModelVersion.objects.get(symbol=self.symbol, version="v2")

        self.assertEqual(v1_db.status, "retired")
        self.assertIsNotNone(v1_db.retired_at)
        self.assertEqual(v2_db.status, "production")
        self.assertIsNotNone(v2_db.promoted_at)

        # Verify disk metadata
        v1_meta = load_metadata(self.symbol, self.model_type, "v1")
        v2_meta = load_metadata(self.symbol, self.model_type, "v2")
        self.assertEqual(v1_meta["status"], "retired")
        self.assertEqual(v2_meta["status"], "production")

    # 11. Invalid model cannot be promoted
    def test_11_invalid_model_cannot_be_promoted(self):
        """Verify promotion fails for nonexistent or corrupted model."""
        with self.assertRaises(ValueError):
            ModelRegistry.promote_model(self.symbol, self.model_type, "v_nonexistent")

    # 12. Incompatible feature schema cannot be promoted
    def test_12_incompatible_feature_schema_cannot_be_promoted(self):
        """Verify model with incompatible feature schema version is rejected."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v_bad_schema",
            status="candidate",
            feature_schema_version="v2_incompatible",
        )
        with self.assertRaises(ValueError) as ctx:
            ModelRegistry.promote_model(self.symbol, self.model_type, "v_bad_schema")
        self.assertIn("incompatible feature schema", str(ctx.exception).lower())

    # 13, 14, 15. Production Rollback
    def test_13_14_15_production_rollback(self):
        """Verify rollback restores previous production version and preserves artifacts."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="production",
        )
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v2",
            status="candidate",
        )
        # Promote v2
        ModelRegistry.promote_model(self.symbol, self.model_type, "v2")
        self.assertEqual(ModelRegistry.get_production_version(self.symbol, self.model_type), "v2")

        # Roll back to v1
        res = ModelRegistry.rollback_model(self.symbol, self.model_type, "v1")
        self.assertEqual(res["active_production_version"], "v1")
        self.assertEqual(res["previous_production_version"], "v2")

        # Verify active is now v1
        self.assertEqual(ModelRegistry.get_production_version(self.symbol, self.model_type), "v1")

        # Verify both artifacts still exist
        self.assertTrue(load_model(self.symbol, self.model_type, "v1") is not None)
        self.assertTrue(load_model(self.symbol, self.model_type, "v2") is not None)

    # 16, 17, 18, 19, 20. PredictionService dynamic resolution, cache invalidation, and version tracking
    @patch("ml.inference.prediction_service.PredictionService.prepare_features")
    def test_16_to_20_prediction_service_integration(self, mock_prepare_features):
        """Verify PredictionService dynamically resolves production model and invalidates cache upon promotion."""
        dummy_vec = pd.DataFrame([np.zeros(len(FEATURE_COLUMNS))], columns=FEATURE_COLUMNS)
        dummy_ts = pd.Timestamp("2026-09-21 15:30:00", tz="UTC")
        mock_prepare_features.return_value = (dummy_vec, dummy_ts)

        # Save v1 as production
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="production",
        )

        # 16. PredictionService loads production model (v1) when version=None
        pred_1 = PredictionService.predict(self.symbol)
        self.assertEqual(pred_1["model_version"], "v1")

        # Verify cached
        key_v1 = PredictionService._cache_key(self.symbol, self.model_type, "v1")
        self.assertIn(key_v1, PredictionService._model_cache)

        # 17. Save v2 as candidate and promote to production
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v2",
            status="candidate",
        )
        ModelRegistry.promote_model(self.symbol, self.model_type, "v2")

        # 18 & 20. Promotion invalidated cache; next predict call uses v2
        pred_2 = PredictionService.predict(self.symbol)
        self.assertEqual(pred_2["model_version"], "v2")

        # 19. Rollback to v1
        ModelRegistry.rollback_model(self.symbol, self.model_type, "v1")
        pred_3 = PredictionService.predict(self.symbol)
        self.assertEqual(pred_3["model_version"], "v1")

    # 21, 22, 23, 24. Training Pipeline produces candidate version without replacing production
    @patch("market_data.services.feature_engineering.FeatureEngineeringService.build_dataset")
    def test_21_to_24_training_pipeline_candidate(self, mock_build_dataset):
        """Verify train_xgboost_classifier creates candidate version and does not touch production."""
        # Setup synthetic dataset with 100 rows
        dates = pd.date_range("2026-01-01", periods=100)
        data = {col: np.random.randn(100) for col in FEATURE_COLUMNS}
        data["timestamp"] = dates
        data["target_direction"] = np.random.randint(0, 2, 100)
        df = pd.DataFrame(data)
        mock_build_dataset.return_value = df

        # Register v1 as production first
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="production",
        )

        # Run training
        train_res = train_xgboost_classifier(self.symbol, status="candidate")

        # 21. Created new version (v2)
        self.assertEqual(train_res["version"], "v2")

        # 22. New model is candidate
        self.assertEqual(train_res["status"], "candidate")

        # 23. Training did not replace production
        active_prod = ModelRegistry.get_production_version(self.symbol, self.model_type)
        self.assertEqual(active_prod, "v1")

        # 24. Metrics are stored in result and DB
        self.assertIn("accuracy", train_res["test_metrics"])
        mv_v2 = ModelVersion.objects.get(symbol=self.symbol, version="v2")
        self.assertEqual(mv_v2.status, "candidate")
        self.assertIn("accuracy", mv_v2.metrics)

    # 25. REST API: Model listing endpoint
    def test_25_rest_api_model_listing(self):
        """GET /api/models/ and GET /api/models/<symbol>/ return structured model summaries."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="production",
        )
        response = self.client.get(f"/api/models/{self.symbol}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["symbol"], self.symbol)
        self.assertGreaterEqual(data["count"], 1)
        self.assertEqual(data["models"][0]["version"], "v1")

    # 26. REST API: Version listing endpoint
    def test_26_rest_api_versions_listing(self):
        """GET /api/models/<symbol>/<model_type>/versions/ returns all versions with metrics."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="production",
        )
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v2",
            status="candidate",
        )
        response = self.client.get(f"/api/models/{self.symbol}/{self.model_type}/versions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 2)
        versions = [v["version"] for v in data["versions"]]
        self.assertIn("v1", versions)
        self.assertIn("v2", versions)

    # 27. REST API: Production endpoint
    def test_27_rest_api_production_endpoint(self):
        """GET /api/models/<symbol>/<model_type>/production/ returns active production model."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics=self.dummy_metrics,
            version="v1",
            status="production",
        )
        response = self.client.get(f"/api/models/{self.symbol}/{self.model_type}/production/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["symbol"], self.symbol)
        self.assertEqual(data["version"], "v1")
        self.assertEqual(data["status"], "production")
        self.assertIn("features", data)
        self.assertIn("metrics", data)

    # 28. REST API: Comparison endpoint
    def test_28_rest_api_comparison_endpoint(self):
        """GET /api/models/<symbol>/<model_type>/compare/?v1=v1&v2=v2 returns factual delta comparison."""
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics={"accuracy": 0.80, "f1": 0.75},
            version="v1",
            status="production",
        )
        save_model(
            model=self.dummy_model,
            symbol=self.symbol,
            model_type=self.model_type,
            feature_columns=FEATURE_COLUMNS,
            metrics={"accuracy": 0.85, "f1": 0.82},
            version="v2",
            status="candidate",
        )
        response = self.client.get(f"/api/models/{self.symbol}/{self.model_type}/compare/?v1=v1&v2=v2")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["symbol"], self.symbol)
        self.assertIn("metric_comparison", data)
        acc_comp = data["metric_comparison"]["accuracy"]
        self.assertEqual(acc_comp["v1"], 0.80)
        self.assertEqual(acc_comp["v2"], 0.85)
        self.assertEqual(acc_comp["delta_b_minus_a"], 0.05)
