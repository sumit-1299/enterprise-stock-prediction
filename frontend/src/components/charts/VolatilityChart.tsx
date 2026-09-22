import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Info } from "lucide-react";
import { MarketDataPoint } from "../../types";

interface VolatilityChartProps {
  data: MarketDataPoint[];
  symbol: string;
}

export const VolatilityChart: React.FC<VolatilityChartProps> = ({ data, symbol }) => {
  const recentData = useMemo(() => (data ? data.slice(-80) : []), [data]);

  const { latestVol, avgVol, maxVol, minVol } = useMemo(() => {
    if (!recentData.length) return { latestVol: null, avgVol: null, maxVol: null, minVol: null };

    const volValues = recentData
      .map((d) => d.volatility_20)
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

    if (!volValues.length) return { latestVol: null, avgVol: null, maxVol: null, minVol: null };

    const latest = volValues[volValues.length - 1];
    const avg = volValues.reduce((acc, v) => acc + v, 0) / volValues.length;
    const max = Math.max(...volValues);
    const min = Math.min(...volValues);

    return { latestVol: latest, avgVol: avg, maxVol: max, minVol: min };
  }, [recentData]);

  if (!data || data.length === 0) {
    return (
      <div className="analytics-card" style={{ minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">20-Day Statistical Volatility</span>
            <span className="card-subtitle">{symbol} Rolling Standard Deviation</span>
          </div>
        </div>
        <div className="state-box" style={{ padding: "32px 16px" }}>
          <div className="state-title" style={{ fontSize: 14 }}>Volatility Data Unavailable</div>
          <div className="state-desc" style={{ fontSize: 12 }}>
            Statistical volatility observations are not available for {symbol}.
          </div>
        </div>
      </div>
    );
  }

  const yDomainMax = maxVol ? Math.ceil(maxVol * 1.2 * 100) / 100 : 0.05;

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>20-Day Statistical Volatility</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>
              {symbol}
            </span>
          </span>
          <span className="card-subtitle">
            Historical 20-day rolling standard deviation of daily log/percentage price returns
          </span>
        </div>
      </div>

      {/* Volatility KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
          marginTop: 10,
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
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Current Volatility</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#7C3AED" }}>
            {latestVol !== null ? `${(latestVol * 100).toFixed(2)}%` : "N/A"}
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
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Average Volatility</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#2563EB" }}>
            {avgVol !== null ? `${(avgVol * 100).toFixed(2)}%` : "N/A"}
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
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Maximum Volatility</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#DC2626" }}>
            {maxVol !== null ? `${(maxVol * 100).toFixed(2)}%` : "N/A"}
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
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Minimum Volatility</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#16A34A" }}>
            {minVol !== null ? `${(minVol * 100).toFixed(2)}%` : "N/A"}
          </div>
        </div>
      </div>

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={recentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
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
              domain={[0, yDomainMax]}
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickFormatter={(val) => `${(val * 100).toFixed(1)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E2E8F0",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "#0F172A",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
              }}
              labelFormatter={(val: any) => (val ? `Date: ${new Date(val).toLocaleDateString()}` : "")}
              formatter={(val: any) => [
                val !== null && val !== undefined ? `${(Number(val) * 100).toFixed(2)}%` : "N/A",
                "20D Volatility",
              ]}
            />
            <Area
              type="monotone"
              dataKey="volatility_20"
              name="20D Volatility"
              stroke="#7C3AED"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#volGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 11, color: "#64748B" }}>
        <Info size={13} style={{ color: "#7C3AED", flexShrink: 0 }} />
        <span>
          <strong>Quantitative Definition:</strong> 20-day historical volatility measures the dispersion of daily returns around their mean over a rolling 20-session window (\(\sigma_{20}\)). Higher values denote regime turbulence or expanding price risk; lower values indicate consolidation.
        </span>
      </div>
    </div>
  );
};
