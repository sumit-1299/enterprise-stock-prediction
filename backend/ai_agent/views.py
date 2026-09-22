"""
API views for AI Market Intelligence Agent.
"""
import logging
import time
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_agent.serializers import (
    AgentChatRequestSerializer,
    AgentChatResponseSerializer,
)
from ai_agent.services.agent_service import AgentService

logger = logging.getLogger(__name__)


def check_rate_limit(client_ip: str, limit: int = 30, window_seconds: int = 60) -> bool:
    """
    Simple cache-based sliding-window rate limiter per client IP.
    Returns True if request is allowed, False if limit exceeded.
    """
    cache_key = f"ai_agent_rl_{client_ip}"
    current_time = time.time()

    requests = cache.get(cache_key, [])
    # Filter out requests older than window_seconds
    valid_requests = [t for t in requests if current_time - t < window_seconds]

    if len(valid_requests) >= limit:
        return False

    valid_requests.append(current_time)
    cache.set(cache_key, valid_requests, timeout=window_seconds)
    return True


class AgentChatView(APIView):
    """
    Interactive chat endpoint for Market Intelligence Assistant.
    POST /api/ai-agent/chat/
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # 1. Rate Limiting Check
        client_ip = (
            request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or request.META.get("REMOTE_ADDR", "127.0.0.1")
        )
        if not check_rate_limit(client_ip, limit=60, window_seconds=60):
            return Response(
                {
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests to AI Assistant. Please wait a moment before trying again.",
                    }
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # 2. Input Validation
        serializer = AgentChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "error": {
                        "code": "INVALID_INPUT",
                        "message": "Validation failed for AI Assistant request.",
                        "details": serializer.errors,
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        message = data["message"]
        symbol = data.get("symbol", "TCS.NS")
        page = data.get("page", "dashboard")
        history = data.get("conversation_history", [])

        # 3. Process message
        try:
            result = AgentService.process_message(
                message=message,
                symbol=symbol,
                page=page,
                conversation_history=history,
            )
            response_serializer = AgentChatResponseSerializer(data=result)
            response_serializer.is_valid(raise_exception=True)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Error in AgentChatView: %s", exc)
            return Response(
                {
                    "error": {
                        "code": "AI_AGENT_ERROR",
                        "message": "AI Assistant is temporarily unavailable. Please try again shortly.",
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

