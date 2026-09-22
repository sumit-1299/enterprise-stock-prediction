import React from "react";

export const About: React.FC = () => {
  const TECH_STACK = [
    { name: "Python", category: "Language", version: "3.12" },
    { name: "Django", category: "Web Framework", version: "5.x" },
    { name: "Django Channels / Daphne", category: "ASGI & WebSockets", version: "4.x" },
    { name: "React", category: "Frontend UI", version: "18.3" },
    { name: "TypeScript", category: "Frontend Language", version: "5.6" },
    { name: "Vite", category: "Build Tool", version: "5.4" },
    { name: "PostgreSQL", category: "Database", version: "16" },
    { name: "Redis", category: "Broker & Channels", version: "7" },
    { name: "Celery & Beat", category: "Task Queue", version: "5.x" },
    { name: "XGBoost", category: "Machine Learning", version: "2.x" },
    { name: "Pandas", category: "Feature Engineering", version: "2.x" },
    { name: "NumPy", category: "Numerical Computing", version: "2.x" },
    { name: "Docker & Compose", category: "Containerization", version: "Multi-stage" },
    { name: "Nginx", category: "Reverse Proxy", version: "1.25" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Project Overview */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Enterprise Stock Intelligence</span>
            <span className="card-subtitle">Automated Quantitative Inference Engine</span>
          </div>
        </div>

        <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 13 }}>
          Enterprise Stock Intelligence is a production-oriented quantitative analytics and machine learning inference platform designed for stock market direction forecasting. The platform unifies historical market data ingestion, rolling technical feature engineering, supervised classification modeling (XGBoost), model governance and versioning, asynchronous background task execution, and real-time WebSocket event streaming within a containerized microservices architecture.
        </p>
      </div>

      {/* 2. Technology Stack Badges */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Technology Stack</span>
            <span className="card-subtitle">Technologies verified and deployed across the application</span>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {TECH_STACK.map((tech) => (
            <div
              key={tech.name}
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-card)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>
                {tech.name}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--accent-secondary)",
                  background: "var(--bg-card)",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {tech.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Machine Learning & Data Pipeline Architecture */}
      <div className="dashboard-grid-equal">
        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">Machine Learning Pipeline</span>
              <span className="card-subtitle">Feature Engineering & Inference Lifecycle</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>1. Feature Engineering:</strong> Computes 12 deterministic technical features (SMA 10/20/50, EMA 12/26, MACD, MACD Signal, RSI 14, Volatility 20, 1D/5D Returns, Volume Change) without lookahead bias.
            </div>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>2. Inference Service:</strong> A dedicated, decoupled PredictionService loads serialized XGBoost model artifacts and generates binary directional predictions (UP / DOWN) with calibrated class probabilities.
            </div>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>3. Model Governance:</strong> Model registry tracks active production models, candidate versions, feature schemas, out-of-sample benchmark metrics, and promotion metadata.
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">Asynchronous Data Pipeline</span>
              <span className="card-subtitle">Ingestion & Live Delivery Architecture</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>1. Celery Workers & Beat:</strong> Scheduled ingestion tasks fetch historical and market-session quotes and persist them idempotently into PostgreSQL.
            </div>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>2. Redis & Channels:</strong> Ingestion events trigger automated feature recomputation and model inference, broadcasting real-time updates over Redis channel layers.
            </div>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>3. Nginx Reverse Proxy:</strong> Unified gateway routing HTTP traffic to Vite/React and Daphne ASGI while managing WebSocket upgrade headers.
            </div>
          </div>
        </div>
      </div>

      {/* 4. Key Features & Current Limitations */}
      <div className="dashboard-grid-equal">
        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">Key Platform Capabilities</span>
              <span className="card-subtitle">Core functional highlights</span>
            </div>
          </div>

          <ul style={{ paddingLeft: 18, color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.8 }}>
            <li>Zero fabricated data: all metrics derived from real database tables and trained models.</li>
            <li>Interactive quantitative dashboard with Recharts financial visualizations.</li>
            <li>Real-time WebSocket event streaming with automatic UI state updates.</li>
            <li>Production model registry supporting multi-version comparison and evaluation.</li>
            <li>Containerized deployment via Docker Compose with automated health checks.</li>
          </ul>
        </div>

        <div className="analytics-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <span className="card-title">Current Limitations</span>
              <span className="card-subtitle">Transparent engineering constraints</span>
            </div>
          </div>

          <ul style={{ paddingLeft: 18, color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.8 }}>
            <li>Active trained model is currently calibrated specifically for <strong>TCS.NS</strong>; other tickers display pending model states.</li>
            <li>Inference is directional (binary UP/DOWN classification) rather than exact price point forecasting.</li>
            <li>Market data polling cadence is bounded to prevent third-party rate limiting.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
