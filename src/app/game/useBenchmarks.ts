"use client";

import { useEffect, useState } from "react";

export type BenchmarksJson = {
  dates: string[];
  curves?: {
    BuyHoldSPY?: number[];
    EqualWeightBH?: number[];
    MVO_MaxSharpe?: number[];
    CVaR_Min?: number[];
    RiskParityInvVol?: number[];
    [key: string]: number[] | undefined;
  };
  [key: string]: any;
};

export function useBenchmarks() {
  const [benchmarks, setBenchmarks] = useState<BenchmarksJson | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/benchmarks.json?v=${Date.now()}`);
        if (!res.ok) {
          console.warn(
            "No benchmarks.json (ok if you haven't uploaded it yet)"
          );
          return;
        }
        const json: BenchmarksJson = await res.json();
        if (!cancelled) {
          console.log("[BENCHMARKS JSON]", json);
          setBenchmarks(json);
        }
      } catch (e) {
        console.error("Failed to load benchmarks.json", e);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { benchmarks };
}

export function valueFromBench(
  b: BenchmarksJson,
  curveKey: string,
  idx: number
): number | null {
  const container: any = b.curves ?? b;
  if (!container) return null;

  const curve: number[] | undefined = container[curveKey];
  if (!curve) return null;
  if (idx < 0 || idx >= curve.length) return null;

  return curve[idx];
}
