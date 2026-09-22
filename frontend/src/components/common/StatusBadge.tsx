import React from "react";
import { LucideIcon, ArrowUp, ArrowDown, Check, X, Clock, AlertTriangle } from "lucide-react";

export type StatusVariant =
  | "operational"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "up"
  | "down"
  | "correct"
  | "incorrect"
  | "pending";

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  showDot?: boolean;
  icon?: LucideIcon;
  size?: "sm" | "md";
}

const VARIANT_CONFIG: Record<
  StatusVariant,
  { bg: string; text: string; border: string; dot: string; defaultLabel: string; DefaultIcon?: LucideIcon }
> = {
  operational: { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", dot: "#16A34A", defaultLabel: "Operational" },
  warning: { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA", dot: "#EA580C", defaultLabel: "Warning", DefaultIcon: AlertTriangle },
  error: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", dot: "#DC2626", defaultLabel: "Error" },
  info: { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", dot: "#2563EB", defaultLabel: "Info" },
  neutral: { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1", dot: "#94A3B8", defaultLabel: "Neutral" },
  up: { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", dot: "#16A34A", defaultLabel: "UP", DefaultIcon: ArrowUp },
  down: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", dot: "#DC2626", defaultLabel: "DOWN", DefaultIcon: ArrowDown },
  correct: { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", dot: "#16A34A", defaultLabel: "Correct", DefaultIcon: Check },
  incorrect: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", dot: "#DC2626", defaultLabel: "Incorrect", DefaultIcon: X },
  pending: { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA", dot: "#EA580C", defaultLabel: "Pending", DefaultIcon: Clock },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  label,
  showDot = true,
  icon: CustomIcon,
  size = "md",
}) => {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.neutral;
  const displayLabel = label || config.defaultLabel;
  const IconComponent = CustomIcon || config.DefaultIcon;

  const isSmall = size === "sm";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? 4 : 6,
        padding: isSmall ? "2px 8px" : "4px 10px",
        borderRadius: 9999,
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        fontSize: isSmall ? 10 : 11,
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {showDot && !IconComponent && (
        <span
          style={{
            width: isSmall ? 5 : 7,
            height: isSmall ? 5 : 7,
            borderRadius: "50%",
            backgroundColor: config.dot,
            flexShrink: 0,
          }}
        />
      )}
      {IconComponent && <IconComponent size={isSmall ? 11 : 13} style={{ strokeWidth: 2.5 }} />}
      <span>{displayLabel}</span>
    </span>
  );
};

