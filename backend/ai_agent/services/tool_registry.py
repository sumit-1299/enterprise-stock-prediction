"""
Tool Registry for AI Market Intelligence Agent.
Manages controlled tool definitions, JSON schemas, and execution routing.
"""
import logging
from typing import Any, Callable, Dict, List

from ai_agent.tools.history_tool import get_prediction_history
from ai_agent.tools.market_data_tool import get_market_history_summary, get_stock_quote
from ai_agent.tools.model_tool import (
    get_feature_importance,
    get_model_metadata,
    get_model_performance,
)
from ai_agent.tools.prediction_tool import get_prediction
from ai_agent.tools.system_tool import (
    get_project_architecture,
    get_supported_stocks,
    get_system_health,
)
from ai_agent.tools.technical_analysis_tool import get_technical_indicators

logger = logging.getLogger(__name__)


class ToolRegistry:
    """
    Central registry for all backend tools executable by the AI Agent.
    """

    TOOLS: Dict[str, Dict[str, Any]] = {
        "get_stock_quote": {
            "name": "get_stock_quote",
            "description": "Retrieve the latest real market price, volume, and daily percentage change for a stock symbol.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "The stock symbol with .NS suffix (e.g., 'TCS.NS', 'INFY.NS').",
                    }
                },
                "required": ["symbol"],
            },
            "func": get_stock_quote,
            "category": "Market Data",
        },
        "get_market_history_summary": {
            "name": "get_market_history_summary",
            "description": "Retrieve summary statistics (period high, low, average volume, total return) for recent trading sessions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "The stock symbol with .NS suffix.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of recent bars to evaluate (default 30).",
                        "default": 30,
                    },
                },
                "required": ["symbol"],
            },
            "func": get_market_history_summary,
            "category": "Market Data",
        },
        "get_technical_indicators": {
            "name": "get_technical_indicators",
            "description": "Compute and interpret 12 technical indicators (RSI-14, SMA 10/20/50, EMA 12/26, MACD, volatility) for a stock.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "The stock symbol with .NS suffix.",
                    }
                },
                "required": ["symbol"],
            },
            "func": get_technical_indicators,
            "category": "Technical Analysis",
        },
        "get_prediction": {
            "name": "get_prediction",
            "description": "Retrieve the current next-day directional prediction (UP/DOWN), probability confidence, and model version for a stock.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "The stock symbol with .NS suffix.",
                    }
                },
                "required": ["symbol"],
            },
            "func": get_prediction,
            "category": "Prediction",
        },
        "get_model_metadata": {
            "name": "get_model_metadata",
            "description": "Retrieve trained model version, features used, and evaluation metrics (accuracy, precision, recall, F1, ROC-AUC).",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "The stock symbol with .NS suffix.",
                    }
                },
                "required": ["symbol"],
            },
            "func": get_model_metadata,
            "category": "Model Governance",
        },
        "get_model_performance": {
            "name": "get_model_performance",
            "description": "Retrieve production model monitoring metrics, rolling accuracy, and confusion matrix.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "The stock symbol with .NS suffix.",
                    }
                },
                "required": ["symbol"],
            },
            "func": get_model_performance,
            "category": "Model Governance",
        },
        "get_feature_importance": {
            "name": "get_feature_importance",
            "description": "Retrieve ranked feature importance weights from the trained XGBoost model.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "The stock symbol with .NS suffix.",
                    }
                },
                "required": ["symbol"],
            },
            "func": get_feature_importance,
            "category": "Model Governance",
        },
        "get_prediction_history": {
            "name": "get_prediction_history",
            "description": "Retrieve historical predictions, actual directions, and realization outcomes (CORRECT, INCORRECT, PENDING).",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "The stock symbol with .NS suffix.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of recent predictions to fetch (default 5).",
                        "default": 5,
                    },
                },
                "required": ["symbol"],
            },
            "func": get_prediction_history,
            "category": "Prediction History",
        },
        "get_supported_stocks": {
            "name": "get_supported_stocks",
            "description": "Retrieve the full list of 14 supported NSE equities with sectors and model training status.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
            "func": get_supported_stocks,
            "category": "System",
        },
        "get_system_health": {
            "name": "get_system_health",
            "description": "Check the health and operational status of all backend subsystems (API, DB, Redis, Celery, Model Registry).",
            "parameters": {
                "type": "object",
                "properties": {},
            },
            "func": get_system_health,
            "category": "System",
        },
        "get_project_architecture": {
            "name": "get_project_architecture",
            "description": "Retrieve technical architectural details of the platform for project education questions.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
            "func": get_project_architecture,
            "category": "System",
        },
    }

    @classmethod
    def execute_tool(cls, name: str, **kwargs) -> Dict[str, Any]:
        """
        Execute a tool by name with provided arguments.
        """
        tool = cls.TOOLS.get(name)
        if not tool:
            logger.warning("Attempted to execute unregistered tool: '%s'", name)
            return {"status": "error", "message": f"Tool '{name}' is not registered."}

        func: Callable = tool["func"]
        try:
            return func(**kwargs)
        except Exception as exc:
            logger.error("Error executing tool '%s' with args %s: %s", name, kwargs, exc)
            return {"status": "error", "message": f"Error executing tool '{name}': {str(exc)}"}

    @classmethod
    def get_tool_schemas(cls) -> List[Dict[str, Any]]:
        """
        Return OpenAPI / function calling formatted schemas for all registered tools.
        """
        schemas = []
        for tool in cls.TOOLS.values():
            schemas.append({
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool["parameters"],
                },
            })
        return schemas

    @classmethod
    def get_tool_category(cls, name: str) -> str:
        """
        Return the human-readable category for a tool.
        """
        return cls.TOOLS.get(name, {}).get("category", "General")

