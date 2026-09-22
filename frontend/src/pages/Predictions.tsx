import React from "react";
import { PredictionConfidenceChart } from "../components/charts/PredictionConfidenceChart";
import { PredictionGauge } from "../components/dashboard/PredictionGauge";
import { PredictionResponse, MarketDataPoint } from "../types";
import { Sparkles, AlertCircle } from "lucide-react";

interface PredictionsProps {
  currentSymbol: string;
  prediction: PredictionResponse | null;
  marketData?: MarketDataPoint[];
  isLoading: boolean;
}

export const Predictions: React.FC<PredictionsProps> = ({
  currentSymbol,
  prediction,
  marketData = [],
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="state-box">
        <div className="skeleton-box" style={{ width: 48, height: 48, borderRadius: "50%", marginBottom: 16 }} />
        <div className="state-title">Running Quantitative Inference...</div>
        <div className="state-desc">Calculating technical indicators and querying model artifact for {currentSymbol}...</div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="state-box state-box-warning" style={{ margin: "24px 0" }}>
        <AlertCircle size={36} style={{ color: "#EA580C", marginBottom: 12 }} />
        <div className="state-title" style={{ color: "#9A3412" }}>No Prediction Available</div>
        <div className="state-desc" style={{ color: "#C2410C" }}>
          No active prediction found for {currentSymbol}. Ensure market data is ingested and a trained model exists.
        </div>
      </div>
    );
  }

  const latest = marketData.length > 0 ? marketData[marketData.length - 1] : null;
  const isUp = prediction.prediction === "UP";

  // 12 features with category grouping for colorful tags
  const FEATURE_INPUTS: { name: string; category: "Returns" | "Moving Averages" | "Momentum" | "Volatility" | "Volume"; tagClass: string; value: string; desc: string }[] = [
    {
      name: "return_1d",
      category: "Returns",
      tagClass: "feature-tag-blue",
      value: latest?.return_1d !== undefined && latest?.return_1d !== null
        ? `${(latest.return_1d * 100).toFixed(2)}%`
        : "N/A",
      desc: "1-day price return capturing immediate session momentum",
    },
    {
      name: "return_5d",
      category: "Returns",
      tagClass: "feature-tag-blue",
      value: latest?.return_5d !== undefined && latest?.return_5d !== null
        ? `${(latest.return_5d * 100).toFixed(2)}%`
        : "N/A",
      desc: "5-day cumulative return capturing weekly momentum",
    },
    {
      name: "sma_10",
      category: "Moving Averages",
      tagClass: "feature-tag-purple",
      value: latest?.sma_10 ? `₹${latest.sma_10.toFixed(2)}` : "N/A",
      desc: "10-day simple moving average",
    },
    {
      name: "sma_20",
      category: "Moving Averages",
      tagClass: "feature-tag-purple",
      value: latest?.sma_20 ? `₹${latest.sma_20.toFixed(2)}` : "N/A",
      desc: "20-day simple moving average",
    },
    {
      name: "sma_50",
      category: "Moving Averages",
      tagClass: "feature-tag-purple",
      value: latest?.sma_50 ? `₹${latest.sma_50.toFixed(2)}` : "N/A",
      desc: "50-day simple moving average",
    },
    {
      name: "ema_12",
      category: "Moving Averages",
      tagClass: "feature-tag-purple",
      value: latest?.ema_12 ? `₹${latest.ema_12.toFixed(2)}` : "N/A",
      desc: "12-day exponential moving average",
    },
    {
      name: "ema_26",
      category: "Moving Averages",
      tagClass: "feature-tag-purple",
      value: latest?.ema_26 ? `₹${latest.ema_26.toFixed(2)}` : "N/A",
      desc: "26-day exponential moving average",
    },
    {
      name: "macd",
      category: "Momentum",
      tagClass: "feature-tag-teal",
      value: latest?.macd !== undefined && latest?.macd !== null ? latest.macd.toFixed(2) : "N/A",
      desc: "Moving Average Convergence Divergence line",
    },
    {
      name: "macd_signal",
      category: "Momentum",
      tagClass: "feature-tag-teal",
      value: latest?.macd_signal !== undefined && latest?.macd_signal !== null ? latest.macd_signal.toFixed(2) : "N/A",
      desc: "9-day EMA signal line of MACD",
    },
    {
      name: "rsi_14",
      category: "Momentum",
      tagClass: "feature-tag-teal",
      value: latest?.rsi_14 !== undefined && latest?.rsi_14 !== null ? latest.rsi_14.toFixed(2) : "N/A",
      desc: "14-day Relative Strength Index oscillator",
    },
    {
      name: "volatility_20",
      category: "Volatility",
      tagClass: "feature-tag-orange",
      value: latest?.volatility_20 !== undefined && latest?.volatility_20 !== null
        ? `${(latest.volatility_20 * 100).toFixed(2)}%`
        : "N/A",
      desc: "20-day rolling price return statistical standard deviation",
    },
    {
      name: "volume_change",
      category: "Volume",
      tagClass: "feature-tag-green",
      value: latest?.volume_change !== undefined && latest?.volume_change !== null
        ? `${latest.volume_change >= 0 ? "+" : ""}${(latest.volume_change * 100).toFixed(2)}%`
        : "N/A",
      desc: "Session volume relative change vs previous session",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="dashboard-grid-2col">
        {/* Main Colorful Prediction Panel */}
        <div
          className="analytics-card"
          style={{
            backgroundColor: isUp ? "#F0FDF4" : "#FFF1F2",
            borderColor: isUp ? "#86EFAC" : "#FECDD3",
            boxShadow: isUp ? "0 4px 14px rgba(22, 163, 74, 0.08)" : "0 4px 14px rgba(220, 38, 38, 0.08)",
          }}
        >
          <div className="card-header-row">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className={`icon-badge ${isUp ? "icon-badge-green" : "icon-badge-red"}`}>
                <Sparkles size={18} />
              </div>
              <div>
                <span className="card-title" style={{ color: isUp ? "#15803D" : "#B91C1C" }}>
                  QUANTITATIVE DIRECTIONAL PREDICTION
                </span>
                <span className="card-subtitle">
                  {currentSymbol} • Binary Classification Inference
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                padding: "3px 10px",
                borderRadius: "var(--radius-sm)",
                background: "#FFFFFF",
                border: `1px solid ${isUp ? "#86EFAC" : "#FECDD3"}`,
                color: isUp ? "#15803D" : "#B91C1C",
                fontWeight: 700,
              }}
            >
              ● ACTIVE INFERENCE
            </span>
          </div>

          <div className="prediction-main-row" style={{ margin: "16px 0", padding: "16px", background: "#FFFFFF", borderRadius: "var(--radius-md)", border: "1px solid #E2E8F0" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
                PREDICTED DIRECTION
              </div>
              <div
                className={`prediction-badge-large ${isUp ? "up" : "down"}`}
              >
                {isUp ? "▲ UP" : "▼ DOWN"}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>
                CONFIDENCE PROBABILITY
              </div>
              <div className="prediction-probability-text">
                {(prediction.probability * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="prediction-meta-grid" style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 14 }}>
            <div className="prediction-meta-item">
              <span className="meta-label">Stock Symbol</span>
              <span className="meta-val" style={{ color: "#2563EB" }}>{prediction.symbol}</span>
            </div>
            <div className="prediction-meta-item">
              <span className="meta-label">Prediction Horizon</span>
              <span className="meta-val" style={{ color: "#0D9488" }}>Next Trading Day</span>
            </div>
            <div className="prediction-meta-item">
              <span className="meta-label">Model Architecture</span>
              <span className="meta-val" style={{ color: "#7C3AED" }}>{prediction.model_type}</span>
            </div>
            <div className="prediction-meta-item">
              <span className="meta-label">Model Version</span>
              <span className="meta-val" style={{ color: "#4F46E5" }}>{prediction.model_version}</span>
            </div>
            <div className="prediction-meta-item">
              <span className="meta-label">Observation Time</span>
              <span className="meta-val">{new Date(prediction.timestamp).toLocaleString()}</span>
            </div>
            <div className="prediction-meta-item">
              <span className="meta-label">Features Count</span>
              <span className="meta-val" style={{ color: "#EA580C" }}>{prediction.features_used?.length || 12} Features</span>
            </div>
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#94A3B8",
              fontStyle: "italic",
              textAlign: "center",
              paddingTop: 8,
              borderTop: "1px dashed rgba(0,0,0,0.08)",
            }}
          >
            Model prediction — not financial advice
          </div>
        </div>

        {/* Prediction Probability Donut & Gauge */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PredictionGauge
            probabilities={prediction.probabilities}
            direction={prediction.prediction}
            probability={prediction.probability}
          />
          <PredictionConfidenceChart
            probabilities={prediction.probabilities}
            direction={prediction.prediction}
            probability={prediction.probability}
          />
        </div>
      </div>

      {/* Section: WHY THIS PREDICTION? (Model Inputs Table with Category Tags) */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>WHY THIS PREDICTION?</span>
              <span style={{ fontSize: 11, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                12 Model Inputs
              </span>
            </span>
            <span className="card-subtitle">
              Exact feature values evaluated by the XGBoost classifier for {currentSymbol}
            </span>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "22%" }}>FEATURE NAME</th>
                <th style={{ width: "18%" }}>CATEGORY</th>
                <th style={{ width: "20%" }}>CURRENT VALUE</th>
                <th>DESCRIPTION</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_INPUTS.map((item) => (
                <tr key={item.name}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.name}
                  </td>
                  <td>
                    <span className={`feature-tag ${item.tagClass}`}>
                      {item.category}
                    </span>
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: item.value === "N/A" ? "var(--text-muted)" : "#0F172A",
                    }}
                  >
                    {item.value}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {item.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
