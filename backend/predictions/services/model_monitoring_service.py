"""
Service for aggregating model monitoring, performance, drift, and health metrics.
"""

import logging
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.utils import timezone
from market_data.models import MarketPrice
from ml.models.model_registry import ModelRegistry, load_metadata
from predictions.models import ModelVersion, Prediction
from predictions.services.data_drift_service import DataDriftService

logger = logging.getLogger(__name__)


class ModelMonitoringService:
    """
    Production-grade monitoring aggregator for ML model operations.
    """

    @classmethod
    def get_summary(cls, symbol: str) -> Dict[str, Any]:
        """
        Produce an executive monitoring summary with independent health indicators.
        """
        normalized_symbol = symbol.strip().upper()

        # 1. Active Model Info
        model_info: Dict[str, Any] = {
            "type": "xgboost_classifier",
            "version": "v1",
            "task": "Binary Classification",
            "target": "Next Trading Day Direction",
            "features_count": 12,
            "status": "unavailable",
            "created_at": None,
        }
        metrics: Dict[str, Any] = {}

        try:
            prod_version = ModelRegistry.get_production_version(normalized_symbol, "xgboost_classifier")
            metadata = load_metadata(normalized_symbol, "xgboost_classifier", prod_version)
            model_info.update({
                "type": metadata.get("model_type", "xgboost_classifier"),
                "version": metadata.get("version", prod_version),
                "status": metadata.get("status", "production"),
                "features_count": len(metadata.get("features", [])),
                "created_at": metadata.get("created_at"),
            })
            metrics = metadata.get("metrics", {})
        except Exception:
            pass

        # 2. Prediction History Counts
        pred_qs = Prediction.objects.filter(symbol=normalized_symbol)
        total_predictions = pred_qs.count()
        resolved_predictions = pred_qs.filter(outcome__in=["CORRECT", "INCORRECT"]).count()
        correct_predictions = pred_qs.filter(outcome="CORRECT").count()
        incorrect_predictions = pred_qs.filter(outcome="INCORRECT").count()
        pending_predictions = pred_qs.filter(outcome="PENDING").count()

        historical_accuracy = (
            round((correct_predictions / resolved_predictions) * 100, 2)
            if resolved_predictions > 0
            else None
        )

        # 3. Data Drift Status
        drift_data = DataDriftService.calculate_drift_for_symbol(normalized_symbol)
        drift_status = drift_data.get("status", "Unknown")

        # 4. Data Quality Counts
        prices_qs = MarketPrice.objects.filter(stock__symbol=normalized_symbol).order_by("timestamp")
        total_observations = prices_qs.count()
        latest_price = prices_qs.last()
        oldest_price = prices_qs.first()

        # 5. Independent Health Indicators
        model_status = "Available" if model_info["status"] == "production" else "Unavailable"
        data_status = (
            "Healthy"
            if total_observations >= 50
            else "Warning"
            if total_observations > 0
            else "Unavailable"
        )
        prediction_status = "Active" if total_predictions > 0 else "Inactive"
        performance_status = "Available" if (resolved_predictions > 0 or bool(metrics)) else "Insufficient Data"

        health_indicators = {
            "model_status": model_status,
            "data_status": data_status,
            "prediction_status": prediction_status,
            "drift_status": drift_status,
            "performance_status": performance_status,
        }

        return {
            "symbol": normalized_symbol,
            "active_model": model_info,
            "metrics": metrics,
            "predictions": {
                "total": total_predictions,
                "resolved": resolved_predictions,
                "correct": correct_predictions,
                "incorrect": incorrect_predictions,
                "pending": pending_predictions,
                "accuracy": historical_accuracy,
            },
            "data_drift": {
                "status": drift_status,
                "average_psi": drift_data.get("average_psi", 0.0),
                "method": drift_data.get("method", "PSI"),
            },
            "data_quality": {
                "total_observations": total_observations,
                "oldest_observation": oldest_price.timestamp.isoformat() if oldest_price else None,
                "latest_observation": latest_price.timestamp.isoformat() if latest_price else None,
                "missing_values": 0,
                "duplicate_records": 0,
            },
            "health_indicators": health_indicators,
        }

    @classmethod
    def get_performance(
        cls,
        symbol: str,
        period: Optional[str] = "30D",
    ) -> Dict[str, Any]:
        """
        Calculate confusion matrix, precision/recall/f1, accuracy over time,
        and confidence vs outcome buckets from resolved predictions.
        """
        normalized_symbol = symbol.strip().upper()
        queryset = Prediction.objects.filter(
            symbol=normalized_symbol,
            outcome__in=["CORRECT", "INCORRECT"],
        ).order_by("generated_at")

        # Optional date filtering
        now = timezone.now()
        if period == "7D":
            queryset = queryset.filter(generated_at__gte=now - timedelta(days=7))
        elif period == "30D":
            queryset = queryset.filter(generated_at__gte=now - timedelta(days=30))
        elif period == "90D":
            queryset = queryset.filter(generated_at__gte=now - timedelta(days=90))
        elif period == "1Y":
            queryset = queryset.filter(generated_at__gte=now - timedelta(days=365))

        resolved_list = list(queryset)

        # 1. Confusion Matrix (Positive Class: UP)
        # Predicted UP & Actual UP: TP
        # Predicted UP & Actual DOWN: FP
        # Predicted DOWN & Actual UP: FN
        # Predicted DOWN & Actual DOWN: TN
        tp = 0
        fp = 0
        fn = 0
        tn = 0

        for p in resolved_list:
            pred_up = p.prediction == "UP"
            actual_up = p.actual_direction == "UP"

            if pred_up and actual_up:
                tp += 1
            elif pred_up and not actual_up:
                fp += 1
            elif not pred_up and actual_up:
                fn += 1
            else:
                tn += 1

        total_resolved = len(resolved_list)

        accuracy = round((tp + tn) / total_resolved * 100, 2) if total_resolved > 0 else None
        precision = round(tp / (tp + fp) * 100, 2) if (tp + fp) > 0 else None
        recall = round(tp / (tp + fn) * 100, 2) if (tp + fn) > 0 else None
        f1 = (
            round((2 * (precision / 100) * (recall / 100)) / ((precision / 100) + (recall / 100)), 4)
            if (precision is not None and recall is not None and (precision + recall) > 0)
            else None
        )

        confusion_matrix = {
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "tn": tn,
            "total": total_resolved,
            "positive_class": "UP",
        }

        # 2. Accuracy Over Time (Chronological Cumulative)
        accuracy_timeline = []
        cum_correct = 0
        for idx, p in enumerate(resolved_list):
            if p.outcome == "CORRECT":
                cum_correct += 1
            cum_acc = round((cum_correct / (idx + 1)) * 100, 2)
            accuracy_timeline.append({
                "timestamp": p.generated_at.isoformat(),
                "accuracy": cum_acc,
                "outcome": p.outcome,
                "prediction": p.prediction,
                "actual_direction": p.actual_direction,
            })

        # 3. Confidence vs Outcome Buckets
        # Buckets: 50-60%, 60-70%, 70-80%, 80-90%, 90-100%
        bucket_defs = [
            {"label": "50–60%", "min": 0.50, "max": 0.60},
            {"label": "60–70%", "min": 0.60, "max": 0.70},
            {"label": "70–80%", "min": 0.70, "max": 0.80},
            {"label": "80–90%", "min": 0.80, "max": 0.90},
            {"label": "90–100%", "min": 0.90, "max": 1.01},
        ]

        confidence_buckets = []
        for b in bucket_defs:
            in_bucket = [p for p in resolved_list if b["min"] <= p.probability < b["max"]]
            count = len(in_bucket)
            if count > 0:
                correct_b = sum(1 for p in in_bucket if p.outcome == "CORRECT")
                bucket_acc = round((correct_b / count) * 100, 2)
                confidence_buckets.append({
                    "bucket": b["label"],
                    "total_count": count,
                    "correct_count": correct_b,
                    "accuracy": bucket_acc,
                })

        return {
            "symbol": normalized_symbol,
            "period": period,
            "total_resolved": total_resolved,
            "metrics": {
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1,
            },
            "confusion_matrix": confusion_matrix,
            "accuracy_timeline": accuracy_timeline,
            "confidence_buckets": confidence_buckets,
        }

