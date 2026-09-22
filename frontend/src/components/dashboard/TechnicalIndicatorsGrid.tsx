import React from "react";
import { Activity, TrendingUp, Sliders, ShieldAlert, BarChart3 } from "lucide-react";
import { MarketDataPoint } from "../../types";

interface TechnicalIndicatorsGridProps {
  latestData?: MarketDataPoint | null;
}

export const TechnicalIndicatorsGrid: React.FC<TechnicalIndicatorsGridProps> = ({ latestData }) => {
  return (
    <div className="analytics-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={18} style={{ color: "#2563EB" }} />
            <span>TECHNICAL INDICATORS</span>
          </span>
          <span className="card-subtitle">
            10 Quantitative Technical Features Grouped by Market Analytical Regime
          </span>
        </div>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#0D9488", background: "#EFFBF9", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
          Real-time Computed
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* GROUP 1: TREND (Blue) */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <TrendingUp size={14} style={{ color: "#2563EB" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Trend Indicators (Moving Averages)
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {/* SMA 10 */}
            <div style={{ background: "#F0F6FF", border: "1px solid #BFDBFE", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#1D4ED8", display: "block", textTransform: "uppercase" }}>SMA 10</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#2563EB", marginTop: 2, display: "block" }}>
                {latestData?.sma_10 ? `₹${latestData.sma_10.toFixed(2)}` : "N/A"}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", display: "block", marginTop: 2 }}>Short-term mean</span>
            </div>

            {/* SMA 20 */}
            <div style={{ background: "#F0F6FF", border: "1px solid #BFDBFE", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#1D4ED8", display: "block", textTransform: "uppercase" }}>SMA 20</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#2563EB", marginTop: 2, display: "block" }}>
                {latestData?.sma_20 ? `₹${latestData.sma_20.toFixed(2)}` : "N/A"}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", display: "block", marginTop: 2 }}>Monthly baseline</span>
            </div>

            {/* SMA 50 */}
            <div style={{ background: "#F0F6FF", border: "1px solid #BFDBFE", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#1D4ED8", display: "block", textTransform: "uppercase" }}>SMA 50</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#2563EB", marginTop: 2, display: "block" }}>
                {latestData?.sma_50 ? `₹${latestData.sma_50.toFixed(2)}` : "N/A"}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", display: "block", marginTop: 2 }}>Quarterly baseline</span>
            </div>

            {/* EMA 12 */}
            <div style={{ background: "#F0F6FF", border: "1px solid #BFDBFE", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#1D4ED8", display: "block", textTransform: "uppercase" }}>EMA 12</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#2563EB", marginTop: 2, display: "block" }}>
                {latestData?.ema_12 ? `₹${latestData.ema_12.toFixed(2)}` : "N/A"}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", display: "block", marginTop: 2 }}>Fast exponential</span>
            </div>

            {/* EMA 26 */}
            <div style={{ background: "#F0F6FF", border: "1px solid #BFDBFE", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#1D4ED8", display: "block", textTransform: "uppercase" }}>EMA 26</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#2563EB", marginTop: 2, display: "block" }}>
                {latestData?.ema_26 ? `₹${latestData.ema_26.toFixed(2)}` : "N/A"}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", display: "block", marginTop: 2 }}>Slow exponential</span>
            </div>
          </div>
        </div>

        {/* GROUP 2: MOMENTUM (Purple) */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Sliders size={14} style={{ color: "#7C3AED" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6D28D9", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Momentum Indicators
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {/* RSI 14 */}
            <div style={{ background: "#F6F1FF", border: "1px solid #DDD6FE", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#6D28D9", display: "block", textTransform: "uppercase" }}>RSI (14)</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#7C3AED", marginTop: 2, display: "block" }}>
                {latestData?.rsi_14 !== undefined && latestData.rsi_14 !== null ? latestData.rsi_14.toFixed(2) : "N/A"}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", display: "block", marginTop: 2 }}>
                {latestData?.rsi_14 ? (latestData.rsi_14 >= 70 ? "Overbought (>70)" : latestData.rsi_14 <= 30 ? "Oversold (<30)" : "Neutral Zone") : "Momentum oscillator"}
              </span>
            </div>

            {/* MACD */}
            <div style={{ background: "#F6F1FF", border: "1px solid #DDD6FE", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#6D28D9", display: "block", textTransform: "uppercase" }}>MACD Line</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#7C3AED", marginTop: 2, display: "block" }}>
                {latestData?.macd !== undefined && latestData.macd !== null ? latestData.macd.toFixed(2) : "N/A"}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", display: "block", marginTop: 2 }}>EMA 12 - EMA 26</span>
            </div>

            {/* MACD Signal */}
            <div style={{ background: "#F6F1FF", border: "1px solid #DDD6FE", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#6D28D9", display: "block", textTransform: "uppercase" }}>MACD Signal</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#7C3AED", marginTop: 2, display: "block" }}>
                {latestData?.macd_signal !== undefined && latestData.macd_signal !== null ? latestData.macd_signal.toFixed(2) : "N/A"}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", display: "block", marginTop: 2 }}>9-period MACD EMA</span>
            </div>
          </div>
        </div>

        {/* GROUP 3: VOLATILITY (Orange) & GROUP 4: VOLUME (Teal) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* VOLATILITY */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <ShieldAlert size={14} style={{ color: "#EA580C" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#C2410C", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Volatility Indicator
              </span>
            </div>
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#C2410C", display: "block", textTransform: "uppercase" }}>20D Volatility</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#EA580C", marginTop: 2, display: "block" }}>
                {latestData?.volatility_20 !== undefined && latestData.volatility_20 !== null
                  ? `${(latestData.volatility_20 * 100).toFixed(2)}%`
                  : "N/A"}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", display: "block", marginTop: 2 }}>20-day return std dev</span>
            </div>
          </div>

          {/* VOLUME */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <BarChart3 size={14} style={{ color: "#0D9488" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#0F766E", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Volume Indicator
              </span>
            </div>
            <div style={{ background: "#EFFBF9", border: "1px solid #99F6E4", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#0F766E", display: "block", textTransform: "uppercase" }}>Volume Change</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#0D9488", marginTop: 2, display: "block" }}>
                {latestData?.volume_change !== undefined && latestData.volume_change !== null
                  ? `${latestData.volume_change >= 0 ? "+" : ""}${(latestData.volume_change * 100).toFixed(2)}%`
                  : "N/A"}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", display: "block", marginTop: 2 }}>Day-over-day volume delta</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

