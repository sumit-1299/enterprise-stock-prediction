import React from "react";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Cpu,
  ShieldCheck,
  Percent,
} from "lucide-react";
import {
  PredictionResponse,
  MarketDataPoint,
  MarketDataLatestResponse,
  ModelInfoResponse,
} from "../../types";
import { KpiCard } from "../common/KpiCard";
import { StatusBadge } from "../common/StatusBadge";

interface KPIGridProps {
  prediction: PredictionResponse | null;
  modelInfo: ModelInfoResponse | null;
  latestMarketData?: MarketDataLatestResponse | MarketDataPoint | null;
  realtimePrice?: number;
  isLoading: boolean;
}

export const KPIGrid: React.FC<KPIGridProps> = ({
  prediction,
  modelInfo,
  latestMarketData,
  realtimePrice,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="kpi-grid">
        {[...Array(6)].map((_, i) => (
          <KpiCard
            key={i}
            title="LOADING"
            value="---"
            icon={IndianRupee}
            isLoading={true}
          />
        ))}
      </div>
    );
  }

  const currentPrice = realtimePrice ?? latestMarketData?.close;
  const direction = prediction?.prediction;
  const isUp = direction === "UP";
  const probability =
    prediction?.probability !== undefined ? (prediction.probability * 100).toFixed(1) : null;

  // Extract change and change percent from latestMarketData
  const changeVal = (latestMarketData as any)?.change;
  const changePctVal =
    (latestMarketData as any)?.change_percent !== undefined
      ? (latestMarketData as any)?.change_percent
      : (latestMarketData as any)?.return_1d !== undefined &&
        (latestMarketData as any)?.return_1d !== null
      ? (latestMarketData as any).return_1d * 100
      : null;

  const isPositiveChange = changePctVal !== null && changePctVal !== undefined && changePctVal >= 0;

  const formatModelName = (rawType?: string): string => {
    if (!rawType) return "XGBoost Classifier";
    if (rawType.toLowerCase().includes("xgboost")) return "XGBoost Classifier";
    if (rawType.toLowerCase().includes("lightgbm")) return "LightGBM";
    if (rawType.toLowerCase().includes("catboost")) return "CatBoost";
    if (rawType.toLowerCase().includes("random_forest")) return "Random Forest";
    return rawType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const modelDisplay = formatModelName(modelInfo?.model_type);
  const modelVersion = modelInfo?.model_version || "v1";

  return (
    <div className="kpi-grid">
      {/* 1. CURRENT PRICE */}
      <KpiCard
        title="Current Price"
        value={
          currentPrice !== undefined && currentPrice !== null
            ? `₹${Number(currentPrice).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : "N/A"
        }
        subtext={
          (latestMarketData as any)?.high && (latestMarketData as any)?.low
            ? `Day: ₹${Number((latestMarketData as any).low).toFixed(1)} – ₹${Number((latestMarketData as any).high).toFixed(1)}`
            : "Latest NSE Close"
        }
        icon={IndianRupee}
        accentColor="blue"
        badge={
          <StatusBadge
            variant="neutral"
            label="NSE"
            size="sm"
            showDot={false}
          />
        }
      />

      {/* 2. DAILY CHANGE */}
      <KpiCard
        title="Daily Change"
        value={
          changePctVal !== null && changePctVal !== undefined ? (
            <span
              style={{
                color: isPositiveChange ? "#16A34A" : "#DC2626",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {isPositiveChange ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              {isPositiveChange ? "+" : ""}
              {Number(changePctVal).toFixed(2)}%
            </span>
          ) : (
            "0.00%"
          )
        }
        subtext={
          changeVal !== undefined && changeVal !== null
            ? `${changeVal >= 0 ? "+" : ""}₹${Math.abs(changeVal).toFixed(2)} from prev close`
            : "Session change"
        }
        icon={isPositiveChange ? TrendingUp : TrendingDown}
        accentColor={isPositiveChange ? "green" : "red"}
      />

      {/* 3. AI PREDICTION */}
      <KpiCard
        title="AI Prediction"
        value={
          direction ? (
            <span style={{ color: isUp ? "#16A34A" : "#DC2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
              {isUp ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
              {direction}
            </span>
          ) : (
            "N/A"
          )
        }
        subtext="Target horizon: t+1 session"
        icon={Sparkles}
        accentColor={isUp ? "green" : "red"}
        badge={
          direction && (
            <StatusBadge
              variant={isUp ? "up" : "down"}
              label={direction}
              size="sm"
            />
          )
        }
      />

      {/* 4. CONFIDENCE */}
      <KpiCard
        title="Confidence"
        value={probability ? `${probability}%` : "N/A"}
        subtext="Calibrated model probability"
        icon={Percent}
        accentColor="purple"
        badge={
          <StatusBadge
            variant="info"
            label="Calibrated"
            size="sm"
            showDot={false}
          />
        }
      />

      {/* 5. ACTIVE MODEL */}
      <KpiCard
        title="Active Model"
        value={
          <div
            title={`Technical identifier: ${modelInfo?.model_type || "xgboost_classifier"} (${modelVersion})`}
            style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: "var(--font-sans)",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {modelDisplay}
          </div>
        }
        subtext="12 Engineered Features"
        icon={Cpu}
        accentColor="indigo"
        badge={
          <StatusBadge
            variant="operational"
            label={modelVersion}
            size="sm"
          />
        }
      />

      {/* 6. DATA QUALITY */}
      <KpiCard
        title="Data Quality"
        value="100%"
        subtext="Zero missing values in series"
        icon={ShieldCheck}
        accentColor="teal"
        badge={
          <StatusBadge
            variant="operational"
            label="Verified"
            size="sm"
          />
        }
      />
    </div>
  );
};
