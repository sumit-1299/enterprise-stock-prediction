import React from "react";
import { VolumeChart } from "../components/charts/VolumeChart";
import { MarketDataPoint } from "../types";

interface VolumeAnalysisProps {
  currentSymbol: string;
  marketData: MarketDataPoint[];
}

export const VolumeAnalysis: React.FC<VolumeAnalysisProps> = ({ currentSymbol, marketData }) => {
  const latest = marketData.length > 0 ? marketData[marketData.length - 1] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Volume Dynamics Overview</span>
            <span className="card-subtitle">{currentSymbol} Historical Liquidity Profile</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div className="kpi-card">
            <div className="kpi-header">Latest Traded Volume</div>
            <div className="kpi-value">{latest?.volume ? latest.volume.toLocaleString() : "—"}</div>
            <div className="kpi-footer">Shares executed</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header">Volume Change %</div>
            <div
              className={`kpi-value ${
                latest?.volume_change && latest.volume_change >= 0 ? "up" : "down"
              }`}
            >
              {latest?.volume_change ? `${(latest.volume_change * 100).toFixed(2)}%` : "—"}
            </div>
            <div className="kpi-footer">Day-over-day delta</div>
          </div>
        </div>
      </div>

      <VolumeChart data={marketData} symbol={currentSymbol} />
    </div>
  );
};

