import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { BarChart3, TrendingUp, TrendingDown, Percent, Activity } from "lucide-react";
import { MarketDataPoint } from "../../types";

interface ReturnDistributionChartProps {
  data: MarketDataPoint[];
  symbol: string;
}

interface ReturnBin {
  binLabel: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  isPositive: boolean;
}

export const ReturnDistributionChart: React.FC<ReturnDistributionChartProps> = ({ data, symbol }) => {
  const { bins, stats, totalObservations } = useMemo(() => {
    if (!data || data.length === 0) {
      return { bins: [], stats: null, totalObservations: 0 };
    }

    // Extract valid 1-day returns in percentage points
    const returns: number[] = [];
    for (const d of data) {
      if (d.return_1d !== null && d.return_1d !== undefined && !isNaN(d.return_1d)) {
        returns.push(d.return_1d * 100);
      }
    }

    if (returns.length === 0) {
      return { bins: [], stats: null, totalObservations: 0 };
    }

    // Calculate Summary Statistics
    const n = returns.length;
    const sum = returns.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;

    const sorted = [...returns].sort((a, b) => a - b);
    const median =
      n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    const variance =
      n > 1
        ? returns.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1)
        : 0;
    const stdDev = Math.sqrt(variance);

    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Define 8 Return Bins
    const binDefinitions = [
      { label: "<-3%", min: -Infinity, max: -3, isPositive: false },
      { label: "-3% to -2%", min: -3, max: -2, isPositive: false },
      { label: "-2% to -1%", min: -2, max: -1, isPositive: false },
      { label: "-1% to 0%", min: -1, max: 0, isPositive: false },
      { label: "0% to +1%", min: 0, max: 1, isPositive: true },
      { label: "+1% to +2%", min: 1, max: 2, isPositive: true },
      { label: "+2% to +3%", min: 2, max: 3, isPositive: true },
      { label: ">+3%", min: 3, max: Infinity, isPositive: true },
    ];

    const computedBins: ReturnBin[] = binDefinitions.map((def) => {
      const count = returns.filter((r) => {
        if (def.min === -Infinity) return r < def.max;
        if (def.max === Infinity) return r >= def.min;
        return r >= def.min && r < def.max;
      }).length;

      return {
        binLabel: def.label,
        min: def.min,
        max: def.max,
        count,
        percentage: Math.round((count / n) * 1000) / 10,
        isPositive: def.isPositive,
      };
    });

    return {
      bins: computedBins,
      stats: { mean, median, stdDev, min, max },
      totalObservations: n,
    };
  }, [data]);

  if (!data || data.length === 0 || !stats) {
    return (
      <div className="analytics-card" style={{ minHeight: 240, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="card-header-row">
          <div className="card-title-group">
            <span className="card-title">Daily Return Distribution</span>
            <span className="card-subtitle">{symbol} • Statistical Density</span>
          </div>
        </div>
        <div className="state-box" style={{ padding: "32px 16px" }}>
          <BarChart3 size={32} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
          <div className="state-title" style={{ fontSize: 14, fontWeight: 700 }}>Return Data Unavailable</div>
          <div className="state-desc" style={{ fontSize: 12 }}>
            Sufficient historical returns are not available to compute statistical distribution for {symbol}.
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
            <span>Daily Return Distribution</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>
              {symbol}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: 4 }}>
              N = {totalObservations} days
            </span>
          </span>
          <span className="card-subtitle">
            Histogram of daily 1-day returns with parametric & non-parametric summary statistics
          </span>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B", fontWeight: 600 }}>
            <Percent size={12} /> Mean Return
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: stats.mean >= 0 ? "#16A34A" : "#DC2626",
            }}
          >
            {stats.mean >= 0 ? `+${stats.mean.toFixed(2)}%` : `${stats.mean.toFixed(2)}%`}
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B", fontWeight: 600 }}>
            <Activity size={12} /> Median Return
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: stats.median >= 0 ? "#16A34A" : "#DC2626",
            }}
          >
            {stats.median >= 0 ? `+${stats.median.toFixed(2)}%` : `${stats.median.toFixed(2)}%`}
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B", fontWeight: 600 }}>
            <Activity size={12} /> Standard Dev (σ)
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#7C3AED" }}>
            {stats.stdDev.toFixed(2)}%
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B", fontWeight: 600 }}>
            <TrendingDown size={12} /> Minimum Return
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#DC2626" }}>
            {stats.min.toFixed(2)}%
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B", fontWeight: 600 }}>
            <TrendingUp size={12} /> Maximum Return
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#16A34A" }}>
            +{stats.max.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Histogram Chart */}
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="binLabel"
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              interval={0}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              fontFamily="var(--font-mono)"
              tickFormatter={(val) => `${val}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const b = payload[0].payload as ReturnBin;
                return (
                  <div className="custom-chart-tooltip" style={{ minWidth: 150 }}>
                    <div className="tooltip-date" style={{ fontWeight: 700 }}>
                      Return Bucket: {b.binLabel}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                      <span style={{ color: "#64748B" }}>Days:</span>
                      <strong style={{ color: "#0F172A", fontFamily: "var(--font-mono)" }}>{b.count}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 2 }}>
                      <span style={{ color: "#64748B" }}>Share:</span>
                      <strong
                        style={{
                          color: b.isPositive ? "#16A34A" : "#DC2626",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {b.percentage}%
                      </strong>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {bins.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isPositive ? "#10B981" : "#EF4444"}
                  opacity={0.82}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

