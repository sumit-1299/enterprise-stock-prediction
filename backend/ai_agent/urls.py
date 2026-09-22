"""
URL configuration for ai_agent application.
"""
from django.urls import path
from ai_agent.views import AgentChatView

app_name = "ai_agent"

urlpatterns = [
    path("chat/", AgentChatView.as_view(), name="agent-chat"),
]

