from django.db import models

# Create your models here.
from django.db import models


from django.db import models
from stocks.models import Stock


class MarketPrice(models.Model):
    TIMEFRAME_CHOICES = [
        ("1m", "1 Minute"),
        ("5m", "5 Minutes"),
        ("15m", "15 Minutes"),
        ("30m", "30 Minutes"),
        ("1h", "1 Hour"),
        ("1d", "1 Day"),
    ]

    stock = models.ForeignKey(
        Stock,
        on_delete=models.CASCADE,
        related_name="market_prices",
    )

    timestamp = models.DateTimeField()

    timeframe = models.CharField(
        max_length=10,
        choices=TIMEFRAME_CHOICES,
        default="1d",
    )

    open_price = models.DecimalField(
        max_digits=15,
        decimal_places=4,
    )

    high_price = models.DecimalField(
        max_digits=15,
        decimal_places=4,
    )

    low_price = models.DecimalField(
        max_digits=15,
        decimal_places=4,
    )

    close_price = models.DecimalField(
        max_digits=15,
        decimal_places=4,
    )

    volume = models.BigIntegerField(default=0)

    source = models.CharField(
        max_length=50,
        default="unknown",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "market_prices"

        constraints = [
            models.UniqueConstraint(
                fields=["stock", "timestamp", "timeframe", "source"],
                name="unique_market_price",
            )
        ]

        indexes = [
            models.Index(
                fields=["stock", "timestamp"],
            ),
            models.Index(
                fields=["timestamp"],
            ),
            models.Index(
                fields=["stock", "timeframe", "timestamp"],
            ),
        ]

    def __str__(self):
        return f"{self.stock.symbol} - {self.timestamp}"