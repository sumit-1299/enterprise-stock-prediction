import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ConfidenceGaugeProps {
  probability: number | null | undefined; // 0.0 to 1.0 or percentage 0 to 100
  direction?: "UP" | "DOWN" | string;
  size?: number;
  strokeWidth?: number;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({
  probability,
  direction = "UP",
  size = 120,
  strokeWidth = 10,
}) => {
  // Normalize probability to 0 - 100
  const normalizedProb =
    probability !== null && probability !== undefined
      ? probability <= 1.0
        ? probability * 100
        : probability
      : 50;

  const isUp = direction === "UP";
  const strokeColor = isUp ? "#16A34A" : "#DC2626";
  const bgColor = "#EEF3F8";

  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedProb / 100) * circumference;

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: size,
        height: size,
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress stroke */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
      </svg>

      {/* Center content */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 2, color: strokeColor, marginBottom: 2 }}>
          {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{direction}</span>
        </div>
        <div
          style={{
            fontSize: size > 110 ? 18 : 14,
            fontWeight: 800,
            color: "#172033",
            fontFamily: "var(--font-mono)",
            lineHeight: 1,
          }}
        >
          {normalizedProb.toFixed(1)}%
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginTop: 2 }}>
          CONFIDENCE
        </div>
      </div>
    </div>
  );
};

