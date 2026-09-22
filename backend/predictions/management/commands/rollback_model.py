"""
Management command to safely roll back production to a prior model version.
"""

from django.core.management.base import BaseCommand, CommandError
from ml.models.model_registry import ModelRegistry


class Command(BaseCommand):
    help = "Safely roll back the active production model to a previous version."

    def add_arguments(self, parser):
        parser.add_argument("symbol", type=str, help="Stock ticker symbol (e.g. TCS.NS)")
        parser.add_argument("model_type", type=str, help="Model type (e.g. xgboost_classifier)")
        parser.add_argument("target_version", type=str, help="Model version tag to restore as production (e.g. v1)")

    def handle(self, *args, **options):
        symbol = options["symbol"].strip().upper()
        model_type = options["model_type"].strip()
        target_version = options["target_version"].strip()

        self.stdout.write(
            f"Initiating rollback for {symbol} ({model_type}) to version '{target_version}'..."
        )

        try:
            result = ModelRegistry.rollback_model(
                symbol=symbol,
                model_type=model_type,
                target_version=target_version,
            )
            self.stdout.write(self.style.SUCCESS(f"\nSUCCESS: {result['message']}"))
            if "previous_production_version" in result:
                self.stdout.write(f"Retired version:  {result['previous_production_version']}")
            self.stdout.write(f"Active version:   {result.get('active_production_version', target_version)}")
        except (ValueError, FileNotFoundError) as e:
            raise CommandError(f"Rollback failed: {e}")
        except Exception as e:
            raise CommandError(f"Unexpected error during rollback: {e}")

