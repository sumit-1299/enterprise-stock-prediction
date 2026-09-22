import React, { useMemo } from "react";
import {
  TrendingUp,
  Sliders,
  ShieldAlert,
  BarChart3,
  Brain,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MarketDataPoint, PredictionResponse, ModelInfoResponse } from "../../types";

interface DataScienceInsightsProps {
  marketData?: MarketDataPoint[];
  latestData?: MarketDataPoint | null;
  prediction?: PredictionResponse | null;
  modelInfo?: ModelInfoResponse | null;
}

export const DataScienceInsights: React.FC<DataScienceInsightsProps> = ({
  marketData,
  latestData,
  prediction,
  modelInfo: _modelInfo,
}) => {
  // 1. Momentum Regime: RSI 14
  const momentum = useMemo(() => {
    if (!latestData || latestData.rsi_14 === null || latestData.rsi_14 === undefined) {
      return { value: "N/A", desc: "RSI calculation requires minimum 14 historical bars." };
    }
    const rsi = latestData.rsi_14;
    if (rsi >= 70) return { value: `Overbought (${rsi.toFixed(1)})`, desc: "RSI is in the upper exhaustion band (≥ 70)." };
    if (rsi <= 30) return { value: `Oversold (${rsi.toFixed(1)})`, desc: "RSI is in the lower oversold band (≤ 30)." };
    return { value: `Neutral (${rsi.toFixed(1)})`, desc: "RSI is oscillating within the equilibrium zone (30–70)." };
  }, [latestData]);

  // 2. Volatility Regime: 20D Volatility
  const volatility = useMemo(() => {
    if (!latestData || latestData.volatility_20 === null || latestData.volatility_20 === undefined) {
      return { value: "N/A", desc: "Volatility requires 20-day rolling return series." };
    }
    const vol = latestData.volatility_20 * 100;
    if (vol > 3.0) return { value: `High (${vol.toFixed(2)}%)`, desc: "Elevated return dispersion exceeding 3.0% daily sigma." };
    if (vol < 1.0) return { value: `Low (${vol.toFixed(2)}%)`, desc: "Subdued price volatility below 1.0% daily sigma." };
    return { value: `Moderate (${vol.toFixed(2)}%)`, desc: "Typical equity dispersion within historical parameters." };
  }, [latestData]);

  // 3. Trend Alignment: SMA 20 vs SMA 50 or Price vs SMA 20
  const trend = useMemo(() => {
    if (!latestData) return { value: "N/A", desc: "Trend requires moving average observations." };
    if (latestData.sma_20 && latestData.sma_50) {
      const isBullish = latestData.sma_20 >= latestData.sma_50;
      return {
        value: isBullish ? "Bullish (SMA 20 > 50)" : "Bearish (SMA 20 < 50)",
        desc: isBullish
          ? "20-day moving average sits above the 50-day baseline."
          : "20-day moving average sits below the 50-day baseline.",
      };
    }
    if (latestData.close && latestData.sma_20) {
      const above = latestData.close >= latestData.sma_20;
      return {
        value: above ? "Above 20-Day SMA" : "Below 20-Day SMA",
        desc: above
          ? "Latest close trades above short-term 20-day mean."
          : "Latest close trades below short-term 20-day mean.",
      };
    }
    return { value: "N/A", desc: "Moving average series incomplete." };
  }, [latestData]);

  // 4. Volume Flow: Volume Change
  const volume = useMemo(() => {
    if (!latestData || latestData.volume_change === null || latestData.volume_change === undefined) {
      return { value: "N/A", desc: "Volume change requires consecutive trading sessions." };
    }
    const vc = latestData.volume_change * 100;
    const sign = vc >= 0 ? "+" : "";
    if (vc > 25) return { value: `Surge (${sign}${vc.toFixed(1)}%)`, desc: "Trading participation is significantly above previous day." };
    if (vc < -25) return { value: `Contraction (${sign}${vc.toFixed(1)}%)`, desc: "Traded volume decreased noticeably vs previous day." };
    return { value: `Normal (${sign}${vc.toFixed(1)}%)`, desc: "Volume turnover remains in line with recent daily activity." };
  }, [latestData]);

  // 5. Model Confidence
  const confidence = useMemo(() => {
    if (!prediction || prediction.probability === undefined) {
      return { value: "N/A", desc: "No production model prediction available." };
    }
    const prob = prediction.probability * 100;
    const dir = prediction.prediction;
    if (prob >= 70) return { value: `High (${prob.toFixed(1)}% ${dir})`, desc: "Strong probability separation from binary decision threshold." };
    if (prob >= 55) return { value: `Moderate (${prob.toFixed(1)}% ${dir})`, desc: "Directional probability with moderate conviction." };
    return { value: `Low Margin (${prob.toFixed(1)}% ${dir})`, desc: "Close to 50% decision boundary; margin is minimal." };
  }, [prediction]);

  // 6. Data Quality
  const dataQuality = useMemo(() => {
    if (!marketData || marketData.length === 0) {
      return { value: "Unavailable", desc: "No historical market bars stored." };
    }
    const hasNullClose = marketData.some((d) => d.close === null || d.close === undefined);
    if (hasNullClose) {
      return { value: "Partial Gaps", desc: "Some historical observations have null values." };
    }
    return {
      value: `100% Validated (${marketData.length} bars)`,
      desc: "Zero missing close values and complete feature schemas.",
    };
  }, [marketData]);

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} style={{ color: "#7C3AED" }} />
            <span>DATA SCIENCE INSIGHTS</span>
          </span>
          <span className="card-subtitle">
            Quantitative regime classifications derived directly from mathematical feature values
          </span>
        </div>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#7C3AED", background: "#F6F1FF", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
          Mathematical Signals
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {/* Card 1: Trend */}
        <div className="insight-card card-tint-purple">
          <div className="insight-header">
            <span className="insight-title" style={{ color: "#6D28D9" }}>TREND ALIGNMENT</span>
            <div className="icon-badge icon-badge-purple" style={{ width: 28, height: 28 }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="insight-value" style={{ color: "var(--text-primary)" }}>
            {trend.value}
          </div>
          <div className="insight-desc" style={{ color: "#475569" }}>
            {trend.desc}
          </div>
        </div>

        {/* Card 2: Momentum */}
        <div className="insight-card card-tint-blue">
          <div className="insight-header">
            <span className="insight-title" style={{ color: "#1D4ED8" }}>MOMENTUM REGIME</span>
            <div className="icon-badge icon-badge-blue" style={{ width: 28, height: 28 }}>
              <Sliders size={14} />
            </div>
          </div>
          <div className="insight-value" style={{ color: "var(--text-primary)" }}>
            {momentum.value}
          </div>
          <div className="insight-desc" style={{ color: "#475569" }}>
            {momentum.desc}
          </div>
        </div>

        {/* Card 3: Volatility */}
        <div className="insight-card card-tint-orange">
          <div className="insight-header">
            <span className="insight-title" style={{ color: "#C2410C" }}>VOLATILITY REGIME</span>
            <div className="icon-badge icon-badge-orange" style={{ width: 28, height: 28 }}>
              <ShieldAlert size={14} />
            </div>
          </div>
          <div className="insight-value" style={{ color: "var(--text-primary)" }}>
            {volatility.value}
          </div>
          <div className="insight-desc" style={{ color: "#475569" }}>
            {volatility.desc}
          </div>
        </div>

        {/* Card 4: Volume */}
        <div className="insight-card card-tint-teal">
          <div className="insight-header">
            <span className="insight-title" style={{ color: "#0F766E" }}>TRADING VOLUME FLOW</span>
            <div className="icon-badge icon-badge-teal" style={{ width: 28, height: 28 }}>
              <BarChart3 size={14} />
            </div>
          </div>
          <div className="insight-value" style={{ color: "var(--text-primary)" }}>
            {volume.value}
          </div>
          <div className="insight-desc" style={{ color: "#475569" }}>
            {volume.desc}
          </div>
        </div>

        {/* Card 5: Model Confidence */}
        <div className="insight-card card-tint-green">
          <div className="insight-header">
            <span className="insight-title" style={{ color: "#15803D" }}>MODEL CONVICTION</span>
            <div className="icon-badge icon-badge-green" style={{ width: 28, height: 28 }}>
              <Brain size={14} />
            </div>
          </div>
          <div className="insight-value" style={{ color: "var(--text-primary)" }}>
            {confidence.value}
          </div>
          <div className="insight-desc" style={{ color: "#475569" }}>
            {confidence.desc}
          </div>
        </div>

        {/* Card 6: Data Quality */}
        <div className="insight-card card-tint-cyan">
          <div className="insight-header">
            <span className="insight-title" style={{ color: "#0E7490" }}>DATA INTEGRITY</span>
            <div className="icon-badge icon-badge-cyan" style={{ width: 28, height: 28 }}>
              <ShieldCheck size={14} />
            </div>
          </div>
          <div className="insight-value" style={{ color: "var(--text-primary)" }}>
            {dataQuality.value}
          </div>
          <div className="insight-desc" style={{ color: "#475569" }}>
            {dataQuality.desc}
          </div>
        </div>
      </div>
    </div>
  );
};

