import React from "react";
import { Database, ArrowRight, BarChart3 } from "lucide-react";

interface MarketDataUnavailableProps {
  symbol: string;
  onSelectSymbol: (symbol: string) => void;
  onNavigateToData?: () => void;
  onNavigateToOverview?: () => void;
}

export const MarketDataUnavailable: React.FC<MarketDataUnavailableProps> = ({
  symbol,
  onSelectSymbol,
  onNavigateToData,
  onNavigateToOverview,
}) => {
  return (
    <div
      className="analytics-card"
      style={{
        padding: "32px 28px",
        border: "1.5px solid #FED7AA",
        background: "linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)",
        borderRadius: "var(--radius-md)",
        boxShadow: "0 4px 12px rgba(234, 88, 12, 0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
        {/* Colorful Icon Badge */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-sm)",
            backgroundColor: "#FFEDD5",
            color: "#EA580C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1.5px solid #FDBA74",
          }}
        >
          <Database size={24} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#C2410C",
              }}
            >
              MARKET DATA UNAVAILABLE
            </span>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                background: "#FFFFFF",
                border: "1px solid #FED7AA",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                color: "#EA580C",
                fontWeight: 700,
              }}
            >
              {symbol}
            </span>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px 0" }}>
            No market observations or prediction model are currently stored for {symbol}.
          </h3>

          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "0 0 12px 0", maxWidth: 680 }}>
            This platform adheres to enterprise data integrity and <strong>never fabricates financial data</strong>. Possible reasons:
          </p>

          <ul
            style={{
              fontSize: 12,
              color: "#64748B",
              lineHeight: 1.7,
              margin: "0 0 20px 0",
              paddingLeft: 20,
            }}
          >
            <li><strong>Symbol not ingested:</strong> The ticker has not been added to automated ingestion cycles.</li>
            <li><strong>Provider data unavailable:</strong> Market provider returned null or insufficient historical bars.</li>
            <li><strong>No model artifact exists:</strong> No trained XGBoost classifier is registered for this equity.</li>
          </ul>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-primary-gradient"
              onClick={() => onSelectSymbol("TCS.NS")}
              style={{ padding: "8px 18px", fontSize: 12 }}
            >
              <span>Analyze TCS.NS (Production Ready)</span>
              <ArrowRight size={14} />
            </button>

            {onNavigateToData && (
              <button
                type="button"
                className="stock-pill-btn"
                onClick={onNavigateToData}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
              >
                <Database size={13} style={{ color: "#2563EB" }} />
                <span>Open Market Data</span>
              </button>
            )}

            {onNavigateToOverview && (
              <button
                type="button"
                className="stock-pill-btn"
                onClick={onNavigateToOverview}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
              >
                <BarChart3 size={13} style={{ color: "#0D9488" }} />
                <span>View Watchlist</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
