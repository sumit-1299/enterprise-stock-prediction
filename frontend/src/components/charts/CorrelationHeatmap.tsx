import React, { useState, useMemo } from "react";
import { Grid, Info } from "lucide-react";
import { MarketDataPoint } from "../../types";

interface CorrelationHeatmapProps {
  data: MarketDataPoint[];
  symbol: string;
}

interface FeatureDef {
  key: keyof MarketDataPoint;
  shortLabel: string;
  fullLabel: string;
}

const FEATURES: FeatureDef[] = [
  { key: "return_1d", shortLabel: "1D Ret", fullLabel: "1-Day Return" },
  { key: "return_5d", shortLabel: "5D Ret", fullLabel: "5-Day Return" },
  { key: "sma_10", shortLabel: "SMA 10", fullLabel: "10-Day Simple Moving Average" },
  { key: "sma_20", shortLabel: "SMA 20", fullLabel: "20-Day Simple Moving Average" },
  { key: "sma_50", shortLabel: "SMA 50", fullLabel: "50-Day Simple Moving Average" },
  { key: "ema_12", shortLabel: "EMA 12", fullLabel: "12-Day Exponential Moving Average" },
  { key: "ema_26", shortLabel: "EMA 26", fullLabel: "26-Day Exponential Moving Average" },
  { key: "macd", shortLabel: "MACD", fullLabel: "Moving Average Convergence Divergence" },
  { key: "macd_signal", shortLabel: "Signal", fullLabel: "MACD 9-Day Signal Line" },
  { key: "rsi_14", shortLabel: "RSI 14", fullLabel: "14-Day Relative Strength Index" },
  { key: "volatility_20", shortLabel: "Vol 20", fullLabel: "20-Day Rolling Volatility" },
  { key: "volume_change", shortLabel: "Vol Chg", fullLabel: "Daily Volume Percentage Change" },
];

function getCellColor(r: number): { bg: string; text: string } {
  if (isNaN(r)) return { bg: "#F1F5F9", text: "#94A3B8" };
  if (r >= 0.8) return { bg: "#1D4ED8", text: "#FFFFFF" };
  if (r >= 0.6) return { bg: "#2563EB", text: "#FFFFFF" };
  if (r >= 0.4) return { bg: "#60A5FA", text: "#0F172A" };
  if (r >= 0.2) return { bg: "#BAE6FD", text: "#0F172A" };
  if (r > -0.2) return { bg: "#F1F5F9", text: "#475569" };
  if (r > -0.4) return { bg: "#FED7AA", text: "#0F172A" };
  if (r > -0.6) return { bg: "#FCA5A5", text: "#0F172A" };
  if (r > -0.8) return { bg: "#EF4444", text: "#FFFFFF" };
  return { bg: "#B91C1C", text: "#FFFFFF" };
}

function getCorrelationDescription(r: number): string {
  if (r === 1) return "Perfect Positive (Identical feature)";
  if (r >= 0.7) return "Strong Positive Linear Correlation";
  if (r >= 0.3) return "Moderate Positive Linear Correlation";
  if (r > -0.3) return "Negligible / Weak Correlation";
  if (r > -0.7) return "Moderate Negative Linear Correlation";
  return "Strong Negative Linear Correlation";
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ data, symbol }) => {
  const [hoveredCell, setHoveredCell] = useState<{
    row: FeatureDef;
    col: FeatureDef;
    val: number;
    x: number;
    y: number;
  } | null>(null);

  const { matrix, validCount } = useMemo(() => {
    if (!data || data.length < 5) {
      return { matrix: [], validCount: 0 };
    }

    // Extract numerical series for each feature
    const seriesMap: { [k: string]: number[] } = {};
    for (const feat of FEATURES) {
      seriesMap[feat.key] = [];
    }

    let count = 0;
    for (const point of data) {
      // Check if at least some features are valid
      let hasAny = false;
      for (const feat of FEATURES) {
        const val = point[feat.key];
        if (val !== null && val !== undefined && typeof val === "number" && !isNaN(val)) {
          hasAny = true;
          break;
        }
      }
      if (hasAny) {
        count++;
        for (const feat of FEATURES) {
          const val = point[feat.key];
          seriesMap[feat.key].push(
            val !== null && val !== undefined && typeof val === "number" && !isNaN(val) ? val : NaN
          );
        }
      }
    }

    if (count < 5) {
      return { matrix: [], validCount: count };
    }

    // Compute Pearson Correlation Matrix
    const computedMatrix: number[][] = [];
    for (let i = 0; i < FEATURES.length; i++) {
      const row: number[] = [];
      const featA = FEATURES[i].key;
      const arrA = seriesMap[featA];

      for (let j = 0; j < FEATURES.length; j++) {
        if (i === j) {
          row.push(1.0);
          continue;
        }

        const featB = FEATURES[j].key;
        const arrB = seriesMap[featB];

        // Find common non-NaN pairs
        const pairsA: number[] = [];
        const pairsB: number[] = [];
        for (let k = 0; k < arrA.length; k++) {
          if (!isNaN(arrA[k]) && !isNaN(arrB[k])) {
            pairsA.push(arrA[k]);
            pairsB.push(arrB[k]);
          }
        }

        const n = pairsA.length;
        if (n < 5) {
          row.push(NaN);
          continue;
        }

        const meanA = pairsA.reduce((sum, v) => sum + v, 0) / n;
        const meanB = pairsB.reduce((sum, v) => sum + v, 0) / n;

        let num = 0;
        let denA = 0;
        let denB = 0;
        for (let k = 0; k < n; k++) {
          const diffA = pairsA[k] - meanA;
          const diffB = pairsB[k] - meanB;
          num += diffA * diffB;
          denA += diffA * diffA;
          denB += diffB * diffB;
        }

        const den = Math.sqrt(denA * denB);
        const r = den === 0 ? 0 : num / den;
        row.push(Math.round(r * 100) / 100);
      }
      computedMatrix.push(row);
    }

    return { matrix: computedMatrix, validCount: count };
  }, [data]);

  if (!data || data.length < 5 || matrix.length === 0) {
    return (
      <div className="analytics-card" style={{ minHeight: 240, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Feature Correlation Matrix</span>
            <span className="card-subtitle">{symbol} • 12-Factor Pearson Matrix</span>
          </div>
        </div>
        <div className="state-box" style={{ padding: "32px 16px" }}>
          <Grid size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
          <div className="state-title" style={{ fontSize: 14, fontWeight: 700 }}>Correlation Data Unavailable</div>
          <div className="state-desc" style={{ fontSize: 12 }}>
            At least 5 historical trading days with engineered features are required to compute the correlation matrix for {symbol}.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Feature Correlation Matrix (12×12)</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>
              {symbol}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: 4 }}>
              N = {validCount} observations
            </span>
          </span>
          <span className="card-subtitle">
            Pairwise Pearson linear correlation coefficients between all 12 quantitative model features
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B", flexWrap: "wrap" }}>
          <span>Scale:</span>
          <span style={{ padding: "2px 6px", borderRadius: 3, background: "#B91C1C", color: "#FFF", fontWeight: 700 }}>-1.0</span>
          <span style={{ padding: "2px 6px", borderRadius: 3, background: "#FCA5A5", color: "#0F172A", fontWeight: 600 }}>-0.5</span>
          <span style={{ padding: "2px 6px", borderRadius: 3, background: "#F1F5F9", color: "#475569", fontWeight: 600 }}>0.0</span>
          <span style={{ padding: "2px 6px", borderRadius: 3, background: "#93C5FD", color: "#0F172A", fontWeight: 600 }}>+0.5</span>
          <span style={{ padding: "2px 6px", borderRadius: 3, background: "#1D4ED8", color: "#FFF", fontWeight: 700 }}>+1.0</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div style={{ overflowX: "auto", position: "relative" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "3px",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            textAlign: "center",
          }}
        >
          <thead>
            <tr>
              <th style={{ width: 68, textAlign: "left", padding: "4px 6px", color: "#64748B", fontSize: 10 }}>
                Factor
              </th>
              {FEATURES.map((feat) => (
                <th
                  key={feat.key}
                  style={{
                    padding: "4px 2px",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: 10,
                    whiteSpace: "nowrap",
                    width: `${100 / (FEATURES.length + 1)}%`,
                  }}
                  title={feat.fullLabel}
                >
                  {feat.shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((rowFeat, rowIndex) => (
              <tr key={rowFeat.key}>
                <td
                  style={{
                    textAlign: "left",
                    padding: "4px 6px",
                    fontWeight: 600,
                    color: "#1E293B",
                    fontSize: 10,
                    whiteSpace: "nowrap",
                  }}
                  title={rowFeat.fullLabel}
                >
                  {rowFeat.shortLabel}
                </td>
                {FEATURES.map((colFeat, colIndex) => {
                  const val = matrix[rowIndex][colIndex];
                  const { bg, text } = getCellColor(val);
                  return (
                    <td
                      key={colFeat.key}
                      style={{
                        backgroundColor: bg,
                        color: text,
                        padding: "6px 2px",
                        borderRadius: 4,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "transform 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          row: rowFeat,
                          col: colFeat,
                          val,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {isNaN(val) ? "—" : val === 1 ? "1.00" : val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Hover Tooltip */}
        {hoveredCell && (
          <div
            style={{
              position: "fixed",
              left: hoveredCell.x,
              top: hoveredCell.y - 8,
              transform: "translate(-50%, -100%)",
              backgroundColor: "#0F172A",
              color: "#FFFFFF",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "var(--font-sans)",
              pointerEvents: "none",
              zIndex: 9999,
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 2 }}>
              {hoveredCell.row.fullLabel} × {hoveredCell.col.fullLabel}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#60A5FA" }}>
                r = {isNaN(hoveredCell.val) ? "N/A" : hoveredCell.val >= 0 ? `+${hoveredCell.val.toFixed(2)}` : hoveredCell.val.toFixed(2)}
              </span>
              <span style={{ color: "#94A3B8" }}>
                ({getCorrelationDescription(hoveredCell.val)})
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 11, color: "#64748B" }}>
        <Info size={13} style={{ color: "#2563EB", flexShrink: 0 }} />
        <span>
          Values close to +1.00 indicate strong positive co-movement (e.g. moving averages), while values close to -1.00 indicate inverse dynamics. Low absolute values (|r| &lt; 0.30) indicate independent informational signals for the XGBoost model.
        </span>
      </div>
    </div>
  );
};

