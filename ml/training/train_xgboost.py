import numpy as np

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

from xgboost import XGBRegressor

from market_data.services.feature_engineering import (
    FeatureEngineeringService,
)

from ml.training.time_series_split import (
    time_series_split,
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


def train_xgboost(symbol):

    # -------------------------
    # Load dataset
    # -------------------------

    df = FeatureEngineeringService.build_dataset(
        symbol
    )

    # -------------------------
    # Time-series split
    # -------------------------

    train, validation, test = time_series_split(
        df
    )

    # -------------------------
    # Features and target
    # -------------------------

    X_train = train[FEATURE_COLUMNS]
    y_train = train["target_return"]

    X_validation = validation[FEATURE_COLUMNS]
    y_validation = validation["target_return"]

    X_test = test[FEATURE_COLUMNS]
    y_test = test["target_return"]

    # -------------------------
    # XGBoost model
    # -------------------------

    model = XGBRegressor(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        eval_metric="rmse",
        random_state=42,
        n_jobs=-1,
    )

    # -------------------------
    # Train
    # -------------------------

    model.fit(
        X_train,
        y_train,
        eval_set=[
            (X_validation, y_validation)
        ],
        verbose=False,
    )

    # -------------------------
    # Predictions
    # -------------------------

    validation_predictions = model.predict(
        X_validation
    )

    test_predictions = model.predict(
        X_test
    )

    # -------------------------
    # Metrics
    # -------------------------

    validation_metrics = evaluate_model(
        y_validation,
        validation_predictions,
    )

    test_metrics = evaluate_model(
        y_test,
        test_predictions,
    )

    # -------------------------
    # Naive benchmark
    # -------------------------

    naive_metrics = evaluate_naive_baseline(
        test
    )

    return {
        "model": model,

        "validation_metrics":
            validation_metrics,

        "test_metrics":
            test_metrics,

        "naive_metrics":
            naive_metrics,

        "test_predictions":
            test_predictions,

        "test_actual":
            y_test.to_numpy(),
    }


def evaluate_model(actual, predicted):

    rmse = np.sqrt(
        mean_squared_error(
            actual,
            predicted,
        )
    )

    return {
        "MAE": mean_absolute_error(
            actual,
            predicted,
        ),

        "RMSE": rmse,

        "R2": r2_score(
            actual,
            predicted,
        ),
    }


def evaluate_naive_baseline(test):

    actual = test[
        "target_return"
    ].to_numpy()

    predicted = np.zeros_like(
        actual
    )

    return evaluate_model(
        actual,
        predicted,
    )