import React from "react";
import { Probabilities } from "../../types";

interface PredictionGaugeProps {
  probabilities?: Probabilities;
  direction?: "UP" | "DOWN";
  probability?: number;
}

export const PredictionGauge: React.FC<PredictionGaugeProps> = ({
  probabilities,
  direction,
  probability,
}) => {
  if (!direction && !probabilities && probability === undefined) {
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: "var(--radius-md)",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Directional Confidence Gauge</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            CONFIDENCE UNAVAILABLE
          </span>
        </div>
        <div
          style={{
            padding: "14px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-sm)",
            fontSize: 12,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          No machine learning confidence score is currently available for this symbol.
        </div>
      </div>
    );
  }

  const upProb =
    probabilities?.UP !== undefined
      ? probabilities.UP
      : direction === "UP" && probability !== undefined
      ? probability
      : direction === "DOWN" && probability !== undefined
      ? 1 - probability
      : 0;

  const downProb =
    probabilities?.DOWN !== undefined
      ? probabilities.DOWN
      : 1 - upProb;

  const upPercent = Math.max(0, Math.min(100, upProb * 100));
  const downPercent = Math.max(0, Math.min(100, downProb * 100));
  const confidenceScore = direction === "UP" ? upPercent : downPercent;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-md)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", display: "block" }}>
            PREDICTION PROBABILITY DISTRIBUTION
          </span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            Model-estimated class probability
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 13,
            color: direction === "UP" ? "var(--color-up)" : "var(--color-down)",
          }}
        >
          {confidenceScore.toFixed(2)}% ({direction})
        </span>
      </div>

      {/* Two Box Probability Display */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div
          style={{
            background: "var(--bg-tertiary)",
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-card)",
            borderLeft: "4px solid var(--color-up)",
          }}
        >
          <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 600 }}>
            UP PROBABILITY
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-up)" }}>
            {upPercent.toFixed(2)}%
          </span>
        </div>

        <div
          style={{
            background: "var(--bg-tertiary)",
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-card)",
            borderLeft: "4px solid var(--color-down)",
          }}
        >
          <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", textTransform: "uppercase", fontWeight: 600 }}>
            DOWN PROBABILITY
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-down)" }}>
            {downPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Bar container */}
      <div
        style={{
          width: "100%",
          height: 10,
          borderRadius: 5,
          overflow: "hidden",
          background: "var(--bg-card-subtle)",
          border: "1px solid var(--border-card)",
          display: "flex",
        }}
      >
        <div
          style={{
            width: `${downPercent}%`,
            height: "100%",
            backgroundColor: "var(--color-down)",
            transition: "width 0.3s ease",
          }}
          title={`DOWN Probability: ${downPercent.toFixed(2)}%`}
        />
        <div
          style={{
            width: `${upPercent}%`,
            height: "100%",
            backgroundColor: "var(--color-up)",
            transition: "width 0.3s ease",
          }}
          title={`UP Probability: ${upPercent.toFixed(2)}%`}
        />
      </div>

      {/* Factual Confidence Explanation */}
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          lineHeight: 1.45,
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-card)",
          padding: "10px 14px",
          borderRadius: "var(--radius-sm)",
        }}
      >
        The classifier assigns a <strong style={{ color: "var(--text-primary)" }}>{confidenceScore.toFixed(2)}%</strong> estimated probability to the{" "}
        <strong style={{ color: "var(--text-primary)" }}>{direction || "UP"}</strong> class for the supplied feature vector. This is a model output, not a guarantee of future market performance.
      </div>
    </div>
  );
};
