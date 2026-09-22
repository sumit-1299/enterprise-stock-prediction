"""
URL routing for the stocks app.
"""

from django.urls import path
from stocks.views import StockDetailView, StockListView

urlpatterns = [
    path("", StockListView.as_view(), name="stock-list"),
    path("<str:symbol>/", StockDetailView.as_view(), name="stock-detail"),
]

