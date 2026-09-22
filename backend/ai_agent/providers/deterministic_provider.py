"""
Deterministic Rule & Template LLM Provider for offline, demo, and test environments.
Executes real backend tools against PostgreSQL and formats rich quantitative responses.
"""
import logging
import re
from typing import Any, Callable, Dict, List
from ai_agent.providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)


class DeterministicProvider(BaseLLMProvider):
    """
    Deterministic reasoning provider grounded strictly in real backend tool executions.
    """

    def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        tool_schemas: List[Dict[str, Any]],
        tool_executor: Callable[[str, Dict[str, Any]], Dict[str, Any]],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        user_msg = ""
        for m in reversed(messages):
            if m.get("sender") == "user":
                user_msg = m.get("text", "").strip()
                break

        lowered = user_msg.lower()
        active_symbol = context.get("active_symbol", "TCS.NS")
        company_name = context.get("company_name", active_symbol)

        # Extract symbol from message if user explicitly specified one
        found_symbol = None
        symbol_match = re.search(r"\b([A-Za-z0-9]+(?:\.NS)?)\b", user_msg)
        if symbol_match:
            cand = symbol_match.group(1).upper()
            if not cand.endswith(".NS") and cand in (
                "TCS", "INFY", "RELIANCE", "HDFCBANK", "ICICIBANK", "SBIN", "LT",
                "ITC", "BHARTIARTL", "AXISBANK", "KOTAKBANK", "HINDUNILVR", "MARUTI", "SUNPHARMA"
            ):
                cand += ".NS"
            if cand.endswith(".NS"):
                found_symbol = cand

        target_symbol = found_symbol or active_symbol

        tools_used: List[str] = []
        citations: List[str] = []
        suggested_questions: List[str] = []

        # 1. Financial Advice Guardrail Check
        if any(w in lowered for w in ["should i buy", "should i sell", "buy or sell", "invest in", "target price"]):
            quote = tool_executor("get_stock_quote", symbol=target_symbol)
            pred = tool_executor("get_prediction", symbol=target_symbol)
            tools_used.extend(["get_stock_quote", "get_prediction"])
            citations.extend(["Market Data", "Prediction Model"])

            close_str = f"₹{quote.get('close', 'N/A')}" if quote.get("status") == "ok" else "N/A"
            change_str = f"{quote.get('change_percent', 0.0):+.2f}%" if quote.get("status") == "ok" else "N/A"

            pred_text = ""
            if pred.get("status") == "ok":
                pred_text = (
                    f"- Machine Learning Prediction: **{pred.get('prediction')}** "
                    f"({pred.get('confidence_percent')}% model confidence)\n"
                    f"- Model: **{pred.get('model_type')} {pred.get('model_version')}**\n"
                )
            elif pred.get("status") == "model_not_found":
                pred_text = f"- Machine Learning Prediction: *No trained model available for {target_symbol}*.\n"

            response = (
                f"I can explain the available market data, technical indicators, model prediction, and historical "
                f"performance for **{company_name} ({target_symbol})**, but I **cannot provide buy or sell recommendations**.\n\n"
                f"**Current Market Snapshot:**\n"
                f"- Latest Close: **{close_str}** ({change_str})\n"
                f"{pred_text}\n"
                f"> ⚠️ **Compliance Note**: Directional machine learning forecasts represent probabilistic estimates "
                f"($t+1$) and do not constitute financial advice. All investments carry risk of loss."
            )
            suggested_questions = [
                f"What do the technical indicators say for {target_symbol}?",
                f"How accurate has the model been on {target_symbol}?",
                "How does the XGBoost model work?",
            ]
            return {
                "response": response,
                "tools_used": tools_used,
                "citations": citations,
                "suggested_questions": suggested_questions,
            }

        # 2. Prediction Explanation Intent
        if any(w in lowered for w in ["prediction", "predict", "forecast", "why up", "why down", "confidence", "direction"]):
            pred = tool_executor("get_prediction", symbol=target_symbol)
            tech = tool_executor("get_technical_indicators", symbol=target_symbol)
            tools_used.extend(["get_prediction", "get_technical_indicators"])
            citations.extend(["Prediction Model", "Technical Indicators"])

            if pred.get("status") == "model_not_found":
                response = (
                    f"**Prediction Status for {company_name} ({target_symbol})**\n\n"
                    f"There is currently **no trained machine learning model artifact** for `{target_symbol}` in the model registry.\n\n"
                    f"- The 4 equities with active production models (`v1`) are: **TCS.NS**, **INFY.NS**, **RELIANCE.NS**, and **HDFCBANK.NS**.\n"
                    f"- You can train and promote an XGBoost model for `{target_symbol}` anytime using the CLI command:\n"
                    f"  ```bash\n"
                    f"  python manage.py train_model --symbol {target_symbol} --promote\n"
                    f"  ```\n"
                    f"The platform strictly adheres to data integrity and never fabricates synthetic predictions."
                )
                suggested_questions = [
                    "Which stocks currently have trained models?",
                    f"What are the technical indicators for {target_symbol}?",
                    "How does the model training pipeline work?",
                ]
            elif pred.get("status") == "ok":
                direction = pred.get("prediction")
                confidence = pred.get("confidence_percent")
                up_p = pred.get("probabilities", {}).get("UP_percent", confidence if direction == "UP" else 100 - confidence)
                down_p = pred.get("probabilities", {}).get("DOWN_percent", 100 - up_p)

                tech_notes = ""
                if tech.get("status") == "ok":
                    rsi = tech.get("rsi", {})
                    ma = tech.get("moving_averages", {})
                    macd = tech.get("macd", {})
                    tech_notes = (
                        f"\n**Key Technical Drivers:**\n"
                        f"- **RSI (14)**: {rsi.get('value')} ({rsi.get('state')})\n"
                        f"- **Trend Alignment**: {ma.get('trend_alignment')}\n"
                        f"- **MACD**: {macd.get('crossover_state')} (Histogram: {macd.get('histogram'):+.2f})\n"
                    )

                response = (
                    f"**Next-Day Directional Forecast for {company_name} ({target_symbol})**\n\n"
                    f"- Predicted Direction: **{direction}**\n"
                    f"- Model Confidence: **{confidence}%**\n"
                    f"- Probability Distribution: **UP: {up_p}%** | **DOWN: {down_p}%**\n"
                    f"- Model Architecture: **{pred.get('model_type')} ({pred.get('model_version')})**\n"
                    f"- Data Timestamp: **{pred.get('timestamp')}**\n"
                    f"{tech_notes}\n"
                    f"This classification represents the probability of positive forward 1-day return ($y_{{t+1}} = 1$) "
                    f"conditioned on historical market patterns."
                )
                suggested_questions = [
                    f"What is the historical accuracy for {target_symbol}?",
                    f"Explain the RSI for {target_symbol}",
                    "What features are most important to the model?",
                ]
            else:
                response = f"Could not retrieve prediction data for **{target_symbol}**: {pred.get('message', 'Unknown error')}."
                suggested_questions = ["Explain the platform architecture", "Check system health"]

            return {
                "response": response,
                "tools_used": tools_used,
                "citations": citations,
                "suggested_questions": suggested_questions,
            }

        # 3. Technical Indicators Intent (RSI, MACD, Moving Averages, Volatility)
        if any(w in lowered for w in ["rsi", "macd", "sma", "ema", "moving average", "volatility", "technical", "indicator"]):
            tech = tool_executor("get_technical_indicators", symbol=target_symbol)
            tools_used.append("get_technical_indicators")
            citations.append("Technical Indicators")

            if tech.get("status") == "ok":
                rsi = tech.get("rsi", {})
                ma = tech.get("moving_averages", {})
                macd = tech.get("macd", {})
                vol = tech.get("volatility_20d_annualized_percent")
                ret1 = tech.get("returns", {}).get("return_1d_percent", 0.0)
                ret5 = tech.get("returns", {}).get("return_5d_percent", 0.0)

                response = (
                    f"**Technical Indicator Analysis for {company_name} ({target_symbol})**\n\n"
                    f"- **Closing Price**: ₹{tech.get('latest_close')}\n"
                    f"- **RSI (14)**: **{rsi.get('value')}** — *{rsi.get('state')}*\n"
                    f"- **Moving Averages**:\n"
                    f"  - SMA-10: ₹{ma.get('sma_10')} | SMA-20: ₹{ma.get('sma_20')} | SMA-50: ₹{ma.get('sma_50')}\n"
                    f"  - EMA-12: ₹{ma.get('ema_12')} | EMA-26: ₹{ma.get('ema_26')}\n"
                    f"  - Alignment: **{ma.get('trend_alignment')}**\n"
                    f"- **MACD Oscillator**:\n"
                    f"  - MACD Line: {macd.get('macd_line')} | Signal Line: {macd.get('signal_line')}\n"
                    f"  - Histogram: **{macd.get('histogram'):+.2f}** ({macd.get('crossover_state')})\n"
                    f"- **20-Day Annualized Volatility**: **{vol}%**\n"
                    f"- **Returns**: 1-Day: **{ret1:+.2f}%** | 5-Day: **{ret5:+.2f}%**\n\n"
                    f"*Note: These 12 indicators constitute the exact input feature vector utilized by the XGBoost classifier.*"
                )
                suggested_questions = [
                    f"What is the model prediction for {target_symbol}?",
                    "What does RSI overbought/oversold mean?",
                    f"Show recent price history for {target_symbol}",
                ]
            else:
                response = f"Technical indicators could not be computed for **{target_symbol}**: {tech.get('message', 'No data')}."
                suggested_questions = [f"What is the latest quote for {target_symbol}?", "Check system health"]

            return {
                "response": response,
                "tools_used": tools_used,
                "citations": citations,
                "suggested_questions": suggested_questions,
            }

        # 4. Model Performance & Evaluation Intent
        if any(w in lowered for w in ["accuracy", "performance", "metric", "f1", "precision", "recall", "roc-auc", "evaluation", "validation"]):
            meta = tool_executor("get_model_metadata", symbol=target_symbol)
            perf = tool_executor("get_model_performance", symbol=target_symbol)
            tools_used.extend(["get_model_metadata", "get_model_performance"])
            citations.append("Model Governance")

            if meta.get("status") == "ok":
                m = meta.get("metrics", {})
                rolling = perf.get("rolling_accuracy_percent") if perf.get("status") == "ok" else m.get("accuracy")

                response = (
                    f"**Model Governance & Performance for {company_name} ({target_symbol})**\n\n"
                    f"- Model Architecture: **{meta.get('model_type')} ({meta.get('model_version')})**\n"
                    f"- Total Features: **{meta.get('feature_count')} engineered technical indicators**\n\n"
                    f"**Out-of-Sample Evaluation Metrics:**\n"
                    f"- **Accuracy**: **{m.get('accuracy')}%**\n"
                    f"- **Precision**: **{m.get('precision')}%**\n"
                    f"- **Recall**: **{m.get('recall')}%**\n"
                    f"- **F1 Score**: **{m.get('f1_score')}**\n"
                    f"- **ROC-AUC**: **{m.get('roc_auc')}**\n"
                    f"- **Rolling Production Accuracy**: **{rolling}%**\n\n"
                    f"Models are evaluated on strictly sequential out-of-sample splits to guarantee **zero lookahead bias**."
                )
                suggested_questions = [
                    f"What features are most important for {target_symbol}?",
                    f"What is the current prediction for {target_symbol}?",
                    "Where can I see data drift?",
                ]
            else:
                response = (
                    f"No evaluation metrics are available for **{target_symbol}** because no model is currently trained for this stock. "
                    f"You can train an XGBoost model using `python manage.py train_model --symbol {target_symbol} --promote`."
                )
                suggested_questions = [
                    "Which stocks currently have trained models?",
                    "Explain the platform architecture",
                ]

            return {
                "response": response,
                "tools_used": tools_used,
                "citations": citations,
                "suggested_questions": suggested_questions,
            }

        # 5. Feature Importance Intent
        if any(w in lowered for w in ["feature importance", "important feature", "features influencing", "drivers"]):
            feat = tool_executor("get_feature_importance", symbol=target_symbol)
            tools_used.append("get_feature_importance")
            citations.append("Model Governance")

            if feat.get("status") == "ok":
                top = feat.get("top_features", [])[:5]
                top_str = "\n".join([f"- **{f['feature']}**: {f['importance']:.4f}" for f in top])
                response = (
                    f"**Top Feature Importance for {company_name} ({target_symbol}) Model**\n\n"
                    f"{top_str}\n\n"
                    f"Feature importance reflects the relative gain contributed by each feature across "
                    f"all decision trees in the XGBoost ensemble."
                )
                suggested_questions = [
                    f"Explain the technical indicators for {target_symbol}",
                    f"What is the current prediction for {target_symbol}?",
                ]
            else:
                response = feat.get("message", f"Feature importance is not available for {target_symbol}.")
                suggested_questions = ["Explain the platform architecture", "Check system health"]

            return {
                "response": response,
                "tools_used": tools_used,
                "citations": citations,
                "suggested_questions": suggested_questions,
            }

        # 6. Prediction History Intent
        if any(w in lowered for w in ["history", "previous prediction", "past prediction", "track record", "audit", "resolved"]):
            hist = tool_executor("get_prediction_history", symbol=target_symbol, limit=5)
            tools_used.append("get_prediction_history")
            citations.append("Prediction History")

            if hist.get("status") == "ok":
                items = hist.get("recent_predictions", [])
                rows = []
                for it in items:
                    rows.append(
                        f"| {it['timestamp']} | {it['predicted_direction']} ({it['confidence_percent']}%) | "
                        f"{it['actual_direction']} | **{it['outcome']}** |"
                    )
                table_str = "\n".join(rows)

                acc_str = f"**{hist.get('recent_accuracy_percent')}%**" if hist.get("recent_accuracy_percent") is not None else "Pending realization"

                response = (
                    f"**Recent Prediction Audit Log for {company_name} ({target_symbol})**\n\n"
                    f"Recent Sample Realization Accuracy: {acc_str}\n\n"
                    f"| Date | Predicted | Realized | Outcome |\n"
                    f"|---|---|---|---|\n"
                    f"{table_str}\n\n"
                    f"Historical predictions are audited and resolved at EOD against subsequent closing prices."
                )
                suggested_questions = [
                    f"What is the current prediction for {target_symbol}?",
                    "Where can I see the full prediction history in the UI?",
                ]
            else:
                response = hist.get("message", f"No prediction history found for {target_symbol}.")
                suggested_questions = ["Open Prediction History from the sidebar", "Check system health"]

            return {
                "response": response,
                "tools_used": tools_used,
                "citations": citations,
                "suggested_questions": suggested_questions,
            }

        # 7. Supported Stocks / Universe Intent
        if any(w in lowered for w in ["supported stock", "universe", "which stock", "what stock", "list of stock", "companies"]):
            univ = tool_executor("get_supported_stocks")
            tools_used.append("get_supported_stocks")
            citations.append("System Telemetry")

            stocks = univ.get("stocks", [])
            trained = [s["symbol"] for s in stocks if s["has_trained_model"]]
            untrained = [s["symbol"] for s in stocks if not s["has_trained_model"]]

            response = (
                f"**Platform Stock Universe ({univ.get('total_stocks', 14)} NSE Equities)**\n\n"
                f"The platform tracks 14 liquid equities across 7 major sectors:\n\n"
                f"- **Pre-Trained Production Models (v1)** ({len(trained)}):\n"
                f"  `{', '.join(trained)}`\n\n"
                f"- **Market Data Ready (Trainable)** ({len(untrained)}):\n"
                f"  `{', '.join(untrained)}`\n\n"
                f"You can switch between any of these stocks using the search bar or top selector pills."
            )
            suggested_questions = [
                "How do I train a model for untrained stocks?",
                "Explain the platform architecture",
            ]
            return {
                "response": response,
                "tools_used": tools_used,
                "citations": citations,
                "suggested_questions": suggested_questions,
            }

        # 8. Platform Architecture & Education Intent
        if any(w in lowered for w in ["architecture", "how does this work", "how it works", "django", "react", "xgboost", "pipeline", "celery", "redis", "daphne"]):
            arch = tool_executor("get_project_architecture")
            tools_used.append("get_project_architecture")
            citations.append("System Architecture")

            comp = arch.get("components", {})
            response = (
                f"**{arch.get('platform_name')} — System Architecture**\n\n"
                f"- **Frontend**: {comp.get('frontend')}\n"
                f"- **API & WebSockets**: {comp.get('api_server')}\n"
                f"- **Real-Time Streaming**: {comp.get('realtime_streaming')}\n"
                f"- **Database**: {comp.get('database')}\n"
                f"- **Background Queue & Scheduler**: {comp.get('task_queue')} & {comp.get('scheduler')}\n"
                f"- **Machine Learning Engine**: {comp.get('ml_engine')}\n"
                f"- **MLOps & Monitoring**: {comp.get('mlops_monitoring')}\n"
                f"- **Edge Proxy**: {comp.get('gateway')}\n\n"
                f"The entire stack runs containerized via Docker Compose with health probes on port 8080."
            )
            suggested_questions = [
                "What technical indicators are calculated?",
                "Which stocks are supported?",
                "Check system health",
            ]
            return {
                "response": response,
                "tools_used": tools_used,
                "citations": citations,
                "suggested_questions": suggested_questions,
            }

        # 9. System Health Intent
        if any(w in lowered for w in ["health", "system status", "subsystems", "online", "status"]):
            health = tool_executor("get_system_health")
            tools_used.append("get_system_health")
            citations.append("System Telemetry")

            c = health.get("components", {})
            response = (
                f"**Platform System Health Status: {health.get('status', 'OK').upper()}**\n\n"
                f"- **Django REST API**: {c.get('api', 'online').upper()}\n"
                f"- **PostgreSQL Database**: {c.get('database', 'online').upper()}\n"
                f"- **Redis Broker (DB 0/1)**: {c.get('redis', 'online').upper()}\n"
                f"- **Celery Task Worker**: {c.get('celery', 'online').upper()}\n"
                f"- **Model Registry Artifacts**: {c.get('model_registry', 'online').upper()}\n"
            )
            suggested_questions = [
                "Where can I see the system health page in the UI?",
                "Explain the platform architecture",
            ]
            return {
                "response": response,
                "tools_used": tools_used,
                "citations": citations,
                "suggested_questions": suggested_questions,
            }

        # 10. Navigation Assistance Intent
        if any(w in lowered for w in ["where is", "where can i find", "how to see", "navigate", "open"]):
            nav_guide = (
                "**Application Navigation Guide:**\n\n"
                "- **Dashboard**: Overview of AI prediction, confidence gauge, and key market KPIs.\n"
                "- **Market Overview**: 14-stock matrix with sector and model status badges.\n"
                "- **Stock Analysis**: Multi-timeframe charts (`1D` to `1Y`), indicators, and CSV export.\n"
                "- **Predictions**: In-depth prediction inference, 12-feature inputs, and model parameters.\n"
                "- **Technical Analysis**: Dedicated RSI, MACD, and moving average charts.\n"
                "- **Model Governance**: MLOps dashboard, rolling accuracy, confusion matrix, and PSI drift.\n"
                "- **Prediction History**: Auditable historical prediction records with outcome resolutions.\n"
                "- **Data Quality**: Automated validation rules matrix (continuity, monotonicity, outlier bounds).\n"
                "- **System Health**: Operational status of Daphne, PostgreSQL, Redis, and Celery."
            )
            return {
                "response": nav_guide,
                "tools_used": [],
                "citations": ["Navigation"],
                "suggested_questions": [
                    f"Explain the prediction for {target_symbol}",
                    "What are the supported stocks?",
                ],
            }

        # 11. Default Fallback: General Stock Overview
        quote = tool_executor("get_stock_quote", symbol=target_symbol)
        pred = tool_executor("get_prediction", symbol=target_symbol)
        tools_used.extend(["get_stock_quote", "get_prediction"])
        citations.extend(["Market Data", "Prediction Model"])

        close_str = f"₹{quote.get('close', 'N/A')}" if quote.get("status") == "ok" else "Data unavailable"
        change_str = f"{quote.get('change_percent', 0.0):+.2f}%" if quote.get("status") == "ok" else "0.00%"

        pred_summary = ""
        if pred.get("status") == "ok":
            pred_summary = f"- Machine Learning Prediction: **{pred.get('prediction')}** ({pred.get('confidence_percent')}% confidence)\n"
        elif pred.get("status") == "model_not_found":
            pred_summary = f"- Machine Learning Prediction: *Model not yet trained for {target_symbol}*.\n"

        response = (
            f"**Overview for {company_name} ({target_symbol})**\n\n"
            f"- Current Price: **{close_str}** ({change_str})\n"
            f"- Exchange: **{context.get('exchange', 'NSE')}** | Sector: **{context.get('sector', 'General')}**\n"
            f"{pred_summary}\n"
            f"How can I assist you with **{target_symbol}**? You can ask about its technical indicators, "
            f"model performance, prediction history, or overall platform architecture."
        )
        suggested_questions = [
            f"Explain the technical indicators for {target_symbol}",
            f"Why is {target_symbol} predicted {pred.get('prediction', 'UP')}?",
            f"What is the historical accuracy for {target_symbol}?",
            "How does this platform work?",
        ]

        return {
            "response": response,
            "tools_used": tools_used,
            "citations": citations,
            "suggested_questions": suggested_questions,
        }

