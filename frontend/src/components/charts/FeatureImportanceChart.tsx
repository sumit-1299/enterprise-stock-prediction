import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";
import { BrainCircuit } from "lucide-react";
import { ModelFeatureImportanceItem } from "../../types";

interface FeatureImportanceChartProps {
  importance?: Record<string, number> | ModelFeatureImportanceItem[];
}

export const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({ importance }) => {
  let chartData: { name: string; weight: number; percentage: string }[] = [];

  if (Array.isArray(importance) && importance.length > 0) {
    chartData = [...importance]
      .sort((a, b) => b.importance - a.importance)
      .map((item) => ({
        name: item.feature,
        weight: item.importance,
        percentage: `${(item.importance * 100).toFixed(1)}%`,
      }));
  } else if (importance && typeof importance === "object" && Object.keys(importance).length > 0) {
    chartData = Object.entries(importance)
      .map(([name, weight]) => ({
        name,
        weight: Number(weight),
        percentage: `${(Number(weight) * 100).toFixed(1)}%`,
      }))
      .sort((a, b) => b.weight - a.weight);
  }

  if (chartData.length === 0) {
    return (
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BrainCircuit size={18} style={{ color: "#4F46E5" }} />
              <span>MODEL FEATURE IMPORTANCE</span>
            </span>
            <span className="card-subtitle">XGBoost Gain / Weight Distribution Across 12 Features</span>
          </div>
        </div>
        <div className="state-box" style={{ padding: "36px 20px" }}>
          <div className="state-title" style={{ fontSize: 14 }}>Feature Importance Unavailable</div>
          <div className="state-desc" style={{ fontSize: 13, maxWidth: 500 }}>
            Feature importance is available from the trained XGBoost model but is not currently exposed by the API.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BrainCircuit size={18} style={{ color: "#4F46E5" }} />
            <span>MODEL FEATURE IMPORTANCE</span>
          </span>
          <span className="card-subtitle">
            Relative Weight Contribution Across 12 Technical Features (Sorted Descending)
          </span>
        </div>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#4F46E5", background: "#EEF2FF", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
          XGBoost Gini / Gain
        </span>
      </div>

      <div style={{ width: "100%", height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 60, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, "dataMax + 0.02"]}
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#0F172A"
              fontSize={11}
              fontFamily="var(--font-mono)"
              width={110}
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
              formatter={(val: any) => [`${(Number(val) * 100).toFixed(2)}%`, "Feature Importance"]}
            />
            <Bar dataKey="weight" fill="#4F46E5" radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={16}>
              <LabelList
                dataKey="percentage"
                position="right"
                style={{ fill: "#0F172A", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
