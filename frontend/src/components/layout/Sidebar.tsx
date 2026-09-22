import React from "react";
import {
  LayoutDashboard,
  CandlestickChart,
  Brain,
  History,
  BrainCircuit,
  ShieldCheck,
  Database,
  HeartPulse,
  Settings,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
  TrendingUp,
  User,
} from "lucide-react";
import { NavSectionId, SystemStatusState } from "../../types";

interface SidebarProps {
  activeSection: NavSectionId;
  onSelectSection: (section: NavSectionId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  systemStatus: SystemStatusState;
}

interface NavItem {
  id: NavSectionId;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupTitle: "MAIN",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "analysis", label: "Stock Analysis", icon: CandlestickChart },
      { id: "predictions", label: "Predictions", icon: Brain },
    ],
  },
  {
    groupTitle: "INTELLIGENCE",
    items: [
      { id: "history", label: "Prediction History", icon: History },
      { id: "models", label: "Model Monitoring", icon: BrainCircuit },
      { id: "data-quality", label: "Data Quality", icon: ShieldCheck },
    ],
  },
  {
    groupTitle: "SYSTEM",
    items: [
      { id: "data", label: "Market Data", icon: Database },
      { id: "system", label: "System Health", icon: HeartPulse },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  systemStatus,
}) => {
  const isSystemOnline =
    systemStatus.api === "online" &&
    (systemStatus.data === "available" || systemStatus.data === "online");

  return (
    <>
      {/* Mobile drawer backdrop */}
      <div
        className={`sidebar-backdrop ${isMobileOpen ? "mobile-open" : ""}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}>
        {/* Top Header Branding: MarketIQ - AI Market Intelligence */}
        <div className="sidebar-header">
          <div
            className="sidebar-logo-icon"
            title="MarketIQ — AI Market Intelligence"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
            }}
          >
            <TrendingUp size={18} />
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-text">
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "#172033",
                  lineHeight: 1.2,
                }}
              >
                MarketIQ
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: "#2563EB",
                  textTransform: "uppercase",
                  marginTop: 1,
                }}
              >
                AI Market Intelligence
              </span>
            </div>
          )}
        </div>

        {/* Navigation Groups: MAIN, INTELLIGENCE, SYSTEM */}
        <nav className="sidebar-nav" aria-label="Main Navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.groupTitle} className="sidebar-group">
              {!isCollapsed && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#94A3B8",
                    padding: "10px 12px 4px",
                  }}
                >
                  {group.groupTitle}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id);
                      onCloseMobile();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 12px",
                      borderRadius: 8,
                      color: isActive ? "#172033" : "#64748B",
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      border: "none",
                      borderLeft: isActive ? "3px solid #2563EB" : "3px solid transparent",
                      background: isActive ? "#EEF2FF" : "transparent",
                      width: "100%",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon
                      size={18}
                      style={{
                        flexShrink: 0,
                        color: isActive ? "#2563EB" : "#64748B",
                        transition: "color 0.15s ease",
                      }}
                    />
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: System Status & User Profile Area */}
        <div
          className="sidebar-footer"
          style={{
            padding: "14px 16px",
            borderTop: "1px solid #DCE4EE",
            background: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Operational Status Pill */}
          {!isCollapsed ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 8,
                background: isSystemOnline ? "#F0FDF4" : "#FFF7ED",
                border: `1px solid ${isSystemOnline ? "#BBF7D0" : "#FED7AA"}`,
                fontSize: 11,
                fontWeight: 600,
                color: isSystemOnline ? "#16A34A" : "#EA580C",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: isSystemOnline ? "#16A34A" : "#EA580C",
                  boxShadow: isSystemOnline ? "0 0 0 2px rgba(22, 163, 74, 0.2)" : "none",
                }}
              />
              <span>{isSystemOnline ? "System Operational" : "System Monitoring"}</span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "6px 0",
              }}
              title={isSystemOnline ? "System Operational" : "System Monitoring"}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: isSystemOnline ? "#16A34A" : "#EA580C",
                }}
              />
            </div>
          )}

          {/* User / Profile Area */}
          {!isCollapsed && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingTop: 8,
                borderTop: "1px solid #F1F5F9",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#EFF6FF",
                  color: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 12,
                  border: "1px solid #BFDBFE",
                  flexShrink: 0,
                }}
              >
                <User size={16} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#172033", lineHeight: 1.2 }}>
                  Quant Analyst
                </span>
                <span style={{ fontSize: 10, color: "#64748B", whiteSpace: "nowrap" }}>
                  MCA Final-Year Project
                </span>
              </div>
            </div>
          )}

          {/* Collapse / Expand Toggle */}
          <div style={{ display: "flex", justifyContent: isCollapsed ? "center" : "flex-end" }}>
            <button
              type="button"
              className="header-toggle-btn"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{ padding: 6 }}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
