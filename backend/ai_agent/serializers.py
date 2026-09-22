"""
Serializers for AI Market Intelligence Agent API.
"""
from rest_framework import serializers


class ConversationTurnSerializer(serializers.Serializer):
    sender = serializers.ChoiceField(choices=["user", "assistant"])
    text = serializers.CharField(max_length=2000)


class AgentChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, required=True, allow_blank=False)
    symbol = serializers.CharField(max_length=20, required=False, default="TCS.NS", allow_blank=True)
    page = serializers.CharField(max_length=50, required=False, default="dashboard", allow_blank=True)
    conversation_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
    )

    def validate_message(self, value):
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Message cannot be empty or whitespace only.")
        return stripped

    def validate_symbol(self, value):
        if not value:
            return "TCS.NS"
        return value.strip().upper()


class AgentChatResponseSerializer(serializers.Serializer):
    response = serializers.CharField()
    symbol = serializers.CharField()
    tools_used = serializers.ListField(child=serializers.CharField())
    citations = serializers.ListField(child=serializers.CharField())
    suggested_questions = serializers.ListField(child=serializers.CharField())
    execution_time_ms = serializers.FloatField()

