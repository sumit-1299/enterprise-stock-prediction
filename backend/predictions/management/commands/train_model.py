"""
Management command to train and register a new candidate model version.
"""

from django.core.management.base import BaseCommand, CommandError
from ml.training.train_xgboost_classifier import train_xgboost_classifier


class Command(BaseCommand):
    help = "Train and register a candidate machine learning model version (does not replace production)."

    def add_arguments(self, parser):
        parser.add_argument("symbol", type=str, help="Stock ticker symbol to train model for (e.g. TCS.NS)")
        parser.add_argument(
            "--model-type",
            type=str,
            default="xgboost_classifier",
            help="Model architecture (default: xgboost_classifier)",
        )
        parser.add_argument(
            "--model-version",
            type=str,
            default=None,
            help="Explicit version tag (default: auto-increment, e.g. v2)",
        )

    def handle(self, *args, **options):
        symbol = options["symbol"].strip().upper()
        model_type = options["model_type"].strip()
        version = options["model_version"].strip() if options.get("model_version") else None

        if model_type != "xgboost_classifier":
            raise CommandError(f"Unsupported model type '{model_type}'. Supported: 'xgboost_classifier'.")

        self.stdout.write(
            f"Starting offline training for {symbol} ({model_type})...\n"
        )

        try:
            result = train_xgboost_classifier(
                symbol=symbol,
                version=version,
                status="candidate",
            )

            test_m = result["test_metrics"]
            val_m = result["validation_metrics"]
            base_m = result["majority_metrics"]

            self.stdout.write(self.style.SUCCESS(f"\nTraining successfully completed for {symbol}!"))
            self.stdout.write(f"Model Version: {result['version']}")
            self.stdout.write(f"Status:        {self.style.WARNING(result['status'])} (NOT in production)")
            self.stdout.write(f"Artifact:      {result['model_path']}")
            self.stdout.write(f"Metadata:      {result['metadata_path']}")

            self.stdout.write("\nEvaluation Metrics Comparison:")
            self.stdout.write(f"{'METRIC':<18} {'VALIDATION':<12} {'TEST':<12} {'MAJORITY BASELINE':<18}")
            self.stdout.write("-" * 60)
            for k in ["accuracy", "precision", "recall", "f1", "roc_auc"]:
                v_val = f"{val_m.get(k, 0.0):.4f}" if val_m.get(k) is not None else "N/A"
                t_val = f"{test_m.get(k, 0.0):.4f}" if test_m.get(k) is not None else "N/A"
                b_val = f"{base_m.get(k, 0.0):.4f}" if base_m.get(k) is not None else "N/A"
                self.stdout.write(f"{k:<18} {v_val:<12} {t_val:<12} {b_val:<18}")

            self.stdout.write(self.style.NOTICE(
                f"\nNOTE: To promote this model to production, run:\n"
                f"python backend/manage.py promote_model {symbol} {model_type} {result['version']}\n"
            ))

        except Exception as e:
            raise CommandError(f"Training failed for {symbol}: {e}")
