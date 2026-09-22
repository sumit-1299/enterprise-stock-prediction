"""
Unit tests for the Market Data Ingestion Layer, Provider Abstraction, and Validation.
"""

import os
import sys
from datetime import datetime, time, timezone
from decimal import Decimal
from pathlib import Path
from typing import List, Optional
from unittest import TestCase
from unittest.mock import MagicMock, patch

# Ensure paths and Django environment are initialized
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()

from market_data.models import MarketPrice
from market_data.providers.base import MarketBar, MarketDataProvider
from market_data.providers.factory import get_market_data_provider
from market_data.providers.yfinance_provider import YFinanceProvider
from market_data.services.market_data_service import MarketDataService
from market_data.services.market_session import MarketSession
from stocks.models import Stock


class MockTestProvider(MarketDataProvider):
    """Mock provider for unit testing without external network dependencies."""

    def __init__(self, bars: Optional[List[MarketBar]] = None, fail: bool = False):
        self._bars = bars or []
        self._fail = fail

    @property
    def name(self) -> str:
        return "mock_provider"

    @property
    def is_production_feed(self) -> bool:
        return False

    def fetch_historical_data(
        self, symbol: str, period: str = "1y", interval: str = "1d"
    ) -> List[MarketBar]:
        if self._fail:
            raise ConnectionError("Mock provider network failure")
        return self._bars

    def fetch_latest_quote(self, symbol: str) -> Optional[MarketBar]:
        if self._fail:
            raise ConnectionError("Mock provider network failure")
        return self._bars[-1] if self._bars else None


class TestMarketDataIngestion(TestCase):

    def setUp(self):
        # Ensure TCS.NS stock exists in test database
        self.stock, _ = Stock.objects.get_or_create(
            symbol="TCS.NS",
            defaults={
                "company_name": "Tata Consultancy Services",
                "exchange": "NSE",
                "sector": "Information Technology",
            },
        )

    # 1. Provider interface
    def test_provider_interface(self):
        """Verify provider implements required interface properties and methods."""
        provider = YFinanceProvider()
        self.assertEqual(provider.name, "yfinance")
        self.assertFalse(provider.is_production_feed)
        self.assertTrue(callable(provider.fetch_historical_data))
        self.assertTrue(callable(provider.fetch_latest_quote))

    # 2. Provider factory
    def test_provider_factory(self):
        """Verify provider factory instantiates correct provider class."""
        provider = get_market_data_provider("yfinance")
        self.assertIsInstance(provider, YFinanceProvider)

        with self.assertRaises(ValueError):
            get_market_data_provider("unsupported_provider_xyz")

    # 3. Valid OHLC data validation
    def test_valid_ohlc_bar(self):
        """Verify that valid OHLC relationships pass validation."""
        bar = MarketBar(
            timestamp=datetime(2026, 9, 21, 10, 0, tzinfo=timezone.utc),
            open_price=Decimal("100.00"),
            high_price=Decimal("105.00"),
            low_price=Decimal("95.00"),
            close_price=Decimal("102.00"),
            volume=10000,
            source="test",
        )
        self.assertTrue(bar.is_valid_ohlc())

    # 4. Invalid OHLC data validation
    def test_invalid_ohlc_bars(self):
        """Verify that violating OHLC constraints fails validation."""
        base_ts = datetime(2026, 9, 21, 10, 0, tzinfo=timezone.utc)

        # High < Low
        bar_high_lt_low = MarketBar(
            timestamp=base_ts,
            open_price=Decimal("100.00"),
            high_price=Decimal("90.00"),
            low_price=Decimal("95.00"),
            close_price=Decimal("92.00"),
            volume=1000,
        )
        self.assertFalse(bar_high_lt_low.is_valid_ohlc())

        # High < Open
        bar_high_lt_open = MarketBar(
            timestamp=base_ts,
            open_price=Decimal("110.00"),
            high_price=Decimal("105.00"),
            low_price=Decimal("95.00"),
            close_price=Decimal("100.00"),
            volume=1000,
        )
        self.assertFalse(bar_high_lt_open.is_valid_ohlc())

        # Low > Close
        bar_low_gt_close = MarketBar(
            timestamp=base_ts,
            open_price=Decimal("100.00"),
            high_price=Decimal("105.00"),
            low_price=Decimal("98.00"),
            close_price=Decimal("95.00"),
            volume=1000,
        )
        self.assertFalse(bar_low_gt_close.is_valid_ohlc())

        # Negative price
        bar_negative_price = MarketBar(
            timestamp=base_ts,
            open_price=Decimal("-10.00"),
            high_price=Decimal("105.00"),
            low_price=Decimal("95.00"),
            close_price=Decimal("100.00"),
            volume=1000,
        )
        self.assertFalse(bar_negative_price.is_valid_ohlc())

        # Negative volume
        bar_negative_vol = MarketBar(
            timestamp=base_ts,
            open_price=Decimal("100.00"),
            high_price=Decimal("105.00"),
            low_price=Decimal("95.00"),
            close_price=Decimal("100.00"),
            volume=-50,
        )
        self.assertFalse(bar_negative_vol.is_valid_ohlc())

    # 5. Idempotent persistence & duplicate prevention
    def test_idempotent_ingestion(self):
        """Verify that ingesting identical bars twice updates rather than duplicates records."""
        test_ts = datetime(2026, 9, 21, 15, 30, tzinfo=timezone.utc)
        bar = MarketBar(
            timestamp=test_ts,
            open_price=Decimal("2000.00"),
            high_price=Decimal("2050.00"),
            low_price=Decimal("1990.00"),
            close_price=Decimal("2020.00"),
            volume=500000,
            source="mock_test",
        )
        mock_provider = MockTestProvider(bars=[bar])

        # First ingestion
        res1 = MarketDataService.fetch_historical_data(
            symbol="TCS.NS",
            period="1d",
            provider=mock_provider,
        )
        self.assertEqual(res1["records_created"] + res1["records_updated"], 1)

        # Second ingestion with identical timestamp & source
        res2 = MarketDataService.fetch_historical_data(
            symbol="TCS.NS",
            period="1d",
            provider=mock_provider,
        )
        # Should be updated, not created
        self.assertEqual(res2["records_created"], 0)
        self.assertEqual(res2["records_updated"], 1)

        # Verify exactly one record exists in database for this timestamp
        count = MarketPrice.objects.filter(
            stock=self.stock,
            timestamp=test_ts,
            source="mock_test",
        ).count()
        self.assertEqual(count, 1)

        # Cleanup test record
        MarketPrice.objects.filter(stock=self.stock, source="mock_test").delete()

    # 6. Near-real-time polling cycle
    def test_run_ingestion_cycle(self):
        """Verify single polling cycle runs, validates, and records session info."""
        test_ts = datetime(2026, 9, 21, 15, 30, tzinfo=timezone.utc)
        bar = MarketBar(
            timestamp=test_ts,
            open_price=Decimal("2100.00"),
            high_price=Decimal("2150.00"),
            low_price=Decimal("2090.00"),
            close_price=Decimal("2120.00"),
            volume=300000,
            source="mock_poll",
        )
        mock_provider = MockTestProvider(bars=[bar])

        poll_result = MarketDataService.run_ingestion_cycle(
            symbol="TCS.NS",
            provider=mock_provider,
        )

        self.assertEqual(poll_result["symbol"], "TCS.NS")
        self.assertEqual(poll_result["provider"], "mock_provider")
        self.assertIn(poll_result["action"], ["created", "updated"])
        self.assertEqual(poll_result["close_price"], 2120.00)
        self.assertIn("market_session", poll_result)
        self.assertIn("is_open", poll_result["market_session"])

        # Cleanup test record
        MarketPrice.objects.filter(stock=self.stock, source="mock_poll").delete()

    # 7. Provider failure handling
    def test_provider_failure(self):
        """Verify provider connection error raises ConnectionError."""
        failing_provider = MockTestProvider(fail=True)
        with self.assertRaises(ConnectionError):
            MarketDataService.fetch_historical_data(
                symbol="TCS.NS",
                provider=failing_provider,
            )

    # 8. Unregistered symbol handling
    def test_unregistered_symbol(self):
        """Verify requesting data for an unlisted stock raises ValueError."""
        provider = MockTestProvider(bars=[])
        with self.assertRaises(ValueError) as ctx:
            MarketDataService.fetch_historical_data(
                symbol="UNLISTED_STOCK_XYZ",
                provider=provider,
            )
        self.assertIn("not registered in the database", str(ctx.exception))

    # 9. Market session awareness
    def test_market_session_awareness(self):
        """Verify market session correctly identifies trading vs closed hours."""
        # Wednesday 11:00 AM IST -> Market Open
        wednesday_open = datetime(2026, 9, 23, 5, 30, tzinfo=timezone.utc) # 11:00 AM IST
        self.assertTrue(MarketSession.is_market_open(dt=wednesday_open))

        # Sunday 11:00 AM IST -> Weekend (Closed)
        sunday_closed = datetime(2026, 9, 20, 5, 30, tzinfo=timezone.utc) # 11:00 AM IST
        self.assertFalse(MarketSession.is_market_open(dt=sunday_closed))

        # Wednesday 11:00 PM IST -> Night (Closed)
        wednesday_night = datetime(2026, 9, 23, 17, 30, tzinfo=timezone.utc) # 11:00 PM IST
        self.assertFalse(MarketSession.is_market_open(dt=wednesday_night))
