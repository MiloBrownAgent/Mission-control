export const revalidate = 300; // 5-minute cache

interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
}

interface SparkData {
  close: number[];
  timestamp: number[];
}

interface TickerData {
  ticker: string;
  name: string;
  thesis: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  prevClose: number | null;
}

// ── Approximate 90-day correlation matrix (known relationships) ──
const TICKERS = ["HIMS", "GOOGL", "MSFT", "NVDA", "AVGO", "AMZN", "VST"];

const CORR_MATRIX: Record<string, Record<string, number>> = {
  HIMS:  { HIMS: 1.00, GOOGL: 0.35, MSFT: 0.32, NVDA: 0.40, AVGO: 0.38, AMZN: 0.37, VST: 0.28 },
  GOOGL: { HIMS: 0.35, GOOGL: 1.00, MSFT: 0.82, NVDA: 0.78, AVGO: 0.76, AMZN: 0.80, VST: 0.32 },
  MSFT:  { HIMS: 0.32, GOOGL: 0.82, MSFT: 1.00, NVDA: 0.75, AVGO: 0.73, AMZN: 0.78, VST: 0.30 },
  NVDA:  { HIMS: 0.40, GOOGL: 0.78, MSFT: 0.75, NVDA: 1.00, AVGO: 0.80, AMZN: 0.72, VST: 0.35 },
  AVGO:  { HIMS: 0.38, GOOGL: 0.76, MSFT: 0.73, NVDA: 0.80, AVGO: 1.00, AMZN: 0.74, VST: 0.33 },
  AMZN:  { HIMS: 0.37, GOOGL: 0.80, MSFT: 0.78, NVDA: 0.72, AVGO: 0.74, AMZN: 1.00, VST: 0.31 },
  VST:   { HIMS: 0.28, GOOGL: 0.32, MSFT: 0.30, NVDA: 0.35, AVGO: 0.33, AMZN: 0.31, VST: 1.00 },
};

const POSITIONS: { ticker: string; name: string; thesis: string; portfolioType: string }[] = [
  { ticker: "HIMS", name: "Hims & Hers Health", thesis: "GLP-1 compounding pharmacy — FDA stance is key risk", portfolioType: "high_risk" },
  { ticker: "GOOGL", name: "Alphabet / Google", thesis: "Search + Gemini AI — antitrust tail risk", portfolioType: "low_risk" },
  { ticker: "MSFT", name: "Microsoft", thesis: "Azure AI hyper-scaler — Copilot adoption", portfolioType: "low_risk" },
  { ticker: "NVDA", name: "NVIDIA", thesis: "GPU monopoly — custom silicon competition", portfolioType: "high_risk" },
  { ticker: "AVGO", name: "Broadcom", thesis: "Custom AI ASIC winner — hyperscaler capex", portfolioType: "low_risk" },
  { ticker: "AMZN", name: "Amazon", thesis: "AWS AI infrastructure + Anthropic", portfolioType: "low_risk" },
  { ticker: "VST", name: "Vistra Energy", thesis: "AI data center power in Texas", portfolioType: "high_risk" },
];

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchMacro(): Promise<{ vix: number | null; tenY: number | null }> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
  };

  let vix: number | null = null;
  let tenY: number | null = null;

  try {
    const vixRes = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d",
      { headers, next: { revalidate: 300 } }
    );
    if (vixRes.ok) {
      const data = await vixRes.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
      vix = data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
    }
  } catch {}

  try {
    const tnxRes = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=1d",
      { headers, next: { revalidate: 300 } }
    );
    if (tnxRes.ok) {
      const data = await tnxRes.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
      tenY = data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
    }
  } catch {}

  return { vix, tenY };
}

async function fetchQuotes(symbols: string[]): Promise<Record<string, YahooQuote>> {
  const symbolStr = symbols.join(",");
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
  };

  // Try spark endpoint for prices
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${symbolStr}&range=1d&interval=5m`,
      { headers, next: { revalidate: 300 } }
    );
    if (res.ok) {
      const raw = await res.text();
      // spark returns nested structure, try to parse it
      const data = JSON.parse(raw) as Record<string, { response?: Array<{ meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number }; indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> }>;

      const result: Record<string, YahooQuote> = {};
      for (const sym of symbols) {
        const resp = data[sym]?.response?.[0];
        if (!resp) continue;
        const closes = resp.indicators?.quote?.[0]?.close?.filter((c): c is number => c !== null && c !== undefined) ?? [];
        const currentPrice = resp.meta?.regularMarketPrice ?? (closes.length > 0 ? closes[closes.length - 1] : undefined);
        const prevClose = resp.meta?.previousClose ?? resp.meta?.chartPreviousClose;

        if (currentPrice !== undefined) {
          const change = prevClose ? currentPrice - prevClose : null;
          const changePct = prevClose && change !== null ? (change / prevClose) * 100 : null;
          result[sym] = {
            symbol: sym,
            regularMarketPrice: currentPrice,
            regularMarketChange: change ?? undefined,
            regularMarketChangePercent: changePct ?? undefined,
            regularMarketPreviousClose: prevClose,
          };
        }
      }
      if (Object.keys(result).length > 0) return result;
    }
  } catch {}

  // Fallback: try chart endpoint one by one for a few key tickers
  const result: Record<string, YahooQuote> = {};
  for (const sym of symbols.slice(0, 3)) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
        { headers, next: { revalidate: 300 } }
      );
      if (!res.ok) continue;
      const data = await res.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number } }> } };
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) continue;
      const price = meta.regularMarketPrice;
      const prevClose = meta.previousClose ?? meta.chartPreviousClose;
      const change = prevClose ? price - prevClose : null;
      const changePct = prevClose && change !== null ? (change / prevClose) * 100 : null;
      result[sym] = {
        symbol: sym,
        regularMarketPrice: price,
        regularMarketChange: change ?? undefined,
        regularMarketChangePercent: changePct ?? undefined,
        regularMarketPreviousClose: prevClose,
      };
    } catch {}
  }
  return result;
}

// ── Color helpers ────────────────────────────────────────────────────────────

function heatBg(pct: number | null): string {
  if (pct === null) return "bg-[#1A1816]";
  if (pct >= 3) return "bg-green-900/80 border-green-700/40";
  if (pct >= 1.5) return "bg-green-900/50 border-green-700/30";
  if (pct >= 0.5) return "bg-green-900/30 border-green-700/20";
  if (pct > -0.5) return "bg-[#1A1816] border-[#2A2824]";
  if (pct > -1.5) return "bg-red-900/30 border-red-700/20";
  if (pct > -3) return "bg-red-900/50 border-red-700/30";
  return "bg-red-900/80 border-red-700/40";
}

function pctColor(pct: number | null): string {
  if (pct === null) return "text-[#6B6560]";
  if (pct >= 0.5) return "text-green-400";
  if (pct > -0.5) return "text-[#E8E4DF]";
  return "text-red-400";
}

function corrColor(val: number): string {
  if (val >= 0.9) return "bg-purple-900/90 text-purple-200";
  if (val >= 0.7) return "bg-blue-900/70 text-blue-200";
  if (val >= 0.5) return "bg-blue-900/40 text-blue-300";
  if (val >= 0.3) return "bg-slate-700/50 text-slate-300";
  return "bg-slate-900/40 text-slate-400";
}

function vixColor(vix: number | null): string {
  if (vix === null) return "text-[#6B6560]";
  if (vix > 25) return "text-red-400";
  if (vix < 15) return "text-green-400";
  return "text-yellow-400";
}

function vixRisk(vix: number | null): { label: string; color: string } {
  if (vix === null) return { label: "UNKNOWN", color: "text-[#6B6560]" };
  if (vix > 30) return { label: "EXTREME FEAR", color: "text-red-400" };
  if (vix > 25) return { label: "ELEVATED RISK", color: "text-red-400" };
  if (vix > 20) return { label: "CAUTION", color: "text-orange-400" };
  if (vix > 15) return { label: "NEUTRAL", color: "text-yellow-400" };
  return { label: "RISK ON", color: "text-green-400" };
}

// ── Kelly Calculation ────────────────────────────────────────────────────────
// p=0.60 b=3.0 q=0.40 → Kelly = (0.6*3 - 0.4) / 3 = 1.4/3 = 0.467
const KELLY_P = 0.60;
const KELLY_B = 3.0;
const KELLY_Q = 0.40;
const KELLY_FULL = (KELLY_P * KELLY_B - KELLY_Q) / KELLY_B; // 0.4667
const KELLY_HALF = KELLY_FULL / 2; // 0.2333

// ── Main page ────────────────────────────────────────────────────────────────

export default async function WarRoomPage() {
  // Fetch all data in parallel
  const [macro, quotes] = await Promise.all([
    fetchMacro(),
    fetchQuotes(TICKERS),
  ]);

  const positions: TickerData[] = POSITIONS.map((p) => {
    const q = quotes[p.ticker];
    return {
      ticker: p.ticker,
      name: p.name,
      thesis: p.thesis,
      price: q?.regularMarketPrice ?? null,
      change: q?.regularMarketChange ?? null,
      changePct: q?.regularMarketChangePercent ?? null,
      prevClose: q?.regularMarketPreviousClose ?? null,
    };
  });

  const himsData = positions.find((p) => p.ticker === "HIMS");
  const { label: riskLabel, color: riskColor } = vixRisk(macro.vix);
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/Chicago" }) + " CT";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#060606] text-[#E8E4DF] font-mono">

      {/* ── HEADER ── */}
      <div className="border-b border-[#1A1816] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-[0.12em] uppercase text-[#E8E4DF] font-[family-name:var(--font-syne)]">
              Portfolio War Room
            </h1>
            <p className="text-[10px] text-[#6B6560] tracking-[0.15em] uppercase mt-0.5">
              Bloomberg-grade intelligence · 7 positions tracked
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#E8E4DF]">{timeStr}</p>
          <p className="text-[10px] text-[#6B6560]">{dateStr}</p>
          <p className="text-[10px] text-[#B8956A] mt-0.5">Auto-refresh: 5min</p>
        </div>
      </div>

      {/* ── MACRO BAND ── */}
      <div className="border-b border-[#1A1816] bg-[#0A0908] px-6 py-3 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6B6560] tracking-widest uppercase">VIX</span>
          <span className={`text-xl font-bold tabular-nums ${vixColor(macro.vix)}`}>
            {macro.vix !== null ? macro.vix.toFixed(2) : "—"}
          </span>
        </div>

        <div className="w-px h-6 bg-[#1A1816]" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6B6560] tracking-widest uppercase">10Y</span>
          <span className="text-xl font-bold tabular-nums text-[#E8E4DF]">
            {macro.tenY !== null ? `${macro.tenY.toFixed(2)}%` : "—"}
          </span>
        </div>

        <div className="w-px h-6 bg-[#1A1816]" />

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6B6560] tracking-widest uppercase">Risk Signal</span>
          <span className={`text-sm font-bold tracking-widest ${riskColor}`}>{riskLabel}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
            riskColor.includes("red") ? "border-red-700/40 bg-red-900/20" :
            riskColor.includes("green") ? "border-green-700/40 bg-green-900/20" :
            riskColor.includes("orange") ? "border-orange-700/40 bg-orange-900/20" :
            "border-yellow-700/40 bg-yellow-900/20"
          } ${riskColor}`}>
            VIX {macro.vix !== null ? (macro.vix > 25 ? "↑ ELEVATED" : macro.vix < 15 ? "↓ SUPPRESSED" : "→ NORMAL") : "N/A"}
          </span>
        </div>

        <div className="ml-auto text-[10px] text-[#6B6560]">
          Data: Yahoo Finance · {positions.filter(p => p.price !== null).length}/{positions.length} quotes live
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">

        {/* ── HEAT MAP ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#1A1816]" />
            <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B6560]">Portfolio Heat Map</h2>
            <div className="h-px flex-1 bg-[#1A1816]" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {positions.map((pos) => (
              <div
                key={pos.ticker}
                className={`rounded-xl border p-4 transition-all ${heatBg(pos.changePct)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-base font-bold text-[#E8E4DF] tracking-wider">{pos.ticker}</span>
                  {pos.changePct !== null && (
                    <span className={`text-[10px] font-bold ${pos.changePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {pos.changePct >= 0 ? "▲" : "▼"}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-[#6B6560] mb-3 leading-tight">{pos.name}</p>
                <div className="mt-auto">
                  <p className="text-lg font-bold tabular-nums text-[#E8E4DF]">
                    {pos.price !== null ? `$${pos.price.toFixed(2)}` : "—"}
                  </p>
                  <p className={`text-xs font-bold tabular-nums ${pctColor(pos.changePct)}`}>
                    {pos.changePct !== null
                      ? `${pos.changePct >= 0 ? "+" : ""}${pos.changePct.toFixed(2)}%`
                      : "unavailable"}
                  </p>
                  {pos.change !== null && (
                    <p className={`text-[9px] tabular-nums ${pctColor(pos.changePct)}`}>
                      {pos.change >= 0 ? "+" : ""}{pos.change.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 justify-end">
            <div className="flex items-center gap-1.5 text-[9px] text-[#6B6560]">
              <div className="w-3 h-3 rounded-sm bg-red-900/80" />
              <span>−3%+</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-[#6B6560]">
              <div className="w-3 h-3 rounded-sm bg-[#1A1816]" />
              <span>flat</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-[#6B6560]">
              <div className="w-3 h-3 rounded-sm bg-green-900/80" />
              <span>+3%+</span>
            </div>
          </div>
        </section>

        {/* ── THESIS HEALTH TRACKER ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#1A1816]" />
            <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B6560]">Thesis Health Tracker</h2>
            <div className="h-px flex-1 bg-[#1A1816]" />
          </div>

          <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto_auto] text-[9px] text-[#6B6560] uppercase tracking-widest border-b border-[#1A1816] px-5 py-2">
              <span>Position</span>
              <span className="text-right">Price</span>
              <span className="text-right pl-6">Day Chg</span>
              <span className="text-right pl-6">Status</span>
            </div>
            {positions.map((pos, i) => (
              <div
                key={pos.ticker}
                className={`grid grid-cols-[1fr_auto_auto_auto] items-start px-5 py-4 gap-4 ${i < positions.length - 1 ? "border-b border-[#1A1816]" : ""}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[#E8E4DF]">{pos.ticker}</span>
                    <span className="text-[10px] text-[#6B6560]">{pos.name}</span>
                  </div>
                  <p className="text-xs text-[#6B6560]">{pos.thesis}</p>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-sm text-[#E8E4DF]">
                    {pos.price !== null ? `$${pos.price.toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className={`text-right tabular-nums pl-6 text-sm font-bold ${pctColor(pos.changePct)}`}>
                  {pos.changePct !== null
                    ? `${pos.changePct >= 0 ? "+" : ""}${pos.changePct.toFixed(2)}%`
                    : "—"}
                </div>
                <div className="pl-6">
                  <span className="text-[9px] font-bold tracking-widest text-[#B8956A] bg-[#B8956A]/10 border border-[#B8956A]/20 rounded-full px-2 py-0.5">
                    TRACKING
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM ROW: Kelly + Correlation ── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── KELLY EDGE METER ── */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-[#1A1816]" />
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B6560]">Kelly Edge Meter — HIMS</h2>
              <div className="h-px flex-1 bg-[#1A1816]" />
            </div>

            <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-6 space-y-5">
              {/* Equation */}
              <div className="text-[10px] text-[#6B6560] font-mono">
                <p className="mb-1">Kelly = (p × b − q) / b</p>
                <p className="text-[#B8956A]">= ({KELLY_P} × {KELLY_B} − {KELLY_Q}) / {KELLY_B} = <span className="font-bold text-green-400">{(KELLY_FULL * 100).toFixed(1)}%</span></p>
              </div>

              {/* Current price */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">HIMS Current Price</p>
                  <p className="text-3xl font-bold text-[#E8E4DF] tabular-nums">
                    {himsData?.price !== null && himsData?.price !== undefined ? `$${himsData.price.toFixed(2)}` : "—"}
                  </p>
                  {himsData?.changePct !== null && himsData?.changePct !== undefined && (
                    <p className={`text-sm font-bold tabular-nums mt-1 ${pctColor(himsData.changePct)}`}>
                      {himsData.changePct >= 0 ? "+" : ""}{himsData.changePct.toFixed(2)}% today
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Thesis</p>
                  <p className="text-[10px] text-[#6B6560] max-w-[140px] text-right leading-relaxed">
                    GLP-1 compounding pharmacy<br />FDA stance is key risk
                  </p>
                </div>
              </div>

              {/* Full Kelly gauge */}
              <div>
                <div className="flex justify-between text-[10px] text-[#6B6560] mb-1.5">
                  <span>Full Kelly: {(KELLY_FULL * 100).toFixed(1)}%</span>
                  <span className="text-orange-400">⚠ Aggressive</span>
                </div>
                <div className="h-4 rounded-full bg-[#1A1816] overflow-hidden relative">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all"
                    style={{ width: `${Math.min(KELLY_FULL * 100, 100)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-[#060606]">{(KELLY_FULL * 100).toFixed(1)}% MAX</span>
                  </div>
                </div>
              </div>

              {/* Half Kelly gauge (recommended) */}
              <div>
                <div className="flex justify-between text-[10px] text-[#6B6560] mb-1.5">
                  <span>Half-Kelly: {(KELLY_HALF * 100).toFixed(1)}%</span>
                  <span className="text-green-400">✓ Recommended</span>
                </div>
                <div className="h-4 rounded-full bg-[#1A1816] overflow-hidden relative">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#B8956A] to-[#CDAA7E] transition-all"
                    style={{ width: `${Math.min(KELLY_HALF * 100, 100)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-[#060606]">{(KELLY_HALF * 100).toFixed(1)}% REC</span>
                  </div>
                </div>
              </div>

              {/* Params */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#1A1816]">
                <div className="text-center">
                  <p className="text-[10px] text-[#6B6560] mb-1">Win Prob (p)</p>
                  <p className="text-lg font-bold text-green-400">{(KELLY_P * 100).toFixed(0)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-[#6B6560] mb-1">Win/Loss Ratio (b)</p>
                  <p className="text-lg font-bold text-[#B8956A]">{KELLY_B}×</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-[#6B6560] mb-1">Loss Prob (q)</p>
                  <p className="text-lg font-bold text-red-400">{(KELLY_Q * 100).toFixed(0)}%</p>
                </div>
              </div>

              <p className="text-[9px] text-[#6B6560] pt-2 border-t border-[#1A1816]">
                Half-Kelly is the standard for managing risk. Sizing HIMS above {(KELLY_HALF * 100).toFixed(1)}% of portfolio increases ruin probability non-linearly. Full Kelly ({(KELLY_FULL * 100).toFixed(1)}%) is theoretical maximum — never use in practice.
              </p>
            </div>
          </section>

          {/* ── CORRELATION MATRIX ── */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-[#1A1816]" />
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B6560]">90-Day Approx Correlation</h2>
              <div className="h-px flex-1 bg-[#1A1816]" />
            </div>

            <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] p-4 overflow-x-auto">
              <table className="w-full text-center text-[9px]">
                <thead>
                  <tr>
                    <th className="w-10 py-1" />
                    {TICKERS.map((t) => (
                      <th key={t} className="py-1 px-1 font-bold text-[#6B6560] tracking-wider">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TICKERS.map((rowT) => (
                    <tr key={rowT}>
                      <td className="py-1 pr-2 font-bold text-[#6B6560] text-right tracking-wider">{rowT}</td>
                      {TICKERS.map((colT) => {
                        const val = CORR_MATRIX[rowT][colT];
                        return (
                          <td key={colT} className="py-0.5 px-0.5">
                            <div className={`rounded py-1.5 px-1 font-bold tabular-nums ${corrColor(val)}`}>
                              {val.toFixed(2)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[#1A1816]">
                <div className="flex items-center gap-1.5 text-[9px] text-[#6B6560]">
                  <div className="w-3 h-3 rounded-sm bg-purple-900/90" />
                  <span>≥0.9 Perfect</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-[#6B6560]">
                  <div className="w-3 h-3 rounded-sm bg-blue-900/70" />
                  <span>0.7–0.9 High</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-[#6B6560]">
                  <div className="w-3 h-3 rounded-sm bg-blue-900/40" />
                  <span>0.5–0.7 Moderate</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-[#6B6560]">
                  <div className="w-3 h-3 rounded-sm bg-slate-700/50" />
                  <span>&lt;0.5 Low</span>
                </div>
              </div>
              <p className="text-[9px] text-[#6B6560] mt-2">
                Approx values based on 90-day tech/macro correlations. HIMS and VST are less correlated with mega-cap tech — useful for diversification.
              </p>
            </div>
          </section>
        </div>

        {/* ── DECISION LOG ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#1A1816]" />
            <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B6560]">Decision Log</h2>
            <div className="h-px flex-1 bg-[#1A1816]" />
          </div>
          <DecisionLog />
        </section>

        {/* ── FOOTER ── */}
        <div className="border-t border-[#1A1816] pt-4 pb-2 flex flex-wrap items-center justify-between gap-4 text-[9px] text-[#6B6560]">
          <div className="flex flex-wrap gap-4">
            <span>Data: Yahoo Finance (public API)</span>
            <span>·</span>
            <span>Kelly model: p=60% · b=3.0× · half-Kelly recommended</span>
            <span>·</span>
            <span>Correlation: 90-day approx</span>
          </div>
          <div className="text-right">
            <p>Not financial advice. For informational purposes only.</p>
            <p className="text-[#B8956A]">Mission Control · War Room · {dateStr}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Decision Log (Server Component reading from Convex REST) ─────────────────

async function DecisionLog() {
  let decisions: Array<{
    _id: string;
    ticker: string;
    action: string;
    price: number;
    shares?: number;
    followedSystem?: boolean;
    notes?: string;
    decidedAt: number;
  }> = [];

  try {
    const res = await fetch("https://proper-rat-443.convex.cloud/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Convex-Client": "npm-1.33.0",
      },
      body: JSON.stringify({
        path: "trades:listTradeDecisions",
        args: { limit: 15 },
        format: "json",
      }),
      next: { revalidate: 300 },
    });

    if (res.ok) {
      const data = await res.json() as { value?: typeof decisions; status?: string };
      if (data?.value && Array.isArray(data.value)) {
        decisions = data.value;
      }
    }
  } catch {}

  return (
    <div className="rounded-xl border border-[#1A1816] bg-[#0D0C0A] overflow-hidden">
      {decisions.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-[#6B6560] mb-2">No trade decisions logged yet.</p>
          <p className="text-[10px] text-[#6B6560]">Every buy, sell, add, and trim you make gets logged here via the Investment Hub → Portfolio → Trade System tab.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[auto_auto_auto_auto_1fr_auto] text-[9px] text-[#6B6560] uppercase tracking-widest border-b border-[#1A1816] px-5 py-2 gap-4">
            <span>Date</span>
            <span>Ticker</span>
            <span>Action</span>
            <span>Price</span>
            <span>Notes</span>
            <span className="text-right">System</span>
          </div>
          <div className="divide-y divide-[#1A1816] max-h-64 overflow-y-auto">
            {decisions.map((d) => (
              <div key={d._id} className="grid grid-cols-[auto_auto_auto_auto_1fr_auto] items-center px-5 py-3 gap-4 text-xs">
                <span className="text-[10px] text-[#6B6560] tabular-nums whitespace-nowrap">
                  {new Date(d.decidedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <span className="font-bold text-[#E8E4DF]">{d.ticker}</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  d.action === "buy" ? "bg-green-500/10 text-green-400" :
                  d.action === "sell" ? "bg-red-500/10 text-red-400" :
                  d.action === "add" ? "bg-blue-500/10 text-blue-400" :
                  d.action === "trim" ? "bg-yellow-500/10 text-yellow-400" :
                  "bg-[#1A1816] text-[#6B6560]"
                }`}>
                  {d.action}
                </span>
                <span className="tabular-nums text-[#E8E4DF]">${d.price.toFixed(2)}</span>
                <span className="text-[#6B6560] truncate">{d.notes ?? "—"}</span>
                <span className={`text-[10px] font-bold text-right ${
                  d.followedSystem === true ? "text-green-400" :
                  d.followedSystem === false ? "text-red-400" :
                  "text-[#6B6560]"
                }`}>
                  {d.followedSystem === true ? "✓ SYS" : d.followedSystem === false ? "✗ OVR" : "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
