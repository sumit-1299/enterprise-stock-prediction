"""
Enterprise Model Registry for stock price prediction models.

Provides version tracking, artifact persistence, metadata management,
model lifecycle transitions (candidate -> staging -> production -> retired),
promotion/rollback workflows, and dynamic production model resolution.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
ARTIFACT_DIR = BASE_DIR / "artifacts"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

# Valid model lifecycle statuses
VALID_STATUSES = {"candidate", "staging", "production", "retired", "failed"}


def _get_django_models():
    """Lazily import Django ModelVersion and ModelEvaluation models if available."""
    try:
        import os
        import sys
        backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
        import django
        django.setup()
        from predictions.models import ModelEvaluation, ModelVersion
        return ModelVersion, ModelEvaluation
    except Exception as exc:
        logger.debug("Django models not available in current process: %s", exc)
        return None, None


def _get_filenames(symbol: str, model_type: str, version: str) -> Tuple[Path, Path]:
    """Generate consistent artifact and metadata paths."""
    safe_symbol = symbol.replace(".", "_")
    model_filename = f"{model_type}_{safe_symbol}_{version}.joblib"
    metadata_filename = f"{model_type}_{safe_symbol}_{version}.json"
    return ARTIFACT_DIR / model_filename, ARTIFACT_DIR / metadata_filename


def save_model(
    model: Any,
    symbol: str,
    model_type: str,
    feature_columns: List[str],
    metrics: Dict[str, Any],
    version: str = "v1",
    status: str = "candidate",
    feature_schema_version: str = "v1",
    hyperparameters: Optional[Dict[str, Any]] = None,
    evaluation_splits: Optional[Dict[str, Dict[str, float]]] = None,
) -> Dict[str, Any]:
    """
    Save trained ML model and metadata. Backward compatible with Phase 2.

    If status is not specified, defaults to 'candidate' for new models,
    or preserves existing status if metadata already exists.
    """
    model_path, metadata_path = _get_filenames(symbol, model_type, version)

    # Save model artifact
    joblib.dump(model, model_path)

    # Prepare metadata
    created_at = datetime.now(timezone.utc).isoformat()
    metadata: Dict[str, Any] = {
        "symbol": symbol,
        "model_type": model_type,
        "version": version,
        "status": status,
        "feature_schema_version": feature_schema_version,
        "features": feature_columns,
        "hyperparameters": hyperparameters or {},
        "metrics": metrics,
        "created_at": created_at,
        "promoted_at": created_at if status == "production" else None,
        "retired_at": None,
    }

    if evaluation_splits:
        metadata["evaluation_splits"] = evaluation_splits

    with open(metadata_path, "w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=4)

    # Synchronize with PostgreSQL if Django is available
    ModelVersion, ModelEvaluation = _get_django_models()
    if ModelVersion:
        try:
            mv, _ = ModelVersion.objects.update_or_create(
                symbol=symbol,
                model_type=model_type,
                version=version,
                defaults={
                    "status": status,
                    "artifact_path": str(model_path.relative_to(BASE_DIR.parent)),
                    "metadata_path": str(metadata_path.relative_to(BASE_DIR.parent)),
                    "feature_schema_version": feature_schema_version,
                    "features": feature_columns,
                    "hyperparameters": hyperparameters or {},
                    "metrics": metrics,
                    "promoted_at": datetime.now(timezone.utc) if status == "production" else None,
                },
            )

            # Record granular evaluation metrics
            if ModelEvaluation:
                if evaluation_splits:
                    for split_name, split_metrics in evaluation_splits.items():
                        for m_name, m_val in split_metrics.items():
                            if isinstance(m_val, (int, float)) and m_val is not None:
                                ModelEvaluation.objects.update_or_create(
                                    model_version=mv,
                                    dataset_split=split_name,
                                    metric_name=m_name,
                                    defaults={"metric_value": float(m_val)},
                                )
                elif metrics:
                    for m_name, m_val in metrics.items():
                        if isinstance(m_val, (int, float)) and m_val is not None:
                            ModelEvaluation.objects.update_or_create(
                                model_version=mv,
                                dataset_split="test",
                                metric_name=m_name,
                                defaults={"metric_value": float(m_val)},
                            )
        except Exception as db_err:
            logger.warning("Failed to sync model version '%s' to database: %s", version, db_err)

    return {
        "model_path": str(model_path),
        "metadata_path": str(metadata_path),
        "version": version,
        "status": status,
    }


def load_model(
    symbol: str,
    model_type: str = "xgboost_classifier",
    version: str = "v1",
) -> Any:
    """Load a trained model artifact."""
    model_path, _ = _get_filenames(symbol, model_type, version)

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")

    return joblib.load(model_path)


def load_metadata(
    symbol: str,
    model_type: str = "xgboost_classifier",
    version: str = "v1",
) -> Dict[str, Any]:
    """Load model metadata."""
    _, metadata_path = _get_filenames(symbol, model_type, version)

    if not metadata_path.exists():
        raise FileNotFoundError(f"Metadata not found: {metadata_path}")

    with open(metadata_path, "r", encoding="utf-8") as file:
        return json.load(file)


class ModelRegistry:
    """
    Enterprise Model Registry managing model lifecycle, versioning,
    validation, promotion, rollback, and production resolution.
    """

    @classmethod
    def ensure_default_production_registered(
        cls,
        symbol: str = "TCS.NS",
        model_type: str = "xgboost_classifier",
    ) -> Optional[str]:
        """
        Ensure existing initial v1 model artifact is registered as production in PostgreSQL.
        Guarantees zero-downtime backwards compatibility.
        """
        ModelVersion, ModelEvaluation = _get_django_models()
        if not ModelVersion:
            return "v1"

        try:
            # Check if any production model exists for this symbol/type
            prod_entry = ModelVersion.objects.filter(
                symbol=symbol,
                model_type=model_type,
                status="production",
            ).first()

            if prod_entry:
                return prod_entry.version

            # Check if v1 exists on disk
            model_path, metadata_path = _get_filenames(symbol, model_type, "v1")
            if model_path.exists() and metadata_path.exists():
                with open(metadata_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)

                mv, _ = ModelVersion.objects.update_or_create(
                    symbol=symbol,
                    model_type=model_type,
                    version="v1",
                    defaults={
                        "status": "production",
                        "artifact_path": str(model_path.relative_to(BASE_DIR.parent)),
                        "metadata_path": str(metadata_path.relative_to(BASE_DIR.parent)),
                        "feature_schema_version": meta.get("feature_schema_version", "v1"),
                        "features": meta.get("features", []),
                        "hyperparameters": meta.get("hyperparameters", {}),
                        "metrics": meta.get("metrics", {}),
                        "promoted_at": datetime.now(timezone.utc),
                    },
                )

                if ModelEvaluation and meta.get("metrics"):
                    for m_name, m_val in meta["metrics"].items():
                        if isinstance(m_val, (int, float)) and m_val is not None:
                            ModelEvaluation.objects.update_or_create(
                                model_version=mv,
                                dataset_split="test",
                                metric_name=m_name,
                                defaults={"metric_value": float(m_val)},
                            )

                # Update metadata file with status=production
                meta["status"] = "production"
                meta["feature_schema_version"] = meta.get("feature_schema_version", "v1")
                meta["promoted_at"] = datetime.now(timezone.utc).isoformat()
                with open(metadata_path, "w", encoding="utf-8") as f:
                    json.dump(meta, f, indent=4)

                logger.info("Registered initial v1 artifact for %s as production.", symbol)
                return "v1"
        except Exception as err:
            logger.warning("Error ensuring default production model: %s", err)

        return None

    @classmethod
    def get_production_version(
        cls,
        symbol: str,
        model_type: str = "xgboost_classifier",
    ) -> Optional[str]:
        """
        Deterministically retrieve the currently promoted production version for a symbol.

        Checks PostgreSQL ModelVersion first. If not found or DB unavailable,
        falls back to ensuring default registration.
        """
        ModelVersion, _ = _get_django_models()
        if ModelVersion:
            try:
                prod = ModelVersion.objects.filter(
                    symbol=symbol,
                    model_type=model_type,
                    status="production",
                ).first()
                if prod:
                    return prod.version
            except Exception as e:
                logger.debug("Database query for production version failed: %s", e)

        # Fallback to default registration
        return cls.ensure_default_production_registered(symbol, model_type)

    @classmethod
    def get_model_for_symbol(
        cls,
        symbol: str,
        model_type: str = "xgboost_classifier",
        version: Optional[str] = None,
    ) -> Tuple[Any, Dict[str, Any]]:
        """
        Clean lookup behavior for loading a symbol's model artifact and metadata.
        If version is None, dynamically resolves the active production version.
        Raises ModelNotFoundError if no valid model artifact exists for this symbol.
        """
        from ml.inference.exceptions import ModelNotFoundError, MetadataNotFoundError

        if version is None:
            version = cls.get_production_version(symbol, model_type)

        if not version:
            raise ModelNotFoundError(
                f"No production model registered for symbol '{symbol}'."
            )

        model_path, metadata_path = _get_filenames(symbol, model_type, version)

        if not model_path.exists():
            raise ModelNotFoundError(
                f"No model artifact found for symbol '{symbol}' (version '{version}'). "
                f"Expected path: {model_path.name}"
            )

        if not metadata_path.exists():
            raise MetadataNotFoundError(
                f"No metadata found for symbol '{symbol}' (version '{version}'). "
                f"Expected path: {metadata_path.name}"
            )

        model = load_model(symbol=symbol, model_type=model_type, version=version)
        metadata = load_metadata(symbol=symbol, model_type=model_type, version=version)
        return model, metadata

    @classmethod
    def get_model_version(
        cls,
        symbol: str,
        model_type: str,
        version: str,
    ) -> Dict[str, Any]:
        """Get model metadata and status for a specific version."""
        return load_metadata(symbol=symbol, model_type=model_type, version=version)

    @classmethod
    def list_models(
        cls,
        symbol: Optional[str] = None,
        model_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        List all registered model versions matching optional symbol and model_type filters.
        """
        cls.ensure_default_production_registered(symbol or "TCS.NS")

        ModelVersion, _ = _get_django_models()
        if ModelVersion:
            try:
                qs = ModelVersion.objects.all()
                if symbol:
                    qs = qs.filter(symbol=symbol)
                if model_type:
                    qs = qs.filter(model_type=model_type)
                results = []
                for m in qs:
                    results.append({
                        "symbol": m.symbol,
                        "model_type": m.model_type,
                        "version": m.version,
                        "status": m.status,
                        "feature_schema_version": m.feature_schema_version,
                        "metrics": m.metrics,
                        "hyperparameters": m.hyperparameters,
                        "features": m.features,
                        "created_at": m.created_at.isoformat() if m.created_at else None,
                        "promoted_at": m.promoted_at.isoformat() if m.promoted_at else None,
                        "retired_at": m.retired_at.isoformat() if m.retired_at else None,
                    })
                return results
            except Exception as e:
                logger.debug("Failed to list models from database: %s", e)

        # Filesystem fallback
        results = []
        pattern = f"{model_type or '*'}_{symbol.replace('.', '_') if symbol else '*'}_*.json"
        for p in ARTIFACT_DIR.glob(pattern):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                    results.append(meta)
            except Exception:
                pass
        return results

    @classmethod
    def validate_model_for_promotion(
        cls,
        symbol: str,
        model_type: str,
        version: str,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Strict validation before a candidate or staging model can be promoted:
        1. Model artifact exists on disk.
        2. Model artifact is readable with joblib.
        3. Metadata exists and is valid JSON.
        4. Required feature columns are present and non-empty.
        5. Feature schema version is compatible ('v1').
        6. Essential metrics are recorded.
        """
        model_path, metadata_path = _get_filenames(symbol, model_type, version)

        if not model_path.exists():
            return False, f"Model artifact not found at: {model_path.name}", {}

        if not metadata_path.exists():
            return False, f"Metadata file not found at: {metadata_path.name}", {}

        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except Exception as e:
            return False, f"Failed to parse metadata JSON: {e}", {}

        # Validate feature schema
        features = metadata.get("features")
        if not isinstance(features, list) or not features:
            return False, "Model metadata does not contain a valid non-empty 'features' list.", metadata

        schema_ver = metadata.get("feature_schema_version", "v1")
        if schema_ver != "v1":
            return False, f"Incompatible feature schema version '{schema_ver}'. Expected 'v1'.", metadata

        # Validate metrics
        metrics = metadata.get("metrics")
        if not isinstance(metrics, dict) or not metrics:
            return False, "Model metadata does not contain valid evaluation metrics.", metadata

        # Test model readability
        try:
            test_model = joblib.load(model_path)
            if not hasattr(test_model, "predict"):
                return False, "Model artifact does not implement required 'predict' method.", metadata
        except Exception as load_err:
            return False, f"Failed to load model artifact with joblib: {load_err}", metadata

        return True, "Model successfully validated for promotion.", metadata

    @classmethod
    def promote_model(
        cls,
        symbol: str,
        model_type: str,
        version: str,
        target_status: str = "production",
    ) -> Dict[str, Any]:
        """
        Explicitly promote a model version.

        Lifecycle:
          candidate -> staging
          staging/candidate -> production (retires current production)

        Guarantees:
        - Strict validation of artifact and metadata.
        - Previous production model retired, preserving artifact for rollback.
        - PredictionService cache invalidated.
        """
        if target_status not in {"staging", "production"}:
            raise ValueError(f"Invalid target promotion status '{target_status}'. Must be 'staging' or 'production'.")

        is_valid, reason, metadata = cls.validate_model_for_promotion(symbol, model_type, version)
        if not is_valid:
            raise ValueError(f"Model validation failed for promotion: {reason}")

        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        ModelVersion, _ = _get_django_models()

        if target_status == "production":
            # 1. Retire previous production model
            if ModelVersion:
                current_prod = ModelVersion.objects.filter(
                    symbol=symbol,
                    model_type=model_type,
                    status="production",
                ).exclude(version=version)

                for old_p in current_prod:
                    old_p.status = "retired"
                    old_p.retired_at = now_dt
                    old_p.save(update_fields=["status", "retired_at"])

                    # Update metadata on disk for old model
                    try:
                        _, old_meta_path = _get_filenames(symbol, model_type, old_p.version)
                        if old_meta_path.exists():
                            with open(old_meta_path, "r", encoding="utf-8") as f:
                                old_meta = json.load(f)
                            old_meta["status"] = "retired"
                            old_meta["retired_at"] = now_iso
                            with open(old_meta_path, "w", encoding="utf-8") as f:
                                json.dump(old_meta, f, indent=4)
                    except Exception as err:
                        logger.warning("Could not update retired metadata for %s: %s", old_p.version, err)

            # 2. Set new model status to production
            metadata["status"] = "production"
            metadata["promoted_at"] = now_iso
            metadata["retired_at"] = None

        elif target_status == "staging":
            metadata["status"] = "staging"

        # Update metadata file on disk
        _, metadata_path = _get_filenames(symbol, model_type, version)
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4)

        # Update DB
        if ModelVersion:
            ModelVersion.objects.filter(
                symbol=symbol,
                model_type=model_type,
                version=version,
            ).update(
                status=target_status,
                promoted_at=now_dt if target_status == "production" else None,
            )

        # 3. Invalidate PredictionService cache
        cls._invalidate_prediction_cache(symbol, model_type)

        logger.info(
            "Successfully promoted model %s (%s) version %s to '%s'.",
            symbol,
            model_type,
            version,
            target_status,
        )

        return {
            "symbol": symbol,
            "model_type": model_type,
            "version": version,
            "status": target_status,
            "promoted_at": now_iso if target_status == "production" else None,
            "message": f"Model {symbol} {version} promoted to {target_status}.",
        }

    @classmethod
    def rollback_model(
        cls,
        symbol: str,
        model_type: str,
        target_version: str,
    ) -> Dict[str, Any]:
        """
        Safe rollback of production model to a previously deployed or specified version.

        - Validates target version exists and is readable.
        - Retires current production model.
        - Sets target version to production.
        - Invalidates PredictionService cache.
        - Preserves all model artifacts.
        """
        is_valid, reason, target_meta = cls.validate_model_for_promotion(symbol, model_type, target_version)
        if not is_valid:
            raise ValueError(f"Target rollback version '{target_version}' cannot be restored: {reason}")

        current_prod_ver = cls.get_production_version(symbol, model_type)
        if current_prod_ver == target_version:
            return {
                "symbol": symbol,
                "model_type": model_type,
                "version": target_version,
                "status": "production",
                "message": f"Version '{target_version}' is already the active production model.",
            }

        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        ModelVersion, _ = _get_django_models()

        # 1. Retire currently active production model
        if ModelVersion:
            ModelVersion.objects.filter(
                symbol=symbol,
                model_type=model_type,
                status="production",
            ).update(status="retired", retired_at=now_dt)

        # Update disk metadata for current prod
        try:
            _, curr_meta_path = _get_filenames(symbol, model_type, current_prod_ver)
            if curr_meta_path.exists():
                with open(curr_meta_path, "r", encoding="utf-8") as f:
                    curr_meta = json.load(f)
                curr_meta["status"] = "retired"
                curr_meta["retired_at"] = now_iso
                with open(curr_meta_path, "w", encoding="utf-8") as f:
                    json.dump(curr_meta, f, indent=4)
        except Exception as e:
            logger.warning("Failed to update retired status on disk for %s: %s", current_prod_ver, e)

        # 2. Promote target version to production
        target_meta["status"] = "production"
        target_meta["promoted_at"] = now_iso
        target_meta["retired_at"] = None

        _, target_meta_path = _get_filenames(symbol, model_type, target_version)
        with open(target_meta_path, "w", encoding="utf-8") as f:
            json.dump(target_meta, f, indent=4)

        if ModelVersion:
            ModelVersion.objects.filter(
                symbol=symbol,
                model_type=model_type,
                version=target_version,
            ).update(
                status="production",
                promoted_at=now_dt,
                retired_at=None,
            )

        # 3. Invalidate PredictionService cache
        cls._invalidate_prediction_cache(symbol, model_type)

        logger.info(
            "Successfully rolled back model %s (%s) from %s to %s.",
            symbol,
            model_type,
            current_prod_ver,
            target_version,
        )

        return {
            "symbol": symbol,
            "model_type": model_type,
            "previous_production_version": current_prod_ver,
            "active_production_version": target_version,
            "status": "production",
            "message": f"Successfully rolled back to version '{target_version}'.",
        }

    @classmethod
    def compare_models(
        cls,
        symbol: str,
        model_type: str,
        version_a: str,
        version_b: str,
    ) -> Dict[str, Any]:
        """
        Compare two model versions factually across all metrics without arbitrary winner selection.
        """
        meta_a = load_metadata(symbol, model_type, version_a)
        meta_b = load_metadata(symbol, model_type, version_b)

        metrics_a = meta_a.get("metrics", {})
        metrics_b = meta_b.get("metrics", {})

        all_metric_keys = sorted(set(metrics_a.keys()) | set(metrics_b.keys()))
        metric_comparison: Dict[str, Dict[str, Any]] = {}

        for k in all_metric_keys:
            val_a = metrics_a.get(k)
            val_b = metrics_b.get(k)
            delta = None
            if isinstance(val_a, (int, float)) and isinstance(val_b, (int, float)):
                delta = round(val_b - val_a, 4)

            metric_comparison[k] = {
                f"{version_a}": val_a,
                f"{version_b}": val_b,
                "delta_b_minus_a": delta,
            }

        return {
            "symbol": symbol,
            "model_type": model_type,
            "version_a": {
                "version": version_a,
                "status": meta_a.get("status", "unknown"),
                "created_at": meta_a.get("created_at"),
                "feature_count": len(meta_a.get("features", [])),
            },
            "version_b": {
                "version": version_b,
                "status": meta_b.get("status", "unknown"),
                "created_at": meta_b.get("created_at"),
                "feature_count": len(meta_b.get("features", [])),
            },
            "metric_comparison": metric_comparison,
        }

    @classmethod
    def _invalidate_prediction_cache(cls, symbol: str, model_type: str):
        """Notify PredictionService to clear stale cached model instances."""
        try:
            from ml.inference.prediction_service import PredictionService
            PredictionService.clear_cache()
            logger.info("Cleared PredictionService cache for %s (%s)", symbol, model_type)
        except Exception as e:
            logger.debug("Could not clear PredictionService cache: %s", e)
