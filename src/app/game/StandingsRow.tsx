"use client";

import React from "react";

function formatMoney(x: number): string {
  return "$" + x.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatPct(x: number): string {
  if (!isFinite(x)) return "–";
  return (x * 100).toFixed(1) + "%";
}

type Props = {
  label: string;
  value: number;
  ret: number;
  color: string;
  medal?: string;
  highlight?: boolean;
};

export function StandingsRow({
  label,
  value,
  ret,
  color,
  medal,
  highlight,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 10px",
        borderRadius: 14,
        background: highlight ? "rgba(15,118,110,0.3)" : "rgba(31,41,55,0.9)",
        border: highlight
          ? "1px solid rgba(45,212,191,0.7)"
          : "1px solid rgba(55,65,81,0.9)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: color,
            opacity: 0.9,
          }}
        />
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {medal ? medal + " " : ""}
          {label}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {formatMoney(value)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: ret >= 0 ? "#bbf7d0" : "#fecaca",
          }}
        >
          {ret >= 0 ? "▲" : "▼"} {formatPct(ret)}
        </div>
      </div>
    </div>
  );
}
