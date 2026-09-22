import pandas as pd
import numpy as np

from market_data.models import MarketPrice


class FeatureEngineeringService:

    @staticmethod
    def load_market_data(symbol):

        queryset = (
            MarketPrice.objects
            .filter(stock__symbol=symbol)
            .order_by("timestamp")
            .values(
                "timestamp",
                "open_price",
                "high_price",
                "low_price",
                "close_price",
                "volume",
            )
        )

        data = list(queryset)

        if not data:
            raise ValueError(
                f"No market data found for {symbol}"
            )

        df = pd.DataFrame(data)

        df.rename(
            columns={
                "timestamp": "timestamp",
                "open_price": "open",
                "high_price": "high",
                "low_price": "low",
                "close_price": "close",
                "volume": "volume",
            },
            inplace=True,
        )

        df["timestamp"] = pd.to_datetime(
            df["timestamp"],
            utc=True,
        )

        numeric_columns = [
            "open",
            "high",
            "low",
            "close",
            "volume",
        ]

        for column in numeric_columns:
            df[column] = pd.to_numeric(
                df[column],
                errors="coerce",
            )

        return df

    @staticmethod
    def create_features(df):

        # -------------------------
        # Returns
        # -------------------------

        df["return_1d"] = (
            df["close"].pct_change(1)
        )

        df["return_5d"] = (
            df["close"].pct_change(5)
        )

        # -------------------------
        # Moving averages
        # -------------------------

        df["sma_10"] = (
            df["close"]
            .rolling(window=10)
            .mean()
        )

        df["sma_20"] = (
            df["close"]
            .rolling(window=20)
            .mean()
        )

        df["sma_50"] = (
            df["close"]
            .rolling(window=50)
            .mean()
        )

        # -------------------------
        # Exponential moving averages
        # -------------------------

        df["ema_12"] = (
            df["close"]
            .ewm(
                span=12,
                adjust=False
            )
            .mean()
        )

        df["ema_26"] = (
            df["close"]
            .ewm(
                span=26,
                adjust=False
            )
            .mean()
        )

        # -------------------------
        # MACD
        # -------------------------

        df["macd"] = (
            df["ema_12"] -
            df["ema_26"]
        )

        df["macd_signal"] = (
            df["macd"]
            .ewm(
                span=9,
                adjust=False
            )
            .mean()
        )

        # -------------------------
        # RSI
        # -------------------------

        delta = df["close"].diff()

        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)

        avg_gain = (
            gain
            .rolling(window=14)
            .mean()
        )

        avg_loss = (
            loss
            .rolling(window=14)
            .mean()
        )

        rs = avg_gain / avg_loss.replace(
            0,
            np.nan,
        )

        df["rsi_14"] = (
            100 -
            (100 / (1 + rs))
        )

        # -------------------------
        # Volatility
        # -------------------------

        df["volatility_20"] = (
            df["return_1d"]
            .rolling(window=20)
            .std()
        )

        # -------------------------
        # Volume change
        # -------------------------

        df["volume_change"] = (
            df["volume"]
            .replace(0, np.nan)
            .pct_change()
        )
        # -------------------------
        # Target
        # -------------------------

        df["target_return"] = (
            df["close"]
            .shift(-1)
            .div(df["close"])
            .sub(1)
        )

        df["target_direction"] = (
            df["target_return"] > 0
        ).astype(int)

        # Remove infinite values
        df = df.replace(
            [np.inf, -np.inf],
            np.nan,
        )

        return df

    @staticmethod
    def build_dataset(symbol):

        df = FeatureEngineeringService.load_market_data(
            symbol
        )

        df = FeatureEngineeringService.create_features(
            df
        )

        # Remove rows created by rolling windows
        # and the final row where target is unavailable.

        df = df.dropna().reset_index(drop=True)

        return df