import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { MarketDataPoint } from "../../types";

interface PriceChartProps {
  data: MarketDataPoint[];
  symbol: string;
}

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y";
type ChartMode = "Close Price" | "OHLC" | "Volume";

export const PriceChart: React.FC<PriceChartProps> = ({ data, symbol }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("3M");
  const [chartMode, setChartMode] = useState<ChartMode>("Close Price");

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    switch (timeframe) {
      case "1D":
        return data.slice(-1);
      case "5D":
        return data.slice(-5);
      case "1M":
        return data.slice(-22);
      case "3M":
        return data.slice(-66);
      case "6M":
        return data.slice(-132);
      case "1Y":
      default:
        return data.slice(-252);
    }
  }, [data, timeframe]);

  if (!data || data.length === 0) {
    return (
      <div className="analytics-card" style={{ minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Market Price History</span>
            <span className="card-subtitle">{symbol} Historical Close Trend</span>
          </div>
        </div>
        <div className="state-box" style={{ padding: "32px 16px" }}>
          <div className="state-title" style={{ fontSize: 14 }}>No historical data available</div>
          <div className="state-desc" style={{ fontSize: 12 }}>
            Historical market observations for {symbol} have not yet been ingested into the database.
          </div>
        </div>
      </div>
    );
  }

  const prices = filteredData.map((d) => d.close).filter((c): c is number => c !== null);
  const highs = filteredData.map((d) => d.high).filter((c): c is number => c !== null);
  const lows = filteredData.map((d) => d.low).filter((c): c is number => c !== null);
  const volumes = filteredData.map((d) => d.volume).filter((v): v is number => v !== null);

  const minPrice = lows.length ? Math.floor(Math.min(...lows) * 0.98) : prices.length ? Math.floor(Math.min(...prices) * 0.98) : 0;
  const maxPrice = highs.length ? Math.ceil(Math.max(...highs) * 1.02) : prices.length ? Math.ceil(Math.max(...prices) * 1.02) : 100;
  const maxVolume = volumes.length ? Math.max(...volumes) : 1000;

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Market Price History</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>
              {symbol}
            </span>
          </span>
          <span className="card-subtitle">
            {chartMode === "Close Price" && "Historical Daily Close & Trend Area"}
            {chartMode === "OHLC" && "Multi-Series Open, High, Low, Close Dynamics"}
            {chartMode === "Volume" && "Integrated Price Action & Trading Volume"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Chart Options: Close Price / OHLC / Volume */}
          <div className="timeframe-controls">
            {(["Close Price", "OHLC", "Volume"] as ChartMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`timeframe-btn ${chartMode === mode ? "active" : ""}`}
                onClick={() => setChartMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Timeframe Controls: 1D, 5D, 1M, 3M, 6M, 1Y */}
          <div className="timeframe-controls">
            {(["1D", "5D", "1M", "3M", "6M", "1Y"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                className={`timeframe-btn ${timeframe === tf ? "active" : ""}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === "Close Price" ? (
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="priceBlueIndigoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
                  <stop offset="60%" stopColor="#4F46E5" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
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
                domain={[minPrice, maxPrice]}
                stroke="#64748B"
                fontSize={11}
                fontFamily="var(--font-mono)"
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const point = payload[0].payload as MarketDataPoint;
                  return (
                    <div className="custom-chart-tooltip" style={{ minWidth: 160 }}>
                      <div className="tooltip-date">
                        {label ? new Date(label).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}
                      </div>
                      <div className="tooltip-price">
                        ₹{point.close !== null && point.close !== undefined ? point.close.toFixed(2) : "N/A"}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px", fontSize: "10px", color: "#475569", borderTop: "1px solid #E2E8F0", paddingTop: 6 }}>
                        {point.open !== null && point.open !== undefined && (
                          <div>Open: <strong style={{ color: "#0F172A" }}>₹{point.open.toFixed(2)}</strong></div>
                        )}
                        {point.high !== null && point.high !== undefined && (
                          <div>High: <strong style={{ color: "#16A34A" }}>₹{point.high.toFixed(2)}</strong></div>
                        )}
                        {point.low !== null && point.low !== undefined && (
                          <div>Low: <strong style={{ color: "#DC2626" }}>₹{point.low.toFixed(2)}</strong></div>
                        )}
                        {point.volume !== null && point.volume !== undefined && (
                          <div>Vol: <strong style={{ color: "#0D9488" }}>{point.volume.toLocaleString()}</strong></div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                name="Close Price"
                stroke="#2563EB"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#priceBlueIndigoGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          ) : chartMode === "OHLC" ? (
            <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                domain={[minPrice, maxPrice]}
                stroke="#64748B"
                fontSize={11}
                fontFamily="var(--font-mono)"
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const point = payload[0].payload as MarketDataPoint;
                  return (
                    <div className="custom-chart-tooltip" style={{ minWidth: 160 }}>
                      <div className="tooltip-date">
                        {label ? new Date(label).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}
                      </div>
                      <div className="tooltip-price">
                        Close: ₹{point.close !== null && point.close !== undefined ? point.close.toFixed(2) : "N/A"}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px", fontSize: "10px", color: "#475569", borderTop: "1px solid #E2E8F0", paddingTop: 6 }}>
                        <div>Open: <strong style={{ color: "#0F172A" }}>₹{point.open?.toFixed(2) ?? "—"}</strong></div>
                        <div>High: <strong style={{ color: "#16A34A" }}>₹{point.high?.toFixed(2) ?? "—"}</strong></div>
                        <div>Low: <strong style={{ color: "#DC2626" }}>₹{point.low?.toFixed(2) ?? "—"}</strong></div>
                        <div>Vol: <strong style={{ color: "#0D9488" }}>{point.volume?.toLocaleString() ?? "—"}</strong></div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-mono)", paddingTop: 6 }} />
              <Line type="monotone" dataKey="high" name="High" stroke="#16A34A" strokeWidth={1.5} dot={false} strokeDasharray="3 3" isAnimationActive={false} />
              <Line type="monotone" dataKey="close" name="Close" stroke="#2563EB" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="low" name="Low" stroke="#DC2626" strokeWidth={1.5} dot={false} strokeDasharray="3 3" isAnimationActive={false} />
              <Line type="monotone" dataKey="open" name="Open" stroke="#64748B" strokeWidth={1.2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          ) : (
            <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                yAxisId="price"
                domain={[minPrice, maxPrice]}
                stroke="#2563EB"
                fontSize={11}
                fontFamily="var(--font-mono)"
                tickFormatter={(val) => `₹${val}`}
              />
              <YAxis
                yAxisId="volume"
                orientation="right"
                domain={[0, maxVolume * 3]}
                stroke="#0D9488"
                fontSize={11}
                fontFamily="var(--font-mono)"
                tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}K`)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const point = payload[0].payload as MarketDataPoint;
                  return (
                    <div className="custom-chart-tooltip" style={{ minWidth: 160 }}>
                      <div className="tooltip-date">
                        {label ? new Date(label).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}
                      </div>
                      <div className="tooltip-price">
                        Close: ₹{point.close?.toFixed(2) ?? "N/A"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#0D9488", fontWeight: 700, marginTop: 4 }}>
                        Volume: {point.volume?.toLocaleString() ?? "0"}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-mono)", paddingTop: 6 }} />
              <Bar yAxisId="volume" dataKey="volume" name="Traded Volume" fill="#0D9488" opacity={0.35} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Line yAxisId="price" type="monotone" dataKey="close" name="Close Price" stroke="#2563EB" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
