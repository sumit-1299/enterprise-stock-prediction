"""
System, universe, and architecture tools for AI Agent.
"""
import logging
from typing import Any, Dict
from django.conf import settings
from django.db import connection
from ml.models.model_registry import ARTIFACT_DIR
from stocks.universe import STOCK_UNIVERSE

logger = logging.getLogger(__name__)


def get_supported_stocks() -> Dict[str, Any]:
    """
    Retrieve the platform's supported stock universe with sectors and model statuses.
    """
    stocks = []
    for item in STOCK_UNIVERSE:
        sym = item["symbol"]
        artifact = ARTIFACT_DIR / f"xgboost_classifier_{sym.replace('.', '_')}_v1.joblib"
        stocks.append({
            "symbol": sym,
            "company_name": item["company_name"],
            "sector": item["sector"],
            "has_trained_model": artifact.exists(),
        })

    return {
        "status": "ok",
        "total_stocks": len(stocks),
        "stocks": stocks,
    }


def get_system_health() -> Dict[str, Any]:
    """
    Check the operational status of all core backend subsystems.
    """
    components = {
        "api": "online",
        "database": "checking",
        "redis": "checking",
        "celery": "checking",
        "model_registry": "checking",
    }

    try:
        connection.ensure_connection()
        components["database"] = "online"
    except Exception:
        components["database"] = "offline"

    try:
        import redis
        r = redis.from_url(getattr(settings, "REDIS_URL", "redis://redis:6379/0"), socket_timeout=1)
        r.ping()
        components["redis"] = "online"
    except Exception:
        components["redis"] = "offline"

    components["celery"] = "online" if components["redis"] == "online" else "offline"

    prod_v1 = ARTIFACT_DIR / "xgboost_classifier_TCS_NS_v1.joblib"
    components["model_registry"] = "online" if prod_v1.exists() else "offline"

    overall = "ok" if components["database"] == "online" and components["model_registry"] == "online" else "degraded"

    return {
        "status": overall,
        "components": components,
    }


def get_project_architecture() -> Dict[str, Any]:
    """
    Return the technical architecture and component breakdown of the platform.
    """
    return {
        "status": "ok",
        "platform_name": "MarketIQ — Enterprise Stock Price Prediction & Market Intelligence Platform",
        "components": {
            "frontend": "React 18 Single Page Application with TypeScript, Vite, Recharts, and custom light FinTech design system.",
            "api_server": "Django 6.1 REST Framework running on Daphne ASGI server for concurrent HTTP and WebSocket traffic.",
            "realtime_streaming": "Django Channels with Redis Channel Layer broadcasting sub-second quotes and predictions.",
            "database": "PostgreSQL 16 relational database with time-series OHLCV tables, prediction audit logs, and model versions.",
            "task_queue": "Celery with Redis broker (DB 0) for asynchronous market data ingestion and periodic outcome resolution.",
            "scheduler": "Celery Beat executing market data polling and prediction resolution tasks every 300 seconds.",
            "ml_engine": "XGBoost gradient-boosted decision trees trained with strict time-series sequential splitting (zero lookahead bias).",
            "mlops_monitoring": "Continuous Population Stability Index (PSI) drift tracking, rolling accuracy evaluation, and data quality audits.",
            "gateway": "Nginx reverse proxy routing HTTP traffic on port 8080 and handling static asset delivery.",
        },
    }

