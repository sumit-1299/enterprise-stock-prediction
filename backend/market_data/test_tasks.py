"""
Unit tests for Celery Background Tasks, Redis Configuration, and Asynchronous Ingestion.
"""

import os
import sys
from decimal import Decimal
from io import StringIO
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

from django.conf import settings
from django.core.management import call_command
from django.test import override_settings

from config.celery import app as celery_app
from market_data.models import MarketPrice
from market_data.tasks import (
    ingest_market_data_task,
    poll_market_data_task,
    scheduled_market_data_ingest,
)
from stocks.models import Stock


class TestCeleryConfiguration(TestCase):
    """Verify Celery app initialization and settings configuration."""

    def test_celery_app_loaded(self):
        """Verify Celery app is loaded and has correct main name."""
        self.assertEqual(celery_app.main, "config")

    def test_celery_settings(self):
        """Verify Celery settings are properly configured in Django settings."""
        self.assertTrue(hasattr(settings, "CELERY_BROKER_URL"))
        self.assertTrue(hasattr(settings, "CELERY_RESULT_BACKEND"))
        self.assertEqual(settings.CELERY_TASK_SERIALIZER, "json")
        self.assertEqual(settings.CELERY_RESULT_SERIALIZER, "json")
        self.assertEqual(settings.CELERY_ACCEPT_CONTENT, ["json"])
        self.assertEqual(settings.CELERY_TIMEZONE, "UTC")
        self.assertTrue(settings.CELERY_TASK_TRACK_STARTED)
        self.assertEqual(settings.CELERY_TASK_TIME_LIMIT, 300)

    def test_celery_beat_schedule(self):
        """Verify periodic beat schedule is defined for market data polling."""
        self.assertTrue(hasattr(settings, "CELERY_BEAT_SCHEDULE"))
        self.assertIn("poll-market-data-regularly", settings.CELERY_BEAT_SCHEDULE)
        beat_task = settings.CELERY_BEAT_SCHEDULE["poll-market-data-regularly"]
        self.assertEqual(beat_task["task"], "market_data.tasks.scheduled_market_data_ingest")


class TestCeleryTasks(TestCase):
    """Verify execution, error handling, retries, and idempotency of Celery tasks."""

    def setUp(self):
        self.stock, _ = Stock.objects.get_or_create(
            symbol="TCS.NS",
            defaults={
                "company_name": "Tata Consultancy Services",
                "exchange": "NSE",
                "sector": "Information Technology",
            },
        )

    @patch("market_data.tasks.MarketDataService.fetch_historical_data")
    def test_ingest_market_data_task_success(self, mock_fetch):
        """Verify successful execution of historical ingestion task."""
        mock_fetch.return_value = {
            "symbol": "TCS.NS",
            "provider": "mock_provider",
            "is_production_feed": False,
            "records_fetched": 100,
            "records_created": 100,
            "records_updated": 0,
            "validation_failures": 0,
            "duration_ms": 150.0,
        }

        with override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True):
            result = ingest_market_data_task.apply(args=["TCS.NS", "1y", "1d"])
            self.assertTrue(result.successful())
            self.assertEqual(result.result["symbol"], "TCS.NS")
            self.assertEqual(result.result["records_created"], 100)
            mock_fetch.assert_called_once_with(symbol="TCS.NS", period="1y", interval="1d")

    @patch("market_data.tasks.MarketDataService.run_ingestion_cycle")
    def test_poll_market_data_task_success(self, mock_poll):
        """Verify successful execution of near-real-time polling task."""
        mock_poll.return_value = {
            "symbol": "TCS.NS",
            "provider": "mock_provider",
            "is_production_feed": False,
            "action": "updated",
            "timestamp": "2026-09-21T15:30:00+00:00",
            "close_price": 4250.0,
            "volume": 1200000,
            "duration_ms": 80.0,
        }

        with override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True):
            result = poll_market_data_task.apply(args=["TCS.NS", "1d"])
            self.assertTrue(result.successful())
            self.assertEqual(result.result["action"], "updated")
            self.assertEqual(result.result["close_price"], 4250.0)
            mock_poll.assert_called_once_with(symbol="TCS.NS", interval="1d")

    @patch("market_data.tasks.poll_market_data_task.delay")
    def test_scheduled_market_data_ingest(self, mock_delay):
        """Verify Celery beat task dispatches polling tasks for configured symbols."""
        mock_delay.return_value = MagicMock(id="task-mock-12345")

        with override_settings(MARKET_DATA_SYMBOLS=["TCS.NS", "INFY.NS"]):
            result = scheduled_market_data_ingest()

            self.assertEqual(result["status"], "dispatched")
            self.assertEqual(result["dispatched_count"], 2)
            self.assertEqual(mock_delay.call_count, 2)
            mock_delay.assert_any_call(symbol="TCS.NS")
            mock_delay.assert_any_call(symbol="INFY.NS")

    @patch("market_data.tasks.MarketDataService.fetch_historical_data")
    def test_ingest_task_transient_error_triggers_retry(self, mock_fetch):
        """Verify transient network failure triggers Celery retry with exponential backoff."""
        mock_fetch.side_effect = ConnectionError("Network unreachable")

        with patch.object(ingest_market_data_task, "retry") as mock_retry:
            mock_retry.side_effect = Exception("RetryCalled")

            with self.assertRaises(Exception) as ctx:
                ingest_market_data_task(symbol="TCS.NS", period="1y", interval="1d")

            self.assertEqual(str(ctx.exception), "RetryCalled")
            mock_retry.assert_called_once()
            _, kwargs = mock_retry.call_args
            self.assertIn("countdown", kwargs)
            self.assertIn("exc", kwargs)

    @patch("market_data.tasks.MarketDataService.run_ingestion_cycle")
    def test_poll_task_transient_error_triggers_retry(self, mock_poll):
        """Verify transient network failure during polling triggers Celery retry."""
        mock_poll.side_effect = TimeoutError("Request timed out")

        with patch.object(poll_market_data_task, "retry") as mock_retry:
            mock_retry.side_effect = Exception("RetryCalled")

            with self.assertRaises(Exception) as ctx:
                poll_market_data_task(symbol="TCS.NS", interval="1d")

            self.assertEqual(str(ctx.exception), "RetryCalled")
            mock_retry.assert_called_once()

    @patch("market_data.tasks.MarketDataService.fetch_historical_data")
    def test_task_permanent_error_no_retry(self, mock_fetch):
        """Verify permanent validation errors fail immediately without retry."""
        mock_fetch.side_effect = ValueError("Stock symbol 'INVALID' is not registered")

        with patch.object(ingest_market_data_task, "retry") as mock_retry:
            with self.assertRaises(ValueError):
                ingest_market_data_task(symbol="INVALID")

            mock_retry.assert_not_called()

    @patch("market_data.tasks.poll_market_data_task.delay")
    def test_enqueue_management_command_latest(self, mock_delay):
        """Verify enqueue_market_data management command with --latest flag."""
        mock_delay.return_value = MagicMock(id="celery-uuid-abc", status="PENDING")

        out = StringIO()
        call_command("enqueue_market_data", "TCS.NS", "--latest", stdout=out)
        output = out.getvalue()

        self.assertIn("poll_market_data_task", output)
        self.assertIn("celery-uuid-abc", output)
        mock_delay.assert_called_once_with(symbol="TCS.NS", interval="1d")

    @patch("market_data.tasks.ingest_market_data_task.delay")
    def test_enqueue_management_command_historical(self, mock_delay):
        """Verify enqueue_market_data management command for historical ingestion."""
        mock_delay.return_value = MagicMock(id="celery-uuid-xyz", status="PENDING")

        out = StringIO()
        call_command("enqueue_market_data", "TCS.NS", "--period", "6mo", "--interval", "1d", stdout=out)
        output = out.getvalue()

        self.assertIn("ingest_market_data_task", output)
        self.assertIn("celery-uuid-xyz", output)
        mock_delay.assert_called_once_with(symbol="TCS.NS", period="6mo", interval="1d")

