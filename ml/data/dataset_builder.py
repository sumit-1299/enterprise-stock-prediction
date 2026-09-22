from market_data.services.feature_engineering import (
    FeatureEngineeringService,
)


FEATURE_COLUMNS = [
    "return_1d",
    "return_5d",
    "sma_10",
    "sma_20",
    "sma_50",
    "ema_12",
    "ema_26",
    "macd",
    "macd_signal",
    "rsi_14",
    "volatility_20",
    "volume_change",
]

TARGET_REGRESSION = "target_return"

TARGET_CLASSIFICATION = "target_direction"


def build_ml_dataset(symbol):

    df = FeatureEngineeringService.build_dataset(
        symbol
    )

    X = df[FEATURE_COLUMNS].copy()

    y_regression = df[
        TARGET_REGRESSION
    ].copy()

    y_classification = df[
        TARGET_CLASSIFICATION
    ].copy()

    return (
        df,
        X,
        y_regression,
        y_classification,
    )