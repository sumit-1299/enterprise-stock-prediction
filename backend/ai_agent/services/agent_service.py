"""
Core Agent Service coordinating context, tools, and provider execution.
"""
import logging
import time
from typing import Any, Dict, List
from ai_agent.providers.deterministic_provider import DeterministicProvider
from ai_agent.providers.factory import get_ai_provider
from ai_agent.services.context_service import ContextService
from ai_agent.services.prompt_service import PromptService
from ai_agent.services.tool_registry import ToolRegistry

logger = logging.getLogger(__name__)


class AgentService:
    """
    Main orchestrator for user queries, context retrieval, tool execution, and provider calls.
    """

    @classmethod
    def process_message(
        cls,
        message: str,
        symbol: str = "TCS.NS",
        page: str = "dashboard",
        conversation_history: List[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        start_time = time.time()
        conversation_history = conversation_history or []

        # 1. Build session context
        context = ContextService.build_context(symbol=symbol, page=page)

        # 2. Build system prompt
        system_prompt = PromptService.get_system_prompt(context=context)

        # 3. Prepare message list (limit history to last 10 messages)
        recent_history = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history
        all_messages = list(recent_history)
        all_messages.append({"sender": "user", "text": message})

        # 4. Prepare tool schemas and executor
        tool_schemas = ToolRegistry.get_tool_schemas()

        def tool_executor(name: str, **kwargs) -> Dict[str, Any]:
            return ToolRegistry.execute_tool(name, **kwargs)

        # 5. Call provider with automatic fallback
        provider = get_ai_provider()
        try:
            result = provider.generate_response(
                system_prompt=system_prompt,
                messages=all_messages,
                tool_schemas=tool_schemas,
                tool_executor=tool_executor,
                context=context,
            )
        except Exception as exc:
            logger.warning("Primary AI provider failed: %s. Falling back to DeterministicProvider.", exc)
            fallback = DeterministicProvider()
            result = fallback.generate_response(
                system_prompt=system_prompt,
                messages=all_messages,
                tool_schemas=tool_schemas,
                tool_executor=tool_executor,
                context=context,
            )

        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "response": result.get("response", ""),
            "symbol": context.get("active_symbol", symbol),
            "tools_used": result.get("tools_used", []),
            "citations": result.get("citations", []),
            "suggested_questions": result.get("suggested_questions", []),
            "execution_time_ms": duration_ms,
        }

