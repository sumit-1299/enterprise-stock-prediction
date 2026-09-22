"""
Management command to list registered machine learning models and versions.
"""

from django.core.management.base import BaseCommand
from ml.models.model_registry import ModelRegistry


class Command(BaseCommand):
    help = "List registered ML models, versions, lifecycle statuses, and evaluation metrics."

    def add_arguments(self, parser):
        parser.add_argument(
            "--symbol",
            type=str,
            help="Filter models by stock ticker symbol (e.g. TCS.NS)",
        )
        parser.add_argument(
            "--model-type",
            type=str,
            default=None,
            help="Filter models by model type (e.g. xgboost_classifier)",
        )

    def handle(self, *args, **options):
        symbol = options.get("symbol")
        model_type = options.get("model_type")

        models = ModelRegistry.list_models(symbol=symbol, model_type=model_type)

        if not models:
            self.stdout.write(self.style.WARNING("No models found matching criteria."))
            return

        self.stdout.write(self.style.SUCCESS(f"\nFound {len(models)} registered model version(s):\n"))

        header = f"{'SYMBOL':<10} {'MODEL TYPE':<20} {'VERSION':<8} {'STATUS':<12} {'SCHEMA':<8} {'ACCURACY':<10} {'F1':<10} {'ROC-AUC':<10} {'PROMOTED AT':<25}"
        self.stdout.write(self.style.MIGRATE_HEADING(header))
        self.stdout.write("-" * len(header))

        for m in models:
            metrics = m.get("metrics") or {}
            acc = f"{metrics.get('accuracy', 0.0):.4f}" if metrics.get("accuracy") is not None else "N/A"
            f1 = f"{metrics.get('f1', 0.0):.4f}" if metrics.get("f1") is not None else "N/A"
            roc = f"{metrics.get('roc_auc', 0.0):.4f}" if metrics.get("roc_auc") is not None else "N/A"
            promoted_at = str(m.get("promoted_at") or "-")[:24]

            status = m.get("status", "unknown")
            if status == "production":
                status_str = self.style.SUCCESS(f"{status:<12}")
            elif status == "staging":
                status_str = self.style.WARNING(f"{status:<12}")
            elif status == "retired":
                status_str = self.style.NOTICE(f"{status:<12}")
            else:
                status_str = f"{status:<12}"

            line = f"{m['symbol']:<10} {m['model_type']:<20} {m['version']:<8} {status_str} {m.get('feature_schema_version', 'v1'):<8} {acc:<10} {f1:<10} {roc:<10} {promoted_at:<25}"
            self.stdout.write(line)

        self.stdout.write("")

