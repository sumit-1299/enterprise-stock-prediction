from datetime import datetime, timezone, timedelta
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from stocks.models import Stock
from market_data.models import MarketPrice
from predictions.models import Prediction
from predictions.services.prediction_resolution_service import PredictionResolutionService
from predictions.services.data_drift_service import DataDriftService
from predictions.services.model_monitoring_service import ModelMonitoringService


class ModelMonitoringTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.symbol = "TEST.NS"
        self.stock, _ = Stock.objects.get_or_create(
            symbol=self.symbol,
            defaults={"company_name": "Test Company", "exchange": "NSE", "is_active": True},
        )

        # Create 10 sequential market price observations
        now = datetime.now(timezone.utc)
        self.prices = []
        for i in range(10):
            ts = now - timedelta(days=10 - i)
            p = MarketPrice.objects.create(
                stock=self.stock,
                timestamp=ts,
                timeframe="1d",
                open_price=Decimal(str(100.0 + i * 2.0)),
                high_price=Decimal(str(105.0 + i * 2.0)),
                low_price=Decimal(str(95.0 + i * 2.0)),
                close_price=Decimal(str(102.0 + i * 2.0)),
                volume=10000 + i * 500,
                source="test",
            )
            self.prices.append(p)

    def test_prediction_resolution_service(self):
        """Test that pending predictions are correctly resolved against t+1 observations."""
        # Create prediction at t = prices[0].timestamp
        t0 = self.prices[0].timestamp
        pred_up = Prediction.objects.create(
            stock=self.stock,
            symbol=self.symbol,
            prediction="UP",
            direction=1,
            probability=0.75,
            probabilities={"UP": 0.75, "DOWN": 0.25},
            market_data_timestamp=t0,
            outcome="PENDING",
            feature_snapshot={"close_ratio_5": 1.02, "rsi_14": 55.0},
            latency_ms=12.5,
        )

        # Create prediction at the latest price date (no t+1 exists yet)
        t_latest = self.prices[-1].timestamp
        pred_pending = Prediction.objects.create(
            stock=self.stock,
            symbol=self.symbol,
            prediction="DOWN",
            direction=0,
            probability=0.60,
            probabilities={"UP": 0.40, "DOWN": 0.60},
            market_data_timestamp=t_latest,
            outcome="PENDING",
        )

        # Run resolution service
        res = PredictionResolutionService.resolve_pending_predictions(self.symbol)
        self.assertGreaterEqual(res["resolved_count"], 1)

        # pred_up should be resolved (prices[1] close_price was 104.0 > 102.0 -> UP -> CORRECT)
        pred_up.refresh_from_db()
        self.assertEqual(pred_up.outcome, "CORRECT")
        self.assertEqual(pred_up.actual_direction, "UP")
        self.assertIsNotNone(pred_up.actual_return)
        self.assertIsNotNone(pred_up.resolved_at)

        # pred_pending should remain PENDING
        pred_pending.refresh_from_db()
        self.assertEqual(pred_pending.outcome, "PENDING")
        self.assertIsNone(pred_pending.resolved_at)

    def test_data_drift_service_psi(self):
        """Test Population Stability Index (PSI) computation across features."""
        drift_report = DataDriftService.calculate_drift_for_symbol(self.symbol)
        self.assertEqual(drift_report["symbol"], self.symbol)
        self.assertIn("features", drift_report)
        self.assertIn("status", drift_report)

    def test_model_monitoring_service_summary(self):
        """Test ModelMonitoringService.get_summary structure."""
        summary = ModelMonitoringService.get_summary(self.symbol)
        self.assertEqual(summary["symbol"], self.symbol)
        self.assertIn("active_model", summary)
        self.assertIn("predictions", summary)
        self.assertIn("data_drift", summary)
        self.assertIn("data_quality", summary)
        self.assertIn("health_indicators", summary)

        # Verify 5 independent health indicators
        indicators = summary["health_indicators"]
        self.assertIn("model_status", indicators)
        self.assertIn("data_status", indicators)
        self.assertIn("prediction_status", indicators)
        self.assertIn("drift_status", indicators)
        self.assertIn("performance_status", indicators)

    def test_model_monitoring_service_performance(self):
        """Test ModelMonitoringService.get_performance calculations."""
        # Create a correct prediction and an incorrect prediction
        Prediction.objects.create(
            stock=self.stock,
            symbol=self.symbol,
            prediction="UP",
            direction=1,
            probability=0.80,
            outcome="CORRECT",
            actual_direction="UP",
            actual_return=3.0,
            market_data_timestamp=self.prices[0].timestamp,
        )
        Prediction.objects.create(
            stock=self.stock,
            symbol=self.symbol,
            prediction="UP",
            direction=1,
            probability=0.70,
            outcome="INCORRECT",
            actual_direction="DOWN",
            actual_return=-1.0,
            market_data_timestamp=self.prices[1].timestamp,
        )

        perf = ModelMonitoringService.get_performance(self.symbol, period="ALL")
        self.assertEqual(perf["symbol"], self.symbol)
        self.assertEqual(perf["total_resolved"], 2)
        self.assertEqual(perf["metrics"]["accuracy"], 50.0)

        # Check confusion matrix (positive class is UP)
        cm = perf["confusion_matrix"]
        self.assertEqual(cm["positive_class"], "UP")
        self.assertEqual(cm["tp"], 1)
        self.assertEqual(cm["fp"], 1)
        self.assertEqual(cm["fn"], 0)
        self.assertEqual(cm["tn"], 0)

        # Check precision (TP / (TP + FP) = 1 / 2 = 50.0%)
        self.assertEqual(perf["metrics"]["precision"], 50.0)
        # Check recall (TP / (TP + FN) = 1 / 1 = 100.0%)
        self.assertEqual(perf["metrics"]["recall"], 100.0)

        # Check confidence buckets
        self.assertIn("confidence_buckets", perf)
        self.assertIsInstance(perf["confidence_buckets"], list)

    def test_api_endpoints(self):
        """Test REST endpoints for model monitoring and prediction detail."""
        pred = Prediction.objects.create(
            stock=self.stock,
            symbol=self.symbol,
            prediction="UP",
            direction=1,
            probability=0.72,
            outcome="CORRECT",
            actual_direction="UP",
            actual_return=2.0,
            feature_snapshot={"close_ratio_5": 1.01, "rsi_14": 52.0},
            latency_ms=8.4,
            market_data_timestamp=self.prices[0].timestamp,
        )

        # 1. Summary endpoint
        url_summary = reverse("monitoring-summary", kwargs={"symbol": self.symbol})
        res = self.client.get(url_summary)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["symbol"], self.symbol)

        # 2. Performance endpoint
        url_perf = reverse("monitoring-performance", kwargs={"symbol": self.symbol})
        res = self.client.get(url_perf + "?period=ALL")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["symbol"], self.symbol)

        # 3. Drift endpoint
        url_drift = reverse("monitoring-drift", kwargs={"symbol": self.symbol})
        res = self.client.get(url_drift)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 4. Data Quality endpoint
        url_dq = reverse("monitoring-data-quality", kwargs={"symbol": self.symbol})
        res = self.client.get(url_dq)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 5. Prediction Detail endpoint
        url_detail = reverse("prediction-detail-global", kwargs={"id": pred.id})
        res = self.client.get(url_detail)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["id"], pred.id)
        self.assertEqual(res.data["feature_snapshot"]["close_ratio_5"], 1.01)
        self.assertEqual(res.data["latency_ms"], 8.4)

