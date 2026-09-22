import React from "react";
import {
  Activity,
  TrendingUp,
  BarChart3,
  ShieldAlert,
  Sliders,
  Layers,
  Cpu,
  ArrowRight,
  Database,
} from "lucide-react";
import { MarketDataPoint } from "../types";
import { MovingAverageChart } from "../components/charts/MovingAverageChart";
import { RSIChart } from "../components/charts/RSIChart";
import { MACDChart } from "../components/charts/MACDChart";
import { VolumeChart } from "../components/charts/VolumeChart";
import { VolatilityChart } from "../components/charts/VolatilityChart";

interface TechnicalAnalysisProps {
  currentSymbol: string;
  marketData: MarketDataPoint[];
}

export const TechnicalAnalysis: React.FC<TechnicalAnalysisProps> = ({
  currentSymbol,
  marketData,
}) => {
  const latest = marketData.length > 0 ? marketData[marketData.length - 1] : null;

  const dataTimestamp = latest?.timestamp
    ? new Date(latest.timestamp).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " IST"
    : "Data unavailable";

  // 10 Specific Indicator Cards with assigned colorful fintech palette
  const INDICATOR_CARDS = [
    {
      name: "RSI (14)",
      value: latest?.rsi_14 !== undefined && latest.rsi_14 !== null ? latest.rsi_14.toFixed(2) : "N/A",
      explanation: "14-period momentum oscillator measuring velocity of price movements",
      color: "#7C3AED",
      bg: "#F5F3FF",
      border: "#DDD6FE",
    },
    {
      name: "SMA 10",
      value: latest?.sma_10 ? `₹${latest.sma_10.toFixed(2)}` : "N/A",
      explanation: "10-period simple moving average for short-term trend direction",
      color: "#0D9488",
      bg: "#EFFBF9",
      border: "#99F6E4",
    },
    {
      name: "SMA 20",
      value: latest?.sma_20 ? `₹${latest.sma_20.toFixed(2)}` : "N/A",
      explanation: "20-period simple moving average tracking intermediate price trend",
      color: "#0D9488",
      bg: "#EFFBF9",
      border: "#99F6E4",
    },
    {
      name: "SMA 50",
      value: latest?.sma_50 ? `₹${latest.sma_50.toFixed(2)}` : "N/A",
      explanation: "50-period simple moving average establishing medium-term baseline",
      color: "#0D9488",
      bg: "#EFFBF9",
      border: "#99F6E4",
    },
    {
      name: "EMA 12",
      value: latest?.ema_12 ? `₹${latest.ema_12.toFixed(2)}` : "N/A",
      explanation: "12-period exponential moving average emphasizing recent closes",
      color: "#4F46E5",
      bg: "#EEF2FF",
      border: "#C7D2FE",
    },
    {
      name: "EMA 26",
      value: latest?.ema_26 ? `₹${latest.ema_26.toFixed(2)}` : "N/A",
      explanation: "26-period exponential moving average slower trend filter",
      color: "#4F46E5",
      bg: "#EEF2FF",
      border: "#C7D2FE",
    },
    {
      name: "MACD",
      value: latest?.macd !== undefined && latest.macd !== null ? latest.macd.toFixed(2) : "N/A",
      explanation: "Difference between 12 EMA and 26 EMA momentum indicators",
      color: "#2563EB",
      bg: "#EFF6FF",
      border: "#BFDBFE",
    },
    {
      name: "MACD Signal",
      value: latest?.macd_signal !== undefined && latest.macd_signal !== null ? latest.macd_signal.toFixed(2) : "N/A",
      explanation: "9-period exponential moving average of the MACD line",
      color: "#2563EB",
      bg: "#EFF6FF",
      border: "#BFDBFE",
    },
    {
      name: "20D Volatility",
      value: latest?.volatility_20 !== undefined && latest.volatility_20 !== null ? `${(latest.volatility_20 * 100).toFixed(2)}%` : "N/A",
      explanation: "Statistical standard deviation of 1-day returns over a 20-day rolling window",
      color: "#EA580C",
      bg: "#FFF7ED",
      border: "#FED7AA",
    },
    {
      name: "Volume Change",
      value: latest?.volume_change !== undefined && latest.volume_change !== null
        ? `${latest.volume_change >= 0 ? "+" : ""}${(latest.volume_change * 100).toFixed(2)}%`
        : "N/A",
      explanation: "Day-over-day percentage change in equity share trading volume",
      color: "#0891B2",
      bg: "#ECFEFF",
      border: "#A5F3FC",
    },
  ];

  // 12 Model Features Matrix required by Section 18 & 20
  const FEATURE_MATRIX = [
    { name: "return_1d", label: "1-Day Return", value: latest?.return_1d !== undefined && latest.return_1d !== null ? `${(latest.return_1d * 100).toFixed(2)}%` : "N/A", source: "PostgreSQL close_price pct_change(1)" },
    { name: "return_5d", label: "5-Day Return", value: latest?.return_5d !== undefined && latest.return_5d !== null ? `${(latest.return_5d * 100).toFixed(2)}%` : "N/A", source: "PostgreSQL close_price pct_change(5)" },
    { name: "sma_10", label: "SMA 10", value: latest?.sma_10 ? `₹${latest.sma_10.toFixed(2)}` : "N/A", source: "10-day rolling arithmetic mean" },
    { name: "sma_20", label: "SMA 20", value: latest?.sma_20 ? `₹${latest.sma_20.toFixed(2)}` : "N/A", source: "20-day rolling arithmetic mean" },
    { name: "sma_50", label: "SMA 50", value: latest?.sma_50 ? `₹${latest.sma_50.toFixed(2)}` : "N/A", source: "50-day rolling arithmetic mean" },
    { name: "ema_12", label: "EMA 12", value: latest?.ema_12 ? `₹${latest.ema_12.toFixed(2)}` : "N/A", source: "12-day exponential weighted moving average" },
    { name: "ema_26", label: "EMA 26", value: latest?.ema_26 ? `₹${latest.ema_26.toFixed(2)}` : "N/A", source: "26-day exponential weighted moving average" },
    { name: "macd", label: "MACD Line", value: latest?.macd !== undefined && latest.macd !== null ? latest.macd.toFixed(2) : "N/A", source: "ema_12 - ema_26 divergence" },
    { name: "macd_signal", label: "MACD Signal", value: latest?.macd_signal !== undefined && latest.macd_signal !== null ? latest.macd_signal.toFixed(2) : "N/A", source: "9-day exponential moving average of MACD" },
    { name: "rsi_14", label: "RSI 14", value: latest?.rsi_14 !== undefined && latest.rsi_14 !== null ? latest.rsi_14.toFixed(2) : "N/A", source: "14-day relative strength momentum formula" },
    { name: "volatility_20", label: "20D Volatility", value: latest?.volatility_20 !== undefined && latest.volatility_20 !== null ? `${(latest.volatility_20 * 100).toFixed(2)}%` : "N/A", source: "20-day rolling standard deviation of returns" },
    { name: "volume_change", label: "Volume Change", value: latest?.volume_change !== undefined && latest.volume_change !== null ? `${(latest.volume_change * 100).toFixed(2)}%` : "N/A", source: "volume pct_change(1)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Module Header */}
      <div className="analytics-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="status-pill online" style={{ padding: "2px 8px", fontSize: 10 }}>
                Data-Driven Intelligence
              </span>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                Module: /technical
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: "4px 0" }}>
              TECHNICAL INTELLIGENCE
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              Quantitative market indicators derived from historical price and volume data using FeatureEngineeringService.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            <div style={{ background: "var(--bg-tertiary)", padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10 }}>SELECTED SYMBOL</span>
              <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{currentSymbol}</span>
            </div>
            <div style={{ background: "var(--bg-tertiary)", padding: "8px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10 }}>DATA TIMESTAMP</span>
              <span style={{ fontWeight: 700, color: "var(--accent-secondary)", fontSize: 13 }}>{dataTimestamp}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Indicator KPI Grid (Section 12) */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Quantitative Indicator Matrix</span>
            <span className="card-subtitle">Real-time indicators calculated from the underlying time-series</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {INDICATOR_CARDS.map((card) => (
            <div
              key={card.name}
              style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
                borderRadius: "var(--radius-sm)",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: "#475569", fontWeight: 700, display: "block" }}>
                  {card.name}
                </span>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: card.color,
                    margin: "4px 0",
                  }}
                >
                  {card.value}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>
                {card.explanation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Section 13: Large Price & Moving Averages Chart */}
      <MovingAverageChart data={marketData} symbol={currentSymbol} />

      {/* 4. Section 14 & 15: RSI & MACD Momentum Charts */}
      <div className="dashboard-grid-equal">
        <RSIChart data={marketData} symbol={currentSymbol} />
        <MACDChart data={marketData} symbol={currentSymbol} />
      </div>

      {/* 5. Section 16 & 17: Volume Analysis & Volatility Analysis */}
      <div className="dashboard-grid-equal">
        <VolumeChart data={marketData} symbol={currentSymbol} />
        <VolatilityChart data={marketData} symbol={currentSymbol} />
      </div>

      {/* 6. Section 19: How the Model Sees the Market (Visual Pipeline Flow) */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">HOW THE MODEL SEES THE MARKET</span>
            <span className="card-subtitle">End-to-end transformation from raw ticks to machine learning inference</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: "16px 0",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {[
            { label: "RAW MARKET DATA", desc: "PostgreSQL ticks", icon: Database },
            { label: "OHLCV", desc: "Price bars", icon: BarChart3 },
            { label: "RETURNS", desc: "1D & 5D deltas", icon: TrendingUp },
            { label: "MOVING AVERAGES", desc: "SMA & EMA", icon: Activity },
            { label: "MOMENTUM", desc: "RSI & MACD", icon: Sliders },
            { label: "VOLATILITY", desc: "20D rolling std", icon: ShieldAlert },
            { label: "MODEL FEATURES", desc: "12 feature vector", icon: Layers },
            { label: "XGBOOST CLASSIFIER", desc: "Gradient boosting", icon: Cpu },
            { label: "UP / DOWN PREDICTION", desc: "Directional forecast", icon: TrendingUp },
          ].map((step, idx, arr) => {
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.label}>
                <div
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 14px",
                    textAlign: "center",
                    flex: "1 1 110px",
                    minWidth: 110,
                  }}
                >
                  <StepIcon size={16} style={{ color: "var(--accent-primary)", margin: "0 auto 6px" }} />
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 10 }}>{step.label}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 9, marginTop: 2 }}>{step.desc}</div>
                </div>
                {idx < arr.length - 1 && (
                  <ArrowRight size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 7. Section 18 & 20: Technical Feature Matrix & Model Input Features */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">TECHNICAL FEATURE MATRIX & MODEL INPUTS</span>
            <span className="card-subtitle">
              Audit-ready specification of the 12 input features evaluated by the XGBoost classifier
            </span>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>FEATURE NAME</th>
                <th>LABEL</th>
                <th>CURRENT VALUE</th>
                <th>CALCULATION SOURCE & METHODOLOGY</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map((feat) => (
                <tr key={feat.name}>
                  <td style={{ fontWeight: 700, color: "var(--accent-secondary)", fontFamily: "var(--font-mono)" }}>
                    {feat.name}
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{feat.label}</td>
                  <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {feat.value}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{feat.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
