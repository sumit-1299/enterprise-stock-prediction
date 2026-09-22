import React from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
  Cell,
} from "recharts";
import { MarketDataPoint } from "../../types";

interface MACDChartProps {
  data: MarketDataPoint[];
  symbol: string;
}

export const MACDChart: React.FC<MACDChartProps> = ({ data, symbol }) => {
  const recentData = data ? data.slice(-80) : [];

  if (!data || data.length === 0) {
    return (
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">MACD MOMENTUM & HISTOGRAM</span>
            <span className="card-subtitle">{symbol} MACD, Signal & Divergence</span>
          </div>
        </div>
        <div className="state-box">
          <div className="state-title">MACD Data Unavailable</div>
          <div className="state-desc">MACD series data is not available for {symbol}.</div>
        </div>
      </div>
    );
  }

  // Derive histogram from actual macd and macd_signal values
  const chartData = recentData.map((d) => {
    const macd = d.macd !== null && d.macd !== undefined ? Number(d.macd) : null;
    const signal = d.macd_signal !== null && d.macd_signal !== undefined ? Number(d.macd_signal) : null;
    const hist = macd !== null && signal !== null ? Number((macd - signal).toFixed(4)) : null;
    return {
      timestamp: d.timestamp,
      macd,
      macd_signal: signal,
      histogram: hist,
    };
  });

  const latestPoint = chartData.length ? chartData[chartData.length - 1] : null;

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>MACD MOMENTUM & HISTOGRAM</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>
              {symbol}
            </span>
          </span>
          <span className="card-subtitle">
            Moving Average Convergence Divergence • MACD (Blue), Signal (Purple), Histogram (Green/Red)
          </span>
        </div>

        {/* Latest Metric Summary */}
        {latestPoint && latestPoint.macd !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, fontFamily: "var(--font-mono)" }}>
            <span>
              MACD: <strong style={{ color: "#2563EB" }}>{latestPoint.macd.toFixed(2)}</strong>
            </span>
            <span>
              Signal: <strong style={{ color: "#7C3AED" }}>{latestPoint.macd_signal?.toFixed(2) ?? "N/A"}</strong>
            </span>
            <span>
              Hist:{" "}
              <strong style={{ color: (latestPoint.histogram ?? 0) >= 0 ? "#16A34A" : "#DC2626" }}>
                {latestPoint.histogram !== null ? `${latestPoint.histogram >= 0 ? "+" : ""}${latestPoint.histogram.toFixed(2)}` : "N/A"}
              </strong>
            </span>
          </div>
        )}
      </div>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
            <YAxis stroke="#64748B" fontSize={11} fontFamily="var(--font-mono)" />
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
              formatter={(val: any, name?: any) => [
                val !== null && val !== undefined ? Number(val).toFixed(2) : "N/A",
                name ? String(name).toUpperCase() : "",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-mono)", paddingTop: 10 }} />
            <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="2 2" />
            <Bar dataKey="histogram" name="Histogram" isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`hist-${index}`}
                  fill={(entry.histogram ?? 0) >= 0 ? "#16A34A" : "#DC2626"}
                  opacity={0.7}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="macd"
              name="MACD Line"
              stroke="#2563EB"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="macd_signal"
              name="Signal Line"
              stroke="#7C3AED"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
