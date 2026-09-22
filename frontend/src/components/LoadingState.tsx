import React from "react";

interface LoadingStateProps {
  symbol: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ symbol }) => {
  return (
    <div className="state-container">
      <div className="spinner" />
      <div className="state-title">Running Quantitative Inference</div>
      <div className="state-description">
        Retrieving latest market data, calculating 12 technical features (SMA, EMA, MACD, RSI, Volatility), and querying the approved model artifact for <strong>{symbol}</strong>...
      </div>
    </div>
  );
};

