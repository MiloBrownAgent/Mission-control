"use client";

import { useState, useCallback, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { TrendingUp, Play, Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Holding {
  ticker: string;
  name: string;
  price: number;
  currency: string;
  volatility: number;
  drift: number;
  weight: number;
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
  { label: "6mo", years: 0.5 },
  { label: "1yr", years: 1 },
  { label: "5yr", years: 5 },
  { label: "10yr", years: 10 },
  { label: "20yr", years: 20 },
  { label: "30yr", years: 30 },
];

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
  holdings: Holding[], totalValue: number, expectedAnnualReturn: number, corrMatrix: number[][] | null
): HorizonResult[] {
  const nAssets = holdings.length;
  const weights = holdings.map((h) => h.weight / 100);
  const L = corrMatrix && nAssets > 1 ? choleskyDecompose(corrMatrix) : null;

  return HORIZONS.map((hz) => {
    const terminals: number[] = new Array(N_PATHS);
    for (let i = 0; i < N_PATHS; i++) {
      const Z_raw = Array.from({ length: nAssets }, () => randn());
      const Z_corr: number[] = new Array(nAssets).fill(0);
      if (L) {
        for (let row = 0; row < nAssets; row++)
          for (let col = 0; col <= row; col++)
            Z_corr[row] += L[row][col] * Z_raw[col];
      } else {
        for (let k = 0; k < nAssets; k++) Z_corr[k] = Z_raw[k];
      }
      let portfolioEnd = 0;
      for (let j = 0; j < nAssets; j++) {
        const h = holdings[j];
        const positionValue = totalValue * weights[j];
        const ST = positionValue * Math.exp(expectedAnnualReturn * hz.years + h.volatility * Math.sqrt(hz.years) * Z_corr[j]);
        portfolioEnd += ST;
      }
      terminals[i] = portfolioEnd;
    }

    const sorted = [...terminals].sort((a, b) => a - b);
    const p10 = percentile(sorted, 0.1);
    const p50 = percentile(sorted, 0.5);
    const p90 = percentile(sorted, 0.9);
    const pLoss = (sorted.filter((v) => v < totalValue).length / N_PATHS) * 100;
    const p2x = (sorted.filter((v) => v >= totalValue * 2).length / N_PATHS) * 100;

    const totalMonths = Math.max(Math.round(hz.years * 12), 1);
    const step = totalMonths <= 60 ? 1 : Math.ceil(totalMonths / 60);
    const fanSeries: FanPoint[] = [];
    for (let m = 0; m <= totalMonths; m += step) {
      const t = m / 12;
      const scale = t / hz.years;
      fanSeries.push({ month: m, p10: totalValue + (p10 - totalValue) * scale, p50: totalValue + (p50 - totalValue) * scale, p90: totalValue + (p90 - totalValue) * scale });
    }
    if (fanSeries[fanSeries.length - 1].month !== totalMonths) {
      fanSeries.push({ month: totalMonths, p10, p50, p90 });
    }

    return { label: hz.label, years: hz.years, median: p50, p10, p90, pLoss, p2x, fanSeries };
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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function FanTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#1A1816] bg-[#0D0C0A] px-3 py-2 text-xs shadow-xl">
      <p className="text-[#6B6560] mb-1">Month {label}</p>
      {payload.map((p) => (<p key={p.name} style={{ color: p.color }}>{p.name}: {fmtFull(p.value)}</p>))}
    </div>
  );
}

function ScenarioCard({ result, totalValue, selected, onClick }: { result: HorizonResult; totalValue: number; selected: boolean; onClick: () => void }) {
  const gain = result.median >= totalValue;
  return (
    <button onClick={onClick} className={`rounded-xl border p-4 text-left transition-all w-full ${selected ? "border-[#B8956A]/60 bg-[#B8956A]/10 ring-1 ring-[#B8956A]/30" : "border-[#B8956A]/15 bg-[#111010] hover:border-[#B8956A]/30"}`}>
      <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-2">{result.label} Horizon</p>
      <p className={`text-lg font-bold font-mono ${gain ? "text-[#B8956A]" : "text-red-400"}`}>{fmt(result.median)}</p>
      <p className="text-[10px] text-[#6B6560] mt-0.5">median outcome</p>
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-[10px]"><span className="text-[#6B6560]">P10 (bear)</span><span className="font-mono text-red-400">{fmt(result.p10)}</span></div>
        <div className="flex justify-between text-[10px]"><span className="text-[#6B6560]">P90 (bull)</span><span className="font-mono text-green-400">{fmt(result.p90)}</span></div>
      </div>
      <div className="mt-3 pt-3 border-t border-[#1A1816] space-y-1">
        <div className="flex justify-between text-[10px]"><span className="text-[#6B6560]">Loss prob</span><span className={`font-mono ${result.pLoss > 40 ? "text-red-400" : result.pLoss > 20 ? "text-yellow-400" : "text-green-400"}`}>{result.pLoss.toFixed(1)}%</span></div>
        <div className="flex justify-between text-[10px]"><span className="text-[#6B6560]">2x prob</span><span className={`font-mono ${result.p2x > 50 ? "text-green-400" : "text-[#E8E4DF]"}`}>{result.p2x.toFixed(1)}%</span></div>
      </div>
    </button>
  );
}

// ─── Monte Carlo Tab ─────────────────────────────────────────────────────────
export default function MonteCarloTab() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [tickerInput, setTickerInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(100000);
  const [expectedReturn, setExpectedReturn] = useState(12);
  const [corrMatrix, setCorrMatrix] = useState<number[][] | null>(null);
  const [corrLoading, setCorrLoading] = useState(false);
  const [results, setResults] = useState<HorizonResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState(1);
  const runRef = useRef(0);

  const totalWeight = holdings.reduce((s, h) => s + h.weight, 0);
  const weightsValid = Math.abs(totalWeight - 100) < 0.01;
  const blendedVol = holdings.reduce((s, h) => s + (h.weight / 100) * h.volatility, 0);

  const addTicker = async () => {
    const ticker = tickerInput.toUpperCase().trim();
    if (!ticker) return;
    if (holdings.find((h) => h.ticker === ticker)) { setFetchError(`${ticker} already in portfolio`); return; }
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/quant/stock?ticker=${ticker}`);
      const data = await res.json();
      if (!res.ok) { setFetchError(data.error || "Failed to fetch"); return; }
      setHoldings((prev) => [...prev, { ticker: data.ticker, name: data.name, price: data.price, currency: data.currency, volatility: data.volatility, drift: data.drift, weight: 0, dataPoints: data.dataPoints }]);
      setTickerInput("");
    } catch { setFetchError("Network error"); } finally { setFetching(false); }
  };

  const removeHolding = (ticker: string) => setHoldings((prev) => prev.filter((h) => h.ticker !== ticker));
  const setWeight = (ticker: string, weight: number) => setHoldings((prev) => prev.map((h) => (h.ticker === ticker ? { ...h, weight } : h)));

  const runSim = useCallback(async () => {
    if (!weightsValid || holdings.length === 0) return;
    setRunning(true);
    let corr: number[][] | null = null;
    if (holdings.length > 1) {
      try {
        setCorrLoading(true);
        const tickers = holdings.map((h) => h.ticker).join(",");
        const res = await fetch(`/api/quant/correlation?tickers=${encodeURIComponent(tickers)}`);
        const data = await res.json();
        corr = data.matrix || null;
        setCorrMatrix(corr);
      } catch { corr = null; } finally { setCorrLoading(false); }
    } else { setCorrMatrix(null); }

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
    <div className="space-y-6">
      {/* Portfolio Builder */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560]">Portfolio Builder</h2>
        <div className="flex items-center gap-3">
          <input type="text" value={tickerInput} onChange={(e) => setTickerInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && addTicker()} placeholder="Ticker (e.g. AAPL)" className="rounded-lg border border-[#1A1816] bg-[#0D0C0A] px-4 py-2.5 text-sm font-mono text-[#E8E4DF] placeholder:text-[#3A3830] focus:outline-none focus:border-[#B8956A]/40 w-48" />
          <button onClick={addTicker} disabled={fetching || !tickerInput.trim()} className="flex items-center gap-2 rounded-lg border border-[#B8956A]/30 bg-[#B8956A]/10 px-4 py-2.5 text-sm font-medium text-[#B8956A] hover:bg-[#B8956A]/20 transition-all disabled:opacity-40">
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </button>
          {fetchError && <span className="flex items-center gap-1.5 text-xs text-red-400"><AlertTriangle className="h-3.5 w-3.5" />{fetchError}</span>}
        </div>

        {holdings.length > 0 && (
          <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-[#1A1816]">
                  <th className="text-left text-[#6B6560] font-medium px-4 py-2.5 uppercase tracking-wider text-[9px]">Ticker</th>
                  <th className="text-left text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Name</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Price</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Vol%/yr</th>
                  <th className="text-right text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Drift%/yr</th>
                  <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px]">Weight %</th>
                  <th className="text-center text-[#6B6560] font-medium px-3 py-2.5 uppercase tracking-wider text-[9px] w-12">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.ticker} className="border-b border-[#1A1816] last:border-0 hover:bg-[#B8956A]/5 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#B8956A]">{h.ticker}</td>
                    <td className="px-3 py-3 text-[#E8E4DF]">{h.name}</td>
                    <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">${h.price.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[#E8E4DF]">{(h.volatility * 100).toFixed(1)}%</td>
                    <td className={`px-3 py-3 text-right font-mono ${h.drift >= 0 ? "text-green-400" : "text-red-400"}`}>{h.drift >= 0 ? "+" : ""}{(h.drift * 100).toFixed(1)}%</td>
                    <td className="px-3 py-3 text-center">
                      <input type="number" min={0} max={100} step={1} value={h.weight} onChange={(e) => setWeight(h.ticker, Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="w-16 rounded border border-[#1A1816] bg-[#0A0908] px-2 py-1 text-center font-mono text-[#E8E4DF] focus:outline-none focus:border-[#B8956A]/40" />
                    </td>
                    <td className="px-3 py-3 text-center"><button onClick={() => removeHolding(h.ticker)} className="text-[#6B6560] hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {holdings.length > 0 && (
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">Total Weight:</span>
              <span className={`text-sm font-bold font-mono ${weightsValid ? "text-green-400" : "text-red-400"}`}>{totalWeight.toFixed(0)}%</span>
              {!weightsValid && <span className="text-[10px] text-red-400">(must be 100%)</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">Portfolio $:</span>
              <input type="number" min={1} step={1000} value={totalValue} onChange={(e) => setTotalValue(Math.max(1, Number(e.target.value) || 0))} className="w-32 rounded border border-[#1A1816] bg-[#0A0908] px-3 py-1.5 font-mono text-sm text-[#E8E4DF] focus:outline-none focus:border-[#B8956A]/40" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">Exp. Return:</span>
              <input type="number" min={-50} max={100} step={1} value={expectedReturn} onChange={(e) => setExpectedReturn(Math.max(-50, Math.min(100, Number(e.target.value) || 0)))} className="w-20 rounded border border-[#1A1816] bg-[#0A0908] px-3 py-1.5 font-mono text-sm text-[#E8E4DF] focus:outline-none focus:border-[#B8956A]/40" />
              <span className="text-xs text-[#6B6560]">%/yr</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">Blended Vol:</span>
              <span className="text-sm font-mono text-[#E8E4DF]">{(blendedVol * 100).toFixed(1)}%/yr</span>
            </div>
            {holdings.length > 1 && (
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${corrMatrix ? "bg-[#B8956A]" : "bg-[#3A3530]"}`} />
                <span className="text-[10px] text-[#6B6560] uppercase tracking-wider">{corrLoading ? "Fetching corr…" : corrMatrix ? `${holdings.length}×${holdings.length} corr` : "Run to correlate"}</span>
              </div>
            )}
            <button onClick={runSim} disabled={running || !weightsValid || holdings.length === 0} className="flex items-center gap-2 rounded-xl border border-[#B8956A]/30 bg-[#B8956A]/10 px-5 py-2 text-sm font-medium text-[#B8956A] hover:bg-[#B8956A]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-auto">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Running…" : "Run Simulation"}
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560] mb-3">Scenario Outcomes · {N_PATHS.toLocaleString()} paths · {fmtFull(totalValue)} portfolio</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {results.map((r, i) => (<ScenarioCard key={r.label} result={r} totalValue={totalValue} selected={selectedHorizon === i} onClick={() => setSelectedHorizon(i)} />))}
            </div>
          </div>

          <div className="rounded-xl border border-[#B8956A]/15 bg-[#111010] p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6B6560]">Scenario Fan · P10 / P50 / P90</h2>
              <div className="flex items-center gap-1 rounded-lg border border-[#1A1816] bg-[#0D0C0A] p-0.5">
                {results.map((r, i) => (<button key={r.label} onClick={() => setSelectedHorizon(i)} className={`rounded-md px-3 py-1 text-[10px] font-medium transition-all ${selectedHorizon === i ? "bg-[#B8956A] text-[#060606]" : "text-[#6B6560] hover:text-[#E8E4DF]"}`}>{r.label}</button>))}
              </div>
            </div>
            <p className="text-[10px] text-[#6B6560] mb-4">{results[selectedHorizon].label} horizon · Linear interpolation of terminal quantile paths</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={results[selectedHorizon].fanSeries} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6B6560" }} tickLine={false} axisLine={{ stroke: "#1A1816" }} tickFormatter={(m: number) => m >= 12 ? `${(m / 12).toFixed(0)}yr` : `${m}m`} />
                <YAxis tick={{ fontSize: 10, fill: "#6B6560" }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => fmt(v)} />
                <Tooltip content={<FanTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, color: "#6B6560" }} />
                <ReferenceLine y={totalValue} stroke="#B8956A" strokeDasharray="4 3" />
                <Line type="monotone" dataKey="p10" name="P10 (bear)" stroke="#EF4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p50" name="P50 (median)" stroke="#B8956A" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="p90" name="P90 (bull)" stroke="#22C55E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] px-5 py-4">
            <p className="text-[10px] text-[#6B6560] leading-relaxed">
              <span className="text-[#B8956A] font-medium">How This Works —</span>{" "}
              Each of the {N_PATHS.toLocaleString()} simulated paths uses <span className="text-[#9A8878] font-medium">Geometric Brownian Motion (GBM)</span> — the same model used by options traders and institutional risk desks. The formula is <span className="text-[#9A8878] font-medium italic">S(T) = S₀ × e^(r·T + σ·√T·Z)</span>, where <span className="text-[#9A8878] font-medium">r</span> is your manually set expected annual return, <span className="text-[#9A8878] font-medium">σ (sigma)</span> is each stock&apos;s realized annualized volatility from 5 years of live daily price history, <span className="text-[#9A8878] font-medium">T</span> is the time horizon in years, and <span className="text-[#9A8878] font-medium">Z</span> is a random normal shock. When multiple holdings are present, a <span className="text-[#9A8878] font-medium">Cholesky-decomposed correlation matrix</span> is built from live return data so correlated assets move together. <span className="text-[#9A8878] font-medium">P10</span> is the worst-10% scenario, <span className="text-[#9A8878] font-medium">P50</span> is the median, and <span className="text-[#9A8878] font-medium">P90</span> is the best 10%. <span className="text-amber-400">⚠️ Not financial advice.</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
