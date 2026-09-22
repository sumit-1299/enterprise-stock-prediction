"""
Training and evaluation pipeline for XGBoost binary direction classifier.

Respects chronological time-series split, computes validation and test metrics,
benchmarks against the majority-class baseline, and registers trained models
as 'candidate' versions in the Model Registry.
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
try:
    import django
    django.setup()
except Exception:
    pass

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)
from xgboost import XGBClassifier

from market_data.services.feature_engineering import FeatureEngineeringService
from ml.models.model_registry import ModelRegistry, save_model
from ml.training.time_series_split import time_series_split

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

DEFAULT_HYPERPARAMETERS = {
    "n_estimators": 300,
    "max_depth": 4,
    "learning_rate": 0.03,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "objective": "binary:logistic",
    "eval_metric": "logloss",
    "random_state": 42,
    "n_jobs": -1,
}


def _determine_next_version(symbol: str, model_type: str = "xgboost_classifier") -> str:
    """Determine the next sequential candidate version tag (e.g. v1 -> v2)."""
    existing_models = ModelRegistry.list_models(symbol=symbol, model_type=model_type)
    if not existing_models:
        return "v1"
    highest_idx = 0
    for m in existing_models:
        v_str = m.get("version", "")
        if v_str.startswith("v") and v_str[1:].isdigit():
            highest_idx = max(highest_idx, int(v_str[1:]))
    return f"v{highest_idx + 1}"


def train_xgboost_classifier(
    symbol: str,
    version: Optional[str] = None,
    status: str = "candidate",
    hyperparameters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Train a candidate XGBoost classifier for stock price direction.

    Args:
        symbol: Stock ticker symbol (e.g. 'TCS.NS').
        version: Explicit version tag (default: auto-increments to next candidate version).
        status: Initial lifecycle status (default: 'candidate'). Must NOT be 'production' directly.
        hyperparameters: Optional model hyperparameter overrides.

    Returns:
        Structured dictionary containing model, metrics, baseline, version, and paths.
    """
    if status == "production":
        raise ValueError(
            "New models cannot be trained directly into 'production' status. "
            "Must be trained as 'candidate' and promoted through explicit promotion workflow."
        )

    if version is None:
        version = _determine_next_version(symbol, "xgboost_classifier")

    params = {**DEFAULT_HYPERPARAMETERS, **(hyperparameters or {})}

    # 1. Load dataset via shared feature engineering pipeline
    df = FeatureEngineeringService.build_dataset(symbol)

    # 2. Chronological time-series split (70% train, 15% val, 15% test)
    train, validation, test = time_series_split(df)

    X_train = train[FEATURE_COLUMNS]
    X_validation = validation[FEATURE_COLUMNS]
    X_test = test[FEATURE_COLUMNS]

    y_train = train["target_direction"]
    y_validation = validation["target_direction"]
    y_test = test["target_direction"]

    # 3. Instantiate and train XGBoost classifier
    model = XGBClassifier(**params)
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_validation, y_validation)],
        verbose=False,
    )

    # 4. Predictions and probabilities
    val_preds = model.predict(X_validation)
    test_preds = model.predict(X_test)

    val_probs = model.predict_proba(X_validation)[:, 1]
    test_probs = model.predict_proba(X_test)[:, 1]

    # 5. Standardized evaluation metrics
    validation_metrics = evaluate_classifier(y_validation, val_preds, val_probs)
    test_metrics = evaluate_classifier(y_test, test_preds, test_probs)
    majority_metrics = evaluate_majority_baseline(y_train, y_test)

    # 6. Save model and metadata to registry (Candidate status)
    save_result = save_model(
        model=model,
        symbol=symbol,
        model_type="xgboost_classifier",
        feature_columns=FEATURE_COLUMNS,
        metrics=test_metrics,
        version=version,
        status=status,
        feature_schema_version="v1",
        hyperparameters=params,
        evaluation_splits={
            "validation": validation_metrics,
            "test": test_metrics,
            "majority_baseline": majority_metrics,
        },
    )

    return {
        "model": model,
        "symbol": symbol,
        "version": version,
        "status": status,
        "validation_metrics": validation_metrics,
        "test_metrics": test_metrics,
        "majority_metrics": majority_metrics,
        "test_predictions": test_preds,
        "test_probabilities": test_probs,
        "test_actual": y_test.to_numpy(),
        "model_path": save_result["model_path"],
        "metadata_path": save_result["metadata_path"],
    }


def evaluate_classifier(
    actual,
    predicted,
    probabilities,
) -> Dict[str, Any]:
    """Standardized classification metric calculation."""
    metrics: Dict[str, Any] = {
        "accuracy": float(accuracy_score(actual, predicted)),
        "balanced_accuracy": float(balanced_accuracy_score(actual, predicted)),
        "precision": float(precision_score(actual, predicted, zero_division=0)),
        "recall": float(recall_score(actual, predicted, zero_division=0)),
        "f1": float(f1_score(actual, predicted, zero_division=0)),
    }

    # ROC-AUC requires both classes
    if len(np.unique(actual)) == 2:
        metrics["roc_auc"] = float(roc_auc_score(actual, probabilities))
        try:
            metrics["log_loss"] = float(log_loss(actual, probabilities))
        except Exception:
            metrics["log_loss"] = None
    else:
        metrics["roc_auc"] = None
        metrics["log_loss"] = None

    return metrics


def evaluate_majority_baseline(
    y_train,
    y_test,
) -> Dict[str, Any]:
    """Evaluate against the simple majority class benchmark."""
    majority_class = y_train.value_counts().idxmax()
    predictions = np.full(len(y_test), majority_class)
    probabilities = np.full(len(y_test), float(majority_class))

    return evaluate_classifier(
        y_test,
        predictions,
        probabilities,
    )


if __name__ == "__main__":
    import argparse
    import sys
    from pathlib import Path

    # Ensure backend directory is in sys.path for Django models
    backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    import os
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    import django
    django.setup()

    parser = argparse.ArgumentParser(description="Train XGBoost binary classifier for stock price direction.")
    parser.add_argument("--symbol", type=str, required=True, help="Stock ticker symbol (e.g. RELIANCE.NS)")
    parser.add_argument("--version", type=str, default=None, help="Explicit version tag (default: auto or v1)")
    parser.add_argument("--promote", action="store_true", help="Automatically promote trained model to production status")
    args = parser.parse_args()

    symbol_arg = args.symbol.strip().upper()
    version_arg = args.version or _determine_next_version(symbol_arg, "xgboost_classifier")

    print(f"Starting training for {symbol_arg} (version={version_arg})...")
    res = train_xgboost_classifier(symbol=symbol_arg, version=version_arg, status="candidate")
    print(f"\nModel trained successfully!")
    print(f"  Symbol:         {res['symbol']}")
    print(f"  Version:        {res['version']}")
    print(f"  Model Path:     {res['model_path']}")
    print(f"  Metadata Path:  {res['metadata_path']}")
    print(f"  Test Accuracy:  {res['test_metrics'].get('accuracy', 0):.4f}")
    print(f"  Test Precision: {res['test_metrics'].get('precision', 0):.4f}")
    print(f"  Test Recall:    {res['test_metrics'].get('recall', 0):.4f}")
    print(f"  Test F1 Score:  {res['test_metrics'].get('f1', 0):.4f}")
    print(f"  Test ROC-AUC:   {res['test_metrics'].get('roc_auc', 0):.4f}")

    if args.promote:
        print(f"\nPromoting {symbol_arg} version '{version_arg}' to production...")
        prom_res = ModelRegistry.promote_model(
            symbol=symbol_arg,
            model_type="xgboost_classifier",
            version=version_arg,
            target_status="production",
        )
        print(f"SUCCESS: {prom_res['message']}")