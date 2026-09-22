"""
Factory for instantiating configured market data providers.
"""

from typing import Optional
from django.conf import settings

from market_data.providers.base import MarketDataProvider
from market_data.providers.yfinance_provider import YFinanceProvider

_PROVIDERS = {
    "yfinance": YFinanceProvider,
}


def get_market_data_provider(provider_name: Optional[str] = None) -> MarketDataProvider:
    """
    Factory function to retrieve the active market data provider instance.

    Args:
        provider_name: Name of provider. If None, loaded from settings.MARKET_DATA_PROVIDER.

    Returns:
        Configured MarketDataProvider instance.
    """
    if not provider_name:
        provider_name = getattr(settings, "MARKET_DATA_PROVIDER", "yfinance")

    provider_class = _PROVIDERS.get(provider_name.lower())
    if not provider_class:
        raise ValueError(
            f"Unsupported market data provider '{provider_name}'. "
            f"Available providers: {list(_PROVIDERS.keys())}"
        )

    return provider_class()

