import React, { useEffect, useState, useCallback } from "react";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { MarketOverview } from "./pages/MarketOverview";
import { StockAnalysis } from "./pages/StockAnalysis";
import { MarketData } from "./pages/MarketData";
import { TechnicalAnalysis } from "./pages/TechnicalAnalysis";
import { Predictions } from "./pages/Predictions";
import { PredictionHistory } from "./pages/PredictionHistory";
import { ModelAnalytics } from "./pages/ModelAnalytics";
import { SystemHealth } from "./pages/SystemHealth";
import { DataQuality } from "./pages/DataQuality";
import { BackgroundJobs } from "./pages/BackgroundJobs";
import { Settings } from "./pages/Settings";
import { LoginPage } from "./components/auth/LoginPage";
import {
  getHealth,
  getLatestMarketData,
  getModelInfo,
  getPrediction,
  getPredictionHistory,
  getMarketHistory,
  ApiError,
} from "./services/api";
import { useMarketWebSocket } from "./hooks/useMarketWebSocket";
import {
  ModelInfoResponse,
  PredictionResponse,
  PredictionHistoryItem,
  MarketDataPoint,
  MarketDataLatestResponse,
  SystemStatusState,
  StatusIndicator,
  NavSectionId,
} from "./types";

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<NavSectionId>("dashboard");
  const [currentSymbol, setCurrentSymbol] = useState("TCS.NS");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("ANALYZING...");
  const [latestMarketData, setLatestMarketData] = useState<MarketDataLatestResponse | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistoryItem[]>([]);
  const [predHistoryPage, setPredHistoryPage] = useState(1);
  const [predHistoryTotalPages, setPredHistoryTotalPages] = useState(1);
  const [predHistoryTotalCount, setPredHistoryTotalCount] = useState(0);
  const [marketData, setMarketData] = useState<MarketDataPoint[]>([]);
  const [realtimePrice, setRealtimePrice] = useState<number | undefined>(undefined);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  const { connectionStatus, lastEvent } = useMarketWebSocket(currentSymbol);

  const [systemStatus, setSystemStatus] = useState<SystemStatusState>({
    api: "checking",
    model: "checking",
    data: "checking",
    ws: "checking",
  });

  const checkHealth = useCallback(async () => {
    try {
      const health = await getHealth();
      if (health.status === "ok" || health.status === "degraded") {
        setSystemStatus((prev) => ({
          ...prev,
          api: "online",
          database: health.components?.database === "online" ? "online" : "offline",
          redis: health.components?.redis === "online" ? "online" : "offline",
          celery: health.components?.celery === "online" ? "online" : "offline",
          model: health.components?.model_registry === "online" ? "available" : "unavailable",
        }));
      } else {
        setSystemStatus((prev) => ({ ...prev, api: "offline" }));
      }
    } catch {
      setSystemStatus((prev) => ({
        ...prev,
        api: "offline",
        model: "unavailable",
        data: "unavailable",
      }));
    }
  }, []);

  const loadStockAnalysis = useCallback(async (symbol: string) => {
    setIsLoading(true);
    setLoadingMessage("LOADING MARKET DATA...");
    setError(null);
    setCurrentSymbol(symbol);
    setRealtimePrice(undefined);

    try {
      setLoadingMessage("LOADING MARKET DATA...");
      const [latestRes, marketResult] = await Promise.all([
        getLatestMarketData(symbol).catch((err) => {
          loggerDebug("Latest market data error:", err);
          return null;
        }),
        getMarketHistory(symbol, "1Y").catch((err) => {
          loggerDebug("Market history error:", err);
          return { data: [] };
        }),
      ]);

      setLoadingMessage("LOADING MODEL & PREDICTIONS...");
      const [predResult, modelResult, historyResult] = await Promise.all([
        getPrediction(symbol).catch((err) => {
          loggerDebug("Prediction error:", err);
          return null;
        }),
        getModelInfo(symbol).catch((err) => {
          loggerDebug("Model info error:", err);
          return null;
        }),
        getPredictionHistory(symbol, 1, 20).catch(() => ({ count: 0, page: 1, total_pages: 1, history: [] })),
      ]);

      setLoadingMessage("ANALYZING QUANTITATIVE SIGNALS...");

      if (!latestRes && !predResult && !modelResult && (!marketResult || marketResult.data.length === 0)) {
        throw new ApiError(`No data or models available for symbol '${symbol}'.`, "SYMBOL_NOT_FOUND", 404);
      }

      setLatestMarketData(latestRes);
      setPrediction(predResult);
      setModelInfo(modelResult);
      setPredictionHistory(historyResult.history || []);
      setPredHistoryPage(historyResult.page || 1);
      setPredHistoryTotalPages(historyResult.total_pages || 1);
      setPredHistoryTotalCount(historyResult.count || 0);
      setMarketData(marketResult.data || []);

      setSystemStatus((prev) => ({
        ...prev,
        api: "online",
        model: modelResult ? "available" : "unavailable",
        data: latestRes || (marketResult && marketResult.data.length > 0) ? "available" : "unavailable",
      }));
    } catch (err: any) {
      setLatestMarketData(null);
      setPrediction(null);
      setModelInfo(null);
      setPredictionHistory([]);
      setMarketData([]);

      if (err instanceof ApiError) {
        setError({ code: err.code, message: err.message });
        if (err.code === "SYMBOL_NOT_FOUND" || err.code === "INSUFFICIENT_DATA" || err.code === "NO_DATA") {
          setSystemStatus((prev) => ({ ...prev, data: "unavailable" }));
        } else if (err.code === "MODEL_NOT_FOUND" || err.code === "MODEL_METADATA_NOT_FOUND") {
          setSystemStatus((prev) => ({ ...prev, model: "unavailable" }));
        }
      } else {
        setError({
          code: "CLIENT_ERROR",
          message: err?.message || "An unexpected error occurred while fetching analysis.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    checkHealth();
    loadStockAnalysis("TCS.NS");
  }, [checkHealth, loadStockAnalysis]);

  // Synchronize WebSocket status
  useEffect(() => {
    let wsStatus: StatusIndicator = "offline";
    if (connectionStatus === "CONNECTED") {
      wsStatus = "online";
    } else if (connectionStatus === "CONNECTING") {
      wsStatus = "checking";
    }
    setSystemStatus((prev) => ({ ...prev, ws: wsStatus }));
  }, [connectionStatus]);

  // Handle incoming real-time market/prediction events
  useEffect(() => {
    if (!lastEvent || lastEvent.symbol !== currentSymbol) return;

    if (lastEvent.price !== undefined) {
      setRealtimePrice(lastEvent.price);
    }

    if (lastEvent.prediction && lastEvent.probability !== undefined) {
      setPrediction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timestamp: lastEvent.timestamp || prev.timestamp,
          prediction: lastEvent.prediction || prev.prediction,
          direction: lastEvent.direction !== undefined ? lastEvent.direction : prev.direction,
          probability: lastEvent.probability !== undefined ? lastEvent.probability : prev.probability,
          probabilities: lastEvent.probabilities || prev.probabilities,
        };
      });

      const newHistoryItem: PredictionHistoryItem = {
        id: Date.now(),
        symbol: lastEvent.symbol,
        prediction: lastEvent.prediction,
        direction:
          lastEvent.direction !== undefined
            ? lastEvent.direction
            : lastEvent.prediction === "UP"
            ? 1
            : 0,
        probability: lastEvent.probability,
        probabilities: lastEvent.probabilities || { DOWN: 0, UP: 0 },
        model_type: lastEvent.model_type || "xgboost_classifier",
        model_version: lastEvent.model_version || "v1",
        market_price: lastEvent.price,
        market_data_timestamp: lastEvent.timestamp,
        generated_at: new Date().toISOString(),
      };
      setPredictionHistory((prev) => [newHistoryItem, ...prev.slice(0, 19)]);
    }
  }, [lastEvent, currentSymbol]);

  // Conservative auto-refresh for latest market data & prediction (45s interval)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [freshMarket, freshPred] = await Promise.all([
          getLatestMarketData(currentSymbol).catch(() => null),
          getPrediction(currentSymbol).catch(() => null),
        ]);
        if (freshMarket) setLatestMarketData(freshMarket);
        if (freshPred) setPrediction(freshPred);
      } catch {
        // silent auto-refresh
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [currentSymbol]);

  const handleRefresh = useCallback(() => {
    checkHealth();
    loadStockAnalysis(currentSymbol);
  }, [checkHealth, loadStockAnalysis, currentSymbol]);

  const handleHistoryPageChange = useCallback(
    async (newPage: number) => {
      setPredHistoryPage(newPage);
      try {
        const res = await getPredictionHistory(currentSymbol, newPage, 20);
        setPredictionHistory(res.history || []);
        setPredHistoryPage(res.page || newPage);
        setPredHistoryTotalPages(res.total_pages || 1);
        setPredHistoryTotalCount(res.count || 0);
      } catch (err) {
        loggerDebug("Failed to paginate prediction history:", err);
      }
    },
    [currentSymbol]
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <Dashboard
            currentSymbol={currentSymbol}
            onSelectSymbol={loadStockAnalysis}
            onNavigateSection={setActiveSection}
            prediction={prediction}
            modelInfo={modelInfo}
            marketData={marketData}
            latestMarketData={latestMarketData}
            realtimePrice={realtimePrice}
            isLoading={isLoading}
            error={error}
          />
        );
      case "market":
        return (
          <MarketOverview
            currentSymbol={currentSymbol}
            onSelectSymbol={loadStockAnalysis}
          />
        );
      case "analysis":
        return (
          <StockAnalysis
            currentSymbol={currentSymbol}
            onSelectSymbol={loadStockAnalysis}
            prediction={prediction}
            modelInfo={modelInfo}
            marketData={marketData}
            isLoading={isLoading}
          />
        );
      case "predictions":
        return (
          <Predictions
            currentSymbol={currentSymbol}
            prediction={prediction}
            marketData={marketData}
            isLoading={isLoading}
          />
        );
      case "technical":
        return <TechnicalAnalysis currentSymbol={currentSymbol} marketData={marketData} />;
      case "models":
        return <ModelAnalytics currentSymbol={currentSymbol} onNavigateSection={setActiveSection} />;
      case "history":
        return (
          <PredictionHistory
            currentSymbol={currentSymbol}
            history={predictionHistory}
            isLoading={isLoading}
            page={predHistoryPage}
            totalPages={predHistoryTotalPages}
            totalCount={predHistoryTotalCount}
            onPageChange={handleHistoryPageChange}
          />
        );
      case "data":
        return <MarketData currentSymbol={currentSymbol} marketData={marketData} />;
      case "data-quality":
        return <DataQuality currentSymbol={currentSymbol} marketData={marketData} />;
      case "system":
        return <SystemHealth systemStatus={systemStatus} onRefreshHealth={checkHealth} />;
      case "jobs":
        return <BackgroundJobs systemStatus={systemStatus} onRefreshJobs={checkHealth} />;
      case "settings":
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <>
      {showLoginModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1000 }}>
          <LoginPage
            onLoginSuccess={() => setShowLoginModal(false)}
            onClose={() => setShowLoginModal(false)}
          />
        </div>
      )}

      <AppShell
        currentSymbol={currentSymbol}
        onSelectSymbol={loadStockAnalysis}
        systemStatus={systemStatus}
        lastUpdated={
          latestMarketData?.timestamp ||
          prediction?.timestamp ||
          marketData[marketData.length - 1]?.timestamp
        }
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        onOpenLogin={() => setShowLoginModal(true)}
      >
        {renderActiveSection()}
      </AppShell>
    </>
  );
};

function loggerDebug(...args: any[]) {
  if (import.meta.env.DEV) {
    console.debug(...args);
  }
}

export default App;
