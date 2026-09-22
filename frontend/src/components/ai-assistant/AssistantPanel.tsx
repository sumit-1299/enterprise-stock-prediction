import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  RotateCcw,
  Bot,
  User,
  ChevronRight,
} from "lucide-react";
import { sendAgentMessage } from "../../services/api";
import { AgentMessage, NavSectionId } from "../../types";

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: string;
  activeSection: NavSectionId;
  onSelectSymbol?: (symbol: string) => void;
  onNavigateSection?: (section: NavSectionId) => void;
}

const INITIAL_GREETING = (symbol: string) =>
  `Hi! I'm your **Market Intelligence Assistant**.\n\nI can help you understand real-time market data, technical indicators, ML predictions, model performance, and this dashboard for **${symbol}**.\n\nWhat would you like to know?`;

const DEFAULT_QUICK_ACTIONS = [
  "Explain this stock",
  "Explain prediction",
  "Analyze technical indicators",
  "Explain the model",
  "How does this platform work?",
];

const PAGE_PROMPTS: Record<string, string[]> = {
  dashboard: ["Explain this prediction", "Explain today's market data", "Explain the technical indicators"],
  analysis: ["Explain RSI", "Explain MACD", "Explain volatility"],
  predictions: ["Why this prediction?", "How confident is the model?", "What features are used?"],
  models: ["Explain model performance", "Explain data drift", "Explain feature importance"],
  history: ["Explain prediction history", "How are outcomes resolved?", "What is the recent accuracy?"],
  system: ["Explain system health", "Is the database online?", "Explain platform architecture"],
};

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  activeSection,
  onSelectSymbol: _onSelectSymbol,
  onNavigateSection: _onNavigateSection,
}) => {
  const [messages, setMessages] = useState<AgentMessage[]>(() => [
    {
      id: "greeting-0",
      sender: "assistant",
      text: INITIAL_GREETING(currentSymbol),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      citations: ["Market Data", "Prediction Model"],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [lastSymbol, setLastSymbol] = useState(currentSymbol);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isThinking]);

  // Notify context switch when currentSymbol changes
  useEffect(() => {
    if (currentSymbol !== lastSymbol) {
      setLastSymbol(currentSymbol);
      setMessages((prev) => [
        ...prev,
        {
          id: `ctx-${Date.now()}`,
          sender: "assistant",
          text: `*Active context switched to **${currentSymbol}**.* You can ask about its price, technical indicators, or ML prediction.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          citations: ["Context Switch"],
        },
      ]);
    }
  }, [currentSymbol, lastSymbol]);

  const handleSendMessage = useCallback(
    async (textToSend: string) => {
      const trimmed = textToSend.trim();
      if (!trimmed || isThinking) return;

      const userMsg: AgentMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsThinking(true);

      // Prepare conversation history (last 8 turns)
      const history = messages.slice(-8).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      try {
        const response = await sendAgentMessage({
          message: trimmed,
          symbol: currentSymbol,
          page: activeSection,
          conversation_history: history,
        });

        const assistantMsg: AgentMessage = {
          id: `asst-${Date.now()}`,
          sender: "assistant",
          text: response.response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          toolsUsed: response.tools_used,
          citations: response.citations,
          suggestedQuestions: response.suggested_questions,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        const errorMsg: AgentMessage = {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: `⚠️ **AI Assistant is temporarily unavailable.** ${err?.message || "Please try again shortly."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, messages, currentSymbol, activeSection]
  );

  const handleClearHistory = () => {
    setMessages([
      {
        id: `greeting-${Date.now()}`,
        sender: "assistant",
        text: INITIAL_GREETING(currentSymbol),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations: ["Market Data", "Prediction Model"],
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const renderFormattedText = (text: string) => {
    // Process markdown-like formatting: bold, italic, lists, code, tables
    const lines = text.split("\n");
    return (
      <div style={{ fontSize: "13px", lineHeight: "1.6", color: "inherit" }}>
        {lines.map((line, idx) => {
          // Empty line
          if (!line.trim()) {
            return <div key={idx} style={{ height: "8px" }} />;
          }

          // Bullet point
          if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
            const content = line.trim().substring(2);
            return (
              <div key={idx} style={{ display: "flex", gap: "8px", margin: "3px 0 3px 6px" }}>
                <span style={{ color: "#7C3AED", fontWeight: 700 }}>•</span>
                <span>{renderInlineSpans(content)}</span>
              </div>
            );
          }

          // Blockquote / Compliance note
          if (line.trim().startsWith("> ")) {
            const quoteContent = line.trim().substring(2);
            return (
              <div
                key={idx}
                style={{
                  margin: "8px 0",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: "#FFFBEB",
                  borderLeft: "3px solid #F59E0B",
                  fontSize: "12px",
                  color: "#92400E",
                }}
              >
                {renderInlineSpans(quoteContent)}
              </div>
            );
          }

          // Code block / CLI
          if (line.trim().startsWith("```")) {
            return null; // Skip markdown fences
          }

          return (
            <div key={idx} style={{ margin: "2px 0" }}>
              {renderInlineSpans(line)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderInlineSpans = (text: string) => {
    // Replace **bold**, `code`, *italic*
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let lastIdx = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.substring(lastIdx, match.index));
      }
      const matchedStr = match[0];
      if (matchedStr.startsWith("**") && matchedStr.endsWith("**")) {
        parts.push(
          <strong key={match.index} style={{ fontWeight: 600, color: "var(--text-primary, #0F172A)" }}>
            {matchedStr.substring(2, matchedStr.length - 2)}
          </strong>
        );
      } else if (matchedStr.startsWith("`") && matchedStr.endsWith("`")) {
        parts.push(
          <code
            key={match.index}
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#F1F5F9",
              border: "1px solid #E2E8F0",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "11px",
              color: "#0F172A",
            }}
          >
            {matchedStr.substring(1, matchedStr.length - 1)}
          </code>
        );
      } else if (matchedStr.startsWith("*") && matchedStr.endsWith("*")) {
        parts.push(<em key={match.index}>{matchedStr.substring(1, matchedStr.length - 1)}</em>);
      }
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx));
    }

    return parts;
  };

  if (!isOpen) return null;

  const currentPrompts = PAGE_PROMPTS[activeSection] || DEFAULT_QUICK_ACTIONS.slice(0, 3);

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className="ai-assistant-backdrop"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(2px)",
          zIndex: 998,
          display: window.innerWidth <= 768 ? "block" : "none",
        }}
      />

      {/* Main Slide-Over Drawer */}
      <aside
        className="ai-assistant-panel"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: window.innerWidth <= 768 ? "100vw" : "440px",
          zIndex: 999,
          background: "#FFFFFF",
          boxShadow: "-8px 0 32px rgba(15, 23, 42, 0.15)",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #E2E8F0",
          animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #E2E8F0",
            background: "linear-gradient(180deg, #FAF5FF 0%, #FFFFFF 100%)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
                }}
              >
                <Sparkles size={18} color="#FFFFFF" />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#0F172A",
                    letterSpacing: "0.01em",
                  }}
                >
                  Market Intelligence Assistant
                </h3>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748B" }}>
                  Ask questions about your market analytics
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={handleClearHistory}
                title="Reset conversation"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94A3B8",
                  padding: "6px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#0F172A")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={onClose}
                title="Close assistant"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748B",
                  padding: "6px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#0F172A")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Context Badge Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 10px",
              background: "#F8FAFC",
              borderRadius: "6px",
              border: "1px solid #E2E8F0",
              fontSize: "11px",
              color: "#475569",
            }}
          >
            <span style={{ fontWeight: 600 }}>Active Context:</span>
            <span
              style={{
                background: "#EDE9FE",
                color: "#6D28D9",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontWeight: 700,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {currentSymbol}
            </span>
            <span style={{ color: "#CBD5E1" }}>•</span>
            <span style={{ textTransform: "capitalize", color: "#64748B" }}>{activeSection}</span>
          </div>
        </div>

        {/* Conversation Stream */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            background: "#FAFAFC",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                gap: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  maxWidth: "92%",
                  flexDirection: msg.sender === "user" ? "row-reverse" : "row",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background:
                      msg.sender === "user"
                        ? "#1D4ED8"
                        : "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Message Bubble */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "14px",
                    borderTopRightRadius: msg.sender === "user" ? "2px" : "14px",
                    borderTopLeftRadius: msg.sender === "assistant" ? "2px" : "14px",
                    background:
                      msg.sender === "user"
                        ? "#1D4ED8"
                        : msg.isError
                        ? "#FEF2F2"
                        : "#FFFFFF",
                    color:
                      msg.sender === "user"
                        ? "#FFFFFF"
                        : msg.isError
                        ? "#991B1B"
                        : "#1E293B",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    border: msg.sender === "user" ? "none" : "1px solid #E2E8F0",
                  }}
                >
                  {renderFormattedText(msg.text)}

                  {/* Citations Badges */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "10px",
                        paddingTop: "8px",
                        borderTop: "1px solid #F1F5F9",
                        fontSize: "10px",
                        color: "#64748B",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Based on:</span>
                      {msg.citations.map((c, i) => (
                        <span
                          key={i}
                          style={{
                            background: "#F1F5F9",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: 500,
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span
                style={{
                  fontSize: "10px",
                  color: "#94A3B8",
                  padding: "0 34px",
                }}
              >
                {msg.timestamp}
              </span>

              {/* Suggested Follow-up Questions */}
              {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    padding: "4px 34px 8px 34px",
                    width: "100%",
                  }}
                >
                  {msg.suggestedQuestions.map((sq, sqIdx) => (
                    <button
                      key={sqIdx}
                      onClick={() => handleSendMessage(sq)}
                      style={{
                        textAlign: "left",
                        background: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "11px",
                        color: "#1D4ED8",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#93C5FD";
                        e.currentTarget.style.background = "#EFF6FF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#E2E8F0";
                        e.currentTarget.style.background = "#FFFFFF";
                      }}
                    >
                      <span>{sq}</span>
                      <ChevronRight size={12} color="#93C5FD" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Thinking Animation */}
          {isThinking && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", maxWidth: "80%" }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={14} />
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "14px",
                  borderTopLeftRadius: "2px",
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "#64748B",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
              >
                <RefreshCw size={12} className="animate-spin" style={{ color: "#7C3AED" }} />
                <span>Analyzing quantitative signals & tools...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Chips Strip */}
        <div
          style={{
            padding: "8px 16px",
            background: "#FFFFFF",
            borderTop: "1px solid #F1F5F9",
            overflowX: "auto",
            display: "flex",
            gap: "8px",
            scrollbarWidth: "none",
          }}
        >
          {currentPrompts.map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isThinking}
              style={{
                whiteSpace: "nowrap",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "9999px",
                padding: "4px 12px",
                fontSize: "11px",
                fontWeight: 500,
                color: "#475569",
                cursor: isThinking ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isThinking) {
                  e.currentTarget.style.background = "#EDE9FE";
                  e.currentTarget.style.color = "#6D28D9";
                  e.currentTarget.style.borderColor = "#C4B5FD";
                }
              }}
              onMouseLeave={(e) => {
                if (!isThinking) {
                  e.currentTarget.style.background = "#F8FAFC";
                  e.currentTarget.style.color = "#475569";
                  e.currentTarget.style.borderColor = "#E2E8F0";
                }
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "14px 18px",
            borderTop: "1px solid #E2E8F0",
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
            placeholder={`Ask about ${currentSymbol}...`}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              fontSize: "13px",
              outline: "none",
              color: "#0F172A",
              fontFamily: "var(--font-sans)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#7C3AED")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#CBD5E1")}
          />

          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isThinking}
            title="Send message"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: !inputValue.trim() || isThinking ? "#E2E8F0" : "#1D4ED8",
              color: "#FFFFFF",
              border: "none",
              cursor: !inputValue.trim() || isThinking ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};
