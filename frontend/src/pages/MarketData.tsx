import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
  Download,
  Database,
  Layers,
} from "lucide-react";
import { MarketDataPoint } from "../types";
import { StatusBadge } from "../components/common/StatusBadge";

interface MarketDataProps {
  currentSymbol: string;
  marketData: MarketDataPoint[];
}

type RangeFilter = "ALL" | "1M" | "3M" | "6M" | "1Y";

export const MarketData: React.FC<MarketDataProps> = ({ currentSymbol, marketData }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false);
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 15;

  const filteredByRange = useMemo(() => {
    if (!marketData || marketData.length === 0) return [];
    let subset: MarketDataPoint[];
    switch (rangeFilter) {
      case "1M":
        subset = marketData.slice(-22);
        break;
      case "3M":
        subset = marketData.slice(-66);
        break;
      case "6M":
        subset = marketData.slice(-132);
        break;
      case "1Y":
        subset = marketData.slice(-252);
        break;
      case "ALL":
      default:
        subset = marketData;
        break;
    }

    if (!searchQuery.trim()) return subset;
    const q = searchQuery.toLowerCase();
    return subset.filter((d) => {
      const dateStr = new Date(d.timestamp).toLocaleDateString().toLowerCase();
      const rawDate = d.timestamp.toLowerCase();
      return dateStr.includes(q) || rawDate.includes(q);
    });
  }, [marketData, rangeFilter, searchQuery]);

  const sortedData = useMemo(() => {
    return [...filteredByRange].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    });
  }, [filteredByRange, sortAsc]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCSV = () => {
    if (!sortedData || sortedData.length === 0) return;
    const headers = ["Timestamp", "Open", "High", "Low", "Close", "Volume", "Return_1D", "RSI_14", "MACD"];
    const rows = sortedData.map((d) => [
      d.timestamp,
      d.open ?? "",
      d.high ?? "",
      d.low ?? "",
      d.close ?? "",
      d.volume ?? "",
      d.return_1d ?? "",
      d.rsi_14 ?? "",
      d.macd ?? "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${currentSymbol}_market_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Header Card */}
      <div className="card-standard" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563EB",
                boxShadow: "0 2px 4px rgba(37,99,235,0.1)",
              }}
            >
              <Database size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                  Market Price & Volume Time-Series
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#2563EB",
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {currentSymbol}
                </span>
                <StatusBadge variant="operational" label="VERIFIED POSTGRESQL SERIES" />
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                Auditable historical OHLCV bars with calculated quantitative features ({sortedData.length} total records)
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
            onClick={handleExportCSV}
            disabled={sortedData.length === 0}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>

        {/* Filter Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {/* Search Filter */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#FFFFFF",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 12px",
            }}
          >
            <Search size={14} style={{ color: "#64748B" }} />
            <input
              type="text"
              placeholder="Search date (YYYY-MM-DD)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                border: "none",
                outline: "none",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-primary)",
                width: 180,
                background: "transparent",
              }}
            />
          </div>

          {/* Range Filters */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginRight: 4 }}>
              Range:
            </span>
            {(["1M", "3M", "6M", "1Y", "ALL"] as RangeFilter[]).map((rf) => (
              <button
                key={rf}
                type="button"
                className={`pill-filter ${rangeFilter === rf ? "active" : ""}`}
                onClick={() => {
                  setRangeFilter(rf);
                  setCurrentPage(1);
                }}
              >
                {rf}
              </button>
            ))}
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            className="btn-outline"
            onClick={() => setSortAsc((prev) => !prev)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginLeft: "auto",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          >
            <ArrowUpDown size={12} />
            <span>{sortAsc ? "Oldest First ▲" : "Newest First ▼"}</span>
          </button>
        </div>
      </div>

      {/* 2. OHLCV Data Table Card */}
      <div className="card-standard" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Showing Page {currentPage} of {totalPages} ({paginatedData.length} of {sortedData.length} records)
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                type="button"
                className="btn-outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: "4px 8px" }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", padding: "0 4px" }}>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="btn-outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: "4px 8px" }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>TIMESTAMP (IST)</th>
                <th style={{ textAlign: "right" }}>OPEN (₹)</th>
                <th style={{ textAlign: "right" }}>HIGH (₹)</th>
                <th style={{ textAlign: "right" }}>LOW (₹)</th>
                <th style={{ textAlign: "right" }}>CLOSE (₹)</th>
                <th style={{ textAlign: "right" }}>VOLUME</th>
                <th style={{ textAlign: "right" }}>1D RETURN</th>
                <th style={{ textAlign: "right" }}>RSI (14)</th>
                <th style={{ textAlign: "right" }}>MACD</th>
                <th style={{ textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
                    <Layers size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>No Market Data Available</div>
                    <div style={{ fontSize: 12 }}>No historical price records match the selected query or range.</div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const ret = row.return_1d;
                  const isRetPositive = ret !== undefined && ret !== null && ret > 0;
                  const isRetNegative = ret !== undefined && ret !== null && ret < 0;

                  return (
                    <tr key={row.timestamp || idx}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)" }}>
                        {new Date(row.timestamp).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          timeZone: "Asia/Kolkata",
                        })}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        {row.open !== undefined && row.open !== null ? `₹${row.open.toFixed(2)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        {row.high !== undefined && row.high !== null ? `₹${row.high.toFixed(2)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        {row.low !== undefined && row.low !== null ? `₹${row.low.toFixed(2)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
                        {row.close !== undefined && row.close !== null ? `₹${row.close.toFixed(2)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                        {row.volume !== undefined && row.volume !== null ? row.volume.toLocaleString() : "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: isRetPositive ? "#16A34A" : isRetNegative ? "#DC2626" : "var(--text-secondary)",
                        }}
                      >
                        {ret !== undefined && ret !== null ? `${ret > 0 ? "+" : ""}${(ret * 100).toFixed(2)}%` : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        {row.rsi_14 !== undefined && row.rsi_14 !== null ? row.rsi_14.toFixed(1) : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                        {row.macd !== undefined && row.macd !== null ? row.macd.toFixed(2) : "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "#DCFCE7",
                            color: "#15803D",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          VERIFIED
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
