"""
OpenAI LLM Provider with tool-calling support.
"""
import json
import logging
from typing import Any, Callable, Dict, List
import requests
from django.conf import settings
from ai_agent.providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI Chat Completions implementation with function-calling support.
    """

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model_name = model_name or "gpt-4o-mini"
        self.endpoint = "https://api.openai.com/v1/chat/completions"

    def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        tool_schemas: List[Dict[str, Any]],
        tool_executor: Callable[[str, Dict[str, Any]], Dict[str, Any]],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        tools_used: List[str] = []
        citations: List[str] = []

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # Format conversation messages
        formatted_messages = [{"role": "system", "content": system_prompt}]
        for m in messages:
            role = "user" if m.get("sender") == "user" else "assistant"
            formatted_messages.append({"role": role, "content": m.get("text", "")})

        payload = {
            "model": self.model_name,
            "messages": formatted_messages,
            "tools": tool_schemas if tool_schemas else None,
            "tool_choice": "auto" if tool_schemas else None,
            "temperature": 0.2,
            "max_tokens": 1000,
        }
        if not tool_schemas:
            payload.pop("tools", None)
            payload.pop("tool_choice", None)

        try:
            resp = requests.post(self.endpoint, headers=headers, json=payload, timeout=20)
            if resp.status_code != 200:
                logger.error("OpenAI API error %d: %s", resp.status_code, resp.text)
                raise RuntimeError(f"OpenAI API returned status {resp.status_code}")

            res_json = resp.json()
            choice = res_json["choices"][0]
            message_obj = choice["message"]

            # Check if model requested tool execution
            if message_obj.get("tool_calls"):
                formatted_messages.append(message_obj)
                for tool_call in message_obj["tool_calls"]:
                    fn_name = tool_call["function"]["name"]
                    try:
                        fn_args = json.loads(tool_call["function"].get("arguments", "{}"))
                    except Exception:
                        fn_args = {}

                    # Ensure symbol defaults to active symbol if not provided
                    if "symbol" in fn_args and not fn_args["symbol"]:
                        fn_args["symbol"] = context.get("active_symbol", "TCS.NS")
                    elif "symbol" not in fn_args and fn_name in (
                        "get_stock_quote",
                        "get_technical_indicators",
                        "get_prediction",
                        "get_model_metadata",
                        "get_model_performance",
                        "get_feature_importance",
                        "get_prediction_history",
                    ):
                        fn_args["symbol"] = context.get("active_symbol", "TCS.NS")

                    tool_res = tool_executor(fn_name, **fn_args)
                    tools_used.append(fn_name)

                    if "market_data" in fn_name or "quote" in fn_name:
                        citations.append("Market Data")
                    elif "technical" in fn_name:
                        citations.append("Technical Indicators")
                    elif "prediction" in fn_name:
                        citations.append("Prediction Model")
                    elif "model" in fn_name:
                        citations.append("Model Governance")
                    elif "system" in fn_name or "architecture" in fn_name:
                        citations.append("System Telemetry")

                    formatted_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "name": fn_name,
                        "content": json.dumps(tool_res),
                    })

                # Follow-up completion with tool results
                second_payload = {
                    "model": self.model_name,
                    "messages": formatted_messages,
                    "temperature": 0.2,
                    "max_tokens": 1000,
                }
                second_resp = requests.post(self.endpoint, headers=headers, json=second_payload, timeout=20)
                if second_resp.status_code == 200:
                    second_json = second_resp.json()
                    final_text = second_json["choices"][0]["message"]["content"]
                else:
                    final_text = "I retrieved the requested data but encountered an error formatting the final response."
            else:
                final_text = message_obj.get("content", "")

            # Deduplicate citations
            unique_citations = list(dict.fromkeys(citations))

            return {
                "response": final_text,
                "tools_used": tools_used,
                "citations": unique_citations,
                "suggested_questions": [
                    "Explain the technical indicators",
                    "How accurate is this model?",
                    "What features are most important?",
                ],
            }
        except Exception as exc:
            logger.exception("Failed OpenAI API request: %s", exc)
            raise exc

