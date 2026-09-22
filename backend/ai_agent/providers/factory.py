"""
Provider factory for AI Market Intelligence Agent.
"""
import logging
from django.conf import settings
from ai_agent.providers.base import BaseLLMProvider
from ai_agent.providers.deterministic_provider import DeterministicProvider
from ai_agent.providers.openai_provider import OpenAIProvider

logger = logging.getLogger(__name__)


def get_ai_provider() -> BaseLLMProvider:
    """
    Return the configured AI provider, falling back to DeterministicProvider if no API key is set.
    """
    provider_name = getattr(settings, "AI_PROVIDER", "deterministic").lower()
    api_key = getattr(settings, "AI_PROVIDER_API_KEY", "").strip()
    model_name = getattr(settings, "AI_MODEL_NAME", "gpt-4o-mini")

    if provider_name == "openai" and api_key:
        logger.info("Using OpenAIProvider with model '%s'", model_name)
        return OpenAIProvider(api_key=api_key, model_name=model_name)

    logger.info("Using DeterministicProvider for AI Agent (offline/demo mode).")
    return DeterministicProvider()

