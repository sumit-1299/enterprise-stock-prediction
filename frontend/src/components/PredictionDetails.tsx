import React from "react";
import { PredictionResponse } from "../types";

interface PredictionDetailsProps {
  prediction: PredictionResponse;
}

export const PredictionDetails: React.FC<PredictionDetailsProps> = ({ prediction }) => {
  return (
    <div className="card">
      <div className="card-title">
        <span>Quantitative Prediction Breakdown</span>
      </div>

      <div className="data-table">
        <div className="data-row">
          <span className="data-label">Predicted Direction</span>
          <span className="data-value" style={{ color: prediction.direction === 1 ? "var(--accent-green)" : "var(--accent-red)" }}>
            {prediction.prediction} (Class {prediction.direction})
          </span>
        </div>
        <div className="data-row">
          <span className="data-label">Direction Probability</span>
          <span className="data-value">{(prediction.probability * 100).toFixed(2)}%</span>
        </div>
        <div className="data-row">
          <span className="data-label">Probability (P=UP)</span>
          <span className="data-value">{(prediction.probabilities.UP * 100).toFixed(2)}%</span>
        </div>
        <div className="data-row">
          <span className="data-label">Probability (P=DOWN)</span>
          <span className="data-value">{(prediction.probabilities.DOWN * 100).toFixed(2)}%</span>
        </div>
        <div className="data-row">
          <span className="data-label">Features Evaluated</span>
          <span className="data-value">
            {prediction.features_used ? `${prediction.features_used.length} Features` : "Standard Set (12)"}
          </span>
        </div>
        <div className="data-row">
          <span className="data-label">Execution Mode</span>
          <span className="data-value" style={{ color: "var(--accent-blue)" }}>
            Inference Only (Zero Retraining)
          </span>
        </div>
      </div>
    </div>
  );
};

