"""
Service for calculating feature data drift using Population Stability Index (PSI).
"""

import logging
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from market_data.services.feature_engineering import FeatureEngineeringService

logger = logging.getLogger(__name__)

DRIFT_FEATURES = [
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


class DataDriftService:
    """
    Computes statistical feature drift between reference baseline and current market regimes.
    """

    @classmethod
    def calculate_feature_psi(
        cls,
        reference: np.ndarray,
        current: np.ndarray,
        num_bins: int = 10,
        epsilon: float = 0.0001,
    ) -> float:
        """
        Calculate Population Stability Index (PSI) for a single numerical feature series.

        PSI = sum((Q_i - P_i) * ln(Q_i / P_i))
        where P_i is the proportion in reference bin i, and Q_i is the proportion in current bin i.
        """
        ref_valid = reference[~np.isnan(reference) & ~np.isinf(reference)]
        cur_valid = current[~np.isnan(current) & ~np.isinf(current)]

        if len(ref_valid) < 10 or len(cur_valid) < 10:
            return 0.0

        # Create quantile bins from the reference distribution
        percentiles = np.linspace(0, 100, num_bins + 1)
        bin_edges = np.percentile(ref_valid, percentiles)
        # Ensure bin edges are strictly increasing by adding jitter if necessary
        for i in range(1, len(bin_edges)):
            if bin_edges[i] <= bin_edges[i - 1]:
                bin_edges[i] = bin_edges[i - 1] + 1e-6

        # Extend outer edges to cover extremes
        bin_edges[0] = -np.inf
        bin_edges[-1] = np.inf

        # Calculate counts in each bin
        ref_counts, _ = np.histogram(ref_valid, bins=bin_edges)
        cur_counts, _ = np.histogram(cur_valid, bins=bin_edges)

        # Proportions with epsilon smoothing
        ref_props = np.maximum(ref_counts / len(ref_valid), epsilon)
        cur_props = np.maximum(cur_counts / len(cur_valid), epsilon)

        # Normalize proportions to sum to 1
        ref_props = ref_props / np.sum(ref_props)
        cur_props = cur_props / np.sum(cur_props)

        # PSI computation
        psi_value = np.sum((cur_props - ref_props) * np.log(cur_props / ref_props))
        return float(max(0.0, psi_value))

    @classmethod
    def calculate_drift_for_symbol(
        cls,
        symbol: str,
        ref_window: int = 150,
        cur_window: int = 50,
    ) -> Dict[str, Any]:
        """
        Compute drift across all 12 quantitative features for the specified symbol.
        """
        normalized_symbol = symbol.strip().upper()

        try:
            df = FeatureEngineeringService.load_market_data(normalized_symbol)
            if df.empty:
                return {
                    "symbol": normalized_symbol,
                    "status": "UNAVAILABLE",
                    "message": f"No market data available for '{normalized_symbol}'.",
                    "features": [],
                }

            # Generate features
            df_features = FeatureEngineeringService.create_features(df)
            total_rows = len(df_features)

            if total_rows < 60:
                return {
                    "symbol": normalized_symbol,
                    "status": "INSUFFICIENT_DATA",
                    "message": f"Insufficient observations ({total_rows}) for drift analysis. Minimum 60 required.",
                    "features": [],
                }

            # Split into reference and current windows
            # If dataset is large, reference is older observations, current is recent
            if total_rows >= ref_window + cur_window:
                ref_df = df_features.iloc[:ref_window]
                cur_df = df_features.iloc[-cur_window:]
            else:
                # Proportional split (70% reference, 30% current)
                split_idx = int(total_rows * 0.7)
                ref_df = df_features.iloc[:split_idx]
                cur_df = df_features.iloc[split_idx:]

            feature_reports: List[Dict[str, Any]] = []
            psi_values: List[float] = []

            for feat in DRIFT_FEATURES:
                if feat not in df_features.columns:
                    continue

                ref_series = ref_df[feat].to_numpy(dtype=float)
                cur_series = cur_df[feat].to_numpy(dtype=float)

                ref_mean = float(np.nanmean(ref_series)) if not np.all(np.isnan(ref_series)) else 0.0
                cur_mean = float(np.nanmean(cur_series)) if not np.all(np.isnan(cur_series)) else 0.0
                ref_std = float(np.nanstd(ref_series)) if not np.all(np.isnan(ref_series)) else 0.0
                cur_std = float(np.nanstd(cur_series)) if not np.all(np.isnan(cur_series)) else 0.0

                psi = cls.calculate_feature_psi(ref_series, cur_series)
                psi_values.append(psi)

                # Determine status based on industry-standard PSI thresholds
                if psi < 0.10:
                    status = "Stable"
                elif psi <= 0.25:
                    status = "Moderate"
                else:
                    status = "High"

                feature_reports.append({
                    "feature": feat,
                    "reference_mean": round(ref_mean, 4),
                    "current_mean": round(cur_mean, 4),
                    "reference_std": round(ref_std, 4),
                    "current_std": round(cur_std, 4),
                    "drift_score": round(psi, 4),
                    "status": status,
                })

            avg_psi = float(np.mean(psi_values)) if psi_values else 0.0
            has_high = any(f["status"] == "High" for f in feature_reports)
            has_mod = any(f["status"] == "Moderate" for f in feature_reports)

            if has_high:
                overall_status = "High"
            elif has_mod:
                overall_status = "Moderate"
            else:
                overall_status = "Stable"

            return {
                "symbol": normalized_symbol,
                "status": overall_status,
                "average_psi": round(avg_psi, 4),
                "reference_observations": len(ref_df),
                "current_observations": len(cur_df),
                "method": "Population Stability Index (PSI)",
                "description": "Measures distribution shift between reference baseline and current market observations using 10 reference deciles and 0.0001 Laplace smoothing.",
                "thresholds": {
                    "stable": "< 0.10",
                    "moderate": "0.10 - 0.25",
                    "high": "> 0.25",
                },
                "features": feature_reports,
            }

        except Exception as exc:
            logger.error("Drift calculation failed for %s: %s", normalized_symbol, exc, exc_info=True)
            return {
                "symbol": normalized_symbol,
                "status": "ERROR",
                "message": f"Failed to compute feature drift for '{normalized_symbol}': {exc}",
                "features": [],
            }

