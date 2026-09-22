import React from "react";
import { ModelInfoResponse } from "../types";

interface ModelInfoProps {
  modelInfo: ModelInfoResponse;
}

export const ModelInfo: React.FC<ModelInfoProps> = ({ modelInfo }) => {
  return (
    <div className="card" style={{ gridColumn: "1 / -1" }}>
      <div className="card-title">
        <span>Active Model Specification & Feature Engineering</span>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
          {modelInfo.model_type} ({modelInfo.model_version})
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {/* Model Metrics */}
        {modelInfo.metrics && Object.keys(modelInfo.metrics).length > 0 && (
          <div>
            <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 10 }}>
              Test Evaluation Benchmarks
            </h4>
            <div className="data-table">
              {modelInfo.metrics.accuracy !== undefined && (
                <div className="data-row">
                  <span className="data-label">Accuracy</span>
                  <span className="data-value">{(modelInfo.metrics.accuracy * 100).toFixed(1)}%</span>
                </div>
              )}
              {modelInfo.metrics.precision !== undefined && (
                <div className="data-row">
                  <span className="data-label">Precision</span>
                  <span className="data-value">{(modelInfo.metrics.precision * 100).toFixed(1)}%</span>
                </div>
              )}
              {modelInfo.metrics.recall !== undefined && (
                <div className="data-row">
                  <span className="data-label">Recall</span>
                  <span className="data-value">{(modelInfo.metrics.recall * 100).toFixed(1)}%</span>
                </div>
              )}
              {modelInfo.metrics.f1 !== undefined && (
                <div className="data-row">
                  <span className="data-label">F1-Score</span>
                  <span className="data-value">{modelInfo.metrics.f1.toFixed(3)}</span>
                </div>
              )}
              {modelInfo.metrics.roc_auc !== undefined && modelInfo.metrics.roc_auc !== null && (
                <div className="data-row">
                  <span className="data-label">ROC-AUC</span>
                  <span className="data-value">{modelInfo.metrics.roc_auc.toFixed(3)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feature Set */}
        <div>
          <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 10 }}>
            Features Engineered & Fed to Model ({modelInfo.features.length})
          </h4>
          <div className="features-grid">
            {modelInfo.features.map((feature) => (
              <span key={feature} className="feature-tag">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {modelInfo.created_at && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, fontFamily: "var(--font-mono)" }}>
          Model Trained & Registered: {new Date(modelInfo.created_at).toUTCString()}
        </div>
      )}
    </div>
  );
};

