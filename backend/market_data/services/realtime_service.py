"""
Real-time event publishing service for market data and prediction events.
"""

import logging
from typing import Any, Dict, Optional, Tuple

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from market_data.consumers import sanitize_group_name

logger = logging.getLogger(__name__)


class RealtimeEventService:
    """
    Centralized service for formatting and dispatching real-time market and prediction events
    via Django Channels group messaging.
    """

    @classmethod
    def _build_payload(
        cls,
        symbol: str,
        price_data: Dict[str, Any],
        prediction_data: Optional[Dict[str, Any]] = None,
        event_type: str = "market_update",
    ) -> Tuple[str, Dict[str, Any]]:
        normalized_symbol = symbol.strip().upper()
        group_name = sanitize_group_name(normalized_symbol)

        price = price_data.get("close_price")
        if price is None:
            price = price_data.get("price", 0.0)

        timestamp = price_data.get("timestamp")
        if not timestamp and prediction_data:
            timestamp = prediction_data.get("timestamp")

        payload: Dict[str, Any] = {
            "type": event_type,
            "symbol": normalized_symbol,
            "timestamp": timestamp,
            "price": float(price),
        }

        if "volume" in price_data and price_data["volume"] is not None:
            payload["volume"] = price_data["volume"]

        # Safely attach prediction data if available
        if prediction_data:
            payload["prediction"] = prediction_data.get("prediction")
            payload["direction"] = prediction_data.get("direction")
            payload["probability"] = prediction_data.get("probability")
            if "probabilities" in prediction_data:
                payload["probabilities"] = prediction_data["probabilities"]
            payload["model_type"] = prediction_data.get("model_type")
            payload["model_version"] = prediction_data.get("model_version")

        return group_name, payload

    @classmethod
    async def apublish_market_update(
        cls,
        symbol: str,
        price_data: Dict[str, Any],
        prediction_data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Asynchronously publish a market update event to the symbol's WebSocket group.
        """
        group_name, payload = cls._build_payload(
            symbol, price_data, prediction_data, event_type="market_update"
        )

        try:
            channel_layer = get_channel_layer()
            if channel_layer is None:
                logger.warning(
                    "No channel layer configured; skipping WebSocket publish for %s",
                    symbol,
                )
                return False

            await channel_layer.group_send(
                group_name,
                {
                    "type": "market.update",
                    "data": payload,
                },
            )
            logger.info(
                "Published market_update event to group '%s' for %s (price=%s, prediction=%s)",
                group_name,
                symbol,
                payload.get("price"),
                payload.get("prediction"),
            )
            return True

        except Exception as exc:
            logger.error(
                "Failed to publish market_update event for %s to group '%s': %s",
                symbol,
                group_name,
                exc,
            )
            return False

    @classmethod
    def publish_market_update(
        cls,
        symbol: str,
        price_data: Dict[str, Any],
        prediction_data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Synchronously publish a market update event to the symbol's WebSocket group.
        """
        return async_to_sync(cls.apublish_market_update)(symbol, price_data, prediction_data)

    @classmethod
    async def apublish_prediction_update(
        cls,
        symbol: str,
        prediction_data: Dict[str, Any],
        price_data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Asynchronously publish a prediction update event to the symbol's WebSocket group.
        """
        group_name, payload = cls._build_payload(
            symbol, price_data or {}, prediction_data, event_type="prediction_update"
        )

        try:
            channel_layer = get_channel_layer()
            if channel_layer is None:
                logger.warning(
                    "No channel layer configured; skipping WebSocket publish for %s",
                    symbol,
                )
                return False

            await channel_layer.group_send(
                group_name,
                {
                    "type": "prediction.update",
                    "data": payload,
                },
            )
            logger.info(
                "Published prediction_update event to group '%s' for %s (direction=%s, prob=%s)",
                group_name,
                symbol,
                payload.get("prediction"),
                payload.get("probability"),
            )
            return True

        except Exception as exc:
            logger.error(
                "Failed to publish prediction_update event for %s to group '%s': %s",
                symbol,
                group_name,
                exc,
            )
            return False

    @classmethod
    def publish_prediction_update(
        cls,
        symbol: str,
        prediction_data: Dict[str, Any],
        price_data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Synchronously publish a prediction update event to the symbol's WebSocket group.
        """
        return async_to_sync(cls.apublish_prediction_update)(symbol, prediction_data, price_data)
