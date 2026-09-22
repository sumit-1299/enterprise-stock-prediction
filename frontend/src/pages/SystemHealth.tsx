import React from "react";
import {
  Server,
  Database,
  Activity,
  Radio,
  Cpu,
  RefreshCw,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  HardDrive,
  Zap,
} from "lucide-react";
import { SystemStatusState } from "../types";
import { StatusBadge } from "../components/common/StatusBadge";

interface SystemHealthProps {
  systemStatus: SystemStatusState;
  onRefreshHealth: () => void;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ systemStatus, onRefreshHealth }) => {
  const SUBSYSTEMS = [
    {
      name: "Django API Backend",
      component: "Daphne ASGI Web Server",
      status: systemStatus.api === "online" ? "ONLINE" : "OFFLINE",
      statusType: systemStatus.api === "online" ? "operational" : "error",
      icon: Server,
      iconClass: "icon-badge-blue",
      details: "REST endpoints, health probes, and prediction handlers",
      port: ":8000 (Internal) / :8080 (Proxied)",
    },
    {
      name: "PostgreSQL Database",
      component: "Relational Storage (postgres:16-alpine)",
      status:
        systemStatus.database ? systemStatus.database.toUpperCase() : systemStatus.data === "available" ? "ONLINE" : "DEGRADED",
      statusType: systemStatus.data === "available" ? "operational" : "warning",
      icon: Database,
      iconClass: "icon-badge-indigo",
      details: "MarketPrice tables, prediction audit models, stock metadata",
      port: ":5432 (Internal)",
    },
    {
      name: "Redis Broker & Channel Layer",
      component: "In-Memory Store (redis:7-alpine)",
      status:
        systemStatus.redis ? systemStatus.redis.toUpperCase() : systemStatus.ws === "online" || systemStatus.api === "online" ? "ONLINE" : "OFFLINE",
      statusType: systemStatus.api === "online" ? "operational" : "error",
      icon: Activity,
      iconClass: "icon-badge-purple",
      details: "Celery task queue broker and Django Channels pub/sub layer",
      port: ":6379 (Internal)",
    },
    {
      name: "Celery Worker",
      component: "Background Processing Daemon",
      status: systemStatus.celery ? systemStatus.celery.toUpperCase() : systemStatus.api === "online" ? "ONLINE" : "OFFLINE",
      statusType: systemStatus.api === "online" ? "operational" : "error",
      icon: Cpu,
      iconClass: "icon-badge-green",
      details: "Executes asynchronous market data polling and scheduled inference",
      port: "Worker Process (Daemon)",
    },
    {
      name: "Celery Beat",
      component: "Periodic Task Scheduler",
      status: systemStatus.api === "online" ? "ONLINE" : "OFFLINE",
      statusType: systemStatus.api === "online" ? "operational" : "error",
      icon: Layers,
      iconClass: "icon-badge-orange",
      details: "Schedules automated market data ingestion cycles",
      port: "Beat Scheduler (Daemon)",
    },
    {
      name: "Model Registry & Inference",
      component: "XGBoost Artifact Storage",
      status: systemStatus.model === "available" ? "ONLINE" : "DEGRADED",
      statusType: systemStatus.model === "available" ? "operational" : "warning",
      icon: Cpu,
      iconClass: "icon-badge-purple",
      details: "Production model artifact (v1) and version metadata",
      port: "Local Artifact Store",
    },
    {
      name: "Market Data Ingestion Provider",
      component: "YFinance & MarketDataService",
      status: systemStatus.data === "available" ? "ONLINE" : "OFFLINE",
      statusType: systemStatus.data === "available" ? "operational" : "error",
      icon: HardDrive,
      iconClass: "icon-badge-teal",
      details: "Historical & near-real-time data ingestion pipeline",
      port: "External API Integration",
    },
    {
      name: "WebSocket Channel Stream",
      component: "Django Channels Daphne Consumer",
      status: systemStatus.ws === "online" ? "ONLINE" : systemStatus.ws === "checking" ? "CONNECTING" : "OFFLINE",
      statusType: systemStatus.ws === "online" ? "operational" : systemStatus.ws === "checking" ? "warning" : "error",
      icon: Radio,
      iconClass: "icon-badge-cyan",
      details: "Real-time client socket updates on ws://host/ws/market/<symbol>/",
      port: "/ws/market/<symbol>/",
    },
  ];

  const onlineCount = SUBSYSTEMS.filter((s) => s.statusType === "operational").length;
  const totalCount = SUBSYSTEMS.length;
  const allOperational = onlineCount === totalCount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Header & Quick Status Strip */}
      <div className="card-standard" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563EB",
                boxShadow: "0 2px 4px rgba(37,99,235,0.1)",
              }}
            >
              <Activity size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  System Health & Subsystem Probes
                </h2>
                <StatusBadge
                  variant={allOperational ? "operational" : "warning"}
                  label={allOperational ? "ALL SYSTEMS OPERATIONAL" : `${onlineCount}/${totalCount} ONLINE`}
                />
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                Continuous real-time architectural health telemetry, daemon probes, and service connectivity
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
            onClick={onRefreshHealth}
          >
            <RefreshCw size={13} /> Refresh Probes
          </button>
        </div>

        {/* Quick KPI Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginTop: 20,
            paddingTop: 20,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="icon-badge icon-badge-green">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                Active Services
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#16A34A" }}>
                {onlineCount} / {totalCount} Online
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="icon-badge icon-badge-blue">
              <Zap size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                Gateway Architecture
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#2563EB" }}>
                Nginx Reverse Proxy
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="icon-badge icon-badge-purple">
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                Telemetry Interval
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#7C3AED" }}>
                30s Auto-Poll
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="icon-badge icon-badge-indigo">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                Failover Mode
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#4F46E5" }}>
                Graceful Degradation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Subsystem Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {SUBSYSTEMS.map((sub) => {
          const Icon = sub.icon;
          const isOperational = sub.statusType === "operational";
          const isWarning = sub.statusType === "warning";

          return (
            <div
              key={sub.name}
              className="card-standard"
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 14,
                borderLeft: `4px solid ${isOperational ? "#16A34A" : isWarning ? "#EA580C" : "#DC2626"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className={`icon-badge ${sub.iconClass}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                      {sub.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {sub.component}
                    </div>
                  </div>
                </div>

                <StatusBadge
                  variant={sub.statusType as any}
                  label={sub.status}
                />
              </div>

              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {sub.details}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 10,
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                }}
              >
                <span>Endpoint / Port:</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{sub.port}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
