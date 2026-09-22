import React from "react";
import {
  ArrowDown,
  Database,
  Server,
  Layers,
  Cpu,
  Globe,
  Radio,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { SystemStatusState } from "../types";

interface DataPipelineProps {
  systemStatus: SystemStatusState;
}

export const DataPipeline: React.FC<DataPipelineProps> = ({ systemStatus }) => {
  const PIPELINE_STAGES = [
    {
      id: "provider",
      name: "Market Data Provider",
      detail: "External provider integration (Yahoo Finance / Historical dataset)",
      icon: Globe,
      status: systemStatus.data === "available" ? "Active" : "Idle",
      statusType: systemStatus.data === "available" ? "online" : "checking",
    },
    {
      id: "service",
      name: "MarketDataService",
      detail: "Data ingestion, validation, and schema normalization service",
      icon: Layers,
      status: "Operational",
      statusType: "online",
    },
    {
      id: "celery_task",
      name: "Celery Async Ingestion Task",
      detail: "Background workers executing periodic market data ingestion",
      icon: Clock,
      status: systemStatus.api === "online" ? "Active" : "Offline",
      statusType: systemStatus.api === "online" ? "online" : "offline",
    },
    {
      id: "broker",
      name: "Redis Broker & Channel Layer",
      detail: "Task queue message broker and WebSocket broadcast channel layer",
      icon: Server,
      status: systemStatus.ws === "online" || systemStatus.api === "online" ? "Online" : "Offline",
      statusType: systemStatus.ws === "online" || systemStatus.api === "online" ? "online" : "offline",
    },
    {
      id: "storage",
      name: "PostgreSQL Database",
      detail: "Relational persistence for MarketPrice and Prediction audit models",
      icon: Database,
      status: systemStatus.data === "available" ? "Healthy (1,246+ rows)" : "Unavailable",
      statusType: systemStatus.data === "available" ? "online" : "offline",
    },
    {
      id: "features",
      name: "FeatureEngineeringService",
      detail: "Computes 12 technical indicators (SMA, EMA, MACD, RSI, Volatility)",
      icon: Cpu,
      status: "Active (12 Features)",
      statusType: "online",
    },
    {
      id: "inference",
      name: "PredictionService (ML Inference)",
      detail: "Loads XGBoost model artifact (v1) and generates directional probability",
      icon: Cpu,
      status: systemStatus.model === "available" ? "Ready" : "Unavailable",
      statusType: systemStatus.model === "available" ? "online" : "offline",
    },
    {
      id: "api",
      name: "Django REST & Channels API",
      detail: "REST endpoints (Daphne ASGI) and WebSocket consumers",
      icon: Server,
      status: systemStatus.api === "online" ? "Online (HTTP 200)" : "Offline",
      statusType: systemStatus.api === "online" ? "online" : "offline",
    },
    {
      id: "client",
      name: "React Stock Intelligence Dashboard",
      detail: "Real-time analytics UI, interactive charts, and system monitor",
      icon: Radio,
      status: "Connected",
      statusType: "online",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">End-to-End Pipeline Architecture</span>
            <span className="card-subtitle">Asynchronous Market Data Ingestion & Live ML Inference Flow</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0" }}>
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isLast = idx === PIPELINE_STAGES.length - 1;

            return (
              <React.Fragment key={stage.id}>
                <div
                  style={{
                    width: "100%",
                    maxWidth: "700px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-primary)",
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                        {stage.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {stage.detail}
                      </div>
                    </div>
                  </div>

                  <div className={`status-pill ${stage.statusType}`}>
                    <CheckCircle2 size={12} />
                    {stage.status}
                  </div>
                </div>

                {!isLast && (
                  <div style={{ color: "var(--accent-primary)", margin: "-4px 0" }}>
                    <ArrowDown size={20} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

