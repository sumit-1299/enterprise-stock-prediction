# Module & Codebase Guide

This document provides a component-by-component architectural walkthrough of the entire **MarketIQ** codebase across the backend Django applications, machine learning modules, frontend React components, and infrastructure configurations.

---

## 📑 Table of Contents

- [Backend Architecture](#backend-architecture)
  - [1. `backend/config/` (Project Root)](#1-backendconfig-project-root)
  - [2. `backend/stocks/` (Universe Management)](#2-backendstocks-universe-management)
  - [3. `backend/market_data/` (Ingestion & Indicators)](#3-backendmarket_data-ingestion--indicators)
  - [4. `backend/predictions/` (ML Inference & Governance)](#4-backendpredictions-ml-inference--governance)
  - [5. `backend/users/` (Authentication)](#5-backendusers-authentication)
- [Machine Learning Engine (`ml/`)](#machine-learning-engine-ml)
  - [1. `ml/inference/` (Prediction Service)](#1-mlinference-prediction-service)
  - [2. `ml/models/artifacts/` (Model Artifacts)](#2-mlmodelsartifacts-model-artifacts)
  - [3. `ml/training/` (Offline Training)](#3-mltraining-offline-training)
- [Frontend Architecture (`frontend/`)](#frontend-architecture-frontend)
  - [1. `frontend/src/pages/` (9 Pages)](#1-frontendsrcpages-9-pages)
  - [2. `frontend/src/components/` (Component Hierarchy)](#2-frontendsrccomponents-component-hierarchy)
  - [3. `frontend/src/services/` & `hooks/`](#3-frontendsrcservices--hooks)
- [Infrastructure & Gateway (`infrastructure/`)](#infrastructure--gateway-infrastructure)

---

## 🐍 Backend Architecture

### 1. `backend/config/` (Project Root)
- **`settings.py`**:
  - Configures Django core, DRF pagination (`PageNumberPagination`), CORS whitelist, database connections, Redis URLs, Channels channel layers, and Celery beat schedules.
- **`asgi.py`**:
  - The entry point for Daphne. Implements protocol-type routing (`ProtocolTypeRouter`) dispatching standard HTTP requests to Django WSGI/ASGI handlers and WebSocket connections to `AuthMiddlewareStack(URLRouter(...))`.
- **`urls.py`**:
  - Root routing table mounting `/api/market-data/` to `market_data.urls`, `/api/` to `predictions.urls`, and `/admin/` to Django admin.
- **`celery.py`**:
  - Initializes the Celery application (`app = Celery('config')`), loads configuration with the `CELERY_` prefix, and enables task auto-discovery across installed apps.

---

### 2. `backend/stocks/` (Universe Management)
- **`models.py`**:
  - **`Stock`**: Primary entity for registered equities. Stores `symbol` (unique, indexed), `company_name`, `exchange` (e.g. `NSE`), `sector`, `currency` (default `INR`), and `is_active`.
- **`management/commands/register_universe.py`**:
  - CLI management command to bootstrap and register the core NSE stock universe (`TCS.NS`, `RELIANCE.NS`, `INFY.NS`, `HDFCBANK.NS`) with sector and exchange metadata.

---

### 3. `backend/market_data/` (Ingestion & Indicators)
- **`models.py`**:
  - **`MarketPrice`**: Time-series EOD OHLCV records. Contains `stock` (FK), `timestamp`, `timeframe` (`1d`), `open_price`, `high_price`, `low_price`, `close_price`, `volume`, and `source`. Enforces a composite `UniqueConstraint(fields=["stock", "timestamp", "timeframe", "source"])`.
- **`services/market_data_service.py`**:
  - Handles external provider fetching via `yfinance`, price normalization, and idempotent database persistence via `bulk_create` with `update_conflicts=True`.
- **`services/feature_engineering.py`**:
  - Computes all 12 technical features (SMA 10/20/50, EMA 12/26, MACD line/signal, RSI 14, Volatility 20, 1D/5D returns, volume change) using vectorized Pandas operations.
- **`services/realtime_service.py`**:
  - Evaluates live quotes and broadcasts price updates to the Django Channels Redis channel layer.
- **`services/data_quality.py`**:
  - Audits time-series datasets for price continuity, timestamp monotonicity, non-negative volume, and outlier threshold constraints.
- **`tasks.py`**:
  - **`ingest_market_data_task`**: Celery task to fetch historical EOD bars with bounded exponential backoff retries.
  - **`poll_market_data_task`**: Polling cycle for a single symbol.
  - **`scheduled_market_data_ingest`**: Periodic Celery Beat dispatcher polling all configured symbols.
- **`consumers.py`**:
  - **`MarketConsumer`**: Asynchronous WebSocket consumer (`AsyncWebsocketConsumer`) handling client connections on `/ws/market/<symbol>/`, joining Redis channel groups, and streaming real-time quotes.
- **`views.py`**:
  - **`MarketDataLatestView`**: Returns the latest recorded OHLCV session and percentage change.
  - **`MarketDataHistoryView`**: Returns historical bars filtered by period (`1M`, `3M`, `6M`, `1Y`, `ALL`).
  - **`MarketDataIndicatorsView`**: Returns computed technical indicators for charting.

---

### 4. `backend/predictions/` (ML Inference & Governance)
- **`models.py`**:
  - **`Prediction`**: Persisted inference record with `symbol`, `prediction` (`UP`/`DOWN`), `direction` (`1`/`0`), `probability`, `probabilities` (JSON), `model_version`, `features_used`, `feature_snapshot`, `actual_direction`, `actual_return`, `outcome` (`CORRECT`, `INCORRECT`, `PENDING`), and `latency_ms`.
  - **`ModelVersion`**: ML model governance registry tracking `symbol`, `model_type`, `version`, `status` (`candidate`, `staging`, `production`, `retired`), `artifact_path`, `hyperparameters`, and `metrics`.
  - **`ModelEvaluation`**: Granular validation/test evaluation scores per dataset split.
- **`services/live_prediction_service.py`**:
  - Orchestrates feature extraction on the latest market bar, loads the production model artifact, runs inference, persists the `Prediction` record, and broadcasts the event via WebSockets.
- **`services/model_monitoring_service.py`**:
  - Calculates rolling accuracy over time, confusion matrices (TP, FP, TN, FN), precision, recall, F1, and probability confidence calibration buckets.
- **`services/data_drift_service.py`**:
  - Calculates Population Stability Index (PSI) across all 12 input features between the baseline training distribution and live inference observations.
- **`services/prediction_resolution_service.py`**:
  - Realizes historical predictions by comparing predicted direction against subsequent trading day close prices, resolving `PENDING` records to `CORRECT` or `INCORRECT`.
- **`tasks.py`**:
  - **`generate_live_prediction_task`**: Asynchronous Celery task generating live predictions upon new market bar arrival.
  - **`resolve_pending_predictions_task`**: Periodic Celery task evaluating and resolving pending prediction outcomes.
- **`views.py`**:
  - **`HealthView`**: Probes API, PostgreSQL, Redis, Celery, and Model Registry status.
  - **`PredictionView`**: On-demand live directional prediction endpoint.
  - **`PredictionHistoryView`**: Paginated, filterable historical prediction ledger.
  - **`PredictionDetailView`**: Complete prediction audit detail including the 12-feature snapshot.
  - **`ModelInfoView` & `ModelAnalyticsView`**: Model metadata and feature importance.
  - **`ModelMonitoringSummaryView`, `ModelMonitoringPerformanceView`, `ModelMonitoringDriftView`, `ModelMonitoringDataQualityView`**: Production MLOps monitoring endpoints.

---

### 5. `backend/users/` (Authentication)
- Standard Django authentication app prepared for multi-tenant institutional user roles.

---

## 🧠 Machine Learning Engine (`ml/`)

### 1. `ml/inference/` (Prediction Service)
- **`prediction_service.py`**:
  - Core stateless inference engine. Loads serialized `.joblib` model artifacts and `.json` metadata from disk, validates input feature vectors, and computes directional class probabilities using XGBoost.
- **`exceptions.py`**:
  - Domain-specific exception hierarchy (`ModelNotFoundError`, `InsufficientDataError`, `MissingFeaturesError`, `InvalidModelInputError`).

### 2. `ml/models/artifacts/` (Model Artifacts)
- Contains versioned model artifacts and metadata:
  - `xgboost_classifier_TCS_NS_v1.joblib` / `.json`
  - `xgboost_classifier_RELIANCE_NS_v1.joblib` / `.json`
  - `xgboost_classifier_INFY_NS_v1.joblib` / `.json`
  - `xgboost_classifier_HDFCBANK_NS_v1.joblib` / `.json`

### 3. `ml/training/` (Offline Training)
- Implements sequential time-series training scripts using `TimeSeriesSplit` to prevent future data leakage (lookahead bias).

---

## 🎨 Frontend Architecture (`frontend/`)

### 1. `frontend/src/pages/` (9 Pages)
1. **`Dashboard.tsx`**: Main overview with hero header, stock identity, AI prediction centerpiece with radial gauge, 6 premium KPI cards, `DataSciencePipeline`, and `DataQualityMeter`.
2. **`StockAnalysis.tsx`**: Interactive technical terminal with 52W High/Low metrics strip, multi-timeframe charts (`1D` to `1Y`), indicator overlays, and CSV/JSON export.
3. **`Predictions.tsx`**: In-depth directional prediction page with 12-feature input matrix, model parameters, and compliance disclaimer.
4. **`PredictionHistory.tsx`**: Auditable historical ledger with direction/outcome/period filters, confusion matrix heatmap, accuracy over time line chart, and probability calibration buckets.
5. **`ModelAnalytics.tsx`**: MLOps governance dashboard with 5 subsystem health probes, feature importance chart, and Population Stability Index (PSI) drift monitoring.
6. **`DataQuality.tsx`**: Automated validation rules matrix (continuity, monotonicity, outlier bounds), feature store completeness, and data hygiene policy.
7. **`MarketData.tsx`**: High-density OHLCV time-series table, date search, range pills (`1M`, `3M`, `6M`, `1Y`, `ALL`), sort toggles, and instant CSV export.
8. **`SystemHealth.tsx`**: Real-time subsystem status cards (Daphne, PostgreSQL, Redis, Celery Worker, Celery Beat, Model Registry, YFinance, WebSockets).
9. **`Settings.tsx`**: Tabbed configuration console covering Runtime Endpoints, ML Inference Parameters, Telemetry & Celery Schedules, and Design System Tokens.

### 2. `frontend/src/components/` (Component Hierarchy)
- **`common/`**:
  - `KpiCard.tsx`: Standardized KPI card with colored accent borders, tinted icon badges, and loading skeletons.
  - `StatusBadge.tsx`: Semantic status indicator with pulsing dot.
  - `ConfidenceGauge.tsx`: Circular SVG progress gauge visualizing prediction probability.
  - `SkeletonLoader.tsx`: Shimmer loaders for asynchronous fetching.
  - `DataSciencePipeline.tsx`: 5-step horizontal stepper illustrating the ML lifecycle.
  - `DataQualityMeter.tsx`: 2-second visual data hygiene audit card.
- **`layout/`**:
  - `Sidebar.tsx`: Grouped navigation (`MAIN`, `INTELLIGENCE`, `SYSTEM`) with active indicators and user profile badge.
  - `TopHeader.tsx`: Breadcrumbs, autocomplete stock search, IST market session status, and notification bell.
  - `AppShell.tsx`: Application container providing smooth 200ms page transitions.
- **`charts/`**:
  - `PriceChart.tsx`, `InteractivePriceChart.tsx`, `VolumeChart.tsx`, `PredictionConfidenceChart.tsx`, `ModelMetricsChart.tsx`, `FeatureImportanceChart.tsx`, `RSIChart.tsx`, `MACDChart.tsx`, `VolatilityChart.tsx`, `ReturnDistributionChart.tsx`, `CorrelationHeatmap.tsx`.
- **`auth/`**:
  - `LoginPage.tsx`: Split-layout landing / login experience with branding, data geometry, and clean authentication card.

### 3. `frontend/src/services/` & `hooks/`
- **`services/api.ts`**: Centralized API service with error handling and typing.
- **`hooks/useMarketWebSocket.ts`**: Custom hook managing WebSocket reconnection and event streaming.

---

## 🐳 Infrastructure & Gateway (`infrastructure/`)

- **`infrastructure/docker/backend.Dockerfile`**: Multi-stage Dockerfile for Daphne ASGI backend, Celery Worker, and Celery Beat.
- **`infrastructure/docker/entrypoint.sh`**: Container entrypoint managing database migrations and process routing.
- **`infrastructure/nginx/nginx.conf`**: Nginx reverse proxy configuration handling HTTP proxying, WebSocket upgrades, and static asset caching.
- **`frontend/Dockerfile` & `nginx.conf`**: Multi-stage build compiling React TypeScript assets and serving them via Nginx Alpine.

