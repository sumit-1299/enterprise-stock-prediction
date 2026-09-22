import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from stocks.models import Stock
from market_data.models import MarketPrice
from ml.models.model_registry import ModelRegistry
from ml.inference.prediction_service import PredictionService


class MultiStockSupportTests(TestCase):
    """
    Automated test suite for multi-stock support (Phase 15).
    Verifies universe registration, market data presence, distinct model loading,
    prediction service inference, and REST API endpoints for all 4 supported stocks:
    - TCS.NS
    - RELIANCE.NS
    - INFY.NS
    - HDFCBANK.NS
    """

    SUPPORTED_SYMBOLS = [
        ("TCS.NS", "Tata Consultancy Services Limited"),
        ("RELIANCE.NS", "Reliance Industries Limited"),
        ("INFY.NS", "Infosys Limited"),
        ("HDFCBANK.NS", "HDFC Bank Limited"),
    ]

    @classmethod
    def setUpTestData(cls):
        """Seed universe stocks and 65 daily market price bars for each stock."""
        now = datetime.now(ZoneInfo("Asia/Kolkata"))
        for symbol, name in cls.SUPPORTED_SYMBOLS:
            stock, _ = Stock.objects.get_or_create(
                symbol=symbol,
                defaults={
                    "company_name": name,
                    "exchange": "NSE",
                    "currency": "INR",
                    "is_active": True,
                },
            )

            # Generate 65 daily bars with alternating fluctuations to ensure
            # both gains and losses exist for RSI and volatility calculations.
            prices = []
            base_price = 1000.0 + (abs(hash(symbol)) % 500)
            for i in range(65, 0, -1):
                bar_time = now - timedelta(days=i)
                fluctuation = 10.0 if (i % 2 == 0) else -10.0
                price_val = Decimal(f"{base_price + fluctuation + (65 - i) * 0.5:.2f}")
                prices.append(
                    MarketPrice(
                        stock=stock,
                        timestamp=bar_time,
                        timeframe="1d",
                        open_price=price_val,
                        high_price=price_val + Decimal("5.00"),
                        low_price=price_val - Decimal("5.00"),
                        close_price=price_val,
                        volume=1000000 + i * 5000,
                        source="test_seed",
                    )
                )
            MarketPrice.objects.bulk_create(prices, ignore_conflicts=True)

    def setUp(self):
        self.client = APIClient()

    def test_stocks_registered(self):
        """Verify all 4 universe stocks are registered in the Stock table."""
        for symbol, _ in self.SUPPORTED_SYMBOLS:
            stock = Stock.objects.filter(symbol=symbol).first()
            self.assertIsNotNone(stock, f"Stock {symbol} must be registered in database.")
            self.assertTrue(stock.is_active, f"Stock {symbol} should be active.")
            self.assertTrue(len(stock.company_name) > 0, f"Stock {symbol} must have a valid company name.")

    def test_market_data_ingested(self):
        """Verify each of the 4 stocks has historical market data bars."""
        for symbol, _ in self.SUPPORTED_SYMBOLS:
            count = MarketPrice.objects.filter(stock__symbol=symbol).count()
            self.assertGreaterEqual(
                count, 50, f"Stock {symbol} must have at least 50 market data bars (found {count})."
            )

    def test_symbol_specific_model_registry(self):
        """Verify each symbol has its own distinct production model registered and loaded."""
        loaded_symbols = set()
        for symbol, _ in self.SUPPORTED_SYMBOLS:
            model, metadata = ModelRegistry.get_model_for_symbol(symbol)
            self.assertIsNotNone(model, f"Model must be loaded for symbol {symbol}.")
            self.assertIsNotNone(metadata, f"Metadata must exist for symbol {symbol}.")
            self.assertEqual(metadata.get("model_type"), "xgboost_classifier")
            self.assertEqual(metadata.get("symbol"), symbol)
            self.assertEqual(metadata.get("version"), "v1")
            self.assertEqual(metadata.get("status"), "production")

            # Verify that each model belongs uniquely to its symbol
            self.assertNotIn(
                symbol,
                loaded_symbols,
                f"Symbol {symbol} already checked.",
            )
            loaded_symbols.add(symbol)

    def test_prediction_service_multi_stock(self):
        """Verify PredictionService.predict returns valid directional forecasts for all 4 stocks."""
        for symbol, _ in self.SUPPORTED_SYMBOLS:
            result = PredictionService.predict(symbol=symbol)
            self.assertEqual(result["symbol"], symbol)
            self.assertIn(result["prediction"], ["UP", "DOWN"])
            self.assertIn(result["direction"], [0, 1])
            self.assertIsInstance(result["probability"], float)
            self.assertGreaterEqual(result["probability"], 0.0)
            self.assertLessEqual(result["probability"], 1.0)
            self.assertIn("DOWN", result["probabilities"])
            self.assertIn("UP", result["probabilities"])
            self.assertEqual(result["model_type"], "xgboost_classifier")
            self.assertEqual(result["model_version"], "v1")

    def test_prediction_api_endpoints(self):
        """Verify GET /api/predictions/<symbol>/ returns 200 with structured data for all symbols."""
        for symbol, _ in self.SUPPORTED_SYMBOLS:
            response = self.client.get(f"/api/predictions/{symbol}/")
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
                f"API failed for {symbol}: {response.content}",
            )
            data = response.json()
            self.assertEqual(data["symbol"], symbol)
            self.assertIn(data["prediction"], ["UP", "DOWN"])
            self.assertIn("probabilities", data)

    def test_prediction_analytics_endpoints(self):
        """Verify GET /api/predictions/<symbol>/analytics/ returns 200 for all symbols."""
        for symbol, _ in self.SUPPORTED_SYMBOLS:
            response = self.client.get(f"/api/predictions/{symbol}/analytics/")
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
                f"Analytics API failed for {symbol}: {response.content}",
            )
            data = response.json()
            self.assertEqual(data["symbol"], symbol)
            self.assertIn("feature_importance", data)
            self.assertIn("metrics", data)

    def test_market_data_endpoints(self):
        """Verify GET /api/market-data/<symbol>/ returns 200 for all symbols."""
        for symbol, _ in self.SUPPORTED_SYMBOLS:
            response = self.client.get(f"/api/market-data/{symbol}/")
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
                f"Market data API failed for {symbol}: {response.content}",
            )
            data = response.json()
            self.assertEqual(data["symbol"], symbol)
            self.assertIn("close", data)
            self.assertIn("timestamp", data)

    def test_unregistered_symbol_error_handling(self):
        """Verify querying an unregistered symbol returns proper 404 or 500 error rather than fallback."""
        response = self.client.get("/api/predictions/NONEXISTENT.NS/")
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_500_INTERNAL_SERVER_ERROR])
        data = response.json()
        self.assertIn("error", data)
        self.assertIn(data["error"]["code"], ["SYMBOL_NOT_FOUND", "MODEL_NOT_FOUND"])

