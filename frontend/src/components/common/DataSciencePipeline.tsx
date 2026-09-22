import React from "react";
import {
  Database,
  Sliders,
  Cpu,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export const DataSciencePipeline: React.FC = () => {
  const steps = [
    {
      num: "01",
      title: "Market Ingestion",
      desc: "EOD OHLCV & Volume",
      icon: Database,
      accent: "#2563EB",
      bg: "#EFF6FF",
      border: "#BFDBFE",
    },
    {
      num: "02",
      title: "Feature Engineering",
      desc: "12 Technical Indicators",
      icon: Sliders,
      accent: "#4F46E5",
      bg: "#EEF2FF",
      border: "#C7D2FE",
    },
    {
      num: "03",
      title: "Machine Learning",
      desc: "XGBoost Classifier v1",
      icon: Cpu,
      accent: "#7C3AED",
      bg: "#F5F3FF",
      border: "#DDD6FE",
    },
    {
      num: "04",
      title: "Directional Forecast",
      desc: "Binary Direction (t+1)",
      icon: TrendingUp,
      accent: "#16A34A",
      bg: "#F0FDF4",
      border: "#BBF7D0",
    },
    {
      num: "05",
      title: "Model Monitoring",
      desc: "PSI Drift & Audit Trail",
      icon: Activity,
      accent: "#0D9488",
      bg: "#F0FDFA",
      border: "#99F6E4",
    },
  ];

  return (
    <div className="card-standard" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} style={{ color: "#2563EB" }} />
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", color: "#172033", textTransform: "uppercase" }}>
            Data Science & Machine Learning Pipeline
          </span>
        </div>
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#64748B", fontWeight: 600 }}>
          End-to-End Inference Flow
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.num}>
              <div
                className="pipeline-step"
                style={{
                  flex: "1 1 0",
                  minWidth: 150,
                  borderLeft: `3px solid ${step.accent}`,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    background: step.bg,
                    border: `1px solid ${step.border}`,
                    color: step.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: step.accent, fontWeight: 800 }}>
                    STEP {step.num}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#172033", whiteSpace: "nowrap" }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748B", whiteSpace: "nowrap" }}>
                    {step.desc}
                  </div>
                </div>
              </div>

              {!isLast && (
                <ArrowRight
                  size={14}
                  style={{ color: "#94A3B8", flexShrink: 0 }}
                  className="hidden-mobile"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

