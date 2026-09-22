from django.core.management.base import BaseCommand

from market_data.services.data_quality import MarketDataQuality


class Command(BaseCommand):

    help = "Check market data quality"

    def add_arguments(self, parser):

        parser.add_argument(
            "symbol",
            type=str,
        )

    def handle(self, *args, **options):

        symbol = options["symbol"].upper()

        report = MarketDataQuality.generate_report(
            symbol
        )

        self.stdout.write("\nMarket Data Quality Report")
        self.stdout.write("=" * 35)

        for key, value in report.items():

            if key != "symbol":

                self.stdout.write(
                    f"{key}: {value}"
                )