"""
Model metadata, governance, and performance tools for AI Agent.
"""
import logging
from typing import Any, Dict
from ml.models.model_registry import load_metadata
from predictions.services.model_monitoring_service import ModelMonitoringService
from stocks.universe import get_stock_metadata

logger = logging.getLogger(__name__)


def get_model_metadata(symbol: str) -> Dict[str, Any]:
    """
    Retrieve model architecture, hyperparameters, and evaluation metrics for a stock.
    """
    normalized = symbol.strip().upper()
    meta_stock = get_stock_metadata(normalized) or {}

    try:
        metadata = load_metadata(normalized)
        metrics = metadata.get("metrics", {})
        return {
            "status": "ok",
            "symbol": normalized,
            "company_name": meta_stock.get("company_name", normalized),
            "model_type": metadata.get("model_type", "xgboost_classifier"),
            "model_version": metadata.get("model_version", "v1"),
            "features": metadata.get("features", []),
            "feature_count": len(metadata.get("features", [])),
            "metrics": {
                "accuracy": round(float(metrics.get("accuracy", 0.0)) * 100, 1),
                "precision": round(float(metrics.get("precision", 0.0)) * 100, 1),
                "recall": round(float(metrics.get("recall", 0.0)) * 100, 1),
                "f1_score": round(float(metrics.get("f1", 0.0)), 3),
                "roc_auc": round(float(metrics.get("roc_auc", 0.0)), 3),
            },
            "created_at": metadata.get("created_at", "N/A"),
        }
    except Exception:
        return {
            "status": "model_not_found",
            "symbol": normalized,
            "message": f"No model metadata found for {normalized}. Model is not yet trained.",
        }


def get_model_performance(symbol: str) -> Dict[str, Any]:
    """
    Retrieve production performance metrics, rolling accuracy, and confusion matrix.
    """
    normalized = symbol.strip().upper()
    meta_stock = get_stock_metadata(normalized) or {}

    try:
        perf = ModelMonitoringService.get_performance_metrics(normalized)
        return {
            "status": "ok",
            "symbol": normalized,
            "company_name": meta_stock.get("company_name", normalized),
            "rolling_accuracy_percent": round(float(perf.get("rolling_accuracy", 0.0)) * 100, 1),
            "total_evaluated_predictions": perf.get("total_predictions", 0),
            "resolved_predictions": perf.get("resolved_predictions", 0),
            "correct_predictions": perf.get("correct_predictions", 0),
            "incorrect_predictions": perf.get("incorrect_predictions", 0),
            "confusion_matrix": perf.get("confusion_matrix", {}),
            "precision_percent": round(float(perf.get("precision", 0.0)) * 100, 1),
            "recall_percent": round(float(perf.get("recall", 0.0)) * 100, 1),
            "f1_score": round(float(perf.get("f1_score", 0.0)), 3),
        }
    except Exception as exc:
        return {
            "status": "no_performance_data",
            "symbol": normalized,
            "message": f"No historical performance evaluation records available for {normalized}: {str(exc)}",
        }


def get_feature_importance(symbol: str) -> Dict[str, Any]:
    """
    Retrieve feature importance weights from the trained XGBoost model.
    """
    normalized = symbol.strip().upper()
    try:
        from ml.models.model_registry import load_model, load_metadata
        model = load_model(normalized)
        metadata = load_metadata(normalized)
        features = metadata.get("features", [])

        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            ranked = sorted(
                zip(features, [round(float(w), 4) for w in importances]),
                key=lambda x: x[1],
                reverse=True,
            )
            top_features = [{"feature": f, "importance": w} for f, w in ranked]
            return {
                "status": "ok",
                "symbol": normalized,
                "top_features": top_features,
            }
        return {
            "status": "no_importance",
            "symbol": normalized,
            "message": "Feature importance is not currently available for this model type.",
        }
    except Exception:
        return {
            "status": "model_not_found",
            "symbol": normalized,
            "message": f"Feature importance is not available because {normalized} has no trained model.",
        }

