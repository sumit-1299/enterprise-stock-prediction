import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Probabilities } from "../../types";

interface PredictionConfidenceChartProps {
  probabilities?: Probabilities;
  direction?: "UP" | "DOWN";
  probability?: number;
}

export const PredictionConfidenceChart: React.FC<PredictionConfidenceChartProps> = ({
  probabilities,
  direction,
  probability,
}) => {
  if (!probabilities) {
    return (
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Prediction Confidence</span>
            <span className="card-subtitle">Probability Distribution</span>
          </div>
        </div>
        <div className="state-box">
          <div className="state-title">Confidence Unavailable</div>
          <div className="state-desc">Model probability distribution is not available.</div>
        </div>
      </div>
    );
  }

  const chartData = [
    { name: "UP", value: probabilities.UP, color: "#16A34A" },
    { name: "DOWN", value: probabilities.DOWN, color: "#DC2626" },
  ];

  const displayProb = probability !== undefined
    ? (probability * 100).toFixed(2)
    : ((direction === "UP" ? probabilities.UP : probabilities.DOWN) * 100).toFixed(2);

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title">PREDICTION PROBABILITY</span>
          <span className="card-subtitle">Class Probability Distribution (UP vs DOWN)</span>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={70}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
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
              formatter={(val: any) => [`${(Number(val) * 100).toFixed(2)}%`, "Probability"]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Centered label: percentage and direction */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: "#0F172A",
              lineHeight: 1.1,
            }}
          >
            {displayProb}%
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              color: direction === "UP" ? "#16A34A" : "#DC2626",
              marginTop: 2,
              letterSpacing: "0.05em",
            }}
          >
            {direction === "UP" ? "▲ UP" : "▼ DOWN"}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: "12px", fontFamily: "var(--font-mono)", paddingTop: 4 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 4,
            backgroundColor: "#F0FDF4",
            border: "1px solid #BBF7D0",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#16A34A" }} />
          <span style={{ fontWeight: 700, color: "#15803D" }}>UP {(probabilities.UP * 100).toFixed(2)}%</span>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 4,
            backgroundColor: "#FFF1F2",
            border: "1px solid #FECDD3",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#DC2626" }} />
          <span style={{ fontWeight: 700, color: "#B91C1C" }}>DOWN {(probabilities.DOWN * 100).toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
};
