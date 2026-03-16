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

// ── Thesis Generation via Site API (uses Vercel-hosted Claude) ──

async function generateThesis(candidate, yahooData) {
  // Use the site's generate-thesis endpoint which has its own API keys
  try {
    console.error(`[discover] Generating thesis for ${candidate.ticker} via ${SITE_URL}...`);
    const res = await fetch(`${SITE_URL}/api/investments/generate-thesis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: candidate.ticker,
        name: candidate.name,
        positionId: null,
        portfolioType: "opportunity",
        shares: 0,
        entryPrice: yahooData.price || 0,
        timeHorizon: "3-6 months",
        refreshReason: `New discovery: ${candidate.signals?.join(", ") || "screener hit"}. ${candidate.reason || ""}`.trim(),
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[discover] Site thesis API error for ${candidate.ticker}: ${res.status} ${errBody.slice(0, 300)}`);
      // Fall back to direct Claude if site fails
      return generateThesisDirect(candidate, yahooData);
    }

    const data = await res.json();
    console.error(`[discover] Site API response for ${candidate.ticker}: status=${data.status}, thesisLen=${data.thesis?.length || 0}`);
    if (data.thesis) {
      // The site returns a full-text thesis; extract structured data from verifiedFacts
      const vf = data.verifiedFacts || {};
      const sources = (data.sources || []).slice(0, 5).map((s) => ({
        title: s.title || s.publisher || "Source",
        url: s.url || "",
      }));
      return {
        thesis: data.thesis.slice(0, 2000), // Truncate for opportunity card
        opportunityType: candidate.signals?.includes("undervalued_growth") ? "contrarian_recovery"
          : candidate.signals?.includes("top_gainer") ? "momentum_breakout"
          : "growth_catalyst",
        expectedUpside: vf.targetMeanPrice && vf.currentPrice
          ? `${Math.round(((vf.targetMeanPrice - vf.currentPrice) / vf.currentPrice) * 100)}% to analyst mean target`
          : "See thesis for details",
        catalysts: candidate.signals || [],
        risks: ["See full thesis for detailed risk analysis"],
        timeHorizon: "3-6 months",
        moralScreenPass: true,
        sources,
      };
    }
    return null;
  } catch (err) {
    console.error(`[discover] Site thesis error for ${candidate.ticker}: ${err.message}`);
    return generateThesisDirect(candidate, yahooData);
  }
}

async function generateThesisDirect(candidate, yahooData) {
  if (!ANTHROPIC_API_KEY) {
    console.error(`[discover] No ANTHROPIC_API_KEY — cannot generate thesis directly for ${candidate.ticker}`);
    return null;
  }

  const context = {
    ticker: candidate.ticker,
    name: candidate.name,
    discoveryReason: candidate.reason,
    signals: candidate.signals,
    ...yahooData,
  };

  const prompt = `You are a sharp, direct investment analyst. Write a concise opportunity thesis for this stock. Be specific about WHY this is an opportunity RIGHT NOW — what's the catalyst, what's mispriced, what does the market not see?

Stock data:
${JSON.stringify(context, null, 2)}

Return ONLY a JSON object, no other text:
{
  "thesis": "2-4 sentence thesis explaining specifically why this is an opportunity now. Be concrete about catalysts, valuation gaps, or market mispricing. No generic filler.",
  "opportunityType": "one of: growth_catalyst, momentum_breakout, contrarian_recovery, asymmetric_setup, earnings_momentum, sector_rotation, event_driven, secular_growth, catalyst_pullback, growth_inflection",
  "expectedUpside": "e.g. 30-60% (6-12 months)",
  "catalysts": ["specific catalyst 1", "specific catalyst 2", "specific catalyst 3"],
  "risks": ["specific risk 1", "specific risk 2", "specific risk 3"],
  "timeHorizon": "e.g. 3-6 months",
  "moralScreenPass": true,
  "sources": [{"title": "Source Name", "url": "https://..."}]
}

If the company is involved in surveillance, weapons targeting, or social media manipulation (like Palantir or Meta), set moralScreenPass to false.`;

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
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`[discover] Direct thesis error for ${candidate.ticker}: ${err.message}`);
    return null;
  }
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

    // Validate ticker exists on Yahoo
    const yahooData = await fetchYahooProfile(ticker);
    if (!yahooData || !yahooData.price) {
      console.error(`[discover] ${ticker} — no Yahoo data, skipping`);
      failures.push({ ticker, reason: "no Yahoo Finance data" });
      continue;
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
