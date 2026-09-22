"""
WebSocket consumers for real-time market data streaming.
"""

import logging
import re
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)

# Valid symbol pattern: letters, numbers, dot, hyphen, underscore (e.g. TCS.NS, AAPL, INFY.NS)
SYMBOL_REGEX = re.compile(r"^[A-Za-z0-9_\.\-]{1,20}$")


def sanitize_group_name(symbol: str) -> str:
    """
    Sanitize a stock symbol to produce a valid Channels group name.
    Replaces '.' and '-' with '_' and prefixes with 'market_'.
    Example: 'TCS.NS' -> 'market_TCS_NS'
    """
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", symbol.strip().upper())
    return f"market_{cleaned}"


class MarketDataConsumer(AsyncJsonWebsocketConsumer):
    """
    Lightweight, asynchronous WebSocket consumer for stock market updates.

    Subscribes connected clients to symbol-specific channel groups (e.g. market_TCS_NS).
    Does NOT execute DB queries, polling loops, or ML inference.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.symbol: str = ""
        self.group_name: str = ""

    async def connect(self):
        raw_symbol = self.scope["url_route"]["kwargs"].get("symbol", "")
        symbol = raw_symbol.strip().upper()

        if not symbol or not SYMBOL_REGEX.match(symbol):
            logger.warning("Rejected WebSocket connection: invalid symbol '%s'", raw_symbol)
            await self.close(code=4400)
            return

        self.symbol = symbol
        self.group_name = sanitize_group_name(symbol)

        try:
            # Join symbol-specific broadcast group
            await self.channel_layer.group_add(self.group_name, self.channel_name)
        except Exception as exc:
            logger.error("Failed to join channel group '%s': %s", self.group_name, exc)
            await self.close(code=4500)
            return

        await self.accept()

        logger.info(
            "WebSocket client connected to group '%s' for symbol '%s'",
            self.group_name,
            self.symbol,
        )

        # Send initial confirmation message
        await self.send_json({
            "type": "connection_established",
            "symbol": self.symbol,
            "status": "connected",
            "message": f"Subscribed to real-time market updates for {self.symbol}",
        })

    async def disconnect(self, close_code):
        if self.group_name:
            try:
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
            except Exception as exc:
                logger.warning("Failed to discard channel group '%s': %s", self.group_name, exc)

            logger.info(
                "WebSocket client disconnected from group '%s' (code: %s)",
                self.group_name,
                close_code,
            )

    async def receive_json(self, content, **kwargs):
        """
        Handle incoming messages from the client (e.g. ping/heartbeat).
        """
        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({"type": "pong", "symbol": self.symbol})

    async def market_update(self, event: dict):
        """
        Handler for 'market.update' events dispatched to this group by RealtimeEventService.
        """
        payload = event.get("data", {})
        await self.send_json(payload)

    async def prediction_update(self, event: dict):
        """
        Handler for 'prediction.update' events dispatched to this group by RealtimeEventService.
        """
        payload = event.get("data", {})
        await self.send_json(payload)

