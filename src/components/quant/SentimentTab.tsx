"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "recharts";
import { Gauge, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Sentiment Gauge SVG ──────────────────────────────────────────────────────
function SentimentGauge({ score }: { score: number }) {
  const clampedScore = Math.max(-100, Math.min(100, score));
  const normalized = (clampedScore + 100) / 200;
  const needleAngle = 180 - normalized * 180;
  const needleRad = (needleAngle * Math.PI) / 180;

  const cx = 150, cy = 140, r = 110;
  const needleX = cx + r * 0.85 * Math.cos(needleRad);
  const needleY = cy - r * 0.85 * Math.sin(needleRad);

  function arcPath(startDeg: number, endDeg: number): string {
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(Math.PI - startRad);
    const y1 = cy - r * Math.sin(Math.PI - startRad);
    const x2 = cx + r * Math.cos(Math.PI - endRad);
    const y2 = cy - r * Math.sin(Math.PI - endRad);
    const largeArc = endDeg - startDeg > 90 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  const zones = [
    { start: 0, end: 63, color: "#DC2626" },
    { start: 63, end: 81, color: "#EA580C" },
    { start: 81, end: 99, color: "#EAB308" },
    { start: 99, end: 117, color: "#84CC16" },
    { start: 117, end: 180, color: "#22C55E" },
  ];

  function getScoreColor(s: number): string {
    if (s <= -30) return "#DC2626";
    if (s <= -10) return "#EA580C";
    if (s <= 10) return "#EAB308";
    if (s <= 30) return "#84CC16";
    return "#22C55E";
  }

  function getLabel(s: number): string {
    if (s <= -50) return "Extreme Fear";
    if (s <= -30) return "Fear";
    if (s <= -10) return "Slightly Bearish";
    if (s <= 10) return "Neutral";
    if (s <= 30) return "Slightly Bullish";
    if (s <= 50) return "Greed";
    return "Extreme Greed";
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 165" className="w-full max-w-[320px]">
        {zones.map((z, i) => (
          <path key={i} d={arcPath(z.start, z.end)} fill="none" stroke={z.color} strokeWidth={18} strokeLinecap="round" opacity={0.3} />
        ))}
        {zones.map((z, i) => {
          const scoreStart = -100 + (z.start / 180) * 200;
          const scoreEnd = -100 + (z.end / 180) * 200;
          if (clampedScore >= scoreStart && clampedScore <= scoreEnd) {
            return <path key={`active-${i}`} d={arcPath(z.start, z.end)} fill="none" stroke={z.color} strokeWidth={18} strokeLinecap="round" opacity={0.8} />;
          }
          return null;
        })}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={getScoreColor(clampedScore)} strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={6} fill={getScoreColor(clampedScore)} />
        <circle cx={cx} cy={cy} r={3} fill="#0D0C0A" />
        <text x={30} y={155} fill="#6B6560" fontSize="9" textAnchor="middle">-100</text>
        <text x={270} y={155} fill="#6B6560" fontSize="9" textAnchor="middle">+100</text>
        <text x={150} y={18} fill="#6B6560" fontSize="9" textAnchor="middle">0</text>
      </svg>
      <div className="text-center -mt-2">
        <p className="text-3xl font-bold font-mono" style={{ color: getScoreColor(clampedScore) }}>
          {clampedScore > 0 ? "+" : ""}{clampedScore}
        </p>
        <p className="text-xs text-[#6B6560] mt-0.5">{getLabel(clampedScore)}</p>
      </div>
    </div>
  );
}

// ─── Live Sentiment Fetcher ──────────────────────────────────────────────────
interface LiveSentimentResult {
  score: number;
  tweetCount: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  topBullish?: string;
  topBearish?: string;
  priceAtCheck?: number;
  checkedAt: number;
}

// ─── Sentiment Tab ────────────────────────────────────────────────────────────
export default function SentimentTab() {
  const [ticker, setTicker] = useState("HIMS");
  const [searchInput, setSearchInput] = useState("HIMS");
  const [liveResult, setLiveResult] = useState<LiveSentimentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load stored HIMS data as default
  const storedLatest = useQuery(api.himsSentiment.latest);
  const todayReadings = useQuery(api.himsSentiment.todayReadings);

  // Use stored data for HIMS if no live result yet
  const displayData = ticker === "HIMS" && !liveResult ? storedLatest : liveResult;

  const fetchSentiment = useCallback(async (t: string) => {
    setLoading(true);
    setError(null);
    setLiveResult(null);
    try {
      const res = await fetch(`/api/sentiment?ticker=${encodeURIComponent(t)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch sentiment for ${t}`);
      }
      const data = await res.json();
      setLiveResult(data);
      setTicker(t);
    } catch (e: any) {
      setError(e.message || "Failed to fetch sentiment");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    const t = searchInput.trim().toUpperCase();
    if (!t) return;
    if (t === ticker && (displayData || liveResult)) return; // already showing
    fetchSentiment(t);
  };

  const chartData = ticker === "HIMS" && !liveResult
    ? (todayReadings ?? []).map((r: any) => ({
        time: new Date(r.checkedAt).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit", timeZone: "America/Chicago",
        }),
        score: r.score,
      }))
    : [];

  const lastUpdated = displayData
    ? new Date(displayData.checkedAt).toLocaleString("en-US", {
        timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Ticker Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6560]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter ticker (e.g. AAPL)"
            className="w-full rounded-lg border border-[#1A1816] bg-[#0D0C0A] pl-10 pr-4 py-2.5 text-sm font-mono text-[#E8E4DF] placeholder:text-[#3A3830] focus:outline-none focus:border-[#B8956A]/40"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !searchInput.trim()}
          className="flex items-center gap-2 rounded-lg border border-[#B8956A]/30 bg-[#B8956A]/10 px-5 py-2.5 text-sm font-medium text-[#B8956A] hover:bg-[#B8956A]/20 transition-all disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
          {loading ? "Analyzing..." : "Get Sentiment"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {!displayData && !loading && !error && (
        <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-8 text-center">
          <Gauge className="h-8 w-8 text-[#6B6560] mx-auto mb-3" />
          <p className="text-sm text-[#6B6560]">Enter a ticker and click Get Sentiment to analyze Twitter sentiment.</p>
        </div>
      )}

      {displayData && (
        <>
          {/* Top row: Gauge + Stats */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#E8E4DF]">${ticker} Sentiment Gauge</p>
                  <p className="text-[10px] text-[#6B6560]">Twitter sentiment · ~100+ tweet sample</p>
                </div>
                {lastUpdated && (
                  <span className="text-[10px] text-[#6B6560] bg-[#1A1816] rounded px-2 py-1">{lastUpdated}</span>
                )}
              </div>
              <SentimentGauge score={displayData.score} />
            </div>

            <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-6 space-y-4">
              <p className="text-sm font-semibold text-[#E8E4DF]">Reading Details</p>
              <div className="grid grid-cols-2 gap-3">
                {displayData.priceAtCheck !== undefined && (
                  <div className="rounded-lg border border-[#1A1816] bg-[#0A0908] p-3">
                    <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Price</p>
                    <p className="text-lg font-bold font-mono text-[#E8E4DF]">${displayData.priceAtCheck.toFixed(2)}</p>
                  </div>
                )}
                <div className="rounded-lg border border-[#1A1816] bg-[#0A0908] p-3">
                  <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Tweets</p>
                  <p className="text-lg font-bold font-mono text-[#E8E4DF]">{displayData.tweetCount}</p>
                </div>
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                  <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Bullish</p>
                  <p className="text-lg font-bold font-mono text-green-400">{displayData.bullishCount}</p>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Bearish</p>
                  <p className="text-lg font-bold font-mono text-red-400">{displayData.bearishCount}</p>
                </div>
                <div className="rounded-lg border border-[#1A1816] bg-[#0A0908] p-3">
                  <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Neutral</p>
                  <p className="text-lg font-bold font-mono text-[#6B6560]">{displayData.neutralCount}</p>
                </div>
                {ticker === "HIMS" && !liveResult && (
                  <div className="rounded-lg border border-[#1A1816] bg-[#0A0908] p-3">
                    <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Readings Today</p>
                    <p className="text-lg font-bold font-mono text-[#B8956A]">{todayReadings?.length ?? 0}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Intraday Chart (HIMS stored data only) */}
          {chartData.length > 1 && (
            <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#E8E4DF]">Intraday Sentiment</p>
                  <p className="text-[10px] text-[#6B6560]">15-min readings · today CST</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6B6560" }} tickLine={false} axisLine={{ stroke: "#1A1816" }} />
                  <YAxis domain={[-100, 100]} tick={{ fontSize: 10, fill: "#6B6560" }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={{ background: "#0D0C0A", border: "1px solid #1A1816", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#6B6560" }} />
                  <ReferenceLine y={0} stroke="#1A1816" strokeDasharray="4 3" />
                  <Line type="monotone" dataKey="score" name="Sentiment" stroke="#B8956A" strokeWidth={2.5} dot={{ fill: "#B8956A", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Tweets */}
          {(displayData.topBullish || displayData.topBearish) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {displayData.topBullish && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                  <p className="text-[10px] text-green-400 uppercase tracking-widest font-semibold mb-2">🟢 Top Bullish Tweet</p>
                  <p className="text-xs text-[#E8E4DF] leading-relaxed whitespace-pre-line">{displayData.topBullish}</p>
                </div>
              )}
              {displayData.topBearish && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-[10px] text-red-400 uppercase tracking-widest font-semibold mb-2">🔴 Top Bearish Tweet</p>
                  <p className="text-xs text-[#E8E4DF] leading-relaxed whitespace-pre-line">{displayData.topBearish}</p>
                </div>
              )}
            </div>
          )}

          {/* Methodology */}
          <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-4">
            <p className="text-[10px] text-[#6B6560] leading-relaxed">
              <span className="text-[#B8956A] font-medium">How This Works —</span>{" "}
              Searches Twitter for ${ticker} cashtag, stock name, and company name, pulling ~100-150 unique tweets via Bird CLI. Each tweet is scored against a keyword lexicon (bullish/bearish/neutral) to compute an aggregate score from -100 (Extreme Fear) to +100 (Extreme Greed).{" "}
              <span className="text-amber-400">⚠️ Not financial advice.</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
