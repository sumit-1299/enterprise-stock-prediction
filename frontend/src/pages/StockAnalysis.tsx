import React, { useState, useEffect, useMemo } from "react";
import { Download, TrendingUp, TrendingDown, Radio } from "lucide-react";
import { StockSelector } from "../components/dashboard/StockSelector";
import { InteractivePriceChart } from "../components/charts/InteractivePriceChart";
import { VolumeChart } from "../components/charts/VolumeChart";
import { PredictionConfidenceChart } from "../components/charts/PredictionConfidenceChart";
import { TechnicalIndicatorsGrid } from "../components/dashboard/TechnicalIndicatorsGrid";
import { RSIChart } from "../components/charts/RSIChart";
import { MACDChart } from "../components/charts/MACDChart";
import { VolatilityChart } from "../components/charts/VolatilityChart";
import { ReturnDistributionChart } from "../components/charts/ReturnDistributionChart";
import { CorrelationHeatmap } from "../components/charts/CorrelationHeatmap";
import { FeatureImportanceChart } from "../components/charts/FeatureImportanceChart";
import { PredictionVsActualChart } from "../components/charts/PredictionVsActualChart";
import { ModelMetricsChart } from "../components/charts/ModelMetricsChart";
import { DataQualityPanel } from "../components/dashboard/DataQualityPanel";
import { DataScienceInsights } from "../components/dashboard/DataScienceInsights";
import {
  PredictionResponse,
  ModelInfoResponse,
  MarketDataPoint,
  ModelAnalyticsResponse,
  PredictionHistoryItem,
} from "../types";
import { getModelAnalytics, getPredictionHistory } from "../services/api";

interface StockAnalysisProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  prediction: PredictionResponse | null;
  modelInfo: ModelInfoResponse | null;
  marketData: MarketDataPoint[];
  isLoading: boolean;
}

import { COMPANY_NAMES } from "../config/stocks";

export const StockAnalysis: React.FC<StockAnalysisProps> = ({
  currentSymbol,
  onSelectSymbol,
  prediction,
  modelInfo,
  marketData,
  isLoading,
}) => {
  const [modelAnalytics, setModelAnalytics] = useState<ModelAnalyticsResponse | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistoryItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    getModelAnalytics(currentSymbol)
      .then((res) => {
        if (isMounted) setModelAnalytics(res);
      })
      .catch(() => {
        if (isMounted) setModelAnalytics(null);
      });

    getPredictionHistory(currentSymbol, 1, 100)
      .then((res) => {
        if (isMounted) setPredictionHistory(res.history || []);
      })
      .catch(() => {
        if (isMounted) setPredictionHistory([]);
      });

    return () => {
      isMounted = false;
    };
  }, [currentSymbol]);

  const latestData = marketData && marketData.length ? marketData[marketData.length - 1] : null;
  const prevData = marketData && marketData.length > 1 ? marketData[marketData.length - 2] : null;

  const currentPrice = latestData?.close ?? null;
  const priceChange =
    latestData && prevData && latestData.close !== null && prevData.close !== null
      ? latestData.close - prevData.close
      : null;
  const priceChangePct =
    priceChange !== null && prevData && prevData.close !== null && prevData.close !== 0
      ? (priceChange / prevData.close) * 100
      : null;

  const companyName = COMPANY_NAMES[currentSymbol] || `${currentSymbol} Equity`;
  const metrics = modelAnalytics?.metrics || modelInfo?.metrics;
  const featureImportance = modelAnalytics?.feature_importance || modelInfo?.feature_importance;

  // Client-Side CSV Export
  const handleExportCSV = () => {
    if (!marketData || marketData.length === 0) return;
    const headers = [
      "timestamp",
      "open",
      "high",
      "low",
      "close",
      "volume",
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
    const rows = marketData.map((d) =>
      headers
        .map((h) => {
          const val = d[h as keyof MarketDataPoint];
          return val !== null && val !== undefined ? val : "";
        })
        .join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentSymbol}_historical_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Client-Side JSON Export
  const handleExportJSON = () => {
    if (!marketData || marketData.length === 0) return;
    const jsonContent = JSON.stringify(marketData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentSymbol}_historical_data.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fiftyTwoWeekHigh = useMemo(() => {
    if (!marketData || marketData.length === 0) return null;
    const highs = marketData.map((d) => d.high).filter((h): h is number => h !== null && h !== undefined);
    return highs.length ? Math.max(...highs) : null;
  }, [marketData]);

  const fiftyTwoWeekLow = useMemo(() => {
    if (!marketData || marketData.length === 0) return null;
    const lows = marketData.map((d) => d.low).filter((l): l is number => l !== null && l !== undefined && l > 0);
    return lows.length ? Math.min(...lows) : null;
  }, [marketData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 0. Stock Selector & Header Toolbar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <StockSelector
          currentSymbol={currentSymbol}
          onSelectSymbol={onSelectSymbol}
          isLoading={isLoading}
        />

        {/* Stock Overview Banner */}
        <div
          className="card-standard"
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #2563EB, #4F46E5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: 18,
                  boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)",
                }}
              >
                {currentSymbol.split(".")[0].slice(0, 3)}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#172033" }}>
                    {companyName}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: "#F1F5F9",
                      color: "#475569",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    NSE
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: "#EFF6FF",
                      color: "#2563EB",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {currentSymbol}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "#16A34A",
                      fontWeight: 600,
                    }}
                  >
                    <Radio size={12} className="animate-pulse" /> REGULAR MARKET
                  </span>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>•</span>
                  <span style={{ fontSize: 11, color: "#64748B" }}>
                    Last Updated: {latestData?.timestamp ? new Date(latestData.timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {/* Price & Change Pill */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#172033" }}>
                  {currentPrice !== null ? `₹${currentPrice.toFixed(2)}` : "N/A"}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    color: priceChange !== null && priceChange >= 0 ? "#16A34A" : "#DC2626",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {priceChange !== null && priceChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>
                    {priceChange !== null
                      ? `${priceChange >= 0 ? "+" : ""}₹${priceChange.toFixed(2)} (${priceChangePct !== null ? `${priceChangePct >= 0 ? "+" : ""}${priceChangePct.toFixed(2)}%` : ""})`
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Export Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleExportCSV}
                  title="Download CSV dataset"
                >
                  <Download size={13} /> CSV
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleExportJSON}
                  title="Download JSON dataset"
                >
                  <Download size={13} /> JSON
                </button>
              </div>
            </div>
          </div>

          {/* Market Metrics Strip: Open, High, Low, Volume, 52W High, 52W Low */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 12,
              paddingTop: 14,
              borderTop: "1px solid #EEF3F8",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Open</span>
              <strong style={{ fontSize: 13, color: "#172033" }}>
                {latestData?.open !== null && latestData?.open !== undefined ? `₹${latestData.open.toFixed(2)}` : "N/A"}
              </strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Day High</span>
              <strong style={{ fontSize: 13, color: "#16A34A" }}>
                {latestData?.high !== null && latestData?.high !== undefined ? `₹${latestData.high.toFixed(2)}` : "N/A"}
              </strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Day Low</span>
              <strong style={{ fontSize: 13, color: "#DC2626" }}>
                {latestData?.low !== null && latestData?.low !== undefined ? `₹${latestData.low.toFixed(2)}` : "N/A"}
              </strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Volume</span>
              <strong style={{ fontSize: 13, color: "#172033" }}>
                {latestData?.volume ? latestData.volume.toLocaleString() : "N/A"}
              </strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>52W High</span>
              <strong style={{ fontSize: 13, color: "#2563EB" }}>
                {fiftyTwoWeekHigh ? `₹${fiftyTwoWeekHigh.toFixed(2)}` : "N/A"}
              </strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>52W Low</span>
              <strong style={{ fontSize: 13, color: "#EA580C" }}>
                {fiftyTwoWeekLow ? `₹${fiftyTwoWeekLow.toFixed(2)}` : "N/A"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 1. MARKET PRICE ANALYTICS: Interactive Price Chart with MA Overlays & Statistics */}
      <section>
        <InteractivePriceChart data={marketData} symbol={currentSymbol} />
      </section>

      {/* 2. VOLUME & PREDICTION PROBABILITY ROW */}
      <section className="dashboard-grid-equal">
        <VolumeChart data={marketData} symbol={currentSymbol} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="analytics-card" style={{ padding: "16px 20px" }}>
            <div className="card-header-row" style={{ marginBottom: 8 }}>
              <span className="card-title">Model Directional Signal</span>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontWeight: 800,
                  fontSize: 13,
                  backgroundColor: prediction?.prediction === "UP" ? "#ECFDF5" : "#FEF2F2",
                  color: prediction?.prediction === "UP" ? "#16A34A" : "#DC2626",
                }}
              >
                {prediction?.prediction || "N/A"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#64748B", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>Model: <strong style={{ color: "#0F172A" }}>{prediction?.model_type || "xgboost_classifier"}</strong></div>
              <div>Version: <strong style={{ color: "#2563EB" }}>{prediction?.model_version || "v1"}</strong></div>
              <div>Probability: <strong style={{ color: "#0F172A" }}>{prediction?.probability ? `${(prediction.probability * 100).toFixed(2)}%` : "N/A"}</strong></div>
              <div>Task: <strong style={{ color: "#0F172A" }}>Binary Classification</strong></div>
            </div>
          </div>

          <PredictionConfidenceChart
            probabilities={prediction?.probabilities}
            direction={prediction?.prediction}
            probability={prediction?.probability}
          />
        </div>
      </section>

      {/* 3. TECHNICAL INDICATORS: Mini Cards & Gauges */}
      <section>
        <TechnicalIndicatorsGrid latestData={latestData} />
      </section>

      {/* 4. TECHNICAL VISUALIZATIONS: RSI Gauge & MACD Histogram */}
      <section className="dashboard-grid-equal">
        <RSIChart data={marketData} symbol={currentSymbol} />
        <MACDChart data={marketData} symbol={currentSymbol} />
      </section>

      {/* 5. VOLATILITY ANALYSIS: 20D Rolling Volatility & KPIs */}
      <section>
        <VolatilityChart data={marketData} symbol={currentSymbol} />
      </section>

      {/* 6. STATISTICAL RETURN DISTRIBUTION */}
      <section>
        <ReturnDistributionChart data={marketData} symbol={currentSymbol} />
      </section>

      {/* 7. FEATURE CORRELATION MATRIX: 12x12 Heatmap */}
      <section>
        <CorrelationHeatmap data={marketData} symbol={currentSymbol} />
      </section>

      {/* 8. FEATURE IMPORTANCE: Horizontal Bar Chart */}
      <section>
        <FeatureImportanceChart importance={featureImportance} />
      </section>

      {/* 9. PREDICTION VS ACTUAL ANALYSIS */}
      <section>
        <PredictionVsActualChart
          history={predictionHistory}
          marketData={marketData}
          symbol={currentSymbol}
        />
      </section>

      {/* 10. MODEL PERFORMANCE METRICS */}
      <section>
        <ModelMetricsChart metrics={metrics} />
      </section>

      {/* 11. DATA QUALITY & INTEGRITY PANEL */}
      <section>
        <DataQualityPanel
          marketData={marketData}
          modelInfo={modelInfo}
          symbol={currentSymbol}
        />
      </section>

      {/* 12. DATA SCIENCE INSIGHTS & REGIME ANALYSIS */}
      <section>
        <DataScienceInsights
          marketData={marketData}
          latestData={latestData}
          prediction={prediction}
          modelInfo={modelInfo}
        />
      </section>
    </div>
  );
};
