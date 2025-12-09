"use client";

import React from "react";

type StrategySeries = {
  label: string;
  color: string;
  values: number[];
};

type Props = {
  dates: string[];
  series: StrategySeries[];
};

export function AllocationChart({ dates, series }: Props) {
  if (!dates.length || !series.length) {
    return (
      <div
        style={{
          marginTop: 16,
          paddingTop: 10,
          borderTop: "1px solid rgba(55,65,81,0.9)",
          fontSize: 12,
          color: "#9ca3af",
        }}
      >
        Top strategies over time
        <div style={{ marginTop: 6, fontSize: 11 }}>
          Finish a run to see how the winning strategies evolved.
        </div>
      </div>
    );
  }

  const len = dates.length;

  // y-scale: min/max across all series
  let minV = Infinity;
  let maxV = -Infinity;
  for (const s of series) {
    for (const v of s.values) {
      if (!isFinite(v)) continue;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  if (!isFinite(minV) || !isFinite(maxV)) {
    minV = 0;
    maxV = 1;
  }
  const pad = (maxV - minV) * 0.05 || 1;
  minV -= pad;
  maxV += pad;

  const maxIndex = len - 1 || 1;

  const seriesPolylines = series.map((s) => {
    const points = s.values.map((v, i) => {
      const x = (i / maxIndex) * 100;
      const norm = maxV > minV ? (v - minV) / (maxV - minV) : 0.5;
      const y = 100 - norm * 100;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return { ...s, points: points.join(" ") };
  });

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 10,
        borderTop: "1px solid rgba(55,65,81,0.9)",
      }}
    >
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        Top 3 strategies over time
      </div>

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: 150,
          background: "rgba(15,23,42,0.9)",
        }}
      >
        {/* grid */}
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1={0}
            y1={y}
            x2={100}
            y2={y}
            stroke="rgba(55,65,81,0.7)"
            strokeWidth={0.4}
          />
        ))}

        {/* series */}
        {seriesPolylines.map((s) => (
          <polyline
            key={s.label}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.points}
          />
        ))}

        {/* axis labels */}
        <text
          x="50"
          y="99"
          textAnchor="middle"
          fontSize="6.5"
          fill="rgba(200,200,200,0.7)"
        >
          Date (months)
        </text>
        <text
          x="6"
          y="50"
          textAnchor="middle"
          fontSize="6.5"
          fill="rgba(200,200,200,0.7)"
          transform="rotate(-90 6 50)"
        >
          Portfolio value ($)
        </text>
      </svg>

      {/* legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 6,
          fontSize: 11,
        }}
      >
        {series.map((s) => (
          <div
            key={s.label}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: s.color,
              }}
            />
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 10,
          color: "#9ca3af",
        }}
      >
        From {dates[0]} to {dates[dates.length - 1]}
      </div>
    </div>
  );
}
