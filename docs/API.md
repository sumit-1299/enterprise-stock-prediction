# Enterprise Stock Intelligence Platform — API Reference

This document provides complete technical specifications for all REST API endpoints and real-time WebSocket channels provided by the **Enterprise Stock Intelligence Platform**.

---

## 📑 Table of Contents

- [Base URL & Protocol](#base-url--protocol)
- [Authentication & Rate Limiting](#authentication--rate-limiting)
- [Standard Error Envelope](#standard-error-envelope)
- [System & Health Endpoints](#system--health-endpoints)
  - [1. System Health Check (`GET /api/health/`)](#1-system-health-check-get-apihealth)
- [Stock Prediction & Model Endpoints](#stock-prediction--model-endpoints)
  - [2. Live Stock Prediction (`GET /api/predictions/<symbol>/`)](#2-live-stock-prediction-get-apipredictionssymbol)
  - [3. Model Metadata (`GET /api/predictions/<symbol>/model/`)](#3-model-metadata-get-apipredictionssymbolmodel)
  - [4. Prediction History (`GET /api/predictions/<symbol>/history/`)](#4-prediction-history-get-apipredictionssymbolhistory)
  - [5. Model Performance & Analytics (`GET /api/predictions/<symbol>/analytics/`)](#5-model-performance--analytics-get-apipredictionssymbolanalytics)
  - [6. Data Drift & PSI Monitoring (`GET /api/predictions/<symbol>/drift/`)](#6-data-drift--psi-monitoring-get-apipredictionssymboldrift)
  - [7. Model Version Management (`GET / POST /api/predictions/<symbol>/versions/`)](#7-model-version-management-get--post-apipredictionssymbolversions)
- [Market Data & Indicators Endpoints](#market-data--indicators-endpoints)
  - [8. Registered Stocks List (`GET /api/stocks/`)](#8-registered-stocks-list-get-apistocks)
  - [9. Historical Market Prices (`GET /api/market-data/<symbol>/prices/`)](#9-historical-market-prices-get-apimarket-datasymbolprices)
  - [10. Technical Indicators (`GET /api/market-data/<symbol>/indicators/`)](#10-technical-indicators-get-apimarket-datasymbolindicators)
- [Real-Time WebSocket Streams](#real-time-websocket-streams)
  - [11. Market Price Stream (`/ws/market/<symbol>/`)](#11-market-price-stream-wsmarketsymbol)
  - [12. Prediction Broadcast Stream (`/ws/predictions/<symbol>/`)](#12-prediction-broadcast-stream-wspredictionssymbol)

---

## 🌐 Base URL & Protocol

| Environment | Base URL | Protocol |
|---|---|---|
| **Docker (Gateway)** | `http://localhost:8080/api` | HTTP/1.1 |
| **Local Development** | `http://localhost:8000/api` | HTTP/1.1 |
| **WebSockets** | `ws://localhost:8080/ws` | WSS / WS |

All endpoints accept and return JSON encoded as `application/json; charset=utf-8`.

---

## 🔒 Authentication & Rate Limiting

- Current quantitative analytics endpoints are publicly accessible for internal dashboard consumption (`AllowAny` permission).
- Future multi-tenant versions support standard `Authorization: Bearer <JWT_TOKEN>` headers.

---

## ⚠️ Standard Error Envelope

All API errors return a uniform error object containing a machine-readable code and a human-readable explanation:

```json
{
  "error": {
    "code": "SYMBOL_NOT_FOUND",
    "message": "Stock symbol 'UNKNOWN.NS' was not found or has no market data."
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `INVALID_SYMBOL` | 400 | Symbol format violates alphanumeric and dot/hyphen pattern |
| `SYMBOL_NOT_FOUND` | 404 | Symbol is not registered in the platform database |
| `INSUFFICIENT_DATA` | 422 | Fewer than 50 historical price bars exist (cannot compute SMA-50) |
| `MODEL_NOT_FOUND` | 500 | Trained model artifact is missing from model registry |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled system exception (stack traces stripped for security) |

---

## 🩺 System & Health Endpoints

### 1. System Health Check (`GET /api/health/`)
Verifies operational connectivity of database, Redis, Celery broker, and model registry artifacts without invoking ML inference.

- **URL**: `/api/health/`
- **Method**: `GET`
- **Response (HTTP 200)**:
```json
{
  "status": "ok",
  "components": {
    "api": "online",
    "database": "online",
    "redis": "online",
    "celery": "online",
    "model_registry": "online"
  }
}
```

---

## 📈 Stock Prediction & Model Endpoints

### 2. Live Stock Prediction (`GET /api/predictions/<symbol>/`)
Generates an on-demand stock direction prediction using the latest market data and approved ML model artifact. Persists the result idempotently.

- **URL**: `/api/predictions/<symbol>/`
- **Method**: `GET`
- **URL Parameters**:
  - `symbol` *(string, required)*: e.g. `TCS.NS`, `RELIANCE.NS`, `INFY.NS`.
- **Response (HTTP 200)**:
```json
{
  "symbol": "TCS.NS",
  "prediction": "UP",
  "direction": 1,
  "probability": 0.7245,
  "probabilities": {
    "DOWN": 0.2755,
    "UP": 0.7245
  },
  "model_type": "xgboost_classifier",
  "model_version": "v1",
  "timestamp": "2026-09-22T15:30:00+00:00",
  "features_used": [
    "return_1d", "return_5d", "sma_10", "sma_20", "sma_50",
    "ema_12", "ema_26", "macd", "macd_signal", "rsi_14",
    "volatility_20", "volume_change"
  ]
}
```

---

### 3. Model Metadata (`GET /api/predictions/<symbol>/model/`)
Returns safe, sanitized metadata for the trained model artifact currently serving predictions.

- **URL**: `/api/predictions/<symbol>/model/`
- **Method**: `GET`
- **Response (HTTP 200)**:
```json
{
  "symbol": "TCS.NS",
  "model_type": "xgboost_classifier",
  "model_version": "v1",
  "features": ["return_1d", "return_5d", "sma_10", "sma_20", "sma_50", "ema_12", "ema_26", "macd", "macd_signal", "rsi_14", "volatility_20", "volume_change"],
  "metrics": {
    "accuracy": 0.54,
    "balanced_accuracy": 0.53,
    "precision": 0.55,
    "recall": 0.62,
    "f1": 0.58,
    "roc_auc": 0.56
  },
  "created_at": "2026-09-20T18:30:00+00:00"
}
```

---

### 4. Prediction History (`GET /api/predictions/<symbol>/history/`)
Returns a paginated list of historical predictions for a stock, including outcome resolution and historical market prices.

- **URL**: `/api/predictions/<symbol>/history/`
- **Method**: `GET`
- **Query Parameters**:
  - `page` *(int, optional, default: 1)*: Page number.
  - `page_size` / `limit` *(int, optional, default: 20)*: Number of items per page (max: 100).
  - `direction` *(string, optional)*: `UP`, `DOWN`, or `ALL`.
  - `outcome` *(string, optional)*: `CORRECT`, `INCORRECT`, `PENDING`, or `ALL`.
  - `period` *(string, optional)*: `7D`, `30D`, `90D`, `1Y`, or `ALL`.
  - `model_version` *(string, optional)*: Filter by model version (e.g. `v1`).
- **Response (HTTP 200)**:
```json
{
  "symbol": "TCS.NS",
  "count": 45,
  "page": 1,
  "page_size": 20,
  "limit": 20,
  "total_pages": 3,
  "history": [
    {
      "id": 142,
      "symbol": "TCS.NS",
      "prediction": "UP",
      "direction": 1,
      "probability": 0.7245,
      "outcome": "CORRECT",
      "market_price": 4210.50,
      "market_data_timestamp": "2026-09-21T15:30:00+00:00",
      "generated_at": "2026-09-21T15:35:12+00:00",
      "model_version": "v1"
    }
  ]
}
```

---

### 5. Model Performance & Analytics (`GET /api/predictions/<symbol>/analytics/`)
Computes live classification metrics, rolling accuracy trends, and confusion matrix over resolved historical predictions.

- **URL**: `/api/predictions/<symbol>/analytics/`
- **Method**: `GET`
- **Query Parameters**:
  - `period` *(string, optional, default: `30D`)*: Time window (`7D`, `30D`, `90D`, `1Y`).
- **Response (HTTP 200)**:
```json
{
  "symbol": "TCS.NS",
  "period": "30D",
  "total_predictions": 85,
  "resolved_predictions": 80,
  "pending_predictions": 5,
  "accuracy": 0.6125,
  "balanced_accuracy": 0.6080,
  "precision": 0.6304,
  "recall": 0.6591,
  "f1_score": 0.6444,
  "confusion_matrix": {
    "true_positive": 29,
    "false_positive": 17,
    "true_negative": 20,
    "false_negative": 14
  },
  "rolling_accuracy": [
    {"date": "2026-09-15", "accuracy": 0.58},
    {"date": "2026-09-20", "accuracy": 0.61}
  ]
}
```

---

### 6. Data Drift & PSI Monitoring (`GET /api/model-monitoring/<symbol>/drift/`)
Returns Population Stability Index (PSI) feature drift metrics, comparing baseline training distributions against live feature vectors.

- **URL**: `/api/model-monitoring/<symbol>/drift/`
- **Method**: `GET`
- **Response (HTTP 200)**:
```json
{
  "symbol": "TCS.NS",
  "status": "High",
  "average_psi": 4.2307,
  "reference_observations": 150,
  "current_observations": 50,
  "method": "Population Stability Index (PSI)",
  "thresholds": {
    "stable": "< 0.10",
    "moderate": "0.10 - 0.25",
    "high": "> 0.25"
  },
  "features": [
    {
      "feature": "return_1d",
      "reference_mean": -0.0012,
      "current_mean": -0.0004,
      "reference_std": 0.0153,
      "current_std": 0.019,
      "drift_score": 0.3396,
      "status": "High"
    }
  ]
}
```

### 6b. Model Monitoring Summary (`GET /api/model-monitoring/<symbol>/summary/`)
Returns a comprehensive monitoring summary combining active model metadata, prediction metrics, data drift status, data quality indicators, and overall health status.

- **URL**: `/api/model-monitoring/<symbol>/summary/`
- **Method**: `GET`
- **Response (HTTP 200)**:
```json
{
  "symbol": "TCS.NS",
  "active_model": {
    "type": "xgboost_classifier",
    "version": "v1",
    "status": "production"
  },
  "metrics": {
    "accuracy": 0.435,
    "f1": 0.533
  },
  "predictions": {
    "total": 2,
    "resolved": 1,
    "pending": 1
  },
  "data_drift": {
    "status": "High",
    "average_psi": 4.2307
  },
  "health_indicators": {
    "model_status": "Available",
    "data_status": "Healthy",
    "prediction_status": "Active"
  }
}
```

---

### 7. Model Version Management (`GET / POST /api/predictions/<symbol>/versions/`)

#### List Available Versions (`GET`)
- **URL**: `/api/predictions/<symbol>/versions/`
- **Method**: `GET`
- **Response (HTTP 200)**:
```json
{
  "symbol": "TCS.NS",
  "active_version": "v1",
  "versions": [
    {
      "version": "v1",
      "model_type": "xgboost_classifier",
      "is_active": true,
      "created_at": "2026-09-20T18:30:00+00:00",
      "metrics": {"accuracy": 0.54, "f1": 0.58}
    },
    {
      "version": "v2",
      "model_type": "xgboost_classifier",
      "is_active": false,
      "created_at": "2026-09-21T12:00:00+00:00",
      "metrics": {"accuracy": 0.57, "f1": 0.60}
    }
  ]
}
```

#### Switch Active Version (`POST`)
- **URL**: `/api/predictions/<symbol>/versions/`
- **Method**: `POST`
- **Request Body**:
```json
{
  "version": "v2"
}
```
- **Response (HTTP 200)**:
```json
{
  "symbol": "TCS.NS",
  "active_version": "v2",
  "message": "Active model version switched to v2 successfully."
}
```

---

## 📊 Market Data & Indicators Endpoints

### 8. Registered Stocks List (`GET /api/stocks/`)
Returns all stocks registered in the platform database with active tracking status.

- **URL**: `/api/stocks/`
- **Method**: `GET`
- **Response (HTTP 200)**:
```json
[
  {
    "symbol": "TCS.NS",
    "company_name": "Tata Consultancy Services Limited",
    "exchange": "NSE",
    "sector": "Information Technology",
    "is_active": true
  },
  {
    "symbol": "RELIANCE.NS",
    "company_name": "Reliance Industries Limited",
    "exchange": "NSE",
    "sector": "Energy & Conglomerate",
    "is_active": true
  }
]
```

---

### 9. Historical Market Prices (`GET /api/market-data/<symbol>/prices/`)
Returns chronological OHLCV market price bars for charting.

- **URL**: `/api/market-data/<symbol>/prices/`
- **Method**: `GET`
- **Query Parameters**:
  - `timeframe` *(string, optional, default: `1d`)*: `1d`, `1h`, `15m`.
  - `limit` *(int, optional, default: 100)*: Max records to return (max: 500).
- **Response (HTTP 200)**:
```json
{
  "symbol": "TCS.NS",
  "timeframe": "1d",
  "count": 100,
  "prices": [
    {
      "timestamp": "2026-09-21T15:30:00+00:00",
      "open": 4200.00,
      "high": 4250.00,
      "low": 4180.00,
      "close": 4235.50,
      "volume": 1240000
    }
  ]
}
```

---

### 10. Technical Indicators (`GET /api/market-data/<symbol>/indicators/`)
Returns computed technical indicators for charting overlay.

- **URL**: `/api/market-data/<symbol>/indicators/`
- **Method**: `GET`
- **Response (HTTP 200)**:
```json
{
  "symbol": "TCS.NS",
  "indicators": {
    "sma_10": 4210.25,
    "sma_20": 4185.60,
    "sma_50": 4120.40,
    "ema_12": 4220.10,
    "ema_26": 4190.50,
    "macd": 29.60,
    "macd_signal": 25.10,
    "rsi_14": 58.40,
    "volatility_20": 0.0145
  }
}
```

---

## ⚡ Real-Time WebSocket Streams

All WebSocket channels connect via:
`ws://<host>:8080/ws/...`

### 11. Market Price Stream (`/ws/market/<symbol>/`)
Broadcasts newly ingested market price bars as they arrive from market feeds.

- **Channel**: `/ws/market/<symbol>/` (e.g. `/ws/market/TCS.NS/`)
- **Server Frame Example**:
```json
{
  "type": "market_update",
  "symbol": "TCS.NS",
  "data": {
    "timestamp": "2026-09-22T15:30:00+00:00",
    "open": 4240.00,
    "high": 4265.00,
    "low": 4230.00,
    "close": 4260.00,
    "volume": 1450000
  }
}
```

---

### 12. Prediction Broadcast Stream (`/ws/predictions/<symbol>/`)
Broadcasts real-time model inference updates whenever a new prediction is generated.

- **Channel**: `/ws/predictions/<symbol>/` (e.g. `/ws/predictions/TCS.NS/`)
- **Server Frame Example**:
```json
{
  "type": "prediction_update",
  "symbol": "TCS.NS",
  "data": {
    "prediction": "UP",
    "direction": 1,
    "probability": 0.7410,
    "model_version": "v1",
    "timestamp": "2026-09-22T15:30:00+00:00"
  }
}
```
