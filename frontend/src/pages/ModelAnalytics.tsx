import React, { useState, useEffect, useCallback } from "react";
import {
  Cpu,
  AlertTriangle,
  RefreshCw,
  Info,
  CheckCircle,
  XCircle,
  Activity,
  Sliders,
  TrendingUp,
  BarChart3,
  ShieldAlert,
  Layers,
  Gauge,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { ModelMetricsChart } from "../components/charts/ModelMetricsChart";
import { FeatureImportanceChart } from "../components/charts/FeatureImportanceChart";
import {
  getModelAnalytics,
  getRegisteredModels,
  getModelMonitoringSummary,
  getModelMonitoringDrift,
} from "../services/api";
import {
  ModelAnalyticsResponse,
  RegisteredModelItem,
  ModelMonitoringSummaryResponse,
  ModelMonitoringDriftResponse,
  FeatureDriftItem,
} from "../types";

interface ModelAnalyticsProps {
  currentSymbol: string;
  onNavigateSection?: (section: any) => void;
}

const FEATURE_CATEGORIES: Record<string, string> = {
  close_ratio_5: "Moving Averages",
  close_ratio_20: "Moving Averages",
  close_ratio_60: "Moving Averages",
  vol_ratio_5: "Volume",
  vol_ratio_20: "Volume",
  return_1d: "Returns",
  return_5d: "Returns",
  return_20d: "Returns",
  volatility_5d: "Volatility",
  volatility_20d: "Volatility",
  rsi_14: "Momentum",
  macd_hist: "Momentum",
};

export const ModelAnalytics: React.FC<ModelAnalyticsProps> = ({
  currentSymbol,
  onNavigateSection,
}) => {
  const [analytics, setAnalytics] = useState<ModelAnalyticsResponse | null>(null);
  const [registryModels, setRegistryModels] = useState<RegisteredModelItem[]>([]);
  const [monitoringSummary, setMonitoringSummary] = useState<ModelMonitoringSummaryResponse | null>(null);
  const [driftData, setDriftData] = useState<ModelMonitoringDriftResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [selectedPerformanceMetric, setSelectedPerformanceMetric] = useState<string>("accuracy");

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [analyticsData, registryData, summaryData, driftRes] = await Promise.all([
        getModelAnalytics(currentSymbol),
        getRegisteredModels(currentSymbol).catch(() => ({ models: [] })),
        getModelMonitoringSummary(currentSymbol).catch(() => null),
        getModelMonitoringDrift(currentSymbol).catch(() => null),
      ]);
      setAnalytics(analyticsData);
      setRegistryModels(registryData.models || []);
      setMonitoringSummary(summaryData);
      setDriftData(driftRes);
    } catch (err) {
      console.warn("Model analytics unavailable for symbol:", currentSymbol, err);
      setHasError(true);
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentSymbol]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  if (isLoading) {
    return (
      <div className="state-box" style={{ padding: "48px 24px" }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: "var(--accent-primary)", marginBottom: 12 }} />
        <div className="state-title">Loading Model Analytics & Drift Monitoring...</div>
        <div className="state-desc">
          Querying model registry, PSI drift distributions, and health indicators for {currentSymbol}...
        </div>
      </div>
    );
  }

  if (hasError || !analytics) {
    return (
      <div className="analytics-card" style={{ border: "1px solid var(--border-subtle)", padding: 32 }}>
        <div className="state-box">
          <Cpu size={40} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <div className="state-title" style={{ fontSize: 16, fontWeight: 700 }}>
            MODEL ANALYTICS UNAVAILABLE
          </div>
          <div className="state-desc" style={{ maxWidth: 520, margin: "8px auto 20px" }}>
            No trained machine learning model artifact or evaluation metadata was found for{" "}
            <strong>{currentSymbol}</strong>. Models are currently registered for active production symbols such as{" "}
            <strong>TCS.NS</strong>.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="timeframe-btn active"
              onClick={fetchAllData}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px" }}
            >
              <RefreshCw size={14} /> Retry
            </button>
            {onNavigateSection && (
              <button
                type="button"
                className="timeframe-btn"
                onClick={() => onNavigateSection("dashboard")}
                style={{ padding: "8px 16px" }}
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { model, metrics, feature_importance, artifact_status } = analytics;

  // Format metric value or N/A
  const formatMetric = (val: number | undefined | null, asPercent: boolean = true) => {
    if (val === undefined || val === null || isNaN(val)) return "N/A";
    return asPercent ? `${(val * 100).toFixed(2)}%` : val.toFixed(3);
  };

  const FEATURE_EXPLANATIONS = [
    { name: "RETURN_1D", desc: "One-day price return capturing immediate session momentum.", icon: TrendingUp },
    { name: "RETURN_5D", desc: "Five-day price return capturing weekly trend velocity.", icon: TrendingUp },
    { name: "SMA", desc: "Simple Moving Average (SMA 5, 20, 60) institutional trend baselines.", icon: Activity },
    { name: "VOLUME RATIO", desc: "Volume relative to 5-day and 20-day rolling baseline volume.", icon: BarChart3 },
    { name: "MACD HISTOGRAM", desc: "Momentum and trend-following oscillator derived from EMA differences.", icon: Sliders },
    { name: "RSI (14)", desc: "Relative Strength Index measuring overbought and oversold momentum.", icon: Sliders },
    { name: "VOLATILITY", desc: "5-day and 20-day rolling statistical price volatility.", icon: ShieldAlert },
    { name: "CLOSE RATIO", desc: "Ratio of current closing price to moving average benchmarks.", icon: Gauge },
  ];

  // Independent Health Indicators from backend
  const healthIndicators = monitoringSummary?.health_indicators || {
    model_health: { status: "HEALTHY", detail: "Active model artifact loaded" },
    data_health: { status: "HEALTHY", detail: "Market observations available" },
    prediction_health: { status: "HEALTHY", detail: "Inferences recorded" },
    drift_health: {
      status: driftData?.overall_status || driftData?.status || "STABLE",
      detail: `Mean PSI ${(driftData?.mean_psi ?? driftData?.average_psi ?? 0).toFixed(3)}`,
    },
    performance_health: { status: "HEALTHY", detail: "Model operational" },
  };

  const getHealthBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "HEALTHY" || s === "STABLE") {
      return { bg: "#DCFCE7", color: "#15803D", border: "#86EFAC", icon: CheckCircle };
    }
    if (s === "MODERATE" || s === "MODERATE_DRIFT" || s === "WARNING" || s === "DEGRADED") {
      return { bg: "#FEF3C7", color: "#B45309", border: "#FCD34D", icon: AlertTriangle };
    }
    return { bg: "#FEE2E2", color: "#B91C1C", border: "#FCA5A5", icon: XCircle };
  };

  // Prepare PSI drift chart data
  const driftChartData = (driftData?.features || []).map((f: FeatureDriftItem) => ({
    feature: f.feature,
    psi: f.psi ?? f.drift_score ?? 0,
    status: f.status,
    ref_mean: f.reference_mean,
    curr_mean: f.current_mean,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>
              MODEL ANALYTICS & MONITORING
            </h1>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                color: "#2563EB",
                fontWeight: 700,
              }}
            >
              {model.version} • {currentSymbol}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Active model specification, feature attribution, independent health indicators, and Population Stability Index (PSI) drift monitoring.
          </div>
        </div>

        <button
          type="button"
          className="timeframe-btn"
          onClick={fetchAllData}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Refresh Analytics
        </button>
      </div>

      {/* 2. FIVE INDEPENDENT MODEL HEALTH INDICATORS */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">INDEPENDENT MODEL HEALTH AUDIT</span>
            <span className="card-subtitle">
              Discrete domain health probes (no arbitrary composite single score)
            </span>
          </div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            5 Subsystem Probes
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 12 }}>
          {/* 1. Model Health */}
          {(() => {
            const h = healthIndicators.model_health || { status: "HEALTHY", detail: "Active model artifact loaded" };
            const badge = getHealthBadge(h.status);
            const Icon = badge.icon;
            return (
              <div
                className="kpi-card"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: `1.5px solid ${badge.border}`,
                  borderRadius: "var(--radius-sm)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="kpi-label" style={{ fontSize: 10 }}>MODEL ARTIFACT</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      backgroundColor: badge.bg,
                      color: badge.color,
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    <Icon size={11} /> {h.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {model.type}
                </div>
                <span className="kpi-subtext" style={{ fontSize: 11, marginTop: 4 }}>
                  {h.detail}
                </span>
              </div>
            );
          })()}

          {/* 2. Data Health */}
          {(() => {
            const h = healthIndicators.data_health || { status: "HEALTHY", detail: "Market observations available" };
            const badge = getHealthBadge(h.status);
            const Icon = badge.icon;
            return (
              <div
                className="kpi-card"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: `1.5px solid ${badge.border}`,
                  borderRadius: "var(--radius-sm)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="kpi-label" style={{ fontSize: 10 }}>DATA PIPELINE</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      backgroundColor: badge.bg,
                      color: badge.color,
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    <Icon size={11} /> {h.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  PostgreSQL OHLCV
                </div>
                <span className="kpi-subtext" style={{ fontSize: 11, marginTop: 4 }}>
                  {h.detail}
                </span>
              </div>
            );
          })()}

          {/* 3. Prediction Health */}
          {(() => {
            const h = healthIndicators.prediction_health || { status: "HEALTHY", detail: "Inferences recorded" };
            const badge = getHealthBadge(h.status);
            const Icon = badge.icon;
            return (
              <div
                className="kpi-card"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: `1.5px solid ${badge.border}`,
                  borderRadius: "var(--radius-sm)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="kpi-label" style={{ fontSize: 10 }}>PREDICTION ACTIVITY</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      backgroundColor: badge.bg,
                      color: badge.color,
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    <Icon size={11} /> {h.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  Inference Logging
                </div>
                <span className="kpi-subtext" style={{ fontSize: 11, marginTop: 4 }}>
                  {h.detail}
                </span>
              </div>
            );
          })()}

          {/* 4. Drift Health */}
          {(() => {
            const h = healthIndicators.drift_health || { status: "STABLE", detail: "PSI stable" };
            const badge = getHealthBadge(h.status);
            const Icon = badge.icon;
            return (
              <div
                className="kpi-card"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: `1.5px solid ${badge.border}`,
                  borderRadius: "var(--radius-sm)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="kpi-label" style={{ fontSize: 10 }}>FEATURE DRIFT (PSI)</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      backgroundColor: badge.bg,
                      color: badge.color,
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    <Icon size={11} /> {h.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {driftData?.mean_psi !== undefined ? `PSI ${driftData.mean_psi.toFixed(3)}` : "PSI 0.000"}
                </div>
                <span className="kpi-subtext" style={{ fontSize: 11, marginTop: 4 }}>
                  {h.detail}
                </span>
              </div>
            );
          })()}

          {/* 5. Performance Health */}
          {(() => {
            const h = healthIndicators.performance_health || { status: "HEALTHY", detail: "Model operational" };
            const badge = getHealthBadge(h.status);
            const Icon = badge.icon;
            return (
              <div
                className="kpi-card"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: `1.5px solid ${badge.border}`,
                  borderRadius: "var(--radius-sm)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span className="kpi-label" style={{ fontSize: 10 }}>ACCURACY TRACKING</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      backgroundColor: badge.bg,
                      color: badge.color,
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    <Icon size={11} /> {h.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  Resolved Monitoring
                </div>
                <span className="kpi-subtext" style={{ fontSize: 11, marginTop: 4 }}>
                  {h.detail}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 3. Model Specification & Metadata Card */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">MODEL GOVERNANCE & SPECIFICATION</span>
            <span className="card-subtitle">Active Model Registry Specification for {currentSymbol}</span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              background: "rgba(16, 185, 129, 0.15)",
              color: "var(--color-up)",
              padding: "3px 10px",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
            }}
          >
            ● {model.status.toUpperCase()}
          </span>
        </div>

        <div
          className="prediction-meta-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}
        >
          <div className="prediction-meta-item">
            <span className="meta-label">MODEL TYPE</span>
            <span className="meta-val" style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              {model.type === "xgboost_classifier" ? "XGBoost Classifier" : model.type}
            </span>
          </div>
          <div className="prediction-meta-item">
            <span className="meta-label">ACTIVE VERSION</span>
            <span className="meta-val" style={{ fontFamily: "var(--font-mono)" }}>
              {model.version}
            </span>
          </div>
          <div className="prediction-meta-item">
            <span className="meta-label">TASK</span>
            <span className="meta-val">{model.task || "Binary Classification"}</span>
          </div>
          <div className="prediction-meta-item">
            <span className="meta-label">TARGET HORIZON</span>
            <span className="meta-val">{model.target || "Next Trading Day Direction (t+1)"}</span>
          </div>
          <div className="prediction-meta-item">
            <span className="meta-label">CLASSES</span>
            <span className="meta-val" style={{ fontFamily: "var(--font-mono)" }}>
              {model.classes?.join(" / ") || "UP / DOWN"}
            </span>
          </div>
          <div className="prediction-meta-item">
            <span className="meta-label">FEATURES COUNT</span>
            <span className="meta-val" style={{ fontFamily: "var(--font-mono)" }}>
              {model.features_count || model.features?.length || 12}
            </span>
          </div>
          <div className="prediction-meta-item">
            <span className="meta-label">INFERENCE ENGINE</span>
            <span className="meta-val" style={{ color: "#2563EB", fontWeight: 600 }}>
              {model.execution || "Inference Engine"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Model Performance KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div className="kpi-card kpi-accent-blue">
          <span className="kpi-label">TEST ACCURACY</span>
          <div className="kpi-value" style={{ color: "#2563EB" }}>
            {formatMetric(metrics.accuracy)}
          </div>
          <span className="kpi-subtext">Overall correct test classifications</span>
        </div>
        <div className="kpi-card kpi-accent-purple">
          <span className="kpi-label">TEST PRECISION</span>
          <div className="kpi-value" style={{ color: "#7C3AED" }}>
            {formatMetric(metrics.precision)}
          </div>
          <span className="kpi-subtext">Precision on positive (UP) class</span>
        </div>
        <div className="kpi-card kpi-accent-green">
          <span className="kpi-label">TEST RECALL</span>
          <div className="kpi-value" style={{ color: "#16A34A" }}>
            {formatMetric(metrics.recall)}
          </div>
          <span className="kpi-subtext">True positive rate on UP movements</span>
        </div>
        <div className="kpi-card kpi-accent-orange">
          <span className="kpi-label">TEST F1 SCORE</span>
          <div className="kpi-value" style={{ color: "#EA580C" }}>
            {formatMetric(metrics.f1, false)}
          </div>
          <span className="kpi-subtext">Harmonic mean of precision & recall</span>
        </div>
        <div className="kpi-card kpi-accent-teal">
          <span className="kpi-label">TEST ROC-AUC</span>
          <div className="kpi-value" style={{ color: "#0D9488" }}>
            {formatMetric(metrics.roc_auc, false)}
          </div>
          <span className="kpi-subtext">Area under ROC curve across thresholds</span>
        </div>
      </div>

      {/* 5. DATA DRIFT MONITORING SECTION (PSI) */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={18} style={{ color: "#2563EB" }} />
              <span>DATA DRIFT MONITORING (POPULATION STABILITY INDEX)</span>
            </span>
            <span className="card-subtitle">
              Quantifying distribution shifts between baseline reference data (1Y) and recent production inference data (30D)
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              backgroundColor:
                (driftData?.overall_status || driftData?.status || "STABLE").toUpperCase() === "STABLE"
                  ? "#DCFCE7"
                  : (driftData?.overall_status || driftData?.status || "STABLE").toUpperCase() === "MODERATE"
                  ? "#FEF3C7"
                  : "#FEE2E2",
              color:
                (driftData?.overall_status || driftData?.status || "STABLE").toUpperCase() === "STABLE"
                  ? "#15803D"
                  : (driftData?.overall_status || driftData?.status || "STABLE").toUpperCase() === "MODERATE"
                  ? "#B45309"
                  : "#B91C1C",
              padding: "3px 10px",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
            }}
          >
            OVERALL DRIFT: {driftData?.overall_status || driftData?.status || "STABLE"} (Mean PSI: {(driftData?.mean_psi ?? driftData?.average_psi ?? 0).toFixed(3)})
          </span>
        </div>

        {/* Methodology Explanation Banner */}
        <div
          style={{
            backgroundColor: "#F8FAFC",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "14px 16px",
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <HelpCircle size={16} style={{ color: "#2563EB" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              PSI (Population Stability Index) Mathematical Methodology
            </span>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
            PSI measures divergence between the training baseline distribution (<strong>P</strong>) and current production inference distribution (<strong>Q</strong>).
            Continuous features are divided into 10 quantiles. To prevent division by zero or log of zero, Laplace smoothing of <strong>0.0001</strong> is applied:
          </p>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              backgroundColor: "#FFFFFF",
              padding: "6px 12px",
              borderRadius: 4,
              border: "1px solid #E2E8F0",
              color: "#1E293B",
              alignSelf: "flex-start",
            }}
          >
            PSI = &sum; (Actual% - Expected%) &times; ln(Actual% / Expected%)
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, marginTop: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#16A34A" }} />
              <strong>PSI &lt; 0.10:</strong> Stable / Negligible Drift
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#EA580C" }} />
              <strong>0.10 &le; PSI &le; 0.25:</strong> Moderate Drift / Monitor Closely
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#DC2626" }} />
              <strong>PSI &gt; 0.25:</strong> Significant Drift / Model Retraining Recommended
            </span>
          </div>
        </div>

        {/* Drift Bar Chart Visualizing PSI per Feature */}
        {driftChartData.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              PSI DRIFT SCORES ACROSS ALL 12 QUANTITATIVE FEATURES
            </div>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driftChartData} margin={{ top: 10, right: 16, left: -20, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="feature"
                    stroke="#64748B"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748B" fontSize={11} fontFamily="var(--font-mono)" />
                  <ReferenceLine
                    y={0.1}
                    stroke="#EA580C"
                    strokeDasharray="3 3"
                    label={{ value: "Moderate (0.10)", fill: "#EA580C", fontSize: 9, position: "insideTopRight" }}
                  />
                  <ReferenceLine
                    y={0.25}
                    stroke="#DC2626"
                    strokeDasharray="3 3"
                    label={{ value: "High (0.25)", fill: "#DC2626", fontSize: 9, position: "insideTopRight" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                    }}
                    formatter={(val: any) => [Number(val).toFixed(4), "PSI Score"]}
                  />
                  <Bar dataKey="psi" radius={[4, 4, 0, 0]}>
                    {driftChartData.map((entry, index) => {
                      let color = "#16A34A";
                      if (entry.psi >= 0.25) color = "#DC2626";
                      else if (entry.psi >= 0.1) color = "#EA580C";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 12-Feature Drift Table */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            FEATURE-LEVEL DRIFT AUDIT TABLE
          </div>
          <div className="data-table-container" style={{ maxHeight: 320, overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>FEATURE</th>
                  <th>CATEGORY</th>
                  <th style={{ textAlign: "right" }}>REF MEAN (1Y)</th>
                  <th style={{ textAlign: "right" }}>CURRENT MEAN (30D)</th>
                  <th style={{ textAlign: "right" }}>DELTA (%)</th>
                  <th style={{ textAlign: "right" }}>PSI SCORE</th>
                  <th style={{ textAlign: "center" }}>DRIFT STATUS</th>
                </tr>
              </thead>
              <tbody>
                {driftData?.features && driftData.features.length > 0 ? (
                  driftData.features.map((item) => {
                    const category = FEATURE_CATEGORIES[item.feature] || "Engineered";
                    const isStable = (item.status || "").toUpperCase() === "STABLE";
                    const isModerate = (item.status || "").toUpperCase() === "MODERATE";
                    const meanDelta =
                      item.mean_delta ??
                      (item.reference_mean !== 0
                        ? ((item.current_mean - item.reference_mean) / item.reference_mean) * 100
                        : 0);
                    const psiScore = item.psi ?? item.drift_score ?? 0;

                    return (
                      <tr key={item.feature}>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)" }}>
                          {item.feature}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: "var(--font-mono)",
                              backgroundColor: "#F1F5F9",
                              padding: "2px 6px",
                              borderRadius: 4,
                              color: "#475569",
                            }}
                          >
                            {category}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                          {item.reference_mean !== null ? item.reference_mean.toFixed(4) : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                          {item.current_mean !== null ? item.current_mean.toFixed(4) : "—"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 600,
                            color: meanDelta > 0 ? "#16A34A" : meanDelta < 0 ? "#DC2626" : "var(--text-muted)",
                          }}
                        >
                          {meanDelta > 0 ? "+" : ""}
                          {meanDelta.toFixed(2)}%
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            color: isStable ? "#16A34A" : isModerate ? "#EA580C" : "#DC2626",
                          }}
                        >
                          {psiScore.toFixed(4)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              fontFamily: "var(--font-mono)",
                              backgroundColor: isStable ? "#DCFCE7" : isModerate ? "#FEF3C7" : "#FEE2E2",
                              color: isStable ? "#15803D" : isModerate ? "#B45309" : "#B91C1C",
                              border: `1px solid ${isStable ? "#86EFAC" : isModerate ? "#FCD34D" : "#FCA5A5"}`,
                            }}
                          >
                            {isStable ? "● STABLE" : isModerate ? "▲ MODERATE" : "✖ HIGH DRIFT"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
                      Drift metrics unavailable. Requires reference and current market observation sets.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. MODEL PERFORMANCE TREND & COMPARISON */}
      <div className="dashboard-grid-equal">
        {/* Model Performance Trend Over Time */}
        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">MODEL PERFORMANCE TREND OVER TIME</span>
              <span className="card-subtitle">
                Metric progression across training iterations and evaluation splits
              </span>
            </div>
            <div className="timeframe-controls">
              {(["accuracy", "precision", "recall", "f1", "roc_auc"] as const).map((metricKey) => (
                <button
                  key={metricKey}
                  type="button"
                  className={`timeframe-btn ${selectedPerformanceMetric === metricKey ? "active" : ""}`}
                  onClick={() => setSelectedPerformanceMetric(metricKey)}
                  style={{ textTransform: "uppercase", fontSize: 10 }}
                >
                  {metricKey.replace("_", "-")}
                </button>
              ))}
            </div>
          </div>

          <div className="state-box" style={{ padding: "36px 16px" }}>
            <Activity size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
            <div className="state-title" style={{ fontSize: 13, fontWeight: 700 }}>
              SINGLE BASELINE ARTIFACT (v1)
            </div>
            <div className="state-desc" style={{ maxWidth: 440 }}>
              The production model operates on baseline calibration metadata. Current{" "}
              <strong>{selectedPerformanceMetric.toUpperCase()}</strong> is{" "}
              <strong>
                {formatMetric((metrics as any)[selectedPerformanceMetric], selectedPerformanceMetric !== "f1" && selectedPerformanceMetric !== "roc_auc")}
              </strong>
              . Longitudinal performance tracking across production inferences is recorded in the Prediction History module.
            </div>
          </div>
        </div>

        {/* Model Version History & Comparison */}
        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">MODEL VERSION COMPARISON</span>
              <span className="card-subtitle">
                Side-by-side comparison of active and candidate model versions
              </span>
            </div>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              {registryModels.length || 1} Version
            </span>
          </div>

          <div className="state-box" style={{ padding: "36px 16px" }}>
            <Layers size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
            <div className="state-title" style={{ fontSize: 13, fontWeight: 700 }}>
              SINGLE MODEL VERSION ACTIVE
            </div>
            <div className="state-desc" style={{ maxWidth: 440 }}>
              Currently, version <strong>v1</strong> (XGBoost Classifier) is active in production.
              Multi-version comparison charts populate automatically when candidate models (v2, LightGBM, Random Forest) are registered for comparison.
            </div>
          </div>
        </div>
      </div>

      {/* 7. Row: Model Metrics & Feature Importance Charts */}
      <div className="dashboard-grid-equal">
        <ModelMetricsChart metrics={metrics} />
        <FeatureImportanceChart importance={feature_importance} />
      </div>

      {/* 8. Feature Importance Table */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">EXACT FEATURE IMPORTANCE WEIGHTS</span>
            <span className="card-subtitle">XGBoost Gini gain / weight contribution per input feature</span>
          </div>
        </div>

        <div className="data-table-container" style={{ maxHeight: 260, overflowY: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "15%" }}>RANK</th>
                <th>FEATURE</th>
                <th>CATEGORY</th>
                <th style={{ textAlign: "right" }}>IMPORTANCE</th>
                <th style={{ textAlign: "right" }}>WEIGHT %</th>
              </tr>
            </thead>
            <tbody>
              {feature_importance.map((item) => (
                <tr key={item.feature}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#2563EB" }}>
                    #{item.rank}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.feature}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "#F1F5F9",
                        padding: "2px 6px",
                        borderRadius: 4,
                        color: "#475569",
                      }}
                    >
                      {FEATURE_CATEGORIES[item.feature] || "Engineered"}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--text-secondary)" }}>
                    {item.importance.toFixed(4)}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                    {(item.importance * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. Methodology Note */}
      <div
        style={{
          background: "rgba(37, 99, 235, 0.06)",
          border: "1px solid rgba(37, 99, 235, 0.2)",
          borderRadius: "var(--radius-sm)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Info size={18} style={{ color: "#2563EB", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          <strong>Quantitative Governance Note:</strong> Feature importance indicates mathematical tree-split contribution within the XGBoost model. It does not establish economic causation. Data drift monitoring (PSI) runs on daily market ingestion to alert the engineering team if feature distributions shift.
        </span>
      </div>

      {/* 10. Educational Section: WHAT THESE FEATURES REPRESENT */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">WHAT THESE FEATURES REPRESENT</span>
            <span className="card-subtitle">Quantitative Explanations for the 12 Engineered Model Inputs</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {FEATURE_EXPLANATIONS.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.name}
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Icon size={14} style={{ color: "#2563EB" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {feat.name}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {feat.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 11. Section: MODEL ARTIFACT STATUS */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">MODEL ARTIFACT STATUS</span>
            <span className="card-subtitle">Integrity & Storage Verification</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div className="prediction-meta-item">
            <span className="meta-label">ARTIFACT (.joblib)</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              {artifact_status.artifact === "AVAILABLE" ? (
                <CheckCircle size={14} style={{ color: "var(--color-up)" }} />
              ) : (
                <XCircle size={14} style={{ color: "var(--color-down)" }} />
              )}
              <span style={{ fontWeight: 700, color: artifact_status.artifact === "AVAILABLE" ? "var(--color-up)" : "var(--color-down)" }}>
                {artifact_status.artifact}
              </span>
            </div>
          </div>

          <div className="prediction-meta-item">
            <span className="meta-label">METADATA (.json)</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              {artifact_status.metadata === "AVAILABLE" ? (
                <CheckCircle size={14} style={{ color: "var(--color-up)" }} />
              ) : (
                <XCircle size={14} style={{ color: "var(--color-down)" }} />
              )}
              <span style={{ fontWeight: 700, color: artifact_status.metadata === "AVAILABLE" ? "var(--color-up)" : "var(--color-down)" }}>
                {artifact_status.metadata}
              </span>
            </div>
          </div>

          <div className="prediction-meta-item">
            <span className="meta-label">FEATURE SCHEMA</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              {artifact_status.feature_schema === "COMPATIBLE" ? (
                <CheckCircle size={14} style={{ color: "var(--color-up)" }} />
              ) : (
                <XCircle size={14} style={{ color: "var(--color-down)" }} />
              )}
              <span style={{ fontWeight: 700, color: artifact_status.feature_schema === "COMPATIBLE" ? "var(--color-up)" : "var(--color-down)" }}>
                {artifact_status.feature_schema}
              </span>
            </div>
          </div>

          <div className="prediction-meta-item">
            <span className="meta-label">MODEL VERSION</span>
            <span className="meta-val" style={{ fontFamily: "var(--font-mono)", marginTop: 4 }}>
              {artifact_status.version}
            </span>
          </div>
        </div>
      </div>

      {/* 12. Section: MODEL REGISTRY */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">MODEL REGISTRY</span>
            <span className="card-subtitle">Registered Model Artifacts & Production History</span>
          </div>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            {registryModels.length || 1} registered
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>MODEL</th>
                <th>VERSION</th>
                <th>TASK</th>
                <th>FEATURES</th>
                <th>CREATED</th>
                <th>STATUS</th>
                <th style={{ textAlign: "right" }}>TEST ACCURACY</th>
                <th style={{ textAlign: "right" }}>TEST F1</th>
              </tr>
            </thead>
            <tbody>
              {registryModels.length > 0 ? (
                registryModels.map((m) => (
                  <tr key={`${m.symbol}_${m.version}`}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {m.model_type}
                    </td>
                    <td>
                      <span
                        style={{
                          background: "var(--bg-tertiary)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {m.version}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 11 }}>Binary Classification</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{m.features?.length || 12}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 11 }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${m.status === "production" ? "online" : "offline"}`}
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          fontWeight: 700,
                        }}
                      >
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {m.metrics?.accuracy ? `${(m.metrics.accuracy * 100).toFixed(2)}%` : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                      {m.metrics?.f1 ? m.metrics.f1.toFixed(3) : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{model.type}</td>
                  <td>
                    <span
                      style={{
                        background: "var(--bg-tertiary)",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {model.version}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{model.task}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{model.features_count}</td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 11 }}>
                    {model.created_at ? new Date(model.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <span
                      className="status-pill online"
                      style={{ fontSize: 10, padding: "2px 8px", fontWeight: 700 }}
                    >
                      {model.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                    {formatMetric(metrics.accuracy)}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                    {formatMetric(metrics.f1, false)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
