"use client";

import React from "react";

export default function BenchmarkPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #020617 0, #020617 40%, #000 100%)",
        color: "#e5e7eb",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Benchmark Dashboard
        </h1>
        <p style={{ fontSize: 14, opacity: 0.8 }}>
          This page is a placeholder for your benchmark visualizations.
          The main game runs at <code>/game</code>.
        </p>
      </div>
    </main>
  );
}
