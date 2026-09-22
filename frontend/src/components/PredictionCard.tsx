import React from "react";
import { PredictionResponse } from "../types";

interface PredictionCardProps {
  prediction: PredictionResponse;
  isLive?: boolean;
  latestPrice?: number;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  isLive = false,
  latestPrice,
}) => {
  const isUp = prediction.prediction === "UP";
  const percentage = (prediction.probability * 100).toFixed(1);

  return (
    <div className="card">
      <div className="card-title">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Stock Direction Prediction</span>
          {isLive ? (
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: "rgba(16, 185, 129, 0.2)",
                color: "var(--accent-green)",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              ● LIVE STREAM
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: "rgba(100, 116, 139, 0.2)",
                color: "var(--text-muted)",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              REST SNAPSHOT
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {latestPrice !== undefined && (
            <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              ₹{latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          <span style={{ color: "var(--accent-blue)", fontFamily: "var(--font-mono)" }}>
            {prediction.symbol}
          </span>
        </div>
      </div>

      <div className={`prediction-display ${isUp ? "up" : "down"}`}>
        <div className="direction-indicator">
          <span className={`direction-arrow ${isUp ? "up" : "down"}`}>
            {isUp ? "▲" : "▼"}
          </span>
          <span className={`direction-label ${isUp ? "up" : "down"}`}>
            {prediction.prediction}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Predicted Horizon
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16 }}>
            Next Trading Day
          </div>
        </div>
      </div>

      <div className="probability-section">
        <div className="probability-header">
          <span>Model Probability</span>
          <span className="probability-value">{percentage}%</span>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill ${isUp ? "up" : "down"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
          <span>Bearish (DOWN): {(prediction.probabilities.DOWN * 100).toFixed(1)}%</span>
          <span>Bullish (UP): {(prediction.probabilities.UP * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div className="data-table" style={{ marginTop: 8 }}>
        <div className="data-row">
          <span className="data-label">Market Data Timestamp</span>
          <span className="data-value">
            {new Date(prediction.timestamp).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </div>
        <div className="data-row">
          <span className="data-label">Active Model</span>
          <span className="data-value">{prediction.model_type} ({prediction.model_version})</span>
        </div>
      </div>
    </div>
  );
};

