import React, { useState, useEffect } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { SUPPORTED_STOCKS, StockConfig } from "../../config/stocks";

interface StockSelectorProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  isLoading: boolean;
}

export const StockSelector: React.FC<StockSelectorProps> = ({
  currentSymbol,
  onSelectSymbol,
  isLoading,
}) => {
  const [inputVal, setInputVal] = useState(currentSymbol);

  // Sync input value with currentSymbol
  useEffect(() => {
    setInputVal(currentSymbol);
  }, [currentSymbol]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputVal.trim();
    if (!query) return;

    // Search by symbol, ticker prefix, or company name
    const match = SUPPORTED_STOCKS.find(
      (s) =>
        s.symbol.toUpperCase() === query.toUpperCase() ||
        s.symbol.replace(".NS", "").toUpperCase() === query.toUpperCase() ||
        s.companyName.toLowerCase().includes(query.toLowerCase())
    );

    if (match) {
      onSelectSymbol(match.symbol);
      setInputVal(match.symbol);
    } else {
      onSelectSymbol(query.toUpperCase());
    }
  };

  const currentMeta: StockConfig | undefined = SUPPORTED_STOCKS.find(
    (s) => s.symbol.toUpperCase() === currentSymbol.toUpperCase()
  );

  return (
    <div
      className="card-standard"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "18px 22px",
      }}
    >
      {/* Top Row: Stock Identity & Search Field */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        {/* Left: Active Stock Details */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 16,
              fontWeight: 800,
              color: "#1D4ED8",
              backgroundColor: "#EFF6FF",
              border: "1.5px solid #BFDBFE",
              padding: "6px 12px",
              borderRadius: 8,
              letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            {currentSymbol}
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#172033",
                  letterSpacing: "-0.01em",
                }}
              >
                {currentMeta?.companyName || "NSE Listed Equity"}
              </span>
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
              {currentMeta?.sector && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 4,
                    backgroundColor: "#F1F5F9",
                    color: "#475569",
                  }}
                >
                  {currentMeta.sector}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 11,
                color: "#64748B",
                fontFamily: "var(--font-mono)",
                marginTop: 2,
              }}
            >
              Equities Segment • Regular Market Hours
            </span>
          </div>
        </div>

        {/* Right: Search Input */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            background: "#F8FAFC",
            border: "1px solid #CBD5E1",
            borderRadius: 8,
            padding: "6px 12px",
            gap: 8,
            width: 280,
            maxWidth: "100%",
            transition: "all 0.15s ease",
          }}
        >
          <Search size={14} style={{ color: "#64748B", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search symbol (e.g. ICICI, SBIN)..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isLoading}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "#172033",
              width: "100%",
            }}
          />
        </form>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#EEF3F8", width: "100%" }} />

      {/* Bottom Row: Universe (14) Chips & Analyze Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}
          >
            Universe ({SUPPORTED_STOCKS.length}):
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
            }}
          >
            {SUPPORTED_STOCKS.map((s) => {
              const isSelected = currentSymbol.toUpperCase() === s.symbol.toUpperCase();
              return (
                <button
                  key={s.symbol}
                  type="button"
                  className={`stock-pill-btn ${isSelected ? "active" : ""}`}
                  title={`${s.companyName} (${s.symbol}) — ${s.sector}`}
                  onClick={() => {
                    setInputVal(s.symbol);
                    onSelectSymbol(s.symbol);
                  }}
                  disabled={isLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    padding: "4px 9px",
                    borderRadius: 6,
                  }}
                >
                  <span>{s.symbol.replace(".NS", "")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Analyze Stock Action Button */}
        <button
          type="button"
          className="btn-primary-gradient"
          onClick={() => {
            const query = inputVal.trim();
            if (!query) return;
            const match = SUPPORTED_STOCKS.find(
              (s) =>
                s.symbol.toUpperCase() === query.toUpperCase() ||
                s.symbol.replace(".NS", "").toUpperCase() === query.toUpperCase() ||
                s.companyName.toLowerCase().includes(query.toLowerCase())
            );
            onSelectSymbol(match ? match.symbol : query.toUpperCase());
          }}
          disabled={isLoading || !inputVal.trim()}
          style={{ flexShrink: 0 }}
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
