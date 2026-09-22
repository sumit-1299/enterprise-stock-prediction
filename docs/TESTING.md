# Enterprise Stock Intelligence Platform — Testing Architecture & Quality Assurance

This document provides a comprehensive guide to the automated test suite, unit testing standards, API contract verification, mocking strategies, and regression test execution for the **Enterprise Stock Intelligence Platform (MarketIQ)**.

---

## 📑 Table of Contents

- [Testing Philosophy & Standards](#testing-philosophy--standards)
- [Test Suite Summary & Pass Rate](#test-suite-summary--pass-rate)
- [Test Architecture & Organization](#test-architecture--organization)
- [Component Test Specifications](#component-test-specifications)
  - [1. Market Data Ingestion & Provider Layer](#1-market-data-ingestion--provider-layer)
  - [2. Feature Engineering & Technical Indicators](#2-feature-engineering--technical-indicators)
  - [3. Machine Learning Inference & Exceptions](#3-machine-learning-inference--exceptions)
  - [4. REST API Endpoints & Error Masking](#4-rest-api-endpoints--error-masking)
  - [5. Task Asynchrony & Database Idempotency](#5-task-asynchrony--database-idempotency)
- [Mocking Strategy & Fixtures](#mocking-strategy--fixtures)
- [Test Execution Guide](#test-execution-guide)
- [Continuous Integration (CI) Standards](#continuous-integration-ci-standards)

---

## 🎯 Testing Philosophy & Standards

In quantitative financial systems and machine learning pipelines, untested code or brittle tests can lead to silent data corruption, lookahead bias, or runtime crashes during live trading windows. The testing framework enforces:

1. **Zero External Network Dependencies**:
   - Unit and API tests must never call external providers (`yfinance`, external exchanges) during test execution.
   - All network I/O is mocked using deterministic test providers (`MockTestProvider`) or `unittest.mock.patch`.

2. **Strict Financial Data Invariants**:
   - Every price bar must satisfy mathematical bounds:
     $$H \ge \max(O, C), \quad L \le \min(O, C), \quad O > 0, \quad C > 0, \quad V \ge 0$$
   - Negative prices, inverted spreads, or invalid timestamps fail immediately at the model validation layer.

3. **Information Security & Stack Trace Protection**:
   - Error responses under test must return structured JSON error envelopes (`{"error": {"code": "...", "message": "..."}}`).
   - Tests assert that database passwords, server paths, and Python tracebacks are never exposed to API callers under any exception scenario.

4. **100% Deterministic Idempotency**:
   - Re-running ingestion or prediction tasks on identical timestamps must update existing database records without raising constraint violations or generating duplicates.

---

## 📊 Test Suite Summary & Pass Rate

The platform includes **82 automated tests** covering core application layers:

| Test Module | Domain / Area | Tests | Pass Rate | Execution Time |
| :--- | :--- | :---: | :---: | :---: |
| `market_data.tests` | Provider Factory, OHLCV Validation, Ingestion Service | 28 | 100% | ~1.4s |
| `predictions.tests` | API Endpoints, Status Codes, Error Masking, Model Info | 26 | 100% | ~1.6s |
| `ml.tests` / Features | 12 Technical Indicators, Lookahead Bias, Split Integrity | 18 | 100% | ~1.1s |
| Celery & Asynchrony | Task Queuing, Idempotency, Outcome Realization | 10 | 100% | ~0.7s |
| **Total Test Suite** | **Full System Integration & Unit Suite** | **82** | **100%** | **~4.8s** |

---

## 🏛 Test Architecture & Organization

```
backend/
├── market_data/
│   ├── tests.py                   # Market data unit tests & provider validations
│   └── tests/                     # Extended service & session test cases
├── predictions/
│   ├── tests.py                   # API client tests, status codes, error masking
│   └── tests/                     # Model registry & resolution service tests
├── stocks/
│   └── tests.py                   # Universe model & constraint tests
ml/
└── tests/                         # Feature formulas, XGBoost inference tests
```

---

## 🧪 Component Test Specifications

### 1. Market Data Ingestion & Provider Layer

Located in `backend/market_data/tests.py`:

- **`test_provider_interface`**: Asserts that `YFinanceProvider` correctly implements `fetch_historical_data` and `fetch_latest_quote`.
- **`test_provider_factory`**: Confirms that valid provider identifiers instantiate correctly and unknown providers raise `ValueError`.
- **`test_valid_ohlc_bar`**: Validates that physically consistent candlestick bars pass model validation.
- **`test_invalid_ohlc_bars`**: Asserts failure when:
  - High is strictly less than Low ($H < L$).
  - High is less than Open ($H < O$).
  - Low is greater than Close ($L > C$).
  - Any price is negative ($P < 0$).
- **`test_duplicate_bar_handling`**: Asserts that duplicate price bars update existing records via composite key `(stock, timestamp, timeframe, source)` without producing duplicates.

---

### 2. Feature Engineering & Technical Indicators

Validates mathematical formulas and absence of data leakage:

- **12 Features Exactness**: Asserts that computed values for `return_1d`, `return_5d`, `sma_10`, `sma_20`, `sma_50`, `ema_12`, `ema_26`, `macd`, `macd_signal`, `rsi_14`, `volatility_20`, and `volume_change` match reference mathematical formulas.
- **Lookahead Bias Prevention**: Asserts that features computed at time $t$ strictly depend on information available at $t' \le t$.
- **NaN / Infinite Handling**: Verifies that division by zero (e.g. zero price variance) produces deterministic zero-clamped values rather than `NaN` or `Inf`.

---

### 3. Machine Learning Inference & Exceptions

Validates model loading, caching, and custom exception handling:

- **`ModelNotFoundError`**: Asserts clean handling when a requested `.joblib` file does not exist on disk.
- **`SymbolNotFoundError`**: Asserts structured error when inference is requested on an untracked ticker.
- **`InsufficientDataError`**: Asserts that symbols with fewer than 50 historical bars return HTTP 422 instead of crashing.
- **Feature Schema Validation**: Verifies that missing or reordered feature columns trigger `MissingFeaturesError`.

---

### 4. REST API Endpoints & Error Masking

Located in `backend/predictions/tests.py`:

- **`test_health_endpoint`**: `GET /api/health/` returns `200 OK` and `{"status": "ok"}`.
- **`test_valid_tcs_ns_prediction`**: `GET /api/predictions/TCS.NS/` returns structured prediction dictionary with keys: `symbol`, `prediction`, `direction`, `probability`, `probabilities`, `model_type`, `model_version`, `timestamp`, `features_used`.
- **`test_nonexistent_symbol_returns_404`**: Returns HTTP 404 with `{"error": {"code": "SYMBOL_NOT_FOUND"}}`.
- **`test_insufficient_data_returns_422`**: Returns HTTP 422 with `{"error": {"code": "INSUFFICIENT_DATA"}}`.
- **`test_model_info_endpoint`**: Asserts that `GET /api/predictions/TCS.NS/model/` exposes validation metrics and hyperparameters while strictly masking sensitive internal filesystem paths (`model_path`, `metadata_path`).
- **`test_errors_do_not_leak_traceback`**: Forces a runtime exception containing simulated database credentials; asserts that the response code is 500 and the credentials/tracebacks are **never** present in the JSON payload.

---

### 5. Task Asynchrony & Database Idempotency

- **Task Queuing**: Confirms that Celery tasks (`poll_market_data_task`, `generate_live_prediction_task`) enqueue properly and return valid task IDs.
- **Exponential Backoff**: Asserts that transient network exceptions (`ConnectionError`, `TimeoutError`) invoke `retry(countdown=...)` with exponential backoff ($60\text{s}, 120\text{s}, 240\text{s}$).
- **Prediction Resolution**: Asserts that `resolve_pending_predictions_task` correctly transitions `outcome='PENDING'` records to `CORRECT` or `INCORRECT` once the subsequent candle closes.

---

## 🧩 Mocking Strategy & Fixtures

### `MockTestProvider`
An in-memory mock provider implementing `MarketDataProvider` to test ingestion workflows without making live HTTP requests:

```python
class MockTestProvider(MarketDataProvider):
    """Mock provider for unit testing without external network dependencies."""
    def __init__(self, bars: Optional[List[MarketBar]] = None, fail: bool = False):
        self._bars = bars or []
        self._fail = fail

    def fetch_historical_data(self, symbol: str, period: str = "1y", interval: str = "1d") -> List[MarketBar]:
        if self._fail:
            raise ConnectionError("Mock provider network failure")
        return self._bars

    def fetch_latest_quote(self, symbol: str) -> Optional[MarketBar]:
        if self._fail:
            raise ConnectionError("Mock provider network failure")
        return self._bars[-1] if self._bars else None
```

### `unittest.mock.patch`
Used across API and integration tests to decouple the web tier from disk I/O and ML model loading:

```python
@patch("ml.inference.prediction_service.PredictionService.predict")
def test_prediction_api_success(self, mock_predict):
    mock_predict.return_value = {
        "symbol": "TCS.NS",
        "prediction": "UP",
        "probability": 0.74,
    }
    response = self.client.get("/api/predictions/TCS.NS/")
    self.assertEqual(response.status_code, 200)
```

---

## 🚀 Test Execution Guide

### Run Full Test Suite Inside Docker

```bash
# Execute all tests across all applications
docker compose exec backend python manage.py test

# Verbose output showing each individual test name and result
docker compose exec backend python manage.py test --verbosity=2
```

### Run Specific Test Modules

```bash
# Run only market data tests
docker compose exec backend python manage.py test market_data

# Run only prediction API and inference tests
docker compose exec backend python manage.py test predictions

# Run a specific test class
docker compose exec backend python manage.py test predictions.tests.TestPredictionAPI

# Run a single targeted test method
docker compose exec backend python manage.py test predictions.tests.TestPredictionAPI.test_valid_tcs_ns_prediction
```

### Measuring Code Coverage

```bash
# Run tests with coverage measurement
docker compose exec backend coverage run manage.py test

# View command-line coverage summary
docker compose exec backend coverage report

# Generate detailed HTML coverage report
docker compose exec backend coverage html
```

---

## 🛡 Continuous Integration (CI) Standards

When integrating with GitHub Actions or CI/CD runners, the following checks must pass before merging code:

1. **Linting & Code Formatting**: `black --check .`, `flake8`
2. **Type Checking**: `mypy backend ml`
3. **Automated Unit Tests**: `python manage.py test --noinput` (100% pass required)
4. **Zero Security Warnings**: `bandit -r backend/ ml/`

