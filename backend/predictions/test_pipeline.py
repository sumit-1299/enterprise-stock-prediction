"""
Unit tests for Phase 8: Live Prediction Pipeline, Persistence, and Idempotency.
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from pathlib import Path
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

from django.test import override_settings
from rest_framework.test import APIClient

from market_data.models import MarketPrice
from market_data.providers.base import MarketBar
from market_data.services.market_data_service import MarketDataService
from ml.inference.exceptions import InsufficientDataError, SymbolNotFoundError
from predictions.models import Prediction
from predictions.services.live_prediction_service import LivePredictionService
from predictions.tasks import generate_live_prediction_task
from stocks.models import Stock


class TestLivePredictionPipeline(TestCase):
    """Test suite for the live prediction pipeline, persistence, and idempotency."""

    def setUp(self):
        self.client = APIClient()
        self.stock, _ = Stock.objects.get_or_create(
            symbol="TCS.NS",
            defaults={
                "company_name": "Tata Consultancy Services",
                "exchange": "NSE",
                "sector": "Information Technology",
            },
        )
        Prediction.objects.filter(stock=self.stock).delete()
        MarketPrice.objects.filter(stock=self.stock).delete()

        # Seed 60 historical market price bars for TCS.NS so technical features (e.g. SMA-50, RSI-14) can compute
        base_time = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)
        prices = [
            MarketPrice(
                stock=self.stock,
                timestamp=base_time + timedelta(days=i),
                open_price=Decimal("4000.00") + Decimal((i % 7 - 3) * 10),
                high_price=Decimal("4050.00") + Decimal((i % 7 - 3) * 10),
                low_price=Decimal("3950.00") + Decimal((i % 7 - 3) * 10),
                close_price=Decimal("4020.00") + Decimal((i % 7 - 3) * 10 + (5 if i % 2 == 0 else -5)),
                volume=1000000 + (i % 10) * 10000,
            )
            for i in range(60)
        ]
        MarketPrice.objects.bulk_create(prices)

    @patch("predictions.services.live_prediction_service.RealtimeEventService.publish_prediction_update")
    def test_generate_and_persist_prediction_success(self, mock_publish):
        """Verify LivePredictionService generates prediction, persists to PostgreSQL, and publishes event."""
        result = LivePredictionService.generate_and_persist_prediction(symbol="TCS.NS")

        self.assertEqual(result["symbol"], "TCS.NS")
        self.assertIn(result["prediction"], ["UP", "DOWN"])
        self.assertIn(result["direction"], [0, 1])
        self.assertGreaterEqual(result["probability"], 0.0)
        self.assertLessEqual(result["probability"], 1.0)
        self.assertEqual(result["model_type"], "xgboost_classifier")
        self.assertEqual(result["model_version"], "v1")

        # Verify persisted record exists in DB
        db_record = Prediction.objects.filter(symbol="TCS.NS").order_by("-generated_at").first()
        self.assertIsNotNone(db_record)
        self.assertEqual(db_record.symbol, "TCS.NS")
        self.assertEqual(db_record.prediction, result["prediction"])
        self.assertEqual(db_record.probability, result["probability"])

        # Verify real-time event was dispatched
        mock_publish.assert_called_once()
        _, kwargs = mock_publish.call_args
        self.assertEqual(kwargs["symbol"], "TCS.NS")
        self.assertEqual(kwargs["prediction_data"]["prediction"], result["prediction"])

    def test_idempotent_prediction_persistence(self):
        """Verify repeated prediction generation for the same market timestamp does not duplicate records."""
        # Initial run
        result_1 = LivePredictionService.generate_and_persist_prediction(symbol="TCS.NS")
        initial_count = Prediction.objects.filter(
            symbol="TCS.NS",
            market_data_timestamp=result_1["market_data_timestamp"],
        ).count()
        self.assertEqual(initial_count, 1)

        # Second run with same underlying market timestamp
        result_2 = LivePredictionService.generate_and_persist_prediction(symbol="TCS.NS")
        final_count = Prediction.objects.filter(
            symbol="TCS.NS",
            market_data_timestamp=result_2["market_data_timestamp"],
        ).count()

        self.assertEqual(final_count, 1, "Duplicate prediction record was created for same market timestamp!")
        self.assertEqual(result_2["action"], "updated")

    def test_insufficient_data_does_not_create_prediction(self):
        """Verify that a stock with < 50 records raises InsufficientDataError and does not persist."""
        sparse_stock, _ = Stock.objects.get_or_create(
            symbol="SPARSE.NS",
            defaults={"company_name": "Sparse Data Stock", "exchange": "NSE"},
        )
        # Clean up any existing records
        MarketPrice.objects.filter(stock=sparse_stock).delete()
        Prediction.objects.filter(stock=sparse_stock).delete()

        # Insert only 5 records (less than 50 minimum required)
        for i in range(5):
            MarketPrice.objects.create(
                stock=sparse_stock,
                timestamp=datetime(2026, 9, 15 + i, 10, 0, tzinfo=timezone.utc),
                open_price=Decimal("100.00"),
                high_price=Decimal("105.00"),
                low_price=Decimal("95.00"),
                close_price=Decimal("102.00"),
                volume=50000,
            )

        with self.assertRaises(InsufficientDataError):
            LivePredictionService.generate_and_persist_prediction(symbol="SPARSE.NS")

        self.assertEqual(
            Prediction.objects.filter(stock=sparse_stock).count(),
            0,
            "Prediction was persisted despite insufficient data!",
        )

    def test_unregistered_stock_raises_symbol_not_found(self):
        """Verify unregistered symbol raises SymbolNotFoundError."""
        with self.assertRaises(SymbolNotFoundError):
            LivePredictionService.generate_and_persist_prediction(symbol="NONEXISTENT_XYZ")

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
    def test_celery_generate_live_prediction_task_success(self):
        """Verify Celery task executes live prediction and returns structured result."""
        async_result = generate_live_prediction_task.apply(args=["TCS.NS"])
        self.assertTrue(async_result.successful())
        result = async_result.result
        self.assertEqual(result["symbol"], "TCS.NS")
        self.assertIn(result["prediction"], ["UP", "DOWN"])

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
    def test_celery_task_insufficient_data_skips_without_crash(self):
        """Verify Celery task skips gracefully when insufficient data exists without raising unhandled error."""
        sparse_stock, _ = Stock.objects.get_or_create(
            symbol="SPARSE2.NS",
            defaults={"company_name": "Sparse Stock 2", "exchange": "NSE"},
        )
        MarketPrice.objects.filter(stock=sparse_stock).delete()

        async_result = generate_live_prediction_task.apply(args=["SPARSE2.NS"])
        self.assertTrue(async_result.successful())
        result = async_result.result
        self.assertEqual(result["status"], "skipped")
        self.assertEqual(result["reason"], "insufficient_data")

    def test_rest_api_prediction_returns_persisted_prediction(self):
        """Verify GET /api/predictions/<symbol>/ returns valid prediction payload."""
        response = self.client.get("/api/predictions/TCS.NS/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["symbol"], "TCS.NS")
        self.assertIn(data["prediction"], ["UP", "DOWN"])
        self.assertIn("probability", data)
        self.assertIn("probabilities", data)
        self.assertIn("model_type", data)
        self.assertIn("model_version", data)

    def test_rest_api_prediction_history_bounded(self):
        """Verify GET /api/predictions/<symbol>/history/ returns bounded historical list."""
        # Ensure at least one prediction exists
        LivePredictionService.generate_and_persist_prediction(symbol="TCS.NS")

        response = self.client.get("/api/predictions/TCS.NS/history/?limit=5")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["symbol"], "TCS.NS")
        self.assertLessEqual(len(data["history"]), 5)
        self.assertEqual(data["limit"], 5)
        if data["history"]:
            item = data["history"][0]
            self.assertIn("prediction", item)
            self.assertIn("probability", item)
            self.assertIn("generated_at", item)
            self.assertIn("model_version", item)

    def test_rest_api_prediction_history_invalid_symbol(self):
        """Verify GET /api/predictions/<symbol>/history/ returns 404 for unknown stock."""
        response = self.client.get("/api/predictions/NONEXISTENT_STOCK/history/")
        self.assertEqual(response.status_code, 404)

    @patch("market_data.services.market_data_service.get_market_data_provider")
    def test_market_ingestion_cycle_triggers_prediction_pipeline(self, mock_get_provider):
        """Verify running an ingestion cycle automatically persists market bar and generates prediction."""
        mock_provider = MagicMock()
        mock_bar = MarketBar(
            timestamp=datetime(2026, 9, 21, 15, 30, tzinfo=timezone.utc),
            open_price=Decimal("4200.00"),
            high_price=Decimal("4280.00"),
            low_price=Decimal("4190.00"),
            close_price=Decimal("4260.00"),
            volume=1500000,
            source="yfinance",
            timeframe="1d",
        )
        mock_provider.name = "mock_provider"
        mock_provider.is_production_feed = False
        mock_provider.fetch_latest_quote.return_value = mock_bar
        mock_get_provider.return_value = mock_provider

        # Run ingestion cycle
        ingest_result = MarketDataService.run_ingestion_cycle(symbol="TCS.NS")
        self.assertEqual(ingest_result["symbol"], "TCS.NS")

        # Verify prediction was generated and persisted
        latest_pred = Prediction.objects.filter(symbol="TCS.NS").order_by("-generated_at").first()
        self.assertIsNotNone(latest_pred)
        self.assertIn(latest_pred.prediction, ["UP", "DOWN"])

