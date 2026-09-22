"""
Central stock universe configuration for the Enterprise Stock Intelligence Platform.

Single source of truth for all supported NSE equities, metadata, and sectors.
"""

from typing import Any, Dict, List, Optional

STOCK_UNIVERSE: List[Dict[str, Any]] = [
    {
        "symbol": "TCS.NS",
        "company_name": "Tata Consultancy Services Ltd.",
        "exchange": "NSE",
        "sector": "Information Technology",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "INFY.NS",
        "company_name": "Infosys Ltd.",
        "exchange": "NSE",
        "sector": "Information Technology",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "RELIANCE.NS",
        "company_name": "Reliance Industries Ltd.",
        "exchange": "NSE",
        "sector": "Energy & Conglomerate",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "HDFCBANK.NS",
        "company_name": "HDFC Bank Ltd.",
        "exchange": "NSE",
        "sector": "Financial Services",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "ICICIBANK.NS",
        "company_name": "ICICI Bank Ltd.",
        "exchange": "NSE",
        "sector": "Financial Services",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "SBIN.NS",
        "company_name": "State Bank of India",
        "exchange": "NSE",
        "sector": "Financial Services",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "LT.NS",
        "company_name": "Larsen & Toubro Ltd.",
        "exchange": "NSE",
        "sector": "Industrial",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "ITC.NS",
        "company_name": "ITC Ltd.",
        "exchange": "NSE",
        "sector": "FMCG",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "BHARTIARTL.NS",
        "company_name": "Bharti Airtel Ltd.",
        "exchange": "NSE",
        "sector": "Technology / Telecom",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "AXISBANK.NS",
        "company_name": "Axis Bank Ltd.",
        "exchange": "NSE",
        "sector": "Financial Services",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "KOTAKBANK.NS",
        "company_name": "Kotak Mahindra Bank Ltd.",
        "exchange": "NSE",
        "sector": "Financial Services",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "HINDUNILVR.NS",
        "company_name": "Hindustan Unilever Ltd.",
        "exchange": "NSE",
        "sector": "FMCG",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "MARUTI.NS",
        "company_name": "Maruti Suzuki India Ltd.",
        "exchange": "NSE",
        "sector": "Automobile",
        "currency": "INR",
        "is_active": True,
    },
    {
        "symbol": "SUNPHARMA.NS",
        "company_name": "Sun Pharmaceutical Industries Ltd.",
        "exchange": "NSE",
        "sector": "Pharmaceutical",
        "currency": "INR",
        "is_active": True,
    },
]


def get_supported_symbols() -> List[str]:
    """Return list of all active stock symbols."""
    return [stock["symbol"] for stock in STOCK_UNIVERSE if stock.get("is_active", True)]


def get_stock_metadata(symbol: str) -> Optional[Dict[str, Any]]:
    """Return metadata for a specific stock symbol."""
    norm = symbol.strip().upper()
    for stock in STOCK_UNIVERSE:
        if stock["symbol"].upper() == norm:
            return stock
    return None

