"""
Market Data Ingestion Service.

Coordinates data ingestion from configured MarketDataProviders, validates and
normalizes market bars, and persists them idempotently into PostgreSQL.
"""

import logging
import time
from typing import Any, Dict, Optional

from django.db import transaction

from market_data.models import MarketPrice
from market_data.providers.base import MarketBar, MarketDataProvider
from market_data.providers.factory import get_market_data_provider
from market_data.services.market_session import MarketSession
from stocks.models import Stock

logger = logging.getLogger(__name__)


class MarketDataService:
    """
    Core service for ingesting and validating stock market data.
    """

    @staticmethod
    @transaction.atomic
    def fetch_historical_data(
        symbol: str,
        period: str = "1y",
        interval: str = "1d",
        provider: Optional[MarketDataProvider] = None,
    ) -> Dict[str, Any]:
        """
        Fetch historical market bars from the provider, validate OHLCV constraints,
        and persist them into PostgreSQL idempotently.
        """
        start_time = time.time()
        provider = provider or get_market_data_provider()

        logger.info(
            "Starting historical data ingestion for %s (provider=%s, period=%s, interval=%s)...",
            symbol,
            provider.name,
            period,
            interval,
        )

        try:
            stock = Stock.objects.get(symbol=symbol)
        except Stock.DoesNotExist:
            logger.error("Stock symbol '%s' not registered in database.", symbol)
            raise ValueError(
                f"Stock symbol '{symbol}' is not registered in the database. "
                "Please add the stock to the stocks table first."
            )

        # 1. Fetch normalized bars from the provider
        raw_bars = provider.fetch_historical_data(
            symbol=symbol,
            period=period,
            interval=interval,
        )

        if not raw_bars:
            logger.warning("No market bars received from provider %s for %s", provider.name, symbol)
            raise ValueError(f"No market data found for {symbol} via provider '{provider.name}'")

        records_created = 0
        records_updated = 0
        validation_failures = 0

        # 2. Validate and persist each bar idempotently
        for bar in raw_bars:
            if not bar.is_valid_ohlc():
                validation_failures += 1
                logger.warning(
                    "Invalid OHLC bar rejected for %s at %s: O=%s, H=%s, L=%s, C=%s, V=%s",
                    symbol,
                    bar.timestamp,
                    bar.open_price,
                    bar.high_price,
                    bar.low_price,
                    bar.close_price,
                    bar.volume,
                )
                continue

            _, created = MarketPrice.objects.update_or_create(
                stock=stock,
                timestamp=bar.timestamp,
                timeframe=bar.timeframe,
                source=bar.source,
                defaults={
                    "open_price": bar.open_price,
                    "high_price": bar.high_price,
                    "low_price": bar.low_price,
                    "close_price": bar.close_price,
                    "volume": bar.volume,
                },
            )

            if created:
                records_created += 1
            else:
                records_updated += 1

        duration_ms = round((time.time() - start_time) * 1000, 2)

        result: Dict[str, Any] = {
            "symbol": symbol,
            "provider": provider.name,
            "is_production_feed": provider.is_production_feed,
            "records_fetched": len(raw_bars),
            "records_created": records_created,
            "records_updated": records_updated,
            "validation_failures": validation_failures,
            "duration_ms": duration_ms,
        }

        logger.info(
            "Ingestion completed for %s: %d created, %d updated, %d invalid (%d ms)",
            symbol,
            records_created,
            records_updated,
            validation_failures,
            duration_ms,
        )
        return result

    @staticmethod
    @transaction.atomic
    def run_ingestion_cycle(
        symbol: str,
        interval: str = "1d",
        provider: Optional[MarketDataProvider] = None,
    ) -> Dict[str, Any]:
        """
        Execute a single near-real-time ingestion cycle (poll).

        Fetches the latest quote/bar, validates it, and updates PostgreSQL.
        Includes market session awareness (open vs closed).
        """
        start_time = time.time()
        provider = provider or get_market_data_provider()

        logger.info(
            "Executing near-real-time polling cycle for %s (provider=%s)...",
            symbol,
            provider.name,
        )

        try:
            stock = Stock.objects.get(symbol=symbol)
        except Stock.DoesNotExist:
            raise ValueError(f"Stock symbol '{symbol}' is not registered in the database.")

        # Check market session status
        session_info = MarketSession.get_session_info(exchange=stock.exchange)

        # Fetch latest quote/bar
        latest_bar = provider.fetch_latest_quote(symbol=symbol)
        if not latest_bar:
            raise ValueError(f"No recent market quote available for {symbol} from {provider.name}")

        if not latest_bar.is_valid_ohlc():
            raise ValueError(
                f"Invalid OHLC quote rejected for {symbol}: "
                f"O={latest_bar.open_price}, H={latest_bar.high_price}, "
                f"L={latest_bar.low_price}, C={latest_bar.close_price}"
            )

        _, created = MarketPrice.objects.update_or_create(
            stock=stock,
            timestamp=latest_bar.timestamp,
            timeframe=interval,
            source=latest_bar.source,
            defaults={
                "open_price": latest_bar.open_price,
                "high_price": latest_bar.high_price,
                "low_price": latest_bar.low_price,
                "close_price": latest_bar.close_price,
                "volume": latest_bar.volume,
            },
        )

        duration_ms = round((time.time() - start_time) * 1000, 2)

        # Trigger live prediction pipeline (inference, persistence, and real-time event)
        prediction_data = None
        try:
            from predictions.services.live_prediction_service import LivePredictionService
            prediction_data = LivePredictionService.generate_and_persist_prediction(
                symbol=symbol,
                price_data={
                    "timestamp": latest_bar.timestamp.isoformat(),
                    "close_price": float(latest_bar.close_price),
                    "volume": latest_bar.volume,
                },
            )
        except Exception as pred_err:
            logger.warning(
                "Live prediction pipeline could not generate prediction for %s: %s",
                symbol,
                pred_err,
            )
            # Fallback: publish market-only event if prediction failed
            from market_data.services.realtime_service import RealtimeEventService
            RealtimeEventService.publish_market_update(
                symbol=symbol,
                price_data={
                    "timestamp": latest_bar.timestamp.isoformat(),
                    "close_price": float(latest_bar.close_price),
                    "volume": latest_bar.volume,
                },
            )

        return {
            "symbol": symbol,
            "provider": provider.name,
            "is_production_feed": provider.is_production_feed,
            "action": "created" if created else "updated",
            "timestamp": latest_bar.timestamp.isoformat(),
            "close_price": float(latest_bar.close_price),
            "volume": latest_bar.volume,
            "market_session": session_info,
            "duration_ms": duration_ms,
        }