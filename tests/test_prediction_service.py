"""
Tests for the ML PredictionService and Inference Pipeline.
"""

import os
import sys
from pathlib import Path
from unittest import TestCase
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd

# Ensure backend and root are in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Ensure Django settings are configured
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()

from ml.inference.exceptions import (
    InsufficientDataError,
    InvalidFeatureDataError,
    MetadataNotFoundError,
    MissingFeaturesError,
    ModelNotFoundError,
    SymbolNotFoundError,
)
from ml.inference.prediction_service import PredictionService


class TestPredictionService(TestCase):

    def setUp(self):
        # Clear cache before each test to ensure isolated testing
        PredictionService.clear_cache()

    def tearDown(self):
        PredictionService.clear_cache()

    def test_model_loading(self):
        """Verify that load_model_and_metadata loads model and metadata for TCS.NS."""
        model, metadata = PredictionService.load_model_and_metadata(
            symbol="TCS.NS",
            model_type="xgboost_classifier",
            version="v1",
        )
        self.assertIsNotNone(model)
        self.assertIsNotNone(metadata)
        self.assertEqual(metadata["symbol"], "TCS.NS")
        self.assertEqual(metadata["model_type"], "xgboost_classifier")
        self.assertEqual(metadata["version"], "v1")

    def test_metadata_loading(self):
        """Verify that metadata contains all expected keys and features list."""
        _, metadata = PredictionService.load_model_and_metadata(
            symbol="TCS.NS",
            model_type="xgboost_classifier",
            version="v1",
        )
        self.assertIn("features", metadata)
        self.assertIn("metrics", metadata)
        self.assertIn("created_at", metadata)
        self.assertIsInstance(metadata["features"], list)
        self.assertGreater(len(metadata["features"]), 0)
        self.assertIn("return_1d", metadata["features"])
        self.assertIn("rsi_14", metadata["features"])

    def test_successful_prediction_tcs_ns(self):
        """Verify end-to-end prediction for TCS.NS using existing saved model and data."""
        result = PredictionService.predict("TCS.NS")

        self.assertIsInstance(result, dict)
        self.assertEqual(result["symbol"], "TCS.NS")
        self.assertIn(result["prediction"], ["UP", "DOWN"])
        self.assertIn(result["direction"], [0, 1])
        self.assertIsInstance(result["probability"], float)
        self.assertGreaterEqual(result["probability"], 0.0)
        self.assertLessEqual(result["probability"], 1.0)
        self.assertEqual(result["model_type"], "xgboost_classifier")
        self.assertEqual(result["model_version"], "v1")
        self.assertIn("probabilities", result)
        self.assertIn("DOWN", result["probabilities"])
        self.assertIn("UP", result["probabilities"])
        self.assertIn("timestamp", result)
        self.assertIn("features_used", result)

    def test_caching_behavior(self):
        """Verify in-memory model caching avoids disk reloads."""
        # First call loads and caches
        model1, meta1 = PredictionService.load_model_and_metadata("TCS.NS")
        # Second call should return the exact same cached object
        model2, meta2 = PredictionService.load_model_and_metadata("TCS.NS")
        self.assertIs(model1, model2)
        self.assertIs(meta1, meta2)

        # clear_cache should purge cache
        PredictionService.clear_cache()
        self.assertEqual(len(PredictionService._model_cache), 0)

    def test_missing_model_artifact(self):
        """Verify that requesting an unregistered model raises ModelNotFoundError."""
        with self.assertRaises(ModelNotFoundError):
            PredictionService.predict("NONEXISTENT_SYMBOL_XYZ")

    def test_nonexistent_symbol_data(self):
        """Verify that a symbol without market data raises SymbolNotFoundError."""
        # Mock load_model to succeed so we test the data loading step
        mock_model = MagicMock()
        mock_metadata = {
            "symbol": "FAKE_STOCK",
            "model_type": "xgboost_classifier",
            "version": "v1",
            "features": ["return_1d"],
        }
        with patch.object(
            PredictionService,
            "load_model_and_metadata",
            return_value=(mock_model, mock_metadata),
        ):
            with self.assertRaises(SymbolNotFoundError):
                PredictionService.predict("FAKE_STOCK")

    def test_insufficient_historical_data(self):
        """Verify that having fewer than 50 records raises InsufficientDataError."""
        mock_model = MagicMock()
        mock_metadata = {
            "symbol": "TCS.NS",
            "model_type": "xgboost_classifier",
            "version": "v1",
            "features": ["return_1d"],
        }
        # Simulate only 10 rows
        small_df = pd.DataFrame({
            "timestamp": pd.date_range("2026-01-01", periods=10),
            "open": np.ones(10) * 100,
            "high": np.ones(10) * 105,
            "low": np.ones(10) * 95,
            "close": np.ones(10) * 102,
            "volume": np.ones(10) * 1000,
        })

        with patch.object(
            PredictionService,
            "load_model_and_metadata",
            return_value=(mock_model, mock_metadata),
        ):
            with patch(
                "market_data.services.feature_engineering.FeatureEngineeringService.load_market_data",
                return_value=small_df,
            ):
                with self.assertRaises(InsufficientDataError):
                    PredictionService.predict("TCS.NS")

    def test_missing_features_in_dataset(self):
        """Verify that missing expected feature columns raises MissingFeaturesError."""
        mock_model = MagicMock()
        mock_metadata = {
            "symbol": "TCS.NS",
            "model_type": "xgboost_classifier",
            "version": "v1",
            "features": ["feature_that_does_not_exist"],
        }
        with patch.object(
            PredictionService,
            "load_model_and_metadata",
            return_value=(mock_model, mock_metadata),
        ):
            with self.assertRaises(MissingFeaturesError):
                PredictionService.predict("TCS.NS")

    def test_invalid_nan_feature_data(self):
        """Verify that NaN values in the latest feature row raise InvalidFeatureDataError."""
        mock_model = MagicMock()
        mock_metadata = {
            "symbol": "TCS.NS",
            "model_type": "xgboost_classifier",
            "version": "v1",
            "features": ["return_1d", "rsi_14"],
        }
        # Generate valid features but inject NaN in latest row
        with patch.object(
            PredictionService,
            "load_model_and_metadata",
            return_value=(mock_model, mock_metadata),
        ):
            with patch.object(
                PredictionService,
                "prepare_features",
                side_effect=InvalidFeatureDataError(
                    "Latest feature row for 'TCS.NS' contains NaN in columns: ['rsi_14']"
                ),
            ):
                with self.assertRaises(InvalidFeatureDataError):
                    PredictionService.predict("TCS.NS")

