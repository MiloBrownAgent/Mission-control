#!/usr/bin/env node

/**
 * discover-opportunities.js
 *
 * Finds 3 new investment opportunities daily by:
 * 1. Scanning financial news for momentum/catalyst stocks
 * 2. Screening Yahoo Finance for unusual movers
 * 3. Filtering against existing positions + opportunities + moral exclusions
 * 4. Generating thesis via the site API (or Claude directly)
 *
 * Usage:
 *   node scripts/discover-opportunities.js              # find + upsert 3 new
 *   node scripts/discover-opportunities.js --dry-run    # preview only
 *   node scripts/discover-opportunities.js --count 5    # find 5 instead of 3
 */

const CONVEX_URL = "https://proper-rat-443.convex.cloud";
const SITE_URL = process.env.SITE_URL || "https://mc.lookandseen.com";
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const TZ = "America/Chicago";

const DRY_RUN = process.argv.includes("--dry-run");
const TARGET_COUNT = (() => {
  const idx = process.argv.indexOf("--count");
  return idx >= 0 && process.argv[idx + 1] ? parseInt(process.argv[idx + 1], 10) : 3;
})();

// Moral screen: never recommend these
const EXCLUDED = new Set(["PLTR", "META"]);

// Opportunity types we look for
const SEARCH_THEMES = [
  { query: "best growth stocks to buy this week catalyst 2026", type: "growth_catalyst" },
  { query: "undervalued small cap stocks breakout momentum", type: "momentum_breakout" },
  { query: "stock unusual volume insider buying this week", type: "insider_signal" },
  { query: "beaten down stocks analyst upgrade recovery", type: "contrarian_recovery" },
  { query: "IPO stock emerging growth high upside asymmetric", type: "asymmetric_setup" },
  { query: "sector rotation stocks institutional buying trend", type: "sector_rotation" },
  { query: "earnings surprise stock beat estimates raised guidance", type: "earnings_momentum" },
];

// ── Helpers ──

async function convex(kind, path, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ path, args }),
  });
  if (!res.ok) throw new Error(`${kind} ${path} failed: ${res.status}`);
  const payload = await res.json();
  return Object.prototype.hasOwnProperty.call(payload, "value") ? payload.value : payload;
}

const query = (path, args) => convex("query", path, args);
const mutation = (path, args) => convex("mutation", path, args);

function chicagoDateKey(ts = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(ts));
}

async function fetchPrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
}

async function fetchYahooProfile(ticker) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=6mo`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      price: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose,
      marketCap: meta.marketCap,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    };
  } catch { return null; }
}

async function fetchYahooDescription(ticker) {
  try {
    // Get crumb + cookie for v10 API
    const cookieRes = await fetch("https://fc.yahoo.com", { redirect: "manual" });
    const cookie = cookieRes.headers.get("set-cookie") || "";
    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": "Mozilla/5.0", Cookie: cookie },
    });
    const crumb = crumbRes.ok ? await crumbRes.text() : "";
    const crumbParam = crumb ? `&crumb=${encodeURIComponent(crumb)}` : "";

    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=assetProfile${crumbParam}`,
      { headers: { "User-Agent": "Mozilla/5.0", ...(cookie ? { Cookie: cookie } : {}) }, signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const profile = data?.quoteSummary?.result?.[0]?.assetProfile;
    if (!profile) return null;

    // Build a concise description: what the company does + sector/industry
    const summary = profile.longBusinessSummary || "";
    const sector = profile.sector || "";
    const industry = profile.industry || "";

    // Take first 2 sentences of the summary (concise)
    const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];
    const shortSummary = sentences.slice(0, 2).join(" ").trim();

    if (shortSummary) {
      return sector && industry
        ? `${shortSummary} (${sector} — ${industry})`
        : shortSummary;
    }
    return sector && industry ? `${sector} — ${industry}` : null;
  } catch { return null; }
}

// ── Yahoo Finance Screener / Trending ──

async function fetchYahooTrending() {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v1/finance/trending/US?count=30",
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const quotes = data?.finance?.result?.[0]?.quotes || [];
    return quotes.map((q) => q.symbol).filter(Boolean);
  } catch { return []; }
}

async function fetchYahooGainers() {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_gainers&count=25",
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const quotes = data?.finance?.result?.[0]?.quotes || [];
    return quotes.map((q) => ({
      ticker: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent,
      marketCap: q.marketCap,
      volume: q.regularMarketVolume,
      avgVolume: q.averageDailyVolume3Month,
    }));
  } catch { return []; }
}

async function fetchYahooMostActive() {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives&count=25",
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const quotes = data?.finance?.result?.[0]?.quotes || [];
    return quotes.map((q) => ({
      ticker: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent,
      marketCap: q.marketCap,
      volume: q.regularMarketVolume,
      avgVolume: q.averageDailyVolume3Month,
    }));
  } catch { return []; }
}

async function fetchYahooUndervalued() {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=undervalued_growth_stocks&count=25",
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const quotes = data?.finance?.result?.[0]?.quotes || [];
    return quotes.map((q) => ({
      ticker: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent,
      marketCap: q.marketCap,
      volume: q.regularMarketVolume,
      avgVolume: q.averageDailyVolume3Month,
    }));
  } catch { return []; }
}

// ── Brave Search (optional, used when key available) ──

async function braveSearch(searchQuery, count = 10) {
  if (!BRAVE_API_KEY) return [];
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=${count}&freshness=week`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "X-Subscription-Token": BRAVE_API_KEY },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.web?.results || []).map((r) => ({
      title: r.title,
      description: r.description,
      url: r.url,
    }));
  } catch { return []; }
}

// ── Claude Selection + Extraction ──

async function selectBestCandidates(candidates, knownTickers) {
  if (!ANTHROPIC_API_KEY || candidates.length === 0) return candidates.slice(0, TARGET_COUNT * 2);

  const context = candidates.map((c) => ({
    ticker: c.ticker,
    name: c.name,
    signals: c.signals,
    price: c.price,
    change: c.change,
    marketCap: c.marketCap,
    volume: c.volume,
    avgVolume: c.avgVolume,
    reason: c.reason,
  }));

  const prompt = `You are an investment research analyst. From these stock candidates, select the ${TARGET_COUNT * 2} BEST opportunities for an active investor who likes asymmetric setups, catalysts, and mispriced names.

Candidates:
${JSON.stringify(context, null, 2)}

Already tracked (skip these): ${[...knownTickers].join(", ")}
Never recommend: ${[...EXCLUDED].join(", ")}

Selection criteria:
- Prefer stocks with multiple signals (appearing in trending + gainers + undervalued = strong)
- Prefer mid/small caps ($500M-$20B market cap) over mega-caps
- Prefer unusual volume (volume >> avgVolume) as it signals institutional activity
- Prefer stocks with clear catalysts or inflection points
- Avoid meme stocks with no fundamental thesis

Return ONLY a JSON array of tickers in priority order, no other text:
["TICKER1", "TICKER2", ...]`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) return candidates.slice(0, TARGET_COUNT * 2);
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return candidates.slice(0, TARGET_COUNT * 2);
    
    const selectedTickers = JSON.parse(jsonMatch[0]).map((t) => t.toUpperCase());
    const candidateMap = new Map(candidates.map((c) => [c.ticker.toUpperCase(), c]));
    
    return selectedTickers
      .filter((t) => candidateMap.has(t))
      .map((t) => candidateMap.get(t));
  } catch {
    return candidates.slice(0, TARGET_COUNT * 2);
  }
}

async function extractTickersFromSearchResults(allResults, knownTickers) {
  if (!ANTHROPIC_API_KEY) {
    console.error("[discover] No ANTHROPIC_API_KEY — cannot extract tickers");
    return [];
  }

  const searchContext = allResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`)
    .join("\n\n");

  const prompt = `You are a stock research assistant. Analyze these financial news search results and extract specific stock ticker symbols that represent compelling investment opportunities.

Search results:
${searchContext}

Already tracked tickers (DO NOT include these): ${[...knownTickers].join(", ")}
Excluded tickers (NEVER recommend): ${[...EXCLUDED].join(", ")}

Rules:
1. Extract ONLY real US-listed stock tickers (NYSE, NASDAQ)
2. Skip ETFs, mutual funds, and index funds
3. Skip mega-caps that everyone already knows (AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA) unless there's a very specific catalyst
4. Prefer: mid/small caps with catalysts, beaten-down names with recovery signals, asymmetric risk/reward setups
5. For each ticker, provide a 1-sentence reason why it appeared in the results

Return ONLY a JSON array, no other text:
[
  { "ticker": "XXXX", "name": "Company Name", "reason": "Brief catalyst/reason from search results", "searchTheme": "theme category" }
]

Return at most 15 candidates. If you can't find good candidates, return fewer.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[discover] Claude extraction failed: ${res.status} ${errText}`);
      return [];
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`[discover] Ticker extraction error: ${err.message}`);
    return [];
  }
}

// ── Full Yahoo Data Fetch ──

async function fetchFullYahooData(ticker) {
  try {
    const cookieRes = await fetch("https://fc.yahoo.com", { redirect: "manual" });
    const cookie = cookieRes.headers.get("set-cookie") || "";
    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": "Mozilla/5.0", Cookie: cookie },
    });
    const crumb = crumbRes.ok ? await crumbRes.text() : "";
    const cp = crumb ? `&crumb=${encodeURIComponent(crumb)}` : "";

    const modules = "assetProfile,price,financialData,defaultKeyStatistics,recommendationTrend,earningsTrend";
    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}${cp}`,
      { headers: { "User-Agent": "Mozilla/5.0", ...(cookie ? { Cookie: cookie } : {}) }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const r = data?.quoteSummary?.result?.[0];
    if (!r) return null;

    const fmtB = (v) => v ? `$${(v / 1e9).toFixed(2)}B` : "N/A";
    const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "N/A";

    return {
      // Company info
      sector: r.assetProfile?.sector,
      industry: r.assetProfile?.industry,
      employees: r.assetProfile?.fullTimeEmployees,
      website: r.assetProfile?.website,
      summary: r.assetProfile?.longBusinessSummary,
      // Price
      price: r.price?.regularMarketPrice?.raw,
      marketCap: r.price?.marketCap?.raw,
      marketCapFmt: fmtB(r.price?.marketCap?.raw),
      // Financials
      revenue: r.financialData?.totalRevenue?.raw,
      revenueFmt: fmtB(r.financialData?.totalRevenue?.raw),
      revenueGrowth: r.financialData?.revenueGrowth?.raw,
      revenueGrowthFmt: fmtPct(r.financialData?.revenueGrowth?.raw),
      grossMargin: fmtPct(r.financialData?.grossMargins?.raw),
      operatingMargin: fmtPct(r.financialData?.operatingMargins?.raw),
      profitMargin: fmtPct(r.financialData?.profitMargins?.raw),
      freeCashflow: r.financialData?.freeCashflow?.raw,
      freeCashflowFmt: fmtB(r.financialData?.freeCashflow?.raw),
      totalDebt: fmtB(r.financialData?.totalDebt?.raw),
      totalCash: fmtB(r.financialData?.totalCash?.raw),
      // Valuation
      trailingPE: r.defaultKeyStatistics?.trailingPE?.raw?.toFixed(1),
      forwardPE: r.defaultKeyStatistics?.forwardPE?.raw?.toFixed(1),
      pegRatio: r.defaultKeyStatistics?.pegRatio?.raw?.toFixed(2),
      priceToBook: r.defaultKeyStatistics?.priceToBook?.raw?.toFixed(2),
      // Analyst
      targetMean: r.financialData?.targetMeanPrice?.raw,
      targetHigh: r.financialData?.targetHighPrice?.raw,
      targetLow: r.financialData?.targetLowPrice?.raw,
      recommendation: r.financialData?.recommendationKey,
      numAnalysts: r.financialData?.numberOfAnalystOpinions?.raw,
      // Short interest
      shortPctFloat: r.defaultKeyStatistics?.shortPercentOfFloat?.raw,
      shortPctFloatFmt: fmtPct(r.defaultKeyStatistics?.shortPercentOfFloat?.raw),
      // Earnings
      earningsTrend: r.earningsTrend?.trend?.map((t) => ({
        period: t.period,
        growth: t.growth?.raw,
        estimate: t.earningsEstimate?.avg?.raw,
        upRevisions: (t.earningsEstimate?.upLast30days?.raw || 0),
        downRevisions: (t.earningsEstimate?.downLast30days?.raw || 0),
      })),
    };
  } catch (err) {
    console.error(`[discover] Full Yahoo data fetch failed for ${ticker}: ${err.message}`);
    return null;
  }
}

async function fetchYahooNews(ticker) {
  try {
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
    const res = await fetch(rssUrl, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split("<item>").slice(1, 8);
    return items.map((item) => {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      return {
        title: (titleMatch?.[1] || titleMatch?.[2] || "").replace(/&amp;/g, "&"),
        url: linkMatch?.[1] || "",
      };
    }).filter((a) => a.title && a.url);
  } catch { return []; }
}

// ── Thesis Generation via Site API ──

async function generateThesis(candidate, yahooData) {
  const ticker = candidate.ticker;

  // Fetch rich data
  const [fullData, news] = await Promise.all([
    fetchFullYahooData(ticker),
    fetchYahooNews(ticker),
  ]);

  const d = fullData || {};
  const price = yahooData.price || d.price;

  // Build data-rich context for thesis generation
  const dataBlock = [
    `TICKER: ${ticker}`,
    `NAME: ${candidate.name}`,
    `PRICE: $${price?.toFixed(2) || "N/A"}`,
    `MARKET CAP: ${d.marketCapFmt || "N/A"}`,
    `SECTOR: ${d.sector || "N/A"} | INDUSTRY: ${d.industry || "N/A"}`,
    `REVENUE: ${d.revenueFmt || "N/A"} | REVENUE GROWTH: ${d.revenueGrowthFmt || "N/A"}`,
    `GROSS MARGIN: ${d.grossMargin || "N/A"} | OPERATING MARGIN: ${d.operatingMargin || "N/A"}`,
    `FREE CASH FLOW: ${d.freeCashflowFmt || "N/A"}`,
    `TOTAL CASH: ${d.totalCash || "N/A"} | TOTAL DEBT: ${d.totalDebt || "N/A"}`,
    `TRAILING P/E: ${d.trailingPE || "N/A"} | FORWARD P/E: ${d.forwardPE || "N/A"} | PEG: ${d.pegRatio || "N/A"}`,
    `52W HIGH: $${yahooData.fiftyTwoWeekHigh?.toFixed(2) || "N/A"} | 52W LOW: $${yahooData.fiftyTwoWeekLow?.toFixed(2) || "N/A"}`,
    `ANALYST TARGET: Mean $${d.targetMean || "N/A"} (Low $${d.targetLow || "N/A"} / High $${d.targetHigh || "N/A"}) | ${d.numAnalysts || 0} analysts | Consensus: ${d.recommendation || "N/A"}`,
    `SHORT % OF FLOAT: ${d.shortPctFloatFmt || "N/A"}`,
    `DISCOVERY SIGNALS: ${candidate.signals?.join(", ") || "N/A"}`,
    d.employees ? `EMPLOYEES: ${d.employees.toLocaleString()}` : null,
  ].filter(Boolean).join("\n");

  const newsBlock = news.length > 0
    ? "\nRECENT NEWS:\n" + news.slice(0, 5).map((n) => `- ${n.title}`).join("\n")
    : "";

  // Calculate upside to analyst target
  const upsidePct = d.targetMean && price
    ? Math.round(((d.targetMean - price) / price) * 100)
    : null;

  // Use site API for AI-generated thesis
  try {
    console.error(`[discover] Generating thesis for ${ticker} via ${SITE_URL}...`);
    const res = await fetch(`${SITE_URL}/api/investments/opportunity-thesis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, name: candidate.name, dataBlock, newsBlock }),
      signal: AbortSignal.timeout(45_000),
    });

    if (res.ok) {
      const result = await res.json();
      if (result.thesis) {
        return {
          thesis: result.thesis,
          opportunityType: result.opportunityType || guessOpportunityType(candidate),
          expectedUpside: upsidePct ? `${upsidePct}% to analyst mean ($${d.targetMean})` : (result.expectedUpside || "TBD"),
          catalysts: result.catalysts || [],
          risks: result.risks || [],
          timeHorizon: result.timeHorizon || "3-6 months",
          moralScreenPass: result.moralScreenPass !== false,
          sources: news.slice(0, 5),
        };
      }
    }
  } catch (err) {
    console.error(`[discover] Site thesis error for ${ticker}: ${err.message}`);
  }

  // Fallback: build a deterministic data-driven thesis (no AI needed)
  console.error(`[discover] Using deterministic thesis for ${ticker}`);
  return buildDeterministicThesis(candidate, yahooData, d, news, upsidePct);
}

function guessOpportunityType(candidate) {
  const s = candidate.signals || [];
  if (s.includes("undervalued_growth")) return "contrarian_recovery";
  if (s.includes("top_gainer")) return "momentum_breakout";
  if (s.includes("most_active")) return "growth_catalyst";
  return "growth_catalyst";
}

function buildDeterministicThesis(candidate, yahooData, d, news, upsidePct) {
  const ticker = candidate.ticker;
  const price = yahooData.price || d.price;
  const lines = [];

  // Key metrics header
  lines.push(`MARKET CAP: ${d.marketCapFmt || "N/A"} | REVENUE: ${d.revenueFmt || "N/A"} | GROWTH: ${d.revenueGrowthFmt || "N/A"}`);
  lines.push(`P/E (FWD): ${d.forwardPE || "N/A"} | GROSS MARGIN: ${d.grossMargin || "N/A"} | FCF: ${d.freeCashflowFmt || "N/A"}`);
  if (d.targetMean && price) {
    lines.push(`ANALYST TARGET: $${d.targetMean} mean (${upsidePct >= 0 ? "+" : ""}${upsidePct}%) | ${d.numAnalysts || 0} analysts | Consensus: ${(d.recommendation || "N/A").toUpperCase()}`);
  }
  lines.push("");

  // Why it showed up
  const signals = candidate.signals || [];
  if (signals.length > 0) {
    const signalDescriptions = signals.map((s) => {
      if (s === "trending") return "trending on Yahoo Finance";
      if (s === "top_gainer") return "top daily gainer";
      if (s === "most_active") return "unusual volume / most active";
      if (s === "undervalued_growth") return "flagged as undervalued growth";
      if (s === "news_mention") return "recent news catalyst";
      return s;
    });
    lines.push(`DISCOVERY: Surfaced because it is ${signalDescriptions.join(" + ")}.`);
  }

  // Valuation context
  if (d.forwardPE && parseFloat(d.forwardPE) < 15) {
    lines.push(`VALUATION: Forward P/E of ${d.forwardPE} is below market average, suggesting the market is underpricing growth or earnings power.`);
  } else if (d.forwardPE && parseFloat(d.forwardPE) > 40) {
    lines.push(`VALUATION: Forward P/E of ${d.forwardPE} is elevated — market is pricing in significant growth. Execution risk is high.`);
  }

  // Growth profile
  if (d.revenueGrowth != null) {
    const g = (d.revenueGrowth * 100).toFixed(1);
    if (d.revenueGrowth > 0.2) {
      lines.push(`GROWTH: Revenue growing ${g}% YoY — strong top-line expansion.`);
    } else if (d.revenueGrowth > 0) {
      lines.push(`GROWTH: Revenue growing ${g}% YoY — moderate but positive.`);
    } else {
      lines.push(`GROWTH: Revenue declining ${g}% YoY — turnaround story or structural challenge.`);
    }
  }

  // Balance sheet
  if (d.totalCash !== "N/A" && d.totalDebt !== "N/A") {
    lines.push(`BALANCE SHEET: ${d.totalCash} cash vs ${d.totalDebt} debt. FCF: ${d.freeCashflowFmt || "N/A"}.`);
  }

  // 52-week range context
  if (yahooData.fiftyTwoWeekHigh && yahooData.fiftyTwoWeekLow && price) {
    const range = yahooData.fiftyTwoWeekHigh - yahooData.fiftyTwoWeekLow;
    const position = range > 0 ? ((price - yahooData.fiftyTwoWeekLow) / range * 100).toFixed(0) : 50;
    lines.push(`RANGE: Trading at ${position}% of 52-week range ($${yahooData.fiftyTwoWeekLow.toFixed(2)} - $${yahooData.fiftyTwoWeekHigh.toFixed(2)}).`);
  }

  // Short interest
  if (d.shortPctFloat != null && d.shortPctFloat > 0.05) {
    lines.push(`SHORT INTEREST: ${d.shortPctFloatFmt} of float is short — potential squeeze catalyst or bearish signal to investigate.`);
  }

  const thesis = lines.join("\n");

  // Build real catalysts from data
  const catalysts = [];
  if (upsidePct && upsidePct > 20) catalysts.push(`${upsidePct}% upside to analyst consensus target of $${d.targetMean}`);
  if (d.revenueGrowth > 0.15) catalysts.push(`Strong revenue growth at ${(d.revenueGrowth * 100).toFixed(1)}% YoY`);
  if (d.forwardPE && parseFloat(d.forwardPE) < 15) catalysts.push(`Low forward P/E of ${d.forwardPE} — potential value unlock`);
  if (d.earningsTrend) {
    const nextQ = d.earningsTrend.find((t) => t.period === "+1q");
    if (nextQ?.upRevisions > nextQ?.downRevisions) catalysts.push(`Positive earnings revision momentum (${nextQ.upRevisions} up vs ${nextQ.downRevisions} down last 30d)`);
  }
  if (news.length > 0) catalysts.push(`Recent news flow: ${news[0].title.slice(0, 80)}`);
  if (catalysts.length === 0) catalysts.push("Screener signal — requires further catalyst identification");

  // Build real risks from data
  const risks = [];
  if (d.forwardPE && parseFloat(d.forwardPE) > 40) risks.push(`Elevated valuation (${d.forwardPE}x forward P/E) leaves little margin of safety`);
  if (d.revenueGrowth != null && d.revenueGrowth < 0) risks.push(`Revenue declining ${(d.revenueGrowth * 100).toFixed(1)}% — fundamental deterioration risk`);
  if (d.operatingMargin && parseFloat(d.operatingMargin) < 0) risks.push(`Unprofitable at operating level (${d.operatingMargin} margin)`);
  if (d.shortPctFloat > 0.1) risks.push(`High short interest (${d.shortPctFloatFmt}) — bears see something`);
  if (d.totalDebt !== "N/A" && d.totalCash !== "N/A") risks.push(`Balance sheet: ${d.totalDebt} debt vs ${d.totalCash} cash`);
  if (risks.length === 0) risks.push("Standard market and execution risk — no specific red flags identified");

  return {
    thesis,
    opportunityType: guessOpportunityType(candidate),
    expectedUpside: upsidePct ? `${upsidePct}% to analyst mean ($${d.targetMean})` : "TBD — insufficient analyst coverage",
    catalysts,
    risks,
    timeHorizon: "3-6 months",
    moralScreenPass: true,
    sources: news.slice(0, 5),
  };
}

// ── Main ──

async function main() {
  const now = Date.now();
  const todayKey = chicagoDateKey(now);
  console.error(`[discover] Starting opportunity discovery for ${todayKey} (target: ${TARGET_COUNT} new)`);

  // 1. Get existing tracked tickers
  const [existingOpps, existingPositions] = await Promise.all([
    query("investments:listAllOpportunitiesTracked", {}),
    query("investments:listPositions", {}),
  ]);

  const knownTickers = new Set([
    ...(existingOpps || []).map((o) => o.ticker?.toUpperCase()),
    ...(existingPositions || []).filter((p) => p.status === "active").map((p) => p.ticker?.toUpperCase()),
    ...EXCLUDED,
  ]);

  console.error(`[discover] Known tickers (${knownTickers.size}): ${[...knownTickers].join(", ")}`);

  // Mega-caps to skip unless very specific catalyst
  const MEGA_CAPS = new Set(["AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "TSLA", "BRK.A", "BRK.B", "META", "PLTR"]);

  // 2. Gather candidates from Yahoo Finance screeners
  console.error("[discover] Fetching Yahoo Finance screeners...");
  const [trending, gainers, mostActive, undervalued] = await Promise.all([
    fetchYahooTrending(),
    fetchYahooGainers(),
    fetchYahooMostActive(),
    fetchYahooUndervalued(),
  ]);

  console.error(`[discover] Yahoo data: ${trending.length} trending, ${gainers.length} gainers, ${mostActive.length} active, ${undervalued.length} undervalued`);

  // Build candidate pool with context
  const candidatePool = new Map();

  for (const ticker of trending) {
    if (!candidatePool.has(ticker)) candidatePool.set(ticker, { ticker, name: ticker, signals: [] });
    candidatePool.get(ticker).signals.push("trending");
  }

  for (const stock of [...gainers, ...mostActive, ...undervalued]) {
    const ticker = stock.ticker;
    if (!candidatePool.has(ticker)) candidatePool.set(ticker, { ticker, name: stock.name, signals: [], ...stock });
    else Object.assign(candidatePool.get(ticker), stock);
    const source = gainers.includes(stock) ? "top_gainer" : mostActive.includes(stock) ? "most_active" : "undervalued_growth";
    candidatePool.get(ticker).signals.push(source);
  }

  // Also try Brave search if key is available
  if (BRAVE_API_KEY) {
    const shuffled = [...SEARCH_THEMES].sort(() => Math.random() - 0.5);
    const allSearchResults = [];
    for (const theme of shuffled.slice(0, 3)) {
      console.error(`[discover] Brave search: ${theme.query.slice(0, 50)}...`);
      const results = await braveSearch(theme.query, 6);
      allSearchResults.push(...results.map((r) => ({ ...r, theme: theme.type })));
      await new Promise((r) => setTimeout(r, 500));
    }
    if (allSearchResults.length > 0) {
      const extracted = await extractTickersFromSearchResults(allSearchResults, knownTickers);
      for (const c of extracted) {
        const ticker = c.ticker?.toUpperCase();
        if (!ticker) continue;
        if (!candidatePool.has(ticker)) candidatePool.set(ticker, { ticker, name: c.name, signals: [] });
        candidatePool.get(ticker).signals.push("news_mention");
        candidatePool.get(ticker).reason = c.reason;
      }
    }
  }

  // Filter and rank
  const freshCandidates = [...candidatePool.values()]
    .filter((c) => {
      const ticker = c.ticker?.toUpperCase();
      if (!ticker || ticker.includes(".") || ticker.length > 5) return false; // skip non-US, warrants
      if (knownTickers.has(ticker)) return false;
      if (EXCLUDED.has(ticker)) return false;
      if (MEGA_CAPS.has(ticker)) return false;
      return true;
    })
    .sort((a, b) => b.signals.length - a.signals.length); // prefer stocks appearing in multiple screeners

  console.error(`[discover] ${freshCandidates.length} fresh candidates after filtering`);
  console.error(`[discover] Top candidates: ${freshCandidates.slice(0, 10).map((c) => `${c.ticker}(${c.signals.join("+")})`).join(", ")}`);

  if (freshCandidates.length === 0) {
    console.log(JSON.stringify({ ok: false, error: "No fresh candidates found", date: todayKey }));
    process.exit(1);
  }

  // 3. Use Claude to pick the best candidates from the pool
  const screenedCandidates = await selectBestCandidates(freshCandidates.slice(0, 20), knownTickers);
  console.error(`[discover] Claude selected ${screenedCandidates.length} candidates: ${screenedCandidates.map((c) => c.ticker).join(", ")}`);

  // 4. Validate with Yahoo Finance + generate theses
  const results = [];
  const failures = [];

  for (const candidate of screenedCandidates) {
    if (results.length >= TARGET_COUNT) break;

    const ticker = candidate.ticker.toUpperCase();
    console.error(`[discover] Evaluating ${ticker} — ${candidate.name}...`);

    // Validate ticker exists on Yahoo + get description
    const [yahooData, description] = await Promise.all([
      fetchYahooProfile(ticker),
      fetchYahooDescription(ticker),
    ]);
    if (!yahooData || !yahooData.price) {
      console.error(`[discover] ${ticker} — no Yahoo data, skipping`);
      failures.push({ ticker, reason: "no Yahoo Finance data" });
      continue;
    }
    if (description) {
      console.error(`[discover] ${ticker} — got description (${description.length} chars)`);
    }

    // Generate thesis
    const thesis = await generateThesis(candidate, yahooData);
    if (!thesis || !thesis.thesis) {
      console.error(`[discover] ${ticker} — thesis generation failed, skipping`);
      failures.push({ ticker, reason: "thesis generation failed" });
      continue;
    }

    // Moral screen check
    if (thesis.moralScreenPass === false) {
      console.error(`[discover] ${ticker} — failed moral screen, skipping`);
      failures.push({ ticker, reason: "failed moral screen" });
      continue;
    }

    const livePrice = yahooData.price;
    const payload = {
      ticker,
      name: candidate.name,
      description: description || null,
      opportunityType: thesis.opportunityType || "growth_catalyst",
      thesis: thesis.thesis,
      sources: (thesis.sources || []).slice(0, 5),
      expectedUpside: thesis.expectedUpside || "TBD",
      catalysts: thesis.catalysts || [candidate.reason],
      risks: thesis.risks || ["Requires further due diligence"],
      timeHorizon: thesis.timeHorizon || "3-6 months",
      moralScreenPass: true,
      priceAtRecommendation: livePrice,
      currentPrice: livePrice,
      priceUpdatedAt: now,
      returnPct: 0,
      status: "active",
    };

    if (DRY_RUN) {
      results.push({ ...payload, dryRun: true });
      console.error(`[discover] ${ticker} — would upsert (dry run)`);
    } else {
      try {
        const id = await mutation("investments:createOpportunityPublic", payload);
        results.push({ id, ...payload });
        console.error(`[discover] ${ticker} — upserted as ${id}`);
      } catch (err) {
        console.error(`[discover] ${ticker} — upsert failed: ${err.message}`);
        failures.push({ ticker, reason: `upsert failed: ${err.message}` });
      }
    }

    // Rate limit between candidates
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(JSON.stringify({
    ok: results.length > 0,
    dryRun: DRY_RUN,
    date: todayKey,
    discovered: results.length,
    target: TARGET_COUNT,
    shortfall: Math.max(0, TARGET_COUNT - results.length),
    tickers: results.map((r) => r.ticker),
    failures,
    results,
  }, null, 2));

  if (results.length < TARGET_COUNT) {
    console.error(`[discover] WARNING: Only found ${results.length}/${TARGET_COUNT} new opportunities`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
