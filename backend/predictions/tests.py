import os
import sys
from pathlib import Path
from unittest.mock import patch

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

from ml.inference.exceptions import (
    InsufficientDataError,
    ModelNotFoundError,
    SymbolNotFoundError,
)


class TestPredictionAPI(TestCase):

    def setUp(self):
        self.client = APIClient()

    # 1. Health endpoint
    def test_health_endpoint(self):
        """GET /api/health/ should return HTTP 200 and status: ok."""
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], "ok")

    # 2. Valid TCS.NS prediction
    @patch("ml.inference.prediction_service.PredictionService.predict")
    def test_valid_tcs_ns_prediction(self, mock_predict):
        """GET /api/predictions/TCS.NS/ should return HTTP 200 with structured prediction."""
        mock_predict.return_value = {
            "symbol": "TCS.NS",
            "prediction": "UP",
            "direction": 1,
            "probability": 0.72,
            "probabilities": {"DOWN": 0.28, "UP": 0.72},
            "model_type": "xgboost_classifier",
            "model_version": "v1",
            "timestamp": "2026-09-22T12:00:00Z",
            "features_used": ["close_pct_change_1d", "rsi_14", "sma_50"],
        }
        response = self.client.get("/api/predictions/TCS.NS/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # 3. Verify expected fields
        self.assertEqual(data["symbol"], "TCS.NS")
        self.assertIn(data["prediction"], ["UP", "DOWN"])
        self.assertIn(data["direction"], [0, 1])
        self.assertIsInstance(data["probability"], float)
        self.assertGreaterEqual(data["probability"], 0.0)
        self.assertLessEqual(data["probability"], 1.0)
        self.assertIn("probabilities", data)
        self.assertIn("DOWN", data["probabilities"])
        self.assertIn("UP", data["probabilities"])
        self.assertEqual(data["model_type"], "xgboost_classifier")
        self.assertEqual(data["model_version"], "v1")
        self.assertIn("timestamp", data)
        self.assertIn("features_used", data)
        self.assertIsInstance(data["features_used"], list)

    # 4. Symbol normalization (lowercase to uppercase)
    @patch("ml.inference.prediction_service.PredictionService.predict")
    def test_symbol_case_normalization(self, mock_predict):
        """GET /api/predictions/tcs.ns/ should normalize to TCS.NS and succeed."""
        mock_predict.return_value = {
            "symbol": "TCS.NS",
            "prediction": "UP",
            "direction": 1,
            "probability": 0.72,
            "probabilities": {"DOWN": 0.28, "UP": 0.72},
            "model_type": "xgboost_classifier",
            "model_version": "v1",
            "timestamp": "2026-09-22T12:00:00Z",
            "features_used": ["close_pct_change_1d", "rsi_14", "sma_50"],
        }
        response = self.client.get("/api/predictions/tcs.ns/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["symbol"], "TCS.NS")

    # 5. Invalid / malformed symbol format
    def test_malformed_symbol_returns_400(self):
        """Symbols with invalid characters should return HTTP 400."""
        response = self.client.get("/api/predictions/INVALID@SYMBOL!/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "INVALID_SYMBOL")

    # 6. Nonexistent symbol without market data
    def test_nonexistent_symbol_returns_404(self):
        """Nonexistent stock symbol should return HTTP 404."""
        with patch(
            "ml.inference.prediction_service.PredictionService.predict",
            side_effect=SymbolNotFoundError("No market data found for symbol 'NONEXISTENT'"),
        ):
            response = self.client.get("/api/predictions/NONEXISTENT/")
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            data = response.json()
            self.assertIn("error", data)
            self.assertEqual(data["error"]["code"], "SYMBOL_NOT_FOUND")

    # 7. Insufficient market data
    def test_insufficient_data_returns_422(self):
        """Symbols with insufficient data should return HTTP 422."""
        with patch(
            "ml.inference.prediction_service.PredictionService.predict",
            side_effect=InsufficientDataError("Insufficient market data"),
        ):
            response = self.client.get("/api/predictions/TCS.NS/")
            self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
            data = response.json()
            self.assertIn("error", data)
            self.assertEqual(data["error"]["code"], "INSUFFICIENT_DATA")

    # 8. Model artifact not found
    def test_model_not_found_returns_500(self):
        """Missing model artifact should return HTTP 500 without leaking file paths."""
        with patch(
            "ml.inference.prediction_service.PredictionService.predict",
            side_effect=ModelNotFoundError("Model artifact not found"),
        ):
            response = self.client.get("/api/predictions/TCS.NS/")
            self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            data = response.json()
            self.assertIn("error", data)
            self.assertEqual(data["error"]["code"], "MODEL_NOT_FOUND")

    # 9. Model information endpoint
    def test_model_info_endpoint(self):
        """GET /api/predictions/TCS.NS/model/ should return HTTP 200 with safe metadata."""
        response = self.client.get("/api/predictions/TCS.NS/model/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["symbol"], "TCS.NS")
        self.assertEqual(data["model_type"], "xgboost_classifier")
        self.assertEqual(data["model_version"], "v1")
        self.assertIn("features", data)
        self.assertIsInstance(data["features"], list)
        self.assertIn("metrics", data)
        self.assertIn("created_at", data)
        # Ensure no sensitive filesystem paths are exposed
        self.assertNotIn("model_path", data)
        self.assertNotIn("metadata_path", data)

    # 10. Model info for nonexistent model
    def test_model_info_nonexistent(self):
        """GET /api/predictions/UNKNOWN_SYMBOL/model/ should return HTTP 404."""
        response = self.client.get("/api/predictions/UNKNOWN_SYMBOL/model/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "MODEL_METADATA_NOT_FOUND")

    # 11. Verify error responses do not leak tracebacks or secrets
    def test_errors_do_not_leak_traceback(self):
        """Unexpected errors must return structured error object without tracebacks."""
        with patch(
            "ml.inference.prediction_service.PredictionService.predict",
            side_effect=RuntimeError("Secret database connection string: postgresql://secret:password@db/db"),
        ):
            response = self.client.get("/api/predictions/TCS.NS/")
            self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            data = response.json()
            self.assertIn("error", data)
            self.assertEqual(data["error"]["code"], "INTERNAL_SERVER_ERROR")
            # Ensure raw exception message containing credentials is not in response
            self.assertNotIn("password", str(data))
            self.assertNotIn("Traceback", str(data))
