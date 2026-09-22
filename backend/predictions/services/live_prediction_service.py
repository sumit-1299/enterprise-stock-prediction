"""
Live Prediction Pipeline Service.

Coordinates feature preparation, model inference via PredictionService,
idempotent prediction persistence into PostgreSQL, and real-time event broadcasting.
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from dateutil import parser as date_parser
from django.db import transaction

from market_data.models import MarketPrice
from market_data.services.realtime_service import RealtimeEventService
from ml.inference.exceptions import (
    InsufficientDataError,
    ModelNotFoundError,
    SymbolNotFoundError,
)
from ml.inference.prediction_service import PredictionService
from predictions.models import Prediction
from stocks.models import Stock

logger = logging.getLogger(__name__)


class LivePredictionService:
    """
    Orchestrates live prediction generation, validation, persistence, and event publication.
    """

    @classmethod
    @transaction.atomic
    def generate_and_persist_prediction(
        cls,
        symbol: str,
        model_type: str = "xgboost_classifier",
        version: str = "v1",
        price_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a prediction for the latest market data, persist it idempotently,
        and publish a real-time event to Django Channels subscribers.

        Parameters
        ----------
        symbol : str
            Stock ticker symbol (e.g. 'TCS.NS')
        model_type : str
            Type of model in registry (default 'xgboost_classifier')
        version : str
            Model version (default 'v1')
        price_data : Optional[Dict[str, Any]]
            Optional recent price bar data (price, volume, timestamp)

        Returns
        -------
        Dict[str, Any]
            Structured prediction result with persistence confirmation.
        """
        normalized_symbol = symbol.strip().upper()

        logger.info(
            "Live prediction pipeline initiated for %s (model_type=%s, version=%s)...",
            normalized_symbol,
            model_type,
            version,
        )

        # 1. Validate that the stock is registered
        try:
            stock = Stock.objects.get(symbol=normalized_symbol)
        except Stock.DoesNotExist:
            logger.error("Stock symbol '%s' not registered in database.", normalized_symbol)
            raise SymbolNotFoundError(
                f"Stock symbol '{normalized_symbol}' is not registered in the database."
            )

        # 2. Check that sufficient historical data exists (min 50 records for SMA-50)
        history_count = MarketPrice.objects.filter(stock=stock).count()
        if history_count < 50:
            logger.warning(
                "Insufficient historical data for '%s': found %d records, minimum 50 required for technical features.",
                normalized_symbol,
                history_count,
            )
            raise InsufficientDataError(
                f"Insufficient historical data for '{normalized_symbol}': found {history_count} records, "
                "minimum 50 required for technical indicators (e.g. SMA-50)."
            )

        # 3. Invoke existing PredictionService (reusing model registry and feature engineering)
        prediction_result = PredictionService.predict(
            symbol=normalized_symbol,
            model_type=model_type,
            version=version,
        )

        # 4. Parse market data timestamp for idempotent persistence
        raw_timestamp = prediction_result.get("timestamp")
        market_timestamp = None
        if raw_timestamp:
            if isinstance(raw_timestamp, datetime):
                market_timestamp = raw_timestamp
            else:
                try:
                    market_timestamp = date_parser.parse(str(raw_timestamp))
                except Exception:
                    logger.warning("Could not parse timestamp '%s' as datetime", raw_timestamp)

        # 5. Idempotently persist prediction into PostgreSQL
        prediction_record, created = Prediction.objects.update_or_create(
            stock=stock,
            market_data_timestamp=market_timestamp,
            model_version=prediction_result["model_version"],
            defaults={
                "symbol": normalized_symbol,
                "prediction": prediction_result["prediction"],
                "direction": prediction_result["direction"],
                "probability": prediction_result["probability"],
                "probabilities": prediction_result["probabilities"],
                "model_type": prediction_result["model_type"],
                "features_used": prediction_result.get("features_used", []),
            },
        )

        action = "created" if created else "updated"
        logger.info(
            "Prediction %s for %s at market timestamp %s: %s (direction=%d, prob=%.4f)",
            action,
            normalized_symbol,
            market_timestamp,
            prediction_record.prediction,
            prediction_record.direction,
            prediction_record.probability,
        )

        # 6. Publish real-time prediction event
        if price_data is None:
            # Fallback to latest MarketPrice close if not provided
            latest_price_obj = (
                MarketPrice.objects.filter(stock=stock).order_by("-timestamp").first()
            )
            if latest_price_obj:
                price_data = {
                    "timestamp": latest_price_obj.timestamp.isoformat(),
                    "close_price": float(latest_price_obj.close_price),
                    "volume": latest_price_obj.volume,
                }
            else:
                price_data = {
                    "timestamp": raw_timestamp,
                    "close_price": 0.0,
                }

        RealtimeEventService.publish_prediction_update(
            symbol=normalized_symbol,
            prediction_data=prediction_result,
            price_data=price_data,
        )

        return {
            "id": prediction_record.id,
            "symbol": normalized_symbol,
            "prediction": prediction_record.prediction,
            "direction": prediction_record.direction,
            "probability": prediction_record.probability,
            "probabilities": prediction_record.probabilities,
            "model_type": prediction_record.model_type,
            "model_version": prediction_record.model_version,
            "market_data_timestamp": (
                prediction_record.market_data_timestamp.isoformat()
                if prediction_record.market_data_timestamp
                else raw_timestamp
            ),
            "timestamp": raw_timestamp,
            "features_used": prediction_record.features_used,
            "generated_at": prediction_record.generated_at.isoformat(),
            "action": action,
        }

