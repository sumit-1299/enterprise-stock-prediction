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
import { Layers } from "lucide-react";
import { MarketDataPoint } from "../../types";

interface InteractivePriceChartProps {
  data: MarketDataPoint[];
  symbol: string;
}

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y";
type ChartMode = "Close Price" | "OHLC" | "Candlestick";

interface MovingAverageToggles {
  sma10: boolean;
  sma20: boolean;
  sma50: boolean;
  ema12: boolean;
  ema26: boolean;
}

// Custom SVG shape for Candlestick rendering in Recharts
const CandlestickBar = (props: any) => {
  const { x, width, payload, yAxis } = props;
  if (!payload || payload.open === null || payload.close === null || payload.high === null || payload.low === null) {
    return null;
  }

  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? "#16A34A" : "#DC2626";

  if (!yAxis || !yAxis.scale) {
    return null;
  }

  const openY = yAxis.scale(open);
  const closeY = yAxis.scale(close);
  const highY = yAxis.scale(high);
  const lowY = yAxis.scale(low);

  const bodyY = Math.min(openY, closeY);
  const bodyHeight = Math.max(Math.abs(openY - closeY), 2);
  const candleWidth = Math.max(Math.min(width - 2, 14), 3);
  const candleX = x + (width - candleWidth) / 2;
  const wickX = x + width / 2;

  return (
    <g>
      {/* High-Low Wick */}
      <line
        x1={wickX}
        y1={highY}
        x2={wickX}
        y2={lowY}
        stroke={color}
        strokeWidth={1.2}
      />
      {/* Real Body */}
      <rect
        x={candleX}
        y={bodyY}
        width={candleWidth}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={1}
        rx={1}
      />
    </g>
  );
};

export const InteractivePriceChart: React.FC<InteractivePriceChartProps> = ({ data, symbol }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("3M");
  const [chartMode, setChartMode] = useState<ChartMode>("Close Price");
  const [maToggles, setMaToggles] = useState<MovingAverageToggles>({
    sma10: false,
    sma20: true,
    sma50: true,
    ema12: false,
    ema26: false,
  });

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

  // Compute 52-Week Statistics from full data array
  const priceStats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        latest: null,
        dayHigh: null,
        dayLow: null,
        high52w: null,
        low52w: null,
      };
    }

    const latestPoint = data[data.length - 1];
    const pastYearData = data.slice(-252);

    const highs = pastYearData.map((d) => d.high).filter((h): h is number => h !== null && !isNaN(h));
    const lows = pastYearData.map((d) => d.low).filter((l): l is number => l !== null && !isNaN(l));

    return {
      latest: latestPoint?.close ?? null,
      dayHigh: latestPoint?.high ?? null,
      dayLow: latestPoint?.low ?? null,
      high52w: highs.length ? Math.max(...highs) : null,
      low52w: lows.length ? Math.min(...lows) : null,
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="analytics-card" style={{ minHeight: 240, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Interactive Price Analysis</span>
            <span className="card-subtitle">{symbol} Historical Chart</span>
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

  const minPrice = lows.length ? Math.floor(Math.min(...lows) * 0.98) : prices.length ? Math.floor(Math.min(...prices) * 0.98) : 0;
  const maxPrice = highs.length ? Math.ceil(Math.max(...highs) * 1.02) : prices.length ? Math.ceil(Math.max(...prices) * 1.02) : 100;

  const toggleMA = (key: keyof MovingAverageToggles) => {
    setMaToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="analytics-card">
      {/* Header & Controls Toolbar */}
      <div className="card-header-row" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Interactive Price Analysis</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>
              {symbol}
            </span>
          </span>
          <span className="card-subtitle">
            {chartMode === "Close Price" && "Historical Close Price & Moving Average Overlays"}
            {chartMode === "OHLC" && "Open-High-Low-Close Dynamics & Trend Indicators"}
            {chartMode === "Candlestick" && "Japanese Candlestick Price Action & Technical Overlays"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Chart Mode Controls */}
          <div className="timeframe-controls">
            {(["Close Price", "OHLC", "Candlestick"] as ChartMode[]).map((mode) => (
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

          {/* Timeframe Controls */}
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

      {/* Price Statistics KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
          marginTop: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Latest Price</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
            {priceStats.latest !== null ? `₹${priceStats.latest.toFixed(2)}` : "N/A"}
          </div>
        </div>

        <div
          style={{
            padding: "8px 12px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Day High</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#16A34A" }}>
            {priceStats.dayHigh !== null ? `₹${priceStats.dayHigh.toFixed(2)}` : "N/A"}
          </div>
        </div>

        <div
          style={{
            padding: "8px 12px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Day Low</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#DC2626" }}>
            {priceStats.dayLow !== null ? `₹${priceStats.dayLow.toFixed(2)}` : "N/A"}
          </div>
        </div>

        <div
          style={{
            padding: "8px 12px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>52-Week High</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#2563EB" }}>
            {priceStats.high52w !== null ? `₹${priceStats.high52w.toFixed(2)}` : "N/A"}
          </div>
        </div>

        <div
          style={{
            padding: "8px 12px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>52-Week Low</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#7C3AED" }}>
            {priceStats.low52w !== null ? `₹${priceStats.low52w.toFixed(2)}` : "N/A"}
          </div>
        </div>
      </div>

      {/* Moving Average Overlay Toggles */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          padding: "8px 14px",
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 12,
        }}
      >
        <span style={{ fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
          <Layers size={14} /> Indicator Overlays:
        </span>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={maToggles.sma10}
            onChange={() => toggleMA("sma10")}
            style={{ accentColor: "#D97706", cursor: "pointer" }}
          />
          <span style={{ color: "#D97706", fontWeight: 600 }}>SMA 10</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={maToggles.sma20}
            onChange={() => toggleMA("sma20")}
            style={{ accentColor: "#16A34A", cursor: "pointer" }}
          />
          <span style={{ color: "#16A34A", fontWeight: 600 }}>SMA 20</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={maToggles.sma50}
            onChange={() => toggleMA("sma50")}
            style={{ accentColor: "#7C3AED", cursor: "pointer" }}
          />
          <span style={{ color: "#7C3AED", fontWeight: 600 }}>SMA 50</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={maToggles.ema12}
            onChange={() => toggleMA("ema12")}
            style={{ accentColor: "#0D9488", cursor: "pointer" }}
          />
          <span style={{ color: "#0D9488", fontWeight: 600 }}>EMA 12</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={maToggles.ema26}
            onChange={() => toggleMA("ema26")}
            style={{ accentColor: "#EA580C", cursor: "pointer" }}
          />
          <span style={{ color: "#EA580C", fontWeight: 600 }}>EMA 26</span>
        </label>
      </div>

      {/* Main Chart Area */}
      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === "Close Price" ? (
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="interPriceBlueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
                  <stop offset="60%" stopColor="#4F46E5" stopOpacity={0.10} />
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
              <Tooltip content={<CustomPriceTooltip />} />
              <Area
                type="monotone"
                dataKey="close"
                name="Close Price"
                stroke="#2563EB"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#interPriceBlueGradient)"
                isAnimationActive={false}
              />
              {maToggles.sma10 && (
                <Line type="monotone" dataKey="sma_10" name="SMA 10" stroke="#D97706" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              )}
              {maToggles.sma20 && (
                <Line type="monotone" dataKey="sma_20" name="SMA 20" stroke="#16A34A" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              )}
              {maToggles.sma50 && (
                <Line type="monotone" dataKey="sma_50" name="SMA 50" stroke="#7C3AED" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              )}
              {maToggles.ema12 && (
                <Line type="monotone" dataKey="ema_12" name="EMA 12" stroke="#0D9488" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
              )}
              {maToggles.ema26 && (
                <Line type="monotone" dataKey="ema_26" name="EMA 26" stroke="#EA580C" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
              )}
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
              <Tooltip content={<CustomPriceTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-mono)", paddingTop: 6 }} />
              <Line type="monotone" dataKey="high" name="High" stroke="#16A34A" strokeWidth={1.2} dot={false} strokeDasharray="3 3" isAnimationActive={false} />
              <Line type="monotone" dataKey="close" name="Close" stroke="#2563EB" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="low" name="Low" stroke="#DC2626" strokeWidth={1.2} dot={false} strokeDasharray="3 3" isAnimationActive={false} />
              <Line type="monotone" dataKey="open" name="Open" stroke="#64748B" strokeWidth={1.2} dot={false} isAnimationActive={false} />

              {maToggles.sma10 && (
                <Line type="monotone" dataKey="sma_10" name="SMA 10" stroke="#D97706" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              )}
              {maToggles.sma20 && (
                <Line type="monotone" dataKey="sma_20" name="SMA 20" stroke="#16A34A" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              )}
              {maToggles.sma50 && (
                <Line type="monotone" dataKey="sma_50" name="SMA 50" stroke="#7C3AED" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              )}
              {maToggles.ema12 && (
                <Line type="monotone" dataKey="ema_12" name="EMA 12" stroke="#0D9488" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
              )}
              {maToggles.ema26 && (
                <Line type="monotone" dataKey="ema_26" name="EMA 26" stroke="#EA580C" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
              )}
            </ComposedChart>
          ) : (
            /* Candlestick Mode */
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
              <Tooltip content={<CustomPriceTooltip />} />
              <Bar
                dataKey="close"
                name="Candlestick"
                shape={<CandlestickBar />}
                isAnimationActive={false}
              />

              {maToggles.sma10 && (
                <Line type="monotone" dataKey="sma_10" name="SMA 10" stroke="#D97706" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              )}
              {maToggles.sma20 && (
                <Line type="monotone" dataKey="sma_20" name="SMA 20" stroke="#16A34A" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              )}
              {maToggles.sma50 && (
                <Line type="monotone" dataKey="sma_50" name="SMA 50" stroke="#7C3AED" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              )}
              {maToggles.ema12 && (
                <Line type="monotone" dataKey="ema_12" name="EMA 12" stroke="#0D9488" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
              )}
              {maToggles.ema26 && (
                <Line type="monotone" dataKey="ema_26" name="EMA 26" stroke="#EA580C" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Custom Tooltip component
const CustomPriceTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload as MarketDataPoint;

  return (
    <div className="custom-chart-tooltip" style={{ minWidth: 180 }}>
      <div className="tooltip-date">
        {label ? new Date(label).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}
      </div>
      <div className="tooltip-price">
        Close: ₹{point.close !== null && point.close !== undefined ? point.close.toFixed(2) : "N/A"}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 10px",
          fontSize: "10px",
          color: "#475569",
          borderTop: "1px solid #E2E8F0",
          paddingTop: 6,
          marginBottom: 6,
        }}
      >
        <div>Open: <strong style={{ color: "#0F172A" }}>₹{point.open?.toFixed(2) ?? "—"}</strong></div>
        <div>High: <strong style={{ color: "#16A34A" }}>₹{point.high?.toFixed(2) ?? "—"}</strong></div>
        <div>Low: <strong style={{ color: "#DC2626" }}>₹{point.low?.toFixed(2) ?? "—"}</strong></div>
        <div>Vol: <strong style={{ color: "#0D9488" }}>{point.volume?.toLocaleString() ?? "—"}</strong></div>
      </div>

      {/* Active Moving Averages in Tooltip */}
      {(point.sma_10 || point.sma_20 || point.sma_50 || point.ema_12 || point.ema_26) && (
        <div
          style={{
            borderTop: "1px dashed #E2E8F0",
            paddingTop: 4,
            fontSize: "10px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2px 8px",
          }}
        >
          {point.sma_10 && <div>SMA 10: <strong style={{ color: "#D97706" }}>₹{point.sma_10.toFixed(2)}</strong></div>}
          {point.sma_20 && <div>SMA 20: <strong style={{ color: "#16A34A" }}>₹{point.sma_20.toFixed(2)}</strong></div>}
          {point.sma_50 && <div>SMA 50: <strong style={{ color: "#7C3AED" }}>₹{point.sma_50.toFixed(2)}</strong></div>}
          {point.ema_12 && <div>EMA 12: <strong style={{ color: "#0D9488" }}>₹{point.ema_12.toFixed(2)}</strong></div>}
          {point.ema_26 && <div>EMA 26: <strong style={{ color: "#EA580C" }}>₹{point.ema_26.toFixed(2)}</strong></div>}
        </div>
      )}
    </div>
  );
};
