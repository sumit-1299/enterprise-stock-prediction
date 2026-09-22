import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { AssistantTrigger, AssistantPanel } from "../ai-assistant";
import { NavSectionId, SystemStatusState } from "../../types";

interface AppShellProps {
  currentSymbol: string;
  onSelectSymbol?: (symbol: string) => void;
  systemStatus: SystemStatusState;
  lastUpdated?: string;
  activeSection: NavSectionId;
  onSelectSection: (section: NavSectionId) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  loadingMessage?: string;
  onOpenLogin?: () => void;
  children: React.ReactNode;
}

const SECTION_TITLES: Record<NavSectionId, string> = {
  dashboard: "Market Intelligence Dashboard",
  market: "Market Overview",
  analysis: "In-Depth Stock Analysis",
  predictions: "Machine Learning Directional Prediction",
  technical: "Technical Indicator Analysis",
  models: "Model Governance & Evaluation",
  history: "Historical Prediction Audit Log",
  data: "Market Data & Historical Records",
  "data-quality": "Data Quality & Integrity Monitoring",
  system: "Platform System Health & Subsystems",
  jobs: "Background Tasks & Celery Execution",
  settings: "Platform Configuration & Settings",
};

export const AppShell: React.FC<AppShellProps> = ({
  currentSymbol,
  onSelectSymbol,
  systemStatus,
  lastUpdated,
  activeSection,
  onSelectSection,
  onRefresh,
  isLoading,
  loadingMessage,
  onOpenLogin,
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return window.innerWidth < 1200;
  });
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Synchronize URL hash with active section
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, "") as NavSectionId;
      if (hash && SECTION_TITLES[hash]) {
        onSelectSection(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    const initialHash = window.location.hash.replace(/^#\/?/, "") as NavSectionId;
    if (initialHash && SECTION_TITLES[initialHash]) {
      onSelectSection(initialHash);
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [onSelectSection]);

  const handleSelectSection = (section: NavSectionId) => {
    window.location.hash = `#/${section}`;
    onSelectSection(section);
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        systemStatus={systemStatus}
        onOpenAssistant={() => setIsAssistantOpen(true)}
      />

      <div className={`main-wrapper ${isCollapsed ? "sidebar-collapsed" : ""}`}>
        <TopHeader
          pageTitle={SECTION_TITLES[activeSection] || "Market Intelligence Dashboard"}
          currentSymbol={currentSymbol}
          onSelectSymbol={onSelectSymbol}
          systemStatus={systemStatus}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebar={() => {
            if (window.innerWidth <= 768) {
              setIsMobileOpen((prev) => !prev);
            } else {
              setIsCollapsed((prev) => !prev);
            }
          }}
          onRefresh={onRefresh}
          lastUpdated={lastUpdated}
          isLoading={isLoading}
          onOpenLogin={onOpenLogin}
        />

        <main className="content-container">
          {isLoading && loadingMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 16px",
                borderRadius: "var(--radius-sm)",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                color: "#1D4ED8",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                letterSpacing: "0.03em",
                boxShadow: "var(--shadow-sm)",
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--accent-primary)",
                  display: "inline-block",
                }}
              />
              <span>{loadingMessage}</span>
            </div>
          )}
          {/* Keyed container for smooth page transitions */}
          <div key={activeSection} className="page-container">
            {children}
          </div>
        </main>
      </div>

      {/* Market Intelligence AI Assistant */}
      <AssistantTrigger
        isOpen={isAssistantOpen}
        onToggle={() => setIsAssistantOpen(true)}
        currentSymbol={currentSymbol}
      />

      <AssistantPanel
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        currentSymbol={currentSymbol}
        activeSection={activeSection}
        onSelectSymbol={onSelectSymbol}
        onNavigateSection={handleSelectSection}
      />
    </div>
  );
};
