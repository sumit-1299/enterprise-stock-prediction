import React, { useMemo, useState, useRef, useEffect } from "react";
import { Menu, RefreshCw, ChevronRight, Search, Bell, User, LogIn } from "lucide-react";
import { SystemStatusState } from "../../types";

interface TopHeaderProps {
  pageTitle: string;
  currentSymbol: string;
  onSelectSymbol?: (symbol: string) => void;
  systemStatus: SystemStatusState;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onRefresh: () => void;
  lastUpdated?: string;
  isLoading?: boolean;
  onOpenLogin?: () => void;
}

const COMPANY_NAMES: Record<string, string> = {
  "TCS.NS": "Tata Consultancy Services Ltd.",
  "RELIANCE.NS": "Reliance Industries Ltd.",
  "INFY.NS": "Infosys Ltd.",
  "HDFCBANK.NS": "HDFC Bank Ltd.",
};

const POPULAR_SYMBOLS = ["TCS.NS", "RELIANCE.NS", "INFY.NS", "HDFCBANK.NS"];

export const TopHeader: React.FC<TopHeaderProps> = ({
  pageTitle,
  currentSymbol,
  onSelectSymbol,
  systemStatus,
  onToggleSidebar,
  onRefresh,
  lastUpdated,
  isLoading,
  onOpenLogin,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered symbols for autocomplete
  const matchingSymbols = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return POPULAR_SYMBOLS.filter(
      (s) =>
        s.toLowerCase().includes(q) ||
        (COMPANY_NAMES[s] && COMPANY_NAMES[s].toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Indian market session (09:15 - 15:30 IST Mon-Fri)
  const marketSession = useMemo(() => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const istMinutesTotal = (utcHours * 60 + utcMinutes + 330) % 1440;
    const istHours = Math.floor(istMinutesTotal / 60);
    const istMinutes = istMinutesTotal % 60;
    const istDay = (now.getUTCDay() + (utcHours * 60 + utcMinutes + 330 >= 1440 ? 1 : 0)) % 7;

    const isWeekday = istDay >= 1 && istDay <= 5;
    const isMarketHours =
      (istHours > 9 || (istHours === 9 && istMinutes >= 15)) &&
      (istHours < 15 || (istHours === 15 && istMinutes <= 30));

    return isWeekday && isMarketHours ? "OPEN" : "CLOSED";
  }, []);

  const formattedLastUpdate = useMemo(() => {
    if (!lastUpdated) return "Live";
    const d = new Date(lastUpdated);
    return (
      d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Kolkata",
      }) + " IST"
    );
  }, [lastUpdated]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().toUpperCase();
    if (trimmed && onSelectSymbol) {
      onSelectSymbol(trimmed);
      setSearchQuery("");
      setIsSearchFocused(false);
    }
  };

  const handleSelectSymbol = (sym: string) => {
    if (onSelectSymbol) {
      onSelectSymbol(sym);
      setSearchQuery("");
      setIsSearchFocused(false);
    }
  };

  return (
    <header
      className="top-header"
      style={{
        height: 64,
        background: "#FFFFFF",
        borderBottom: "1px solid #DCE4EE",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "0 1px 3px rgba(23, 32, 51, 0.04)",
      }}
    >
      {/* Left: Sidebar Toggle + Breadcrumbs + Page Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          type="button"
          className="header-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
          title="Toggle navigation"
        >
          <Menu size={18} />
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {/* Breadcrumb */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "#64748B",
              fontFamily: "var(--font-sans)",
            }}
          >
            <span style={{ fontWeight: 600 }}>MarketIQ</span>
            <ChevronRight size={11} style={{ color: "#94A3B8" }} />
            <span style={{ color: "#2563EB", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              {currentSymbol}
            </span>
            <ChevronRight size={11} style={{ color: "#94A3B8" }} />
            <span>{pageTitle || "Dashboard"}</span>
          </div>

          {/* Page Heading */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#172033",
                letterSpacing: "-0.01em",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {pageTitle || "Dashboard"}
            </h1>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                color: "#475569",
                background: "#F1F5F9",
                padding: "2px 8px",
                borderRadius: 4,
                border: "1px solid #E2E8F0",
              }}
            >
              {COMPANY_NAMES[currentSymbol] || "NSE Equities"}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Global Stock Search Bar with Live Autocomplete */}
      {onSelectSymbol && (
        <div
          ref={searchRef}
          style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}
          className="hidden-mobile"
        >
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: isSearchFocused ? "#FFFFFF" : "#F4F7FB",
                border: isSearchFocused ? "1px solid #2563EB" : "1px solid #DCE4EE",
                borderRadius: 8,
                padding: "6px 12px",
                width: 220,
                transition: "all 0.15s ease",
                boxShadow: isSearchFocused ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none",
              }}
            >
              <Search size={14} style={{ color: isSearchFocused ? "#2563EB" : "#94A3B8" }} />
              <input
                type="text"
                placeholder="Search stock (e.g. TCS)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
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
            </div>
          </form>

          {/* Autocomplete Dropdown */}
          {isSearchFocused && matchingSymbols.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: 42,
                left: 0,
                width: 280,
                background: "#FFFFFF",
                border: "1px solid #DCE4EE",
                borderRadius: 10,
                boxShadow: "0 10px 25px rgba(23, 32, 51, 0.12)",
                zIndex: 60,
                padding: 6,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", padding: "4px 8px" }}>
                Matching Stocks ({matchingSymbols.length})
              </div>
              {matchingSymbols.map((sym) => (
                <div
                  key={sym}
                  onClick={() => handleSelectSymbol(sym)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: currentSymbol === sym ? "#EFF6FF" : "transparent",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = currentSymbol === sym ? "#EFF6FF" : "transparent")
                  }
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#172033", fontFamily: "var(--font-mono)" }}>
                      {sym}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>
                      {COMPANY_NAMES[sym]}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      background: "#F1F5F9",
                      padding: "2px 6px",
                      borderRadius: 4,
                      color: "#475569",
                    }}
                  >
                    NSE
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Popular Symbol Quick-Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {POPULAR_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => handleSelectSymbol(sym)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  border: currentSymbol === sym ? "1px solid #2563EB" : "1px solid #DCE4EE",
                  background: currentSymbol === sym ? "#EFF6FF" : "#FFFFFF",
                  color: currentSymbol === sym ? "#2563EB" : "#64748B",
                  transition: "all 0.15s ease",
                }}
              >
                {sym.replace(".NS", "")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Right: Market Status, Refresh, Notifications, User Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Market Status Pill */}
        <div
          className={`badge-status ${marketSession === "OPEN" ? "badge-status-operational" : "badge-status-warning"}`}
          title="National Stock Exchange of India (NSE) Regular Trading Session"
        >
          <span className="status-dot" />
          <span>Market {marketSession}</span>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          className="header-toggle-btn"
          title={`Last updated: ${formattedLastUpdate}. Click to refresh.`}
          aria-label="Refresh market data and predictions"
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} style={{ color: "#2563EB" }} />
        </button>

        {/* Notification Bell */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="header-toggle-btn"
            onClick={() => setShowNotifications((prev) => !prev)}
            title="Notifications & System Alerts"
            aria-label="View notifications"
          >
            <Bell size={15} />
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#2563EB",
              }}
            />
          </button>

          {showNotifications && (
            <div
              style={{
                position: "absolute",
                top: 38,
                right: 0,
                width: 280,
                background: "#FFFFFF",
                border: "1px solid #DCE4EE",
                borderRadius: 12,
                padding: 14,
                boxShadow: "0 10px 25px rgba(23, 32, 51, 0.1)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#172033", borderBottom: "1px solid #EEF3F8", paddingBottom: 6 }}>
                Platform Alerts
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>
                ● API Service: {systemStatus.api === "online" ? "Operational" : "Offline"}
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>
                ● Real-time prediction stream active for {currentSymbol}
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>
                ● Celery ingestion running at 1-minute intervals
              </div>
            </div>
          )}
        </div>

        {/* User Profile Badge (Click to open Auth/Login Modal) */}
        <div
          onClick={onOpenLogin}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px 4px 6px",
            borderRadius: 8,
            background: "#F8FAFC",
            border: "1px solid #DCE4EE",
            cursor: onOpenLogin ? "pointer" : "default",
            transition: "all 0.15s ease",
          }}
          title={onOpenLogin ? "Click to view Sign In / Authentication experience" : "Quant Analyst"}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#EFF6FF",
              color: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <User size={13} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#172033" }}>Analyst</span>
          {onOpenLogin && <LogIn size={12} style={{ color: "#94A3B8" }} />}
        </div>
      </div>
    </header>
  );
};
