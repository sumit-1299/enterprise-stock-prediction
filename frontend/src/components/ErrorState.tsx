import React from "react";

interface ErrorStateProps {
  code?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ code, message, onRetry }) => {
  return (
    <div className="alert-box" role="alert">
      <div className="alert-title">
        {code ? `Inference Error: ${code}` : "Prediction Request Failed"}
      </div>
      <div className="alert-message">{message}</div>
      {onRetry && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="chip-symbol"
            onClick={onRetry}
            style={{ color: "var(--text-primary)", borderColor: "var(--accent-red)" }}
          >
            Retry Request
          </button>
        </div>
      )}
    </div>
  );
};

