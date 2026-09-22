import React from "react";
import { SystemStatusState } from "../types";

interface SystemStatusProps {
  status: SystemStatusState;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ status }) => {
  return (
    <div className="status-bar" aria-label="System Status Indicators">
      <div className="status-item">
        <span className={`status-dot ${status.api}`} />
        <span>API: {status.api.toUpperCase()}</span>
      </div>
      <div className="status-item">
        <span className={`status-dot ${status.model}`} />
        <span>MODEL: {status.model.toUpperCase()}</span>
      </div>
      <div className="status-item">
        <span className={`status-dot ${status.data}`} />
        <span>DATA: {status.data.toUpperCase()}</span>
      </div>
      <div className="status-item">
        <span className={`status-dot ${status.ws}`} />
        <span>STREAM: {status.ws.toUpperCase()}</span>
      </div>
    </div>
  );
};

