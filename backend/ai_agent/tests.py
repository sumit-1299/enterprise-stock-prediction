"""
Unit and integration tests for AI Market Intelligence Agent.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from ai_agent.services.agent_service import AgentService
from ai_agent.services.context_service import ContextService
from ai_agent.services.tool_registry import ToolRegistry
from ai_agent.tools.history_tool import get_prediction_history
from ai_agent.tools.market_data_tool import get_market_history_summary, get_stock_quote
from ai_agent.tools.model_tool import (
    get_feature_importance,
    get_model_metadata,
    get_model_performance,
)
from ai_agent.tools.prediction_tool import get_prediction
from ai_agent.tools.system_tool import (
    get_project_architecture,
    get_supported_stocks,
    get_system_health,
)
from ai_agent.tools.technical_analysis_tool import get_technical_indicators
from stocks.models import Stock


class AiAgentToolTests(TestCase):
    """Test individual tools executed by the AI Agent."""

    def setUp(self):
        from django.utils import timezone
        import datetime
        from market_data.models import MarketPrice
        from predictions.models import Prediction

        self.stock_tcs, _ = Stock.objects.get_or_create(
            symbol="TCS.NS",
            defaults={"company_name": "Tata Consultancy Services Ltd.", "exchange": "NSE", "sector": "IT"},
        )
        self.stock_icici, _ = Stock.objects.get_or_create(
            symbol="ICICIBANK.NS",
            defaults={"company_name": "ICICI Bank Ltd.", "exchange": "NSE", "sector": "Financial Services"},
        )

        now = timezone.now()
        # Seed 60 price bars for TCS so technical indicators can be calculated
        bars = []
        base_price = 4000.0
        for i in range(60):
            t = now - datetime.timedelta(days=60 - i)
            price = base_price + ((i % 5) * 8.0) - ((i % 3) * 5.0) + (i * 0.5)
            bars.append(MarketPrice(
                stock=self.stock_tcs,
                timestamp=t,
                timeframe="1d",
                open_price=price - 5.0,
                high_price=price + 10.0,
                low_price=price - 10.0,
                close_price=price,
                volume=1000000 + i * 1000,
                source="test",
            ))
        MarketPrice.objects.bulk_create(bars)

        # Seed a prediction for TCS
        Prediction.objects.create(
            stock=self.stock_tcs,
            symbol="TCS.NS",
            prediction="UP",
            direction=1,
            probability=0.72,
            probabilities={"UP": 0.72, "DOWN": 0.28},
            model_type="xgboost_classifier",
            model_version="v1",
            market_data_timestamp=now,
            outcome="CORRECT",
            features_used=["rsi_14", "sma_10"],
        )

    def test_tool_registry_completeness(self):
        """Verify all expected tools are present and valid."""
        expected_tools = [
            "get_stock_quote",
            "get_market_history_summary",
            "get_technical_indicators",
            "get_prediction",
            "get_model_metadata",
            "get_model_performance",
            "get_feature_importance",
            "get_prediction_history",
            "get_supported_stocks",
            "get_system_health",
            "get_project_architecture",
        ]
        for name in expected_tools:
            self.assertIn(name, ToolRegistry.TOOLS)
            self.assertTrue(callable(ToolRegistry.TOOLS[name]["func"]))

        schemas = ToolRegistry.get_tool_schemas()
        self.assertEqual(len(schemas), len(expected_tools))

    def test_market_data_tool(self):
        res = get_stock_quote("TCS.NS")
        self.assertIn("status", res)
        self.assertEqual(res["symbol"], "TCS.NS")

        hist = get_market_history_summary("TCS.NS", limit=10)
        self.assertIn("status", res)
        self.assertEqual(hist["symbol"], "TCS.NS")

    def test_technical_indicators_tool(self):
        res = get_technical_indicators("TCS.NS")
        self.assertIn("status", res)
        self.assertEqual(res["symbol"], "TCS.NS")

    def test_prediction_tool_trained_vs_untrained(self):
        # TCS has pre-trained model
        tcs_pred = get_prediction("TCS.NS")
        self.assertIn("status", tcs_pred)
        if tcs_pred["status"] == "ok":
            self.assertTrue(tcs_pred["trained"])
            self.assertIn("prediction", tcs_pred)

        # ICICIBANK is untrained
        icici_pred = get_prediction("ICICIBANK.NS")
        self.assertEqual(icici_pred["status"], "model_not_found")
        self.assertFalse(icici_pred["trained"])
        self.assertIn("no trained machine learning model artifact", icici_pred["message"].lower())

    def test_model_tools(self):
        meta = get_model_metadata("TCS.NS")
        self.assertIn("status", meta)
        perf = get_model_performance("TCS.NS")
        self.assertIn("status", perf)
        feat = get_feature_importance("TCS.NS")
        self.assertIn("status", feat)

    def test_history_tool(self):
        hist = get_prediction_history("TCS.NS", limit=5)
        self.assertIn("status", hist)
        self.assertEqual(hist["symbol"], "TCS.NS")

    def test_system_tools(self):
        univ = get_supported_stocks()
        self.assertEqual(univ["status"], "ok")
        self.assertEqual(univ["total_stocks"], 14)

        health = get_system_health()
        self.assertIn("status", health)
        self.assertIn("components", health)

        arch = get_project_architecture()
        self.assertEqual(arch["status"], "ok")
        self.assertIn("Django", arch["components"]["api_server"])


class AiAgentServiceAndApiTests(TestCase):
    """Test the end-to-end AgentService and REST API views."""

    def setUp(self):
        from django.utils import timezone
        import datetime
        from market_data.models import MarketPrice
        from predictions.models import Prediction

        self.client = APIClient()
        self.stock_tcs, _ = Stock.objects.get_or_create(
            symbol="TCS.NS",
            defaults={"company_name": "Tata Consultancy Services Ltd.", "exchange": "NSE", "sector": "IT"},
        )
        now = timezone.now()
        bars = []
        base_price = 4000.0
        for i in range(60):
            t = now - datetime.timedelta(days=60 - i)
            price = base_price + ((i % 5) * 8.0) - ((i % 3) * 5.0) + (i * 0.5)
            bars.append(MarketPrice(
                stock=self.stock_tcs,
                timestamp=t,
                timeframe="1d",
                open_price=price - 5.0,
                high_price=price + 10.0,
                low_price=price - 10.0,
                close_price=price,
                volume=1000000 + i * 1000,
                source="test",
            ))
        MarketPrice.objects.bulk_create(bars)

        Prediction.objects.create(
            stock=self.stock_tcs,
            symbol="TCS.NS",
            prediction="UP",
            direction=1,
            probability=0.72,
            probabilities={"UP": 0.72, "DOWN": 0.28},
            model_type="xgboost_classifier",
            model_version="v1",
            market_data_timestamp=now,
            outcome="CORRECT",
            features_used=["rsi_14", "sma_10"],
        )

    def test_context_service(self):
        ctx = ContextService.build_context("TCS.NS", "dashboard")
        self.assertEqual(ctx["active_symbol"], "TCS.NS")
        self.assertEqual(ctx["company_name"], "Tata Consultancy Services Ltd.")
        self.assertEqual(ctx["active_page"], "dashboard")

    def test_financial_advice_guardrail(self):
        """Verify assistant refuses to give buy/sell recommendations."""
        res = AgentService.process_message(
            message="Should I buy TCS stock today?",
            symbol="TCS.NS",
            page="dashboard",
        )
        self.assertIn("cannot provide buy or sell recommendations", res["response"])
        self.assertIn("Compliance Note", res["response"])
        self.assertIn("Market Data", res["citations"])

    def test_prediction_explanation(self):
        """Verify assistant explains prediction with tools."""
        res = AgentService.process_message(
            message="Why is TCS predicted UP?",
            symbol="TCS.NS",
            page="dashboard",
        )
        self.assertIn("TCS.NS", res["response"])
        self.assertIn("get_prediction", res["tools_used"])

    def test_technical_analysis_explanation(self):
        """Verify assistant explains RSI and technicals."""
        res = AgentService.process_message(
            message="What is the RSI saying?",
            symbol="TCS.NS",
            page="technical",
        )
        self.assertIn("RSI", res["response"])
        self.assertIn("get_technical_indicators", res["tools_used"])

    def test_untrained_stock_handled_safely(self):
        """Verify untrained stock explicitly communicates lack of model."""
        res = AgentService.process_message(
            message="What is the prediction for ICICIBANK.NS?",
            symbol="ICICIBANK.NS",
            page="dashboard",
        )
        self.assertIn("no trained machine learning model artifact", res["response"])
        self.assertIn("train_model", res["response"])

    def test_api_chat_endpoint_success(self):
        """Test POST /api/ai-agent/chat/ with valid payload."""
        response = self.client.post(
            "/api/ai-agent/chat/",
            data={
                "message": "Explain this stock",
                "symbol": "TCS.NS",
                "page": "dashboard",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("response", data)
        self.assertIn("tools_used", data)
        self.assertIn("citations", data)
        self.assertIn("suggested_questions", data)
        self.assertIn("execution_time_ms", data)
        self.assertEqual(data["symbol"], "TCS.NS")

    def test_api_chat_empty_message_rejected(self):
        """Test POST /api/ai-agent/chat/ with empty message returns 400."""
        response = self.client.post(
            "/api/ai-agent/chat/",
            data={"message": "   ", "symbol": "TCS.NS"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "INVALID_INPUT")
