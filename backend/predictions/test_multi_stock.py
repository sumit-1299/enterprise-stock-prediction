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


from stocks.universe import STOCK_UNIVERSE, get_supported_symbols


class MultiStockSupportTests(TestCase):
    """
    Automated test suite for expanded 14-stock universe support.
    Verifies universe registration, market data presence, distinct model loading,
    prediction service inference for trained stocks, graceful handling of untrained stocks,
    and REST API endpoints for all 14 NSE-listed equities.
    """

    CORE_TRAINED_SYMBOLS = [
        ("TCS.NS", "Tata Consultancy Services Ltd."),
        ("RELIANCE.NS", "Reliance Industries Ltd."),
        ("INFY.NS", "Infosys Ltd."),
        ("HDFCBANK.NS", "HDFC Bank Ltd."),
    ]

    ALL_14_SYMBOLS = [(s["symbol"], s["company_name"]) for s in STOCK_UNIVERSE]

    @classmethod
    def setUpTestData(cls):
        """Seed all 14 universe stocks and 65 daily market price bars for each stock."""
        now = datetime.now(ZoneInfo("Asia/Kolkata"))
        for item in STOCK_UNIVERSE:
            stock, _ = Stock.objects.get_or_create(
                symbol=item["symbol"],
                defaults={
                    "company_name": item["company_name"],
                    "exchange": item["exchange"],
                    "sector": item["sector"],
                    "currency": item["currency"],
                    "is_active": item.get("is_active", True),
                },
            )

            # Generate 65 daily bars with alternating fluctuations to ensure
            # both gains and losses exist for RSI and volatility calculations.
            prices = []
            base_price = 1000.0 + (abs(hash(item["symbol"])) % 500)
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

    def test_all_14_stocks_registered(self):
        """Verify all 14 universe stocks are registered in the Stock table."""
        self.assertEqual(len(self.ALL_14_SYMBOLS), 14, "Must configure exactly 14 NSE symbols.")
        for symbol, name in self.ALL_14_SYMBOLS:
            stock = Stock.objects.filter(symbol=symbol).first()
            self.assertIsNotNone(stock, f"Stock {symbol} must be registered in database.")
            self.assertTrue(stock.is_active, f"Stock {symbol} should be active.")
            self.assertTrue(len(stock.company_name) > 0, f"Stock {symbol} must have a valid company name.")

    def test_stocks_api_list(self):
        """Verify GET /api/stocks/ returns all 14 registered stocks."""
        response = self.client.get("/api/stocks/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 14, f"Expected 14 stocks, got {len(data)}.")
        symbols_returned = {item["symbol"] for item in data}
        for symbol, _ in self.ALL_14_SYMBOLS:
            self.assertIn(symbol, symbols_returned, f"Symbol {symbol} missing from /api/stocks/.")

    def test_stocks_api_detail(self):
        """Verify GET /api/stocks/<symbol>/ returns details for both core and new stocks."""
        for test_sym in ["TCS.NS", "ICICIBANK.NS", "SBIN.NS", "MARUTI.NS"]:
            response = self.client.get(f"/api/stocks/{test_sym}/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.json()
            self.assertEqual(data["symbol"], test_sym)
            self.assertIn("company_name", data)
            self.assertIn("exchange", data)
            self.assertIn("sector", data)

    def test_market_data_ingested_for_all_14(self):
        """Verify all 14 stocks have historical market data bars."""
        for symbol, _ in self.ALL_14_SYMBOLS:
            count = MarketPrice.objects.filter(stock__symbol=symbol).count()
            self.assertGreaterEqual(
                count, 50, f"Stock {symbol} must have at least 50 market data bars (found {count})."
            )

    def test_core_symbols_have_production_models(self):
        """Verify the 4 core symbols have production models registered."""
        for symbol, _ in self.CORE_TRAINED_SYMBOLS:
            model, metadata = ModelRegistry.get_model_for_symbol(symbol)
            self.assertIsNotNone(model, f"Model must be loaded for symbol {symbol}.")
            self.assertIsNotNone(metadata, f"Metadata must exist for symbol {symbol}.")
            self.assertEqual(metadata.get("model_type"), "xgboost_classifier")
            self.assertEqual(metadata.get("symbol"), symbol)
            self.assertEqual(metadata.get("status"), "production")

    def test_prediction_service_core_stocks(self):
        """Verify PredictionService.predict returns valid directional forecasts for core stocks."""
        for symbol, _ in self.CORE_TRAINED_SYMBOLS:
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

    def test_untrained_new_stock_handled_gracefully(self):
        """
        Verify that requesting predictions for an untrained new stock
        (e.g. ICICIBANK.NS) returns a clean MODEL_NOT_FOUND error instead of fake predictions.
        """
        response = self.client.get("/api/predictions/ICICIBANK.NS/")
        # Should return 404 or 500 with MODEL_NOT_FOUND code
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_500_INTERNAL_SERVER_ERROR])
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "MODEL_NOT_FOUND")

    def test_market_data_endpoints_all_14(self):
        """Verify GET /api/market-data/<symbol>/ returns 200 for all 14 symbols."""
        for symbol, _ in self.ALL_14_SYMBOLS:
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

    def test_invalid_symbol_rejected_cleanly(self):
        """Verify invalid stock symbol format is rejected with HTTP 400."""
        response = self.client.get("/api/predictions/INVALID$$SYMBOL/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "INVALID_SYMBOL")

