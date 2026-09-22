from django.db import models

# Create your models here.
from django.db import models


class Stock(models.Model):
    symbol = models.CharField(max_length=20, unique=True)
    company_name = models.CharField(max_length=150)
    exchange = models.CharField(max_length=20)
    sector = models.CharField(max_length=100, blank=True)
    currency = models.CharField(max_length=10, default="INR")
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "stocks"
        ordering = ["symbol"]
        indexes = [
            models.Index(fields=["symbol"]),
            models.Index(fields=["exchange"]),
            models.Index(fields=["sector"]),
        ]

    def __str__(self):
        return f"{self.symbol} - {self.company_name}"