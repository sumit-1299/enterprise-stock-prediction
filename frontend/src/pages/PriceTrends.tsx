import React from "react";
import { MovingAverageChart } from "../components/charts/MovingAverageChart";
import { PriceChart } from "../components/charts/PriceChart";
import { MarketDataPoint } from "../types";

interface PriceTrendsProps {
  currentSymbol: string;
  marketData: MarketDataPoint[];
}

export const PriceTrends: React.FC<PriceTrendsProps> = ({ currentSymbol, marketData }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <MovingAverageChart data={marketData} symbol={currentSymbol} />
      <PriceChart data={marketData} symbol={currentSymbol} />
    </div>
  );
};

