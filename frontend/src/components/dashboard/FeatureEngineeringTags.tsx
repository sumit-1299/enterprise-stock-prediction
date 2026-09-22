import React from "react";

const FEATURES = [
  { name: "return_1d", desc: "1-day price return" },
  { name: "return_5d", desc: "5-day price return" },
  { name: "sma_10", desc: "10-day simple moving avg" },
  { name: "sma_20", desc: "20-day simple moving avg" },
  { name: "sma_50", desc: "50-day simple moving avg" },
  { name: "ema_12", desc: "12-day exponential MA" },
  { name: "ema_26", desc: "26-day exponential MA" },
  { name: "macd", desc: "MACD momentum spread" },
  { name: "macd_signal", desc: "MACD 9-day signal line" },
  { name: "rsi_14", desc: "14-day relative strength index" },
  { name: "volatility_20", desc: "20-day rolling return volatility" },
  { name: "volume_change", desc: "Day-over-day volume delta" },
];

export const FeatureEngineeringTags: React.FC = () => {
  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title">Feature Engineering</span>
          <span className="card-subtitle">
            Technical and momentum features used by the inference model.
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {FEATURES.map((f) => (
          <div
            key={f.name}
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 13,
                color: "var(--accent-primary)",
              }}
            >
              {f.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

