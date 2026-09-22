"""
URL routing for market data API endpoints.
"""

from django.urls import path
from market_data.views import (
    MarketDataHistoryView,
    MarketDataIndicatorsView,
    MarketDataLatestView,
)

urlpatterns = [
    path("<str:symbol>/", MarketDataLatestView.as_view(), name="market-data-latest"),
    path("<str:symbol>/history/", MarketDataHistoryView.as_view(), name="market-data-history"),
    path("<str:symbol>/indicators/", MarketDataIndicatorsView.as_view(), name="market-data-indicators"),
]

