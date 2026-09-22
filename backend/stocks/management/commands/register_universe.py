"""
Management command to register the initial 4-stock universe in the database.
"""

from django.core.management.base import BaseCommand
from stocks.models import Stock


class Command(BaseCommand):
    help = "Register initial 4-stock universe (TCS.NS, RELIANCE.NS, INFY.NS, HDFCBANK.NS)"

    UNIVERSE = [
        {
            "symbol": "TCS.NS",
            "company_name": "Tata Consultancy Services",
            "exchange": "NSE",
            "sector": "Information Technology",
            "currency": "INR",
        },
        {
            "symbol": "RELIANCE.NS",
            "company_name": "Reliance Industries",
            "exchange": "NSE",
            "sector": "Conglomerate",
            "currency": "INR",
        },
        {
            "symbol": "INFY.NS",
            "company_name": "Infosys Limited",
            "exchange": "NSE",
            "sector": "Information Technology",
            "currency": "INR",
        },
        {
            "symbol": "HDFCBANK.NS",
            "company_name": "HDFC Bank",
            "exchange": "NSE",
            "sector": "Financial Services",
            "currency": "INR",
        },
    ]

    def handle(self, *args, **options):
        self.stdout.write("Registering stock universe in database...")
        for item in self.UNIVERSE:
            stock, created = Stock.objects.get_or_create(
                symbol=item["symbol"],
                defaults={
                    "company_name": item["company_name"],
                    "exchange": item["exchange"],
                    "sector": item["sector"],
                    "currency": item["currency"],
                    "is_active": True,
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"  [CREATED] {stock.symbol} - {stock.company_name}"))
            else:
                # Update details if exists to ensure sector and name match
                stock.company_name = item["company_name"]
                stock.sector = item["sector"]
                stock.exchange = item["exchange"]
                stock.currency = item["currency"]
                stock.is_active = True
                stock.save(update_fields=["company_name", "sector", "exchange", "currency", "is_active"])
                self.stdout.write(f"  [EXISTS]  {stock.symbol} - {stock.company_name}")

        self.stdout.write(self.style.SUCCESS("\nStock universe registration completed successfully."))

