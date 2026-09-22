import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";

interface ModelMetricsChartProps {
  metrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    roc_auc?: number | null;
    [key: string]: any;
  };
}

const METRIC_CONFIGS = [
  { key: "accuracy", name: "Accuracy", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  { key: "precision", name: "Precision", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { key: "recall", name: "Recall", color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
  { key: "f1", name: "F1 Score", color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
  { key: "roc_auc", name: "ROC-AUC", color: "#0D9488", bg: "#EFFBF9", border: "#99F6E4" },
];

export const ModelMetricsChart: React.FC<ModelMetricsChartProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">MODEL PERFORMANCE</span>
            <span className="card-subtitle">Test Set Evaluation Metrics</span>
          </div>
        </div>
        <div className="state-box">
          <div className="state-title">TEST METRICS UNAVAILABLE</div>
          <div className="state-desc">Model evaluation metrics are not available for this model.</div>
        </div>
      </div>
    );
  }

  const chartData = METRIC_CONFIGS.map((cfg) => {
    const val = metrics[cfg.key];
    return {
      name: cfg.name,
      value: val !== undefined && val !== null ? Number(val) : 0,
      color: cfg.color,
      bg: cfg.bg,
      border: cfg.border,
    };
  }).filter((d) => d.value > 0);

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title">MODEL PERFORMANCE</span>
          <span className="card-subtitle">Verified Evaluation Benchmark Across Metrics</span>
        </div>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
          Test Split Benchmark
        </span>
      </div>

      {/* Horizontal Bar Chart with Numeric Values Displayed Next to the Bars */}
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 65, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 1]}
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#475569"
              fontSize={12}
              fontWeight={600}
              fontFamily="var(--font-sans)"
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
              width={80}
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
              formatter={(val: any, _name: any, item: any) => [
                `${(Number(val) * 100).toFixed(2)}%`,
                item.payload.name,
              ]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={20}>
              <LabelList
                dataKey="value"
                position="right"
                formatter={(val: any) => `${(Number(val) * 100).toFixed(1)}%`}
                style={{ fill: "#0F172A", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700 }}
              />
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 5 Bottom Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: 10,
          marginTop: 12,
        }}
      >
        {chartData.map((d) => (
          <div
            key={d.name}
            style={{
              backgroundColor: d.bg,
              border: `1px solid ${d.border}`,
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}
          >
            <span style={{ color: "#64748B", display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
              {d.name}
            </span>
            <span style={{ color: d.color, fontWeight: 800, fontSize: 14, fontFamily: "var(--font-mono)" }}>
              {`${(d.value * 100).toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
