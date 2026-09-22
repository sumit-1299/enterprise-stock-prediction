import React from "react";
import { ArrowRight, TrendingUp, TrendingDown, Sparkles, Clock } from "lucide-react";
import { StockSelector } from "../components/dashboard/StockSelector";
import { KPIGrid } from "../components/dashboard/KPIGrid";
import { PriceChart } from "../components/charts/PriceChart";
import { VolumeChart } from "../components/charts/VolumeChart";
import { PredictionConfidenceChart } from "../components/charts/PredictionConfidenceChart";
import { TechnicalIndicatorsGrid } from "../components/dashboard/TechnicalIndicatorsGrid";
import { ModelMetricsChart } from "../components/charts/ModelMetricsChart";
import { FeatureImportanceChart } from "../components/charts/FeatureImportanceChart";
import { DataScienceInsights } from "../components/dashboard/DataScienceInsights";
import { MarketDataUnavailable } from "../components/common/MarketDataUnavailable";
import { ModelUnavailable } from "../components/common/ModelUnavailable";
import { ConfidenceGauge } from "../components/common/ConfidenceGauge";
import { StatusBadge } from "../components/common/StatusBadge";
import { DataSciencePipeline } from "../components/common/DataSciencePipeline";
import { DataQualityMeter } from "../components/common/DataQualityMeter";
import {
  PredictionResponse,
  ModelInfoResponse,
  MarketDataPoint,
  MarketDataLatestResponse,
  NavSectionId,
} from "../types";

interface DashboardProps {
  currentSymbol: string;
  prediction: PredictionResponse | null;
  modelInfo: ModelInfoResponse | null;
  marketData: MarketDataPoint[];
  latestMarketData?: MarketDataLatestResponse | MarketDataPoint | null;
  realtimePrice?: number;
  isLoading: boolean;
  onSelectSymbol: (symbol: string) => void;
  onNavigateSection?: (section: NavSectionId) => void;
  error?: { code?: string; message: string } | null;
}

const COMPANY_NAMES: Record<string, string> = {
  "TCS.NS": "Tata Consultancy Services Ltd.",
  "RELIANCE.NS": "Reliance Industries Ltd.",
  "INFY.NS": "Infosys Ltd.",
  "HDFCBANK.NS": "HDFC Bank Ltd.",
};

export const Dashboard: React.FC<DashboardProps> = ({
  currentSymbol,
  prediction,
  modelInfo,
  marketData,
  latestMarketData,
  realtimePrice,
  isLoading,
  onSelectSymbol,
  onNavigateSection,
  error,
}) => {
  const latestData = marketData.length > 0 ? marketData[marketData.length - 1] : null;
  const currentPrice = realtimePrice ?? latestMarketData?.close ?? latestData?.close;
  const direction = prediction?.prediction;
  const isUp = direction === "UP";
  const probability = prediction?.probability ?? 0.5;

  const changeVal = (latestMarketData as any)?.change;
  const changePctVal =
    (latestMarketData as any)?.change_percent !== undefined
      ? (latestMarketData as any)?.change_percent
      : (latestMarketData as any)?.return_1d !== undefined &&
        (latestMarketData as any)?.return_1d !== null
      ? (latestMarketData as any).return_1d * 100
      : null;

  const isPositiveChange = changePctVal !== null && changePctVal !== undefined && changePctVal >= 0;

  const lastUpdateTime = latestData?.timestamp || prediction?.timestamp;
  const formattedUpdateTime = lastUpdateTime
    ? new Date(lastUpdateTime).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      }) + " IST"
    : "Live Feed";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. Polished Hero / Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#172033",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Market Intelligence
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "#2563EB",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {currentSymbol}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0 0" }}>
            AI-powered stock analytics, predictions and model monitoring for {COMPANY_NAMES[currentSymbol] || currentSymbol}.
          </p>
        </div>

        {/* Live Status Indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "#475569",
              background: "#FFFFFF",
              border: "1px solid #DCE4EE",
              padding: "4px 10px",
              borderRadius: 6,
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <Clock size={12} style={{ color: "#2563EB" }} />
            <span>Data Updated {formattedUpdateTime}</span>
          </div>

          <StatusBadge variant="operational" label="System Operational" />
        </div>
      </div>

      {/* 2. Global Stock Selector */}
      <StockSelector
        currentSymbol={currentSymbol}
        onSelectSymbol={onSelectSymbol}
        isLoading={isLoading}
      />

      {/* Guided Empty State when symbol market data is unavailable */}
      {(Boolean(error && error.code !== "MODEL_NOT_FOUND") ||
        (!isLoading && marketData.length === 0 && !latestMarketData)) && (
        <MarketDataUnavailable
          symbol={currentSymbol}
          onSelectSymbol={onSelectSymbol}
          onNavigateToOverview={() => onNavigateSection && onNavigateSection("market")}
          onNavigateToData={() => onNavigateSection && onNavigateSection("data")}
        />
      )}

      {/* Guided State when market data is present but model is unavailable */}
      {!isLoading &&
        (marketData.length > 0 || latestMarketData) &&
        (!prediction && !modelInfo || error?.code === "MODEL_NOT_FOUND") && (
          <ModelUnavailable
            symbol={currentSymbol}
            onSelectSymbol={onSelectSymbol}
            onNavigateToModels={() => onNavigateSection && onNavigateSection("models")}
            onNavigateToData={() => onNavigateSection && onNavigateSection("data")}
          />
        )}

      {/* 3. First Row: Premium KPI Cards Grid */}
      <KPIGrid
        prediction={prediction}
        modelInfo={modelInfo}
        latestMarketData={latestMarketData ?? latestData}
        realtimePrice={realtimePrice}
        isLoading={isLoading}
      />

      {/* 4. Academic Presentation: End-to-End Data Science Pipeline */}
      <DataSciencePipeline />

      {/* 5. Hero Market Overview & AI Prediction Centerpiece */}
      <div
        className="card-standard"
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 24,
          alignItems: "center",
          background: "#FFFFFF",
        }}
      >
        {/* Left: Stock Identity & Snapshot */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                fontWeight: 800,
                color: "#2563EB",
                background: "#EFF6FF",
                padding: "4px 12px",
                borderRadius: 8,
                border: "1px solid #BFDBFE",
              }}
            >
              {currentSymbol}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#64748B",
                background: "#F1F5F9",
                padding: "3px 8px",
                borderRadius: 6,
                fontFamily: "var(--font-mono)",
              }}
            >
              NSE EQUITIES
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#16A34A",
                background: "#F0FDF4",
                padding: "2px 8px",
                borderRadius: 4,
                border: "1px solid #BBF7D0",
              }}
            >
              ● Regular Session
            </span>
          </div>

          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#172033", margin: 0 }}>
              {COMPANY_NAMES[currentSymbol] || `${currentSymbol} Equity`}
            </h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: "#172033",
                  letterSpacing: "-0.02em",
                }}
              >
                {currentPrice !== undefined && currentPrice !== null
                  ? `₹${Number(currentPrice).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "N/A"}
              </span>

              {changePctVal !== null && changePctVal !== undefined && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: isPositiveChange ? "#16A34A" : "#DC2626",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  {isPositiveChange ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {changeVal !== undefined ? `${changeVal >= 0 ? "+" : ""}₹${Math.abs(changeVal).toFixed(2)} ` : ""}
                  ({isPositiveChange ? "+" : ""}
                  {Number(changePctVal).toFixed(2)}%)
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 12,
              color: "#64748B",
              fontFamily: "var(--font-mono)",
              borderTop: "1px solid #EEF3F8",
              paddingTop: 10,
              flexWrap: "wrap",
            }}
          >
            <span>
              Vol: <strong>{latestData?.volume?.toLocaleString() ?? "N/A"}</strong>
            </span>
            <span>
              SMA-50: <strong>{latestData?.sma_50 ? `₹${latestData.sma_50.toFixed(2)}` : "N/A"}</strong>
            </span>
            <span>
              RSI-14: <strong>{latestData?.rsi_14 ? latestData.rsi_14.toFixed(1) : "N/A"}</strong>
            </span>
          </div>
        </div>

        {/* Right: AI Prediction Centerpiece with Radial Gauge */}
        <div
          style={{
            background: isUp ? "#F0FDF4" : "#FEF2F2",
            border: `1px solid ${isUp ? "#BBF7D0" : "#FECACA"}`,
            borderRadius: 14,
            padding: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} style={{ color: isUp ? "#16A34A" : "#DC2626" }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: isUp ? "#15803D" : "#B91C1C",
                }}
              >
                AI Directional Forecast
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: isUp ? "#16A34A" : "#DC2626",
                }}
              >
                {prediction?.prediction || "UP"}
              </span>
              <StatusBadge
                variant={isUp ? "up" : "down"}
                label={prediction?.prediction || "UP"}
                size="sm"
              />
            </div>

            <div style={{ fontSize: 11, color: "#64748B" }}>
              Horizon: <strong>Next Trading Day (t+1)</strong>
            </div>

            <div style={{ fontSize: 11, color: "#64748B" }}>
              Model: <strong>XGBoost v1 (12 Features)</strong>
            </div>

            <div
              style={{
                fontSize: 10,
                color: "#94A3B8",
                fontStyle: "italic",
                marginTop: 2,
              }}
            >
              Model prediction — not financial advice
            </div>
          </div>

          {/* Radial Confidence Gauge */}
          <div>
            <ConfidenceGauge
              probability={probability}
              direction={prediction?.prediction || "UP"}
              size={110}
              strokeWidth={8}
            />
          </div>
        </div>
      </div>

      {/* 6. Main Stock Price Chart & Confidence Breakdown */}
      <div className="dashboard-grid-2col">
        <PriceChart data={marketData} symbol={currentSymbol} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PredictionConfidenceChart
            probabilities={prediction?.probabilities}
            direction={prediction?.prediction}
            probability={prediction?.probability}
          />

          {/* 2-Second Data Quality Audit Meter */}
          <DataQualityMeter />
        </div>
      </div>

      {/* Navigation CTA for Full Stock Analysis */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn-outline"
          onClick={() => onNavigateSection && onNavigateSection("analysis")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 700,
            color: "#2563EB",
            background: "#EFF6FF",
            borderRadius: 8,
            border: "1px solid #BFDBFE",
          }}
        >
          <span>Open Full Stock Analysis Terminal</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 7. Volume Chart */}
      <VolumeChart data={marketData} symbol={currentSymbol} />

      {/* 8. Technical Indicators Section */}
      <TechnicalIndicatorsGrid latestData={latestData} />

      {/* 9. Model Performance & Feature Analysis */}
      <div className="dashboard-grid-equal">
        <ModelMetricsChart metrics={modelInfo?.metrics} />
        <FeatureImportanceChart importance={modelInfo?.feature_importance} />
      </div>

      {/* 10. Data Science Insights */}
      <DataScienceInsights
        marketData={marketData}
        latestData={latestData}
        prediction={prediction}
        modelInfo={modelInfo}
      />
    </div>
  );
};
