"""
AI Agent Django Application Configuration.
"""
from django.apps import AppConfig


class AiAgentConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ai_agent"
    verbose_name = "AI Market Intelligence Agent"

