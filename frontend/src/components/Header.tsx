import React from "react";
import { SystemStatusState } from "../types";
import { SystemStatus } from "./SystemStatus";

interface HeaderProps {
  status: SystemStatusState;
}

export const Header: React.FC<HeaderProps> = ({ status }) => {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-icon">▲</div>
        <div>
          <h1 className="brand-title">Enterprise Stock Intelligence</h1>
          <p className="brand-subtitle">Automated Quantitative Inference Engine</p>
        </div>
      </div>
      <SystemStatus status={status} />
    </header>
  );
};

