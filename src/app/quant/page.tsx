"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { TrendingUp, Play, Edit2, ChevronDown, ChevronUp, Activity } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Position {
  ticker: string;
  name: string;
  value: number;
  volatility: number; // annualized, e.g. 0.85 = 85%
  drift: number;      // annualized expected return, e.g. 0.15 = 15%
  account: string;
}

interface SimResults {
  paths: number[];          // N_PATHS terminal portfolio values
  mean: number;
  p10: number;
  p50: number;
  p90: number;
  pLoss: number;            // probability of loss (< total invested)
  p2x: number;              // probability of doubling
  totalInvested: number;
  buckets: BucketDatum[];
  fanSeries: FanPoint[];    // P10/P50/P90 over time
}

interface BucketDatum {
  label: string;
  midpoint: number;
  count: number;
  zone: "loss" | "moderate" | "gain";
}

interface FanPoint {
  month: number;
  p10: number;
  p50: number;
  p90: number;
}

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_POSITIONS: Position[] = [
  { ticker: "SEZL",  name: "Sezzle",        value: 108185, volatility: 0.85, drift: 0.15, account: "Roth IRA"   },
  { ticker: "IREN",  name: "IREN Ltd",       value: 37987,  volatility: 1.20, drift: 0.10, account: "Brokerage"  },
  { ticker: "HIMS",  name: "Hims & Hers",    value: 14980,  volatility: 0.70, drift: 0.12, account: "Joint"      },
  { ticker: "ONDS",  name: "Ondas Holdings", value: 45762,  volatility: 0.90, drift: 0.05, account: "SEP IRA"    },
  { ticker: "TRUST", name: "Trust (ETFs)",   value: 123531, volatility: 0.15, drift: 0.09, account: "Trust"      },
];

const N_PATHS = 5000;
const HORIZONS: { label: string; years: number }[] = [
  { label: "3mo",  years: 0.25 },
  { label: "6mo",  years: 0.5  },
  { label: "1yr",  years: 1    },
  { label: "2yr",  years: 2    },
  { label: "5yr",  years: 5    },
];

const STARTING_BANKROLL = 500;

// ─── Math ────────────────────────────────────────────────────────────────────
function randn(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function simulateGBM(S0: number, mu: number, sigma: number, T: number): number {
  const Z = randn();
  return S0 * Math.exp((mu - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * Z);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(p * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function runMonteCarlo(positions: Position[], horizonYears: number): SimResults {
  const totalInvested = positions.reduce((s, p) => s + p.value, 0);
  const paths: number[] = new Array(N_PATHS);

  for (let i = 0; i < N_PATHS; i++) {
    let total = 0;
    for (const pos of positions) {
      total += simulateGBM(pos.value, pos.drift, pos.volatility, horizonYears);
    }
    paths[i] = total;
  }

  const sorted = [...paths].sort((a, b) => a - b);
  const mean = paths.reduce((s, v) => s + v, 0) / N_PATHS;
  const p10 = percentile(sorted, 0.1);
  const p50 = percentile(sorted, 0.5);
  const p90 = percentile(sorted, 0.9);
  const pLoss = (sorted.filter((v) => v < totalInvested).length / N_PATHS) * 100;
  const p2x = (sorted.filter((v) => v >= totalInvested * 2).length / N_PATHS) * 100;

  // Build histogram buckets
  const maxVal = percentile(sorted, 0.98);
  const BUCKET_COUNT = 40;
  const bucketSize = maxVal / BUCKET_COUNT;
  const buckets: BucketDatum[] = [];
  for (let b = 0; b < BUCKET_COUNT; b++) {
    const lo = b * bucketSize;
    const hi = (b + 1) * bucketSize;
    const mid = (lo + hi) / 2;
    const count = paths.filter((v) => v >= lo && v < hi).length;
    const zone: BucketDatum["zone"] =
      mid < totalInvested
        ? "loss"
        : mid < totalInvested * 1.5
        ? "moderate"
        : "gain";
    buckets.push({ label: `$${Math.round(lo / 1000)}k`, midpoint: mid, count, zone });
  }

  // Fan chart — P10/P50/P90 path over time (monthly steps)
  const totalMonths = Math.round(horizonYears * 12);
  const fanSeries: FanPoint[] = [];
  const p10Idx = Math.floor(0.1 * N_PATHS);
  const p50Idx = Math.floor(0.5 * N_PATHS);
  const p90Idx = Math.floor(0.9 * N_PATHS);
  const targetP10 = sorted[p10Idx];
  const targetP50 = sorted[p50Idx];
  const targetP90 = sorted[p90Idx];

  for (let m = 0; m <= totalMonths; m++) {
    const t = m / 12;
    const scale = t / horizonYears;
    fanSeries.push({
      month: m,
      p10: totalInvested + (targetP10 - totalInvested) * scale,
      p50: totalInvested + (targetP50 - totalInvested) * scale,
      p90: totalInvested + (targetP90 - totalInvested) * scale,
    });
  }

  return { paths, mean, p10, p50, p90, pLoss, p2x, totalInvested, buckets, fanSeries };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1000)}k`;
  return `$${Math.round(v)}`;
}

function fmtFull(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function fmtPnl(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

// ─── Zone colors ─────────────────────────────────────────────────────────────
const ZONE_COLOR: Record<BucketDatum["zone"], string> = {
  loss:     "#EF4444",
  moderate: "#EAB308",
  gain:     "#22C55E",
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function HistTooltip({ active, payload }: { active?: boolean; payload?: { payload: BucketDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#1A1816] bg-[#0D0C0A] px-3 py-2 text-xs shadow-xl">
      <p className="text-[#B8956A] font-medium">{d.label}+</p>
      <p className="text-[#E8E4DF]">{d.count} paths</p>
      <p className="text-[#6B6560]">{((d.count / N_PATHS) * 100).toFixed(1)}% probability</p>
    </div>
  );
}

function FanTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1A1816] bg-[#0D0C0A] px-3 py-2 text-xs shadow-xl">
      <p className="text-[#6B6560] mb-1">Month {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtFull(p.value)}</p>
      ))}
    </div>
  );
}

// ─── Position Card ────────────────────────────────────────────────────────────
function PositionCard({
  pos,
  totalInvested,
  onVolChange,
}: {
  pos: Position;
  totalInvested: number;
  onVolChange: (ticker: string, vol: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const pct = (pos.value / totalInvested) * 100;

  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4 transition-all hover:border-[#B8956A]/30">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#B8956A] font-mono">{pos.ticker}</span>
            <span className="text-[10px] border border-[#1A1816] rounded px-1.5 py-0.5 text-[#6B6560]">
              {pos.account}
            </span>
          </div>
          <p className="text-xs text-[#6B6560] mt-0.5">{pos.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[#E8E4DF]">{fmtFull(pos.value)}</p>
          <p className="text-[10px] text-[#6B6560]">{pct.toFixed(1)}% of portfolio</p>
        </div>
      </div>

      {/* Allocation bar */}
      <div className="h-1 w-full rounded-full bg-[#1A1816] mb-3">
        <div
          className="h-1 rounded-full bg-gradient-to-r from-[#B8956A] to-[#CDAA7E] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Vol row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#6B6560]">σ (vol)</span>
          <span className="text-xs font-mono text-[#E8E4DF]">{(pos.volatility * 100).toFixed(0)}%/yr</span>
          <span className="text-[10px] text-[#6B6560] ml-1">μ (drift)</span>
          <span className="text-xs font-mono text-[#E8E4DF]">{(pos.drift * 100).toFixed(0)}%/yr</span>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className="flex items-center gap-1 text-[10px] text-[#6B6560] hover:text-[#B8956A] transition-colors"
        >
          <Edit2 className="h-3 w-3" />
          edit
          {editing ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t border-[#1A1816]">
          <label className="text-[10px] text-[#6B6560] block mb-1.5">
            Annualized Volatility: <span className="text-[#B8956A] font-mono">{(pos.volatility * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={Math.round(pos.volatility * 100)}
            onChange={(e) => onVolChange(pos.ticker, parseInt(e.target.value) / 100)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: "#B8956A" }}
          />
          <div className="flex justify-between text-[9px] text-[#6B6560] mt-1">
            <span>10% (stable)</span>
            <span>100% (volatile)</span>
            <span>200% (meme stock)</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-[#B8956A]/40 bg-[#B8956A]/5" : "border-[#1A1816] bg-[#0D0C0A]"}`}>
      <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${highlight ? "text-[#B8956A]" : "text-[#E8E4DF]"}`}>{value}</p>
      {sub && <p className="text-[10px] text-[#6B6560] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Arb Scanner ─────────────────────────────────────────────────────────────
interface FundingRateData {
  fundingRate: number;       // raw float (e.g. 0.000021)
  nextFundingTime: number;   // ms timestamp
  fetchedAt: number;
}

function getFundingStatus(rate8h: number): { emoji: string; label: string; color: string } {
  const pct = rate8h * 100; // convert to percent (0.000021 → 0.0021%)
  if (pct < 0)     return { emoji: "🔵", label: "Negative — shorts paying",  color: "text-blue-400"  };
  if (pct < 0.01)  return { emoji: "⚪", label: "Neutral — no arb",          color: "text-[#6B6560]" };
  if (pct < 0.04)  return { emoji: "🟡", label: "Mild — watch",              color: "text-yellow-400"};
  return               { emoji: "🔴", label: "Elevated — arb opportunity",  color: "text-red-400"   };
}

function formatNextFunding(tsMs: number): string {
  if (!tsMs) return "—";
  const d = new Date(tsMs);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
    timeZoneName: "short",
  });
}

const PRED_SPREADS = [
  { event: "March FOMC: No cut", kalshi: "95.5¢", poly: "94.6¢", spread: "0.9%", signal: "Too thin" },
  { event: "April FOMC: No cut", kalshi: "87¢",   poly: "87¢",   spread: "0.0%", signal: "—"        },
];

function ArbScannerSection() {
  const [funding, setFunding] = useState<FundingRateData | null>(null);
  const [error, setError]     = useState<string | null>(null);
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
        fundingRate:     parseFloat(d.fundingRate),
        nextFundingTime: parseInt(d.nextFundingTime, 10),
        fetchedAt:       Date.now(),
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

  const rate8h     = funding?.fundingRate ?? 0;
  const pct8h      = rate8h * 100;
  const annualized = rate8h * 3 * 365 * 100;
  const status     = getFundingStatus(rate8h);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560]">
          Arb Scanner (Live)
        </h2>
        <p className="text-[10px] text-[#6B6560] mt-0.5">
          Monitoring funding rate arb + cross-venue prediction market spreads
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* ── BTC Funding Rate Card ── */}
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#E8E4DF]">BTC Funding Rate</p>
              <p className="text-[10px] text-[#6B6560]">OKX · BTC-USDT-SWAP · live</p>
            </div>
            <span className="text-[10px] text-[#6B6560] bg-[#1A1816] rounded px-2 py-1">
              {funding ? `Updated ${new Date(funding.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })}` : "—"}
            </span>
          </div>

          {loading && (
            <p className="text-[10px] text-[#6B6560]">Fetching…</p>
          )}
          {error && (
            <p className="text-[10px] text-red-400">{error}</p>
          )}
          {!loading && !error && funding && (
            <>
              {/* Rate rows */}
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-[#1A1816] pb-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">8h rate</span>
                  <span className="text-sm font-mono font-bold text-[#E8E4DF]">
                    {pct8h >= 0 ? "+" : ""}{pct8h.toFixed(4)}%
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1A1816] pb-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">Annualized est.</span>
                  <span className="text-sm font-mono font-bold text-[#B8956A]">
                    {annualized >= 0 ? "+" : ""}{annualized.toFixed(2)}%/yr
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1A1816] pb-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">Next funding</span>
                  <span className="text-[10px] font-mono text-[#E8E4DF]">
                    {formatNextFunding(funding.nextFundingTime)}
                  </span>
                </div>
              </div>

              {/* Status badge */}
              <div className={`flex items-center gap-2 rounded-lg border border-[#1A1816] bg-[#0A0908] px-3 py-2`}>
                <span className="text-base">{status.emoji}</span>
                <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
              </div>

              {/* Tooltip note */}
              <p className="text-[10px] text-[#6B6560] leading-relaxed border-t border-[#1A1816] pt-3">
                <span className="text-[#B8956A] font-medium">Strategy note:</span>{" "}
                When funding is elevated (&gt;0.04%/8h), go long spot + short perp to collect the spread with zero directional exposure.
              </p>
            </>
          )}
        </div>

        {/* ── Prediction Market Spreads Card ── */}
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#E8E4DF]">Prediction Market Spreads</p>
            <p className="text-[10px] text-[#6B6560]">Kalshi vs Polymarket · manually tracked</p>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#1A1816]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1A1816]">
                  <th className="text-left text-[#6B6560] font-medium px-3 py-2 uppercase tracking-wider text-[9px]">Event</th>
                  <th className="text-right text-[#6B6560] font-medium px-2 py-2 uppercase tracking-wider text-[9px]">Kalshi</th>
                  <th className="text-right text-[#6B6560] font-medium px-2 py-2 uppercase tracking-wider text-[9px]">Poly</th>
                  <th className="text-right text-[#6B6560] font-medium px-2 py-2 uppercase tracking-wider text-[9px]">Spread</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2 uppercase tracking-wider text-[9px]">Signal</th>
                </tr>
              </thead>
              <tbody>
                {PRED_SPREADS.map((row, i) => (
                  <tr key={i} className="border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors">
                    <td className="px-3 py-2.5 text-[#E8E4DF] text-[10px] leading-snug">{row.event}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-[#E8E4DF]">{row.kalshi}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-[#E8E4DF]">{row.poly}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-[#6B6560]">{row.spread}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                        row.signal === "Too thin" ? "bg-[#1A1816] text-[#6B6560]" : "bg-[#1A1816] text-[#6B6560]"
                      }`}>
                        {row.signal}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-[#6B6560] leading-relaxed border-t border-[#1A1816] pt-3">
            Spreads update manually — alert threshold: <span className="text-[#B8956A] font-medium">&gt;3% spread</span>
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
        Loading signals…
      </div>
    );
  }

  const resolved   = signals.filter((s) => s.outcome !== undefined);
  const correct    = resolved.filter((s) => s.correct === true).length;
  const accuracy   = resolved.length > 0 ? (correct / resolved.length) * 100 : null;
  const recent     = signals.slice(0, 20);

  return (
    <div className="space-y-4">
      {/* Section header + accuracy stat */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560]">
            BTC 5M Candle Signal Log
          </h2>
          <p className="text-[10px] text-[#6B6560] mt-0.5">
            Auto-signals fired when candle move ≥ 0.10% · resolved next run
          </p>
        </div>
        <div className="flex items-center gap-4">
          {accuracy !== null && (
            <div className="text-right">
              <p className={`text-lg font-bold font-mono ${accuracy >= 60 ? "text-green-400" : accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                {accuracy.toFixed(1)}%
              </p>
              <p className="text-[9px] text-[#6B6560]">{correct}/{resolved.length} correct</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-lg font-bold font-mono text-[#E8E4DF]">{signals.length}</p>
            <p className="text-[9px] text-[#6B6560]">total signals</p>
          </div>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-6 text-center text-[#6B6560] text-sm">
          No signals yet — cron fires every 5 min at <code className="text-[#B8956A]">*/5 * * * *</code>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-[#1A1816]">
                <th className="text-left text-[#6B6560] font-medium px-4 py-2.5 uppercase tracking-wider text-[9px]">Candle Open (UTC)</th>
                <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Open</th>
                <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Signal @</th>
                <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Dir</th>
                <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Move%</th>
                <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">My Prob</th>
                <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Close</th>
                <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Result</th>
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
                    {/* Candle open time */}
                    <td className="px-4 py-2.5 font-mono text-[#6B6560] text-[10px] whitespace-nowrap">
                      {new Date(s.candle_open_time).toLocaleString("en-US", {
                        month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                        hour12: false, timeZone: "UTC",
                      }).replace(",", "")}
                    </td>
                    {/* Open price */}
                    <td className="px-3 py-2.5 text-right font-mono text-[#E8E4DF]">
                      ${s.open_price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    {/* Signal price */}
                    <td className="px-3 py-2.5 text-right font-mono text-[#E8E4DF]">
                      ${s.signal_price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    {/* Direction badge */}
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                        dirUp
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {dirUp ? "▲ UP" : "▼ DN"}
                      </span>
                    </td>
                    {/* Move % */}
                    <td className={`px-3 py-2.5 text-right font-mono ${dirUp ? "text-green-400" : "text-red-400"}`}>
                      {dirUp ? "+" : ""}{s.signal_confidence.toFixed(3)}%
                    </td>
                    {/* My probability */}
                    <td className="px-3 py-2.5 text-right font-mono text-[#B8956A]">
                      {s.my_probability}%
                    </td>
                    {/* Close price */}
                    <td className="px-3 py-2.5 text-right font-mono text-[#6B6560]">
                      {s.close_price !== undefined
                        ? `$${s.close_price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        : <span className="text-[#3A3830] italic">pending</span>}
                    </td>
                    {/* Result */}
                    <td className="px-3 py-2.5 text-center">
                      {!isResolved ? (
                        <span className="text-[9px] text-[#3A3830] italic">—</span>
                      ) : s.correct ? (
                        <span className="text-green-400 font-bold">✓</span>
                      ) : (
                        <span className="text-red-400 font-bold">✗</span>
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
        Interval: <span className="text-[#B8956A] font-mono">5M</span> · Threshold: <span className="text-[#B8956A] font-mono">0.10%</span> · ~80–100 signals/day after filter ·{" "}
        Run <code className="text-[#B8956A]">INTERVAL=1H node scripts/btc-signal.js</code> for 1-hour mode
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
        Loading trades…
      </div>
    );
  }

  const openTrades = trades.filter((t) => !t.resolved);
  const resolvedTrades = trades.filter((t) => t.resolved);

  const deployed = openTrades.reduce((s, t) => s + t.kelly_stake, 0);
  const totalPnl = resolvedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const cash = STARTING_BANKROLL - deployed;

  // Brier Score (inverted for "higher = better")
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
      {/* Bankroll + Brier row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
          <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Starting Bankroll</p>
          <p className="text-lg font-bold font-mono text-[#E8E4DF]">${STARTING_BANKROLL}</p>
          <p className="text-[10px] text-[#6B6560] mt-0.5">paper $</p>
        </div>
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
          <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Deployed</p>
          <p className="text-lg font-bold font-mono text-[#E8E4DF]">${deployed.toFixed(0)}</p>
          <p className="text-[10px] text-[#6B6560] mt-0.5">{openTrades.length} open position{openTrades.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4">
          <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Cash Remaining</p>
          <p className="text-lg font-bold font-mono text-[#E8E4DF]">${cash.toFixed(0)}</p>
          <p className="text-[10px] text-[#6B6560] mt-0.5">undeployed</p>
        </div>
        <div className={`rounded-xl border p-4 ${totalPnl > 0 ? "border-[#B8956A]/40 bg-[#B8956A]/5" : totalPnl < 0 ? "border-red-500/20 bg-red-500/5" : "border-[#1A1816] bg-[#0D0C0A]"}`}>
          <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Total P&amp;L</p>
          <p className={`text-lg font-bold font-mono ${totalPnl > 0 ? "text-[#B8956A]" : totalPnl < 0 ? "text-red-400" : "text-[#E8E4DF]"}`}>
            {resolvedTrades.length === 0 ? "–" : fmtPnl(totalPnl)}
          </p>
          <p className="text-[10px] text-[#6B6560] mt-0.5">{resolvedTrades.length} resolved</p>
        </div>
      </div>

      {/* Brier Score card — only if resolved trades exist */}
      {resolvedTrades.length > 0 && brierScore !== null && (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Brier Score</p>
            <p className="text-2xl font-bold font-mono text-[#B8956A]">{brierScore.toFixed(3)}</p>
            <p className="text-[10px] text-[#6B6560] mt-0.5">1 − MSE · higher = better · max 1.0</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#6B6560]">N = {resolvedTrades.length} resolved</p>
            <p className="text-[10px] text-[#6B6560] mt-0.5">
              {brierScore >= 0.9 ? "🟢 Sharp" : brierScore >= 0.75 ? "🟡 Decent" : "🔴 Needs calibration"}
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
                  <th className="text-left text-[#6B6560] font-medium px-4 py-2.5 uppercase tracking-wider">Question</th>
                  <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">Pos</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">Entry%</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider hidden sm:table-cell">My%</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider hidden sm:table-cell">Edge</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">Stake</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">Resolves</th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map((t, i) => {
                  const edge = t.my_probability - t.entry_price;
                  return (
                    <tr
                      key={t._id}
                      className={`border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors cursor-pointer`}
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
                          <span className="truncate leading-relaxed" title={t.question}>
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
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">{t.entry_price}%</td>
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF] hidden sm:table-cell">{t.my_probability}%</td>
                      <td className={`px-3 py-3 text-right font-mono font-semibold hidden sm:table-cell ${edge > 0 ? "text-green-400" : edge < 0 ? "text-red-400" : "text-[#6B6560]"}`}>
                        {edge > 0 ? "+" : ""}{edge}pp
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">${t.kelly_stake}</td>
                      <td className="px-3 py-3 text-right text-[#6B6560]">{t.resolve_date}</td>
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
                  <th className="text-left text-[#6B6560] font-medium px-4 py-2.5 uppercase tracking-wider">Question</th>
                  <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">Pos</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">Entry%</th>
                  <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">Result</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">P&amp;L</th>
                  <th className="text-left text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider hidden sm:table-cell">Notes</th>
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
                        <span className="truncate block" title={t.question}>{t.question}</span>
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
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">{t.entry_price}%</td>
                      <td className="px-3 py-3 text-center text-base">{won ? "✓" : "✗"}</td>
                      <td className={`px-3 py-3 text-right font-mono font-semibold ${(t.pnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {t.pnl !== undefined ? fmtPnl(t.pnl) : "–"}
                      </td>
                      <td className="px-3 py-3 text-[#6B6560] max-w-[200px] hidden sm:table-cell">
                        <span className="truncate block" title={t.notes}>{t.notes}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Arb Scanner */}
      <ArbScannerSection />

      {/* BTC Signal Log */}
      <BtcSignalLog />

      {/* Footer note */}
      <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-4">
        <p className="text-[10px] text-[#6B6560] leading-relaxed">
          <span className="text-[#B8956A] font-medium">Paper trading only.</span>{" "}
          No real money deployed. Kelly stakes sized on ${STARTING_BANKROLL} bankroll.
          Edge = my probability − market implied probability.
          Resolve trades via Convex dashboard → <code className="text-[#B8956A]">polymarket:resolveTrade</code>.{" "}
          <span className="text-amber-400">⚠️ Not financial advice.</span>
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuantPage() {
  const [activeTab, setActiveTab] = useState<"simulator" | "paper-trades">("simulator");
  const [positions, setPositions] = useState<Position[]>(DEFAULT_POSITIONS);
  const [horizonIdx, setHorizonIdx] = useState(2); // default: 1yr
  const [results, setResults] = useState<SimResults | null>(null);
  const [running, setRunning] = useState(false);
  const runRef = useRef(0);

  const horizon = HORIZONS[horizonIdx];

  const runSim = useCallback(() => {
    setRunning(true);
    const id = ++runRef.current;
    setTimeout(() => {
      if (runRef.current !== id) return;
      const res = runMonteCarlo(positions, horizon.years);
      setResults(res);
      setRunning(false);
    }, 20);
  }, [positions, horizon.years]);

  useEffect(() => {
    runSim();
  }, [runSim]);

  const handleVolChange = (ticker: string, vol: number) => {
    setPositions((prev) =>
      prev.map((p) => (p.ticker === ticker ? { ...p, volatility: vol } : p))
    );
  };

  const totalInvested = positions.reduce((s, p) => s + p.value, 0);

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
              Monte Carlo simulation · {N_PATHS.toLocaleString()} paths · Geometric Brownian Motion
            </p>
            <p className="text-xs text-[#6B6560] mt-0.5">
              {fmtFull(totalInvested)} invested · {horizon.label} horizon
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
          {/* ── Controls ── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-1">
              {HORIZONS.map((h, i) => (
                <button
                  key={h.label}
                  onClick={() => setHorizonIdx(i)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                    i === horizonIdx
                      ? "bg-[#B8956A] text-[#060606] shadow-sm"
                      : "text-[#6B6560] hover:text-[#E8E4DF]"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>

            <button
              onClick={runSim}
              disabled={running}
              className="flex items-center gap-2 rounded-xl border border-[#B8956A]/30 bg-[#B8956A]/10 px-5 py-2 text-sm font-medium text-[#B8956A] hover:bg-[#B8956A]/20 transition-all disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {running ? "Running…" : "Run Simulation"}
            </button>
          </div>

          {/* ── Position Cards ── */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560] mb-3">
              Positions · click to adjust volatility
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {positions.map((pos) => (
                <PositionCard
                  key={pos.ticker}
                  pos={pos}
                  totalInvested={totalInvested}
                  onVolChange={handleVolChange}
                />
              ))}
            </div>
          </div>

          {/* ── Stats ── */}
          {results && (
            <>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560] mb-3">
                  Key Statistics · {horizon.label} horizon
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  <StatCard label="Total Invested" value={fmt(results.totalInvested)} />
                  <StatCard label="Expected (Mean)" value={fmt(results.mean)} highlight />
                  <StatCard label="P10 · Bad Case" value={fmt(results.p10)} sub="10% chance worse" />
                  <StatCard label="P50 · Median" value={fmt(results.p50)} sub="50% above/below" highlight />
                  <StatCard label="P90 · Good Case" value={fmt(results.p90)} sub="10% chance better" />
                  <StatCard
                    label="P(Loss)"
                    value={`${results.pLoss.toFixed(1)}%`}
                    sub="chance of loss"
                  />
                  <StatCard
                    label="P(2×)"
                    value={`${results.p2x.toFixed(1)}%`}
                    sub="chance of doubling"
                  />
                </div>
              </div>

              {/* ── Distribution Chart ── */}
              <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560] mb-4">
                  Terminal Value Distribution
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={results.buckets} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#6B6560" }}
                      interval="preserveStartEnd"
                      tickLine={false}
                      axisLine={{ stroke: "#1A1816" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#6B6560" }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <Tooltip content={<HistTooltip />} />
                    <ReferenceLine
                      x={results.buckets.find(
                        (b, i) =>
                          results.totalInvested >= b.midpoint - (results.buckets[1]?.midpoint - results.buckets[0]?.midpoint) / 2 &&
                          results.totalInvested < b.midpoint + (results.buckets[1]?.midpoint - results.buckets[0]?.midpoint) / 2
                      )?.label ?? results.buckets[Math.floor(results.buckets.length / 4)]?.label}
                      stroke="#B8956A"
                      strokeDasharray="4 3"
                      label={{ value: "Invested", fill: "#B8956A", fontSize: 10, position: "insideTopRight" }}
                    />
                    <Bar dataKey="count" maxBarSize={20} radius={[2, 2, 0, 0]}>
                      {results.buckets.map((b, i) => (
                        <Cell key={i} fill={ZONE_COLOR[b.zone]} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-5 mt-3 justify-center">
                  <span className="flex items-center gap-1.5 text-[10px] text-[#6B6560]">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" /> Below invested
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-[#6B6560]">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-500" /> 1×–1.5× gain
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-[#6B6560]">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" /> &gt;1.5× gain
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-[#6B6560]">
                    <span className="inline-block h-0.5 w-5 bg-[#B8956A]" style={{ borderTop: "2px dashed #B8956A" }} /> Invested
                  </span>
                </div>
              </div>

              {/* ── Fan Chart ── */}
              <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560] mb-1">
                  Scenario Fan · P10 / P50 / P90 Over Time
                </h2>
                <p className="text-[10px] text-[#6B6560] mb-4">
                  Linear interpolation of terminal quantile paths. Not individual GBM paths — for illustration.
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={results.fanSeries} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "#6B6560" }}
                      tickLine={false}
                      axisLine={{ stroke: "#1A1816" }}
                      tickFormatter={(m) => `${m}m`}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#6B6560" }}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                      tickFormatter={(v) => fmt(v)}
                    />
                    <Tooltip content={<FanTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 10, color: "#6B6560" }}
                    />
                    <ReferenceLine y={totalInvested} stroke="#B8956A" strokeDasharray="4 3" />
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

              {/* ── Methodology note ── */}
              <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-4">
                <p className="text-[10px] text-[#6B6560] leading-relaxed">
                  <span className="text-[#B8956A] font-medium">Methodology:</span>{" "}
                  Geometric Brownian Motion with {N_PATHS.toLocaleString()} Monte Carlo paths. Each position simulated independently using Box-Muller normal random variables.
                  Terminal values: S<sub>T</sub> = S<sub>0</sub> · exp((μ − σ²/2)T + σ√T · Z).{" "}
                  <span className="text-amber-400">⚠️ Not financial advice.</span>{" "}
                  Historical volatility estimates are rough — actual outcomes may differ significantly. Positions are treated as independent (no correlation structure).
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
