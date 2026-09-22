import React, { useState, useMemo } from "react";
import { Clock, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { PredictionHistoryItem, MarketDataPoint } from "../../types";

interface PredictionVsActualChartProps {
  history: PredictionHistoryItem[];
  marketData: MarketDataPoint[];
  symbol: string;
}

type PeriodFilter = "7" | "30" | "90";

interface EvaluatedPrediction {
  timestamp: string;
  predicted: "UP" | "DOWN";
  probability: number;
  actualReturn: number | null;
  actualDirection: "UP" | "DOWN" | null;
  status: "CORRECT" | "INCORRECT" | "PENDING";
}

export const PredictionVsActualChart: React.FC<PredictionVsActualChartProps> = ({
  history,
  marketData,
  symbol,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>("30");

  const { evaluatedList, accuracy, totalEvaluated, correctCount } = useMemo(() => {
    if (!history || history.length === 0) {
      return { evaluatedList: [], accuracy: null, totalEvaluated: 0, correctCount: 0 };
    }

    // Sort predictions chronologically (oldest first)
    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime()
    );

    // Limit to selected period
    const limit = parseInt(period, 10);
    const windowedHistory = sortedHistory.slice(-limit);

    // Map marketData by date string (YYYY-MM-DD) for fast lookup
    const dateToPriceMap: { [date: string]: { close: number; nextClose?: number } } = {};
    for (let i = 0; i < marketData.length; i++) {
      const cur = marketData[i];
      if (cur.timestamp && cur.close !== null) {
        const dStr = cur.timestamp.split("T")[0];
        const next = i + 1 < marketData.length ? marketData[i + 1] : null;
        dateToPriceMap[dStr] = {
          close: cur.close,
          nextClose: next && next.close !== null ? next.close : undefined,
        };
      }
    }

    const evaluated: EvaluatedPrediction[] = [];
    let correct = 0;
    let total = 0;

    for (const item of windowedHistory) {
      const predDate = (item.market_data_timestamp || item.generated_at).split("T")[0];
      const marketPoint = dateToPriceMap[predDate];

      let actualReturn: number | null = null;
      let actualDirection: "UP" | "DOWN" | null = null;
      let outcomeStatus: "CORRECT" | "INCORRECT" | "PENDING" = "PENDING";

      if (marketPoint && marketPoint.nextClose !== undefined) {
        actualReturn = ((marketPoint.nextClose - marketPoint.close) / marketPoint.close) * 100;
        actualDirection = actualReturn >= 0 ? "UP" : "DOWN";

        if (item.prediction === actualDirection) {
          outcomeStatus = "CORRECT";
          correct++;
        } else {
          outcomeStatus = "INCORRECT";
        }
        total++;
      }

      evaluated.push({
        timestamp: item.market_data_timestamp || item.generated_at,
        predicted: item.prediction,
        probability: Math.round(item.probability * 1000) / 10,
        actualReturn: actualReturn !== null ? Math.round(actualReturn * 100) / 100 : null,
        actualDirection,
        status: outcomeStatus,
      });
    }

    const calcAccuracy = total > 0 ? Math.round((correct / total) * 1000) / 10 : null;

    return {
      evaluatedList: evaluated.reverse(), // most recent first for display
      accuracy: calcAccuracy,
      totalEvaluated: total,
      correctCount: correct,
    };
  }, [history, marketData, period]);

  if (!history || history.length < 2) {
    return (
      <div className="analytics-card" style={{ minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Prediction vs Actual Analysis</span>
            <span className="card-subtitle">{symbol} • Historical Forecast Accuracy</span>
          </div>
        </div>
        <div className="state-box" style={{ padding: "32px 16px" }}>
          <Clock size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
          <div className="state-title" style={{ fontSize: 14, fontWeight: 700 }}>
            Insufficient Historical Predictions
          </div>
          <div className="state-desc" style={{ maxWidth: 460 }}>
            At least 2 historical predictions with subsequent trading sessions are required to evaluate prediction accuracy.
            Currently {history?.length || 0} record is persisted for {symbol}. As additional predictions are recorded across sessions, accuracy will calculate here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Prediction vs Actual Analysis</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>
              {symbol}
            </span>
          </span>
          <span className="card-subtitle">
            Comparing machine learning directional forecasts against subsequent trading day market close-to-close returns
          </span>
        </div>

        {/* Period Filter Buttons: Last 7, Last 30, Last 90 */}
        <div className="timeframe-controls">
          {(["7", "30", "90"] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              type="button"
              className={`timeframe-btn ${period === p ? "active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              Last {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 2 }}>
            Directional Accuracy
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: accuracy !== null && accuracy >= 50 ? "#16A34A" : "#DC2626",
            }}
          >
            {accuracy !== null ? `${accuracy}%` : "N/A"}
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 2 }}>
            Evaluated Sessions
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
            {totalEvaluated}
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 2 }}>
            Correct Forecasts
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#16A34A" }}>
            {correctCount}
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 2 }}>
            Pending Outcomes
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#D97706" }}>
            {evaluatedList.filter((e) => e.status === "PENDING").length}
          </div>
        </div>
      </div>

      {/* Evaluated History Table */}
      <div style={{ overflowX: "auto", maxHeight: 280 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#64748B", fontSize: 11 }}>
              <th style={{ padding: "8px 10px" }}>Forecast Date</th>
              <th style={{ padding: "8px 10px" }}>Predicted</th>
              <th style={{ padding: "8px 10px" }}>Probability</th>
              <th style={{ padding: "8px 10px" }}>Actual Return</th>
              <th style={{ padding: "8px 10px" }}>Actual Dir</th>
              <th style={{ padding: "8px 10px", textAlign: "right" }}>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {evaluatedList.slice(0, 15).map((item, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: "1px solid #F1F5F9",
                  backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                }}
              >
                <td style={{ padding: "8px 10px", color: "#334155" }}>
                  {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : "—"}
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 11,
                      backgroundColor: item.predicted === "UP" ? "#ECFDF5" : "#FEF2F2",
                      color: item.predicted === "UP" ? "#16A34A" : "#DC2626",
                    }}
                  >
                    {item.predicted}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", color: "#475569" }}>{item.probability}%</td>
                <td
                  style={{
                    padding: "8px 10px",
                    fontWeight: 600,
                    color:
                      item.actualReturn === null
                        ? "#94A3B8"
                        : item.actualReturn >= 0
                        ? "#16A34A"
                        : "#DC2626",
                  }}
                >
                  {item.actualReturn !== null
                    ? `${item.actualReturn >= 0 ? "+" : ""}${item.actualReturn.toFixed(2)}%`
                    : "—"}
                </td>
                <td style={{ padding: "8px 10px", color: "#475569" }}>
                  {item.actualDirection || "—"}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right" }}>
                  {item.status === "CORRECT" ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: "#16A34A",
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      <CheckCircle2 size={13} /> MATCH
                    </span>
                  ) : item.status === "INCORRECT" ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: "#DC2626",
                        fontWeight: 700,
                        fontSize: 11,
                      }}
                    >
                      <XCircle size={13} /> MISMATCH
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: "#D97706",
                        fontWeight: 600,
                        fontSize: 11,
                      }}
                    >
                      <HelpCircle size={13} /> PENDING
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
