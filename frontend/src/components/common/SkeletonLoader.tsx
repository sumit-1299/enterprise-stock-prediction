import React from "react";

interface SkeletonLoaderProps {
  type?: "kpi" | "chart" | "table" | "card" | "line";
  count?: number;
  height?: number | string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = "card",
  count = 1,
  height,
}) => {
  const items = Array.from({ length: count });

  if (type === "kpi") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, minmax(180px, 1fr))`, gap: 16 }}>
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              background: "#FFFFFF",
              border: "1px solid #DCE4EE",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 4px 18px rgba(23, 32, 51, 0.04)",
            }}
          >
            <div className="skeleton-box" style={{ height: 12, width: "40%", marginBottom: 12 }} />
            <div className="skeleton-box" style={{ height: 28, width: "75%", marginBottom: 10 }} />
            <div className="skeleton-box" style={{ height: 12, width: "55%" }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #DCE4EE",
          borderRadius: 16,
          padding: 24,
          height: height || 360,
          boxShadow: "0 4px 18px rgba(23, 32, 51, 0.04)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="skeleton-box" style={{ height: 18, width: 160 }} />
          <div className="skeleton-box" style={{ height: 28, width: 220 }} />
        </div>
        <div className="skeleton-box" style={{ flex: 1, width: "100%", borderRadius: 8 }} />
      </div>
    );
  }

  if (type === "table") {
    return (
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #DCE4EE",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 4px 18px rgba(23, 32, 51, 0.04)",
        }}
      >
        <div className="skeleton-box" style={{ height: 20, width: "30%", marginBottom: 16 }} />
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 0",
              borderBottom: i < count - 1 ? "1px solid #EEF3F8" : "none",
            }}
          >
            <div className="skeleton-box" style={{ height: 14, width: "20%" }} />
            <div className="skeleton-box" style={{ height: 14, width: "25%" }} />
            <div className="skeleton-box" style={{ height: 14, width: "20%" }} />
            <div className="skeleton-box" style={{ height: 14, width: "15%" }} />
            <div className="skeleton-box" style={{ height: 14, width: "20%" }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #DCE4EE",
        borderRadius: 16,
        padding: 20,
        height: height || 200,
        boxShadow: "0 4px 18px rgba(23, 32, 51, 0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div className="skeleton-box" style={{ height: 16, width: "40%" }} />
      <div className="skeleton-box" style={{ flex: 1, width: "100%", borderRadius: 8 }} />
    </div>
  );
};

