"""
Unit tests for the Model Analytics API endpoint (/api/predictions/<symbol>/analytics/).
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class ModelAnalyticsApiTests(TestCase):
    """Tests for GET /api/predictions/<symbol>/analytics/ endpoint."""

    def setUp(self):
        self.client = APIClient()

    def test_model_analytics_tcs_success(self):
        """Verify model analytics for production symbol TCS.NS."""
        response = self.client.get("/api/predictions/TCS.NS/analytics/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data["symbol"], "TCS.NS")

        # Verify model metadata
        model = data["model"]
        self.assertEqual(model["type"], "xgboost_classifier")
        self.assertEqual(model["version"], "v1")
        self.assertEqual(model["status"], "production")
        self.assertEqual(model["task"], "Binary Classification")
        self.assertEqual(model["target"], "Next Trading Day Direction")
        self.assertEqual(model["classes"], ["DOWN", "UP"])
        self.assertEqual(model["execution"], "Inference Only")
        self.assertEqual(len(model["features"]), 12)

        # Verify real metrics
        metrics = data["metrics"]
        self.assertIn("accuracy", metrics)
        self.assertIn("precision", metrics)
        self.assertIn("recall", metrics)
        self.assertIn("f1", metrics)
        self.assertIn("roc_auc", metrics)
        self.assertAlmostEqual(metrics["accuracy"], 0.4350, places=3)
        self.assertAlmostEqual(metrics["recall"], 0.7308, places=3)

        # Verify feature importance
        feature_importance = data["feature_importance"]
        self.assertEqual(len(feature_importance), 12)
        # Verify descending sort order
        importances = [item["importance"] for item in feature_importance]
        self.assertEqual(importances, sorted(importances, reverse=True))
        # Verify rank sequence
        ranks = [item["rank"] for item in feature_importance]
        self.assertEqual(ranks, list(range(1, 13)))

        # Verify artifact health status
        artifact_status = data["artifact_status"]
        self.assertEqual(artifact_status["artifact"], "AVAILABLE")
        self.assertEqual(artifact_status["metadata"], "AVAILABLE")
        self.assertEqual(artifact_status["feature_schema"], "COMPATIBLE")
        self.assertEqual(artifact_status["version"], "v1")

        # Verify unavailable curves are None
        self.assertIsNone(data["confusion_matrix"])
        self.assertIsNone(data["roc_curve"])
        self.assertIsNone(data["pr_curve"])

    def test_model_analytics_missing_symbol(self):
        """Verify 404 response for un-modeled symbol."""
        response = self.client.get("/api/predictions/NONEXISTENT.NS/analytics/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "MODEL_METADATA_NOT_FOUND")

    def test_model_analytics_invalid_symbol(self):
        """Verify 400 response for invalid symbol format."""
        response = self.client.get("/api/predictions/INVALID$$SYMBOL/analytics/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "INVALID_SYMBOL")

