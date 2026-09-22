"""
API views for stocks app.
"""

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from stocks.models import Stock
from stocks.universe import STOCK_UNIVERSE


class StockListView(APIView):
    """
    Endpoint for listing all supported stocks in the universe.
    GET /api/stocks/
    """

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        stocks_qs = Stock.objects.filter(is_active=True).order_by("symbol")
        if stocks_qs.exists():
            data = [
                {
                    "symbol": s.symbol,
                    "company_name": s.company_name,
                    "exchange": s.exchange,
                    "sector": s.sector,
                    "currency": s.currency,
                    "is_active": s.is_active,
                }
                for s in stocks_qs
            ]
        else:
            data = [
                {
                    "symbol": s["symbol"],
                    "company_name": s["company_name"],
                    "exchange": s["exchange"],
                    "sector": s["sector"],
                    "currency": s["currency"],
                    "is_active": s.get("is_active", True),
                }
                for s in STOCK_UNIVERSE
                if s.get("is_active", True)
            ]
        return Response(data, status=status.HTTP_200_OK)


class StockDetailView(APIView):
    """
    Endpoint for retrieving metadata for a specific stock.
    GET /api/stocks/<symbol>/
    """

    permission_classes = [AllowAny]

    def get(self, request, symbol, *args, **kwargs):
        norm = symbol.strip().upper()
        stock = Stock.objects.filter(symbol=norm).first()
        if stock:
            return Response(
                {
                    "symbol": stock.symbol,
                    "company_name": stock.company_name,
                    "exchange": stock.exchange,
                    "sector": stock.sector,
                    "currency": stock.currency,
                    "is_active": stock.is_active,
                },
                status=status.HTTP_200_OK,
            )

        for s in STOCK_UNIVERSE:
            if s["symbol"].upper() == norm:
                return Response(
                    {
                        "symbol": s["symbol"],
                        "company_name": s["company_name"],
                        "exchange": s["exchange"],
                        "sector": s["sector"],
                        "currency": s["currency"],
                        "is_active": s.get("is_active", True),
                    },
                    status=status.HTTP_200_OK,
                )

        return Response(
            {"error": {"code": "SYMBOL_NOT_FOUND", "message": f"Stock '{symbol}' not found in universe."}},
            status=status.HTTP_404_NOT_FOUND,
        )
