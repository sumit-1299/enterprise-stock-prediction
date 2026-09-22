import React from "react";
import {
  LayoutDashboard,
  Globe,
  CandlestickChart,
  Brain,
  History,
  BrainCircuit,
  ShieldCheck,
  HeartPulse,
  Settings,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
  TrendingUp,
  User,
  Sparkles,
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
  onOpenAssistant?: () => void;
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
      { id: "market", label: "Market Overview", icon: Globe },
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
      { id: "system", label: "System Health", icon: HeartPulse },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

/**
 * Soft pastel icon container color definitions per navigation section.
 * Used for subtle, sophisticated visual accents on deep navy foundation.
 */
interface IconContainerTheme {
  bg: string;
  color: string;
  border: string;
}

const ICON_CONTAINER_THEMES: Record<string, IconContainerTheme> = {
  dashboard: {
    bg: "rgba(59, 130, 246, 0.15)", // soft blue
    color: "#60A5FA",
    border: "rgba(96, 165, 250, 0.25)",
  },
  market: {
    bg: "rgba(20, 184, 166, 0.15)", // soft teal
    color: "#2DD4BF",
    border: "rgba(45, 212, 191, 0.25)",
  },
  analysis: {
    bg: "rgba(245, 158, 11, 0.15)", // soft amber
    color: "#FBBF24",
    border: "rgba(251, 191, 36, 0.25)",
  },
  predictions: {
    bg: "rgba(139, 92, 246, 0.15)", // soft violet
    color: "#A78BFA",
    border: "rgba(167, 139, 250, 0.25)",
  },
  history: {
    bg: "rgba(236, 72, 153, 0.15)", // soft pink
    color: "#F472B6",
    border: "rgba(244, 114, 182, 0.25)",
  },
  models: {
    bg: "rgba(34, 197, 94, 0.15)", // soft green
    color: "#4ADE80",
    border: "rgba(74, 222, 128, 0.25)",
  },
  "data-quality": {
    bg: "rgba(6, 182, 212, 0.15)", // soft cyan
    color: "#22D3EE",
    border: "rgba(34, 211, 238, 0.25)",
  },
  system: {
    bg: "rgba(16, 185, 129, 0.15)", // soft emerald
    color: "#34D399",
    border: "rgba(52, 211, 153, 0.25)",
  },
  settings: {
    bg: "rgba(168, 85, 247, 0.15)", // soft purple
    color: "#C084FC",
    border: "rgba(192, 132, 252, 0.25)",
  },
  // Extra fallbacks if accessed via route
  data: {
    bg: "rgba(20, 184, 166, 0.15)",
    color: "#2DD4BF",
    border: "rgba(45, 212, 191, 0.25)",
  },
  technical: {
    bg: "rgba(245, 158, 11, 0.15)",
    color: "#FBBF24",
    border: "rgba(251, 191, 36, 0.25)",
  },
  jobs: {
    bg: "rgba(16, 185, 129, 0.15)",
    color: "#34D399",
    border: "rgba(52, 211, 153, 0.25)",
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  systemStatus,
  onOpenAssistant,
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

      <aside
        className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}
        style={{
          backgroundColor: "#172554",
          borderRight: "1px solid #1E293B",
        }}
      >
        {/* Top Header Branding: MarketIQ - AI Market Intelligence */}
        <div
          className="sidebar-header"
          style={{
            backgroundColor: "#172554",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "16px",
          }}
        >
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
              boxShadow: "0 2px 10px rgba(37, 99, 235, 0.35)",
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
                  color: "#F8FAFC",
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
                  color: "#60A5FA",
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
        <nav className="sidebar-nav" aria-label="Main Navigation" style={{ padding: "12px 8px" }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.groupTitle} className="sidebar-group" style={{ marginBottom: 14 }}>
              {!isCollapsed && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#94A3B8",
                    padding: "8px 12px 4px",
                  }}
                >
                  {group.groupTitle}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const iconTheme = ICON_CONTAINER_THEMES[item.id] || {
                  bg: "rgba(59, 130, 246, 0.15)",
                  color: "#60A5FA",
                  border: "rgba(96, 165, 250, 0.25)",
                };

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id);
                      onCloseMobile();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`sidebar-nav-btn ${isActive ? "active" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: isCollapsed ? "8px 0" : "7px 10px",
                      justifyContent: isCollapsed ? "center" : "flex-start",
                      borderRadius: 8,
                      color: isActive ? "#F8FAFC" : "#94A3B8",
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      cursor: "pointer",
                      transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                      border: "none",
                      borderLeft: isActive ? "3px solid #3B82F6" : "3px solid transparent",
                      background: isActive ? "rgba(59, 130, 246, 0.12)" : "transparent",
                      boxShadow: isActive ? "0 2px 8px rgba(0, 0, 0, 0.18)" : "none",
                      width: "100%",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                      marginBottom: 2,
                    }}
                  >
                    {/* Soft pastel icon container */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background: isActive ? "rgba(59, 130, 246, 0.22)" : iconTheme.bg,
                        border: `1px solid ${isActive ? "rgba(96, 165, 250, 0.45)" : iconTheme.border}`,
                        color: isActive ? "#60A5FA" : iconTheme.color,
                        boxShadow: isActive ? "0 0 8px rgba(59, 130, 246, 0.25)" : "none",
                        transition: "all 0.18s ease",
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* AI Assistant Visual Highlight Card */}
        <div style={{ padding: isCollapsed ? "0 8px 14px" : "0 10px 14px" }}>
          <button
            type="button"
            onClick={() => {
              if (onOpenAssistant) {
                onOpenAssistant();
              }
              onCloseMobile();
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: isCollapsed ? "10px 0" : "10px 12px",
              justifyContent: isCollapsed ? "center" : "flex-start",
              background: "linear-gradient(135deg, #312E81 0%, #6D28D9 100%)",
              border: "1px solid rgba(167, 139, 250, 0.35)",
              borderRadius: 10,
              color: "#FFFFFF",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(109, 40, 217, 0.28)",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              textAlign: "left",
              position: "relative",
              overflow: "hidden",
            }}
            className="sidebar-ai-card"
            title={isCollapsed ? "Market Intelligence AI Assistant" : undefined}
          >
            {/* Sparkles icon container with subtle glow */}
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#DDD6FE",
                flexShrink: 0,
                boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.25)",
              }}
            >
              <Sparkles size={16} />
            </div>
            {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em", color: "#FFFFFF" }}>
                    AI Assistant
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 9999,
                      background: "rgba(255, 255, 255, 0.2)",
                      color: "#DDD6FE",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    AGENT
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: "#C4B5FD",
                    marginTop: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Market Intelligence
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Sidebar Footer: System Status & User Profile Area */}
        <div
          className="sidebar-footer"
          style={{
            padding: "14px 16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            backgroundColor: "#172554",
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
                background: isSystemOnline ? "rgba(22, 163, 74, 0.15)" : "rgba(234, 88, 12, 0.15)",
                border: isSystemOnline
                  ? "1px solid rgba(74, 222, 128, 0.3)"
                  : "1px solid rgba(251, 146, 60, 0.3)",
                fontSize: 11,
                fontWeight: 600,
                color: isSystemOnline ? "#4ADE80" : "#FB923C",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: isSystemOnline ? "#22C55E" : "#F97316",
                  boxShadow: isSystemOnline ? "0 0 0 2px rgba(34, 197, 94, 0.25)" : "none",
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
                  backgroundColor: isSystemOnline ? "#22C55E" : "#F97316",
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
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#1E293B",
                  color: "#60A5FA",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 12,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  flexShrink: 0,
                }}
              >
                <User size={16} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC", lineHeight: 1.2 }}>
                  Quant Analyst
                </span>
                <span style={{ fontSize: 10, color: "#94A3B8", whiteSpace: "nowrap" }}>
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
              style={{
                padding: 6,
                background: "#1E293B",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#94A3B8",
              }}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

