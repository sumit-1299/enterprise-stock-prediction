import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { MarketDataPoint } from "../../types";

interface RSIChartProps {
  data: MarketDataPoint[];
  symbol: string;
}

export const RSIChart: React.FC<RSIChartProps> = ({ data, symbol }) => {
  const recentData = data ? data.slice(-80) : [];
  const rawRSI = recentData.length ? recentData[recentData.length - 1].rsi_14 : null;
  const latestRSI = rawRSI !== null && rawRSI !== undefined ? Number(rawRSI) : null;

  if (!data || data.length === 0) {
    return (
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Relative Strength Index (RSI 14)</span>
            <span className="card-subtitle">{symbol} Momentum Oscillator</span>
          </div>
        </div>
        <div className="state-box">
          <div className="state-title">RSI Data Unavailable</div>
          <div className="state-desc">RSI indicators are not available for {symbol}.</div>
        </div>
      </div>
    );
  }

  // Determine color and zone label strictly from actual value
  let rsiColor = "#2563EB";
  let rsiZone = "Neutral (30–70)";
  let rsiBadgeBg = "#EFF6FF";
  let rsiBorder = "#BFDBFE";

  if (latestRSI !== null) {
    if (latestRSI <= 30) {
      rsiColor = "#16A34A"; // Green (Oversold - potential bounce)
      rsiZone = "Oversold (≤ 30)";
      rsiBadgeBg = "#DCFCE7";
      rsiBorder = "#86EFAC";
    } else if (latestRSI >= 70) {
      rsiColor = "#DC2626"; // Red (Overbought - potential pullback)
      rsiZone = "Overbought (≥ 70)";
      rsiBadgeBg = "#FEE2E2";
      rsiBorder = "#FCA5A5";
    } else {
      rsiColor = "#EA580C"; // Orange / Neutral
      rsiZone = "Neutral (30–70)";
      rsiBadgeBg = "#FFEDD5";
      rsiBorder = "#FED7AA";
    }
  }

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>RSI MOMENTUM GAUGE</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", background: "#F6F1FF", padding: "2px 8px", borderRadius: 4 }}>
              {symbol}
            </span>
          </span>
          <span className="card-subtitle">14-Period Relative Strength Index & Technical Thresholds</span>
        </div>
        {latestRSI !== null && (
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: rsiColor,
              backgroundColor: rsiBadgeBg,
              border: `1px solid ${rsiBorder}`,
              padding: "3px 10px",
              borderRadius: "9999px",
              fontWeight: 700,
            }}
          >
            {rsiZone}
          </span>
        )}
      </div>

      {/* Horizontal Visual Gauge */}
      <div
        style={{
          backgroundColor: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: "var(--radius-sm)",
          padding: "16px 20px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 11, color: "#64748B", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Current RSI Value
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)", color: rsiColor, lineHeight: 1.2 }}>
              {latestRSI !== null ? latestRSI.toFixed(2) : "N/A"}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, fontFamily: "var(--font-mono)", color: "#64748B" }}>
            <div>Scale: 0 — 100</div>
            <div style={{ color: rsiColor, fontWeight: 700 }}>{latestRSI !== null ? rsiZone : "Value Unavailable"}</div>
          </div>
        </div>

        {/* Gauge Track */}
        <div style={{ position: "relative", height: 12, backgroundColor: "#E2E8F0", borderRadius: 6, overflow: "hidden", display: "flex" }}>
          <div style={{ width: "30%", backgroundColor: "#BBF7D0" }} title="Oversold Zone (0-30)" />
          <div style={{ width: "40%", backgroundColor: "#FED7AA" }} title="Neutral Zone (30-70)" />
          <div style={{ width: "30%", backgroundColor: "#FECDD3" }} title="Overbought Zone (70-100)" />
        </div>

        {/* Needle Indicator */}
        {latestRSI !== null && (
          <div style={{ position: "relative", height: 16, marginTop: 4 }}>
            <div
              style={{
                position: "absolute",
                left: `${Math.max(0, Math.min(100, latestRSI))}%`,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: `6px solid ${rsiColor}` }} />
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 800, color: rsiColor }}>
                {latestRSI.toFixed(1)}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--font-mono)", color: "#64748B", marginTop: 4 }}>
          <span>0 (Oversold)</span>
          <span>30</span>
          <span>50 (Midline)</span>
          <span>70</span>
          <span>100 (Overbought)</span>
        </div>
      </div>

      {/* Historical RSI Trend Line Chart */}
      <div style={{ width: "100%", height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={recentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="timestamp"
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              minTickGap={25}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              ticks={[20, 30, 50, 70, 80]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E2E8F0",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "#0F172A",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.08)",
              }}
              labelFormatter={(val: any) => (val ? `Date: ${new Date(val).toLocaleDateString()}` : "")}
              formatter={(val: any) => [val !== null && val !== undefined ? Number(val).toFixed(2) : "N/A", "RSI (14)"]}
            />
            <ReferenceLine y={70} stroke="#DC2626" strokeDasharray="3 3" label={{ value: "70", fill: "#DC2626", fontSize: 10 }} />
            <ReferenceLine y={30} stroke="#16A34A" strokeDasharray="3 3" label={{ value: "30", fill: "#16A34A", fontSize: 10 }} />
            <ReferenceLine y={50} stroke="#94A3B8" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="rsi_14"
              stroke="#7C3AED"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
