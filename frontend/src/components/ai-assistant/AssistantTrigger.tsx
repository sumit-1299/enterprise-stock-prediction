import React from "react";
import { Sparkles } from "lucide-react";

interface AssistantTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  currentSymbol: string;
}

export const AssistantTrigger: React.FC<AssistantTriggerProps> = ({
  isOpen,
  onToggle,
  currentSymbol,
}) => {
  if (isOpen) {
    return null; // Trigger is hidden when panel is open
  }

  return (
    <button
      onClick={onToggle}
      className="ai-assistant-trigger"
      title={`Open Market Intelligence Assistant for ${currentSymbol}`}
      aria-label="Open Market Intelligence Assistant"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 990,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 18px",
        borderRadius: "9999px",
        background: "linear-gradient(135deg, #1D4ED8 0%, #7C3AED 100%)",
        color: "#FFFFFF",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 6px 24px rgba(124, 58, 237, 0.35), 0 2px 6px rgba(0, 0, 0, 0.1)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        fontSize: "13px",
        letterSpacing: "0.02em",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
        e.currentTarget.style.boxShadow =
          "0 8px 30px rgba(124, 58, 237, 0.45), 0 4px 10px rgba(0, 0, 0, 0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow =
          "0 6px 24px rgba(124, 58, 237, 0.35), 0 2px 6px rgba(0, 0, 0, 0.1)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.2)",
        }}
      >
        <Sparkles size={15} color="#FFFFFF" />
      </div>
      <span>AI Assistant</span>
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "9999px",
          background: "rgba(255, 255, 255, 0.25)",
          fontSize: "11px",
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
        }}
      >
        {currentSymbol}
      </span>
    </button>
  );
};

