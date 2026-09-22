"""
WebSocket URL patterns for market data streaming.
"""

from django.urls import re_path
from market_data import consumers

websocket_urlpatterns = [
    re_path(
        r"^ws/market/(?P<symbol>[^/]+)/?$",
        consumers.MarketDataConsumer.as_asgi(),
    ),
]

