"""
Base abstractions and data structures for market data providers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import List, Optional


@dataclass(frozen=True)
class MarketBar:
    """
    Standardized, provider-agnostic representation of an OHLCV market data bar.
    """
    timestamp: datetime
    open_price: Decimal
    high_price: Decimal
    low_price: Decimal
    close_price: Decimal
    volume: int
    timeframe: str = "1d"
    source: str = "unknown"

    def is_valid_ohlc(self) -> bool:
        """
        Validate OHLC constraints:
        1. All prices must be positive.
        2. Volume must be non-negative.
        3. High must be >= max(open, close, low).
        4. Low must be <= min(open, close, high).
        """
        if (
            self.open_price <= 0
            or self.high_price <= 0
            or self.low_price <= 0
            or self.close_price <= 0
            or self.volume < 0
        ):
            return False

        if (
            self.high_price < self.open_price
            or self.high_price < self.close_price
            or self.high_price < self.low_price
        ):
            return False

        if (
            self.low_price > self.open_price
            or self.low_price > self.close_price
            or self.low_price > self.high_price
        ):
            return False

        return True


@dataclass(frozen=True)
class MarketQuote:
    """
    Standardized, provider-agnostic representation of a real-time/latest price quote.
    """
    symbol: str
    timestamp: datetime
    price: Decimal
    open_price: Decimal
    high_price: Decimal
    low_price: Decimal
    volume: int
    source: str = "unknown"


class MarketDataProvider(ABC):
    """
    Abstract interface for market data providers.

    All market data feeds (development providers like yfinance, or production-grade
    licensed feeds like Polygon, Alpaca, IEX, or NSE direct) must implement this interface.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier string (e.g., 'yfinance', 'polygon')."""
        pass

    @property
    @abstractmethod
    def is_production_feed(self) -> bool:
        """
        Returns True only if this provider delivers guaranteed exchange-grade
        real-time streaming data. For development/delayed providers, returns False.
        """
        pass

    @abstractmethod
    def fetch_historical_data(
        self,
        symbol: str,
        period: str = "1y",
        interval: str = "1d",
    ) -> List[MarketBar]:
        """
        Fetch historical OHLCV data bars for a given symbol.

        Args:
            symbol: Ticker symbol (e.g., 'TCS.NS').
            period: Time window (e.g., '5d', '1mo', '1y').
            interval: Bar granularity (e.g., '1d', '1h', '5m').

        Returns:
            List of normalized MarketBar instances.
        """
        pass

    @abstractmethod
    def fetch_latest_quote(
        self,
        symbol: str,
    ) -> Optional[MarketBar]:
        """
        Fetch the most recent bar/quote for a given symbol.

        Args:
            symbol: Ticker symbol (e.g., 'TCS.NS').

        Returns:
            Latest MarketBar instance, or None if unavailable.
        """
        pass

