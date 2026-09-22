/**
 * Custom React Hook for managing symbol-specific WebSocket connections to Django Channels.
 */

import { useEffect, useRef, useState } from "react";
import { RealtimeMarketEvent, WebSocketConnectionStatus } from "../types";

function getWsUrl(symbol: string): string {
  const configured = import.meta.env.VITE_WS_BASE_URL;
  if (configured) {
    return `${configured.replace(/\/+$/, "")}/ws/market/${encodeURIComponent(symbol)}/`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Default to 127.0.0.1:8000 in local dev when running Vite on port 5173
  const host =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "127.0.0.1:8000"
      : window.location.host;
  return `${protocol}//${host}/ws/market/${encodeURIComponent(symbol)}/`;
}

interface UseMarketWebSocketResult {
  connectionStatus: WebSocketConnectionStatus;
  lastEvent: RealtimeMarketEvent | null;
  isLive: boolean;
}

export function useMarketWebSocket(symbol: string): UseMarketWebSocketResult {
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnectionStatus>("DISCONNECTED");
  const [lastEvent, setLastEvent] = useState<RealtimeMarketEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 5;

  useEffect(() => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) {
      setConnectionStatus("DISCONNECTED");
      return;
    }

    let isSubscribed = true;
    retryCountRef.current = 0;
    setLastEvent(null);

    function connect() {
      if (!isSubscribed) return;

      // Close previous connection if active
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setConnectionStatus("CONNECTING");
      const url = getWsUrl(normalized);

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          retryCountRef.current = 0;
          setConnectionStatus("CONNECTED");
        };

        ws.onmessage = (event: MessageEvent) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            if (
              data &&
              (data.type === "market_update" || data.type === "prediction_update") &&
              data.symbol === normalized
            ) {
              setLastEvent(data as RealtimeMarketEvent);
            }
          } catch (err) {
            console.warn("Failed to parse incoming WebSocket message:", err);
          }
        };

        ws.onerror = () => {
          if (!isSubscribed) return;
          setConnectionStatus("ERROR");
        };

        ws.onclose = (event: CloseEvent) => {
          if (!isSubscribed) return;
          wsRef.current = null;

          // Do not attempt reconnection if closed intentionally (1000) or rejected (4400)
          if (event.code === 1000 || event.code === 4400) {
            setConnectionStatus("DISCONNECTED");
            return;
          }

          setConnectionStatus("DISCONNECTED");

          // Bounded exponential reconnect backoff
          if (retryCountRef.current < maxRetries) {
            const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 15000);
            retryCountRef.current += 1;
            reconnectTimeoutRef.current = window.setTimeout(() => {
              if (isSubscribed) connect();
            }, delay);
          }
        };
      } catch (err) {
        if (!isSubscribed) return;
        setConnectionStatus("ERROR");
      }
    }

    connect();

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted or symbol changed");
        wsRef.current = null;
      }
    };
  }, [symbol]);

  return {
    connectionStatus,
    lastEvent,
    isLive: connectionStatus === "CONNECTED",
  };
}

