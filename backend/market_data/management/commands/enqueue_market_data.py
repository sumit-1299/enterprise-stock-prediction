"""
Management command to enqueue market data ingestion tasks into Celery background queue.
"""

from django.core.management.base import BaseCommand
from market_data.tasks import ingest_market_data_task, poll_market_data_task


class Command(BaseCommand):
    help = "Asynchronously enqueue market data ingestion task into Celery worker queue"

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
            help="Enqueue near-real-time polling task for latest quote instead of historical data",
        )

    def handle(self, *args, **options):
        symbol = options["symbol"].upper()
        period = options["period"]
        interval = options["interval"]
        is_latest = options.get("latest", False)

        if is_latest:
            self.stdout.write(f"Enqueueing near-real-time polling task for {symbol}...")
            async_result = poll_market_data_task.delay(symbol=symbol, interval=interval)
            task_type = "poll_market_data_task"
        else:
            self.stdout.write(f"Enqueueing historical data ingestion task for {symbol} (period={period}, interval={interval})...")
            async_result = ingest_market_data_task.delay(symbol=symbol, period=period, interval=interval)
            task_type = "ingest_market_data_task"

        self.stdout.write(self.style.SUCCESS(f"Task successfully enqueued to Celery queue!"))
        self.stdout.write(f"  Task Type: {task_type}")
        self.stdout.write(f"  Task ID:   {async_result.id}")
        self.stdout.write(f"  Symbol:    {symbol}")
        self.stdout.write(f"  Status:    {async_result.status}")

