"""
Production-oriented inference and prediction service for stock price direction.
"""

import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

# Ensure backend directory is in sys.path for market_data imports
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
try:
    django.setup()
except Exception:
    pass

from market_data.services.feature_engineering import FeatureEngineeringService
from ml.inference.exceptions import (
    InferenceError,
    InsufficientDataError,
    InvalidFeatureDataError,
    InvalidModelInputError,
    MetadataNotFoundError,
    MissingFeaturesError,
    ModelNotFoundError,
    SymbolNotFoundError,
)
from ml.models.model_registry import ModelRegistry, load_metadata, load_model

logger = logging.getLogger(__name__)


class PredictionService:
    """
    Inference service for generating stock price direction predictions.

    Loads approved model artifacts from the model registry, prepares the latest
    market features using the shared feature engineering pipeline, and outputs
    structured prediction results.
    """

    _model_cache: Dict[str, Any] = {}
    _metadata_cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def _cache_key(cls, symbol: str, model_type: str, version: str) -> str:
        return f"{model_type}_{symbol.replace('.', '_')}_{version}"

    @classmethod
    def clear_cache(cls) -> None:
        """Clear all cached models and metadata."""
        cls._model_cache.clear()
        cls._metadata_cache.clear()
        logger.info("PredictionService model and metadata cache cleared.")

    @classmethod
    def invalidate_model_cache(
        cls,
        symbol: Optional[str] = None,
        model_type: Optional[str] = None,
    ) -> None:
        """
        Selectively invalidate cached model and metadata entries for a symbol/model_type,
        or all cached models if no filters are provided.
        """
        if symbol is None and model_type is None:
            cls.clear_cache()
            return

        safe_sym = symbol.replace(".", "_") if symbol else None
        keys_to_remove = []
        for k in list(cls._model_cache.keys()):
            sym_match = (safe_sym is None) or (f"_{safe_sym}_" in k)
            type_match = (model_type is None) or k.startswith(f"{model_type}_")
            if sym_match and type_match:
                keys_to_remove.append(k)

        for k in keys_to_remove:
            cls._model_cache.pop(k, None)
            cls._metadata_cache.pop(k, None)
            logger.info("Invalidated cache entry for key: %s", k)

    @classmethod
    def load_model_and_metadata(
        cls,
        symbol: str,
        model_type: str = "xgboost_classifier",
        version: Optional[str] = None,
        reload: bool = False,
    ) -> Tuple[Any, Dict[str, Any]]:
        """
        Load a trained model and its metadata from the registry with in-memory caching.
        If version is None, dynamically resolves the active production version.
        """
        if version is None:
            version = ModelRegistry.get_production_version(symbol, model_type)

        if not version:
            raise ModelNotFoundError(
                f"No production model registered for symbol '{symbol}'."
            )

        key = cls._cache_key(symbol, model_type, version)

        if not reload and key in cls._model_cache and key in cls._metadata_cache:
            logger.debug("Loaded model and metadata from cache for key: %s", key)
            return cls._model_cache[key], cls._metadata_cache[key]

        logger.info(
            "Loading model artifact for %s (type=%s, version=%s)...",
            symbol,
            model_type,
            version,
        )

        try:
            model = load_model(
                symbol=symbol,
                model_type=model_type,
                version=version,
            )
        except FileNotFoundError as e:
            raise ModelNotFoundError(
                f"Model artifact not found for symbol '{symbol}', "
                f"type '{model_type}', version '{version}': {e}"
            ) from e

        try:
            metadata = load_metadata(
                symbol=symbol,
                model_type=model_type,
                version=version,
            )
        except FileNotFoundError as e:
            raise MetadataNotFoundError(
                f"Model metadata not found for symbol '{symbol}', "
                f"type '{model_type}', version '{version}': {e}"
            ) from e

        if not isinstance(metadata.get("features"), list) or not metadata["features"]:
            raise MissingFeaturesError(
                f"Metadata for '{symbol}' does not specify valid feature columns."
            )

        cls._model_cache[key] = model
        cls._metadata_cache[key] = metadata

        logger.info(
            "Successfully loaded and cached model '%s' (version=%s)",
            key,
            metadata.get("version", version),
        )
        return model, metadata

    @classmethod
    def prepare_features(
        cls,
        symbol: str,
        expected_features: List[str],
        min_records: int = 50,
    ) -> Tuple[pd.DataFrame, Any]:
        """
        Extract historical data and compute features for the latest valid market row.

        Reuses FeatureEngineeringService to guarantee identical feature definitions
        between training and inference without retraining or lookahead leakage.
        """
        logger.info("Preparing features for symbol '%s'...", symbol)

        try:
            df = FeatureEngineeringService.load_market_data(symbol)
        except ValueError as e:
            raise SymbolNotFoundError(
                f"No market data found for symbol '{symbol}': {e}"
            ) from e
        except Exception as e:
            # Check if stock exists or if it's an unrecognized symbol
            raise SymbolNotFoundError(
                f"Failed to load market data for symbol '{symbol}': {e}"
            ) from e

        if df.empty:
            raise SymbolNotFoundError(
                f"No market data records available for symbol '{symbol}'."
            )

        if len(df) < min_records:
            raise InsufficientDataError(
                f"Insufficient historical data for '{symbol}': found {len(df)} records, "
                f"minimum {min_records} required for technical indicators (e.g. SMA-50)."
            )

        # Generate technical features using the shared feature engineering service
        df_features = FeatureEngineeringService.create_features(df)

        # Validate that all expected features were created
        missing_features = [
            f for f in expected_features if f not in df_features.columns
        ]
        if missing_features:
            raise MissingFeaturesError(
                f"Dataset for '{symbol}' is missing required features: {missing_features}"
            )

        # Select the latest row
        latest_row = df_features.iloc[-1]
        timestamp = latest_row["timestamp"]

        # Extract only the expected features in the exact order recorded in metadata
        feature_vector = df_features[expected_features].iloc[[-1]].copy()

        # Validate that the feature vector contains no NaN or infinite values
        if feature_vector.isna().any().any():
            nan_columns = feature_vector.columns[
                feature_vector.isna().any()
            ].tolist()
            raise InvalidFeatureDataError(
                f"Latest feature row for '{symbol}' contains NaN in columns: {nan_columns}"
            )

        if np.isinf(feature_vector.to_numpy()).any():
            inf_columns = feature_vector.columns[
                np.isinf(feature_vector.to_numpy()).any(axis=0)
            ].tolist()
            raise InvalidFeatureDataError(
                f"Latest feature row for '{symbol}' contains Inf in columns: {inf_columns}"
            )

        return feature_vector, timestamp

    @classmethod
    def predict(
        cls,
        symbol: str,
        model_type: str = "xgboost_classifier",
        version: Optional[str] = None,
        reload_model: bool = False,
    ) -> Dict[str, Any]:
        """
        Generate a stock direction prediction for the latest market data.

        Args:
            symbol: Stock ticker symbol (e.g., 'TCS.NS').
            model_type: Type of model to use (default: 'xgboost_classifier').
            version: Model version tag (default: None, dynamically resolves active production version).
            reload_model: If True, bypasses cache and reloads model from disk.

        Returns:
            Structured prediction dictionary containing symbol, prediction (UP/DOWN),
            direction (1/0), confidence probability, model version, and timestamp.
        """
        if version is None:
            version = ModelRegistry.get_production_version(symbol, model_type)

        logger.info(
            "Starting prediction for symbol '%s' (model_type=%s, version=%s)...",
            symbol,
            model_type,
            version,
        )

        import time
        start_time = time.time()

        try:
            # 1. Load model and metadata from registry
            model, metadata = cls.load_model_and_metadata(
                symbol=symbol,
                model_type=model_type,
                version=version,
                reload=reload_model,
            )

            # Validate feature schema version
            feature_schema_ver = metadata.get("feature_schema_version", "v1")
            if feature_schema_ver != "v1":
                raise InferenceError(
                    f"Model version '{version}' for '{symbol}' expects incompatible feature schema version '{feature_schema_ver}'. Expected 'v1'."
                )

            expected_features: List[str] = metadata["features"]
            model_version: str = metadata.get("version", version)

            # 2. Prepare features on the latest market data
            feature_vector, timestamp = cls.prepare_features(
                symbol=symbol,
                expected_features=expected_features,
            )

            # 3. Validate input shape
            if feature_vector.shape[1] != len(expected_features):
                raise InvalidModelInputError(
                    f"Feature vector column count ({feature_vector.shape[1]}) does not match "
                    f"model expected count ({len(expected_features)})."
                )

            # 4. Generate prediction and probabilities
            # Direction: 0 = DOWN, 1 = UP
            raw_prediction = model.predict(feature_vector)[0]
            direction = int(raw_prediction)
            prediction_label = "UP" if direction == 1 else "DOWN"

            # Probability calculation
            if hasattr(model, "predict_proba"):
                probabilities = model.predict_proba(feature_vector)[0]
                prob_down = float(probabilities[0])
                prob_up = float(probabilities[1])
                predicted_probability = prob_up if direction == 1 else prob_down
            else:
                # Fallback if model has no predict_proba
                predicted_probability = 1.0
                prob_down = 1.0 if direction == 0 else 0.0
                prob_up = 1.0 if direction == 1 else 0.0

            formatted_timestamp = (
                timestamp.isoformat()
                if hasattr(timestamp, "isoformat")
                else str(timestamp)
            )

            latency_ms = round((time.time() - start_time) * 1000, 2)

            # Extract feature snapshot dictionary
            feature_snapshot = {
                col: round(float(val), 4) if pd.notna(val) else None
                for col, val in feature_vector.iloc[0].items()
            }

            result: Dict[str, Any] = {
                "symbol": symbol,
                "prediction": prediction_label,
                "direction": direction,
                "probability": round(predicted_probability, 4),
                "probabilities": {
                    "DOWN": round(prob_down, 4),
                    "UP": round(prob_up, 4),
                },
                "model_type": model_type,
                "model_version": model_version,
                "timestamp": formatted_timestamp,
                "features_used": expected_features,
                "feature_snapshot": feature_snapshot,
                "latency_ms": latency_ms,
            }

            logger.info(
                "Prediction complete for %s: %s (direction=%d, prob=%.4f, latency=%.2fms, timestamp=%s)",
                symbol,
                prediction_label,
                direction,
                predicted_probability,
                latency_ms,
                formatted_timestamp,
            )
            return result

        except Exception as exc:
            logger.error(
                "Prediction failed for symbol '%s': %s",
                symbol,
                str(exc),
                exc_info=True,
            )
            raise
