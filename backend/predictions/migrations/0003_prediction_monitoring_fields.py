# Generated for Phase 15 Model Monitoring & Prediction History

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('predictions', '0002_modelversion_modelevaluation'),
    ]

    operations = [
        migrations.AddField(
            model_name='prediction',
            name='feature_snapshot',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Snapshot of the 12 feature values at prediction time',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='prediction',
            name='actual_direction',
            field=models.CharField(
                blank=True,
                help_text='Realized market direction: UP or DOWN',
                max_length=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='prediction',
            name='actual_return',
            field=models.FloatField(
                blank=True,
                help_text='Realized next-day percentage return',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='prediction',
            name='outcome',
            field=models.CharField(
                db_index=True,
                default='PENDING',
                help_text='Outcome status: CORRECT, INCORRECT, PENDING',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='prediction',
            name='resolved_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Timestamp when the prediction outcome was resolved',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='prediction',
            name='latency_ms',
            field=models.FloatField(
                blank=True,
                help_text='Inference latency in milliseconds',
                null=True,
            ),
        ),
        migrations.AddIndex(
            model_name='prediction',
            index=models.Index(fields=['symbol', 'outcome'], name='pred_sym_outcome_idx'),
        ),
        migrations.AddIndex(
            model_name='prediction',
            index=models.Index(fields=['model_version', 'outcome'], name='pred_ver_outcome_idx'),
        ),
    ]

