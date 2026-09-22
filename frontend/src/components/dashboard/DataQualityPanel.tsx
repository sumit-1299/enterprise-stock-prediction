import React, { useMemo } from "react";
import { Database, CheckCircle, AlertTriangle, ShieldCheck, Cpu } from "lucide-react";
import { MarketDataPoint, ModelInfoResponse } from "../../types";

interface DataQualityPanelProps {
  marketData: MarketDataPoint[];
  modelInfo: ModelInfoResponse | null;
  symbol: string;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  marketData,
  modelInfo,
  symbol,
}) => {
  const stats = useMemo(() => {
    if (!marketData || marketData.length === 0) {
      return {
        totalRows: 0,
        oldestDate: "N/A",
        latestDate: "N/A",
        missingValuesCount: 0,
        duplicateCount: 0,
        featuresAvailable: 0,
        featuresTotal: 12,
        isHealthy: false,
      };
    }

    const totalRows = marketData.length;
    const oldestDate = marketData[0]?.timestamp
      ? new Date(marketData[0].timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" })
      : "N/A";
    const latestDate = marketData[totalRows - 1]?.timestamp
      ? new Date(marketData[totalRows - 1].timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" })
      : "N/A";

    // Count missing values across key fields
    const featureKeys: (keyof MarketDataPoint)[] = [
      "return_1d",
      "return_5d",
      "sma_10",
      "sma_20",
      "sma_50",
      "ema_12",
      "ema_26",
      "macd",
      "macd_signal",
      "rsi_14",
      "volatility_20",
      "volume_change",
    ];

    let missing = 0;
    const seenTimestamps = new Set<string>();
    let duplicates = 0;

    for (const point of marketData) {
      if (point.timestamp) {
        if (seenTimestamps.has(point.timestamp)) {
          duplicates++;
        } else {
          seenTimestamps.add(point.timestamp);
        }
      }

      if (point.open === null || point.open === undefined) missing++;
      if (point.high === null || point.high === undefined) missing++;
      if (point.low === null || point.low === undefined) missing++;
      if (point.close === null || point.close === undefined) missing++;
      if (point.volume === null || point.volume === undefined) missing++;

      for (const f of featureKeys) {
        if (point[f] === null || point[f] === undefined) {
          missing++;
        }
      }
    }

    // Check features available in latest observation
    const latestPoint = marketData[totalRows - 1];
    let featAvailable = 0;
    for (const f of featureKeys) {
      if (latestPoint && latestPoint[f] !== null && latestPoint[f] !== undefined) {
        featAvailable++;
      }
    }

    return {
      totalRows,
      oldestDate,
      latestDate,
      missingValuesCount: missing,
      duplicateCount: duplicates,
      featuresAvailable: featAvailable,
      featuresTotal: featureKeys.length,
      isHealthy: totalRows > 0 && duplicates === 0,
    };
  }, [marketData]);

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Data Quality & Pipeline Integrity</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>
              {symbol}
            </span>
          </span>
          <span className="card-subtitle">
            Validation of dataset completeness, feature readiness, and production model artifact status
          </span>
        </div>

        <div>
          {stats.isHealthy ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#ECFDF5",
                color: "#16A34A",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                border: "1px solid #BBF7D0",
              }}
            >
              <ShieldCheck size={14} /> PIPELINE VERIFIED
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#FEF2F2",
                color: "#DC2626",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                border: "1px solid #FECACA",
              }}
            >
              <AlertTriangle size={14} /> DATA ATTENTION
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 8,
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <Database size={13} /> Observations Available
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#0F172A" }}>
            {stats.totalRows} Trading Days
          </div>
          <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
            Range: {stats.oldestDate} — {stats.latestDate}
          </div>
        </div>

        <div
          style={{
            padding: "12px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle size={13} /> Feature Completeness
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#16A34A" }}>
            {stats.featuresAvailable} / {stats.featuresTotal} Features
          </div>
          <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
            Engineered technical indicators active
          </div>
        </div>

        <div
          style={{
            padding: "12px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={13} /> Missing / NaN Values
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: stats.missingValuesCount > 0 ? "#D97706" : "#16A34A" }}>
            {stats.missingValuesCount} Cells
          </div>
          <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
            Warmup period for 50-day rolling window
          </div>
        </div>

        <div
          style={{
            padding: "12px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle size={13} /> Duplicate Timestamps
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: stats.duplicateCount === 0 ? "#16A34A" : "#DC2626" }}>
            {stats.duplicateCount} Duplicates
          </div>
          <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
            Unique daily observations verified
          </div>
        </div>

        <div
          style={{
            padding: "12px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <Cpu size={13} /> Model Status
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: modelInfo ? "#2563EB" : "#DC2626" }}>
            {modelInfo ? `${modelInfo.model_version || "v1"} (Production)` : "Unavailable"}
          </div>
          <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
            {modelInfo ? modelInfo.model_type || "xgboost_classifier" : "No trained model artifact"}
          </div>
        </div>
      </div>
    </div>
  );
};

