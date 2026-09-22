"""
Django REST Framework serializers for prediction and model metadata API endpoints.
"""

from rest_framework import serializers


class ProbabilitiesSerializer(serializers.Serializer):
    """Serializer for binary class direction probabilities."""
    DOWN = serializers.FloatField(min_value=0.0, max_value=1.0, required=False, default=0.0)
    UP = serializers.FloatField(min_value=0.0, max_value=1.0, required=False, default=0.0)


class PredictionResponseSerializer(serializers.Serializer):
    """Serializer for stock price direction prediction responses."""
    symbol = serializers.CharField(max_length=20)
    prediction = serializers.ChoiceField(choices=["UP", "DOWN"])
    direction = serializers.ChoiceField(choices=[0, 1])
    probability = serializers.FloatField(min_value=0.0, max_value=1.0)
    probabilities = ProbabilitiesSerializer()
    model_type = serializers.CharField(max_length=50)
    model_version = serializers.CharField(max_length=20)
    timestamp = serializers.CharField()
    features_used = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )


class ModelInfoResponseSerializer(serializers.Serializer):
    """Serializer for safe model metadata responses (excludes filesystem paths)."""
    symbol = serializers.CharField(max_length=20)
    model_type = serializers.CharField(max_length=50)
    model_version = serializers.CharField(max_length=20)
    features = serializers.ListField(child=serializers.CharField())
    metrics = serializers.DictField(required=False)
    created_at = serializers.CharField(required=False, allow_null=True)
    feature_importance = serializers.DictField(required=False)


class HealthResponseSerializer(serializers.Serializer):
    """Serializer for system health check endpoint."""
    status = serializers.CharField(default="ok")
    components = serializers.DictField(required=False)


class MarketDataPointSerializer(serializers.Serializer):
    """Serializer for market price history and computed technical indicators."""
    timestamp = serializers.CharField()
    open = serializers.FloatField(required=False, allow_null=True)
    high = serializers.FloatField(required=False, allow_null=True)
    low = serializers.FloatField(required=False, allow_null=True)
    close = serializers.FloatField(required=False, allow_null=True)
    volume = serializers.IntegerField(required=False, allow_null=True)
    return_1d = serializers.FloatField(required=False, allow_null=True)
    return_5d = serializers.FloatField(required=False, allow_null=True)
    sma_10 = serializers.FloatField(required=False, allow_null=True)
    sma_20 = serializers.FloatField(required=False, allow_null=True)
    sma_50 = serializers.FloatField(required=False, allow_null=True)
    ema_12 = serializers.FloatField(required=False, allow_null=True)
    ema_26 = serializers.FloatField(required=False, allow_null=True)
    macd = serializers.FloatField(required=False, allow_null=True)
    macd_signal = serializers.FloatField(required=False, allow_null=True)
    rsi_14 = serializers.FloatField(required=False, allow_null=True)
    volatility_20 = serializers.FloatField(required=False, allow_null=True)
    volume_change = serializers.FloatField(required=False, allow_null=True)


class MarketDataLatestSerializer(serializers.Serializer):
    """Serializer for latest market data response."""
    symbol = serializers.CharField(max_length=20)
    timestamp = serializers.CharField()
    open = serializers.FloatField()
    high = serializers.FloatField()
    low = serializers.FloatField()
    close = serializers.FloatField()
    volume = serializers.IntegerField()
    change = serializers.FloatField()
    change_percent = serializers.FloatField()


class TechnicalIndicatorsSerializer(serializers.Serializer):
    """Serializer for technical indicators response."""
    symbol = serializers.CharField(max_length=20)
    timestamp = serializers.CharField()
    indicators = serializers.DictField()
    history = serializers.ListField(child=serializers.DictField(), required=False)


class PredictionHistoryItemSerializer(serializers.ModelSerializer):
    """Serializer for persisted historical predictions with outcome evaluation."""
    probabilities = ProbabilitiesSerializer(required=False, allow_null=True)
    market_price = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        from predictions.models import Prediction
        model = Prediction
        fields = [
            "id",
            "symbol",
            "prediction",
            "direction",
            "probability",
            "probabilities",
            "model_type",
            "model_version",
            "market_data_timestamp",
            "market_price",
            "features_used",
            "feature_snapshot",
            "actual_direction",
            "actual_return",
            "outcome",
            "resolved_at",
            "latency_ms",
            "generated_at",
        ]


class ModelMonitoringSummarySerializer(serializers.Serializer):
    """Serializer for executive model monitoring summary."""
    symbol = serializers.CharField()
    active_model = serializers.DictField()
    metrics = serializers.DictField()
    predictions = serializers.DictField()
    data_drift = serializers.DictField()
    data_quality = serializers.DictField()
    health_indicators = serializers.DictField()


class ModelMonitoringPerformanceSerializer(serializers.Serializer):
    """Serializer for detailed performance, confusion matrix, and confidence buckets."""
    symbol = serializers.CharField()
    period = serializers.CharField()
    total_resolved = serializers.IntegerField()
    metrics = serializers.DictField()
    confusion_matrix = serializers.DictField()
    accuracy_timeline = serializers.ListField(child=serializers.DictField())
    confidence_buckets = serializers.ListField(child=serializers.DictField())


class ModelMonitoringDriftSerializer(serializers.Serializer):
    """Serializer for feature drift results."""
    symbol = serializers.CharField()
    status = serializers.CharField()
    average_psi = serializers.FloatField(required=False)
    reference_observations = serializers.IntegerField(required=False)
    current_observations = serializers.IntegerField(required=False)
    method = serializers.CharField(required=False)
    description = serializers.CharField(required=False)
    thresholds = serializers.DictField(required=False)
    features = serializers.ListField(child=serializers.DictField())
    message = serializers.CharField(required=False)


class ModelMonitoringDataQualitySerializer(serializers.Serializer):
    """Serializer for data quality inspection."""
    symbol = serializers.CharField()
    total_observations = serializers.IntegerField()
    oldest_observation = serializers.CharField(allow_null=True)
    latest_observation = serializers.CharField(allow_null=True)
    missing_values = serializers.IntegerField()
    duplicate_records = serializers.IntegerField()
    checks = serializers.ListField(child=serializers.DictField(), required=False)


class ModelEvaluationSerializer(serializers.Serializer):
    """Serializer for individual evaluation metrics."""
    dataset_split = serializers.CharField()
    metric_name = serializers.CharField()
    metric_value = serializers.FloatField()
    evaluated_at = serializers.DateTimeField(required=False)


class ModelVersionSerializer(serializers.Serializer):
    """Serializer for full model version details."""
    symbol = serializers.CharField()
    model_type = serializers.CharField()
    version = serializers.CharField()
    status = serializers.CharField()
    feature_schema_version = serializers.CharField()
    features = serializers.ListField(child=serializers.CharField())
    metrics = serializers.DictField()
    hyperparameters = serializers.DictField(required=False)
    created_at = serializers.CharField(allow_null=True)
    promoted_at = serializers.CharField(allow_null=True, required=False)
    retired_at = serializers.CharField(allow_null=True, required=False)


class ModelVersionSummarySerializer(serializers.Serializer):
    """Serializer for model version summary listing."""
    symbol = serializers.CharField()
    model_type = serializers.CharField()
    version = serializers.CharField()
    status = serializers.CharField()
    feature_schema_version = serializers.CharField()
    metrics = serializers.DictField()
    created_at = serializers.CharField(allow_null=True)
    promoted_at = serializers.CharField(allow_null=True, required=False)
    retired_at = serializers.CharField(allow_null=True, required=False)


class ModelComparisonResponseSerializer(serializers.Serializer):
    """Serializer for factual model version comparison."""
    symbol = serializers.CharField()
    model_type = serializers.CharField()
    version_a = serializers.DictField()
    version_b = serializers.DictField()
    metric_comparison = serializers.DictField()


class FeatureImportanceItemSerializer(serializers.Serializer):
    """Serializer for ordered feature importance item."""
    feature = serializers.CharField()
    importance = serializers.FloatField()
    rank = serializers.IntegerField()


class ModelArtifactStatusSerializer(serializers.Serializer):
    """Serializer for model artifact health status."""
    artifact = serializers.CharField()
    metadata = serializers.CharField()
    feature_schema = serializers.CharField()
    version = serializers.CharField()


class ModelAnalyticsModelSerializer(serializers.Serializer):
    """Serializer for model metadata in analytics response."""
    type = serializers.CharField()
    version = serializers.CharField()
    status = serializers.CharField()
    task = serializers.CharField(default="Binary Classification")
    target = serializers.CharField(default="Next Trading Day Direction")
    classes = serializers.ListField(child=serializers.CharField())
    features_count = serializers.IntegerField()
    features = serializers.ListField(child=serializers.CharField())
    execution = serializers.CharField(default="Inference Only")
    created_at = serializers.CharField(allow_null=True, required=False)
    promoted_at = serializers.CharField(allow_null=True, required=False)


class ModelAnalyticsResponseSerializer(serializers.Serializer):
    """Serializer for comprehensive Model Analytics response."""
    symbol = serializers.CharField()
    model = ModelAnalyticsModelSerializer()
    metrics = serializers.DictField()
    feature_importance = FeatureImportanceItemSerializer(many=True)
    artifact_status = ModelArtifactStatusSerializer()
    confusion_matrix = serializers.DictField(allow_null=True, required=False)
    roc_curve = serializers.DictField(allow_null=True, required=False)
    pr_curve = serializers.DictField(allow_null=True, required=False)




