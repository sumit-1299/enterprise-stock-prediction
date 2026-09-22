import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { MarketDataPoint } from "../../types";

interface MovingAverageChartProps {
  data: MarketDataPoint[];
  symbol: string;
}

export const MovingAverageChart: React.FC<MovingAverageChartProps> = ({ data, symbol }) => {
  const recentData = data ? data.slice(-80) : [];

  if (!data || data.length === 0) {
    return (
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Trend Analysis</span>
            <span className="card-subtitle">{symbol} Moving Averages</span>
          </div>
        </div>
        <div className="state-box">
          <div className="state-title">Trend Data Unavailable</div>
          <div className="state-desc">Historical trend data is not available for {symbol}.</div>
        </div>
      </div>
    );
  }

  const prices = recentData.map((d) => d.close).filter((c): c is number => c !== null);
  const minPrice = prices.length ? Math.floor(Math.min(...prices) * 0.96) : 0;
  const maxPrice = prices.length ? Math.ceil(Math.max(...prices) * 1.04) : 100;

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title">Trend Analysis (Moving Averages)</span>
          <span className="card-subtitle">{symbol} Price vs SMA 10, SMA 20, SMA 50</span>
        </div>
      </div>

      <div style={{ width: "100%", height: 320 }}>
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
              domain={[minPrice, maxPrice]}
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickFormatter={(val) => `₹${val}`}
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
              formatter={(val: any, name?: any) => [
                val !== null && val !== undefined ? `₹${Number(val).toFixed(2)}` : "N/A",
                name ? String(name).toUpperCase() : "",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-mono)", paddingTop: 10 }} />
            <Line type="monotone" dataKey="close" name="Close Price" stroke="#0F172A" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="sma_10" name="SMA 10" stroke="#D97706" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="sma_20" name="SMA 20" stroke="#16A34A" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="sma_50" name="SMA 50" stroke="#7C3AED" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
