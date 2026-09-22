import React, { useState } from "react";
import {
  TrendingUp,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X,
} from "lucide-react";

interface LoginPageProps {
  onLoginSuccess?: () => void;
  onClose?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onClose }) => {
  const [username, setUsername] = useState("analyst@marketiq.internal");
  const [password, setPassword] = useState("••••••••••••");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (onLoginSuccess) onLoginSuccess();
    }, 600);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "stretch",
        background: "#F4F7FB",
        position: "relative",
      }}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "#FFFFFF",
            border: "1px solid #DCE4EE",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#64748B",
            zIndex: 100,
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          }}
          title="Return to Platform"
        >
          <X size={18} />
        </button>
      )}

      {/* Left Column: Branding & Value Proposition */}
      <div
        style={{
          flex: "1 1 50%",
          background: "linear-gradient(135deg, #172033 0%, #0F172A 100%)",
          color: "#FFFFFF",
          padding: "60px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
        className="hidden-mobile"
      >
        {/* Subtle geometric data grid accent in background */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "radial-gradient(#334155 1px, transparent 1px), radial-gradient(#334155 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            backgroundPosition: "0 0, 16px 16px",
            opacity: 0.25,
            pointerEvents: "none",
          }}
        />

        {/* Top: Logo */}
        <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #2563EB, #4F46E5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
            }}
          >
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "#FFFFFF" }}>
              MarketIQ
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#60A5FA", textTransform: "uppercase" }}>
              AI Market Intelligence
            </div>
          </div>
        </div>

        {/* Middle: Core Value Proposition */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 520, margin: "60px 0" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(37, 99, 235, 0.2)",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              borderRadius: 9999,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
              color: "#93C5FD",
              marginBottom: 16,
            }}
          >
            <Sparkles size={13} />
            <span>INSTITUTIONAL QUANTITATIVE INTELLIGENCE</span>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.25, color: "#FFFFFF", margin: "0 0 16px 0" }}>
            Analyze market data, technical indicators and machine-learning predictions from one unified platform.
          </h1>

          <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.6, margin: 0 }}>
            Powered by high-throughput PostgreSQL time-series storage, automated 12-feature engineering, XGBoost gradient boosting classifiers, and continuous Population Stability Index (PSI) drift monitoring.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#CBD5E1" }}>
              <CheckCircle2 size={16} style={{ color: "#34D399", flexShrink: 0 }} />
              <span>Zero-fabrication deterministic data science integrity</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#CBD5E1" }}>
              <CheckCircle2 size={16} style={{ color: "#34D399", flexShrink: 0 }} />
              <span>Auditable t+1 directional predictions with calibrated confidence</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#CBD5E1" }}>
              <CheckCircle2 size={16} style={{ color: "#34D399", flexShrink: 0 }} />
              <span>Subsystem health telemetry across Daphne, Celery, and Redis</span>
            </div>
          </div>
        </div>

        {/* Bottom: MCA Defense Badge */}
        <div style={{ position: "relative", zIndex: 2, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>
            MCA Final-Year Project Demonstration Platform • Academic Year 2026
          </div>
        </div>
      </div>

      {/* Right Column: Clean Login Card */}
      <div
        style={{
          flex: "1 1 50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          background: "#F4F7FB",
        }}
      >
        <div
          className="card-standard"
          style={{
            maxWidth: 440,
            width: "100%",
            padding: 36,
            background: "#FFFFFF",
            borderRadius: 16,
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#172033", margin: "0 0 6px 0" }}>
              Sign In to MarketIQ
            </h2>
            <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
              Access live quantitative analytics, models, and real-time inference telemetry
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#172033", marginBottom: 6 }}>
                Email or Username
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "#F8FAFC",
                  border: "1px solid #DCE4EE",
                  borderRadius: 8,
                }}
              >
                <Mail size={16} style={{ color: "#94A3B8" }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 13,
                    fontFamily: "var(--font-sans)",
                    color: "#172033",
                    width: "100%",
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#172033", marginBottom: 6 }}>
                Password
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "#F8FAFC",
                  border: "1px solid #DCE4EE",
                  borderRadius: 8,
                }}
              >
                <Lock size={16} style={{ color: "#94A3B8" }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 13,
                    color: "#172033",
                    width: "100%",
                  }}
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#64748B" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: "#2563EB" }}
                />
                <span>Remember this terminal</span>
              </label>
              <span style={{ color: "#2563EB", fontWeight: 600, cursor: "pointer" }}>Demo Credentials</span>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              <span>{isLoading ? "Authenticating Session..." : "Sign In to Platform"}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: "1px solid #EEF3F8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              color: "#94A3B8",
            }}
          >
            <span>Role: Quantitative Analyst</span>
            <span style={{ color: "#16A34A", fontWeight: 700 }}>● Demo Mode Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
