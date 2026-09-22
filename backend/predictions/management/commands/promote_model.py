"""
Management command to promote a model version to staging or production.
"""

from django.core.management.base import BaseCommand, CommandError
from ml.models.model_registry import ModelRegistry


class Command(BaseCommand):
    help = "Promote a candidate or staging model version to production or staging."

    def add_arguments(self, parser):
        parser.add_argument("symbol", type=str, help="Stock ticker symbol (e.g. TCS.NS)")
        parser.add_argument("model_type", type=str, help="Model type (e.g. xgboost_classifier)")
        parser.add_argument("version", type=str, help="Model version tag to promote (e.g. v2)")
        parser.add_argument(
            "--status",
            type=str,
            default="production",
            choices=["staging", "production"],
            help="Target lifecycle status (default: production)",
        )

    def handle(self, *args, **options):
        symbol = options["symbol"].strip().upper()
        model_type = options["model_type"].strip()
        version = options["version"].strip()
        target_status = options["status"].strip().lower()

        self.stdout.write(
            f"Validating and promoting {symbol} ({model_type}) version '{version}' to '{target_status}'..."
        )

        try:
            result = ModelRegistry.promote_model(
                symbol=symbol,
                model_type=model_type,
                version=version,
                target_status=target_status,
            )
            self.stdout.write(self.style.SUCCESS(f"\nSUCCESS: {result['message']}"))
            self.stdout.write(f"Active status: {result['status']}")
            if result.get("promoted_at"):
                self.stdout.write(f"Promoted at:  {result['promoted_at']}")
        except (ValueError, FileNotFoundError) as e:
            raise CommandError(f"Promotion failed: {e}")
        except Exception as e:
            raise CommandError(f"Unexpected error during promotion: {e}")

