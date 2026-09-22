import numpy as np

from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.preprocessing import StandardScaler

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


def train_baseline(symbol):

    # -------------------------
    # Load feature dataset
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
    # Scale features
    # -------------------------

    scaler = StandardScaler()

    # Fit ONLY on training data
    X_train_scaled = scaler.fit_transform(
        X_train
    )

    # Transform validation/test using
    # the training-fitted scaler
    X_validation_scaled = scaler.transform(
        X_validation
    )

    X_test_scaled = scaler.transform(
        X_test
    )

    # -------------------------
    # Train Linear Regression
    # -------------------------

    model = LinearRegression()

    model.fit(
        X_train_scaled,
        y_train,
    )

    # -------------------------
    # Predictions
    # -------------------------

    validation_predictions = model.predict(
        X_validation_scaled
    )

    test_predictions = model.predict(
        X_test_scaled
    )

    # -------------------------
    # Evaluation
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
    # Naive baseline
    # -------------------------

    naive_metrics = evaluate_naive_baseline(
        test
    )

    # -------------------------
    # Return everything
    # -------------------------

    return {
        "model": model,
        "scaler": scaler,

        "validation_metrics": validation_metrics,

        "test_metrics": test_metrics,

        "naive_metrics": naive_metrics,

        "test_predictions": test_predictions,

        "test_actual": y_test.to_numpy(),
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

    # Naive assumption:
    # tomorrow's return = 0

    actual = test["target_return"].to_numpy()

    predicted = np.zeros_like(
        actual
    )

    return evaluate_model(
        actual,
        predicted,
    )