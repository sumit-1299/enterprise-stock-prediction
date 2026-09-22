"""
URL routing for the predictions app.
"""

from django.urls import path
from market_data.views import MarketDataHistoryView
from predictions.views import (
    HealthView,
    ModelComparisonView,
    ModelInfoView,
    ModelAnalyticsView,
    ModelListView,
    ModelVersionsView,
    PredictionHistoryView,
    PredictionDetailView,
    PredictionView,
    ProductionModelView,
    ModelMonitoringSummaryView,
    ModelMonitoringPerformanceView,
    ModelMonitoringDriftView,
    ModelMonitoringDataQualityView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("market/<str:symbol>/history/", MarketDataHistoryView.as_view(), name="market-history"),
    path("predictions/<str:symbol>/", PredictionView.as_view(), name="prediction"),
    path("predictions/<str:symbol>/history/", PredictionHistoryView.as_view(), name="prediction-history"),
    path("predictions/<str:symbol>/history/<int:id>/", PredictionDetailView.as_view(), name="prediction-detail"),
    path("predictions/history/", PredictionHistoryView.as_view(), name="prediction-history-all"),
    path("predictions/history/<int:id>/", PredictionDetailView.as_view(), name="prediction-detail-global"),
    path("predictions/<str:symbol>/model/", ModelInfoView.as_view(), name="model-info"),
    path("predictions/<str:symbol>/analytics/", ModelAnalyticsView.as_view(), name="model-analytics"),
    path("model-monitoring/<str:symbol>/summary/", ModelMonitoringSummaryView.as_view(), name="monitoring-summary"),
    path("model-monitoring/<str:symbol>/performance/", ModelMonitoringPerformanceView.as_view(), name="monitoring-performance"),
    path("model-monitoring/<str:symbol>/drift/", ModelMonitoringDriftView.as_view(), name="monitoring-drift"),
    path("model-monitoring/<str:symbol>/data-quality/", ModelMonitoringDataQualityView.as_view(), name="monitoring-data-quality"),
    path("models/", ModelListView.as_view(), name="model-list"),
    path("models/<str:symbol>/", ModelListView.as_view(), name="model-list-symbol"),
    path("models/<str:symbol>/<str:model_type>/versions/", ModelVersionsView.as_view(), name="model-versions"),
    path("models/<str:symbol>/<str:model_type>/production/", ProductionModelView.as_view(), name="model-production"),
    path("models/<str:symbol>/<str:model_type>/compare/", ModelComparisonView.as_view(), name="model-compare"),
]

