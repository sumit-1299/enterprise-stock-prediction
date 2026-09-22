import React from "react";
import { ArrowRight, Cpu, LineChart, BrainCircuit } from "lucide-react";

interface ModelUnavailableProps {
  symbol: string;
  onSelectSymbol: (symbol: string) => void;
  onNavigateToModels?: () => void;
  onNavigateToData?: () => void;
}

export const ModelUnavailable: React.FC<ModelUnavailableProps> = ({
  symbol,
  onSelectSymbol,
  onNavigateToModels,
  onNavigateToData,
}) => {
  return (
    <div
      className="analytics-card"
      style={{
        padding: "32px 28px",
        border: "1.5px solid #DDD6FE",
        background: "linear-gradient(180deg, #F5F3FF 0%, #FFFFFF 100%)",
        borderRadius: "var(--radius-md)",
        boxShadow: "0 4px 12px rgba(124, 58, 237, 0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
        {/* Colorful Icon Badge */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-sm)",
            backgroundColor: "#EDE9FE",
            color: "#7C3AED",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1.5px solid #C4B5FD",
          }}
        >
          <BrainCircuit size={24} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#6D28D9",
              }}
            >
              MODEL ARTIFACT UNAVAILABLE
            </span>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                background: "#FFFFFF",
                border: "1px solid #DDD6FE",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                color: "#7C3AED",
                fontWeight: 700,
              }}
            >
              {symbol}
            </span>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
            No trained machine learning model artifact found for {symbol}.
          </h3>

          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "0 0 14px 0", maxWidth: 680 }}>
            Market observations may be present, but directional forecasting is disabled because no production XGBoost classifier is registered for this equity. Under our governance policy, <strong>predictions are never simulated or fabricated</strong>.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-primary-gradient"
              onClick={() => onSelectSymbol("TCS.NS")}
              style={{ padding: "8px 18px", fontSize: 12 }}
            >
              <span>Analyze TCS.NS (Active Model)</span>
              <ArrowRight size={14} />
            </button>

            {onNavigateToModels && (
              <button
                type="button"
                className="stock-pill-btn"
                onClick={onNavigateToModels}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
              >
                <Cpu size={13} style={{ color: "#7C3AED" }} />
                <span>Model Registry</span>
              </button>
            )}

            {onNavigateToData && (
              <button
                type="button"
                className="stock-pill-btn"
                onClick={onNavigateToData}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
              >
                <LineChart size={13} style={{ color: "#0D9488" }} />
                <span>View Historical Prices</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
