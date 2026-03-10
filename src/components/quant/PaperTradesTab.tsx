"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

const STARTING_BANKROLL = 10_000;

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

function fmtPnl(v: number): string {
  const s = v >= 0 ? "+" : "";
  return `${s}$${Math.abs(v).toFixed(0)}`;
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
  if (pct < 0) return { emoji: "🔵", label: "Negative — shorts paying", color: "text-blue-400" };
  if (pct < 0.01) return { emoji: "⚪", label: "Neutral — no arb", color: "text-[#6B6560]" };
  if (pct < 0.04) return { emoji: "🟡", label: "Mild — watch", color: "text-yellow-400" };
  return { emoji: "🔴", label: "Elevated — arb opportunity", color: "text-red-400" };
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

function ArbScannerSection() {
  const [funding, setFunding] = useState<FundingRateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFunding = useCallback(async () => {
    try {
      const res = await fetch("https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP");
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
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560]">Arb Scanner (Live)</h2>
        <p className="text-[10px] text-[#6B6560] mt-0.5">Monitoring funding rate arb + cross-venue prediction market spreads</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* BTC Funding Rate */}
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
          {loading && <p className="text-[10px] text-[#6B6560]">Fetching…</p>}
          {error && <p className="text-[10px] text-red-400">{error}</p>}
          {!loading && !error && funding && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-[#1A1816] pb-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">8h rate</span>
                  <span className="text-sm font-mono font-bold text-[#E8E4DF]">{pct8h >= 0 ? "+" : ""}{pct8h.toFixed(4)}%</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1A1816] pb-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">Annualized est.</span>
                  <span className="text-sm font-mono font-bold text-[#B8956A]">{annualized >= 0 ? "+" : ""}{annualized.toFixed(2)}%/yr</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1A1816] pb-2">
                  <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">Next funding</span>
                  <span className="text-[10px] font-mono text-[#E8E4DF]">{formatNextFunding(funding.nextFundingTime)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[#1A1816] bg-[#0A0908] px-3 py-2">
                <span className="text-base">{status.emoji}</span>
                <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-[10px] text-[#6B6560] leading-relaxed border-t border-[#1A1816] pt-3">
                <span className="text-[#B8956A] font-medium">Strategy note:</span> When funding is elevated (&gt;0.04%/8h), go long spot + short perp to collect the spread with zero directional exposure.
              </p>
            </>
          )}
        </div>

        {/* Prediction Market Spreads */}
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
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#1A1816] text-[#6B6560]">{row.signal}</span>
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
    return <div className="flex items-center justify-center py-8 text-[#6B6560] text-sm">Loading signals…</div>;
  }

  const resolved = signals.filter((s) => s.outcome !== undefined);
  const correct = resolved.filter((s) => s.correct === true).length;
  const accuracy = resolved.length > 0 ? (correct / resolved.length) * 100 : null;
  const recent = signals.slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560]">BTC 5M Candle Signal Log</h2>
          <p className="text-[10px] text-[#6B6560] mt-0.5">Auto-signals fired when candle move ≥ 0.10% · resolved next run</p>
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
                  <tr key={s._id} className="border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[#6B6560] text-[10px] whitespace-nowrap">
                      {new Date(s.candle_open_time).toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).replace(",", "")}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#E8E4DF]">${s.open_price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#E8E4DF]">${s.signal_price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${dirUp ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                        {dirUp ? "▲ UP" : "▼ DN"}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono ${dirUp ? "text-green-400" : "text-red-400"}`}>
                      {dirUp ? "+" : ""}{s.signal_confidence.toFixed(3)}%
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#B8956A]">{s.my_probability}%</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#6B6560]">
                      {s.close_price !== undefined ? `$${s.close_price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : <span className="text-[#3A3830] italic">pending</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {!isResolved ? <span className="text-[9px] text-[#3A3830] italic">—</span> : s.correct ? <span className="text-green-400 font-bold">✓</span> : <span className="text-red-400 font-bold">✗</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-[#6B6560]">
        Interval: <span className="text-[#B8956A] font-mono">5M</span> · Threshold: <span className="text-[#B8956A] font-mono">0.10%</span> · ~80–100 signals/day after filter · Run <code className="text-[#B8956A]">INTERVAL=1H node scripts/btc-signal.js</code> for 1-hour mode
      </p>
    </div>
  );
}

// ─── Main Paper Trades Tab ────────────────────────────────────────────────────
export default function PaperTradesTab() {
  const trades = useQuery(api.polymarket.listTrades);

  if (trades === undefined) {
    return <div className="flex items-center justify-center py-16 text-[#6B6560] text-sm">Loading trades…</div>;
  }

  const openTrades = trades.filter((t) => !t.resolved);
  const resolvedTrades = trades.filter((t) => t.resolved);
  const deployed = openTrades.reduce((s, t) => s + t.kelly_stake, 0);
  const totalPnl = resolvedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const cash = STARTING_BANKROLL - deployed;

  let brierScore: number | null = null;
  if (resolvedTrades.length > 0) {
    const mse = resolvedTrades.reduce((s, t) => {
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
          <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Total P&L</p>
          <p className={`text-lg font-bold font-mono ${totalPnl > 0 ? "text-[#B8956A]" : totalPnl < 0 ? "text-red-400" : "text-[#E8E4DF]"}`}>
            {resolvedTrades.length === 0 ? "–" : fmtPnl(totalPnl)}
          </p>
          <p className="text-[10px] text-[#6B6560] mt-0.5">{resolvedTrades.length} resolved</p>
        </div>
      </div>

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
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560] mb-3">Open Positions · {openTrades.length}</h2>
        {openTrades.length === 0 ? (
          <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-6 text-center text-[#6B6560] text-sm">No open positions</div>
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
                {openTrades.map((t) => {
                  const edge = t.my_probability - t.entry_price;
                  return (
                    <tr key={t._id} className="border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors cursor-pointer" onClick={() => window.open(t.market_url, "_blank")}>
                      <td className="px-4 py-3 text-[#E8E4DF] max-w-[260px]">
                        <div className="flex items-start gap-2">
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 bg-[#1A1816] text-[#6B6560] border border-[#1A1816]">{t.category}</span>
                          <span className="truncate leading-relaxed" title={t.question}>{t.question}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${t.position === "Yes" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>{t.position}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">{t.entry_price}%</td>
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF] hidden sm:table-cell">{t.my_probability}%</td>
                      <td className={`px-3 py-3 text-right font-mono font-semibold hidden sm:table-cell ${edge > 0 ? "text-green-400" : edge < 0 ? "text-red-400" : "text-[#6B6560]"}`}>{edge > 0 ? "+" : ""}{edge}pp</td>
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
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560] mb-3">Resolved Trades · {resolvedTrades.length}</h2>
          <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-x-auto">
            <table className="w-full text-xs min-w-[480px]">
              <thead>
                <tr className="border-b border-[#1A1816]">
                  <th className="text-left text-[#6B6560] font-medium px-4 py-2.5 uppercase tracking-wider">Question</th>
                  <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">Pos</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">Entry%</th>
                  <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">Result</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider">P&L</th>
                  <th className="text-left text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {resolvedTrades.map((t) => {
                  const won = (t.position === "Yes" && t.outcome === true) || (t.position === "No" && t.outcome === false);
                  return (
                    <tr key={t._id} className="border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors cursor-pointer" onClick={() => window.open(t.market_url, "_blank")}>
                      <td className="px-4 py-3 text-[#E8E4DF] max-w-[200px]"><span className="truncate block" title={t.question}>{t.question}</span></td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${t.position === "Yes" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>{t.position}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">{t.entry_price}%</td>
                      <td className="px-3 py-3 text-center text-base">{won ? "✓" : "✗"}</td>
                      <td className={`px-3 py-3 text-right font-mono font-semibold ${(t.pnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>{t.pnl !== undefined ? fmtPnl(t.pnl) : "–"}</td>
                      <td className="px-3 py-3 text-[#6B6560] max-w-[200px] hidden sm:table-cell"><span className="truncate block" title={t.notes}>{t.notes}</span></td>
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
          <span className="text-[#B8956A] font-medium">Paper trading only.</span> No real money deployed. Kelly stakes sized on ${STARTING_BANKROLL} bankroll. Edge = my probability − market implied probability. Resolve trades via Convex dashboard → <code className="text-[#B8956A]">polymarket:resolveTrade</code>. <span className="text-amber-400">⚠️ Not financial advice.</span>
        </p>
      </div>
    </div>
  );
}
