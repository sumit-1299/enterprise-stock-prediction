import React, { useState } from "react";
import {
  Server,
  Shield,
  Radio,
  Sliders,
  Palette,
  Cpu,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { StatusBadge } from "../components/common/StatusBadge";

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"general" | "inference" | "telemetry" | "theme">("general");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Header Card */}
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
              <Sliders size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  Platform Configuration & Parameters
                </h2>
                <StatusBadge variant="operational" label="ACTIVE CONFIG" />
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                Runtime endpoints, telemetry controls, ML inference thresholds, and enterprise environment settings
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--border-subtle)",
            flexWrap: "wrap",
          }}
        >
          {[
            { id: "general", label: "Runtime Endpoints & Services", icon: Server },
            { id: "inference", label: "ML Inference & Model Pipeline", icon: Cpu },
            { id: "telemetry", label: "Telemetry & Task Scheduling", icon: Layers },
            { id: "theme", label: "Design System & Theme Tokens", icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`pill-filter ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tab Contents */}
      {activeTab === "general" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
          {/* Card: REST API */}
          <div className="card-standard" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, color: "#2563EB" }}>
              <div className="icon-badge icon-badge-blue">
                <Server size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Backend REST API Target
                </h4>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Daphne ASGI Web Server</span>
              </div>
            </div>
            <div
              style={{
                background: "var(--bg-tertiary)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-primary)",
                fontWeight: 600,
              }}
            >
              /api (Host port 8080 &rarr; Container port 8000)
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.5 }}>
              Proxied seamlessly through the Nginx reverse proxy. Serves on-demand stock predictions, historical market data, model metadata, and health probes.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
              <span>Protocol: HTTP/1.1</span>
              <span style={{ color: "#16A34A", fontWeight: 600 }}>CORS Whitelisted</span>
            </div>
          </div>

          {/* Card: WebSocket */}
          <div className="card-standard" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, color: "#0D9488" }}>
              <div className="icon-badge icon-badge-teal">
                <Radio size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  WebSocket Channel Stream
                </h4>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Django Channels Layer</span>
              </div>
            </div>
            <div
              style={{
                background: "var(--bg-tertiary)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-primary)",
                fontWeight: 600,
              }}
            >
              ws://localhost:8080/ws/market/&lt;symbol&gt;/
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.5 }}>
              Full-duplex channel connection powered by Redis Channel Layer. Dispatches live session quotes, background prediction broadcasts, and queue notifications.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
              <span>Heartbeat: 30s Ping</span>
              <span style={{ color: "#16A34A", fontWeight: 600 }}>Auto-Reconnect Active</span>
            </div>
          </div>

          {/* Card: Database */}
          <div className="card-standard" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, color: "#4F46E5" }}>
              <div className="icon-badge icon-badge-indigo">
                <Shield size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Relational Storage & Schema
                </h4>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>PostgreSQL 16 Engine</span>
              </div>
            </div>
            <div
              style={{
                background: "var(--bg-tertiary)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-primary)",
                fontWeight: 600,
              }}
            >
              stock_postgres (Database: stock_prediction)
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.5 }}>
              Stores historical OHLCV market price series, audit prediction trails, model performance records, and user session state with strict foreign keys.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
              <span>Connection Pooling: Persistent</span>
              <span style={{ color: "#16A34A", fontWeight: 600 }}>SSL Mode: Prefer</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "inference" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
          <div className="card-standard" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="icon-badge icon-badge-purple">
                <Cpu size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Model Artifact & Registry Isolation
                </h4>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Local Scikit-Learn / XGBoost Serializer</span>
              </div>
            </div>
            <div
              style={{
                background: "var(--bg-tertiary)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-primary)",
              }}
            >
              ml/models/artifacts/xgboost_classifier_TCS_NS_v1.joblib
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Model Architecture:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>XGBoost Gradient Boosted Classifier</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Feature Dimension:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>12 Engineered Technical Features</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Decision Threshold:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>0.50 (Binary Classification)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Prediction Horizon:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>t + 1 (Next Trading Day Direction)</span>
              </div>
            </div>
          </div>

          <div className="card-standard" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="icon-badge icon-badge-green">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Data Science Guardrails & Policies
                </h4>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Institutional Standards</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: "var(--text-secondary)" }}>
              <div style={{ padding: 10, background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)" }}>
                <strong style={{ color: "var(--text-primary)" }}>Zero-Fabrication Mandate:</strong> Missing values or unsupported symbols return explicit nulls, never fabricated synthetic predictions.
              </div>
              <div style={{ padding: 10, background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)" }}>
                <strong style={{ color: "var(--text-primary)" }}>Lookahead Bias Elimination:</strong> Features are computed on historical data strictly strictly before the prediction target date.
              </div>
              <div style={{ padding: 10, background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)" }}>
                <strong style={{ color: "var(--text-primary)" }}>Model Drift Alerts:</strong> Population Stability Index (PSI) evaluates feature drift with warnings at PSI &gt; 0.1 and critical alerts at PSI &gt; 0.25.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "telemetry" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
          <div className="card-standard" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="icon-badge icon-badge-orange">
                <Layers size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Celery Worker & Beat Schedules
                </h4>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Asynchronous Task Orchestration</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Market Data Ingestion:</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>Every 15 Minutes (Market Hours)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>EOD Outcome Resolution:</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>16:30 IST Daily</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Model Drift Audit:</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>Daily Post-Session</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ color: "var(--text-secondary)" }}>Concurrency Concurrency:</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>Prefork Worker (Concurrency 4)</span>
              </div>
            </div>
          </div>

          <div className="card-standard" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="icon-badge icon-badge-indigo">
                <Server size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  Redis In-Memory Broker
                </h4>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Message Queue & Cache</span>
              </div>
            </div>
            <div
              style={{
                background: "var(--bg-tertiary)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-primary)",
              }}
            >
              redis://stock_redis:6379/0
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.5 }}>
              Handles task message queuing with Celery ack-late configuration to ensure zero message loss during worker restarts.
            </p>
          </div>
        </div>
      )}

      {activeTab === "theme" && (
        <div className="card-standard" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="icon-badge icon-badge-blue">
              <Palette size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Active Design System Tokens (Enterprise FinTech Light)
              </h4>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Standardized typography, border radius, layered background colors, and accessible contrast ratios
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 16 }}>
            {[
              { label: "Main Background", token: "--bg-main", hex: "#F4F7FB" },
              { label: "Secondary Workspace", token: "--bg-secondary", hex: "#EEF3F8" },
              { label: "Card Surface", token: "--bg-card", hex: "#FFFFFF" },
              { label: "Primary Border", token: "--border-subtle", hex: "#DCE4EE" },
              { label: "Primary Text", token: "--text-primary", hex: "#172033" },
              { label: "Secondary Text", token: "--text-secondary", hex: "#64748B" },
              { label: "Primary Blue", token: "--accent-primary", hex: "#2563EB" },
              { label: "Secondary Indigo", token: "--accent-secondary", hex: "#4F46E5" },
              { label: "Bullish Green", token: "--color-up", hex: "#16A34A" },
              { label: "Bearish Red", token: "--color-down", hex: "#DC2626" },
              { label: "Warning Orange", token: "--color-warn", hex: "#EA580C" },
              { label: "Teal Analytics", token: "--accent-teal", hex: "#0D9488" },
            ].map((c) => (
              <div
                key={c.token}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 10,
                  background: "var(--bg-tertiary)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: c.hex,
                    border: "1px solid rgba(0,0,0,0.1)",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{c.label}</div>
                  <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    {c.hex} ({c.token})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
