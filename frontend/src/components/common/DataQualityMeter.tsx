import React from "react";
import { ShieldCheck } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface DataQualityMeterProps {
  score?: number;
  completeness?: number;
  freshness?: number;
  consistency?: number;
}

export const DataQualityMeter: React.FC<DataQualityMeterProps> = ({
  score = 98.7,
  completeness = 100,
  freshness = 96,
  consistency = 100,
}) => {
  return (
    <div className="card-standard" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="icon-badge icon-badge-teal">
            <ShieldCheck size={16} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748B" }}>
              Data Quality Audit
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0D9488", fontFamily: "var(--font-mono)" }}>
              {score.toFixed(1)}%
            </div>
          </div>
        </div>
        <StatusBadge variant="operational" label="Healthy" />
      </div>

      {/* 3 Progress Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Completeness */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
            <span style={{ color: "#64748B", fontWeight: 600 }}>Completeness</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#172033" }}>{completeness}%</span>
          </div>
          <div style={{ height: 6, background: "#EEF3F8", borderRadius: 9999, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${completeness}%`,
                background: "linear-gradient(90deg, #0D9488, #14B8A6)",
                borderRadius: 9999,
              }}
            />
          </div>
        </div>

        {/* Freshness */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
            <span style={{ color: "#64748B", fontWeight: 600 }}>Freshness</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#172033" }}>{freshness}%</span>
          </div>
          <div style={{ height: 6, background: "#EEF3F8", borderRadius: 9999, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${freshness}%`,
                background: "linear-gradient(90deg, #2563EB, #3B82F6)",
                borderRadius: 9999,
              }}
            />
          </div>
        </div>

        {/* Consistency */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
            <span style={{ color: "#64748B", fontWeight: 600 }}>Consistency</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#172033" }}>{consistency}%</span>
          </div>
          <div style={{ height: 6, background: "#EEF3F8", borderRadius: 9999, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${consistency}%`,
                background: "linear-gradient(90deg, #16A34A, #22C55E)",
                borderRadius: 9999,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
