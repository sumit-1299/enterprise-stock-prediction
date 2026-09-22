import React from "react";
import { PredictionHistoryItem } from "../types";

interface PredictionHistoryProps {
  history: PredictionHistoryItem[];
  isLoading?: boolean;
}

export const PredictionHistory: React.FC<PredictionHistoryProps> = ({
  history,
  isLoading = false,
}) => {
  if (isLoading) {
    return null;
  }

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ gridColumn: "1 / -1", marginTop: 16 }}>
      <div className="card-title">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Historical Predictions Audit Log</span>
          <span
            style={{
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(59, 130, 246, 0.15)",
              color: "var(--accent-blue)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {history.length} Records
          </span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Persisted in PostgreSQL
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Generated At</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Market Bar</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Direction</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Confidence</th>
              <th style={{ padding: "8px 12px", fontWeight: 600 }}>Model</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => {
              const isUp = item.prediction === "UP";
              return (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>
                    {new Date(item.generated_at).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </td>
                  <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>
                    {item.market_data_timestamp
                      ? new Date(item.market_data_timestamp).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: 12,
                        background: isUp ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: isUp ? "var(--accent-green)" : "var(--accent-red)",
                      }}
                    >
                      {isUp ? "▲ UP" : "▼ DOWN"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                    {(item.probability * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>
                    {item.model_type} ({item.model_version})
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

