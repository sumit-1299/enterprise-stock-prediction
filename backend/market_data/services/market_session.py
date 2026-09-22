"""
Market session utility for checking exchange operating status.
"""

from datetime import datetime, time
from typing import Any, Dict, Optional
import zoneinfo
from django.utils import timezone

# Timezone for National Stock Exchange of India (NSE)
IST_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")

# Regular trading hours for NSE: 09:15 to 15:30 IST
NSE_MARKET_OPEN = time(9, 15)
NSE_MARKET_CLOSE = time(15, 30)


class MarketSession:
    """
    Lightweight market session awareness utility.
    """

    @staticmethod
    def is_market_open(exchange: str = "NSE", dt: Optional[datetime] = None) -> bool:
        """
        Check whether the exchange is currently in active regular trading session.
        """
        if dt is None:
            dt = timezone.now()

        # Convert to local exchange timezone
        local_dt = dt.astimezone(IST_TZ)

        # Check if weekend (Monday=0, Sunday=6)
        if local_dt.weekday() >= 5:
            return False

        # Check trading hours
        current_time = local_dt.time()
        return NSE_MARKET_OPEN <= current_time <= NSE_MARKET_CLOSE

    @staticmethod
    def get_session_info(exchange: str = "NSE", dt: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Get structured session details for an exchange.
        """
        if dt is None:
            dt = timezone.now()

        local_dt = dt.astimezone(IST_TZ)
        is_weekend = local_dt.weekday() >= 5
        current_time = local_dt.time()
        is_open = not is_weekend and (NSE_MARKET_OPEN <= current_time <= NSE_MARKET_CLOSE)

        status = "OPEN" if is_open else ("WEEKEND" if is_weekend else "CLOSED")

        return {
            "exchange": exchange,
            "is_open": is_open,
            "session_status": status,
            "local_time": local_dt.strftime("%Y-%m-%d %H:%M:%S %Z"),
            "market_hours": f"{NSE_MARKET_OPEN.strftime('%H:%M')} - {NSE_MARKET_CLOSE.strftime('%H:%M')} IST (Mon-Fri)",
        }

