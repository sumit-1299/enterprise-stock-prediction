"""
Prediction history tool for AI Agent.
Retrieves auditable prediction records and realization outcomes.
"""
import logging
from typing import Any, Dict
from predictions.models import Prediction
from stocks.universe import get_stock_metadata

logger = logging.getLogger(__name__)


def get_prediction_history(symbol: str, limit: int = 5) -> Dict[str, Any]:
    """
    Retrieve the most recent predictions and their realization outcomes.
    """
    normalized = symbol.strip().upper()
    meta = get_stock_metadata(normalized) or {}

    records = list(
        Prediction.objects.filter(symbol=normalized)
        .order_by("-market_data_timestamp", "-generated_at")[:limit]
    )

    if not records:
        return {
            "status": "no_history",
            "symbol": normalized,
            "company_name": meta.get("company_name", normalized),
            "message": f"No prediction history recorded yet for {normalized}.",
        }

    history_items = []
    resolved_count = 0
    correct_count = 0

    for r in records:
        outcome = r.outcome or "PENDING"
        if outcome in ("CORRECT", "INCORRECT"):
            resolved_count += 1
            if outcome == "CORRECT":
                correct_count += 1

        history_items.append({
            "timestamp": r.market_data_timestamp.strftime("%Y-%m-%d") if r.market_data_timestamp else "N/A",
            "predicted_direction": r.prediction,
            "confidence_percent": round(float(r.probability) * 100, 1),
            "actual_direction": r.actual_direction or "Pending session",
            "outcome": outcome,
            "model_version": r.model_version or "v1",
        })

    recent_accuracy = None
    if resolved_count > 0:
        recent_accuracy = round((correct_count / resolved_count) * 100, 1)

    return {
        "status": "ok",
        "symbol": normalized,
        "company_name": meta.get("company_name", normalized),
        "total_returned": len(history_items),
        "resolved_in_sample": resolved_count,
        "correct_in_sample": correct_count,
        "recent_accuracy_percent": recent_accuracy,
        "recent_predictions": history_items,
    }
