"use client";

import React from "react";

export type StrategySeries = {
  label: string;
  color: string;
  values: number[];
};

type Props = {
  dates: string[];
  series: StrategySeries[];
};

export function TopStrategiesChart({ dates, series }: Props) {
  if (!series.length || !dates.length) {
    return (
      <div
        style={{
          marginTop: 8,
          paddingTop: 10,
          borderTop: "1px solid rgba(55,65,81,0.9)",
          fontSize: 12,
          color: "#9ca3af",
        }}
      >
        Top 3 strategies over time
        <div style={{ marginTop: 6, fontSize: 11 }}>
          Play at least a few months to see the chart.
        </div>
      </div>
    );
  }

  // global Y min/max across all series
  let globalMin = Infinity;
  let globalMax = -Infinity;
  for (const s of series) {
    for (const v of s.values) {
      if (!isFinite(v)) continue;
      if (v < globalMin) globalMin = v;
      if (v > globalMax) globalMax = v;
    }
  }

  if (!isFinite(globalMin) || !isFinite(globalMax)) {
    globalMin = 800_000;
    globalMax = 1_200_000;
  }

  const paddingFrac = 0.05;
  const span = Math.max(1, globalMax - globalMin);
  const yMin = globalMin - span * paddingFrac;
  const yMax = globalMax + span * paddingFrac;

  const len = dates.length;
  const xTicks = [0, Math.floor((len - 1) / 2), len - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  const formatMoney = (x: number) =>
    "$" + x.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid rgba(55,65,81,0.9)",
      }}
    >
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        Top 3 strategies over time
      </div>

      <div style={{ position: "relative", width: "100%", height: 180 }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            width: "100%",
            height: "100%",
            background: "rgba(15,23,42,0.9)",
            borderRadius: 10,
          }}
        >
          {/* horizontal grid lines + labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const yVal = yMin + (yMax - yMin) * (1 - t);
            const y = t * 100;
            const label = formatMoney(yVal);
            return (
              <g key={t}>
                <line
                  x1={8}
                  y1={y}
                  x2={100}
                  y2={y}
                  stroke="rgba(55,65,81,0.8)"
                  strokeWidth={0.3}
                />
                <text
                  x={6}
                  y={y + 2}
                  textAnchor="end"
                  fontSize={4}
                  fill="#9ca3af"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* X axis line */}
          <line
            x1={8}
            y1={100}
            x2={100}
            y2={100}
            stroke="rgba(75,85,99,1)"
            strokeWidth={0.5}
          />

          {/* series lines */}
          {series.map((s) => {
            const pts: string[] = [];
            const n = s.values.length;
            for (let i = 0; i < n; i++) {
              const v = s.values[i];
              const x = 8 + (i / Math.max(1, n - 1)) * 92;
              const clamp = (z: number) => Math.max(yMin, Math.min(yMax, z));
              const yN = 100 - ((clamp(v) - yMin) / (yMax - yMin)) * 100;
              pts.push(`${x.toFixed(2)},${yN.toFixed(2)}`);
            }
            return (
              <polyline
                key={s.label}
                fill="none"
                stroke={s.color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={pts.join(" ")}
              />
            );
          })}
        </svg>

        {/* X axis ticks */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 4,
            pointerEvents: "none",
            display: "flex",
            justifyContent: "space-between",
            padding: "0 10px 0 26px",
            fontSize: 10,
            color: "#9ca3af",
          }}
        >
          {xTicks.map((idx) => (
            <span key={idx}>
              {dates[idx] ? dates[idx].slice(0, 7) : ""}
            </span>
          ))}
        </div>

        {/* Axis titles */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "rotate(-90deg) translate(-50%, -10px)",
            transformOrigin: "top left",
            fontSize: 10,
            color: "#9ca3af",
          }}
        >
          Portfolio value ($)
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -2,
            textAlign: "center",
            fontSize: 10,
            color: "#9ca3af",
          }}
        >
          Date (months)
        </div>
      </div>

      {/* legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 8,
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
    </div>
  );
}
