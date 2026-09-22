import React, { useMemo } from "react";
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
import { Clock } from "lucide-react";
import { PredictionHistoryItem } from "../../types";

interface PredictionHistoryChartProps {
  history: PredictionHistoryItem[];
  symbol: string;
}

export const PredictionHistoryChart: React.FC<PredictionHistoryChartProps> = ({
  history,
  symbol,
}) => {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const sorted = [...history].sort(
      (a, b) => new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime()
    );

    return sorted.map((item) => {
      const upProb =
        item.probabilities?.UP !== undefined
          ? item.probabilities.UP * 100
          : item.prediction === "UP"
          ? item.probability * 100
          : (1 - item.probability) * 100;

      return {
        timestamp: item.generated_at,
        up_probability: Math.round(upProb * 100) / 100,
        prediction: item.prediction,
        model_version: item.model_version,
        price: item.market_price,
      };
    });
  }, [history]);

  if (!history || chartData.length < 2) {
    return (
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">PREDICTION PROBABILITY OVER TIME</span>
            <span className="card-subtitle">{symbol} • Historical Model UP Probability Trajectory</span>
          </div>
        </div>
        <div className="state-box" style={{ padding: "32px 16px" }}>
          <Clock size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
          <div className="state-title" style={{ fontSize: 14, fontWeight: 700 }}>
            INSUFFICIENT PREDICTION HISTORY
          </div>
          <div className="state-desc" style={{ maxWidth: 460 }}>
            At least 2 historical prediction records are required to plot the directional probability trajectory.
            Currently {chartData.length} record is persisted for {symbol}. As additional predictions are recorded across trading sessions, the probability trend will plot here.
          </div>
        </div>
      </div>
    );
  }

  const latestProb = chartData[chartData.length - 1].up_probability;

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title">PREDICTION PROBABILITY OVER TIME</span>
          <span className="card-subtitle">
            {symbol} • Latest UP Probability:{" "}
            <strong
              style={{
                color: latestProb >= 50 ? "var(--color-up)" : "var(--color-down)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {latestProb.toFixed(2)}%
            </strong>{" "}
            ({latestProb >= 50 ? "BULLISH BIAS" : "BEARISH BIAS"})
          </span>
        </div>
      </div>

      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="timestamp"
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
              }}
              minTickGap={30}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <ReferenceLine
              y={50}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              label={{ value: "50% Baseline", fill: "#64748B", fontSize: 10, position: "insideBottomRight" }}
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
              labelFormatter={(val: any) =>
                val
                  ? new Date(val).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      hour12: false,
                    }) + " IST"
                  : ""
              }
              formatter={(val: any) => [`${Number(val).toFixed(2)}%`, "UP Probability"]}
            />
            <Line
              type="monotone"
              dataKey="up_probability"
              name="UP Probability"
              stroke="var(--color-up)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-up)" }}
              activeDot={{ r: 5, fill: "#fff", stroke: "var(--color-up)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
