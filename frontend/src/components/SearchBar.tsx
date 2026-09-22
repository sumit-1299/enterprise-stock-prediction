import React, { useState } from "react";

interface SearchBarProps {
  onSearch: (symbol: string) => void;
  isLoading: boolean;
  defaultSymbol?: string;
}

const COMMON_SYMBOLS = ["TCS.NS", "RELIANCE.NS", "INFY.NS", "HDFCBANK.NS"];

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading,
  defaultSymbol = "TCS.NS",
}) => {
  const [symbol, setSymbol] = useState(defaultSymbol);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      onSearch(symbol.trim().toUpperCase());
    }
  };

  const handleChipClick = (sym: string) => {
    setSymbol(sym);
    onSearch(sym);
  };

  return (
    <div className="search-card">
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter symbol (e.g. TCS.NS)"
            disabled={isLoading}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
        <button
          type="submit"
          className="btn-analyze"
          disabled={isLoading || !symbol.trim()}
        >
          {isLoading ? (
            <>
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              <span>Analyzing...</span>
            </>
          ) : (
            <span>Analyze Stock</span>
          )}
        </button>
      </form>

      <div className="sample-symbols">
        <span>Suggested:</span>
        {COMMON_SYMBOLS.map((sym) => (
          <button
            key={sym}
            type="button"
            className="chip-symbol"
            onClick={() => handleChipClick(sym)}
            disabled={isLoading}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
};

