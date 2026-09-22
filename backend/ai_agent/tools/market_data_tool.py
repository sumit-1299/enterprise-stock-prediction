"""
Market data tools for AI Agent.
Retrieves real OHLCV quotes and price summaries from PostgreSQL.
"""
import logging
from typing import Any, Dict
from market_data.models import MarketPrice
from stocks.models import Stock
from stocks.universe import get_stock_metadata

logger = logging.getLogger(__name__)


def get_stock_quote(symbol: str) -> Dict[str, Any]:
    """
    Retrieve the latest recorded market price, volume, and daily change for a symbol.
    """
    normalized = symbol.strip().upper()
    meta = get_stock_metadata(normalized) or {}

    records = list(
        MarketPrice.objects.filter(stock__symbol=normalized)
        .order_by("-timestamp")[:2]
    )

    if not records:
        return {
            "status": "no_data",
            "symbol": normalized,
            "company_name": meta.get("company_name", normalized),
            "message": f"No market price records found for {normalized}.",
        }

    latest = records[0]
    prev = records[1] if len(records) > 1 else None

    close_val = round(float(latest.close_price), 2)
    open_val = round(float(latest.open_price), 2)
    high_val = round(float(latest.high_price), 2)
    low_val = round(float(latest.low_price), 2)
    volume_val = int(latest.volume)
    ts_str = latest.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")

    change = 0.0
    change_pct = 0.0
    if prev and float(prev.close_price) != 0:
        prev_close = float(prev.close_price)
        change = round(close_val - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2)

    return {
        "status": "ok",
        "symbol": normalized,
        "company_name": meta.get("company_name", normalized),
        "exchange": meta.get("exchange", "NSE"),
        "sector": meta.get("sector", ""),
        "currency": meta.get("currency", "INR"),
        "timestamp": ts_str,
        "open": open_val,
        "high": high_val,
        "low": low_val,
        "close": close_val,
        "volume": volume_val,
        "change": change,
        "change_percent": change_pct,
    }


def get_market_history_summary(symbol: str, limit: int = 30) -> Dict[str, Any]:
    """
    Retrieve summary statistics of recent trading sessions.
    """
    normalized = symbol.strip().upper()
    meta = get_stock_metadata(normalized) or {}

    records = list(
        MarketPrice.objects.filter(stock__symbol=normalized)
        .order_by("-timestamp")[:limit]
    )

    if not records:
        return {
            "status": "no_data",
            "symbol": normalized,
            "message": f"No historical records found for {normalized}.",
        }

    prices = [float(r.close_price) for r in records]
    highs = [float(r.high_price) for r in records]
    lows = [float(r.low_price) for r in records]
    volumes = [int(r.volume) for r in records]

    period_high = round(max(highs), 2)
    period_low = round(min(lows), 2)
    avg_volume = int(sum(volumes) / len(volumes))
    latest_close = round(prices[0], 2)
    oldest_close = round(prices[-1], 2)

    period_return = 0.0
    if oldest_close > 0:
        period_return = round(((latest_close - oldest_close) / oldest_close) * 100, 2)

    return {
        "status": "ok",
        "symbol": normalized,
        "company_name": meta.get("company_name", normalized),
        "bars_analyzed": len(records),
        "latest_close": latest_close,
        "period_high": period_high,
        "period_low": period_low,
        "avg_daily_volume": avg_volume,
        "period_return_percent": period_return,
        "date_range": f"{records[-1].timestamp.strftime('%Y-%m-%d')} to {records[0].timestamp.strftime('%Y-%m-%d')}",
    }

