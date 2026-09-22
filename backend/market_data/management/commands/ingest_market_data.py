"""
Management command to fetch and ingest market data for a stock.
"""

from django.core.management.base import BaseCommand
from market_data.services.market_data_service import MarketDataService


class Command(BaseCommand):
    help = "Fetch and ingest market data for a stock from the configured provider"

    def add_arguments(self, parser):
        parser.add_argument(
            "symbol",
            type=str,
            help="Stock symbol (e.g. TCS.NS)",
        )
        parser.add_argument(
            "--period",
            type=str,
            default="1y",
            help="Historical period (e.g. 5d, 1mo, 1y)",
        )
        parser.add_argument(
            "--interval",
            type=str,
            default="1d",
            help="Data interval (e.g. 1d, 1h, 5m)",
        )
        parser.add_argument(
            "--latest",
            action="store_true",
            help="Execute a single near-real-time polling cycle for the latest quote",
        )

    def handle(self, *args, **options):
        symbol = options["symbol"].upper()
        period = options["period"]
        interval = options["interval"]
        is_latest = options.get("latest", False)

        if is_latest:
            self.stdout.write(f"Executing near-real-time polling cycle for {symbol}...")
            try:
                result = MarketDataService.run_ingestion_cycle(
                    symbol=symbol,
                    interval=interval,
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully polled {symbol}"))
                self.stdout.write(f"  Provider:       {result['provider']} (Production Feed: {result['is_production_feed']})")
                self.stdout.write(f"  Action:         {result['action'].upper()}")
                self.stdout.write(f"  Timestamp:      {result['timestamp']}")
                self.stdout.write(f"  Close Price:    {result['close_price']}")
                self.stdout.write(f"  Volume:         {result['volume']}")
                self.stdout.write(f"  Market Session: {result['market_session']['session_status']} ({result['market_session']['market_hours']})")
                self.stdout.write(f"  Duration:       {result['duration_ms']} ms")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Polling error for {symbol}: {e}"))
        else:
            self.stdout.write(f"Fetching historical data for {symbol} (period={period}, interval={interval})...")
            try:
                result = MarketDataService.fetch_historical_data(
                    symbol=symbol,
                    period=period,
                    interval=interval,
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully processed {symbol}"))
                self.stdout.write(f"  Provider:            {result['provider']} (Production Feed: {result['is_production_feed']})")
                self.stdout.write(f"  Records Fetched:     {result['records_fetched']}")
                self.stdout.write(f"  Records Created:     {result['records_created']}")
                self.stdout.write(f"  Records Updated:     {result['records_updated']}")
                self.stdout.write(f"  Validation Failures: {result['validation_failures']}")
                self.stdout.write(f"  Duration:            {result['duration_ms']} ms")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Ingestion error for {symbol}: {e}"))