"""
Management command to train and register an XGBoost model for a stock.
"""

from django.core.management.base import BaseCommand, CommandError
from ml.models.model_registry import ModelRegistry
from ml.training.train_xgboost_classifier import _determine_next_version, train_xgboost_classifier
from stocks.universe import get_supported_symbols


class Command(BaseCommand):
    help = "Train and register an XGBoost direction prediction model for a stock"

    def add_arguments(self, parser):
        parser.add_argument(
            "--symbol",
            type=str,
            required=True,
            help="Stock ticker symbol (e.g. ICICIBANK.NS or TCS.NS)",
        )
        parser.add_argument(
            "--version",
            type=str,
            default=None,
            help="Explicit version tag (default: next candidate version, e.g. v1)",
        )
        parser.add_argument(
            "--promote",
            action="store_true",
            help="Automatically promote the trained model to production status",
        )

    def handle(self, *args, **options):
        symbol = options["symbol"].strip().upper()
        supported = get_supported_symbols()

        if symbol not in supported:
            self.stdout.write(
                self.style.WARNING(
                    f"Warning: Symbol '{symbol}' is not in the default supported universe: {supported}"
                )
            )

        version = options["version"] or _determine_next_version(symbol, "xgboost_classifier")

        self.stdout.write(f"Starting training for {symbol} (version={version})...")

        try:
            res = train_xgboost_classifier(
                symbol=symbol,
                version=version,
                status="candidate",
            )
        except Exception as exc:
            raise CommandError(f"Training failed for {symbol}: {exc}")

        self.stdout.write(self.style.SUCCESS(f"\nModel trained successfully for {symbol}!"))
        self.stdout.write(f"  Symbol:         {res['symbol']}")
        self.stdout.write(f"  Version:        {res['version']}")
        self.stdout.write(f"  Model Path:     {res['model_path']}")
        self.stdout.write(f"  Metadata Path:  {res['metadata_path']}")
        self.stdout.write(f"  Test Accuracy:  {res['test_metrics'].get('accuracy', 0):.4f}")
        self.stdout.write(f"  Test Precision: {res['test_metrics'].get('precision', 0):.4f}")
        self.stdout.write(f"  Test Recall:    {res['test_metrics'].get('recall', 0):.4f}")
        self.stdout.write(f"  Test F1 Score:  {res['test_metrics'].get('f1', 0):.4f}")
        self.stdout.write(f"  Test ROC-AUC:   {res['test_metrics'].get('roc_auc', 0):.4f}")

        if options["promote"]:
            self.stdout.write(f"\nPromoting {symbol} version '{version}' to production...")
            prom_res = ModelRegistry.promote_model(
                symbol=symbol,
                model_type="xgboost_classifier",
                version=version,
                target_status="production",
            )
            self.stdout.write(self.style.SUCCESS(f"SUCCESS: {prom_res['message']}"))
