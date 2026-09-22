from django.db.models import Count

from market_data.models import MarketPrice


class MarketDataQuality:

    @staticmethod
    def generate_report(symbol):

        queryset = MarketPrice.objects.filter(
            stock__symbol=symbol
        )

        total_records = queryset.count()

        null_records = queryset.filter(
            open_price__isnull=True
        ).count()

        duplicate_groups = (
            queryset
            .values(
                "stock",
                "timestamp",
                "timeframe",
                "source",
            )
            .annotate(count=Count("id"))
            .filter(count__gt=1)
        )

        invalid_ohlc = 0

        for record in queryset.iterator():

            if (
                record.high_price < record.low_price
                or record.high_price < record.open_price
                or record.high_price < record.close_price
                or record.low_price > record.open_price
                or record.low_price > record.close_price
            ):
                invalid_ohlc += 1

        return {
            "symbol": symbol,
            "total_records": total_records,
            "null_records": null_records,
            "invalid_ohlc": invalid_ohlc,
            "duplicate_groups": duplicate_groups.count(),
        }