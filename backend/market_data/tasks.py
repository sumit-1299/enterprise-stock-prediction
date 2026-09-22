"""
Celery background tasks for market data ingestion.

Provides asynchronous and scheduled execution for market data polling and historical
ingestion with bounded retry logic for transient network failures.
"""

import logging
from typing import Any, Dict, List

from celery import shared_task
from django.conf import settings

from market_data.services.market_data_service import MarketDataService
from stocks.models import Stock

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
    name="market_data.tasks.ingest_market_data_task",
)
def ingest_market_data_task(
    self,
    symbol: str,
    period: str = "1y",
    interval: str = "1d",
) -> Dict[str, Any]:
    """
    Celery task to ingest historical market data for a given stock symbol.

    Retries up to 3 times with exponential backoff on transient network failures.
    Permanent validation errors and missing stocks fail immediately without retry.
    """
    logger.info(
        "Celery task started: ingest_market_data_task for %s (period=%s, interval=%s, attempt=%d/%d)",
        symbol,
        period,
        interval,
        self.request.retries + 1,
        self.max_retries + 1,
    )

    try:
        result = MarketDataService.fetch_historical_data(
            symbol=symbol,
            period=period,
            interval=interval,
        )
        logger.info(
            "Celery task succeeded: ingest_market_data_task for %s (created=%d, updated=%d)",
            symbol,
            result["records_created"],
            result["records_updated"],
        )
        return result

    except TRANSIENT_ERRORS as exc:
        countdown = 60 * (2 ** self.request.retries)
        logger.warning(
            "Transient failure ingesting %s (attempt %d/%d): %s. Retrying in %ds...",
            symbol,
            self.request.retries + 1,
            self.max_retries + 1,
            exc,
            countdown,
        )
        raise self.retry(exc=exc, countdown=countdown)

    except (ValueError, Stock.DoesNotExist) as exc:
        logger.error(
            "Permanent error ingesting %s: %s. Not retrying.",
            symbol,
            exc,
        )
        raise

    except Exception as exc:
        logger.exception("Unexpected error in ingest_market_data_task for %s: %s", symbol, exc)
        raise


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="market_data.tasks.poll_market_data_task",
)
def poll_market_data_task(
    self,
    symbol: str,
    interval: str = "1d",
) -> Dict[str, Any]:
    """
    Celery task to execute a single near-real-time polling cycle for a stock symbol.

    Retries up to 3 times with exponential backoff on transient network failures.
    Permanent validation errors fail immediately without retry.
    """
    logger.info(
        "Celery task started: poll_market_data_task for %s (interval=%s, attempt=%d/%d)",
        symbol,
        interval,
        self.request.retries + 1,
        self.max_retries + 1,
    )

    try:
        result = MarketDataService.run_ingestion_cycle(
            symbol=symbol,
            interval=interval,
        )
        logger.info(
            "Celery task succeeded: poll_market_data_task for %s (action=%s, close=%s)",
            symbol,
            result["action"],
            result["close_price"],
        )
        return result

    except TRANSIENT_ERRORS as exc:
        countdown = 60 * (2 ** self.request.retries)
        logger.warning(
            "Transient failure polling %s (attempt %d/%d): %s. Retrying in %ds...",
            symbol,
            self.request.retries + 1,
            self.max_retries + 1,
            exc,
            countdown,
        )
        raise self.retry(exc=exc, countdown=countdown)

    except (ValueError, Stock.DoesNotExist) as exc:
        logger.error(
            "Permanent error polling %s: %s. Not retrying.",
            symbol,
            exc,
        )
        raise

    except Exception as exc:
        logger.exception("Unexpected error in poll_market_data_task for %s: %s", symbol, exc)
        raise


@shared_task(name="market_data.tasks.scheduled_market_data_ingest")
def scheduled_market_data_ingest() -> Dict[str, Any]:
    """
    Celery beat periodic task to trigger polling for all configured MARKET_DATA_SYMBOLS.
    Dispatches asynchronous poll_market_data_task tasks to Celery worker queue.
    """
    symbols: List[str] = getattr(settings, "MARKET_DATA_SYMBOLS", ["TCS.NS"])
    dispatched = []

    logger.info("Celery beat: triggering scheduled market data ingestion for %d symbols: %s", len(symbols), symbols)

    for symbol in symbols:
        task_result = poll_market_data_task.delay(symbol=symbol)
        dispatched.append({"symbol": symbol, "task_id": task_result.id})
        logger.info("Dispatched poll_market_data_task for %s with task_id=%s", symbol, task_result.id)

    return {
        "status": "dispatched",
        "dispatched_count": len(dispatched),
        "tasks": dispatched,
    }

