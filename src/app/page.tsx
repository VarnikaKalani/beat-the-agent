"use client";

import Link from "next/link";
import React from "react";

const INITIAL_CAPITAL = 1_000_000;

function formatDollars(x: number): string {
  return "$" + x.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function LandingPage() {
  const [playerName, setPlayerName] = React.useState("");

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1e293b 0, #020617 45%, #000 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 960,
          height: 540,
          borderRadius: 32,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(15,23,42,0.9)",
          background:
            "linear-gradient(145deg, #020617 0, #020617 40%, #0f172a 100%)",
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {[
            { top: 40, left: 80 },
            { top: 120, right: 60 },
            { bottom: 80, left: 120 },
            { bottom: 60, right: 100 },
          ].map((pos, idx) => (
            <div
              key={idx}
              style={{
                position: "absolute",
                width: 76,
                height: 76,
                borderRadius: "999px",
                background:
                  "radial-gradient(circle at 30% 20%, #fef9c3 0, #facc15 40%, #eab308 70%)",
                border: "3px solid #fbbf24",
                boxShadow: "0 0 24px rgba(250,204,21,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 26,
                color: "#111827",
                transform: "rotate(-6deg)",
                ...pos,
              }}
            >
              $
            </div>
          ))}
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 900,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#e5e7eb",
                textShadow:
                  "0 0 0 #0f172a, 0 4px 0 #020617, 0 10px 30px rgba(0,0,0,0.9)",
              }}
            >
              GOLD RUSH
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                marginTop: 6,
                color: "#9ca3af",
              }}
            >
              Beat the agent. Grow your stack.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "center",
              width: "100%",
              maxWidth: 420,
            }}
          >
            <input
              type="text"
              placeholder="Enter your trader name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: 999,
                border: "2px solid rgba(148,163,184,0.7)",
                outline: "none",
                fontSize: 14,
                backgroundColor: "#020617",
                color: "#e5e7eb",
                boxShadow: "0 0 0 1px rgba(15,23,42,1)",
              }}
            />

            <Link
              href={playerName ? `/game?name=${encodeURIComponent(playerName)}` : "/game"}
              style={{
                width: "100%",
                textAlign: "center",
                padding: "14px 24px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg,#4f46e5,#7c3aed,#ec4899)",
                boxShadow: "0 18px 40px rgba(88,28,135,0.8)",
                color: "#f9fafb",
                fontWeight: 700,
                fontSize: 18,
                textDecoration: "none",
              }}
            >
              Start game
            </Link>

            <Link
              href="/about"
              style={{
                marginTop: 2,
                fontSize: 13,
                color: "#a5b4fc",
                textDecoration: "none",
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(129,140,248,0.5)",
                background: "rgba(15,23,42,0.9)",
              }}
            >
              About Gold Rush
            </Link>

            <div
              style={{
                fontSize: 12,
                color: "#e5e7eb",
                background: "rgba(15,23,42,0.9)",
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.5)",
              }}
            >
              You start with {formatDollars(INITIAL_CAPITAL)}. Can you beat the
              bots
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
