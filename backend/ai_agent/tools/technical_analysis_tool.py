"""
Technical analysis tools for AI Agent.
Computes and interprets the 12 platform technical features from actual market bars.
"""
import logging
from typing import Any, Dict
import pandas as pd

from market_data.models import MarketPrice
from market_data.services.feature_engineering import FeatureEngineeringService
from stocks.universe import get_stock_metadata

logger = logging.getLogger(__name__)


def get_technical_indicators(symbol: str) -> Dict[str, Any]:
    """
    Compute and interpret 12 technical indicators for the latest market bar.
    """
    normalized = symbol.strip().upper()
    meta = get_stock_metadata(normalized) or {}

    prices = list(
        MarketPrice.objects.filter(stock__symbol=normalized)
        .order_by("timestamp")
        .values("timestamp", "open_price", "high_price", "low_price", "close_price", "volume")
    )

    if not prices:
        return {
            "status": "no_data",
            "symbol": normalized,
            "message": f"No market price history available for {normalized} to calculate technical indicators.",
        }

    if len(prices) < 50:
        return {
            "status": "insufficient_data",
            "symbol": normalized,
            "bars_found": len(prices),
            "bars_required": 50,
            "message": (
                f"Insufficient historical bars ({len(prices)}/50) to compute 50-day moving averages "
                f"and technical indicators for {normalized}."
            ),
        }

    df = pd.DataFrame(prices)
    df = df.rename(
        columns={
            "open_price": "open",
            "high_price": "high",
            "low_price": "low",
            "close_price": "close",
        }
    )
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    features_df = FeatureEngineeringService.create_features(df)
    feature_cols = [
        "return_1d", "return_5d", "sma_10", "sma_20", "sma_50",
        "ema_12", "ema_26", "macd", "macd_signal", "rsi_14",
        "volatility_20", "volume_change",
    ]
    features_df = features_df.dropna(subset=feature_cols)

    if features_df.empty:
        return {
            "status": "insufficient_data",
            "symbol": normalized,
            "message": f"Could not compute technical features for {normalized} after dropping initial rolling NaNs.",
        }

    latest = features_df.iloc[-1]
    latest_close = float(df.iloc[-1]["close"])

    rsi_14 = round(float(latest.get("rsi_14", 50.0)), 2)
    rsi_state = "Neutral"
    if rsi_14 >= 70:
        rsi_state = "Overbought (RSI >= 70)"
    elif rsi_14 <= 30:
        rsi_state = "Oversold (RSI <= 30)"
    elif rsi_14 > 50:
        rsi_state = "Mild Bullish Momentum (50 < RSI < 70)"
    else:
        rsi_state = "Mild Bearish Momentum (30 < RSI <= 50)"

    sma_10 = round(float(latest.get("sma_10", latest_close)), 2)
    sma_20 = round(float(latest.get("sma_20", latest_close)), 2)
    sma_50 = round(float(latest.get("sma_50", latest_close)), 2)
    ema_12 = round(float(latest.get("ema_12", latest_close)), 2)
    ema_26 = round(float(latest.get("ema_26", latest_close)), 2)

    trend = "Neutral"
    if latest_close > sma_20 > sma_50:
        trend = "Bullish Alignment (Price > SMA-20 > SMA-50)"
    elif latest_close < sma_20 < sma_50:
        trend = "Bearish Alignment (Price < SMA-20 < SMA-50)"
    elif latest_close > sma_20:
        trend = "Short-term Bullish (Price > SMA-20)"
    else:
        trend = "Short-term Bearish (Price < SMA-20)"

    macd = round(float(latest.get("macd", 0.0)), 2)
    macd_signal = round(float(latest.get("macd_signal", 0.0)), 2)
    macd_hist = round(macd - macd_signal, 2)
    macd_state = "Bullish Crossover (MACD > Signal)" if macd >= macd_signal else "Bearish Crossover (MACD < Signal)"

    volatility_20 = round(float(latest.get("volatility_20", 0.0)) * 100, 2)
    return_1d = round(float(latest.get("return_1d", 0.0)) * 100, 2)
    return_5d = round(float(latest.get("return_5d", 0.0)) * 100, 2)
    volume_change = round(float(latest.get("volume_change", 0.0)), 2)

    return {
        "status": "ok",
        "symbol": normalized,
        "company_name": meta.get("company_name", normalized),
        "latest_close": round(latest_close, 2),
        "rsi": {
            "value": rsi_14,
            "state": rsi_state,
            "period": 14,
        },
        "moving_averages": {
            "sma_10": sma_10,
            "sma_20": sma_20,
            "sma_50": sma_50,
            "ema_12": ema_12,
            "ema_26": ema_26,
            "trend_alignment": trend,
        },
        "macd": {
            "macd_line": macd,
            "signal_line": macd_signal,
            "histogram": macd_hist,
            "crossover_state": macd_state,
        },
        "volatility_20d_annualized_percent": volatility_20,
        "returns": {
            "return_1d_percent": return_1d,
            "return_5d_percent": return_5d,
        },
        "volume_change_ratio": volume_change,
    }
