import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { MarketDataPoint } from "../../types";

interface VolumeChartProps {
  data: MarketDataPoint[];
  symbol: string;
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ data, symbol }) => {
  const recentData = useMemo(() => (data ? data.slice(-40) : []), [data]);

  const { avgVolume, maxVolume, latestVolume } = useMemo(() => {
    if (!recentData.length) {
      return { avgVolume: 0, maxVolume: 0, latestVolume: 0 };
    }
    const volList = recentData.map((d) => d.volume || 0);
    const sum = volList.reduce((acc, curr) => acc + curr, 0);
    const avg = Math.round(sum / volList.length);
    const max = Math.max(...volList);
    const latest = volList[volList.length - 1];
    return { avgVolume: avg, maxVolume: max, latestVolume: latest };
  }, [recentData]);

  if (!data || data.length === 0) {
    return (
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">MARKET VOLUME ANALYSIS</span>
            <span className="card-subtitle">{symbol} Historical Volume</span>
          </div>
        </div>
        <div className="state-box">
          <div className="state-title">Volume Data Unavailable</div>
          <div className="state-desc">Volume records are not available for {symbol}.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>MARKET VOLUME ANALYSIS</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#0D9488", background: "#EFFBF9", padding: "2px 8px", borderRadius: 4 }}>
              {symbol}
            </span>
          </span>
          <span className="card-subtitle">Daily Traded Shares & Liquidity Participation</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, fontFamily: "var(--font-mono)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: "#0D9488" }} />
            Normal Volume
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: "#0891B2" }} />
            Above Average
          </span>
        </div>
      </div>

      {/* Small KPI Row: Average Volume, Highest Volume, Latest Volume */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            backgroundColor: "#EFFBF9",
            border: "1px solid #99F6E4",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#0F766E", letterSpacing: "0.05em", display: "block" }}>
            Average Volume
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0D9488", marginTop: 2, display: "block" }}>
            {avgVolume > 0 ? avgVolume.toLocaleString() : "N/A"}
          </span>
        </div>

        <div
          style={{
            backgroundColor: "#ECFEFF",
            border: "1px solid #A5F3FC",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#0E7490", letterSpacing: "0.05em", display: "block" }}>
            Highest Volume
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0891B2", marginTop: 2, display: "block" }}>
            {maxVolume > 0 ? maxVolume.toLocaleString() : "N/A"}
          </span>
        </div>

        <div
          style={{
            backgroundColor: "#F0F6FF",
            border: "1px solid #BFDBFE",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#1D4ED8", letterSpacing: "0.05em", display: "block" }}>
            Latest Volume
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#2563EB", marginTop: 2, display: "block" }}>
            {latestVolume > 0 ? latestVolume.toLocaleString() : "N/A"}
          </span>
        </div>
      </div>

      <div style={{ width: "100%", height: 230 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={recentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickFormatter={(val) => {
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                return `${val}`;
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0].payload as MarketDataPoint;
                const isAboveAvg = (point.volume || 0) > avgVolume;
                return (
                  <div className="custom-chart-tooltip" style={{ minWidth: 160 }}>
                    <div className="tooltip-date">
                      {label ? new Date(label).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}
                    </div>
                    <div className="tooltip-price" style={{ color: "#0D9488" }}>
                      {point.volume ? point.volume.toLocaleString() : "0"} shares
                    </div>
                    <div style={{ fontSize: "10px", color: isAboveAvg ? "#0891B2" : "#64748B", fontWeight: 600, marginTop: 4 }}>
                      {isAboveAvg ? "▲ Above 40-day average" : "Normal trading session"}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="volume" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {recentData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={(entry.volume || 0) > avgVolume ? "#0891B2" : "#0D9488"}
                  opacity={0.88}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
