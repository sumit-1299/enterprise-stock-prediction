"""
Base LLM Provider Interface.
"""
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List


class BaseLLMProvider(ABC):
    """
    Abstract base class for all AI LLM providers.
    """

    @abstractmethod
    def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        tool_schemas: List[Dict[str, Any]],
        tool_executor: Callable[[str, Dict[str, Any]], Dict[str, Any]],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Execute completion with tool-calling capabilities.

        Returns:
            Dict with keys:
                - response: str (assistant answer)
                - tools_used: List[str] (names of tools invoked)
                - citations: List[str] (data sources)
                - suggested_questions: List[str] (relevant follow-ups)
        """
        pass

