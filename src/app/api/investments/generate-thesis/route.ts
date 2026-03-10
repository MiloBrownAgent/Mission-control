import { NextRequest, NextResponse } from "next/server";

// ─── Config ──────────────────────────────────────────────────────────────────
const CONVEX_URL = "https://proper-rat-443.convex.cloud";
// When running on Vercel, use Anthropic/OpenAI APIs directly
// When running locally (dev), can also use OpenClaw gateway
const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789";
const IS_VERCEL = !!process.env.VERCEL;

// Publisher credibility tiers
const PUBLISHER_TIERS: Record<number, string[]> = {
  5: ["reuters", "bloomberg", "wall street journal", "wsj", "financial times", "ft", "barron's", "barrons", "the economist", "associated press", "ap news"],
  4: ["cnbc", "marketwatch", "yahoo finance", "investor's business daily", "ibd", "morningstar", "s&p global", "benzinga"],
  3: ["seeking alpha", "motley fool", "fool", "investopedia", "thestreet", "zacks", "tipranks", "nasdaq", "kiplinger"],
  2: ["24/7 wall st", "insidermonkey", "insider monkey", "simply wall st", "gurufocus", "stocktwits"],
};

// ─── Convex Helpers ──────────────────────────────────────────────────────────
async function convexMutation(functionPath: string, args: any = {}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: functionPath, args }),
  });
  if (!res.ok) throw new Error(`Convex mutation failed: ${res.status}`);
  return (await res.json()).value;
}

// ─── Data Fetchers ───────────────────────────────────────────────────────────

async function fetchYahooFinance(ticker: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=6mo`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      price: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose,
      currency: meta.currency,
      exchange: meta.exchangeName,
      marketCap: meta.marketCap,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    };
  } catch { return null; }
}

async function fetchYahooProfile(ticker: string) {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=assetProfile,financialData,defaultKeyStatistics,earningsTrend,recommendationTrend`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.quoteSummary?.result?.[0];
    return {
      sector: result?.assetProfile?.sector,
      industry: result?.assetProfile?.industry,
      description: result?.assetProfile?.longBusinessSummary,
      employees: result?.assetProfile?.fullTimeEmployees,
      website: result?.assetProfile?.website,
      revenue: result?.financialData?.totalRevenue?.raw,
      revenueGrowth: result?.financialData?.revenueGrowth?.raw,
      grossMargin: result?.financialData?.grossMargins?.raw,
      operatingMargin: result?.financialData?.operatingMargins?.raw,
      ebitdaMargin: result?.financialData?.ebitdaMargins?.raw,
      targetMeanPrice: result?.financialData?.targetMeanPrice?.raw,
      targetHighPrice: result?.financialData?.targetHighPrice?.raw,
      targetLowPrice: result?.financialData?.targetLowPrice?.raw,
      recommendationKey: result?.financialData?.recommendationKey,
      numberOfAnalystOpinions: result?.financialData?.numberOfAnalystOpinions?.raw,
      totalDebt: result?.financialData?.totalDebt?.raw,
      totalCash: result?.financialData?.totalCash?.raw,
      freeCashflow: result?.financialData?.freeCashflow?.raw,
      trailingPE: result?.defaultKeyStatistics?.trailingPE?.raw,
      forwardPE: result?.defaultKeyStatistics?.forwardPE?.raw,
      pegRatio: result?.defaultKeyStatistics?.pegRatio?.raw,
      beta: result?.defaultKeyStatistics?.beta?.raw,
      shortPercentOfFloat: result?.defaultKeyStatistics?.shortPercentOfFloat?.raw,
      shortRatio: result?.defaultKeyStatistics?.shortRatio?.raw,
      sharesShort: result?.defaultKeyStatistics?.sharesShort?.raw,
      heldPercentInsiders: result?.defaultKeyStatistics?.heldPercentInsiders?.raw,
      heldPercentInstitutions: result?.defaultKeyStatistics?.heldPercentInstitutions?.raw,
      earningsGrowth: result?.defaultKeyStatistics?.earningsQuarterlyGrowth?.raw,
      recommendationTrend: result?.recommendationTrend?.trend,
    };
  } catch { return null; }
}

async function fetchYahooNews(ticker: string) {
  const articles: any[] = [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  try {
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
    const res = await fetch(rssUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const xml = await res.text();
      const items = xml.split("<item>").slice(1);
      for (const item of items.slice(0, 15)) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
        const sourceMatch = item.match(/<source[^>]*>(.*?)<\/source>/);
        const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : null;
        const url = linkMatch ? linkMatch[1] : null;
        const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : null;
        const snippet = descMatch ? (descMatch[1] || descMatch[2]) : "";
        const publisher = sourceMatch ? sourceMatch[1] : "Yahoo Finance";
        if (title && url && pubDate && pubDate.getTime() > sevenDaysAgo) {
          articles.push({ title: title.replace(/&amp;/g, "&"), url, publisher, publishedAt: pubDate.toISOString(), snippet });
        }
      }
    }
  } catch {}
  return articles;
}

async function fetchBraveSearch(query: string, count = 10) {
  const braveKey = process.env.BRAVE_API_KEY;
  if (!braveKey) return [];
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=${count}&freshness=pw`,
      { headers: { Accept: "application/json", "X-Subscription-Token": braveKey } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      publisher: r.meta_url?.hostname?.replace("www.", "") || "Unknown",
      publishedAt: new Date().toISOString(),
      snippet: r.description || "",
    }));
  } catch { return []; }
}

async function fetchSECFilings(ticker: string) {
  try {
    // Search EDGAR for recent filings
    const res = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&dateRange=custom&startdt=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}&enddt=${new Date().toISOString().split("T")[0]}&forms=8-K,10-K,10-Q,S-3,SC%2013G`,
      { headers: { "User-Agent": "MissionControl/1.0 research@lookandseen.com" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits?.hits || []).slice(0, 5).map((h: any) => ({
      form: h._source?.form_type,
      filed: h._source?.file_date,
      description: h._source?.display_names?.join(", ") || h._source?.entity_name,
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=&dateb=&owner=include&count=10`,
    }));
  } catch { return []; }
}

async function fetchFullTextSearch(ticker: string, companyName: string) {
  // Deep web search for analyst reports, earnings transcripts, Reddit, etc.
  const queries = [
    `${ticker} stock analysis 2026`,
    `${ticker} earnings transcript Q4 2025`,
    `${ticker} ${companyName} competitive advantage moat`,
    `${ticker} institutional ownership changes`,
    `${ticker} insider buying selling`,
  ];
  const results: any[] = [];
  const braveKey = process.env.BRAVE_API_KEY;
  if (!braveKey) return results;

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=3`,
        { headers: { Accept: "application/json", "X-Subscription-Token": braveKey } }
      );
      if (res.ok) {
        const data = await res.json();
        for (const r of (data.web?.results || []).slice(0, 3)) {
          results.push({
            title: r.title,
            url: r.url,
            snippet: r.description || "",
            source: r.meta_url?.hostname?.replace("www.", "") || "Unknown",
            searchQuery: q,
          });
        }
      }
      // Rate limit
      await new Promise((r) => setTimeout(r, 200));
    } catch {}
  }
  return results;
}

// ─── Article Scoring ─────────────────────────────────────────────────────────

function getPublisherTrust(publisher: string): number {
  if (!publisher) return 1;
  const lower = publisher.toLowerCase();
  for (const [score, names] of Object.entries(PUBLISHER_TIERS)) {
    if (names.some((n) => lower.includes(n))) return parseInt(score);
  }
  return 1;
}

function scoreArticle(article: any, ticker: string, companyName: string) {
  const title = (article.title || "").toLowerCase();
  const text = `${title} ${article.snippet || ""}`.toLowerCase();
  const tickerLower = ticker.toLowerCase();
  const nameLower = (companyName || "").toLowerCase();

  // Quality
  let quality = 2;
  const clickbait = ["you won't believe", "this stock", "best stocks", "top picks", "must buy", "should you buy"];
  if (clickbait.some((c) => title.includes(c))) quality -= 1;
  const substantive = ["earnings", "revenue", "guidance", "upgrade", "downgrade", "analyst", "sec filing", "quarterly", "annual", "margin", "growth", "fda", "regulatory", "acquisition", "merger", "insider"];
  quality += Math.min(substantive.filter((s) => title.includes(s)).length, 3);
  if (article.snippet && article.snippet.length > 150) quality += 1;
  quality = Math.max(1, Math.min(5, quality));

  // Trustworthiness
  const trustworthiness = getPublisherTrust(article.publisher);

  // Relevance
  let relevance = 1;
  if (text.includes(`$${tickerLower}`) || text.includes(`(${tickerLower})`) || new RegExp(`\\b${tickerLower}\\b`).test(text)) relevance += 2;
  if (nameLower && text.includes(nameLower)) relevance += 2;
  const finTerms = ["earnings", "revenue", "price target", "analyst", "upgrade", "downgrade", "guidance", "outlook", "forecast", "valuation"];
  if (finTerms.some((t) => text.includes(t))) relevance += 1;
  relevance = Math.max(1, Math.min(5, relevance));

  const compositeScore = Math.round(((quality + trustworthiness + relevance) / 3) * 10) / 10;
  return { ...article, quality, trustworthiness, relevance, compositeScore };
}

// ─── LLM Thesis Generation (Cascading Models) ───────────────────────────────

const SYSTEM_PROMPT = `You are a senior equity research analyst writing investment theses for the Pitzy Model — a retail-edge, event-driven value investing framework.

The Pitzy Model's core principles:
- Retail investors have a structural nimbleness advantage over institutions
- Institutions have quarterly goals and can't take down quarters — retail can
- Event-driven catalysts create windows where retail can capture value before institutions re-rate
- Rule One / Buffett value investing principles: buy wonderful companies at fair prices
- Track institutional flows, but bet against them when they're forced sellers
- Sentiment + Valuation + Event Catalyst + Certainty = Buy Signal

Write thorough, honest, number-dense theses. Call out risks bluntly — never sugarcoat. Include specific data points, price targets, and a clear framework for when to hold, add, or exit. Reference the source articles by name when citing data.`;

// Model cascade: Sonnet → Opus → GPT-5.4 → LMStudio (local)
// On Vercel: uses direct Anthropic/OpenAI APIs
// Locally: can use OpenClaw gateway + LMStudio
const MODEL_CASCADE = [
  {
    name: "Claude Sonnet 4.6",
    type: "anthropic" as const,
    model: "claude-sonnet-4-20250514",
    gatewayModel: "anthropic/claude-sonnet-4-6",
  },
  {
    name: "Claude Opus 4.6",
    type: "anthropic" as const,
    model: "claude-opus-4-20250514",
    gatewayModel: "anthropic/claude-opus-4-6",
  },
  {
    name: "GPT-5.4",
    type: "openai" as const,
    model: "gpt-5.4",
    gatewayModel: "openai/gpt-5.4",
  },
  {
    name: "LMStudio (local)",
    type: "lmstudio" as const,
    model: "qwen3.5-9b-mlx",
    gatewayModel: "custom-127-0-0-1-1234/qwen3.5-9b-mlx",
  },
];

async function callAnthropicDirect(model: string, context: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: context }],
    }),
  });
  if (!res.ok) {
    console.log(`  ✗ Anthropic ${model}: ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data.content?.[0]?.text || null;
}

async function callOpenAIDirect(model: string, context: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    console.log(`  ✗ OpenAI ${model}: ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callOpenClawGateway(model: string, context: string): Promise<string | null> {
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || "";
  const res = await fetch(`${OPENCLAW_GATEWAY}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gatewayToken}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.log(`  ✗ Gateway ${model}: ${res.status} ${errText.substring(0, 100)}`);
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callLMStudio(model: string, context: string): Promise<string | null> {
  const res = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    console.log(`  ✗ LMStudio ${model}: ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function generateThesisWithLLM(context: string): Promise<{ text: string | null; model: string | null }> {
  for (const entry of MODEL_CASCADE) {
    console.log(`  → Trying ${entry.name} (${entry.model})...`);
    try {
      let result: string | null = null;

      if (IS_VERCEL) {
        // On Vercel: use direct API calls (can't reach localhost)
        if (entry.type === "anthropic") {
          result = await callAnthropicDirect(entry.model, context);
        } else if (entry.type === "openai") {
          result = await callOpenAIDirect(entry.model, context);
        } else if (entry.type === "lmstudio") {
          console.log(`  ⊘ Skipping ${entry.name} (not available on Vercel)`);
          continue;
        }
      } else {
        // Locally: use OpenClaw gateway (routes to all providers)
        if (entry.type === "lmstudio") {
          result = await callLMStudio(entry.model, context);
        } else {
          result = await callOpenClawGateway(entry.gatewayModel, context);
        }
      }

      if (result && result.length > 100) {
        console.log(`  ✓ ${entry.name} succeeded (${result.length} chars)`);
        return { text: result, model: entry.name };
      }
    } catch (e: any) {
      console.log(`  ✗ ${entry.name} error: ${e.message}`);
    }
  }

  console.log("  ✗ ALL MODELS FAILED — will retry on next sweep");
  return { text: null, model: null };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ticker, name, positionId, portfolioType, shares, entryPrice, timeHorizon } = body;

  if (!ticker || !positionId) {
    return NextResponse.json({ error: "Missing ticker or positionId" }, { status: 400 });
  }

  console.log(`\n📊 Deep thesis generation for ${ticker} (${name})...`);

  // Fetch ALL data in parallel
  const [priceData, profileData, yahooNews, braveNews, secFilings, deepSearch] = await Promise.all([
    fetchYahooFinance(ticker),
    fetchYahooProfile(ticker),
    fetchYahooNews(ticker),
    fetchBraveSearch(`${ticker} stock news analysis`, 10),
    fetchSECFilings(ticker),
    fetchFullTextSearch(ticker, name || ticker),
  ]);

  // Merge and score articles
  const seen = new Set<string>();
  const allArticles: any[] = [];
  for (const article of [...yahooNews, ...braveNews]) {
    const key = article.url?.replace(/\/$/, "").toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      allArticles.push(scoreArticle(article, ticker, name));
    }
  }
  allArticles.sort((a, b) => b.compositeScore - a.compositeScore);
  const worthyArticles = allArticles.filter((a) => a.compositeScore >= 3.0);

  console.log(`  Articles: ${allArticles.length} total, ${worthyArticles.length} worthy`);
  console.log(`  SEC filings: ${secFilings.length}`);
  console.log(`  Deep search: ${deepSearch.length} results`);

  // Build rich context for LLM
  const pnlPct = priceData && entryPrice ? (((priceData.price - entryPrice) / entryPrice) * 100).toFixed(1) : "N/A";

  let context = `Generate a comprehensive investment thesis for ${ticker} (${name}).

## POSITION DATA
- Portfolio type: ${portfolioType}
- Shares: ${shares || "N/A"}
- Entry price: $${entryPrice || "N/A"}
- Current price: $${priceData?.price || "N/A"}
- Unrealized P&L: ${pnlPct}%
- Time horizon: ${timeHorizon || "N/A"}
- 52-week range: $${priceData?.fiftyTwoWeekLow || "?"} – $${priceData?.fiftyTwoWeekHigh || "?"}

## FUNDAMENTALS
`;

  if (profileData) {
    context += `- Sector: ${profileData.sector || "N/A"} | Industry: ${profileData.industry || "N/A"}
- Revenue: $${profileData.revenue ? (profileData.revenue / 1e9).toFixed(2) + "B" : "N/A"}
- Revenue growth: ${profileData.revenueGrowth ? (profileData.revenueGrowth * 100).toFixed(1) + "%" : "N/A"}
- Gross margin: ${profileData.grossMargin ? (profileData.grossMargin * 100).toFixed(1) + "%" : "N/A"}
- Operating margin: ${profileData.operatingMargin ? (profileData.operatingMargin * 100).toFixed(1) + "%" : "N/A"}
- Free cash flow: $${profileData.freeCashflow ? (profileData.freeCashflow / 1e9).toFixed(2) + "B" : "N/A"}
- Total debt: $${profileData.totalDebt ? (profileData.totalDebt / 1e9).toFixed(2) + "B" : "N/A"}
- Total cash: $${profileData.totalCash ? (profileData.totalCash / 1e9).toFixed(2) + "B" : "N/A"}
- Trailing P/E: ${profileData.trailingPE?.toFixed(1) || "N/A"}
- Forward P/E: ${profileData.forwardPE?.toFixed(1) || "N/A"}
- PEG ratio: ${profileData.pegRatio?.toFixed(2) || "N/A"}
- Beta: ${profileData.beta?.toFixed(2) || "N/A"}
- Short % of float: ${profileData.shortPercentOfFloat ? (profileData.shortPercentOfFloat * 100).toFixed(1) + "%" : "N/A"}
- Short ratio (days to cover): ${profileData.shortRatio?.toFixed(1) || "N/A"}
- Insider ownership: ${profileData.heldPercentInsiders ? (profileData.heldPercentInsiders * 100).toFixed(1) + "%" : "N/A"}
- Institutional ownership: ${profileData.heldPercentInstitutions ? (profileData.heldPercentInstitutions * 100).toFixed(1) + "%" : "N/A"}
- Analyst consensus: ${profileData.recommendationKey || "N/A"} (${profileData.numberOfAnalystOpinions || 0} analysts)
- Mean price target: $${profileData.targetMeanPrice || "N/A"} (low: $${profileData.targetLowPrice || "?"}, high: $${profileData.targetHighPrice || "?"})
- Company: ${profileData.description?.substring(0, 500) || "N/A"}
`;
  }

  if (secFilings.length > 0) {
    context += `\n## RECENT SEC FILINGS (last 30 days)\n`;
    for (const f of secFilings) {
      context += `- ${f.form} filed ${f.filed}: ${f.description}\n`;
    }
  }

  if (worthyArticles.length > 0) {
    context += `\n## TOP NEWS ARTICLES (last 7 days, quality-scored)\n`;
    for (const a of worthyArticles.slice(0, 12)) {
      context += `- [Score: ${a.compositeScore}] "${a.title}" (${a.publisher}, ${a.publishedAt?.split("T")[0] || "recent"})\n  ${a.snippet?.substring(0, 200) || ""}\n`;
    }
  }

  if (deepSearch.length > 0) {
    context += `\n## DEEP RESEARCH (analyst reports, earnings, competitive analysis)\n`;
    for (const r of deepSearch.slice(0, 10)) {
      context += `- [${r.searchQuery}] "${r.title}" (${r.source})\n  ${r.snippet?.substring(0, 200) || ""}\n`;
    }
  }

  context += `\n## INSTRUCTIONS
Write a thorough investment thesis structured as:
1. **Position summary** (entry, current, P&L)
2. **Bull case** with specific catalysts and data points
3. **Key catalysts** (active and upcoming)
4. **Risk factors** — be brutally honest, flag anything concerning
5. **Valuation framework** — what's it worth and why
6. **Pitzy Model assessment** — does this fit the retail-edge, event-driven framework? Is there an institutional flow story?
7. **Decision framework** — specific conditions for hold/add/exit

Reference source articles by name. Use actual numbers from the data above. Do not make up data points.`;

  // Generate thesis (cascading models)
  const { text: thesis, model: usedModel } = await generateThesisWithLLM(context);
  console.log(`  Model used: ${usedModel || "none"}`);

  if (!thesis) {
    console.log(`  ⚠️ LLM generation failed — saving research data without synthesis`);
    // Save what we have even without LLM synthesis
    const fallbackThesis = `[Auto-generated research data — LLM synthesis pending]\n\nPrice: $${priceData?.price || "N/A"} | Entry: $${entryPrice || "N/A"} | P&L: ${pnlPct}%\n\n${worthyArticles.slice(0, 5).map((a: any) => `• ${a.title}`).join("\n")}`;

    await convexMutation("investments:updatePosition", {
      id: positionId,
      thesis: fallbackThesis,
      thesisSources: worthyArticles.slice(0, 15).map((a: any) => ({
        title: a.title, url: a.url, publisher: a.publisher,
        publishedAt: a.publishedAt, quality: a.quality,
        trustworthiness: a.trustworthiness, relevance: a.relevance,
        compositeScore: a.compositeScore,
      })),
      thesisGeneratedAt: Date.now(),
    });

    return NextResponse.json({ status: "partial", message: "Research saved, LLM synthesis failed" });
  }

  // Save thesis + sources
  const sources = worthyArticles.slice(0, 15).map((a: any) => ({
    title: a.title, url: a.url, publisher: a.publisher,
    publishedAt: a.publishedAt, quality: a.quality,
    trustworthiness: a.trustworthiness, relevance: a.relevance,
    compositeScore: a.compositeScore,
  }));

  await convexMutation("investments:updatePosition", {
    id: positionId,
    thesis,
    thesisSources: sources,
    thesisGeneratedAt: Date.now(),
  });

  console.log(`  ✅ Thesis saved for ${ticker} with ${sources.length} sources`);

  return NextResponse.json({
    status: "ok",
    ticker,
    model: usedModel,
    sourcesCount: sources.length,
    thesisLength: thesis.length,
  });
}
