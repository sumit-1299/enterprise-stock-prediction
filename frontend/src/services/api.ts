/**
 * Centralized API Service for communicating with the Django REST API.
 */

import {
  HealthResponse,
  ModelInfoResponse,
  PredictionResponse,
  PredictionHistoryResponse,
  PredictionHistoryItem,
  MarketDataHistoryResponse,
  MarketDataLatestResponse,
  TechnicalIndicatorsResponse,
  ApiErrorResponse,
  ModelAnalyticsResponse,
  RegisteredModelsResponse,
  ModelMonitoringSummaryResponse,
  ModelMonitoringPerformanceResponse,
  ModelMonitoringDriftResponse,
  ModelMonitoringDataQualityResponse,
  AgentChatRequest,
  AgentChatResponse,
} from "../types";

// Base URL: defaults to '/api' (leveraging Vite proxy in dev) or environment variable
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string = "UNKNOWN_ERROR", status: number = 500) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = "An unexpected error occurred.";
    let errorCode = "HTTP_" + response.status;

    try {
      const errorJson: ApiErrorResponse = await response.json();
      if (errorJson && errorJson.error) {
        errorMessage = errorJson.error.message || errorMessage;
        errorCode = errorJson.error.code || errorCode;
      }
    } catch {
      // Non-JSON response body (e.g. 502/504 gateway error)
      if (response.status === 404) {
        errorMessage = "Requested resource not found.";
      } else if (response.status === 422) {
        errorMessage = "Insufficient data to process request.";
      } else if (response.status >= 500) {
        errorMessage = "Backend service temporarily unavailable.";
      }
    }

    throw new ApiError(errorMessage, errorCode, response.status);
  }

  return response.json() as Promise<T>;
}

export async function getHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${BASE_URL}/health/`, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<HealthResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to connect to the prediction API.", "NETWORK_ERROR", 0);
  }
}

export async function getLatestMarketData(symbol: string): Promise<MarketDataLatestResponse> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(`${BASE_URL}/market-data/${encodeURIComponent(normalized)}/`, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<MarketDataLatestResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve latest market data.", "NETWORK_ERROR", 0);
  }
}

export async function getMarketHistory(
  symbol: string,
  range: string = "1Y",
  limit?: number
): Promise<MarketDataHistoryResponse> {
  const normalized = symbol.trim().toUpperCase();
  try {
    let url = `${BASE_URL}/market-data/${encodeURIComponent(normalized)}/history/?range=${encodeURIComponent(range)}`;
    if (limit) {
      url += `&limit=${limit}`;
    }
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<MarketDataHistoryResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve market history.", "NETWORK_ERROR", 0);
  }
}

export async function getTechnicalIndicators(symbol: string): Promise<TechnicalIndicatorsResponse> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(`${BASE_URL}/market-data/${encodeURIComponent(normalized)}/indicators/`, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<TechnicalIndicatorsResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve technical indicators.", "NETWORK_ERROR", 0);
  }
}

export async function getPrediction(symbol: string): Promise<PredictionResponse> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(`${BASE_URL}/predictions/${encodeURIComponent(normalized)}/`, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<PredictionResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to connect to the prediction API.", "NETWORK_ERROR", 0);
  }
}

export async function getModelInfo(symbol: string): Promise<ModelInfoResponse> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(`${BASE_URL}/predictions/${encodeURIComponent(normalized)}/model/`, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<ModelInfoResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to connect to the prediction API.", "NETWORK_ERROR", 0);
  }
}

export async function getModelAnalytics(symbol: string): Promise<ModelAnalyticsResponse> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(`${BASE_URL}/predictions/${encodeURIComponent(normalized)}/analytics/`, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<ModelAnalyticsResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve model analytics.", "NETWORK_ERROR", 0);
  }
}

export async function getRegisteredModels(symbol?: string): Promise<RegisteredModelsResponse> {
  try {
    const url = symbol
      ? `${BASE_URL}/models/${encodeURIComponent(symbol.trim().toUpperCase())}/`
      : `${BASE_URL}/models/`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<RegisteredModelsResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve registered models.", "NETWORK_ERROR", 0);
  }
}

export interface PredictionHistoryFilterParams {
  symbol?: string;
  page?: number;
  pageSize?: number;
  direction?: string;
  outcome?: string;
  period?: string;
  modelVersion?: string;
}

export async function getPredictionHistory(
  symbolOrParams: string | PredictionHistoryFilterParams,
  page: number = 1,
  pageSize: number = 20
): Promise<PredictionHistoryResponse> {
  let symbol = "";
  let p = page;
  let ps = pageSize;
  let direction = "";
  let outcome = "";
  let period = "";
  let modelVersion = "";

  if (typeof symbolOrParams === "string") {
    symbol = symbolOrParams.trim().toUpperCase();
  } else {
    symbol = (symbolOrParams.symbol || "").trim().toUpperCase();
    p = symbolOrParams.page || 1;
    ps = symbolOrParams.pageSize || 20;
    direction = symbolOrParams.direction || "";
    outcome = symbolOrParams.outcome || "";
    period = symbolOrParams.period || "";
    modelVersion = symbolOrParams.modelVersion || "";
  }

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(p));
  queryParams.set("page_size", String(ps));
  if (symbol) queryParams.set("symbol", symbol);
  if (direction && direction !== "ALL") queryParams.set("direction", direction);
  if (outcome && outcome !== "ALL") queryParams.set("outcome", outcome);
  if (period && period !== "ALL") queryParams.set("period", period);
  if (modelVersion && modelVersion !== "ALL") queryParams.set("model_version", modelVersion);

  const endpoint = symbol
    ? `${BASE_URL}/predictions/${encodeURIComponent(symbol)}/history/?${queryParams.toString()}`
    : `${BASE_URL}/predictions/history/?${queryParams.toString()}`;

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<PredictionHistoryResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to connect to the prediction API.", "NETWORK_ERROR", 0);
  }
}

export async function getPredictionDetail(id: number): Promise<PredictionHistoryItem> {
  try {
    const response = await fetch(`${BASE_URL}/predictions/history/${id}/`, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<PredictionHistoryItem>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve prediction detail.", "NETWORK_ERROR", 0);
  }
}

export async function getModelMonitoringSummary(symbol: string): Promise<ModelMonitoringSummaryResponse> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(`${BASE_URL}/model-monitoring/${encodeURIComponent(normalized)}/summary/`, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<ModelMonitoringSummaryResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve model monitoring summary.", "NETWORK_ERROR", 0);
  }
}

export async function getModelMonitoringPerformance(
  symbol: string,
  period: string = "ALL"
): Promise<ModelMonitoringPerformanceResponse> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(
      `${BASE_URL}/model-monitoring/${encodeURIComponent(normalized)}/performance/?period=${encodeURIComponent(period)}`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return await handleResponse<ModelMonitoringPerformanceResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve model monitoring performance.", "NETWORK_ERROR", 0);
  }
}

export async function getModelMonitoringDrift(symbol: string): Promise<ModelMonitoringDriftResponse> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(`${BASE_URL}/model-monitoring/${encodeURIComponent(normalized)}/drift/`, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<ModelMonitoringDriftResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve data drift metrics.", "NETWORK_ERROR", 0);
  }
}

export async function getModelMonitoringDataQuality(symbol: string): Promise<ModelMonitoringDataQualityResponse> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(`${BASE_URL}/model-monitoring/${encodeURIComponent(normalized)}/data-quality/`, {
      headers: { Accept: "application/json" },
    });
    return await handleResponse<ModelMonitoringDataQualityResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve data quality metrics.", "NETWORK_ERROR", 0);
  }
}

export async function getProductionModel(
  symbol: string,
  modelType: string = "xgboost_classifier"
): Promise<any> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(
      `${BASE_URL}/models/${encodeURIComponent(normalized)}/${encodeURIComponent(modelType)}/production/`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return await handleResponse<any>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve production model metadata.", "NETWORK_ERROR", 0);
  }
}

export async function getModelVersions(
  symbol: string,
  modelType: string = "xgboost_classifier"
): Promise<any> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const response = await fetch(
      `${BASE_URL}/models/${encodeURIComponent(normalized)}/${encodeURIComponent(modelType)}/versions/`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return await handleResponse<any>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Unable to retrieve model versions.", "NETWORK_ERROR", 0);
  }
}

export async function sendAgentMessage(payload: AgentChatRequest): Promise<AgentChatResponse> {
  try {
    const response = await fetch(`${BASE_URL}/ai-agent/chat/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return await handleResponse<AgentChatResponse>(response);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Failed to communicate with Market Intelligence Assistant.", "AI_AGENT_NETWORK_ERROR", 0);
  }
}

