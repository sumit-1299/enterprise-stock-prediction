import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  History,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
  BarChart2,
  ShieldCheck,
  RefreshCw,
  Cpu,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  getPredictionHistory,
  getModelMonitoringPerformance,
  getModelMonitoringSummary,
  getPredictionDetail,
} from "../services/api";
import {
  PredictionHistoryItem,
  ModelMonitoringPerformanceResponse,
  ModelMonitoringSummaryResponse,
} from "../types";

interface PredictionHistoryProps {
  currentSymbol: string;
  history?: PredictionHistoryItem[];
  isLoading?: boolean;
  page?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (newPage: number) => void;
}

type DirectionFilter = "ALL" | "UP" | "DOWN";
type OutcomeFilter = "ALL" | "CORRECT" | "INCORRECT" | "PENDING";
type PeriodFilter = "7D" | "30D" | "90D" | "1Y" | "ALL";
type SortField = "generated_at" | "probability" | "actual_return" | "latency_ms";
type SortOrder = "asc" | "desc";

const FEATURE_METADATA: Record<string, { label: string; category: string; description: string }> = {
  close_ratio_5: { label: "Close Ratio (5D)", category: "Moving Averages", description: "Ratio of closing price to 5-day SMA" },
  close_ratio_20: { label: "Close Ratio (20D)", category: "Moving Averages", description: "Ratio of closing price to 20-day SMA" },
  close_ratio_60: { label: "Close Ratio (60D)", category: "Moving Averages", description: "Ratio of closing price to 60-day SMA" },
  vol_ratio_5: { label: "Volume Ratio (5D)", category: "Volume", description: "Ratio of trading volume to 5-day volume SMA" },
  vol_ratio_20: { label: "Volume Ratio (20D)", category: "Volume", description: "Ratio of trading volume to 20-day volume SMA" },
  return_1d: { label: "1D Return", category: "Returns", description: "1-day percentage price change" },
  return_5d: { label: "5D Return", category: "Returns", description: "5-day percentage price change" },
  return_20d: { label: "20D Return", category: "Returns", description: "20-day percentage price change" },
  volatility_5d: { label: "5D Volatility", category: "Volatility", description: "5-day rolling annualized price volatility" },
  volatility_20d: { label: "20D Volatility", category: "Volatility", description: "20-day rolling annualized price volatility" },
  rsi_14: { label: "RSI (14)", category: "Momentum", description: "14-day Relative Strength Index momentum oscillator" },
  macd_hist: { label: "MACD Histogram", category: "Momentum", description: "Difference between MACD line and 9-day signal line" },
};

import { SUPPORTED_STOCKS } from "../config/stocks";

export const PredictionHistory: React.FC<PredictionHistoryProps> = ({
  currentSymbol: initialSymbol,
}) => {
  const [symbol, setSymbol] = useState<string>(initialSymbol || "TCS.NS");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("ALL");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("ALL");
  const [modelVersionFilter, setModelVersionFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [historyItems, setHistoryItems] = useState<PredictionHistoryItem[]>([]);
  const [performance, setPerformance] = useState<ModelMonitoringPerformanceResponse | null>(null);
  const [summary, setSummary] = useState<ModelMonitoringSummaryResponse | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>("generated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Drawer / Modal detail state
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionHistoryItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Sync initial symbol if parent changes
  useEffect(() => {
    if (initialSymbol && initialSymbol !== symbol) {
      setSymbol(initialSymbol);
      setPage(1);
    }
  }, [initialSymbol]);

  // Fetch prediction history with filters
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [historyRes, perfRes, sumRes] = await Promise.all([
        getPredictionHistory({
          symbol,
          page,
          pageSize,
          direction: directionFilter,
          outcome: outcomeFilter,
          period: periodFilter,
          modelVersion: modelVersionFilter,
        }).catch(() => ({ count: 0, page: 1, total_pages: 1, history: [] })),
        getModelMonitoringPerformance(symbol, periodFilter).catch(() => null),
        getModelMonitoringSummary(symbol).catch(() => null),
      ]);

      setHistoryItems(historyRes.history || []);
      setTotalPages(historyRes.total_pages || 1);
      setTotalCount(historyRes.count || 0);
      setPerformance(perfRes);
      setSummary(sumRes);
    } catch (err) {
      console.error("Failed to fetch prediction history data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, page, pageSize, directionFilter, outcomeFilter, periodFilter, modelVersionFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open detail modal and fetch full detail (including feature snapshot)
  const handleOpenDetail = async (item: PredictionHistoryItem) => {
    setSelectedPrediction(item);
    if (item.id) {
      setIsLoadingDetail(true);
      try {
        const full = await getPredictionDetail(item.id);
        setSelectedPrediction(full);
      } catch (err) {
        console.warn("Could not fetch full prediction detail, using table item:", err);
      } finally {
        setIsLoadingDetail(false);
      }
    }
  };

  const handleCloseDetail = () => {
    setSelectedPrediction(null);
  };

  // Sort history client-side for immediate responsive interaction
  const sortedHistory = useMemo(() => {
    return [...historyItems].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "generated_at") {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (sortField === "probability" || sortField === "actual_return" || sortField === "latency_ms") {
        valA = Number(valA ?? -9999);
        valB = Number(valB ?? -9999);
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [historyItems, sortField, sortOrder]);

  // Client search filter (for symbol, prediction, model, or notes)
  const displayedHistory = useMemo(() => {
    if (!searchQuery.trim()) return sortedHistory;
    const q = searchQuery.toLowerCase().trim();
    return sortedHistory.filter(
      (item) =>
        (item.symbol || "").toLowerCase().includes(q) ||
        (item.prediction || "").toLowerCase().includes(q) ||
        (item.outcome || "").toLowerCase().includes(q) ||
        (item.model_type || "").toLowerCase().includes(q) ||
        (item.model_version || "").toLowerCase().includes(q)
    );
  }, [sortedHistory, searchQuery]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // KPI calculations
  const totalPredictions = performance?.summary?.total ?? summary?.predictions?.total ?? totalCount;
  const resolvedPredictions = performance?.summary?.resolved ?? summary?.predictions?.resolved ?? 0;
  const correctPredictions = performance?.summary?.correct ?? summary?.predictions?.correct ?? 0;
  const incorrectPredictions = performance?.summary?.incorrect ?? summary?.predictions?.incorrect ?? 0;
  const pendingPredictions = performance?.summary?.pending ?? summary?.predictions?.pending ?? 0;
  const accuracy = performance?.summary?.accuracy ?? summary?.predictions?.accuracy ?? null;

  const confusionMatrix = performance?.confusion_matrix;
  const accuracyTimeline = performance?.accuracy_timeline || [];
  const confidenceBuckets = performance?.confidence_buckets || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Header & Filters Card */}
      <div className="analytics-card">
        <div className="card-header-row" style={{ flexWrap: "wrap", gap: 16 }}>
          <div className="card-title-group">
            <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <History size={20} style={{ color: "#2563EB" }} />
              <span>PREDICTION HISTORY & MODEL MONITORING</span>
            </span>
            <span className="card-subtitle">
              Auditable record of historical model inferences, realized market outcomes, and directional accuracy
            </span>
          </div>

          <button
            type="button"
            className="timeframe-btn"
            onClick={fetchData}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /> Refresh Data
          </button>
        </div>

        {/* Filter Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {/* Symbol Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>Symbol:</span>
            <select
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                color: "#2563EB",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "var(--radius-sm)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {SUPPORTED_STOCKS.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol.replace(".NS", "")} — {s.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* Direction Filter */}
          <div className="timeframe-controls">
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", paddingLeft: 4 }}>
              Direction:
            </span>
            {(["ALL", "UP", "DOWN"] as DirectionFilter[]).map((dir) => (
              <button
                key={dir}
                type="button"
                className={`timeframe-btn ${directionFilter === dir ? "active" : ""}`}
                onClick={() => {
                  setDirectionFilter(dir);
                  setPage(1);
                }}
              >
                {dir}
              </button>
            ))}
          </div>

          {/* Outcome Filter */}
          <div className="timeframe-controls">
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", paddingLeft: 4 }}>
              Outcome:
            </span>
            {(["ALL", "CORRECT", "INCORRECT", "PENDING"] as OutcomeFilter[]).map((out) => (
              <button
                key={out}
                type="button"
                className={`timeframe-btn ${outcomeFilter === out ? "active" : ""}`}
                onClick={() => {
                  setOutcomeFilter(out);
                  setPage(1);
                }}
              >
                {out}
              </button>
            ))}
          </div>

          {/* Period Filter */}
          <div className="timeframe-controls">
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", paddingLeft: 4 }}>
              Period:
            </span>
            {(["7D", "30D", "90D", "1Y", "ALL"] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`timeframe-btn ${periodFilter === p ? "active" : ""}`}
                onClick={() => {
                  setPeriodFilter(p);
                  setPage(1);
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Model Version Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>Version:</span>
            <select
              value={modelVersionFilter}
              onChange={(e) => {
                setModelVersionFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "var(--radius-sm)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="ALL">ALL</option>
              <option value="v1">v1 (Active)</option>
            </select>
          </div>

          {/* Search Query */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#F8FAFC",
              border: "1px solid #CBD5E1",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              marginLeft: "auto",
            }}
          >
            <Search size={14} style={{ color: "#64748B" }} />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
                width: 140,
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Performance Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        {/* Total Predictions */}
        <div className="kpi-card kpi-accent-blue">
          <div className="kpi-header">
            <span className="kpi-label">TOTAL PREDICTIONS</span>
            <div className="icon-badge icon-badge-blue">
              <Cpu size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#2563EB" }}>
            {totalPredictions}
          </div>
          <span className="kpi-subtext">Historical inferences recorded</span>
        </div>

        {/* Resolved Predictions */}
        <div className="kpi-card kpi-accent-indigo">
          <div className="kpi-header">
            <span className="kpi-label">RESOLVED</span>
            <div className="icon-badge icon-badge-indigo">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#4F46E5" }}>
            {resolvedPredictions}
          </div>
          <span className="kpi-subtext">Realized market outcomes (t+1)</span>
        </div>

        {/* Correct Predictions */}
        <div className="kpi-card kpi-accent-green">
          <div className="kpi-header">
            <span className="kpi-label">CORRECT</span>
            <div className="icon-badge icon-badge-green">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#16A34A" }}>
            {correctPredictions}
          </div>
          <span className="kpi-subtext">Direction matched market return</span>
        </div>

        {/* Incorrect Predictions */}
        <div className="kpi-card kpi-accent-red">
          <div className="kpi-header">
            <span className="kpi-label">INCORRECT</span>
            <div className="icon-badge icon-badge-red">
              <XCircle size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#DC2626" }}>
            {incorrectPredictions}
          </div>
          <span className="kpi-subtext">Direction opposed market return</span>
        </div>

        {/* Pending Predictions */}
        <div className="kpi-card kpi-accent-orange">
          <div className="kpi-header">
            <span className="kpi-label">PENDING</span>
            <div className="icon-badge icon-badge-orange">
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#EA580C" }}>
            {pendingPredictions}
          </div>
          <span className="kpi-subtext">Awaiting next market price (t+1)</span>
        </div>

        {/* Historical Accuracy */}
        <div className="kpi-card kpi-accent-teal">
          <div className="kpi-header">
            <span className="kpi-label">HISTORICAL ACCURACY</span>
            <div className="icon-badge icon-badge-teal">
              <BarChart2 size={16} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: "#0D9488" }}>
            {accuracy !== null && accuracy !== undefined ? `${(accuracy * 100).toFixed(1)}%` : "N/A"}
          </div>
          <span className="kpi-subtext">
            {resolvedPredictions > 0
              ? `${correctPredictions}/${resolvedPredictions} resolved correct`
              : "No resolved predictions yet"}
          </span>
        </div>
      </div>

      {/* 3. Accuracy Over Time & Confidence Buckets Charts */}
      <div className="dashboard-grid-equal">
        {/* Accuracy Over Time Chart */}
        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">PREDICTION ACCURACY OVER TIME</span>
              <span className="card-subtitle">
                {symbol} • Cumulative and rolling accuracy calculated strictly from resolved predictions
              </span>
            </div>
          </div>

          {accuracyTimeline.length >= 2 ? (
            <div style={{ width: "100%", height: 240, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accuracyTimeline} margin={{ top: 10, right: 16, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    fontSize={11}
                    fontFamily="var(--font-mono)"
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#64748B"
                    fontSize={11}
                    fontFamily="var(--font-mono)"
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ReferenceLine
                    y={50}
                    stroke="#94A3B8"
                    strokeDasharray="4 4"
                    label={{ value: "50% Baseline", fill: "#64748B", fontSize: 10, position: "insideBottomRight" }}
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
                    formatter={(val: any, name: any) => [
                      `${Number(val).toFixed(1)}%`,
                      String(name) === "accuracy" ? "Cumulative Accuracy" : "Rolling Accuracy (5D)",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    name="Cumulative Accuracy"
                    stroke="#2563EB"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#2563EB" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rolling_accuracy"
                    name="Rolling Accuracy"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="state-box" style={{ padding: "32px 16px" }}>
              <Clock size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
              <div className="state-title" style={{ fontSize: 13, fontWeight: 700 }}>
                INSUFFICIENT RESOLVED PREDICTIONS
              </div>
              <div className="state-desc" style={{ maxWidth: 440 }}>
                At least 2 resolved predictions are required to plot accuracy over time. Currently{" "}
                <strong>{resolvedPredictions}</strong> prediction is resolved and{" "}
                <strong>{pendingPredictions}</strong> are pending next trading day realization.
              </div>
            </div>
          )}
        </div>

        {/* Confidence vs Outcome Buckets Chart */}
        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">CONFIDENCE VS OUTCOME BUCKETS</span>
              <span className="card-subtitle">
                Resolved prediction outcomes grouped by predicted probability ranges
              </span>
            </div>
          </div>

          {confidenceBuckets.some((b) => (b.total ?? b.total_count ?? 0) > 0) ? (
            <div style={{ width: "100%", height: 240, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceBuckets} margin={{ top: 10, right: 16, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="bucket" stroke="#64748B" fontSize={11} fontFamily="var(--font-mono)" />
                  <YAxis stroke="#64748B" fontSize={11} fontFamily="var(--font-mono)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      color: "#0F172A",
                    }}
                    formatter={(val: any, name: any) => [
                      val,
                      String(name) === "correct" ? "Correct" : "Incorrect",
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-mono)" }}
                    formatter={(val) => (val === "correct" ? "Correct Outcome" : "Incorrect Outcome")}
                  />
                  <Bar dataKey="correct" name="correct" fill="#16A34A" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="incorrect" name="incorrect" fill="#DC2626" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="state-box" style={{ padding: "32px 16px" }}>
              <BarChart2 size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
              <div className="state-title" style={{ fontSize: 13, fontWeight: 700 }}>
                NO RESOLVED BUCKET DATA
              </div>
              <div className="state-desc" style={{ maxWidth: 440 }}>
                No resolved predictions are currently available to populate probability confidence buckets.
                Pending predictions will be categorized automatically as future market observations occur.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Confusion Matrix & Positive Class UP Metrics */}
      <div className="dashboard-grid-equal">
        {/* Confusion Matrix Heatmap */}
        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">CONFUSION MATRIX (POSITIVE CLASS: UP)</span>
              <span className="card-subtitle">
                Resolved predictions evaluated against realized market direction
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                background: "#EFF6FF",
                color: "#2563EB",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              Binary Classification
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 1fr",
                gap: 8,
                textAlign: "center",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
            >
              {/* Header row */}
              <div />
              <div style={{ fontWeight: 700, color: "var(--text-secondary)", padding: 4 }}>
                ACTUAL UP
              </div>
              <div style={{ fontWeight: 700, color: "var(--text-secondary)", padding: 4 }}>
                ACTUAL DOWN
              </div>

              {/* Row 1: PREDICTED UP */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 8,
                  fontWeight: 700,
                  color: "#16A34A",
                }}
              >
                PRED UP
              </div>
              {/* True Positive */}
              <div
                style={{
                  backgroundColor: "#DCFCE7",
                  border: "1.5px solid #86EFAC",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px 8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10, color: "#15803D", fontWeight: 700 }}>TRUE POSITIVE (TP)</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#15803D" }}>
                  {confusionMatrix?.tp ?? 0}
                </span>
                <span style={{ fontSize: 10, color: "#166534" }}>Predicted UP & Actual UP</span>
              </div>
              {/* False Positive */}
              <div
                style={{
                  backgroundColor: "#FEE2E2",
                  border: "1.5px solid #FCA5A5",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px 8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10, color: "#B91C1C", fontWeight: 700 }}>FALSE POSITIVE (FP)</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#B91C1C" }}>
                  {confusionMatrix?.fp ?? 0}
                </span>
                <span style={{ fontSize: 10, color: "#991B1B" }}>Predicted UP & Actual DOWN</span>
              </div>

              {/* Row 2: PREDICTED DOWN */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 8,
                  fontWeight: 700,
                  color: "#DC2626",
                }}
              >
                PRED DOWN
              </div>
              {/* False Negative */}
              <div
                style={{
                  backgroundColor: "#FEF3C7",
                  border: "1.5px solid #FCD34D",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px 8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10, color: "#B45309", fontWeight: 700 }}>FALSE NEGATIVE (FN)</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#B45309" }}>
                  {confusionMatrix?.fn ?? 0}
                </span>
                <span style={{ fontSize: 10, color: "#92400E" }}>Predicted DOWN & Actual UP</span>
              </div>
              {/* True Negative */}
              <div
                style={{
                  backgroundColor: "#DBEAFE",
                  border: "1.5px solid #93C5FD",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px 8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10, color: "#1D4ED8", fontWeight: 700 }}>TRUE NEGATIVE (TN)</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#1D4ED8" }}>
                  {confusionMatrix?.tn ?? 0}
                </span>
                <span style={{ fontSize: 10, color: "#1E40AF" }}>Predicted DOWN & Actual DOWN</span>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              * PENDING predictions awaiting the next market day bar are excluded from the confusion matrix.
            </div>
          </div>
        </div>

        {/* Classification Metrics (Positive Class: UP) */}
        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">CLASSIFICATION METRICS (POSITIVE CLASS: UP)</span>
              <span className="card-subtitle">
                Statistical precision, recall, and F1 on directional price appreciation
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <div className="kpi-card kpi-accent-purple">
              <span className="kpi-label">PRECISION (UP)</span>
              <div className="kpi-value" style={{ color: "#7C3AED", fontSize: 22 }}>
                {performance?.metrics?.precision !== null && performance?.metrics?.precision !== undefined
                  ? `${(performance.metrics.precision * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
              <span className="kpi-subtext">TP / (TP + FP) — True UP when predicted UP</span>
            </div>

            <div className="kpi-card kpi-accent-green">
              <span className="kpi-label">RECALL / SENSITIVITY (UP)</span>
              <div className="kpi-value" style={{ color: "#16A34A", fontSize: 22 }}>
                {performance?.metrics?.recall !== null && performance?.metrics?.recall !== undefined
                  ? `${(performance.metrics.recall * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
              <span className="kpi-subtext">TP / (TP + FN) — Realized UP captures</span>
            </div>

            <div className="kpi-card kpi-accent-orange">
              <span className="kpi-label">F1-SCORE</span>
              <div className="kpi-value" style={{ color: "#EA580C", fontSize: 22 }}>
                {performance?.metrics?.f1 !== null && performance?.metrics?.f1 !== undefined
                  ? performance.metrics.f1.toFixed(3)
                  : "N/A"}
              </div>
              <span className="kpi-subtext">Harmonic mean of precision & recall</span>
            </div>

            <div className="kpi-card kpi-accent-blue">
              <span className="kpi-label">SPECIFICITY (DOWN)</span>
              <div className="kpi-value" style={{ color: "#2563EB", fontSize: 22 }}>
                {performance?.metrics?.specificity !== null && performance?.metrics?.specificity !== undefined
                  ? `${(performance.metrics.specificity * 100).toFixed(1)}%`
                  : "N/A"}
              </div>
              <span className="kpi-subtext">TN / (TN + FP) — True DOWN when market fell</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              backgroundColor: "#F8FAFC",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              fontSize: 11,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            <strong>Note on Positive Class:</strong> In quantitative binary classification, the positive class is explicitly defined as <strong>UP</strong> (next-day close &gt; current close). Downward and flat returns constitute the negative class.
          </div>
        </div>
      </div>

      {/* 5. Prediction History Data Table */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">PREDICTION HISTORY RECORDS</span>
            <span className="card-subtitle">
              {symbol} • {totalCount} total records ({displayedHistory.length} matching active filters)
            </span>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="timeframe-controls">
              <button
                type="button"
                className="timeframe-btn"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ padding: "4px 8px" }}
              >
                <ChevronLeft size={14} />
              </button>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                  padding: "0 6px",
                }}
              >
                {page}/{totalPages}
              </span>
              <button
                type="button"
                className="timeframe-btn"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: "4px 8px" }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "24px 0" }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-box" style={{ height: 38, width: "100%" }} />
            ))}
          </div>
        ) : displayedHistory.length === 0 ? (
          <div className="state-box">
            <History size={32} style={{ color: "var(--text-muted)" }} />
            <div className="state-title">No Predictions Found</div>
            <div className="state-desc">
              {searchQuery || directionFilter !== "ALL" || outcomeFilter !== "ALL"
                ? "No prediction records match the selected filter criteria."
                : `No historical prediction records exist yet for ${symbol}. Inferences are recorded automatically upon on-demand analysis or scheduled jobs.`}
            </div>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort("generated_at")} style={{ cursor: "pointer" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      TIMESTAMP (IST) <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>SYMBOL</th>
                  <th>PREDICTED</th>
                  <th onClick={() => toggleSort("probability")} style={{ cursor: "pointer" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      PROBABILITY <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>ACTUAL DIRECTION</th>
                  <th onClick={() => toggleSort("actual_return")} style={{ cursor: "pointer" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      ACTUAL RETURN <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>OUTCOME</th>
                  <th>MODEL & VERSION</th>
                  <th onClick={() => toggleSort("latency_ms")} style={{ cursor: "pointer" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      LATENCY <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ textAlign: "center" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {displayedHistory.map((item, idx) => {
                  const isUp = item.prediction === "UP";
                  const displayProb =
                    item.probability !== undefined
                      ? `${(item.probability * 100).toFixed(2)}%`
                      : "N/A";

                  const outcome = item.outcome || "PENDING";
                  let outcomeBg = "#FEF3C7";
                  let outcomeColor = "#B45309";
                  let outcomeBorder = "#FCD34D";
                  let OutcomeIcon = Clock;

                  if (outcome === "CORRECT") {
                    outcomeBg = "#DCFCE7";
                    outcomeColor = "#15803D";
                    outcomeBorder = "#86EFAC";
                    OutcomeIcon = CheckCircle;
                  } else if (outcome === "INCORRECT") {
                    outcomeBg = "#FEE2E2";
                    outcomeColor = "#B91C1C";
                    outcomeBorder = "#FCA5A5";
                    OutcomeIcon = XCircle;
                  }

                  return (
                    <tr key={item.id ?? idx}>
                      <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                        {new Date(item.generated_at).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour12: false,
                        })}{" "}
                        IST
                      </td>
                      <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "#2563EB" }}>
                        {item.symbol}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            backgroundColor: isUp ? "#DCFCE7" : "#FEE2E2",
                            color: isUp ? "#15803D" : "#B91C1C",
                            border: `1px solid ${isUp ? "#86EFAC" : "#FCA5A5"}`,
                          }}
                        >
                          {isUp ? "▲ UP" : "▼ DOWN"}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#7C3AED" }}>
                        {displayProb}
                      </td>
                      <td>
                        {item.actual_direction ? (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                              color: item.actual_direction === "UP" ? "#16A34A" : "#DC2626",
                            }}
                          >
                            {item.actual_direction === "UP" ? "▲ UP" : "▼ DOWN"}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 11, fontStyle: "italic" }}>
                            Pending t+1
                          </span>
                        )}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {item.actual_return !== null && item.actual_return !== undefined ? (
                          <span style={{ color: item.actual_return >= 0 ? "#16A34A" : "#DC2626" }}>
                            {item.actual_return >= 0 ? "+" : ""}
                            {(item.actual_return * 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td>
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
                            backgroundColor: outcomeBg,
                            color: outcomeColor,
                            border: `1px solid ${outcomeBorder}`,
                          }}
                        >
                          <OutcomeIcon size={11} /> {outcome}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
                        {item.model_type} ({item.model_version})
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        {item.latency_ms !== null && item.latency_ms !== undefined
                          ? `${item.latency_ms.toFixed(1)} ms`
                          : "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="timeframe-btn"
                          onClick={() => handleOpenDetail(item)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            fontSize: 10,
                            color: "#2563EB",
                            borderColor: "#BFDBFE",
                            backgroundColor: "#EFF6FF",
                          }}
                        >
                          <Eye size={12} /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Prediction Detail Modal / Drawer */}
      {selectedPrediction && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(3px)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
          onClick={handleCloseDetail}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              maxWidth: 760,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                    Prediction #{selectedPrediction.id}
                  </h2>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: "#EFF6FF",
                      color: "#2563EB",
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {selectedPrediction.symbol}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      backgroundColor:
                        selectedPrediction.outcome === "CORRECT"
                          ? "#DCFCE7"
                          : selectedPrediction.outcome === "INCORRECT"
                          ? "#FEE2E2"
                          : "#FEF3C7",
                      color:
                        selectedPrediction.outcome === "CORRECT"
                          ? "#15803D"
                          : selectedPrediction.outcome === "INCORRECT"
                          ? "#B91C1C"
                          : "#B45309",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    {selectedPrediction.outcome || "PENDING"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Inference generated on{" "}
                  {new Date(selectedPrediction.generated_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour12: false,
                  })}{" "}
                  IST
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseDetail}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748B",
                  padding: 4,
                  borderRadius: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Key Metrics Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
                backgroundColor: "#F8FAFC",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: 14,
              }}
            >
              <div>
                <span className="meta-label">PREDICTED DIRECTION</span>
                <div
                  style={{
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: selectedPrediction.prediction === "UP" ? "#16A34A" : "#DC2626",
                    marginTop: 2,
                  }}
                >
                  {selectedPrediction.prediction === "UP" ? "▲ UP" : "▼ DOWN"}
                </div>
              </div>

              <div>
                <span className="meta-label">CONFIDENCE PROBABILITY</span>
                <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "#7C3AED", marginTop: 2 }}>
                  {(selectedPrediction.probability * 100).toFixed(2)}%
                </div>
              </div>

              <div>
                <span className="meta-label">ACTUAL REALIZED RETURN</span>
                <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {selectedPrediction.actual_return !== null && selectedPrediction.actual_return !== undefined ? (
                    <span style={{ color: selectedPrediction.actual_return >= 0 ? "#16A34A" : "#DC2626" }}>
                      {selectedPrediction.actual_return >= 0 ? "+" : ""}
                      {(selectedPrediction.actual_return * 100).toFixed(2)}%
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: 11 }}>
                      Pending next session
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="meta-label">INFERENCE LATENCY</span>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, marginTop: 2 }}>
                  {selectedPrediction.latency_ms !== null && selectedPrediction.latency_ms !== undefined
                    ? `${selectedPrediction.latency_ms.toFixed(1)} ms`
                    : "—"}
                </div>
              </div>

              <div>
                <span className="meta-label">MODEL ARTIFACT</span>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, marginTop: 2 }}>
                  {selectedPrediction.model_type} ({selectedPrediction.model_version})
                </div>
              </div>
            </div>

            {/* Feature Snapshot Table */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  INFERENCE FEATURE SNAPSHOT (12 FEATURES)
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  Exact values fed into XGBoost
                </span>
              </div>

              {isLoadingDetail ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading feature snapshot...
                </div>
              ) : selectedPrediction.feature_snapshot && Object.keys(selectedPrediction.feature_snapshot).length > 0 ? (
                <div className="data-table-container" style={{ maxHeight: 300, overflowY: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>FEATURE NAME</th>
                        <th>CATEGORY</th>
                        <th style={{ textAlign: "right" }}>VALUE</th>
                        <th>DESCRIPTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedPrediction.feature_snapshot).map(([key, val]) => {
                        const meta = FEATURE_METADATA[key] || {
                          label: key,
                          category: "Engineered",
                          description: "Model feature vector input",
                        };
                        const numVal = Number(val);
                        const isFormattedPercent = key.includes("return") || key.includes("volatility");

                        return (
                          <tr key={key}>
                            <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "#2563EB" }}>
                              {key}
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
                                {meta.category}
                              </span>
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontFamily: "var(--font-mono)",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                              }}
                            >
                              {isNaN(numVal)
                                ? String(val)
                                : isFormattedPercent
                                ? `${(numVal * 100).toFixed(4)}%`
                                : numVal.toFixed(4)}
                            </td>
                            <td style={{ fontSize: 11, color: "var(--text-secondary)" }}>{meta.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    padding: "24px 16px",
                    backgroundColor: "#F8FAFC",
                    borderRadius: "var(--radius-sm)",
                    textAlign: "center",
                    border: "1px dashed var(--border-subtle)",
                  }}
                >
                  <AlertCircle size={24} style={{ color: "var(--text-muted)", margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                    Feature Snapshot Not Available
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 460, margin: "4px auto 0" }}>
                    This prediction record was created prior to feature snapshot instrumentation.
                    Subsequent on-demand inferences capture the full 12-feature vector automatically.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="timeframe-btn active"
                onClick={handleCloseDetail}
                style={{ padding: "8px 20px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
