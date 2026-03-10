#!/usr/bin/env node
/**
 * Auto Thesis Generator
 * 
 * Checks for positions without theses and generates them using the OpenClaw gateway.
 * Designed to run as an OpenClaw cron job on the local Mac.
 * 
 * Model cascade: Sonnet 4.6 → Opus 4.6 → GPT-5.4 → LMStudio (local Qwen)
 * 
 * Usage: node auto-thesis.js [TICKER]
 */

const CONVEX_URL = "https://proper-rat-443.convex.cloud";
const OPENCLAW_GATEWAY = `http://127.0.0.1:18789`;
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "61018ccb22da89d788ca0c8df6549b6199888759a870d400";

// ─── Model Cascade ───────────────────────────────────────────────────────────
const MODEL_CASCADE = [
  { name: "Claude Sonnet 4.6", model: "anthropic/claude-sonnet-4-6" },
  { name: "Claude Opus 4.6", model: "anthropic/claude-opus-4-6" },
  { name: "GPT-5.4", model: "openai/gpt-5.4" },
  { name: "LMStudio (Qwen)", model: "custom-127-0-0-1-1234/qwen3.5-9b-mlx" },
];

const SYSTEM_PROMPT = `You are a senior equity research analyst writing investment theses for the Pitzy Model — a retail-edge, event-driven value investing framework.

The Pitzy Model's core principles:
- Retail investors have a structural nimbleness advantage over institutions
- Institutions have quarterly goals and can't take down quarters — retail can
- Event-driven catalysts create windows where retail can capture value before institutions re-rate
- Rule One / Buffett value investing principles: buy wonderful companies at fair prices
- Track institutional flows, but bet against them when they're forced sellers
- Sentiment + Valuation + Event Catalyst + Certainty = Buy Signal

Write thorough, honest, number-dense theses. Call out risks bluntly — never sugarcoat. Include specific data points, price targets, and a clear framework for when to hold, add, or exit. Reference the source articles by name when citing data.

Structure your thesis as:
1. **Position summary** (ticker, entry, current price, P&L)
2. **Bull case** with specific catalysts and data points
3. **Key catalysts** (active and upcoming)  
4. **Risk factors** — be brutally honest, flag anything concerning
5. **Valuation framework** — what's it worth and why
6. **Pitzy Model assessment** — does this fit the retail-edge, event-driven framework?
7. **Decision framework** — specific conditions for hold/add/exit`;

// ─── Publisher Tiers ─────────────────────────────────────────────────────────
const PUBLISHER_TIERS = {
  5: ["reuters", "bloomberg", "wall street journal", "wsj", "financial times", "ft", "barron's", "barrons", "the economist", "associated press"],
  4: ["cnbc", "marketwatch", "yahoo finance", "investor's business daily", "morningstar", "s&p global", "benzinga"],
  3: ["seeking alpha", "motley fool", "fool", "investopedia", "thestreet", "zacks", "tipranks", "nasdaq"],
  2: ["24/7 wall st", "insidermonkey", "simply wall st", "gurufocus"],
};

// ─── Convex ──────────────────────────────────────────────────────────────────
async function convexQuery(fn, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: fn, args }),
  });
  if (!res.ok) throw new Error(`Convex query failed: ${res.status}`);
  return (await res.json()).value;
}

async function convexMutation(fn, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: fn, args }),
  });
  if (!res.ok) throw new Error(`Convex mutation failed: ${res.status}`);
  return (await res.json()).value;
}

// ─── Data Fetchers ───────────────────────────────────────────────────────────

async function fetchYahooFinance(ticker) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=6mo`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    return meta ? { price: meta.regularMarketPrice, previousClose: meta.chartPreviousClose, currency: meta.currency, exchange: meta.exchangeName, marketCap: meta.marketCap, fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh, fiftyTwoWeekLow: meta.fiftyTwoWeekLow } : null;
  } catch { return null; }
}

async function fetchYahooProfile(ticker) {
  try {
    const res = await fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=assetProfile,financialData,defaultKeyStatistics,recommendationTrend`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    const r = data.quoteSummary?.result?.[0];
    return {
      sector: r?.assetProfile?.sector, industry: r?.assetProfile?.industry,
      description: r?.assetProfile?.longBusinessSummary?.substring(0, 800),
      employees: r?.assetProfile?.fullTimeEmployees,
      revenue: r?.financialData?.totalRevenue?.raw,
      revenueGrowth: r?.financialData?.revenueGrowth?.raw,
      grossMargin: r?.financialData?.grossMargins?.raw,
      operatingMargin: r?.financialData?.operatingMargins?.raw,
      ebitdaMargin: r?.financialData?.ebitdaMargins?.raw,
      targetMeanPrice: r?.financialData?.targetMeanPrice?.raw,
      targetHighPrice: r?.financialData?.targetHighPrice?.raw,
      targetLowPrice: r?.financialData?.targetLowPrice?.raw,
      recommendationKey: r?.financialData?.recommendationKey,
      numberOfAnalysts: r?.financialData?.numberOfAnalystOpinions?.raw,
      totalDebt: r?.financialData?.totalDebt?.raw,
      totalCash: r?.financialData?.totalCash?.raw,
      freeCashflow: r?.financialData?.freeCashflow?.raw,
      trailingPE: r?.defaultKeyStatistics?.trailingPE?.raw,
      forwardPE: r?.defaultKeyStatistics?.forwardPE?.raw,
      pegRatio: r?.defaultKeyStatistics?.pegRatio?.raw,
      beta: r?.defaultKeyStatistics?.beta?.raw,
      shortPercentOfFloat: r?.defaultKeyStatistics?.shortPercentOfFloat?.raw,
      shortRatio: r?.defaultKeyStatistics?.shortRatio?.raw,
      heldPercentInsiders: r?.defaultKeyStatistics?.heldPercentInsiders?.raw,
      heldPercentInstitutions: r?.defaultKeyStatistics?.heldPercentInstitutions?.raw,
    };
  } catch { return null; }
}

async function fetchYahooNews(ticker) {
  const articles = [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  try {
    const res = await fetch(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const xml = await res.text();
      for (const item of xml.split("<item>").slice(1, 16)) {
        const t = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
        const l = item.match(/<link>(.*?)<\/link>/);
        const d = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
        const s = item.match(/<source[^>]*>(.*?)<\/source>/);
        const title = t ? (t[1] || t[2]) : null;
        const url = l ? l[1] : null;
        const pubDate = d ? new Date(d[1]) : null;
        if (title && url && pubDate && pubDate.getTime() > sevenDaysAgo) {
          articles.push({ title: title.replace(/&amp;/g, "&"), url, publisher: s ? s[1] : "Yahoo Finance", publishedAt: pubDate.toISOString(), snippet: desc ? (desc[1] || desc[2] || "") : "" });
        }
      }
    }
  } catch {}
  return articles;
}

async function fetchBraveNews(ticker, companyName) {
  const braveKey = process.env.BRAVE_API_KEY;
  if (!braveKey) return [];
  try {
    const q = encodeURIComponent(`${ticker} stock news ${companyName || ""}`);
    const res = await fetch(`https://api.search.brave.com/res/v1/news/search?q=${q}&count=10&freshness=pw`, {
      headers: { Accept: "application/json", "X-Subscription-Token": braveKey },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 10).map(r => ({
      title: r.title, url: r.url, publisher: r.meta_url?.hostname?.replace("www.", "") || "Unknown",
      publishedAt: new Date().toISOString(), snippet: r.description || "",
    }));
  } catch { return []; }
}

async function fetchBraveDeepSearch(ticker, companyName) {
  const braveKey = process.env.BRAVE_API_KEY;
  if (!braveKey) return [];
  const queries = [
    `${ticker} stock analysis 2026`,
    `${ticker} earnings transcript latest`,
    `${ticker} ${companyName} competitive advantage moat`,
    `${ticker} institutional ownership changes 13F`,
    `${ticker} insider buying selling transactions`,
  ];
  const results = [];
  for (const q of queries) {
    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=3`, {
        headers: { Accept: "application/json", "X-Subscription-Token": braveKey },
      });
      if (res.ok) {
        const data = await res.json();
        for (const r of (data.web?.results || []).slice(0, 3)) {
          results.push({ title: r.title, url: r.url, snippet: r.description?.substring(0, 200) || "", source: r.meta_url?.hostname?.replace("www.", "") || "Unknown", query: q });
        }
      }
      await new Promise(r => setTimeout(r, 250)); // rate limit
    } catch {}
  }
  return results;
}

async function fetchSECFilings(ticker) {
  try {
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];
    const res = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&dateRange=custom&startdt=${startDate}&enddt=${endDate}&forms=8-K,10-K,10-Q,S-3,SC%2013G`,
      { headers: { "User-Agent": "MissionControl/1.0 research@lookandseen.com" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits?.hits || []).slice(0, 8).map(h => ({
      form: h._source?.form_type, filed: h._source?.file_date,
      description: h._source?.display_names?.join(", ") || h._source?.entity_name,
    }));
  } catch { return []; }
}

// ─── Article Scoring ─────────────────────────────────────────────────────────

function scoreArticle(article, ticker, companyName) {
  const title = (article.title || "").toLowerCase();
  const text = `${title} ${article.snippet || ""}`.toLowerCase();
  const tl = ticker.toLowerCase();
  const nl = (companyName || "").toLowerCase();

  let quality = 2;
  if (["you won't believe", "this stock", "best stocks", "must buy"].some(c => title.includes(c))) quality -= 1;
  const sub = ["earnings", "revenue", "guidance", "upgrade", "downgrade", "analyst", "sec", "quarterly", "margin", "growth", "fda", "regulatory", "acquisition", "merger", "insider"];
  quality += Math.min(sub.filter(s => title.includes(s)).length, 3);
  if (article.snippet?.length > 150) quality += 1;
  quality = Math.max(1, Math.min(5, quality));

  let trust = 1;
  const pub = (article.publisher || "").toLowerCase();
  for (const [score, names] of Object.entries(PUBLISHER_TIERS)) {
    if (names.some(n => pub.includes(n))) { trust = parseInt(score); break; }
  }

  let relevance = 1;
  if (text.includes(`$${tl}`) || text.includes(`(${tl})`) || new RegExp(`\\b${tl}\\b`).test(text)) relevance += 2;
  if (nl && text.includes(nl)) relevance += 2;
  if (["earnings", "revenue", "price target", "analyst", "upgrade", "downgrade"].some(t => text.includes(t))) relevance += 1;
  relevance = Math.max(1, Math.min(5, relevance));

  const compositeScore = Math.round(((quality + trust + relevance) / 3) * 10) / 10;
  return { ...article, quality, trustworthiness: trust, relevance, compositeScore };
}

// ─── LLM Cascade ─────────────────────────────────────────────────────────────

async function callLLM(context) {
  for (const entry of MODEL_CASCADE) {
    console.log(`  → Trying ${entry.name}...`);
    try {
      const res = await fetch(`${OPENCLAW_GATEWAY}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          model: entry.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: context },
          ],
          max_tokens: 4000,
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text && text.length > 100) {
          console.log(`  ✓ ${entry.name} succeeded (${text.length} chars)`);
          return { text, model: entry.name };
        }
      } else {
        const err = await res.text().catch(() => "");
        console.log(`  ✗ ${entry.name}: ${res.status} ${err.substring(0, 80)}`);
      }
    } catch (e) {
      console.log(`  ✗ ${entry.name}: ${e.message}`);
    }
  }
  return { text: null, model: null };
}

// ─── Build Research Context ──────────────────────────────────────────────────

function buildContext(position, priceData, profileData, worthyArticles, secFilings, deepSearch) {
  const pnlPct = priceData && position.entryPrice ? (((priceData.price - position.entryPrice) / position.entryPrice) * 100).toFixed(1) : "N/A";
  
  let ctx = `Generate a comprehensive investment thesis for ${position.ticker} (${position.name}).

## POSITION DATA
- Portfolio type: ${position.portfolioType}
- Shares: ${position.shares || "N/A"} | Entry: $${position.entryPrice || "N/A"} | Current: $${priceData?.price || "N/A"} | P&L: ${pnlPct}%
- Time horizon: ${position.timeHorizon || "N/A"}
- 52-week range: $${priceData?.fiftyTwoWeekLow || "?"} – $${priceData?.fiftyTwoWeekHigh || "?"}
`;

  if (profileData) {
    const fmtB = (v) => v ? `$${(v / 1e9).toFixed(2)}B` : "N/A";
    const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : "N/A";
    ctx += `\n## FUNDAMENTALS
- Sector: ${profileData.sector || "N/A"} | Industry: ${profileData.industry || "N/A"}
- Revenue: ${fmtB(profileData.revenue)} | Growth: ${fmtPct(profileData.revenueGrowth)}
- Gross margin: ${fmtPct(profileData.grossMargin)} | Operating: ${fmtPct(profileData.operatingMargin)} | EBITDA: ${fmtPct(profileData.ebitdaMargin)}
- FCF: ${fmtB(profileData.freeCashflow)} | Debt: ${fmtB(profileData.totalDebt)} | Cash: ${fmtB(profileData.totalCash)}
- Trailing P/E: ${profileData.trailingPE?.toFixed(1) || "N/A"} | Forward P/E: ${profileData.forwardPE?.toFixed(1) || "N/A"} | PEG: ${profileData.pegRatio?.toFixed(2) || "N/A"}
- Beta: ${profileData.beta?.toFixed(2) || "N/A"}
- Short % of float: ${fmtPct(profileData.shortPercentOfFloat)} | Short ratio: ${profileData.shortRatio?.toFixed(1) || "N/A"} days
- Insider ownership: ${fmtPct(profileData.heldPercentInsiders)} | Institutional: ${fmtPct(profileData.heldPercentInstitutions)}
- Analyst consensus: ${profileData.recommendationKey || "N/A"} (${profileData.numberOfAnalysts || 0} analysts)
- Price targets: mean $${profileData.targetMeanPrice || "?"} | low $${profileData.targetLowPrice || "?"} | high $${profileData.targetHighPrice || "?"}
- About: ${profileData.description || "N/A"}
`;
  }

  if (secFilings.length > 0) {
    ctx += `\n## SEC FILINGS (last 90 days)\n`;
    for (const f of secFilings) ctx += `- ${f.form} filed ${f.filed}: ${f.description}\n`;
  }

  if (worthyArticles.length > 0) {
    ctx += `\n## TOP NEWS (last 7 days, quality-scored)\n`;
    for (const a of worthyArticles.slice(0, 12)) {
      ctx += `- [Score: ${a.compositeScore}] "${a.title}" (${a.publisher})\n  ${a.snippet?.substring(0, 200) || ""}\n`;
    }
  }

  if (deepSearch.length > 0) {
    ctx += `\n## DEEP RESEARCH\n`;
    for (const r of deepSearch.slice(0, 12)) {
      ctx += `- [${r.query}] "${r.title}" (${r.source})\n  ${r.snippet}\n`;
    }
  }

  return ctx;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function generateForPosition(position) {
  console.log(`\n📊 Generating thesis for ${position.ticker} (${position.name})...`);

  // Fetch ALL data in parallel
  const [priceData, profileData, yahooNews, braveNews, secFilings, deepSearch] = await Promise.all([
    fetchYahooFinance(position.ticker),
    fetchYahooProfile(position.ticker),
    fetchYahooNews(position.ticker),
    fetchBraveNews(position.ticker, position.name),
    fetchSECFilings(position.ticker),
    fetchBraveDeepSearch(position.ticker, position.name),
  ]);

  console.log(`  Data: price=${priceData?.price || "?"}, profile=${profileData ? "yes" : "no"}, yahoo=${yahooNews.length}, brave=${braveNews.length}, sec=${secFilings.length}, deep=${deepSearch.length}`);

  // Merge and score articles
  const seen = new Set();
  const allArticles = [];
  for (const a of [...yahooNews, ...braveNews]) {
    const key = a.url?.replace(/\/$/, "").toLowerCase();
    if (key && !seen.has(key)) { seen.add(key); allArticles.push(scoreArticle(a, position.ticker, position.name)); }
  }
  allArticles.sort((a, b) => b.compositeScore - a.compositeScore);
  const worthy = allArticles.filter(a => a.compositeScore >= 3.0);
  console.log(`  Articles: ${allArticles.length} total, ${worthy.length} passed quality filter`);

  // Build context and call LLM
  const context = buildContext(position, priceData, profileData, worthy, secFilings, deepSearch);
  const { text: thesis, model: usedModel } = await callLLM(context);

  // Prepare sources
  const sources = worthy.slice(0, 15).map(a => ({
    title: a.title, url: a.url, publisher: a.publisher,
    publishedAt: a.publishedAt, quality: a.quality,
    trustworthiness: a.trustworthiness, relevance: a.relevance,
    compositeScore: a.compositeScore,
  }));

  if (!thesis) {
    // Save research data + sources so the OpenClaw agent can synthesize
    const pnl = priceData && position.entryPrice ? (((priceData.price - position.entryPrice) / position.entryPrice) * 100).toFixed(1) : "N/A";
    const researchSummary = `[NEEDS_AGENT_THESIS]\n\nResearch data collected — awaiting Pitzy Model thesis synthesis.\n\nTicker: ${position.ticker} | Price: $${priceData?.price || "N/A"} | Entry: $${position.entryPrice || "N/A"} | P&L: ${pnl}%\n52-week: $${priceData?.fiftyTwoWeekLow || "?"} – $${priceData?.fiftyTwoWeekHigh || "?"}\n${profileData ? `Sector: ${profileData.sector} | P/E: ${profileData.trailingPE?.toFixed(1) || "N/A"} | Short: ${profileData.shortPercentOfFloat ? (profileData.shortPercentOfFloat * 100).toFixed(1) + "%" : "N/A"}` : ""}\n\nTop headlines:\n${worthy.slice(0, 8).map(a => `• [${a.compositeScore}] ${a.title} (${a.publisher})`).join("\n")}\n\nSEC filings: ${secFilings.length > 0 ? secFilings.map(f => `${f.form} ${f.filed}`).join(", ") : "none recent"}`;
    await convexMutation("investments:updatePosition", {
      id: position._id, thesis: researchSummary, thesisSources: sources, thesisGeneratedAt: Date.now(),
    });
    console.log(`  ⚠️ Research saved — needs agent synthesis. Run with LLM or let heartbeat handle.`);
    // Output the full context so the calling agent can use it
    console.log(`\n--- RESEARCH CONTEXT FOR AGENT ---`);
    console.log(context.substring(0, 3000));
    console.log(`--- END CONTEXT ---`);
    return false;
  }

  // Save full thesis
  const thesisWithMeta = `${thesis}\n\n---\n*Generated by ${usedModel} · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}*`;
  await convexMutation("investments:updatePosition", {
    id: position._id, thesis: thesisWithMeta, thesisSources: sources, thesisGeneratedAt: Date.now(),
  });
  console.log(`  ✅ Thesis saved (${usedModel}, ${sources.length} sources, ${thesis.length} chars)`);
  return true;
}

async function main() {
  const targetTicker = process.argv[2]?.toUpperCase();
  const positions = await convexQuery("investments:listPositions", {});

  if (targetTicker) {
    const pos = positions.find(p => p.ticker === targetTicker);
    if (!pos) { console.log(`Position ${targetTicker} not found`); process.exit(1); }
    await generateForPosition(pos);
  } else {
    // Find positions without thesis (or with partial "[Thesis generation in progress" prefix)
    const needsThesis = positions.filter(p =>
      p.status === "active" && (!p.thesis || p.thesis.startsWith("[Thesis generation"))
    );
    if (needsThesis.length === 0) {
      console.log("All positions have theses ✓");
      process.exit(0);
    }
    console.log(`Found ${needsThesis.length} position(s) needing thesis generation`);
    for (const pos of needsThesis) {
      await generateForPosition(pos);
    }
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
