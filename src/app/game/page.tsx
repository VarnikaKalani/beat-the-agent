"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useBenchmarks } from "./useBenchmarks";
import { StandingsRow } from "./StandingsRow";


const DEBUG = true;
const dlog = (...args: any[]) => {
  if (DEBUG) console.log("[GAME DEBUG]", ...args);
};

const INITIAL_CAPITAL = 1_000_000;

// ---------- raw JSON types ----------

type RawTrpoData = {
  dates: string[];
  trpoPortfolio: number[];
  trpoWeights: number[][];
  assetReturns?: number[][];
  tickers?: string[];
  ASSET_TICKERS?: string[];
};

type RawPpoData = {
  dates: string[];
  ppoPortfolio?: number[];
  trpoPortfolio?: number[];
  ppoWeights?: number[][];
  trpoWeights?: number[][];
  assetReturns?: number[][];
  tickers?: string[];
  ASSET_TICKERS?: string[];
};

// ---------- game data after processing ----------

type GameData = {
  dates: string[];
  tickers: string[];
  assetReturns: number[][];
  trpoPortfolio: number[];
  trpoWeights: number[][];
  ppoPortfolio: number[];
  ppoWeights: number[][];
};

type SliderState = {
  [ticker: string]: number; // 0..100
};

type BenchPaths = {
  eqw?: number[];
  spy?: number[];
  cvar?: number[];
  rp?: number[];
  mvo?: number[];
};

type StrategySeries = {
  label: string;
  color: string;
  values: number[];
};

// ---------- helpers ----------

function formatMoney(x: number): string {
  return "$" + x.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatPct(x: number): string {
  if (!isFinite(x)) return "–";
  return (x * 100).toFixed(1) + "%";
}

/**
 * Aggregate a daily portfolio path + daily asset returns to month end.
 * Then rescale so the first month starts at INITIAL_CAPITAL.
 */
function aggregateToMonthly(
  label: string,
  dailyDates: string[],
  dailyAssetReturns: number[][],
  portfolioPath: number[],
  weightsPath: number[][],
  nAssets: number
) {
  type Bucket = {
    date: string;
    value: number;
    weights?: number[];
    prod: number[];
  };

  const byMonth = new Map<string, Bucket>();

  for (let i = 0; i < dailyDates.length; i++) {
    const dateStr = dailyDates[i];
    const key = dateStr.slice(0, 7); // YYYY-MM

    let bucket = byMonth.get(key);
    if (!bucket) {
      bucket = {
        date: dateStr,
        value:
          typeof portfolioPath[i] === "number"
            ? portfolioPath[i]
            : INITIAL_CAPITAL,
        weights: weightsPath[i],
        prod: new Array(nAssets).fill(1),
      };
      byMonth.set(key, bucket);
    }

    bucket.date = dateStr;
    if (typeof portfolioPath[i] === "number") bucket.value = portfolioPath[i];
    if (weightsPath[i]) bucket.weights = weightsPath[i];

    const dayR = dailyAssetReturns[i];
    if (dayR && dayR.length >= nAssets) {
      for (let j = 0; j < nAssets; j++) {
        bucket.prod[j] *= 1 + dayR[j];
      }
    }
  }

  const buckets = Array.from(byMonth.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const monthDates: string[] = [];
  let monthPortfolio: number[] = [];
  const monthWeights: number[][] = [];
  const monthAssetReturns: number[][] = [];

  for (const b of buckets) {
    monthDates.push(b.date);
    monthWeights.push(b.weights ?? []);
    const monthlyR =
      b.prod && b.prod.length === nAssets
        ? b.prod.map((p) => p - 1)
        : new Array(nAssets).fill(0);
    monthAssetReturns.push(monthlyR);
    monthPortfolio.push(b.value);
  }

  if (monthPortfolio.length) {
    const startRaw = monthPortfolio[0];
    const scale =
      startRaw !== 0 && isFinite(startRaw) ? INITIAL_CAPITAL / startRaw : 1.0;

    monthPortfolio = monthPortfolio.map((v) => v * scale);

    dlog(
      `[${label}] monthly start/end`,
      monthPortfolio[0],
      monthPortfolio[monthPortfolio.length - 1],
      "cum=",
      monthPortfolio[monthPortfolio.length - 1] / monthPortfolio[0] - 1
    );
  }

  return {
    dates: monthDates,
    portfolio: monthPortfolio,
    weights: monthWeights,
    monthlyReturns: monthAssetReturns,
  };
}

function normalizeLength(arr: number[], target: number): number[] {
  if (!arr.length || target <= 0) return [];
  if (arr.length === target) return [...arr];

  const out: number[] = [];
  for (let i = 0; i < target; i++) {
    const t = (i * (arr.length - 1)) / (target - 1);
    const lo = Math.floor(t);
    const hi = Math.min(arr.length - 1, lo + 1);
    const alpha = t - lo;
    out.push(arr[lo] * (1 - alpha) + arr[hi] * alpha);
  }
  return out;
}

function strategyColor(label: string, playerName: string): string {
  switch (label) {
    case playerName:
      return "#22c55e"; // you
    case "TRPO Agent":
      return "#a5b4fc";
    case "PPO Agent":
      return "#fb7185";
    case "Equal-Weight BH":
      return "#38bdf8";
    case "Buy & Hold SPY":
      return "#facc15";
    case "CVaR Min":
      return "#e5e7eb";
    case "Risk Parity (InvVol)":
      return "#fb923c";
    case "MVO (Max Sharpe)":
      return "#6366f1";
    default:
      return "#e5e7eb";
  }
}

// ---------- main component ----------

function GamePageInner() {
  const searchParams = useSearchParams();
  const nameParam = searchParams.get("name");
  const playerName =
    nameParam && nameParam.trim().length > 0 ? nameParam.trim() : "You";

  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayIndex, setDayIndex] = useState(0);

  const [playerValue, setPlayerValue] = useState(INITIAL_CAPITAL);
  const [spyValue, setSpyValue] = useState(INITIAL_CAPITAL);
  const [eqwValue, setEqwValue] = useState(INITIAL_CAPITAL);
  const [isFinished, setIsFinished] = useState(false);

  const [playerPath, setPlayerPath] = useState<number[]>([]);
  const [sliders, setSliders] = useState<SliderState>({});
  const [autoRebalance, setAutoRebalance] = useState(true);

  const { benchmarks } = useBenchmarks();

  // ---------- load JSONs and build GameData ----------

  useEffect(() => {
    async function load() {
      try {
        const trpoUrl = `/trpo3.json?v=${Date.now()}`;
        const ppoUrl = `/ppo_trajectory.json?v=${Date.now()}`;
        dlog("Fetching", trpoUrl, ppoUrl);

        const [resTrpo, resPpo] = await Promise.all([
          fetch(trpoUrl),
          fetch(ppoUrl),
        ]);

        if (!resTrpo.ok) throw new Error(`TRPO HTTP ${resTrpo.status}`);
        const rawTrpo: RawTrpoData = await resTrpo.json();

        const rawPpo: RawPpoData | null = resPpo.ok
          ? await resPpo.json()
          : null;

        // pick tickers
        let tickers: string[];
        if (rawTrpo.tickers?.length) tickers = rawTrpo.tickers;
        else if (rawTrpo.ASSET_TICKERS?.length) tickers = rawTrpo.ASSET_TICKERS;
        else if (rawPpo?.tickers?.length) tickers = rawPpo.tickers!;
        else if (rawPpo?.ASSET_TICKERS?.length) tickers = rawPpo.ASSET_TICKERS!;
        else {
          const nFromReturns =
            rawTrpo.assetReturns?.[0]?.length ??
            rawPpo?.assetReturns?.[0]?.length ??
            0;
          tickers = Array.from(
            { length: nFromReturns },
            (_, i) => `Asset ${i + 1}`
          );
        }
        const nAssets = tickers.length;

        const dailyDates = rawTrpo.dates ?? [];
        const dailyReturns = rawTrpo.assetReturns ?? [];

        if (!dailyDates.length) {
          throw new Error("No TRPO daily dates available");
        }

        const trpoAgg = aggregateToMonthly(
          "TRPO",
          dailyDates,
          dailyReturns,
          rawTrpo.trpoPortfolio ?? [],
          rawTrpo.trpoWeights ?? [],
          nAssets
        );

        const finalDates = trpoAgg.dates;

        // PPO monthly path
        let ppoPortfolio: number[] = [];
        let ppoWeights: number[][] = [];

        if (
          rawPpo &&
          rawPpo.dates?.length &&
          (rawPpo.ppoPortfolio?.length || rawPpo.trpoPortfolio?.length)
        ) {
          const ppoDates = rawPpo.dates;
          const ppoValsRaw =
            rawPpo.ppoPortfolio && rawPpo.ppoPortfolio.length
              ? rawPpo.ppoPortfolio
              : rawPpo.trpoPortfolio!;

          const ppoMonthVal = new Map<string, number>();
          for (let i = 0; i < ppoDates.length; i++) {
            const key = ppoDates[i].slice(0, 7);
            const v = ppoValsRaw[i];
            if (typeof v === "number") ppoMonthVal.set(key, v);
          }

          const firstKey = finalDates[0].slice(0, 7);
          const firstPpoVal = ppoMonthVal.get(firstKey);
          let ppoScale = 1;
          if (typeof firstPpoVal === "number" && firstPpoVal !== 0) {
            ppoScale = INITIAL_CAPITAL / firstPpoVal;
          }

          for (const d of finalDates) {
            const key = d.slice(0, 7);
            const rawVal = ppoMonthVal.get(key);
            if (typeof rawVal === "number") {
              ppoPortfolio.push(rawVal * ppoScale);
            } else if (ppoPortfolio.length) {
              ppoPortfolio.push(ppoPortfolio[ppoPortfolio.length - 1]);
            } else {
              ppoPortfolio.push(INITIAL_CAPITAL);
            }
            ppoWeights.push([]);
          }

          dlog(
            "[PPO] monthly start/end",
            ppoPortfolio[0],
            ppoPortfolio[ppoPortfolio.length - 1],
            "cum=",
            ppoPortfolio[ppoPortfolio.length - 1] / ppoPortfolio[0] - 1
          );
        } else {
          ppoPortfolio = finalDates.map(() => INITIAL_CAPITAL);
          ppoWeights = finalDates.map(() => new Array(nAssets).fill(0));
          console.warn("[PPO] missing or invalid json, using flat line");
        }

        const game: GameData = {
          dates: finalDates,
          tickers,
          assetReturns: trpoAgg.monthlyReturns,
          trpoPortfolio: trpoAgg.portfolio,
          trpoWeights: trpoAgg.weights,
          ppoPortfolio,
          ppoWeights,
        };

        setData(game);

        // equal weights at start for sliders
        const initSliders: SliderState = {};
        game.tickers.forEach(
          (t) => (initSliders[t] = 100 / game.tickers.length)
        );
        setSliders(initSliders);

        setDayIndex(0);
        setPlayerValue(INITIAL_CAPITAL);
        setSpyValue(INITIAL_CAPITAL);
        setEqwValue(INITIAL_CAPITAL);
        setPlayerPath([INITIAL_CAPITAL]);
        setIsFinished(false);
      } catch (err) {
        console.error("Failed to load trajectories", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ---------- derived stuff ----------

  const maxDay = data ? Math.max(data.dates.length - 1, 0) : 0;

  const playerWeights: number[] = useMemo(() => {
    if (!data) return [];
    const totals = data.tickers.map((t) => Math.max(0, sliders[t] ?? 0));
    const sum = totals.reduce((a, b) => a + b, 0) || 1;
    return totals.map((v) => v / sum);
  }, [data, sliders]);

  const currentDate =
    data && data.dates[dayIndex] ? data.dates[dayIndex] : "Game starting...";

const effectiveLen = Math.min(dayIndex + 1, data?.dates.length ?? 0);


  const trpoValue =
    data && data.trpoPortfolio.length
      ? data.trpoPortfolio[Math.min(dayIndex, data.trpoPortfolio.length - 1)]
      : INITIAL_CAPITAL;

  const ppoValue =
    data && data.ppoPortfolio.length
      ? data.ppoPortfolio[Math.min(dayIndex, data.ppoPortfolio.length - 1)]
      : INITIAL_CAPITAL;

  const spyIndex =
    data && data.tickers
      ? data.tickers.findIndex((t) => t.toUpperCase() === "SPY")
      : -1;

  const playerReturnSinceStart = playerValue / INITIAL_CAPITAL - 1;
  const trpoStart =
    data && data.trpoPortfolio.length
      ? data.trpoPortfolio[0]
      : INITIAL_CAPITAL;
  const ppoStart =
    data && data.ppoPortfolio.length
      ? data.ppoPortfolio[0]
      : INITIAL_CAPITAL;

  const trpoReturnSinceStart = trpoValue / trpoStart - 1;
  const ppoReturnSinceStart = ppoValue / ppoStart - 1;

    // benchmark full paths, rebased to 1M for chart + standings
    type BenchPaths = {
        eqw?: number[];
        spy?: number[];
        cvar?: number[];
        rp?: number[];
        mvo?: number[];
      };
    
      const benchPaths: BenchPaths | null = useMemo(() => {
        if (!benchmarks || !data) return null;
        const src: any = (benchmarks as any).curves ?? benchmarks;
    
        const scale = (path: number[] | undefined): number[] | undefined => {
          if (!path || !path.length) return undefined;
          const first = path[0] || 1;
          const s = INITIAL_CAPITAL / first;
          return path.map((v) => v * s);
        };
    
        return {
          eqw: scale(src.EqualWeightBH ?? src["Equal-Weight BH"]),
          spy: scale(src.BuyHoldSPY),
          cvar: scale(src.CVaR_Min),
          rp: scale(src.RiskParityInvVol),
          mvo: scale(src.MVO_MaxSharpe),
        };
      }, [benchmarks, data]);
    
      const benchValues = useMemo(() => {
        if (!benchPaths || !data) return null;
        const idx = Math.min(dayIndex, data.dates.length - 1);
    
        const pick = (arr?: number[]) =>
          arr && arr.length ? arr[Math.min(idx, arr.length - 1)] : null;
    
        return {
          eqw: pick(benchPaths.eqw),
          spy: pick(benchPaths.spy),
          cvar: pick(benchPaths.cvar),
          rp: pick(benchPaths.rp),
          mvo: pick(benchPaths.mvo),
        };
      }, [benchPaths, data, dayIndex]);
    
      // unified competitors list for medals
      const competitors: { label: string; value: number }[] = [
        { label: playerName, value: playerValue },
        { label: "TRPO Agent", value: trpoValue },
        { label: "PPO Agent", value: ppoValue },
      ];
    
      if (benchValues?.eqw != null)
        competitors.push({ label: "Equal-Weight BH", value: benchValues.eqw });
      if (benchValues?.spy != null)
        competitors.push({ label: "Buy & Hold SPY", value: benchValues.spy });
      if (benchValues?.cvar != null)
        competitors.push({ label: "CVaR Min", value: benchValues.cvar });
      if (benchValues?.rp != null)
        competitors.push({ label: "Risk Parity (InvVol)", value: benchValues.rp });
      if (benchValues?.mvo != null)
        competitors.push({ label: "MVO (Max Sharpe)", value: benchValues.mvo });
    
      const sortedAll = [...competitors].sort((a, b) => b.value - a.value);
    
      const medalMap = new Map<string, string>();
      if (sortedAll[0]) medalMap.set(sortedAll[0].label, "🥇");
      if (sortedAll[1]) medalMap.set(sortedAll[1].label, "🥈");
      if (sortedAll[2]) medalMap.set(sortedAll[2].label, "🥉");
    
      const playerRank = sortedAll.findIndex((r) => r.label === playerName);
      const winnerLabel = sortedAll[0]?.label ?? "Top strategy";
    
      const top3Standings = sortedAll.slice(0, 3);
    
      
    
      const top3Series: StrategySeries[] =
        data && benchPaths && effectiveLen > 0
          ? top3Standings
              .map<StrategySeries | null>((row) => {
                let values: number[] | null = null;
    
                switch (row.label) {
                  case playerName: {
                    if (!playerPath.length) return null;
                    values = normalizeLength(playerPath, effectiveLen);
                    break;
                  }
                  case "TRPO Agent": {
                    values = normalizeLength(data.trpoPortfolio, effectiveLen);
                    break;
                  }
                  case "PPO Agent": {
                    values = normalizeLength(data.ppoPortfolio, effectiveLen);
                    break;
                  }
                  case "Equal-Weight BH": {
                    if (!benchPaths.eqw) return null;
                    values = normalizeLength(benchPaths.eqw, effectiveLen);
                    break;
                  }
                  case "Buy & Hold SPY": {
                    if (!benchPaths.spy) return null;
                    values = normalizeLength(benchPaths.spy, effectiveLen);
                    break;
                  }
                  case "CVaR Min": {
                    if (!benchPaths.cvar) return null;
                    values = normalizeLength(benchPaths.cvar, effectiveLen);
                    break;
                  }
                  case "Risk Parity (InvVol)": {
                    if (!benchPaths.rp) return null;
                    values = normalizeLength(benchPaths.rp, effectiveLen);
                    break;
                  }
                  case "MVO (Max Sharpe)": {
                    if (!benchPaths.mvo) return null;
                    values = normalizeLength(benchPaths.mvo, effectiveLen);
                    break;
                  }
                  default:
                    return null;
                }
    
                if (!values || !values.length) return null;
    
                return {
                  label: row.label,
                  color: strategyColor(row.label, playerName),
                  values,
                };
              })
              .filter((x): x is StrategySeries => x !== null)
          : [];
    

  // ---------- interactions ----------

  function handleSliderChange(ticker: string, newVal: number) {
    if (!data) return;

    setSliders((prev) => {
      const tickers = data.tickers;
      const prevForThis = prev[ticker] ?? 0;
      const defaultTotal = 100;
      const prevTotal =
        tickers.reduce((sum, t) => sum + (prev[t] ?? 0), 0) || defaultTotal;

      const others = tickers.filter((t) => t !== ticker);
      const prevOthersTotal = prevTotal - prevForThis;
      const remaining = Math.max(0, 100 - newVal);

      const next: SliderState = { ...prev };
      next[ticker] = newVal;

      if (!others.length) return next;

      if (prevOthersTotal <= 0) {
        const equal = remaining / others.length;
        for (const t of others) next[t] = equal;
      } else {
        for (const t of others) {
          const prevVal = prev[t] ?? 0;
          const share = prevVal / prevOthersTotal;
          next[t] = remaining * share;
        }
      }

      return next;
    });
  }

  function handleNextDay() {
    if (!data) return;
    if (dayIndex >= maxDay) {
      setIsFinished(true);
      return;
    }

    const k = dayIndex;
    const monthReturns = data.assetReturns[k];

    if (!monthReturns || monthReturns.length !== data.tickers.length) {
      console.warn("Mismatched assetReturns at step", k);
      return;
    }

    const portRet = playerWeights.reduce(
      (acc, w, i) => acc + w * monthReturns[i],
      0
    );
    const newPlayerValue = playerValue * (1 + portRet);

    let newSpyValue = spyValue;
    if (spyIndex >= 0) {
      const spyR = monthReturns[spyIndex];
      newSpyValue = spyValue * (1 + spyR);
    }

    const eqw = 1 / data.tickers.length;
    const eqwRet = monthReturns.reduce((acc, r) => acc + eqw * r, 0);
    const newEqwValue = eqwValue * (1 + eqwRet);

    const nextIndex = Math.min(dayIndex + 1, maxDay);

    setPlayerValue(newPlayerValue);
    setSpyValue(newSpyValue);
    setEqwValue(newEqwValue);
    setDayIndex(nextIndex);
    if (nextIndex >= maxDay) setIsFinished(true);

    // extend playerPath so it always has value per month index
    setPlayerPath((prev) => {
      const arr = [...prev];
      if (arr.length === 0) {
        arr.push(INITIAL_CAPITAL);
      }
      if (arr.length <= nextIndex) {
        arr.length = nextIndex + 1;
      }
      arr[nextIndex] = newPlayerValue;
      return arr;
    });
  }

  function handleRestart() {
    if (!data) return;

    setDayIndex(0);
    setPlayerValue(INITIAL_CAPITAL);
    setSpyValue(INITIAL_CAPITAL);
    setEqwValue(INITIAL_CAPITAL);
    setPlayerPath([INITIAL_CAPITAL]);
    setIsFinished(false);

    const resetSliders: SliderState = {};
    const n = data.tickers.length || 1;
    const equal = 100 / n;
    data.tickers.forEach((t) => {
      resetSliders[t] = equal;
    });
    setSliders(resetSliders);
    setAutoRebalance(true);
  }

  // ---------- loading ----------

  if (loading || !data) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #020617 0, #020617 40%, #000 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e5e7eb",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>Loading market…</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Fetching TRPO and PPO trajectories and historical returns
          </div>
        </div>
      </main>
    );
  }

  // ---------- finish text (explicit winner) ----------

  let finishText = "";
  if (playerRank === 0) {
    finishText = `You won. 🥇 Gold. You beat every agent and benchmark this run.`;
  } else if (playerRank === 1) {
    finishText = `${winnerLabel} won this run. You took 🥈 Silver with one strategy ahead of you.`;
  } else if (playerRank === 2) {
    finishText = `${winnerLabel} won this run. You took 🥉 Bronze with two strategies ahead of you.`;
  } else if (playerRank >= 0) {
    finishText = `${winnerLabel} won this run. You finished #${playerRank + 1}.`;
  } else {
    finishText =
      "Game over. Some benchmarks were not available, so we could not rank you.";
  }

  // ---------- render ----------

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #020617 0, #020617 40%, #000 100%)",
        color: "#e5e7eb",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "24px 16px 32px",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1.1fr)",
          gap: 24,
        }}
      >
        {/* LEFT: HUD + controls */}
        <section
          style={{
            borderRadius: 24,
            border: "1px solid rgba(148,163,184,0.3)",
            background:
              "radial-gradient(circle at top left, rgba(30,64,175,0.45), transparent 55%), rgba(15,23,42,0.96)",
            padding: 20,
            boxShadow: "0 18px 40px rgba(15,23,42,0.9)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                Session
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Gold Rush Arena
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                  marginTop: 2,
                }}
              >
                {playerName} vs agents vs benchmarks
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(129,140,248,0.7)",
                background: "rgba(15,23,42,0.96)",
              }}
            >
              Month {dayIndex + 1} / {maxDay + 1} · {currentDate}
            </div>
          </div>

          {/* Only your big card on top */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: 18,
                background: "rgba(15,118,110,0.2)",
                border: "1px solid rgba(45,212,191,0.5)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "#a5f3fc",
                }}
              >
                {playerName}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                {formatMoney(playerValue)}
              </div>
              <div
                style={{
                  fontSize: 12,
                  marginTop: 2,
                  color:
                    playerReturnSinceStart >= 0 ? "#6ee7b7" : "#fca5a5",
                }}
              >
                {playerReturnSinceStart >= 0 ? "▲" : "▼"}{" "}
                {formatPct(playerReturnSinceStart)} since start
              </div>
            </div>
          </div>

          {/* sliders */}
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 18,
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(75,85,99,0.8)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Allocate your portfolio
              </div>
              <label
                style={{
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={autoRebalance}
                  onChange={(e) => setAutoRebalance(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                auto rebalance each month
              </label>
            </div>

            {/* grouped sliders */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(() => {
                const GROUPS = [
                  { title: "Equities", tickers: ["SPY", "QQQ", "IWM", "EFA"] },
                  { title: "Bonds", tickers: ["TLT", "IEF", "LQD", "HYG"] },
                  { title: "Commodities", tickers: ["GLD", "DBC"] },
                  { title: "Crypto", tickers: ["BTC-USD", "ETH-USD"] },
                  { title: "Currencies", tickers: ["UUP", "FXE"] },
                ];

                const groupedTickers = new Set<string>();
                GROUPS.forEach((g) =>
                  g.tickers.forEach((t) => groupedTickers.add(t))
                );

                const ungrouped =
                  data.tickers.filter((t) => !groupedTickers.has(t)) ?? [];

                const allGroups = [
                  ...GROUPS.map((g) => ({
                    title: g.title,
                    tickers: g.tickers.filter((t) => data.tickers.includes(t)),
                  })),
                  ...(ungrouped.length
                    ? [{ title: "Other", tickers: ungrouped }]
                    : []),
                ];

                return allGroups.map((group) => {
                  if (!group.tickers.length) return null;

                  return (
                    <div key={group.title}>
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: 1.5,
                          color: "#9ca3af",
                          margin: "4px 0 6px",
                        }}
                      >
                        {group.title}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {group.tickers.map((ticker) => {
                          const idx = data.tickers.indexOf(ticker);
                          if (idx === -1) return null;

                          const raw = sliders[ticker] ?? 0;
                          const w = playerWeights[idx] ?? 0;

                          return (
                            <div
                              key={ticker}
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "80px minmax(0, 1fr) 70px",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 12,
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  letterSpacing: 1,
                                  textTransform: "uppercase",
                                }}
                              >
                                {ticker}
                              </div>

                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={raw}
                                onChange={(e) =>
                                  handleSliderChange(
                                    ticker,
                                    Number(e.target.value)
                                  )
                                }
                              />

                              <div style={{ textAlign: "right" }}>
                                {(w * 100).toFixed(1)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Link
              href="/"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.6)",
                background: "rgba(15,23,42,0.9)",
                color: "#e5e7eb",
                fontSize: 12,
              }}
            >
              ⬅ Back to lobby
            </Link>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleRestart}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(107,114,128,0.9)",
                  background: "rgba(31,41,55,0.95)",
                  color: "#e5e7eb",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Reset sliders
              </button>
              <button
                onClick={handleNextDay}
                disabled={isFinished}
                style={{
                  padding: "9px 18px",
                  borderRadius: 999,
                  border: "none",
                  background: isFinished
                    ? "rgba(75,85,99,0.6)"
                    : "linear-gradient(135deg,#4f46e5,#7c3aed,#ec4899)",
                  color: "#f9fafb",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isFinished ? "default" : "pointer",
                  boxShadow: isFinished
                    ? "none"
                    : "0 14px 30px rgba(88,28,135,0.9)",
                }}
              >
                {isFinished ? "Game over" : "Next month"}
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT: standings + chart */}
        <section
          style={{
            borderRadius: 24,
            border: "1px solid rgba(148,163,184,0.3)",
            background:
              "radial-gradient(circle at top right, rgba(251,191,36,0.3), transparent 50%), rgba(15,23,42,0.96)",
            padding: 18,
            boxShadow: "0 18px 40px rgba(15,23,42,0.9)",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            Standings
          </div>

          {/* YOU */}
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
            YOU
          </div>
          <div style={{ marginBottom: 10 }}>
            <StandingsRow
              label={playerName}
              value={playerValue}
              ret={playerReturnSinceStart}
              color="#22c55e"
              medal={medalMap.get(playerName)}
              highlight
            />
          </div>

          {/* AGENTS */}
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
            AGENTS
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <StandingsRow
              label="TRPO Agent"
              value={trpoValue}
              ret={trpoReturnSinceStart}
              color="#a5b4fc"
              medal={medalMap.get("TRPO Agent")}
            />
            <StandingsRow
              label="PPO Agent"
              value={ppoValue}
              ret={ppoReturnSinceStart}
              color="#fb7185"
              medal={medalMap.get("PPO Agent")}
            />
          </div>

          {/* BENCHMARKS */}
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
            BENCHMARKS
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {benchValues?.eqw != null && (
              <StandingsRow
                label="Equal-Weight BH"
                value={benchValues.eqw}
                ret={benchValues.eqw / INITIAL_CAPITAL - 1}
                color="#38bdf8"
                medal={medalMap.get("Equal-Weight BH")}
            />
            )}
            {benchValues?.spy != null && (
              <StandingsRow
                label="Buy & Hold SPY"
                value={benchValues.spy}
                ret={benchValues.spy / INITIAL_CAPITAL - 1}
                color="#facc15"
                medal={medalMap.get("Buy & Hold SPY")}
              />
            )}
            {benchValues?.cvar != null && (
              <StandingsRow
                label="CVaR Min"
                value={benchValues.cvar}
                ret={benchValues.cvar / INITIAL_CAPITAL - 1}
                color="#e5e7eb"
                medal={medalMap.get("CVaR Min")}
              />
            )}
            {benchValues?.rp != null && (
              <StandingsRow
                label="Risk Parity (InvVol)"
                value={benchValues.rp}
                ret={benchValues.rp / INITIAL_CAPITAL - 1}
                color="#fb923c"
                medal={medalMap.get("Risk Parity (InvVol)")}
              />
            )}
            {benchValues?.mvo != null && (
              <StandingsRow
                label="MVO (Max Sharpe)"
                value={benchValues.mvo}
                ret={benchValues.mvo / INITIAL_CAPITAL - 1}
                color="#6366f1"
                medal={medalMap.get("MVO (Max Sharpe)")}
              />
            )}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Game ends when you reach the end of the historical window. TRPO and
            PPO paths come from your real models on 2020–2025 data. Your path
            and the benchmarks use the same monthly returns, all rebased to
            1M at the start.
          </div>

          {isFinished && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  maxWidth: 520,
                  width: "100%",
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid rgba(251,191,36,0.7)",
                  background: "rgba(23,37,84,0.95)",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {finishText}
              </div>
            </div>
          )}

          {/* Top 3 strategies chart */}
          <div
            style={{
              marginTop: 18,
            }}
          >
            {data && (
  <TopStrategiesChart
  dates={data.dates.slice(0, effectiveLen)}
  series={top3Series}
/>

)}

          </div>
        </section>
      </div>
    </main>
  );
}

export default function GamePage() {
    return (
      <Suspense
        fallback={
          <main
            style={{
              minHeight: "100vh",
              background:
                "radial-gradient(circle at top, #020617 0, #020617 40%, #000 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e5e7eb",
              fontFamily:
                "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>Loading game…</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                Preparing the arena
              </div>
            </div>
          </main>
        }
      >
        <GamePageInner />
      </Suspense>
    );
  }
  
// ---------- chart component ----------

type TopChartProps = {
  dates: string[];
  series: StrategySeries[];
};

function TopStrategiesChart({ dates, series }: TopChartProps) {
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

  // compute min/max for Y scale across all series
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
    globalMin = INITIAL_CAPITAL * 0.8;
    globalMax = INITIAL_CAPITAL * 1.2;
  }

  // add a little padding
  const paddingFrac = 0.05;
  const span = Math.max(1, globalMax - globalMin);
  const yMin = globalMin - span * paddingFrac;
  const yMax = globalMax + span * paddingFrac;

  const len = dates.length;
  const xTicks = [0, Math.floor((len - 1) / 2), len - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

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
          {/* horizontal grid lines + labels (on the left, in data-space) */}
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

          {/* series polylines */}
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

        {/* X axis ticks + labels */}
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
              {dates[idx]
                ? dates[idx].slice(0, 7) // YYYY-MM
                : ""}
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
          Month
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
