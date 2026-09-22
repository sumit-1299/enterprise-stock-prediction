import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { MarketDataPoint, PredictionResponse, MarketDataLatestResponse } from "../types";
import { getLatestMarketData, getPrediction } from "../services/api";

interface MarketOverviewProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  marketData?: MarketDataPoint[];
}

interface StockOverviewData {
  price?: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  prediction?: "UP" | "DOWN";
  probability?: number;
  dataAvailable: boolean;
  modelAvailable: boolean;
  isLoading: boolean;
}

const CONFIGURED_STOCKS = [
  {
    symbol: "TCS.NS",
    name: "Tata Consultancy Services Ltd.",
    sector: "Information Technology",
  },
  {
    symbol: "INFY.NS",
    name: "Infosys Limited",
    sector: "Information Technology",
  },
  {
    symbol: "RELIANCE.NS",
    name: "Reliance Industries Limited",
    sector: "Energy & Conglomerate",
  },
  {
    symbol: "HDFCBANK.NS",
    name: "HDFC Bank Limited",
    sector: "Banking & Finance",
  },
];

export const MarketOverview: React.FC<MarketOverviewProps> = ({
  currentSymbol,
  onSelectSymbol,
}) => {
  const [stockDataMap, setStockDataMap] = useState<Record<string, StockOverviewData>>({});

  const fetchOverviewData = async () => {
    const newMap: Record<string, StockOverviewData> = {};

    await Promise.all(
      CONFIGURED_STOCKS.map(async (stock) => {
        let priceData: MarketDataLatestResponse | null = null;
        let predData: PredictionResponse | null = null;

        try {
          priceData = await getLatestMarketData(stock.symbol);
        } catch {
          priceData = null;
        }

        try {
          predData = await getPrediction(stock.symbol);
        } catch {
          predData = null;
        }

        newMap[stock.symbol] = {
          price: priceData?.close,
          change: priceData?.change,
          change_percent: priceData?.change_percent,
          volume: priceData?.volume,
          prediction: predData?.prediction,
          probability: predData?.probability,
          dataAvailable: !!priceData,
          modelAvailable: !!predData,
          isLoading: false,
        };
      })
    );

    setStockDataMap(newMap);
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="analytics-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Configured Equities Overview</span>
            <span className="card-subtitle">
              Live watchlist and quantitative predictions across tracked NSE equities
            </span>
          </div>

          <button
            type="button"
            className="timeframe-btn"
            onClick={fetchOverviewData}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={12} />
            <span>Refresh All</span>
          </button>
        </div>

        {/* 4 Stock Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {CONFIGURED_STOCKS.map((stock) => {
            const isSelected = stock.symbol === currentSymbol;
            const data = stockDataMap[stock.symbol];

            const price = data?.price !== undefined
              ? `₹${Number(data.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : data?.dataAvailable === false
              ? "Data unavailable"
              : "Loading...";

            const changeVal = data?.change;
            const changePctVal = data?.change_percent;
            const isPositive = changePctVal !== undefined && changePctVal >= 0;

            const volumeText = data?.volume !== undefined
              ? data.volume.toLocaleString()
              : data?.dataAvailable === false
              ? "Data unavailable"
              : "—";

            const predText = data?.prediction
              ? (data.prediction === "UP" ? "▲ UP" : "▼ DOWN")
              : data?.modelAvailable === false
              ? "Model unavailable"
              : "Loading...";

            const probText = data?.probability !== undefined
              ? `${(data.probability * 100).toFixed(1)}%`
              : data?.modelAvailable === false
              ? "Model unavailable"
              : "—";

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectSymbol(stock.symbol)}
                style={{
                  background: isSelected ? "#EFF6FF" : "var(--bg-card)",
                  border: isSelected ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-card)",
                  borderRadius: "var(--radius-md)",
                  padding: 20,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.08)" : "var(--shadow-sm)",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                      {stock.symbol}
                    </span>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{stock.name}</div>
                  </div>

                  {data?.modelAvailable ? (
                    <span style={{ color: "var(--color-up)", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} /> Active Model
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={13} /> Model N/A
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    padding: "10px 0",
                    borderTop: "1px solid var(--border-subtle)",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10 }}>PRICE</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{price}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10 }}>DAILY CHANGE</span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: changePctVal !== undefined ? (isPositive ? "var(--color-up)" : "var(--color-down)") : "var(--text-muted)",
                      }}
                    >
                      {changePctVal !== undefined
                        ? `${changeVal !== undefined ? `${changeVal >= 0 ? "+" : ""}₹${Math.abs(changeVal).toFixed(2)} ` : ""}(${isPositive ? "+" : ""}${Number(changePctVal).toFixed(2)}%)`
                        : "Data unavailable"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10 }}>VOLUME</span>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{volumeText}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10 }}>PREDICTION</span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: data?.prediction === "UP" ? "var(--color-up)" : data?.prediction === "DOWN" ? "var(--color-down)" : "var(--text-muted)",
                      }}
                    >
                      {predText}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10 }}>PROBABILITY</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{probText}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10 }}>DATA STATUS</span>
                    <span style={{ fontSize: 11, color: data?.dataAvailable ? "var(--color-up)" : "var(--text-muted)" }}>
                      ● {data?.dataAvailable ? "Connected" : "Pending"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, color: "var(--accent-primary)", fontSize: 11, fontWeight: 600 }}>
                  <span>{isSelected ? "Currently Selected" : "Click to Analyze"}</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
