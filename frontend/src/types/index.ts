/**
 * TypeScript interface definitions for the Stock Intelligence Platform.
 */

export interface HealthResponse {
  status: string;
  components?: {
    api?: string;
    database?: string;
    redis?: string;
    celery?: string;
    model_registry?: string;
    [key: string]: any;
  };
}

export interface Probabilities {
  DOWN: number;
  UP: number;
}

export interface PredictionResponse {
  symbol: string;
  prediction: "UP" | "DOWN";
  direction: 0 | 1;
  probability: number;
  probabilities: Probabilities;
  model_type: string;
  model_version: string;
  timestamp: string;
  features_used?: string[];
}

export interface ModelInfoResponse {
  symbol: string;
  model_type: string;
  model_version: string;
  features: string[];
  metrics?: {
    accuracy?: number;
    balanced_accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    roc_auc?: number | null;
    [key: string]: any;
  };
  created_at?: string | null;
  feature_importance?: Record<string, number>;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export type StatusIndicator = "online" | "offline" | "checking" | "available" | "unavailable";

export interface SystemStatusState {
  api: StatusIndicator;
  model: StatusIndicator;
  data: StatusIndicator;
  ws: StatusIndicator;
  database?: StatusIndicator;
  redis?: StatusIndicator;
  celery?: StatusIndicator;
}

export interface RealtimeMarketEvent {
  type: "market_update" | "prediction_update";
  symbol: string;
  timestamp: string;
  price: number;
  volume?: number;
  prediction?: "UP" | "DOWN";
  direction?: 0 | 1;
  probability?: number;
  probabilities?: Probabilities;
  model_type?: string;
  model_version?: string;
}

export type WebSocketConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

export interface PredictionHistoryItem {
  id?: number;
  symbol: string;
  prediction: "UP" | "DOWN";
  direction: 0 | 1;
  probability: number;
  probabilities: Probabilities;
  model_type: string;
  model_version: string;
  market_price?: number | null;
  market_data_timestamp?: string | null;
  features_used?: string[];
  feature_snapshot?: Record<string, number | null> | null;
  actual_direction?: "UP" | "DOWN" | null;
  actual_return?: number | null;
  outcome?: "CORRECT" | "INCORRECT" | "PENDING";
  resolved_at?: string | null;
  latency_ms?: number | null;
  generated_at: string;
}

export interface PredictionHistoryResponse {
  symbol: string;
  count: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  limit?: number;
  history: PredictionHistoryItem[];
}

export interface MarketDataPoint {
  timestamp: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number;
  return_1d?: number | null;
  return_5d?: number | null;
  sma_10?: number | null;
  sma_20?: number | null;
  sma_50?: number | null;
  ema_12?: number | null;
  ema_26?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
  rsi_14?: number | null;
  volatility_20?: number | null;
  volume_change?: number | null;
}

export interface MarketDataLatestResponse {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  change_percent: number;
}

export interface TechnicalIndicatorsResponse {
  symbol: string;
  timestamp: string;
  indicators: {
    return_1d?: number | null;
    return_5d?: number | null;
    sma_10?: number | null;
    sma_20?: number | null;
    sma_50?: number | null;
    ema_12?: number | null;
    ema_26?: number | null;
    macd?: number | null;
    macd_signal?: number | null;
    rsi_14?: number | null;
    volatility_20?: number | null;
    volume_change?: number | null;
  };
  history?: MarketDataPoint[];
}

export interface MarketDataHistoryResponse {
  symbol: string;
  range?: string;
  count: number;
  data: MarketDataPoint[];
}

export type NavSectionId =
  | "dashboard"
  | "market"
  | "analysis"
  | "predictions"
  | "technical"
  | "models"
  | "history"
  | "data"
  | "data-quality"
  | "system"
  | "jobs"
  | "settings";

export interface ModelFeatureImportanceItem {
  feature: string;
  importance: number;
  rank: number;
}

export interface ModelArtifactStatus {
  artifact: "AVAILABLE" | "MISSING";
  metadata: "AVAILABLE" | "MISSING";
  feature_schema: "COMPATIBLE" | "INCOMPATIBLE";
  version: string;
}

export interface ModelAnalyticsModel {
  type: string;
  version: string;
  status: string;
  task: string;
  target: string;
  classes: string[];
  features_count: number;
  features: string[];
  execution: string;
  created_at?: string | null;
  promoted_at?: string | null;
}

export interface ModelAnalyticsMetrics {
  accuracy?: number;
  balanced_accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  roc_auc?: number;
  [key: string]: any;
}

export interface ModelAnalyticsResponse {
  symbol: string;
  model: ModelAnalyticsModel;
  metrics: ModelAnalyticsMetrics;
  feature_importance: ModelFeatureImportanceItem[];
  artifact_status: ModelArtifactStatus;
  confusion_matrix?: Record<string, any> | null;
  roc_curve?: Record<string, any> | null;
  pr_curve?: Record<string, any> | null;
}

export interface RegisteredModelItem {
  symbol: string;
  model_type: string;
  version: string;
  status: string;
  feature_schema_version: string;
  metrics: Record<string, number>;
  hyperparameters?: Record<string, any>;
  features?: string[];
  created_at?: string | null;
  promoted_at?: string | null;
  retired_at?: string | null;
}

export interface RegisteredModelsResponse {
  symbol?: string;
  count: number;
  models: RegisteredModelItem[];
}

export interface ModelMonitoringSummaryResponse {
  symbol: string;
  active_model: {
    type: string;
    version: string;
    task: string;
    target: string;
    features_count: number;
    status: string;
    created_at?: string | null;
  };
  metrics: Record<string, number>;
  predictions: {
    total: number;
    resolved: number;
    correct: number;
    incorrect: number;
    pending: number;
    accuracy: number | null;
  };
  data_drift: {
    status: "Stable" | "Moderate" | "High" | "Unknown" | string;
    average_psi: number;
    method: string;
  };
  data_quality: {
    total_observations: number;
    oldest_observation: string | null;
    latest_observation: string | null;
    missing_values: number;
    duplicate_records: number;
  };
  health_indicators: {
    model_status?: string;
    data_status?: string;
    prediction_status?: string;
    drift_status?: string;
    performance_status?: string;
    model_health?: { status: string; detail: string };
    data_health?: { status: string; detail: string };
    prediction_health?: { status: string; detail: string };
    drift_health?: { status: string; detail: string };
    performance_health?: { status: string; detail: string };
  };
}

export interface ConfusionMatrixData {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  total: number;
  positive_class: string;
}

export interface AccuracyTimelinePoint {
  timestamp?: string;
  date?: string;
  accuracy: number;
  rolling_accuracy?: number;
  outcome?: "CORRECT" | "INCORRECT" | "PENDING";
  prediction?: "UP" | "DOWN";
  actual_direction?: "UP" | "DOWN" | null;
  total?: number;
  correct?: number;
}

export interface ConfidenceBucket {
  bucket: string;
  total_count?: number;
  total?: number;
  correct_count?: number;
  correct?: number;
  incorrect_count?: number;
  incorrect?: number;
  accuracy: number;
}

export interface ModelMonitoringPerformanceResponse {
  symbol: string;
  period: string;
  total_resolved: number;
  summary?: {
    total: number;
    resolved: number;
    correct: number;
    incorrect: number;
    pending: number;
    accuracy: number | null;
  };
  metrics: {
    accuracy: number | null;
    precision: number | null;
    recall: number | null;
    f1: number | null;
    specificity?: number | null;
  };
  confusion_matrix: ConfusionMatrixData;
  accuracy_timeline: AccuracyTimelinePoint[];
  confidence_buckets: ConfidenceBucket[];
}

export interface FeatureDriftItem {
  feature: string;
  reference_mean: number;
  current_mean: number;
  reference_std?: number;
  current_std?: number;
  drift_score?: number;
  psi?: number;
  mean_delta?: number;
  status: "Stable" | "Moderate" | "High" | "STABLE" | "MODERATE" | "HIGH";
}

export interface ModelMonitoringDriftResponse {
  symbol: string;
  status?: "Stable" | "Moderate" | "High" | "Unknown" | "ERROR" | "INSUFFICIENT_DATA" | string;
  overall_status?: string;
  average_psi?: number;
  mean_psi?: number;
  reference_observations?: number;
  current_observations?: number;
  method?: string;
  description?: string;
  reference_period?: string;
  current_period?: string;
  thresholds?: {
    stable: string;
    moderate: string;
    high: string;
  };
  features: FeatureDriftItem[];
  message?: string;
}

export interface QualityCheckItem {
  label?: string;
  check?: string;
  description?: string;
  status: "PASSED" | "WARNING" | "FAILED";
  detail?: string;
  details?: string;
}

export interface ModelMonitoringDataQualityResponse {
  symbol: string;
  total_observations?: number;
  oldest_observation?: string | null;
  latest_observation?: string | null;
  missing_values?: number;
  duplicate_records?: number;
  metrics?: {
    total_observations: number;
    oldest_observation: string | null;
    latest_observation: string | null;
    missing_values: number;
    duplicate_records: number;
    feature_completeness?: number;
  };
  checks?: QualityCheckItem[];
}

export interface AgentMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  toolsUsed?: string[];
  citations?: string[];
  suggestedQuestions?: string[];
  isError?: boolean;
}

export interface AgentChatRequest {
  message: string;
  symbol?: string;
  page?: string;
  conversation_history?: Array<{ sender: "user" | "assistant"; text: string }>;
}

export interface AgentChatResponse {
  response: string;
  symbol: string;
  tools_used: string[];
  citations: string[];
  suggested_questions: string[];
  execution_time_ms: number;
}


