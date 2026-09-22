"""
Tests for Django Channels, WebSocket consumers, routing, and RealtimeEventService.
"""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Ensure paths and Django environment are initialized
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()

from channels.layers import get_channel_layer
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.test import SimpleTestCase, override_settings

from market_data.consumers import MarketDataConsumer, sanitize_group_name
from market_data.routing import websocket_urlpatterns
from market_data.services.realtime_service import RealtimeEventService

TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}


@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class TestMarketDataWebSocket(SimpleTestCase):
    """Test suite for WebSocket connection, symbol subscription, group isolation, and event reception."""

    def test_sanitize_group_name(self):
        """Verify symbol sanitization creates valid Channels group names."""
        self.assertEqual(sanitize_group_name("TCS.NS"), "market_TCS_NS")
        self.assertEqual(sanitize_group_name("INFY.NS"), "market_INFY_NS")
        self.assertEqual(sanitize_group_name("RELIANCE.NS"), "market_RELIANCE_NS")
        self.assertEqual(sanitize_group_name("AAPL"), "market_AAPL")
        self.assertEqual(sanitize_group_name("brk-b"), "market_BRK_B")

    async def test_websocket_connection_and_subscription(self):
        """Verify client connects to /ws/market/TCS.NS/ and receives initial confirmation."""
        application = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(application, "/ws/market/TCS.NS/")
        connected, _ = await communicator.connect()

        self.assertTrue(connected, "WebSocket connection was not accepted")

        # Check initial confirmation message
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "connection_established")
        self.assertEqual(response["symbol"], "TCS.NS")
        self.assertEqual(response["status"], "connected")
        self.assertIn("Subscribed to real-time market updates", response["message"])

        await communicator.disconnect()

    async def test_websocket_receives_market_update_event(self):
        """Verify connected client receives market update event published to its symbol group."""
        application = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(application, "/ws/market/TCS.NS/")
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Consume initial connection message
        await communicator.receive_json_from()

        # Publish market update event via RealtimeEventService.apublish_market_update
        success = await RealtimeEventService.apublish_market_update(
            symbol="TCS.NS",
            price_data={
                "timestamp": "2026-09-21T15:30:00+00:00",
                "close_price": 4250.75,
                "volume": 1500000,
            },
            prediction_data={
                "prediction": "UP",
                "direction": 1,
                "probability": 0.76,
                "model_type": "xgboost_classifier",
                "model_version": "v1",
            },
        )
        self.assertTrue(success)

        # Verify client receives event
        event = await communicator.receive_json_from()
        self.assertEqual(event["type"], "market_update")
        self.assertEqual(event["symbol"], "TCS.NS")
        self.assertEqual(event["price"], 4250.75)
        self.assertEqual(event["volume"], 1500000)
        self.assertEqual(event["prediction"], "UP")
        self.assertEqual(event["direction"], 1)
        self.assertEqual(event["probability"], 0.76)
        self.assertEqual(event["model_type"], "xgboost_classifier")
        self.assertEqual(event["model_version"], "v1")

        await communicator.disconnect()

    async def test_websocket_group_isolation(self):
        """Verify TCS.NS client receives TCS.NS events and does NOT receive INFY.NS events."""
        application = URLRouter(websocket_urlpatterns)
        tcs_client = WebsocketCommunicator(application, "/ws/market/TCS.NS/")
        infy_client = WebsocketCommunicator(application, "/ws/market/INFY.NS/")

        connected_tcs, _ = await tcs_client.connect()
        connected_infy, _ = await infy_client.connect()
        self.assertTrue(connected_tcs)
        self.assertTrue(connected_infy)

        # Consume initial connection messages
        await tcs_client.receive_json_from()
        await infy_client.receive_json_from()

        # Publish event for TCS.NS only
        await RealtimeEventService.apublish_market_update(
            symbol="TCS.NS",
            price_data={
                "timestamp": "2026-09-21T15:30:00+00:00",
                "close_price": 4300.0,
            },
        )

        # TCS client must receive event
        tcs_event = await tcs_client.receive_json_from()
        self.assertEqual(tcs_event["symbol"], "TCS.NS")
        self.assertEqual(tcs_event["price"], 4300.0)

        # INFY client must receive nothing
        nothing = await infy_client.receive_nothing(timeout=0.1)
        self.assertTrue(nothing, "INFY.NS client received unrelated TCS.NS event!")

        await tcs_client.disconnect()
        await infy_client.disconnect()

    async def test_websocket_invalid_symbol_rejected(self):
        """Verify invalid or malicious symbol strings are rejected with close code 4400."""
        application = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(application, "/ws/market/INVALID%20SYMBOL%3B/")
        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4400)

    async def test_websocket_ping_pong(self):
        """Verify client can send ping and receive pong heartbeat."""
        application = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(application, "/ws/market/TCS.NS/")
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Consume initial message
        await communicator.receive_json_from()

        # Send ping
        await communicator.send_json_to({"type": "ping"})
        response = await communicator.receive_json_from()
        self.assertEqual(response["type"], "pong")
        self.assertEqual(response["symbol"], "TCS.NS")

        await communicator.disconnect()

    def test_sync_realtime_event_service_market_only(self):
        """Verify synchronous publish_market_update works for background/Celery callers."""
        success = RealtimeEventService.publish_market_update(
            symbol="TCS.NS",
            price_data={
                "timestamp": "2026-09-21T15:30:00+00:00",
                "close_price": 4200.0,
                "volume": 800000,
            },
            prediction_data=None,
        )
        self.assertTrue(success)

    @patch("market_data.services.realtime_service.get_channel_layer")
    def test_realtime_event_service_handles_channel_layer_error(self, mock_layer):
        """Verify RealtimeEventService handles channel layer exceptions gracefully without raising."""
        mock_layer.side_effect = Exception("Redis connection refused")
        success = RealtimeEventService.publish_market_update(
            symbol="TCS.NS",
            price_data={"timestamp": "2026-09-21T15:30:00+00:00", "close_price": 4200.0},
        )
        self.assertFalse(success)

