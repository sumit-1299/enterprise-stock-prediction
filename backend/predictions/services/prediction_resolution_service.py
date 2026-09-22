"""
Service for resolving prediction outcomes against realized market observations.
"""

import logging
from typing import Any, Dict, Optional

from django.utils import timezone
from market_data.models import MarketPrice
from predictions.models import Prediction

logger = logging.getLogger(__name__)


class PredictionResolutionService:
    """
    Evaluates pending directional predictions by comparing forecasted direction
    against next-trading-day realized close-to-close returns.
    """

    @classmethod
    def resolve_pending_predictions(
        cls,
        symbol: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Scan and resolve all PENDING predictions where subsequent market prices exist.

        Resolution rule:
            actual_return = ((next_close - current_close) / current_close) * 100
            actual_direction = 'UP' if actual_return > 0 else 'DOWN'
            outcome = 'CORRECT' if predicted == actual_direction else 'INCORRECT'
        """
        queryset = Prediction.objects.filter(outcome="PENDING")
        if symbol:
            queryset = queryset.filter(symbol=symbol.strip().upper())

        pending_predictions = list(queryset.select_related("stock"))
        resolved_count = 0
        correct_count = 0
        incorrect_count = 0

        for pred in pending_predictions:
            if not pred.market_data_timestamp:
                continue

            # Find the market price corresponding to the prediction baseline
            current_price = (
                MarketPrice.objects.filter(
                    stock=pred.stock,
                    timestamp__lte=pred.market_data_timestamp,
                )
                .order_by("-timestamp")
                .first()
            )

            # Find the subsequent market observation (t + 1)
            next_price = (
                MarketPrice.objects.filter(
                    stock=pred.stock,
                    timestamp__gt=pred.market_data_timestamp,
                )
                .order_by("timestamp")
                .first()
            )

            if current_price and next_price:
                try:
                    c_close = float(current_price.close_price)
                    n_close = float(next_price.close_price)

                    if c_close > 0:
                        ret = ((n_close - c_close) / c_close) * 100.0
                        actual_dir = "UP" if ret > 0 else "DOWN"
                        is_correct = pred.prediction.upper() == actual_dir

                        pred.actual_direction = actual_dir
                        pred.actual_return = round(ret, 4)
                        pred.outcome = "CORRECT" if is_correct else "INCORRECT"
                        pred.resolved_at = timezone.now()
                        pred.save(
                            update_fields=[
                                "actual_direction",
                                "actual_return",
                                "outcome",
                                "resolved_at",
                            ]
                        )

                        resolved_count += 1
                        if is_correct:
                            correct_count += 1
                        else:
                            incorrect_count += 1

                        logger.info(
                            "Resolved prediction ID %s for %s: predicted=%s, actual=%s (ret=%.2f%%), outcome=%s",
                            pred.id,
                            pred.symbol,
                            pred.prediction,
                            actual_dir,
                            ret,
                            pred.outcome,
                        )
                except Exception as exc:
                    logger.error(
                        "Error resolving prediction ID %s for %s: %s",
                        pred.id,
                        pred.symbol,
                        exc,
                    )

        remaining_pending = Prediction.objects.filter(outcome="PENDING")
        if symbol:
            remaining_pending = remaining_pending.filter(symbol=symbol.strip().upper())

        summary = {
            "resolved_count": resolved_count,
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "pending_remaining": remaining_pending.count(),
        }
        logger.info("Prediction resolution complete: %s", summary)
        return summary

