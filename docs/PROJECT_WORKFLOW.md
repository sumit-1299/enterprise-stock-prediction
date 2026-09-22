# Enterprise Stock Intelligence Platform — End-to-End Project Workflows

This document provides a detailed operational breakdown of the 7 primary end-to-end workflows governing the lifecycle of data, machine learning models, inferences, and monitoring in the **Enterprise Stock Intelligence Platform (MarketIQ)**.

---

## 📑 Table of Contents

- [Lifecycle Overview](#lifecycle-overview)
- [Workflow 1: Universe Registration & Asset Onboarding](#workflow-1-universe-registration--asset-onboarding)
- [Workflow 2: Historical Market Data Ingestion](#workflow-2-historical-market-data-ingestion)
- [Workflow 3: Feature Engineering & Technical Indicators Pipeline](#workflow-3-feature-engineering--technical-indicators-pipeline)
- [Workflow 4: Model Training, Evaluation & Registry Promotion](#workflow-4-model-training-evaluation--registry-promotion)
- [Workflow 5: Scheduled Market Polling & Ingestion Cycle](#workflow-5-scheduled-market-polling--ingestion-cycle)
- [Workflow 6: Live Prediction Inference & WebSocket Event Broadcasting](#workflow-6-live-prediction-inference--websocket-event-broadcasting)
- [Workflow 7: Prediction Outcome Realization & Drift Monitoring](#workflow-7-prediction-outcome-realization--drift-monitoring)
- [Operational Runbook & Command Quick-Reference](#operational-runbook--command-quick-reference)

---

## 🔄 Lifecycle Overview

```mermaid
flowchart TD
    W1["1. Universe Registration<br/>(register_universe)"] --> W2["2. Historical Ingestion<br/>(ingest_market_data)"]
    W2 --> W3["3. Feature Engineering<br/>(12 Factors, Zero Lookahead)"]
    W3 --> W4["4. Model Training & Promotion<br/>(train_models -> ModelRegistry)"]
    
    subgraph Operations["Continuous Operational Loop"]
        W5["5. Scheduled Polling (Celery Beat)<br/>(Every 300s -> market_prices)"]
        W6["6. Live Inference & Broadcast<br/>(XGBoost -> WebSocket Streaming)"]
        W7["7. Outcome Realization & Drift<br/>(Every 300s -> PSI & Accuracy)"]
        
        W5 -->|Trigger| W6
        W6 -->|Await Next Bar| W7
        W7 -->|Detect High Drift| W4
    end

    W4 --> Operations
```

---

## 🏁 Workflow 1: Universe Registration & Asset Onboarding

### Description
Populates the `stocks` relational table with the official tracking universe (`TCS.NS`, `RELIANCE.NS`, `INFY.NS`, `HDFCBANK.NS`), configuring exchange codes, industry sectors, and active tracking flags.

### Sequence
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Operator / CLI
    participant Cmd as register_universe
    participant DB as PostgreSQL (stocks table)

    Admin->>Cmd: python manage.py register_universe
    Cmd->>DB: Check existing symbols
    loop Each Stock in Universe
        Cmd->>DB: Stock.objects.get_or_create(symbol=...)
        DB-->>Cmd: Stock instance (created=True/False)
    end
    Cmd-->>Admin: "Registered 4 stocks successfully"
```

- **Trigger**: Initial deployment or administrator expansion.
- **Idempotency**: Uses `Stock.objects.get_or_create(symbol=...)` on unique column `symbol`.

---

## 📥 Workflow 2: Historical Market Data Ingestion

### Description
Retrieves 1–2 years of daily OHLCV candlestick bars from external providers (`yfinance`), validates structural candle invariants, and persists bars to `market_prices`.

### Sequence
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Operator / API / Celery
    participant Svc as MarketDataService
    participant Prov as YFinanceProvider
    participant Ext as Yahoo Finance API
    participant DB as PostgreSQL (market_prices)

    Admin->>Svc: fetch_historical_data("TCS.NS", period="1y", interval="1d")
    Svc->>Prov: fetch_historical_data()
    Prov->>Ext: Download historical bars
    Ext-->>Prov: Raw DataFrame
    Prov->>Prov: Validate OHLC invariants (H>=max(O,C), L<=min(O,C))
    Prov-->>Svc: List[MarketBar]
    loop Each MarketBar
        Svc->>DB: MarketPrice.objects.update_or_create(stock, timestamp, timeframe, source)
    end
    Svc-->>Admin: { created: N, updated: M }
```

- **Invariants Checked**: $H \ge \max(O,C)$, $L \le \min(O,C)$, $O > 0$, $C > 0$, $V \ge 0$.
- **Idempotency**: Enforced by PostgreSQL unique constraint `unique_market_price`.

---

## ⚙️ Workflow 3: Feature Engineering & Technical Indicators Pipeline

### Description
Transforms raw OHLCV price series into a normalized 12-feature quantitative dataset for model training and live inference without lookahead bias.

### Data Transformation Pipeline
```mermaid
flowchart LR
    OHLCV[("market_prices<br/>(Open, High, Low, Close, Volume)")]
    
    subgraph FeatureEngineeringService["FeatureEngineeringService.create_features()"]
        F1["Momentum:<br/>return_1d, return_5d"]
        F2["Trend (Moving Averages):<br/>sma_10, sma_20, sma_50<br/>ema_12, ema_26"]
        F3["Oscillators:<br/>macd, macd_signal, rsi_14"]
        F4["Volatility & Liquidity:<br/>volatility_20, volume_change"]
    end
    
    Target["Target Generation:<br/>y = 1 if return_1d(t+1) >= 0 else 0"]
    
    OHLCV --> FeatureEngineeringService
    FeatureEngineeringService --> Target
```

- **Feature Consistency**: Guarantees identical formula implementations in training (`ml/training/`) and live inference (`ml/inference/`).
- **Lookahead Bias Prevention**: Features at time $t$ only consume data up to and including candle $t$. Target $y_t$ is strictly shifted by 1 period into the future.

---

## 🧠 Workflow 4: Model Training, Evaluation & Registry Promotion

### Description
Executes sequential time-series training of the XGBoost classifier, evaluates performance across splits, generates confusion matrices, and registers model artifacts into `model_versions`.

### Sequence
```mermaid
sequenceDiagram
    autonumber
    actor CLI as python manage.py train_models
    participant Feat as FeatureEngineeringService
    participant Trainer as XGBoostTrainer
    participant Reg as ModelRegistry
    participant FS as Local Filesystem (.joblib, .json)
    participant DB as PostgreSQL (model_versions)

    CLI->>Feat: Load clean historical dataset
    Feat-->>Trainer: 12-feature matrix & binary target
    Trainer->>Trainer: Sequential Time-Series Split (80% Train, 20% Test)
    Trainer->>Trainer: Fit XGBoostClassifier with early stopping
    Trainer->>Trainer: Compute validation metrics (Accuracy, ROC-AUC, F1)
    Trainer->>Reg: register_model(symbol, model, metrics, params)
    Reg->>FS: Save .joblib weights & .json metadata
    Reg->>DB: Insert ModelVersion (status='candidate')
    Reg->>Reg: Promote to 'production' (retires previous production version)
    Reg-->>CLI: "Model version v1 promoted to production"
```

- **Artifacts Created**:
  - `ml/models/artifacts/xgboost_classifier_<SYMBOL>_<VERSION>.joblib`
  - `ml/models/artifacts/xgboost_classifier_<SYMBOL>_<VERSION>.json`

---

## ⏰ Workflow 5: Scheduled Market Polling & Ingestion Cycle

### Description
Every 300 seconds (5 minutes), Celery Beat triggers an automated polling cycle across the universe, fetching the latest market bar and queuing real-time inference.

### Sequence
```mermaid
sequenceDiagram
    autonumber
    participant Beat as Celery Beat (stock_celery_beat)
    participant Broker as Redis (DB 0)
    participant Worker as Celery Worker (stock_celery_worker)
    participant Svc as MarketDataService
    participant DB as PostgreSQL (market_prices)

    Beat->>Broker: Enqueue scheduled_market_data_ingest
    Worker->>Broker: Consume scheduled_market_data_ingest
    loop For Each Symbol in Universe
        Worker->>Broker: Enqueue poll_market_data_task(symbol)
    end
    Worker->>Broker: Consume poll_market_data_task
    Worker->>Svc: run_ingestion_cycle(symbol)
    Svc->>DB: Upsert latest candle
    Worker->>Broker: Enqueue generate_live_prediction_task(symbol)
```

- **Frequency**: Configurable via `MARKET_DATA_INGEST_INTERVAL_SECONDS` (default: 300s).

---

## ⚡ Workflow 6: Live Prediction Inference & WebSocket Event Broadcasting

### Description
Computes real-time directional prediction for the latest price bar, records the inference in PostgreSQL, and pushes the event to connected browser clients over WebSockets.

### Sequence
```mermaid
sequenceDiagram
    autonumber
    participant Worker as Celery Worker
    participant PredSvc as PredictionService
    participant Reg as ModelRegistry
    participant DB as PostgreSQL (predictions)
    participant Redis1 as Redis (DB 1 - Channel Layer)
    participant Daphne as Daphne ASGI Server
    participant Browser as Web Browser (React App)

    Worker->>PredSvc: predict(symbol)
    PredSvc->>Reg: Load active production model & schema
    PredSvc->>PredSvc: Compute 12-feature snapshot from recent bars
    PredSvc->>PredSvc: Run model.predict() & model.predict_proba()
    PredSvc-->>Worker: Prediction result (UP/DOWN, probability, latency)
    Worker->>DB: Insert Prediction (outcome='PENDING')
    Worker->>Redis1: Broadcast to group "predictions_<symbol>"
    Redis1->>Daphne: Forward event
    Daphne->>Browser: Push WebSocket message
    Browser->>Browser: Update UI Hero Card & Probability Gauge
```

- **Latency**: Sub-10ms model inference; end-to-end WebSocket delivery $< 50\text{ ms}$.

---

## 🎯 Workflow 7: Prediction Outcome Realization & Drift Monitoring

### Description
Evaluates pending predictions against subsequent market price bars, computes realized returns and confusion matrix counts, and evaluates Population Stability Index (PSI) drift across all features.

### Sequence
```mermaid
sequenceDiagram
    autonumber
    participant Beat as Celery Beat
    participant Worker as Celery Worker
    participant ResSvc as PredictionResolutionService
    participant DriftSvc as DataDriftService
    participant DB as PostgreSQL

    Beat->>Worker: Trigger resolve_pending_predictions_task
    Worker->>ResSvc: resolve_pending_predictions()
    ResSvc->>DB: Query predictions where outcome='PENDING'
    loop Each Pending Prediction
        ResSvc->>DB: Fetch subsequent closing bar
        alt Subsequent bar exists
            ResSvc->>ResSvc: Calculate actual_return = (Close_next - Close_cur) / Close_cur
            ResSvc->>ResSvc: Determine outcome (CORRECT / INCORRECT)
            ResSvc->>DB: Update prediction record
        end
    end
    Worker->>DriftSvc: calculate_drift_for_symbol(symbol)
    DriftSvc->>DriftSvc: Calculate PSI across 12 features
    DriftSvc-->>Worker: Drift summary (Low / Moderate / High)
```

---

## 🛠 Operational Runbook & Command Quick-Reference

### Complete End-to-End Bootstrap from Clean State

```bash
# 1. Start all 7 Docker containers
docker compose up -d --build

# 2. Register stock universe in PostgreSQL
docker compose exec backend python manage.py register_universe

# 3. Ingest 1 year of historical market data
docker compose exec backend python manage.py ingest_market_data --period 1y --interval 1d

# 4. Train and promote XGBoost models to production registry
docker compose exec backend python manage.py train_models --symbols TCS.NS,RELIANCE.NS,INFY.NS,HDFCBANK.NS

# 5. Generate initial live predictions
docker compose exec backend python manage.py generate_predictions

# 6. Verify production readiness and health checks
docker compose exec backend python manage.py verify_production_readiness

# 7. Run full automated test suite
docker compose exec backend python manage.py test
```

