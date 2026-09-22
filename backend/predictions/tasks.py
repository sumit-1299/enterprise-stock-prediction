"""
Celery background tasks for live prediction generation and persistence.
"""

import logging
from typing import Any, Dict, Optional

from celery import shared_task

from ml.inference.exceptions import (
    InsufficientDataError,
    InvalidFeatureDataError,
    InvalidModelInputError,
    MetadataNotFoundError,
    MissingFeaturesError,
    ModelNotFoundError,
    SymbolNotFoundError,
)
from predictions.services.live_prediction_service import LivePredictionService

logger = logging.getLogger(__name__)

# Transient errors that qualify for bounded exponential retries
TRANSIENT_ERRORS = (
    ConnectionError,
    TimeoutError,
    OSError,
)

try:
    import requests
    TRANSIENT_ERRORS = TRANSIENT_ERRORS + (requests.exceptions.RequestException,)
except ImportError:
    pass


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="predictions.tasks.generate_live_prediction_task",
)
def generate_live_prediction_task(
    self,
    symbol: str,
    model_type: str = "xgboost_classifier",
    version: str = "v1",
    price_data: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Celery task to generate a live prediction on new market data,
    persist it to PostgreSQL, and publish the event to Django Channels.

    Retries up to 3 times on transient network/connection failures.
    Fails fast without retries on permanent data/feature/model errors.
    """
    logger.info(
        "Celery task started: generate_live_prediction_task for %s (attempt=%d/%d)",
        symbol,
        self.request.retries + 1,
        self.max_retries + 1,
    )

    try:
        result = LivePredictionService.generate_and_persist_prediction(
            symbol=symbol,
            model_type=model_type,
            version=version,
            price_data=price_data,
        )
        logger.info(
            "Celery task succeeded: generate_live_prediction_task for %s (direction=%s, prob=%.4f)",
            symbol,
            result.get("prediction"),
            result.get("probability", 0.0),
        )
        return result

    except TRANSIENT_ERRORS as exc:
        countdown = 60 * (2 ** self.request.retries)
        logger.warning(
            "Transient failure in generate_live_prediction_task for %s (attempt %d/%d): %s. Retrying in %ds...",
            symbol,
            self.request.retries + 1,
            self.max_retries + 1,
            exc,
            countdown,
        )
        raise self.retry(exc=exc, countdown=countdown)

    except InsufficientDataError as exc:
        logger.warning(
            "Cannot generate prediction for %s: %s. Not retrying.",
            symbol,
            exc,
        )
        return {
            "status": "skipped",
            "reason": "insufficient_data",
            "symbol": symbol,
            "message": str(exc),
        }

    except (
        SymbolNotFoundError,
        ModelNotFoundError,
        MetadataNotFoundError,
        MissingFeaturesError,
        InvalidFeatureDataError,
        InvalidModelInputError,
        ValueError,
    ) as exc:
        logger.error(
            "Permanent failure in generate_live_prediction_task for %s: %s. Not retrying.",
            symbol,
            exc,
        )
        raise

    except Exception as exc:
        logger.exception(
            "Unexpected error in generate_live_prediction_task for %s: %s",
            symbol,
            exc,
        )
        raise


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    name="predictions.tasks.resolve_pending_predictions_task",
)
def resolve_pending_predictions_task(
    self,
    symbol: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Celery task to evaluate PENDING predictions against subsequent realized market prices.
    Runs periodically via Celery Beat or on-demand after market data ingestion.
    """
    from predictions.services.prediction_resolution_service import PredictionResolutionService

    logger.info("Starting resolve_pending_predictions_task (symbol=%s)...", symbol)
    try:
        summary = PredictionResolutionService.resolve_pending_predictions(symbol=symbol)
        logger.info("resolve_pending_predictions_task completed successfully: %s", summary)
        return summary
    except Exception as exc:
        logger.exception("Failed in resolve_pending_predictions_task: %s", exc)
        raise self.retry(exc=exc, countdown=30)

