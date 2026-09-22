"""
Context Service for AI Agent.
Constructs sanitized, structured application state for prompt conditioning.
"""
import logging
from typing import Any, Dict
from ml.models.model_registry import ARTIFACT_DIR
from stocks.universe import get_stock_metadata, get_supported_symbols

logger = logging.getLogger(__name__)


class ContextService:
    """
    Builds context representations of the user's active session.
    """

    @staticmethod
    def build_context(symbol: str = "TCS.NS", page: str = "dashboard") -> Dict[str, Any]:
        normalized_symbol = (symbol or "TCS.NS").strip().upper()
        metadata = get_stock_metadata(normalized_symbol) or {
            "symbol": normalized_symbol,
            "company_name": normalized_symbol,
            "exchange": "NSE",
            "sector": "General",
        }

        artifact_file = ARTIFACT_DIR / f"xgboost_classifier_{normalized_symbol.replace('.', '_')}_v1.joblib"
        has_trained_model = artifact_file.exists()

        page_descriptions = {
            "dashboard": "Market Intelligence Dashboard — main overview with AI prediction gauge, KPI metrics, and summary charts.",
            "market": "Market Overview — high-level matrix of all 14 NSE equities with sector breakdowns.",
            "analysis": "Stock Analysis — interactive multi-timeframe charts, technical indicators, and OHLCV history.",
            "predictions": "Predictions — detailed directional prediction inference, 12-feature inputs, and model parameters.",
            "technical": "Technical Analysis — RSI oscillators, MACD indicators, and moving average crossovers.",
            "models": "Model Governance — MLOps model evaluation, rolling accuracy, confusion matrix, and PSI data drift.",
            "history": "Prediction History — auditable historical prediction ledger with realization outcomes.",
            "data": "Market Data — raw historical OHLCV tabular records with date filtering.",
            "data-quality": "Data Quality — automated validation rules matrix (continuity, monotonicity, outlier bounds).",
            "system": "System Health — operational telemetry for Daphne ASGI, PostgreSQL, Redis, Celery, and Model Registry.",
            "jobs": "Background Tasks — Celery Beat and Worker task execution status.",
            "settings": "Settings — runtime platform endpoints, ML inference parameters, and design system tokens.",
        }

        return {
            "active_symbol": normalized_symbol,
            "company_name": metadata.get("company_name", normalized_symbol),
            "exchange": metadata.get("exchange", "NSE"),
            "sector": metadata.get("sector", "General"),
            "has_trained_model": has_trained_model,
            "active_page": page or "dashboard",
            "page_description": page_descriptions.get(page, "Analytics page"),
            "supported_symbols_count": len(get_supported_symbols()),
        }

