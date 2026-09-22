"""
YFinance market data provider implementation.

NOTE: This is a DEVELOPMENT market data provider. It is NOT a guaranteed
exchange-grade real-time feed. For production deployments, replace with a licensed
feed (such as Polygon.io, Alpaca, IEX Cloud, or direct exchange API).
"""

import logging
from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
from typing import List, Optional

import pandas as pd
import yfinance as yf
from django.utils import timezone

from market_data.providers.base import MarketBar, MarketDataProvider

logger = logging.getLogger(__name__)


class YFinanceProvider(MarketDataProvider):
    """
    Development market data provider backed by yfinance.
    """

    @property
    def name(self) -> str:
        return "yfinance"

    @property
    def is_production_feed(self) -> bool:
        # Explicitly marked as development / non-production feed
        return False

    def fetch_historical_data(
        self,
        symbol: str,
        period: str = "1y",
        interval: str = "1d",
    ) -> List[MarketBar]:
        """
        Fetch historical market data via yfinance and normalize into MarketBar objects.
        """
        logger.info(
            "Fetching historical data via yfinance for %s (period=%s, interval=%s)...",
            symbol,
            period,
            interval,
        )

        try:
            ticker = yf.Ticker(symbol)
            data: pd.DataFrame = ticker.history(period=period, interval=interval)
        except Exception as exc:
            logger.error("yfinance request failed for symbol %s: %s", symbol, exc)
            raise ConnectionError(f"Failed to fetch market data from yfinance: {exc}") from exc

        if data.empty:
            logger.warning("No market data returned by yfinance for symbol %s", symbol)
            return []

        bars: List[MarketBar] = []

        for timestamp, row in data.iterrows():
            # Check for NaN / missing values in required fields
            if (
                pd.isna(row.get("Open"))
                or pd.isna(row.get("High"))
                or pd.isna(row.get("Low"))
                or pd.isna(row.get("Close"))
                or pd.isna(row.get("Volume"))
            ):
                logger.debug("Skipping row with NaN values at timestamp %s", timestamp)
                continue

            # Ensure timestamp is a timezone-aware datetime in UTC
            dt = timestamp.to_pydatetime()
            if dt.tzinfo is None:
                dt = timezone.make_aware(dt, dt_timezone.utc)
            else:
                dt = dt.astimezone(dt_timezone.utc)

            bar = MarketBar(
                timestamp=dt,
                open_price=Decimal(str(round(float(row["Open"]), 4))),
                high_price=Decimal(str(round(float(row["High"]), 4))),
                low_price=Decimal(str(round(float(row["Low"]), 4))),
                close_price=Decimal(str(round(float(row["Close"]), 4))),
                volume=int(row["Volume"]),
                timeframe=interval,
                source=self.name,
            )
            bars.append(bar)

        logger.info(
            "Successfully normalized %d market bars for %s from yfinance.",
            len(bars),
            symbol,
        )
        return bars

    def fetch_latest_quote(
        self,
        symbol: str,
    ) -> Optional[MarketBar]:
        """
        Fetch the most recent bar/quote for a given symbol.
        """
        logger.info("Fetching latest market quote via yfinance for %s...", symbol)
        # Fetch last 5 days to ensure we capture the most recent trading session
        bars = self.fetch_historical_data(symbol=symbol, period="5d", interval="1d")
        if not bars:
            return None
        # Return the most recent bar
        return bars[-1]
