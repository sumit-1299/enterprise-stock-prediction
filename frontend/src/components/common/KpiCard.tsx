import React from "react";
import { LucideIcon } from "lucide-react";

export type KpiAccentColor = "blue" | "green" | "purple" | "orange" | "teal" | "red" | "indigo";

interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon: LucideIcon;
  accentColor?: KpiAccentColor;
  badge?: React.ReactNode;
  isLoading?: boolean;
}

const ACCENT_MAP: Record<KpiAccentColor, { topBorder: string; iconBg: string; iconColor: string }> = {
  blue: { topBorder: "#2563EB", iconBg: "#EFF6FF", iconColor: "#2563EB" },
  green: { topBorder: "#16A34A", iconBg: "#F0FDF4", iconColor: "#16A34A" },
  purple: { topBorder: "#7C3AED", iconBg: "#F5F3FF", iconColor: "#7C3AED" },
  orange: { topBorder: "#EA580C", iconBg: "#FFF7ED", iconColor: "#EA580C" },
  teal: { topBorder: "#0D9488", iconBg: "#F0FDFA", iconColor: "#0D9488" },
  red: { topBorder: "#DC2626", iconBg: "#FEF2F2", iconColor: "#DC2626" },
  indigo: { topBorder: "#4F46E5", iconBg: "#EEF2FF", iconColor: "#4F46E5" },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  accentColor = "blue",
  badge,
  isLoading = false,
}) => {
  const accent = ACCENT_MAP[accentColor] || ACCENT_MAP.blue;

  if (isLoading) {
    return (
      <div
        className="kpi-card"
        style={{
          borderTop: `3px solid ${accent.topBorder}`,
          borderRadius: 16,
          padding: "18px 20px",
          background: "#FFFFFF",
          border: "1px solid #DCE4EE",
          boxShadow: "0 4px 18px rgba(23, 32, 51, 0.04)",
        }}
      >
        <div className="skeleton-box" style={{ height: 12, width: "50%", marginBottom: 12 }} />
        <div className="skeleton-box" style={{ height: 26, width: "80%", marginBottom: 10 }} />
        <div className="skeleton-box" style={{ height: 12, width: "60%" }} />
      </div>
    );
  }

  return (
    <div
      className="kpi-card"
      style={{
        borderTop: `3px solid ${accent.topBorder}`,
        borderRadius: 16,
        padding: "18px 20px",
        background: "#FFFFFF",
        border: "1px solid #DCE4EE",
        boxShadow: "0 4px 18px rgba(23, 32, 51, 0.04)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 8,
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#64748B",
          }}
        >
          {title}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: accent.iconBg,
            color: accent.iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#172033",
          fontFamily: "var(--font-mono)",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 11, color: "#64748B" }}>
        {subtext && <span>{subtext}</span>}
        {badge && <div>{badge}</div>}
      </div>
    </div>
  );
};

