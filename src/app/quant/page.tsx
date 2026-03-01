"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Play,
  Plus,
  Trash2,
  Loader2,
  Activity,
  AlertTriangle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Holding {
  ticker: string;
  name: string;
  price: number;
  currency: string;
  volatility: number; // annualized decimal
  drift: number;      // annualized decimal
  weight: number;     // percent 0-100
  dataPoints: number;
}

interface HorizonResult {
  label: string;
  years: number;
  median: number;
  p10: number;
  p90: number;
  pLoss: number;
  p2x: number;
  fanSeries: FanPoint[];
}

interface FanPoint {
  month: number;
  p10: number;
  p50: number;
  p90: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const N_PATHS = 10000;
const HORIZONS: { label: string; years: number }[] = [
  { label: "6mo",  years: 0.5  },
  { label: "1yr",  years: 1    },
  { label: "5yr",  years: 5    },
  { label: "10yr", years: 10   },
  { label: "20yr", years: 20   },
  { label: "30yr", years: 30   },
];

const STARTING_BANKROLL = 500;

// ─── Math ────────────────────────────────────────────────────────────────────
function randn(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(p * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function choleskyDecompose(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(0, matrix[i][i] - sum));
      } else {
        L[i][j] = L[j][j] > 0 ? (matrix[i][j] - sum) / L[j][j] : 0;
      }
    }
  }
  return L;
}

function runAllHorizons(
  holdings: Holding[],
  totalValue: number,
  expectedAnnualReturn: number,  // target median growth rate per year (e.g. 0.12 = 12%)
  corrMatrix: number[][] | null  // Cholesky correlation matrix, null = independent
): HorizonResult[] {
  const nAssets = holdings.length;
  const weights = holdings.map((h) => h.weight / 100);
  // Precompute Cholesky factor once (reused across all horizons + paths)
  const L = corrMatrix && nAssets > 1 ? choleskyDecompose(corrMatrix) : null;

  return HORIZONS.map((hz) => {
    const terminals: number[] = new Array(N_PATHS);

    for (let i = 0; i < N_PATHS; i++) {
      // Draw independent normals then apply Cholesky for correlated shocks
      const Z_raw = Array.from({ length: nAssets }, () => randn());
      const Z_corr: number[] = new Array(nAssets).fill(0);
      if (L) {
        for (let row = 0; row < nAssets; row++) {
          for (let col = 0; col <= row; col++) {
            Z_corr[row] += L[row][col] * Z_raw[col];
          }
        }
      } else {
        for (let k = 0; k < nAssets; k++) Z_corr[k] = Z_raw[k];
      }

      let portfolioEnd = 0;
      for (let j = 0; j < nAssets; j++) {
        const h = holdings[j];
        const positionValue = totalValue * weights[j];
        // Target median = expectedAnnualReturn per year.
        // S(T) = S0 * exp(r*T + σ*√T*Z_corr[j])
        const ST =
          positionValue *
          Math.exp(
            expectedAnnualReturn * hz.years +
              h.volatility * Math.sqrt(hz.years) * Z_corr[j]
          );
        portfolioEnd += ST;
      }
      terminals[i] = portfolioEnd;
    }

    const sorted = [...terminals].sort((a, b) => a - b);
    const p10 = percentile(sorted, 0.1);
    const p50 = percentile(sorted, 0.5);
    const p90 = percentile(sorted, 0.9);
    const pLoss =
      (sorted.filter((v) => v < totalValue).length / N_PATHS) * 100;
    const p2x =
      (sorted.filter((v) => v >= totalValue * 2).length / N_PATHS) * 100;

    // Fan chart — monthly interpolation
    const totalMonths = Math.max(Math.round(hz.years * 12), 1);
    const step = totalMonths <= 60 ? 1 : Math.ceil(totalMonths / 60);
    const fanSeries: FanPoint[] = [];
    for (let m = 0; m <= totalMonths; m += step) {
      const t = m / 12;
      const scale = t / hz.years;
      fanSeries.push({
        month: m,
        p10: totalValue + (p10 - totalValue) * scale,
        p50: totalValue + (p50 - totalValue) * scale,
        p90: totalValue + (p90 - totalValue) * scale,
      });
    }
    // make sure last point is included
    if (fanSeries[fanSeries.length - 1].month !== totalMonths) {
      fanSeries.push({ month: totalMonths, p10, p50, p90 });
    }

    return {
      label: hz.label,
      years: hz.years,
      median: p50,
      p10,
      p90,
      pLoss,
      p2x,
      fanSeries,
    };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(v: number): string {
  if (v >= 1_000_000_000_000) return `$${(v / 1_000_000_000_000).toFixed(2)}T`;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1000).toLocaleString()}k`;
  return `$${Math.round(v)}`;
}

function fmtFull(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtPnl(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

// ─── Fan Tooltip ──────────────────────────────────────────────────────────────
function FanTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1A1816] bg-[#0D0C0A] px-3 py-2 text-xs shadow-xl">
      <p className="text-[#6B6560] mb-1">Month {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmtFull(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Scenario Card ────────────────────────────────────────────────────────────
function ScenarioCard({
  result,
  totalValue,
  selected,
  onClick,
}: {
  result: HorizonResult;
  totalValue: number;
  selected: boolean;
  onClick: () => void;
}) {
  const gain = result.median >= totalValue;
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all w-full ${
        selected
          ? "border-[#B8956A]/60 bg-[#B8956A]/10 ring-1 ring-[#B8956A]/30"
          : "border-[#B8956A]/15 bg-[#111010] hover:border-[#B8956A]/30"
      }`}
    >
      <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-2">
        {result.label} Horizon
      </p>
      <p
        className={`text-lg font-bold font-mono ${
          gain ? "text-[#B8956A]" : "text-red-400"
        }`}
      >
        {fmt(result.median)}
      </p>
      <p className="text-[10px] text-[#6B6560] mt-0.5">median outcome</p>

      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-[#6B6560]">P10 (bear)</span>
          <span className="font-mono text-red-400">{fmt(result.p10)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-[#6B6560]">P90 (bull)</span>
          <span className="font-mono text-green-400">{fmt(result.p90)}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#1A1816] space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-[#6B6560]">Loss prob</span>
          <span
            className={`font-mono ${
              result.pLoss > 40
                ? "text-red-400"
                : result.pLoss > 20
                ? "text-yellow-400"
                : "text-green-400"
            }`}
          >
            {result.pLoss.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-[#6B6560]">2x prob</span>
          <span
            className={`font-mono ${
              result.p2x > 50 ? "text-green-400" : "text-[#E8E4DF]"
            }`}
          >
            {result.p2x.toFixed(1)}%
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Arb Scanner ─────────────────────────────────────────────────────────────
interface FundingRateData {
  fundingRate: number;
  nextFundingTime: number;
  fetchedAt: number;
}

function getFundingStatus(
  rate8h: number
): { emoji: string; label: string; color: string } {
  const pct = rate8h * 100;
  if (pct < 0)
    return { emoji: "\u{1F535}", label: "Negative \u2014 shorts paying", color: "text-blue-400" };
  if (pct < 0.01)
    return { emoji: "\u26AA", label: "Neutral \u2014 no arb", color: "text-[#6B6560]" };
  if (pct < 0.04)
    return { emoji: "\u{1F7E1}", label: "Mild \u2014 watch", color: "text-yellow-400" };
  return { emoji: "\u{1F534}", label: "Elevated \u2014 arb opportunity", color: "text-red-400" };
}

function formatNextFunding(tsMs: number): string {
  if (!tsMs) return "\u2014";
  const d = new Date(tsMs);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
    timeZoneName: "short",
  });
}

const PRED_SPREADS = [
  {
    event: "March FOMC: No cut",
    kalshi: "95.5\u00A2",
    poly: "94.6\u00A2",
    spread: "0.9%",
    signal: "Too thin",
  },
  {
    event: "April FOMC: No cut",
    kalshi: "87\u00A2",
    poly: "87\u00A2",
    spread: "0.0%",
    signal: "\u2014",
  },
];

function ArbScannerSection() {
  const [funding, setFunding] = useState<FundingRateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFunding = useCallback(async () => {
    try {
      const res = await fetch(
        "https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP"
      );
      const json = await res.json();
      const d = json?.data?.[0];
      if (!d) throw new Error("No data");
      setFunding({
        fundingRate: parseFloat(d.fundingRate),
        nextFundingTime: parseInt(d.nextFundingTime, 10),
        fetchedAt: Date.now(),
      });
      setError(null);
    } catch {
      setError("Failed to fetch OKX funding rate");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunding();
    const id = setInterval(fetchFunding, 60_000);
    return () => clearInterval(id);
  }, [fetchFunding]);

  const rate8h = funding?.fundingRate ?? 0;
  const pct8h = rate8h * 100;
  const annualized = rate8h * 3 * 365 * 100;
  const status = getFundingStatus(rate8h);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560]">
          Arb Scanner (Live)
        </h2>
        <p className="text-[10px] text-[#6B6560] mt-0.5">
          Monitoring funding rate arb + cross-venue prediction market spreads
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* BTC Funding Rate Card */}
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#E8E4DF]">
                BTC Funding Rate
              </p>
              <p className="text-[10px] text-[#6B6560]">
                OKX · BTC-USDT-SWAP · live
              </p>
            </div>
            <span className="text-[10px] text-[#6B6560] bg-[#1A1816] rounded px-2 py-1">
              {funding
                ? `Updated ${new Date(funding.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })}`
                : "\u2014"}
            </span>
          </div>

          {loading && (
            <p className="text-[10px] text-[#6B6560]">Fetching\u2026</p>
          )}
          {error && <p className="text-[10px] text-red-400">{error}</p>}
          {!loading && !error && funding && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-[#1A1816] pb-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">
                    8h rate
                  </span>
                  <span className="text-sm font-mono font-bold text-[#E8E4DF]">
                    {pct8h >= 0 ? "+" : ""}
                    {pct8h.toFixed(4)}%
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1A1816] pb-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">
                    Annualized est.
                  </span>
                  <span className="text-sm font-mono font-bold text-[#B8956A]">
                    {annualized >= 0 ? "+" : ""}
                    {annualized.toFixed(2)}%/yr
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1A1816] pb-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">
                    Next funding
                  </span>
                  <span className="text-[10px] font-mono text-[#E8E4DF]">
                    {formatNextFunding(funding.nextFundingTime)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-[#1A1816] bg-[#0A0908] px-3 py-2">
                <span className="text-base">{status.emoji}</span>
                <span className={`text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>

              <p className="text-[10px] text-[#6B6560] leading-relaxed border-t border-[#1A1816] pt-3">
                <span className="text-[#B8956A] font-medium">
                  Strategy note:
                </span>{" "}
                When funding is elevated (&gt;0.04%/8h), go long spot + short
                perp to collect the spread with zero directional exposure.
              </p>
            </>
          )}
        </div>

        {/* Prediction Market Spreads Card */}
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#E8E4DF]">
              Prediction Market Spreads
            </p>
            <p className="text-[10px] text-[#6B6560]">
              Kalshi vs Polymarket · manually tracked
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#1A1816]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1A1816]">
                  <th className="text-left text-[#6B6560] font-medium px-3 py-2 uppercase tracking-wider text-[9px]">
                    Event
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-2 py-2 uppercase tracking-wider text-[9px]">
                    Kalshi
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-2 py-2 uppercase tracking-wider text-[9px]">
                    Poly
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-2 py-2 uppercase tracking-wider text-[9px]">
                    Spread
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2 uppercase tracking-wider text-[9px]">
                    Signal
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRED_SPREADS.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-[#E8E4DF] text-[10px] leading-snug">
                      {row.event}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[#E8E4DF]">
                      {row.kalshi}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[#E8E4DF]">
                      {row.poly}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[#6B6560]">
                      {row.spread}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#1A1816] text-[#6B6560]">
                        {row.signal}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-[#6B6560] leading-relaxed border-t border-[#1A1816] pt-3">
            Spreads update manually — alert threshold:{" "}
            <span className="text-[#B8956A] font-medium">&gt;3% spread</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── BTC Signal Log ───────────────────────────────────────────────────────────
function BtcSignalLog() {
  const signals = useQuery(api.btcSignals.listSignals);

  if (signals === undefined) {
    return (
      <div className="flex items-center justify-center py-8 text-[#6B6560] text-sm">
        Loading signals\u2026
      </div>
    );
  }

  const resolved = signals.filter((s) => s.outcome !== undefined);
  const correct = resolved.filter((s) => s.correct === true).length;
  const accuracy =
    resolved.length > 0 ? (correct / resolved.length) * 100 : null;
  const recent = signals.slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560]">
            BTC 5M Candle Signal Log
          </h2>
          <p className="text-[10px] text-[#6B6560] mt-0.5">
            Auto-signals fired when candle move &ge; 0.10% · resolved next run
          </p>
        </div>
        <div className="flex items-center gap-4">
          {accuracy !== null && (
            <div className="text-right">
              <p
                className={`text-lg font-bold font-mono ${accuracy >= 60 ? "text-green-400" : accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}
              >
                {accuracy.toFixed(1)}%
              </p>
              <p className="text-[9px] text-[#6B6560]">
                {correct}/{resolved.length} correct
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="text-lg font-bold font-mono text-[#E8E4DF]">
              {signals.length}
            </p>
            <p className="text-[9px] text-[#6B6560]">total signals</p>
          </div>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-6 text-center text-[#6B6560] text-sm">
          No signals yet — cron fires every 5 min at{" "}
          <code className="text-[#B8956A]">*/5 * * * *</code>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-[#1A1816]">
                <th className="text-left text-[#6B6560] font-medium px-4 py-2.5 uppercase tracking-wider text-[9px]">
                  Candle Open (UTC)
                </th>
                <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                  Open
                </th>
                <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                  Signal @
                </th>
                <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                  Dir
                </th>
                <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                  Move%
                </th>
                <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                  My Prob
                </th>
                <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                  Close
                </th>
                <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => {
                const isResolved = s.outcome !== undefined;
                const dirUp = s.signal_direction === "UP";
                return (
                  <tr
                    key={s._id}
                    className="border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-[#6B6560] text-[10px] whitespace-nowrap">
                      {new Date(s.candle_open_time)
                        .toLocaleString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                          timeZone: "UTC",
                        })
                        .replace(",", "")}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#E8E4DF]">
                      $
                      {s.open_price.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#E8E4DF]">
                      $
                      {s.signal_price.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                          dirUp
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {dirUp ? "\u25B2 UP" : "\u25BC DN"}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono ${dirUp ? "text-green-400" : "text-red-400"}`}
                    >
                      {dirUp ? "+" : ""}
                      {s.signal_confidence.toFixed(3)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#B8956A]">
                      {s.my_probability}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#6B6560]">
                      {s.close_price !== undefined ? (
                        `$${s.close_price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      ) : (
                        <span className="text-[#3A3830] italic">pending</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {!isResolved ? (
                        <span className="text-[9px] text-[#3A3830] italic">
                          \u2014
                        </span>
                      ) : s.correct ? (
                        <span className="text-green-400 font-bold">
                          \u2713
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold">
                          \u2717
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-[#6B6560]">
        Interval:{" "}
        <span className="text-[#B8956A] font-mono">5M</span> · Threshold:{" "}
        <span className="text-[#B8956A] font-mono">0.10%</span> · ~80\u2013100
        signals/day after filter ·{" "}
        Run{" "}
        <code className="text-[#B8956A]">
          INTERVAL=1H node scripts/btc-signal.js
        </code>{" "}
        for 1-hour mode
      </p>
    </div>
  );
}

// ─── Paper Trades Tab ─────────────────────────────────────────────────────────
function PaperTradesTab() {
  const trades = useQuery(api.polymarket.listTrades);

  if (trades === undefined) {
    return (
      <div className="flex items-center justify-center py-16 text-[#6B6560] text-sm">
        Loading trades\u2026
      </div>
    );
  }

  const openTrades = trades.filter((t) => !t.resolved);
  const resolvedTrades = trades.filter((t) => t.resolved);

  const deployed = openTrades.reduce((s, t) => s + t.kelly_stake, 0);
  const totalPnl = resolvedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const cash = STARTING_BANKROLL - deployed;

  let brierScore: number | null = null;
  if (resolvedTrades.length > 0) {
    const mse =
      resolvedTrades.reduce((s, t) => {
        const p = t.my_probability / 100;
        const o = t.outcome ? 1 : 0;
        return s + (p - o) ** 2;
      }, 0) / resolvedTrades.length;
    brierScore = 1 - mse;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
          <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">
            Starting Bankroll
          </p>
          <p className="text-lg font-bold font-mono text-[#E8E4DF]">
            ${STARTING_BANKROLL}
          </p>
          <p className="text-[10px] text-[#6B6560] mt-0.5">paper $</p>
        </div>
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
          <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">
            Deployed
          </p>
          <p className="text-lg font-bold font-mono text-[#E8E4DF]">
            ${deployed.toFixed(0)}
          </p>
          <p className="text-[10px] text-[#6B6560] mt-0.5">
            {openTrades.length} open position
            {openTrades.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
          <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">
            Cash Remaining
          </p>
          <p className="text-lg font-bold font-mono text-[#E8E4DF]">
            ${cash.toFixed(0)}
          </p>
          <p className="text-[10px] text-[#6B6560] mt-0.5">undeployed</p>
        </div>
        <div
          className={`rounded-xl border p-4 ${totalPnl > 0 ? "border-[#B8956A]/40 bg-[#B8956A]/5" : totalPnl < 0 ? "border-red-500/20 bg-red-500/5" : "border-[#1A1816] bg-[#0D0C0A]"}`}
        >
          <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">
            Total P&amp;L
          </p>
          <p
            className={`text-lg font-bold font-mono ${totalPnl > 0 ? "text-[#B8956A]" : totalPnl < 0 ? "text-red-400" : "text-[#E8E4DF]"}`}
          >
            {resolvedTrades.length === 0 ? "\u2013" : fmtPnl(totalPnl)}
          </p>
          <p className="text-[10px] text-[#6B6560] mt-0.5">
            {resolvedTrades.length} resolved
          </p>
        </div>
      </div>

      {resolvedTrades.length > 0 && brierScore !== null && (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">
              Brier Score
            </p>
            <p className="text-2xl font-bold font-mono text-[#B8956A]">
              {brierScore.toFixed(3)}
            </p>
            <p className="text-[10px] text-[#6B6560] mt-0.5">
              1 \u2212 MSE · higher = better · max 1.0
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#6B6560]">
              N = {resolvedTrades.length} resolved
            </p>
            <p className="text-[10px] text-[#6B6560] mt-0.5">
              {brierScore >= 0.9
                ? "\u{1F7E2} Sharp"
                : brierScore >= 0.75
                ? "\u{1F7E1} Decent"
                : "\u{1F534} Needs calibration"}
            </p>
          </div>
        </div>
      )}

      {/* Open Positions */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560] mb-3">
          Open Positions · {openTrades.length}
        </h2>
        {openTrades.length === 0 ? (
          <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-6 text-center text-[#6B6560] text-sm">
            No open positions
          </div>
        ) : (
          <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="border-b border-[#1A1816]">
                  <th className="text-left text-[#6B6560] font-medium px-4 py-2.5 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">
                    Pos
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">
                    Entry%
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider hidden sm:table-cell">
                    My%
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider hidden sm:table-cell">
                    Edge
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">
                    Stake
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">
                    Resolves
                  </th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map((t) => {
                  const edge = t.my_probability - t.entry_price;
                  return (
                    <tr
                      key={t._id}
                      className="border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors cursor-pointer"
                      onClick={() => window.open(t.market_url, "_blank")}
                    >
                      <td className="px-4 py-3 text-[#E8E4DF] max-w-[260px]">
                        <div className="flex items-start gap-2">
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                            style={{
                              background: "#1A1816",
                              color: "#6B6560",
                              border: "1px solid #1A1816",
                            }}
                          >
                            {t.category}
                          </span>
                          <span
                            className="truncate leading-relaxed"
                            title={t.question}
                          >
                            {t.question}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            t.position === "Yes"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {t.position}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">
                        {t.entry_price}%
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF] hidden sm:table-cell">
                        {t.my_probability}%
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-mono font-semibold hidden sm:table-cell ${edge > 0 ? "text-green-400" : edge < 0 ? "text-red-400" : "text-[#6B6560]"}`}
                      >
                        {edge > 0 ? "+" : ""}
                        {edge}pp
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">
                        ${t.kelly_stake}
                      </td>
                      <td className="px-3 py-3 text-right text-[#6B6560]">
                        {t.resolve_date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolved Trades */}
      {resolvedTrades.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560] mb-3">
            Resolved Trades · {resolvedTrades.length}
          </h2>
          <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-x-auto">
            <table className="w-full text-xs min-w-[480px]">
              <thead>
                <tr className="border-b border-[#1A1816]">
                  <th className="text-left text-[#6B6560] font-medium px-4 py-2.5 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">
                    Pos
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">
                    Entry%
                  </th>
                  <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">
                    P&amp;L
                  </th>
                  <th className="text-left text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider hidden sm:table-cell">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {resolvedTrades.map((t) => {
                  const won =
                    (t.position === "Yes" && t.outcome === true) ||
                    (t.position === "No" && t.outcome === false);
                  return (
                    <tr
                      key={t._id}
                      className="border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors cursor-pointer"
                      onClick={() => window.open(t.market_url, "_blank")}
                    >
                      <td className="px-4 py-3 text-[#E8E4DF] max-w-[200px]">
                        <span className="truncate block" title={t.question}>
                          {t.question}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            t.position === "Yes"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {t.position}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">
                        {t.entry_price}%
                      </td>
                      <td className="px-3 py-3 text-center text-base">
                        {won ? "\u2713" : "\u2717"}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-mono font-semibold ${(t.pnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {t.pnl !== undefined ? fmtPnl(t.pnl) : "\u2013"}
                      </td>
                      <td className="px-3 py-3 text-[#6B6560] max-w-[200px] hidden sm:table-cell">
                        <span className="truncate block" title={t.notes}>
                          {t.notes}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ArbScannerSection />
      <BtcSignalLog />

      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-4">
        <p className="text-[10px] text-[#6B6560] leading-relaxed">
          <span className="text-[#B8956A] font-medium">
            Paper trading only.
          </span>{" "}
          No real money deployed. Kelly stakes sized on ${STARTING_BANKROLL}{" "}
          bankroll. Edge = my probability \u2212 market implied probability.
          Resolve trades via Convex dashboard \u2192{" "}
          <code className="text-[#B8956A]">polymarket:resolveTrade</code>.{" "}
          <span className="text-amber-400">
            \u26A0\uFE0F Not financial advice.
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuantPage() {
  const [activeTab, setActiveTab] = useState<"simulator" | "paper-trades">(
    "simulator"
  );

  // Portfolio builder state
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [tickerInput, setTickerInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(100000);
  const [expectedReturn, setExpectedReturn] = useState(12); // % per year, median target

  // Simulation state
  const [corrMatrix, setCorrMatrix] = useState<number[][] | null>(null);
  const [corrLoading, setCorrLoading] = useState(false);
  const [results, setResults] = useState<HorizonResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState(1); // index into results
  const runRef = useRef(0);

  const totalWeight = holdings.reduce((s, h) => s + h.weight, 0);
  const weightsValid = Math.abs(totalWeight - 100) < 0.01;

  // Blended portfolio volatility (weighted average)
  const blendedVol = holdings.reduce(
    (s, h) => s + (h.weight / 100) * h.volatility,
    0
  );

  const addTicker = async () => {
    const ticker = tickerInput.toUpperCase().trim();
    if (!ticker) return;
    if (holdings.find((h) => h.ticker === ticker)) {
      setFetchError(`${ticker} already in portfolio`);
      return;
    }

    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/quant/stock?ticker=${ticker}`);
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || "Failed to fetch");
        return;
      }
      setHoldings((prev) => [
        ...prev,
        {
          ticker: data.ticker,
          name: data.name,
          price: data.price,
          currency: data.currency,
          volatility: data.volatility,
          drift: data.drift,
          weight: 0,
          dataPoints: data.dataPoints,
        },
      ]);
      setTickerInput("");
    } catch {
      setFetchError("Network error");
    } finally {
      setFetching(false);
    }
  };

  const removeHolding = (ticker: string) => {
    setHoldings((prev) => prev.filter((h) => h.ticker !== ticker));
  };

  const setWeight = (ticker: string, weight: number) => {
    setHoldings((prev) =>
      prev.map((h) => (h.ticker === ticker ? { ...h, weight } : h))
    );
  };

  const runSim = useCallback(async () => {
    if (!weightsValid || holdings.length === 0) return;
    setRunning(true);

    // Fetch correlation matrix for 2+ holdings
    let corr: number[][] | null = null;
    if (holdings.length > 1) {
      try {
        setCorrLoading(true);
        const tickers = holdings.map((h) => h.ticker).join(",");
        const res = await fetch(`/api/quant/correlation?tickers=${encodeURIComponent(tickers)}`);
        const data = await res.json();
        corr = data.matrix || null;
        setCorrMatrix(corr);
      } catch {
        corr = null;
      } finally {
        setCorrLoading(false);
      }
    } else {
      setCorrMatrix(null);
    }

    const id = ++runRef.current;
    setTimeout(() => {
      if (runRef.current !== id) return;
      const res = runAllHorizons(holdings, totalValue, expectedReturn / 100, corr);
      setResults(res);
      setSelectedHorizon(1);
      setRunning(false);
    }, 30);
  }, [holdings, totalValue, expectedReturn, weightsValid]);

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#B8956A]/20 bg-gradient-to-br from-[#B8956A]/10 via-[#B8956A]/5 to-transparent p-6 sm:p-8">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#B8956A]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#CDAA7E]/5 blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#B8956A] to-[#CDAA7E] shadow-lg shadow-[#B8956A]/20">
            <TrendingUp className="h-6 w-6 text-[#060606]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#E8E4DF] sm:text-3xl font-[family-name:var(--font-syne)]">
              Quant / Portfolio Risk
            </h1>
            <p className="text-sm text-[#6B6560] mt-1">
              Monte Carlo simulation · {N_PATHS.toLocaleString()} paths ·
              Geometric Brownian Motion · Live prices
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-1 w-fit">
        <button
          onClick={() => setActiveTab("simulator")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
            activeTab === "simulator"
              ? "bg-[#B8956A] text-[#060606] shadow-sm"
              : "text-[#6B6560] hover:text-[#E8E4DF]"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Simulator
        </button>
        <button
          onClick={() => setActiveTab("paper-trades")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
            activeTab === "paper-trades"
              ? "bg-[#B8956A] text-[#060606] shadow-sm"
              : "text-[#6B6560] hover:text-[#E8E4DF]"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Paper Trades
        </button>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "paper-trades" ? (
        <PaperTradesTab />
      ) : (
        <>
          {/* ── Portfolio Builder ── */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560]">
              Portfolio Builder
            </h2>

            {/* Add ticker row */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && addTicker()}
                placeholder="Ticker (e.g. AAPL)"
                className="rounded-lg border border-[#1A1816] bg-[#0D0C0A] px-4 py-2.5 text-sm font-mono text-[#E8E4DF] placeholder:text-[#3A3830] focus:outline-none focus:border-[#B8956A]/40 w-48"
              />
              <button
                onClick={addTicker}
                disabled={fetching || !tickerInput.trim()}
                className="flex items-center gap-2 rounded-lg border border-[#B8956A]/30 bg-[#B8956A]/10 px-4 py-2.5 text-sm font-medium text-[#B8956A] hover:bg-[#B8956A]/20 transition-all disabled:opacity-40"
              >
                {fetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </button>
              {fetchError && (
                <span className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {fetchError}
                </span>
              )}
            </div>

            {/* Holdings table */}
            {holdings.length > 0 && (
              <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-x-auto">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#1A1816]">
                      <th className="text-left text-[#6B6560] font-medium px-4 py-2.5 uppercase tracking-wider text-[9px]">
                        Ticker
                      </th>
                      <th className="text-left text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                        Name
                      </th>
                      <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                        Price
                      </th>
                      <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                        Vol%/yr
                      </th>
                      <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                        Drift%/yr
                      </th>
                      <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">
                        Weight %
                      </th>
                      <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px] w-12">
                        &nbsp;
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => (
                      <tr
                        key={h.ticker}
                        className="border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-[#B8956A]">
                          {h.ticker}
                        </td>
                        <td className="px-3 py-3 text-[#E8E4DF]">{h.name}</td>
                        <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">
                          ${h.price.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">
                          {(h.volatility * 100).toFixed(1)}%
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-mono ${h.drift >= 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {h.drift >= 0 ? "+" : ""}
                          {(h.drift * 100).toFixed(1)}%
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={h.weight}
                            onChange={(e) =>
                              setWeight(
                                h.ticker,
                                Math.max(
                                  0,
                                  Math.min(100, Number(e.target.value) || 0)
                                )
                              )
                            }
                            className="w-16 rounded border border-[#1A1816] bg-[#0A0908] px-2 py-1 text-center font-mono text-[#E8E4DF] focus:outline-none focus:border-[#B8956A]/40"
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => removeHolding(h.ticker)}
                            className="text-[#6B6560] hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary row */}
            {holdings.length > 0 && (
              <div className="flex flex-wrap items-center gap-6">
                {/* Total weight */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">
                    Total Weight:
                  </span>
                  <span
                    className={`text-sm font-bold font-mono ${
                      weightsValid ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {totalWeight.toFixed(0)}%
                  </span>
                  {!weightsValid && (
                    <span className="text-[10px] text-red-400">
                      (must be 100%)
                    </span>
                  )}
                </div>

                {/* Portfolio value */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">
                    Portfolio $:
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={1000}
                    value={totalValue}
                    onChange={(e) =>
                      setTotalValue(Math.max(1, Number(e.target.value) || 0))
                    }
                    className="w-32 rounded border border-[#1A1816] bg-[#0A0908] px-3 py-1.5 font-mono text-sm text-[#E8E4DF] focus:outline-none focus:border-[#B8956A]/40"
                  />
                </div>

                {/* Expected annual return */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">
                    Exp. Return:
                  </span>
                  <input
                    type="number"
                    min={-50}
                    max={100}
                    step={1}
                    value={expectedReturn}
                    onChange={(e) =>
                      setExpectedReturn(Math.max(-50, Math.min(100, Number(e.target.value) || 0)))
                    }
                    className="w-20 rounded border border-[#1A1816] bg-[#0A0908] px-3 py-1.5 font-mono text-sm text-[#E8E4DF] focus:outline-none focus:border-[#B8956A]/40"
                  />
                  <span className="text-xs text-[#6B6560]">%/yr</span>
                </div>

                {/* Blended vol */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">
                    Blended Vol:
                  </span>
                  <span className="text-sm font-mono text-[#E8E4DF]">
                    {(blendedVol * 100).toFixed(1)}%/yr
                  </span>
                </div>

                {/* Correlation status */}
                {holdings.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${corrMatrix ? "bg-[#B8956A]" : "bg-[#3A3530]"}`} />
                    <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">
                      {corrLoading ? "Fetching corr…" : corrMatrix ? `${holdings.length}×${holdings.length} corr` : "Run to correlate"}
                    </span>
                  </div>
                )}

                {/* Run button */}
                <button
                  onClick={runSim}
                  disabled={running || !weightsValid || holdings.length === 0}
                  className="flex items-center gap-2 rounded-xl border border-[#B8956A]/30 bg-[#B8956A]/10 px-5 py-2 text-sm font-medium text-[#B8956A] hover:bg-[#B8956A]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                >
                  {running ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {running ? "Running\u2026" : "Run Simulation"}
                </button>
              </div>
            )}
          </div>

          {/* ── Results ── */}
          {results && (
            <>
              {/* Scenario cards — 2x3 grid */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560] mb-3">
                  Scenario Outcomes · {N_PATHS.toLocaleString()} paths ·{" "}
                  {fmtFull(totalValue)} portfolio
                </h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {results.map((r, i) => (
                    <ScenarioCard
                      key={r.label}
                      result={r}
                      totalValue={totalValue}
                      selected={selectedHorizon === i}
                      onClick={() => setSelectedHorizon(i)}
                    />
                  ))}
                </div>
              </div>

              {/* Fan Chart */}
              <div className="rounded-xl border border-[#B8956A]/15 bg-[#111010] p-5">
                {/* Horizon tabs */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560]">
                    Scenario Fan · P10 / P50 / P90
                  </h2>
                  <div className="flex items-center gap-1 rounded-lg border border-[#1A1816] bg-[#0D0C0A] p-0.5">
                    {results.map((r, i) => (
                      <button
                        key={r.label}
                        onClick={() => setSelectedHorizon(i)}
                        className={`rounded-md px-3 py-1 text-[10px] font-medium transition-all ${
                          selectedHorizon === i
                            ? "bg-[#B8956A] text-[#060606]"
                            : "text-[#6B6560] hover:text-[#E8E4DF]"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-[#6B6560] mb-4">
                  {results[selectedHorizon].label} horizon · Linear
                  interpolation of terminal quantile paths
                </p>

                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={results[selectedHorizon].fanSeries}
                    margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                  >
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "#6B6560" }}
                      tickLine={false}
                      axisLine={{ stroke: "#1A1816" }}
                      tickFormatter={(m: number) =>
                        m >= 12 ? `${(m / 12).toFixed(0)}yr` : `${m}m`
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#6B6560" }}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(v: number) => fmt(v)}
                    />
                    <Tooltip content={<FanTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 10, color: "#6B6560" }}
                    />
                    <ReferenceLine
                      y={totalValue}
                      stroke="#B8956A"
                      strokeDasharray="4 3"
                    />
                    <Line
                      type="monotone"
                      dataKey="p10"
                      name="P10 (bear)"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="p50"
                      name="P50 (median)"
                      stroke="#B8956A"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="p90"
                      name="P90 (bull)"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Methodology note */}
              <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-4">
                <p className="text-[10px] text-[#6B6560] leading-relaxed">
                  <span className="text-[#B8956A] font-medium">How This Works —</span>{" "}
                  Each of the {N_PATHS.toLocaleString()} simulated paths uses{" "}
                  <span className="text-[#9A8878] font-medium">Geometric Brownian Motion (GBM)</span> — the
                  same model used by options traders and institutional risk desks. Every position grows via{" "}
                  <span className="text-[#9A8878] font-medium italic">S(T) = S₀ × e^(r·T + σ·√T·Z)</span>,
                  where <span className="text-[#9A8878] font-medium">r</span> is your expected annual return,{" "}
                  <span className="text-[#9A8878] font-medium">σ</span> is each stock&apos;s realized
                  volatility pulled from one year of live daily price history,{" "}
                  <span className="text-[#9A8878] font-medium">T</span> is the time horizon in years, and{" "}
                  <span className="text-[#9A8878] font-medium">Z</span> is a random shock drawn from a standard
                  normal distribution — ensuring the median outcome compounds at exactly your target return while
                  volatility fans the distribution into a range of outcomes. When multiple holdings are present, a{" "}
                  <span className="text-[#9A8878] font-medium">Cholesky-decomposed correlation matrix</span> is
                  built from live return data so correlated assets generate correlated shocks rather than
                  independent ones, producing a more realistic portfolio distribution.{" "}
                  <span className="text-[#9A8878] font-medium">P10</span> is the outcome in the worst 10% of
                  scenarios, <span className="text-[#9A8878] font-medium">P50</span> is the median, and{" "}
                  <span className="text-[#9A8878] font-medium">P90</span> is the best 10%.{" "}
                  <span className="text-amber-400">⚠️ Not financial advice.</span>
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
