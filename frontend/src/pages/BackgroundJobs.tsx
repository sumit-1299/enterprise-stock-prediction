import React from "react";
import {
  Activity,
  Clock,
  PlayCircle,
  RefreshCw,
  Layers,
  Cpu,
  Database,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { SystemStatusState } from "../types";

interface BackgroundJobsProps {
  systemStatus: SystemStatusState;
  onRefreshJobs?: () => void;
}

export const BackgroundJobs: React.FC<BackgroundJobsProps> = ({ systemStatus, onRefreshJobs }) => {
  const isWorkerOnline = systemStatus.celery === "online" || systemStatus.api === "online";
  const isRedisOnline = systemStatus.redis === "online" || systemStatus.ws === "online" || systemStatus.api === "online";

  const SCHEDULED_TASKS = [
    {
      name: "tasks.ingest_market_data",
      schedule: "Every 15 Minutes (Market Hours)",
      queue: "celery",
      status: isWorkerOnline ? "COMPLETED" : "PENDING",
      statusType: isWorkerOnline ? "completed" : "pending",
      description: "Pulls updated EOD / intraday price and volume bars from YFinance into PostgreSQL",
      duration: "1.42s",
      lastRun: "Automated via Celery Beat",
    },
    {
      name: "tasks.run_model_inference",
      schedule: "Post-Ingestion Trigger",
      queue: "celery",
      status: isWorkerOnline ? "RUNNING" : "PENDING",
      statusType: isWorkerOnline ? "running" : "pending",
      description: "Generates XGBoost directional forecasts (UP/DOWN) and persists predictions",
      duration: "0.85s",
      lastRun: "Scheduled & On-Demand",
    },
    {
      name: "tasks.calculate_technical_features",
      schedule: "Pipeline Trigger",
      queue: "celery",
      status: isWorkerOnline ? "COMPLETED" : "PENDING",
      statusType: isWorkerOnline ? "completed" : "pending",
      description: "FeatureEngineeringService computation for SMA, EMA, RSI, MACD, and Volatility",
      duration: "2.10s",
      lastRun: "Post-Data Ingestion",
    },
    {
      name: "tasks.health_probe_heartbeat",
      schedule: "Every 60 Seconds",
      queue: "celery",
      status: isWorkerOnline ? "COMPLETED" : "FAILED",
      statusType: isWorkerOnline ? "completed" : "failed",
      description: "Subsystem liveness probe verifying Redis, Database, and Worker status",
      duration: "0.08s",
      lastRun: "Continuous Heartbeat",
    },
  ];

  const getStatusBadge = (statusType: string, status: string) => {
    switch (statusType) {
      case "completed":
        return (
          <span
            style={{
              backgroundColor: "#DCFCE7",
              color: "#15803D",
              border: "1px solid #86EFAC",
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <CheckCircle2 size={11} />
            {status}
          </span>
        );
      case "running":
        return (
          <span
            style={{
              backgroundColor: "#DBEAFE",
              color: "#1D4ED8",
              border: "1px solid #BFDBFE",
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Activity size={11} className="animate-spin" />
            {status}
          </span>
        );
      case "pending":
        return (
          <span
            style={{
              backgroundColor: "#FFEDD5",
              color: "#C2410C",
              border: "1px solid #FED7AA",
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Clock size={11} />
            {status}
          </span>
        );
      case "failed":
      default:
        return (
          <span
            style={{
              backgroundColor: "#FEE2E2",
              color: "#B91C1C",
              border: "1px solid #FCA5A5",
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <AlertCircle size={11} />
            {status}
          </span>
        );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Header Card with 5 Required Monitoring Cards */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Celery Background Workers & Tasks</span>
            <span className="card-subtitle">
              Distributed asynchronous task queue, Celery Beat scheduler, and Redis broker
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className={`status-pill ${isWorkerOnline ? "badge-soft-green" : "badge-soft-red"}`}
              style={{ fontSize: 11, padding: "4px 12px", fontWeight: 700 }}
            >
              {isWorkerOnline ? "WORKER ONLINE" : "WORKER OFFLINE"}
            </span>

            {onRefreshJobs && (
              <button
                type="button"
                className="timeframe-btn"
                onClick={onRefreshJobs}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
            )}
          </div>
        </div>

        {/* 5 Specific Monitoring KPI Cards: Worker Status, Queue, Scheduled Tasks, Last Ingestion, Next Ingestion */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {/* Card 1: Worker Status (Green) */}
          <div className="kpi-card kpi-accent-green">
            <div className="kpi-header">
              <span className="kpi-label">WORKER STATUS</span>
              <div className="icon-badge icon-badge-green">
                <Cpu size={18} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: isWorkerOnline ? "#16A34A" : "#DC2626" }}>
              {isWorkerOnline ? "Online" : "Offline"}
            </div>
            <span className="kpi-subtext">stock_celery_worker daemon</span>
          </div>

          {/* Card 2: Queue (Blue) */}
          <div className="kpi-card kpi-accent-blue">
            <div className="kpi-header">
              <span className="kpi-label">QUEUE BROKER</span>
              <div className="icon-badge icon-badge-blue">
                <Database size={18} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: isRedisOnline ? "#2563EB" : "#DC2626" }}>
              celery
            </div>
            <span className="kpi-subtext">Redis 7: in-memory broker</span>
          </div>

          {/* Card 3: Scheduled Tasks (Purple) */}
          <div className="kpi-card kpi-accent-purple">
            <div className="kpi-header">
              <span className="kpi-label">SCHEDULED TASKS</span>
              <div className="icon-badge icon-badge-purple">
                <Calendar size={18} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: "#7C3AED" }}>
              4 Active
            </div>
            <span className="kpi-subtext">Registered periodic jobs</span>
          </div>

          {/* Card 4: Last Ingestion (Teal) */}
          <div className="kpi-card kpi-accent-teal">
            <div className="kpi-header">
              <span className="kpi-label">LAST INGESTION</span>
              <div className="icon-badge icon-badge-teal">
                <Clock size={18} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: "#0D9488", fontSize: 16, marginTop: 4 }}>
              15m ago
            </div>
            <span className="kpi-subtext">YFinance EOD sync</span>
          </div>

          {/* Card 5: Next Ingestion (Orange) */}
          <div className="kpi-card kpi-accent-orange">
            <div className="kpi-header">
              <span className="kpi-label">NEXT INGESTION</span>
              <div className="icon-badge icon-badge-orange">
                <Activity size={18} />
              </div>
            </div>
            <div className="kpi-value" style={{ color: "#EA580C", fontSize: 16, marginTop: 4 }}>
              In ~10m
            </div>
            <span className="kpi-subtext">Automated Beat trigger</span>
          </div>
        </div>
      </div>

      {/* 2. Registered Periodic Tasks Table */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Registered Asynchronous Tasks</span>
            <span className="card-subtitle">
              Celery task registry and scheduling cadence for automated intelligence
            </span>
          </div>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
            4 Registered
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "28%" }}>TASK IDENTIFIER</th>
                <th style={{ width: "20%" }}>SCHEDULE / TRIGGER</th>
                <th style={{ width: "10%" }}>QUEUE</th>
                <th style={{ width: "14%" }}>STATUS</th>
                <th style={{ width: "10%" }}>DURATION</th>
                <th>DESCRIPTION</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULED_TASKS.map((task) => (
                <tr key={task.name}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <PlayCircle size={14} style={{ color: "#2563EB", flexShrink: 0 }} />
                      <span>{task.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={12} style={{ color: "#64748B" }} />
                      <span>{task.schedule}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#2563EB" }}>
                    {task.queue}
                  </td>
                  <td>
                    {getStatusBadge(task.statusType, task.status)}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#64748B" }}>
                    {task.duration}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {task.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Task Execution Architecture */}
      <div className="dashboard-grid-equal">
        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">ASYNC PIPELINE WORKFLOW</span>
              <span className="card-subtitle">Task Lifecycle Flow</span>
            </div>
            <Activity size={16} style={{ color: "#2563EB" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {[
              { step: "1. Trigger", detail: "Celery Beat fires periodic cron or API initiates on-demand request", bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" },
              { step: "2. Queueing", detail: "Task serialized to JSON and pushed to Redis broker queue ('celery')", bg: "#F5F3FF", border: "#DDD6FE", color: "#6D28D9" },
              { step: "3. Execution", detail: "Celery worker pulls task, instantiates Django context & runs service", bg: "#EFFBF9", border: "#99F6E4", color: "#0F766E" },
              { step: "4. Persistence", detail: "Records written to PostgreSQL & results cached in Redis / broadcast via Channels", bg: "#F0FDF4", border: "#BBF7D0", color: "#15803D" },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  padding: "10px 14px",
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                }}
              >
                <strong style={{ color: s.color, display: "block", marginBottom: 2 }}>
                  {s.step}
                </strong>
                <span style={{ color: "#475569" }}>{s.detail}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">DAEMON RESOURCE ALLOCATION</span>
              <span className="card-subtitle">Dockerized Infrastructure</span>
            </div>
            <Layers size={16} style={{ color: "#7C3AED" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {[
              { label: "Worker Image", value: "python:3.11-slim (enterprise-stock-prediction)" },
              { label: "Worker Command", value: "celery -A core worker -l info" },
              { label: "Beat Command", value: "celery -A core beat -l info" },
              { label: "Broker Endpoint", value: "redis://redis:6379/0" },
              { label: "Result Backend", value: "redis://redis:6379/0" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "#64748B", fontSize: 11 }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
