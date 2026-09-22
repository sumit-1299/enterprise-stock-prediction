import React from "react";
import { FeatureImportanceChart } from "../components/charts/FeatureImportanceChart";
import { ModelInfoResponse } from "../types";

interface FeatureAnalysisProps {
  modelInfo: ModelInfoResponse | null;
}

export const FeatureAnalysis: React.FC<FeatureAnalysisProps> = ({ modelInfo }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <FeatureImportanceChart importance={modelInfo?.feature_importance} />

      {/* Feature Definitions Table */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Feature Vector Technical Definitions</span>
            <span className="card-subtitle">Engineered features computed by FeatureEngineeringService</span>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature Column</th>
                <th>Category</th>
                <th>Mathematical Definition</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, color: "var(--accent-primary)" }}>return_1d</td>
                <td>Returns</td>
                <td style={{ color: "var(--text-muted)" }}>1-day percentage change in closing price: (P_t - P_t-1) / P_t-1</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: "var(--accent-primary)" }}>return_5d</td>
                <td>Returns</td>
                <td style={{ color: "var(--text-muted)" }}>5-day percentage change in closing price: (P_t - P_t-5) / P_t-5</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: "var(--accent-primary)" }}>sma_10 / sma_20 / sma_50</td>
                <td>Trend</td>
                <td style={{ color: "var(--text-muted)" }}>Simple Moving Average over 10, 20, and 50 trading days: mean(P_t-n..t)</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: "var(--accent-primary)" }}>ema_12 / ema_26</td>
                <td>Trend</td>
                <td style={{ color: "var(--text-muted)" }}>Exponential Moving Average giving greater weight to recent prices: span=12 and span=26</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: "var(--accent-primary)" }}>macd</td>
                <td>Momentum</td>
                <td style={{ color: "var(--text-muted)" }}>Moving Average Convergence Divergence: ema_12 - ema_26</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: "var(--accent-primary)" }}>macd_signal</td>
                <td>Momentum</td>
                <td style={{ color: "var(--text-muted)" }}>9-day Exponential Moving Average of MACD series</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: "var(--accent-primary)" }}>rsi_14</td>
                <td>Momentum</td>
                <td style={{ color: "var(--text-muted)" }}>Relative Strength Index over 14 periods: 100 - (100 / (1 + RS))</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: "var(--accent-primary)" }}>volatility_20</td>
                <td>Risk</td>
                <td style={{ color: "var(--text-muted)" }}>20-day rolling standard deviation of 1-day percentage returns</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: "var(--accent-primary)" }}>volume_change</td>
                <td>Volume</td>
                <td style={{ color: "var(--text-muted)" }}>Day-over-day percentage change in traded volume: (V_t - V_t-1) / V_t-1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
