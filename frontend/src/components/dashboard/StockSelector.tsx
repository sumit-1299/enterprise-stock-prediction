import React, { useState } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";

interface StockSelectorProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  isLoading: boolean;
}

const SUGGESTED_SYMBOLS = [
  { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd.", exchange: "NSE" },
  { symbol: "RELIANCE.NS", name: "Reliance Industries Limited", exchange: "NSE" },
  { symbol: "INFY.NS", name: "Infosys Limited", exchange: "NSE" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Limited", exchange: "NSE" },
];

export const StockSelector: React.FC<StockSelectorProps> = ({
  currentSymbol,
  onSelectSymbol,
  isLoading,
}) => {
  const [inputVal, setInputVal] = useState(currentSymbol);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSelectSymbol(inputVal.trim().toUpperCase());
    }
  };

  const currentMeta = SUGGESTED_SYMBOLS.find(
    (s) => s.symbol.toUpperCase() === currentSymbol.toUpperCase()
  );

  return (
    <div className="stock-selector-card">
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {/* Active Stock Badge */}
        <div className="stock-selector-info">
          <div className="stock-badge">
            {currentSymbol}
          </div>
          <div className="stock-meta">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="stock-name">{currentMeta?.name || "NSE Listed Equity"}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  padding: "1px 6px",
                  borderRadius: 4,
                  backgroundColor: "#EFF6FF",
                  color: "#2563EB",
                  border: "1px solid #BFDBFE",
                }}
              >
                {currentMeta?.exchange || "NSE"}
              </span>
            </div>
            <span className="stock-exchange">Equities Segment • Regular Market Hours</span>
          </div>
        </div>

        {/* Search Field */}
        <form
          onSubmit={handleSubmit}
          className="stock-search-box"
        >
          <Search size={15} style={{ color: "#64748B" }} />
          <input
            type="text"
            placeholder="Search symbol (e.g. TCS.NS)..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isLoading}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--text-primary)",
              width: "100%",
            }}
          />
        </form>
      </div>

      {/* Suggested Stocks & Action Button */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Suggested:
        </span>
        <div className="stock-pills-row">
          {SUGGESTED_SYMBOLS.map((s) => {
            const isSelected = currentSymbol.toUpperCase() === s.symbol.toUpperCase();
            return (
              <button
                key={s.symbol}
                type="button"
                className={`stock-pill-btn ${isSelected ? "active" : ""}`}
                onClick={() => {
                  setInputVal(s.symbol);
                  onSelectSymbol(s.symbol);
                }}
                disabled={isLoading}
              >
                {s.symbol}
              </button>
            );
          })}
        </div>

        {/* Analyze Button with Blue/Purple Gradient */}
        <button
          type="button"
          className="btn-primary-gradient"
          onClick={() => onSelectSymbol(inputVal.trim().toUpperCase())}
          disabled={isLoading || !inputVal.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Analyze Stock</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
