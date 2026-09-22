# Enterprise Stock Intelligence Platform — Defense & Viva Examination Guide

This document is a comprehensive technical preparation guide for project defense, viva voce, and architectural reviews. It contains **27 in-depth questions and answers** spanning quantitative finance, machine learning, distributed systems, MLOps, and reliability engineering.

---

## 📑 Table of Contents

- [Category 1: Quantitative Finance & Financial Engineering](#category-1-quantitative-finance--financial-engineering)
  - [Q1: What is lookahead bias and how does this system prevent it?](#q1-what-is-lookahead-bias-and-how-does-this-system-prevent-it)
  - [Q2: Why predict price direction (UP/DOWN) instead of continuous price levels (regression)?](#q2-why-predict-price-direction-updown-instead-of-continuous-price-levels-regression)
  - [Q3: What is the difference between SMA and EMA, and why are both used?](#q3-what-is-the-difference-between-sma-and-ema-and-why-are-both-used)
  - [Q4: How is RSI calculated, and why does an all-gain price sequence break standard division?](#q4-how-is-rsi-calculated-and-why-does-an-all-gain-price-sequence-break-standard-division)
  - [Q5: What does MACD measure, and what does a MACD signal crossover signify?](#q5-what-does-macd-measure-and-what-does-a-macd-signal-crossover-signify)
  - [Q6: What is 20-day rolling volatility and why is it essential for risk management?](#q6-what-is-20-day-rolling-volatility-and-why-is-it-essential-for-risk-management)
- [Category 2: Machine Learning & Feature Engineering](#category-2-machine-learning--feature-engineering)
  - [Q7: Why choose XGBoost over Deep Learning (LSTM/GRU) or Random Forest?](#q7-why-choose-xgboost-over-deep-learning-lstmgru-or-random-forest)
  - [Q8: How does XGBoost handle multicollinearity among technical indicators?](#q8-how-does-xgboost-handle-multicollinearity-among-technical-indicators)
  - [Q9: What hyperparameters were tuned and how do they prevent overfitting?](#q9-what-hyperparameters-were-tuned-and-how-do-they-prevent-overfitting)
  - [Q10: Why is standard k-fold cross-validation invalid for financial time series?](#q10-why-is-standard-k-fold-cross-validation-invalid-for-financial-time-series)
  - [Q11: What is Balanced Accuracy, and why is standard accuracy misleading in financial ML?](#q11-what-is-balanced-accuracy-and-why-is-standard-accuracy-misleading-in-financial-ml)
  - [Q12: How are feature importances computed in the model?](#q12-how-are-feature-importances-computed-in-the-model)
- [Category 3: Production Architecture & Systems Engineering](#category-3-production-architecture--systems-engineering)
  - [Q13: Walk me through the end-to-end lifecycle of a live prediction request.](#q13-walk-me-through-the-end-to-end-lifecycle-of-a-live-prediction-request)
  - [Q14: Why use Celery with Redis for market data ingestion instead of cron or background threads?](#q14-why-use-celery-with-redis-for-market-data-ingestion-instead-of-cron-or-background-threads)
  - [Q15: How is Celery task idempotency implemented, and what happens if a task runs twice?](#q15-how-is-celery-task-idempotency-implemented-and-what-happens-if-a-task-runs-twice)
  - [Q16: How do Django Channels and Redis deliver sub-second WebSocket updates?](#q16-how-do-django-channels-and-redis-deliver-sub-second-websocket-updates)
  - [Q17: Why place Nginx in front of Gunicorn/Daphne and Vite?](#q17-why-place-nginx-in-front-of-gunicorndaphne-and-vite)
  - [Q18: What database schema constraints guarantee transactional integrity in PostgreSQL?](#q18-what-database-schema-constraints-guarantee-transactional-integrity-in-postgresql)
- [Category 4: Model Monitoring, Drift & Production MLOps](#category-4-model-monitoring-drift--production-mlops)
  - [Q19: What is Population Stability Index (PSI) and how is it mathematically calculated?](#q19-what-is-population-stability-index-psi-and-how-is-it-mathematically-calculated)
  - [Q20: What is the difference between Covariate Shift (Data Drift) and Concept Drift?](#q20-what-is-the-difference-between-covariate-shift-data-drift-and-concept-drift)
  - [Q21: How does the system automatically resolve prediction outcomes without human labeling?](#q21-how-does-the-system-automatically-resolve-prediction-outcomes-without-human-labeling)
  - [Q22: What operational actions are triggered when PSI indicates significant drift ($\ge 0.25$)?](#q22-what-operational-actions-are-triggered-when-psi-indicates-significant-drift-ge-025)
  - [Q23: How does zero-downtime model switching work in this architecture?](#q23-how-does-zero-downtime-model-switching-work-in-this-architecture)
- [Category 5: Reliability, Security & Testing](#category-5-reliability-security--testing)
  - [Q24: How does the API prevent credential and stack trace leakage in error responses?](#q24-how-does-the-api-prevent-credential-and-stack-trace-leakage-in-error-responses)
  - [Q25: How does the platform handle stocks with insufficient historical data?](#q25-how-does-the-platform-handle-stocks-with-insufficient-historical-data)
  - [Q26: What does the 82-test automated test suite verify?](#q26-what-does-the-82-test-automated-test-suite-verify)
  - [Q27: How does the platform degrade gracefully if Redis or PostgreSQL experiences an outage?](#q27-how-does-the-platform-degrade-gracefully-if-redis-or-postgresql-experiences-an-outage)

---

## 📈 Category 1: Quantitative Finance & Financial Engineering

### Q1: What is lookahead bias and how does this system prevent it?
**Answer**:
Lookahead bias occurs when an algorithm uses information during training or backtesting that would not have been available at the time of the prediction. In financial time series, this artificially inflates performance and leads to disastrous live trading failures.

In our platform, lookahead bias is strictly prevented through three mechanisms:
1. **Target Shifting**: The prediction target $Y_t$ is the return of the *next* trading period ($P_{t+1} > P_t$). During feature preparation, all 12 technical features at row $t$ are derived exclusively from data at or before index $t$.
2. **Chronological Time-Series Partitioning**: We never use random train/test splits. The training dataset consists strictly of the earliest 80% of chronological observations ($t_0 \to t_{\text{split}}$), while evaluation is performed on the remaining 20% ($t_{\text{split}+1} \to t_{\text{end}}$).
3. **Indicator Warmup Truncation**: Rolling indicators like SMA-50 require 50 preceding bars to compute. The earliest 50 rows are dropped before training so no forward interpolation or imputation is performed.

---

### Q2: Why predict price direction (UP/DOWN) instead of continuous price levels (regression)?
**Answer**:
Predicting exact continuous prices (e.g. $P_{t+1} = \$4,231.85$) via regression models (like linear regression or MSE-loss neural networks) is fundamentally flawed in financial time series for two reasons:
1. **Random Walk Hypothesis & Non-Stationarity**: Stock price levels are non-stationary $I(1)$ processes. Regression models trained on price levels frequently learn a trivial identity function ($\hat{P}_{t+1} \approx P_t$), which appears to have a low Mean Squared Error (MSE) but possesses zero actionable directional predictive power.
2. **Actionable Trading Utility**: Trading strategies execute buy/sell/hold decisions based on *direction and magnitude* (probabilities of upward vs. downward movement), not exact point values. Framing the problem as binary classification with well-calibrated class probabilities allows us to optimize log-loss and set risk-adjusted probability decision thresholds (e.g., only trading when $\hat{p} > 0.65$).

---

### Q3: What is the difference between SMA and EMA, and why are both used?
**Answer**:
- **Simple Moving Average (SMA)**: An unweighted arithmetic mean of closing prices over a window $N$:
  $$\text{SMA}_N = \frac{1}{N} \sum_{i=0}^{N-1} P_{t-i}$$
  SMA treats all days equally. Its primary drawback is the "drop-off effect," where a large price shock $N$ days ago abruptly drops out of the window, causing an artificial movement in the average.
- **Exponential Moving Average (EMA)**: Applies exponentially decreasing weights to older prices:
  $$\text{EMA}_N = \alpha P_t + (1 - \alpha) \text{EMA}_{t-1}, \quad \alpha = \frac{2}{N+1}$$
  EMA responds much more rapidly to recent price dynamics and never experiences sudden drop-off spikes.

**Why both are used**:
In quantitative modeling, comparing an EMA against an SMA (or comparing fast SMAs like SMA-10 to slow SMAs like SMA-50) quantifies the rate of change and trend acceleration, providing the gradient boosted trees with both short-term momentum and long-term trend baseline signals.

---

### Q4: How is RSI calculated, and why does an all-gain price sequence break standard division?
**Answer**:
RSI measures the velocity and magnitude of directional price movements:
$$\text{RSI}_{14} = 100 - \left( \frac{100}{1 + \text{RS}} \right), \quad \text{RS} = \frac{\text{Average Gain over 14 periods}}{\text{Average Loss over 14 periods}}$$

**The All-Gain Edge Case**:
If a stock's price rises consecutively for 14 or more bars, the price difference $\Delta P_t$ is strictly positive. Consequently:
$$\text{Average Loss} = 0$$
Dividing by zero causes $\text{RS} = \frac{\text{Average Gain}}{0} \to \infty$ or `NaN`. In standard Pandas code:
```python
avg_loss.replace(0, np.nan)
```
If not handled, $\text{RS}$ becomes `NaN`, and `100 - (100 / (1 + NaN))` yields `NaN`, causing feature validation failure. In production, this is handled by clamping or setting $\text{RSI} = 100$ when average loss is 0.

---

### Q5: What does MACD measure, and what does a MACD signal crossover signify?
**Answer**:
The **Moving Average Convergence Divergence (MACD)** is a trend-following momentum indicator:
1. **MACD Line**: $\text{EMA}_{12} - \text{EMA}_{26}$.
2. **Signal Line**: A 9-day EMA of the MACD line.
3. **MACD Histogram**: $\text{MACD Line} - \text{Signal Line}$.

**Significance**:
- When the MACD line crosses **above** the signal line, it signifies accelerating upward momentum (bullish crossover).
- When the MACD line crosses **below** the signal line, it signifies accelerating downward momentum (bearish crossover).
- The histogram measures the rate of divergence: an expanding histogram confirms a strengthening trend, while a contracting histogram warns of exhaustion.

---

### Q6: What is 20-day rolling volatility and why is it essential for risk management?
**Answer**:
Rolling volatility is the sample standard deviation of daily percentage returns over a 20-trading-day window (approximately one calendar month):
$$\sigma_{20} = \sqrt{\frac{1}{19} \sum_{i=0}^{19} \left( R_{1d, t-i} - \bar{R} \right)^2}$$

**Importance**:
1. **Regime Identification**: High volatility regimes indicate market distress, heightened uncertainty, or news shocks, where directional models tend to exhibit higher prediction error.
2. **Feature Conditioning**: Tree-based models use $\sigma_{20}$ to split decision paths between quiet trending regimes (where moving average crossovers work well) and choppy, mean-reverting regimes.

---

## 🌲 Category 2: Machine Learning & Feature Engineering

### Q7: Why choose XGBoost over Deep Learning (LSTM/GRU) or Random Forest?
**Answer**:
1. **Tabular Data Superiority**: Empirical research (e.g., Grinsztajn et al., NeurIPS 2022) consistently demonstrates that gradient-boosted decision trees (XGBoost, LightGBM) outperform deep architectures (LSTMs, Transformers) on tabular data with engineered features.
2. **Resistance to Noise & Overfitting**: Financial time series have very low signal-to-noise ratios. Deep neural networks with millions of parameters quickly overfit to market noise. XGBoost constrains complexity via shallow trees (`max_depth=3`), L1/L2 regularization, and conservative learning rates.
3. **Inference Latency & CPU Efficiency**: XGBoost inference runs in < 5ms on standard CPU hardware without requiring dedicated GPU infrastructure, making it ideal for containerized microservices.

---

### Q8: How does XGBoost handle multicollinearity among technical indicators?
**Answer**:
Technical indicators (e.g., `sma_10`, `sma_20`, `ema_12`) are naturally correlated. Unlike classical linear regression, where multicollinearity inflates coefficient variance and causes matrix inversion instability ($X^T X)^{-1}$, decision tree ensembles handle correlation robustly:
1. At each node split, the algorithm evaluates all candidate features and selects the one maximizing gain.
2. If two features provide redundant information, the tree selects one, and the other's split gain drops.
3. We configure `colsample_bytree=0.8` (feature bagging), forcing different trees in the ensemble to evaluate alternate feature subsets, preventing a single dominant feature from masking other useful predictive signals.

---

### Q9: What hyperparameters were tuned and how do they prevent overfitting?
**Answer**:
- `max_depth = 3`: Restricts tree depth to only 3 levels (maximum 8 leaves). Shallow trees enforce simple, generalized decision rules rather than memorizing historical quirks.
- `learning_rate = 0.05`: Shrinks the contribution of each tree, requiring 100 boosting iterations to converge smoothly.
- `subsample = 0.8`: Trains each tree on a random 80% sample of rows, introducing bagging-style variance reduction.
- `colsample_bytree = 0.8`: Randomly selects 80% of features per tree.
- `gamma = 0.1`: Minimum loss reduction required to split a leaf node further.

---

### Q10: Why is standard k-fold cross-validation invalid for financial time series?
**Answer**:
Standard $k$-fold cross-validation randomly shuffles observations into $k$ partitions. In time series:
- If partition $k_1$ contains day $t+1$ and partition $k_2$ contains day $t$, the model trains on the future ($t+1$) to predict the past ($t$).
- Financial data exhibits strong temporal autocorrelation and volatility clustering (ARCH/GARCH effects). Random shuffling leaks information across folds, resulting in overly optimistic validation scores that collapse in production.
- **Solution**: We use strict **chronological forward-chaining splits** where training indices always strictly precede validation indices.

---

### Q11: What is Balanced Accuracy, and why is standard accuracy misleading in financial ML?
**Answer**:
In equities, markets frequently experience extended bull runs where 60%+ of trading days are positive (`UP`).
- A naive baseline classifier that always predicts `UP` achieves 60% standard accuracy despite possessing zero intelligence and catastrophic failure on downward moves.
- **Balanced Accuracy** computes the unweighted average of recall across both classes:
  $$\text{Balanced Accuracy} = \frac{1}{2} \left( \frac{\text{TP}}{\text{TP} + \text{FN}} + \frac{\text{TN}}{\text{TN} + \text{FP}} \right) = \frac{\text{Sensitivity} + \text{Specificity}}{2}$$
  The naive all-UP classifier gets $\text{Specificity} = 0$, resulting in a balanced accuracy of only $0.50$ (random guessing), exposing its true predictive failure.

---

### Q12: How are feature importances computed in the model?
**Answer**:
In our XGBoost model, feature importance is calculated via **Gain**:
- **Gain**: The average improvement in the objective function (log-loss reduction) brought by all splits using that feature across all 100 boosted trees.
- Features like `volatility_20`, `return_1d`, and `rsi_14` typically exhibit the highest gain because they directly differentiate high-momentum breakouts from exhausted overbought conditions.

---

## 🏛️ Category 3: Production Architecture & Systems Engineering

### Q13: Walk me through the end-to-end lifecycle of a live prediction request.
**Answer**:
1. **Client Request**: React frontend sends `GET /api/predictions/TCS.NS/` to Nginx (port 8080).
2. **Reverse Proxy**: Nginx forwards the request to Gunicorn/Django REST Framework on `backend:8000`.
3. **Symbol Validation**: `PredictionView` normalizes symbol `tcs.ns` $\to$ `TCS.NS` and checks against `Stock` registry.
4. **Data Verification**: `PredictionService` verifies at least 50 historical `MarketPrice` records exist in PostgreSQL.
5. **Feature Generation**: `FeatureEngineeringService` loads the last 60 bars and computes the 12 technical features in Pandas.
6. **Model Inference**: `PredictionService` retrieves the cached `xgboost_classifier_TCS_NS_v1.joblib` model and executes `predict_proba(X_latest)`.
7. **Idempotent Persistence**: Result is written to PostgreSQL table `predictions_prediction` using `update_or_create`.
8. **Real-Time Broadcast**: Celery/Channels publishes `prediction_update` event to Redis Channel Layer.
9. **Client Response**: Serialized JSON payload is returned with HTTP 200 in < 50ms.

---

### Q14: Why use Celery with Redis for market data ingestion instead of cron or background threads?
**Answer**:
1. **Process Isolation**: Market data fetching involves network I/O with third-party APIs. Running this in Python threads inside the web worker risks starving the WSGI server of thread pool workers.
2. **Distributed Queueing**: If market API latency spikes, Celery queues tasks in Redis without dropping requests or blocking user HTTP traffic.
3. **Reliability & Retries**: Celery provides native exponential backoff retry mechanisms (`autoretry_for=(NetworkError,)`).
4. **Stateful Scheduling**: Celery Beat maintains persistent task schedules across container restarts, unlike transient in-process timers.

---

### Q15: How is Celery task idempotency implemented, and what happens if a task runs twice?
**Answer**:
Idempotency ensures that executing an operation multiple times produces the exact same result as executing it once:
1. In `MarketDataService`, market price bars are persisted using compound unique keys `(stock, timestamp, timeframe)`. If a bar with the same timestamp already exists, it is updated in-place rather than inserted.
2. In `LivePredictionService`, predictions are persisted using `update_or_create(stock=stock, market_data_timestamp=timestamp, model_version=version)`.
3. If Celery Beat triggers a duplicate task or a worker restarts mid-execution, the second execution updates the existing database row. Zero duplicate rows are created.

---

### Q16: How do Django Channels and Redis deliver sub-second WebSocket updates?
**Answer**:
1. When a browser connects to `ws://localhost:8080/ws/predictions/TCS.NS/`, Daphne (ASGI) accepts the connection and adds the socket channel name to the Redis group `predictions_TCS_NS`.
2. When Celery completes an ingestion or inference task, it invokes `RealtimeEventService.publish_prediction_update('TCS.NS', payload)`.
3. This pushes a message into Redis Pub/Sub via `channels_redis`.
4. Daphne consumer instances subscribed to `predictions_TCS_NS` receive the Redis event and immediately serialize and frame the JSON packet across the active WebSocket connections to all connected clients within milliseconds.

---

### Q17: Why place Nginx in front of Gunicorn/Daphne and Vite?
**Answer**:
1. **Unified Entrypoint**: Provides a single port (8080) for HTTP, WebSockets, and static assets, eliminating Cross-Origin Resource Sharing (CORS) friction.
2. **WebSocket Upgrade Proxy**: Handles HTTP/1.1 `Upgrade: websocket` and `Connection: upgrade` headers required by Daphne.
3. **Static File Performance**: Nginx serves compiled React JavaScript, CSS, and favicon assets directly from disk with optimal caching headers and gzip/brotli compression without touching Python workers.
4. **Security & Buffering**: Nginx buffers slow client HTTP requests, shielding backend application workers from slowloris denial-of-service attacks.

---

### Q18: What database schema constraints guarantee transactional integrity in PostgreSQL?
**Answer**:
1. **Unique Constraints**:
   - `Stock`: `unique=True` on `symbol`.
   - `MarketPrice`: `unique_together = ('stock', 'timestamp', 'timeframe')`.
   - `Prediction`: `unique_together = ('stock', 'market_data_timestamp', 'model_version')`.
2. **Foreign Key Cascades & Indexes**:
   - `stock_id` is indexed with `on_delete=models.CASCADE`.
3. **Atomic Transactions**:
   - Ingestion and prediction services wrap writes in `transaction.atomic()`, ensuring partial failures (e.g. database disconnect during feature logging) roll back cleanly.

---

## 📊 Category 4: Model Monitoring, Drift & Production MLOps

### Q19: What is Population Stability Index (PSI) and how is it mathematically calculated?
**Answer**:
PSI measures the divergence between a baseline reference distribution (e.g., features during training) and a live target distribution (e.g., features observed in production over the last 30 days):
$$\text{PSI} = \sum_{k=1}^{B} \left( \text{Actual}_k - \text{Expected}_k \right) \times \ln\left( \frac{\text{Actual}_k}{\text{Expected}_k} \right)$$
1. Continuous feature values are split into $B = 10$ quantile bins based on the training data.
2. $\text{Expected}_k$ is the proportion of training observations in bin $k$ ($10\%$ per decile).
3. $\text{Actual}_k$ is the proportion of live production observations falling into that same bin range.
4. If the live distribution matches the baseline, $\frac{\text{Actual}_k}{\text{Expected}_k} \approx 1 \implies \ln(1) = 0 \implies \text{PSI} \approx 0$.

---

### Q20: What is the difference between Covariate Shift (Data Drift) and Concept Drift?
**Answer**:
- **Covariate Shift (Data Drift)**: The distribution of input features $P(X)$ changes over time, but the conditional probability distribution of the target given the features $P(Y \mid X)$ remains unchanged.
  *Example*: Market volatility doubles (`volatility_20` shifts), but the relationship between volatility spikes and price direction remains consistent. Tracked via **PSI**.
- **Concept Drift**: The statistical relationship between inputs and outputs $P(Y \mid X)$ changes, regardless of whether $P(X)$ changed.
  *Example*: Macroeconomic regime change where high RSI previously signaled a pullback, but now signals institutional momentum continuation. Tracked via **Rolling Accuracy & F1-Score degradation**.

---

### Q21: How does the system automatically resolve prediction outcomes without human labeling?
**Answer**:
Unlike NLP or computer vision models that require manual ground-truth annotation, financial time-series models have **naturally occurring ground truth**:
1. When a prediction is made at time $t$, it is marked `outcome = 'PENDING'`.
2. A periodic Celery Beat task (`resolve_pending_predictions_task`) queries predictions where `outcome = 'PENDING'`.
3. When the subsequent market bar at $t+1$ is ingested into `MarketPrice`, the task compares the closing price $P_{t+1}$ against base price $P_t$:
   - If $P_{t+1} > P_t$ and predicted direction was `UP` $\implies$ `CORRECT`.
   - If $P_{t+1} \le P_t$ and predicted direction was `UP` $\implies$ `INCORRECT`.
4. The prediction row is updated, and live accuracy/confusion matrix metrics are updated automatically.

---

### Q22: What operational actions are triggered when PSI indicates significant drift ($\ge 0.25$)?
**Answer**:
1. **Status Tagging**: `DriftMonitoringService` tags the metric as `SIGNIFICANT_DRIFT`.
2. **UI Alert**: The Model Monitoring dashboard highlights the affected features in red with a prominent warning banner.
3. **Retraining Recommendation**: Automated alerts recommend triggering the retraining pipeline on the most recent 1-year historical window.
4. **Fallback Option**: Operators can use `/api/predictions/<symbol>/versions/` to roll back to a previously validated model version or activate a conservative heuristic model.

---

### Q23: How does zero-downtime model switching work in this architecture?
**Answer**:
1. Multiple model versions (`v1`, `v2`) coexist in the model registry directory `ml/models/artifacts/`.
2. When an administrator or MLOps engineer submits `POST /api/predictions/TCS.NS/versions/ {"version": "v2"}`:
3. The backend updates the active version pointer in the database/cache.
4. `PredictionService.invalidate_model_cache("TCS.NS")` purges the old `v1` model from memory.
5. On the next prediction request, `PredictionService` lazily loads `v2` into memory.
6. The entire switch occurs in < 10ms without restarting Gunicorn, Celery, or Docker containers.

---

## 🔒 Category 5: Reliability, Security & Testing

### Q24: How does the API prevent credential and stack trace leakage in error responses?
**Answer**:
1. **Custom DRF Exception Handler**: All unhandled Python exceptions (e.g., `DatabaseError`, `KeyError`, `RuntimeError`) are intercepted by a global exception handler.
2. **Sanitized Error Envelope**: The API client only receives:
   ```json
   {"error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred while processing the prediction request."}}
   ```
3. **Internal Logging**: Full exception tracebacks, SQL statements, and environment details are logged exclusively to internal stderr/log files (`logger.error(..., exc_info=True)`), ensuring database passwords, API keys, and filesystem paths are never exposed over HTTP.

---

### Q25: How does the platform handle stocks with insufficient historical data?
**Answer**:
1. `LivePredictionService` enforces a strict precondition: `MarketPrice.objects.filter(stock=stock).count() >= 50`.
2. If an unregistered or un-ingested stock is queried (e.g. newly listed IPO with 10 days of data):
   - The service raises `InsufficientDataError`.
   - The view catches this and returns **HTTP 422 Unprocessable Entity**:
     ```json
     {"error": {"code": "INSUFFICIENT_DATA", "message": "Insufficient historical market data for 'NEW.NS' to compute technical indicators."}}
     ```
   - No prediction is generated or persisted, preserving database integrity.

---

### Q26: What does the 82-test automated test suite verify?
**Answer**:
The test suite consists of 82 automated test cases across four Django apps:
1. `predictions` (54 tests):
   - Model inference correctness, probability bounds ($0.0 \le p \le 1.0$), and schema formatting.
   - Idempotent prediction persistence (preventing duplicate rows).
   - Celery task execution with mock market data.
   - PSI calculation math, quantile edge cases, and drift categorization.
   - API error responses (400 for bad symbol, 404 for unknown symbol, 422 for insufficient data, 500 for missing artifact).
2. `market_data` (15 tests):
   - Market data ingestion cycles and provider abstraction.
   - Vectorized indicator math (SMA, EMA, MACD, RSI, Volatility).
   - WebSocket consumer connection acceptance and channel group management.
3. `stocks` & `users` (13 tests):
   - Stock entity CRUD, active flag filtering, and user authentication tokens.

---

### Q27: How does the platform degrade gracefully if Redis or PostgreSQL experiences an outage?
**Answer**:
1. **Redis Outage**:
   - The `GET /api/health/` endpoint detects Redis ping failure and reports `"redis": "offline"`, marking overall status as `"degraded"`.
   - WebSocket streaming fails gracefully; frontend clients fall back to HTTP polling.
   - In-memory fallback caches serve cached predictions where available.
2. **PostgreSQL Outage**:
   - `HealthView` reports `"database": "offline"`.
   - Celery tasks catch database connection errors and automatically retry with exponential backoff rather than discarding tasks.
   - REST API returns clean HTTP 500 responses without crashing the WSGI worker process.

