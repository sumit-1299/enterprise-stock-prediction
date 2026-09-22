import React from "react";
import { Radio, Zap } from "lucide-react";
import { RealtimeMarketEvent, WebSocketConnectionStatus } from "../types";

interface LiveStreamProps {
  currentSymbol: string;
  connectionStatus: WebSocketConnectionStatus;
  lastEvent: RealtimeMarketEvent | null;
  isLive: boolean;
}

export const LiveStream: React.FC<LiveStreamProps> = ({
  currentSymbol,
  connectionStatus,
  lastEvent,
  isLive,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Stream Status Banner */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Live Market & Inference Stream</span>
            <span className="card-subtitle">
              Django Channels WebSocket connection: ws://host/ws/market/{currentSymbol}/
            </span>
          </div>

          <div className={`status-pill ${isLive ? "online" : "offline"}`}>
            <Radio size={14} className={isLive ? "pulse-anim" : ""} />
            STREAM: {isLive ? "LIVE" : connectionStatus}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div className="kpi-card">
            <div className="kpi-header">Connection State</div>
            <div className="kpi-value" style={{ fontSize: 18, color: isLive ? "var(--color-up)" : "var(--color-down)" }}>
              {connectionStatus}
            </div>
            <div className="kpi-footer">Transport: WebSocket</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">Target Symbol</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>{currentSymbol}</div>
            <div className="kpi-footer">Channel: market_{currentSymbol.replace(".", "_")}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">Last Event Received</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>
              {lastEvent ? lastEvent.type : "None yet"}
            </div>
            <div className="kpi-footer">
              {lastEvent?.timestamp ? new Date(lastEvent.timestamp).toLocaleTimeString() : "Awaiting events"}
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header">Latest Streamed Price</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>
              {lastEvent?.price !== undefined ? `₹${lastEvent.price.toFixed(2)}` : "—"}
            </div>
            <div className="kpi-footer">Real-time quote update</div>
          </div>
        </div>
      </div>

      {/* Latest Stream Payload Inspector */}
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">WebSocket Event Log & Telemetry</span>
            <span className="card-subtitle">Latest inbound event broadcast payload</span>
          </div>
        </div>

        {lastEvent ? (
          <div style={{ background: "var(--bg-primary)", padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <pre style={{ color: "var(--accent-secondary)", fontSize: 12, fontFamily: "var(--font-mono)", overflowX: "auto" }}>
              {JSON.stringify(lastEvent, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="state-box">
            <Zap size={32} style={{ color: "var(--text-muted)" }} />
            <div className="state-title">Awaiting Live Events</div>
            <div className="state-desc">
              Connected to channel for {currentSymbol}. Inbound market ticks or automated background predictions will appear here in real time without refreshing the page.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
