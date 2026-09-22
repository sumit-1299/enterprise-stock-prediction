"""
Django REST Framework API views for market data, historical OHLCV, and technical indicators.
"""

import logging
import re
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
import pandas as pd

from market_data.models import MarketPrice
from market_data.services.feature_engineering import FeatureEngineeringService
from stocks.models import Stock

logger = logging.getLogger(__name__)

# Valid ticker symbol pattern: uppercase letters, numbers, dot, hyphen, underscore
SYMBOL_REGEX = re.compile(r"^[A-Za-z0-9._-]+$")


class MarketDataLatestView(APIView):
    """
    Endpoint for retrieving the latest market price, volume, and daily change.
    GET /api/market-data/<symbol>/
    """
    permission_classes = [AllowAny]

    def get(self, request, symbol, *args, **kwargs):
        normalized_symbol = symbol.strip().upper()
        if not normalized_symbol or len(normalized_symbol) > 20 or not SYMBOL_REGEX.match(normalized_symbol):
            return Response(
                {
                    "error": {
                        "code": "INVALID_SYMBOL",
                        "message": f"Invalid stock symbol format: '{symbol}'.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Retrieve the latest 2 market price records to calculate change
        records = list(
            MarketPrice.objects.filter(stock__symbol=normalized_symbol)
            .order_by("-timestamp")[:2]
        )

        if not records:
            return Response(
                {
                    "error": {
                        "code": "NO_DATA",
                        "message": f"No market data available for '{normalized_symbol}'.",
                    }
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        latest = records[0]
        prev = records[1] if len(records) > 1 else None

        close_val = round(float(latest.close_price), 2)
        open_val = round(float(latest.open_price), 2)
        high_val = round(float(latest.high_price), 2)
        low_val = round(float(latest.low_price), 2)
        volume_val = int(latest.volume)
        ts_val = latest.timestamp.isoformat()

        change = 0.0
        change_pct = 0.0
        if prev and float(prev.close_price) != 0:
            prev_close = float(prev.close_price)
            change = round(float(latest.close_price) - prev_close, 2)
            change_pct = round((change / prev_close) * 100, 2)

        return Response(
            {
                "symbol": normalized_symbol,
                "timestamp": ts_val,
                "open": open_val,
                "high": high_val,
                "low": low_val,
                "close": close_val,
                "volume": volume_val,
                "change": change,
                "change_percent": change_pct,
            },
            status=status.HTTP_200_OK,
        )


class MarketDataHistoryView(APIView):
    """
    Endpoint for chronological historical OHLCV data with technical indicators.
    GET /api/market-data/<symbol>/history/?range=1m
    """
    permission_classes = [AllowAny]

    RANGE_MAP = {
        "1D": 2,
        "5D": 5,
        "1M": 22,
        "3M": 66,
        "6M": 132,
        "1Y": 252,
        "ALL": 1000,
    }

    def get(self, request, symbol, *args, **kwargs):
        normalized_symbol = symbol.strip().upper()
        if not normalized_symbol or len(normalized_symbol) > 20 or not SYMBOL_REGEX.match(normalized_symbol):
            return Response(
                {
                    "error": {
                        "code": "INVALID_SYMBOL",
                        "message": f"Invalid stock symbol format: '{symbol}'.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        range_param = request.query_params.get("range", "1Y").upper()
        limit_param = request.query_params.get("limit")

        if limit_param:
            try:
                limit = max(1, min(int(limit_param), 1000))
            except (ValueError, TypeError):
                limit = self.RANGE_MAP.get(range_param, 252)
        else:
            limit = self.RANGE_MAP.get(range_param, 252)

        try:
            df = FeatureEngineeringService.load_market_data(normalized_symbol)
            if df.empty:
                return Response(
                    {"error": {"code": "NO_DATA", "message": f"No market data available for '{normalized_symbol}'."}},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Compute technical features
            df_features = FeatureEngineeringService.create_features(df)

            # Take the most recent `limit` rows
            df_recent = df_features.tail(limit).copy()

            items = []
            for _, row in df_recent.iterrows():
                ts = row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"])
                items.append({
                    "timestamp": ts,
                    "open": round(float(row["open"]), 2) if pd.notna(row.get("open")) else None,
                    "high": round(float(row["high"]), 2) if pd.notna(row.get("high")) else None,
                    "low": round(float(row["low"]), 2) if pd.notna(row.get("low")) else None,
                    "close": round(float(row["close"]), 2) if pd.notna(row.get("close")) else None,
                    "volume": int(row["volume"]) if pd.notna(row.get("volume")) else 0,
                    "return_1d": round(float(row["return_1d"]), 4) if pd.notna(row.get("return_1d")) else None,
                    "return_5d": round(float(row["return_5d"]), 4) if pd.notna(row.get("return_5d")) else None,
                    "sma_10": round(float(row["sma_10"]), 2) if pd.notna(row.get("sma_10")) else None,
                    "sma_20": round(float(row["sma_20"]), 2) if pd.notna(row.get("sma_20")) else None,
                    "sma_50": round(float(row["sma_50"]), 2) if pd.notna(row.get("sma_50")) else None,
                    "ema_12": round(float(row["ema_12"]), 2) if pd.notna(row.get("ema_12")) else None,
                    "ema_26": round(float(row["ema_26"]), 2) if pd.notna(row.get("ema_26")) else None,
                    "macd": round(float(row["macd"]), 2) if pd.notna(row.get("macd")) else None,
                    "macd_signal": round(float(row["macd_signal"]), 2) if pd.notna(row.get("macd_signal")) else None,
                    "rsi_14": round(float(row["rsi_14"]), 2) if pd.notna(row.get("rsi_14")) else None,
                    "volatility_20": round(float(row["volatility_20"]), 4) if pd.notna(row.get("volatility_20")) else None,
                    "volume_change": round(float(row["volume_change"]), 4) if pd.notna(row.get("volume_change")) else None,
                })

            return Response(
                {
                    "symbol": normalized_symbol,
                    "range": range_param,
                    "count": len(items),
                    "data": items,
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as exc:
            logger.warning("No market data for %s: %s", normalized_symbol, exc)
            return Response(
                {"error": {"code": "NO_DATA", "message": f"No market data available for '{normalized_symbol}'."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as exc:
            logger.error("Failed to load market data for %s: %s", normalized_symbol, exc)
            return Response(
                {"error": {"code": "DATA_ERROR", "message": f"Unable to retrieve market history for '{normalized_symbol}'."}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MarketDataIndicatorsView(APIView):
    """
    Endpoint for current technical indicators and indicator time-series.
    GET /api/market-data/<symbol>/indicators/
    """
    permission_classes = [AllowAny]

    def get(self, request, symbol, *args, **kwargs):
        normalized_symbol = symbol.strip().upper()
        if not normalized_symbol or len(normalized_symbol) > 20 or not SYMBOL_REGEX.match(normalized_symbol):
            return Response(
                {
                    "error": {
                        "code": "INVALID_SYMBOL",
                        "message": f"Invalid stock symbol format: '{symbol}'.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            df = FeatureEngineeringService.load_market_data(normalized_symbol)
            if df.empty:
                return Response(
                    {"error": {"code": "NO_DATA", "message": f"No market data available for '{normalized_symbol}'."}},
                    status=status.HTTP_404_NOT_FOUND,
                )

            df_features = FeatureEngineeringService.create_features(df)
            latest_row = df_features.iloc[-1]

            indicators = {
                "return_1d": round(float(latest_row["return_1d"]), 4) if pd.notna(latest_row.get("return_1d")) else None,
                "return_5d": round(float(latest_row["return_5d"]), 4) if pd.notna(latest_row.get("return_5d")) else None,
                "sma_10": round(float(latest_row["sma_10"]), 2) if pd.notna(latest_row.get("sma_10")) else None,
                "sma_20": round(float(latest_row["sma_20"]), 2) if pd.notna(latest_row.get("sma_20")) else None,
                "sma_50": round(float(latest_row["sma_50"]), 2) if pd.notna(latest_row.get("sma_50")) else None,
                "ema_12": round(float(latest_row["ema_12"]), 2) if pd.notna(latest_row.get("ema_12")) else None,
                "ema_26": round(float(latest_row["ema_26"]), 2) if pd.notna(latest_row.get("ema_26")) else None,
                "macd": round(float(latest_row["macd"]), 2) if pd.notna(latest_row.get("macd")) else None,
                "macd_signal": round(float(latest_row["macd_signal"]), 2) if pd.notna(latest_row.get("macd_signal")) else None,
                "rsi_14": round(float(latest_row["rsi_14"]), 2) if pd.notna(latest_row.get("rsi_14")) else None,
                "volatility_20": round(float(latest_row["volatility_20"]), 4) if pd.notna(latest_row.get("volatility_20")) else None,
                "volume_change": round(float(latest_row["volume_change"]), 4) if pd.notna(latest_row.get("volume_change")) else None,
            }

            latest_ts = latest_row["timestamp"].isoformat() if hasattr(latest_row["timestamp"], "isoformat") else str(latest_row["timestamp"])

            # Provide the last 60 rows of indicator values for charting
            history_rows = df_features.tail(60).copy()
            history = []
            for _, row in history_rows.iterrows():
                ts = row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"])
                history.append({
                    "timestamp": ts,
                    "close": round(float(row["close"]), 2) if pd.notna(row.get("close")) else None,
                    "sma_10": round(float(row["sma_10"]), 2) if pd.notna(row.get("sma_10")) else None,
                    "sma_20": round(float(row["sma_20"]), 2) if pd.notna(row.get("sma_20")) else None,
                    "sma_50": round(float(row["sma_50"]), 2) if pd.notna(row.get("sma_50")) else None,
                    "rsi_14": round(float(row["rsi_14"]), 2) if pd.notna(row.get("rsi_14")) else None,
                    "macd": round(float(row["macd"]), 2) if pd.notna(row.get("macd")) else None,
                    "macd_signal": round(float(row["macd_signal"]), 2) if pd.notna(row.get("macd_signal")) else None,
                })

            return Response(
                {
                    "symbol": normalized_symbol,
                    "timestamp": latest_ts,
                    "indicators": indicators,
                    "history": history,
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as exc:
            logger.warning("No market data for %s: %s", normalized_symbol, exc)
            return Response(
                {"error": {"code": "NO_DATA", "message": f"No market data available for '{normalized_symbol}'."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as exc:
            logger.error("Failed to compute indicators for %s: %s", normalized_symbol, exc)
            return Response(
                {"error": {"code": "DATA_ERROR", "message": f"Unable to compute indicators for '{normalized_symbol}'."}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
