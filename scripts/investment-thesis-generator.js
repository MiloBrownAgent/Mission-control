#!/usr/bin/env node
/**
 * Investment Thesis Generator
 * 
 * Checks for positions without a thesis and generates one using deep research.
 * Designed to be called by an OpenClaw cron that passes the analysis via env/args.
 * 
 * This script handles the data plumbing:
 * - Reads positions from Convex
 * - Fetches financial data from Yahoo Finance
 * - Writes thesis back to Convex
 * 
 * Usage: node investment-thesis-generator.js [ticker]
 *   If no ticker, finds first position without thesis
 */

const { execSync } = require("child_process");

const CONVEX_URL = "https://proper-rat-443.convex.cloud";

// ─── Publisher Credibility Tiers ─────────────────────────────────────────────
const PUBLISHER_TIERS = {
  // Tier 1 — Institutional-grade (score 5)
  5: [
    "reuters", "bloomberg", "wall street journal", "wsj", "financial times",
    "ft", "barron's", "barrons", "the economist", "associated press", "ap news",
  ],
  // Tier 2 — Professional financial media (score 4)
  4: [
    "cnbc", "marketwatch", "yahoo finance", "investor's business daily", "ibd",
    "morningstar", "s&p global", "the wall street journal", "benzinga",
  ],
  // Tier 3 — Mixed quality, editorial (score 3)
  3: [
    "seeking alpha", "motley fool", "fool", "investopedia", "thestreet",
    "zacks", "tipranks", "nasdaq", "kiplinger",
  ],
  // Tier 4 — Aggregators, opinion-heavy (score 2)
  2: [
    "24/7 wall st", "insidermonkey", "insider monkey", "simply wall st",
    "gurufocus", "stocktwits",
  ],
};

async function convexQuery(functionPath, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: functionPath, args }),
  });
  if (!res.ok) throw new Error(`Convex query failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.value;
}

async function convexMutation(functionPath, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: functionPath, args }),
  });
  if (!res.ok) throw new Error(`Convex mutation failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.value;
}

async function fetchYahooFinance(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=6mo`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
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
  } catch (e) {
    console.error(`Yahoo Finance error for ${ticker}:`, e.message);
    return null;
  }
}

async function fetchYahooProfile(ticker) {
  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=assetProfile,financialData,defaultKeyStatistics`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
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
      targetMeanPrice: result?.financialData?.targetMeanPrice?.raw,
      recommendationKey: result?.financialData?.recommendationKey,
      trailingPE: result?.defaultKeyStatistics?.trailingPE?.raw,
      forwardPE: result?.defaultKeyStatistics?.forwardPE?.raw,
      beta: result?.defaultKeyStatistics?.beta?.raw,
      shortPercentOfFloat: result?.defaultKeyStatistics?.shortPercentOfFloat?.raw,
    };
  } catch (e) {
    console.error(`Yahoo Profile error for ${ticker}:`, e.message);
    return null;
  }
}

// ─── News Fetching & Scoring ─────────────────────────────────────────────────

function getPublisherTrust(publisher) {
  if (!publisher) return 1;
  const lower = publisher.toLowerCase();
  for (const [score, names] of Object.entries(PUBLISHER_TIERS)) {
    if (names.some((n) => lower.includes(n))) return parseInt(score);
  }
  return 1; // Unknown publisher = lowest tier
}

function scoreQuality(article) {
  let score = 2; // baseline
  const title = (article.title || "").toLowerCase();
  
  // Penalize clickbait patterns
  const clickbait = ["you won't believe", "this stock", "best stocks", "top picks", "must buy", "should you buy"];
  if (clickbait.some((c) => title.includes(c))) score -= 1;
  
  // Reward substantive signals
  const substantive = ["earnings", "revenue", "guidance", "upgrade", "downgrade", "analyst", "sec filing",
    "quarterly", "annual", "margin", "growth", "fda", "regulatory", "acquisition", "merger"];
  const hits = substantive.filter((s) => title.includes(s));
  score += Math.min(hits.length, 3); // up to +3 for substance
  
  // Reward longer snippets (proxy for depth)
  if (article.snippet && article.snippet.length > 150) score += 1;
  
  return Math.max(1, Math.min(5, score));
}

function scoreRelevance(article, ticker, companyName) {
  let score = 1;
  const text = `${article.title || ""} ${article.snippet || ""}`.toLowerCase();
  const tickerLower = ticker.toLowerCase();
  const nameLower = (companyName || "").toLowerCase();
  
  // Direct ticker mention
  if (text.includes(`$${tickerLower}`) || text.includes(`(${tickerLower})`) || 
      new RegExp(`\\b${tickerLower}\\b`).test(text)) {
    score += 2;
  }
  // Company name mention
  if (nameLower && text.includes(nameLower)) score += 2;
  // Financial topic relevance
  const finTerms = ["earnings", "revenue", "price target", "analyst", "upgrade", "downgrade",
    "guidance", "outlook", "forecast", "valuation", "pe ratio"];
  if (finTerms.some((t) => text.includes(t))) score += 1;
  
  return Math.max(1, Math.min(5, score));
}

function scoreArticle(article, ticker, companyName) {
  const quality = scoreQuality(article);
  const trustworthiness = getPublisherTrust(article.publisher);
  const relevance = scoreRelevance(article, ticker, companyName);
  const compositeScore = Math.round(((quality + trustworthiness + relevance) / 3) * 10) / 10;
  
  return { ...article, quality, trustworthiness, relevance, compositeScore };
}

async function fetchYahooNews(ticker) {
  const articles = [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  try {
    // Try Yahoo Finance RSS feed
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
    });
    
    if (res.ok) {
      const xml = await res.text();
      // Simple XML parsing for RSS items
      const items = xml.split("<item>").slice(1);
      for (const item of items.slice(0, 10)) {
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
          articles.push({ title, url, publisher, publishedAt: pubDate.toISOString(), snippet });
        }
      }
    }
  } catch (e) {
    console.error(`Yahoo News RSS error for ${ticker}:`, e.message);
  }
  
  // Fallback: try scraping Yahoo Finance news page if RSS gave < 3 results
  if (articles.length < 3) {
    try {
      const pageUrl = `https://finance.yahoo.com/quote/${ticker}/news/`;
      const res = await fetch(pageUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
      });
      if (res.ok) {
        const html = await res.text();
        // Extract article links and titles from the page
        const linkRegex = /<a[^>]*href="(\/news\/[^"]+)"[^>]*>.*?<h3[^>]*>(.*?)<\/h3>/gs;
        let match;
        while ((match = linkRegex.exec(html)) !== null && articles.length < 10) {
          const url = `https://finance.yahoo.com${match[1]}`;
          const title = match[2].replace(/<[^>]*>/g, "").trim();
          if (title && !articles.some((a) => a.title === title)) {
            articles.push({
              title,
              url,
              publisher: "Yahoo Finance",
              publishedAt: new Date().toISOString(),
              snippet: "",
            });
          }
        }
      }
    } catch (e) {
      console.error(`Yahoo News page scrape error for ${ticker}:`, e.message);
    }
  }
  
  console.log(`  Yahoo Finance: ${articles.length} articles found`);
  return articles;
}

async function fetchBraveNews(ticker, companyName) {
  const articles = [];
  const braveApiKey = process.env.BRAVE_API_KEY;
  
  if (!braveApiKey) {
    console.log("  Brave Search: skipped (no BRAVE_API_KEY)");
    return articles;
  }
  
  try {
    const query = encodeURIComponent(`${ticker} stock news ${companyName || ""}`);
    const res = await fetch(
      `https://api.search.brave.com/res/v1/news/search?q=${query}&count=10&freshness=pw`,
      {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": braveApiKey,
        },
      }
    );
    
    if (res.ok) {
      const data = await res.json();
      const results = data.results || [];
      for (const r of results.slice(0, 10)) {
        articles.push({
          title: r.title,
          url: r.url,
          publisher: r.meta_url?.hostname?.replace("www.", "") || r.source || "Unknown",
          publishedAt: r.age ? new Date().toISOString() : new Date().toISOString(),
          snippet: r.description || "",
        });
      }
    }
  } catch (e) {
    console.error(`Brave News error for ${ticker}:`, e.message);
  }
  
  console.log(`  Brave Search: ${articles.length} articles found`);
  return articles;
}

async function fetchAndScoreArticles(ticker, companyName) {
  console.log(`\n📰 Fetching news for ${ticker}...`);
  
  const [yahooArticles, braveArticles] = await Promise.all([
    fetchYahooNews(ticker),
    fetchBraveNews(ticker, companyName),
  ]);
  
  // Merge and deduplicate by URL
  const seen = new Set();
  const allArticles = [];
  for (const article of [...yahooArticles, ...braveArticles]) {
    const key = article.url?.replace(/\/$/, "").toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      allArticles.push(article);
    }
  }
  
  // Score all articles
  const scored = allArticles.map((a) => scoreArticle(a, ticker, companyName));
  
  // Sort by composite score descending
  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  
  // Split into worthy and rejected
  const worthy = scored.filter((a) => a.compositeScore >= 3.0);
  const rejected = scored.filter((a) => a.compositeScore < 3.0);
  
  console.log(`  Total: ${allArticles.length} | Passed: ${worthy.length} | Rejected: ${rejected.length}`);
  if (worthy.length > 0) {
    console.log(`  Top article: "${worthy[0].title}" (${worthy[0].compositeScore})`);
  }
  
  return { worthy, rejected, all: scored };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const targetTicker = process.argv[2]?.toUpperCase();

  // Get all positions
  const positions = await convexQuery("investments:listPositions", {});
  
  let position;
  if (targetTicker) {
    position = positions.find(p => p.ticker === targetTicker);
    if (!position) {
      console.log(`Position ${targetTicker} not found`);
      process.exit(1);
    }
  } else {
    // Find first position without thesis
    position = positions.find(p => !p.thesis && p.status === "active");
    if (!position) {
      console.log("All positions have theses. Nothing to generate.");
      process.exit(0);
    }
  }

  console.log(`\n📊 Generating thesis for ${position.ticker} (${position.name})...`);

  // Fetch financial data + news articles in parallel
  const [priceData, profileData, articleData] = await Promise.all([
    fetchYahooFinance(position.ticker),
    fetchYahooProfile(position.ticker),
    fetchAndScoreArticles(position.ticker, position.name),
  ]);

  // Output data for the OpenClaw cron to use in thesis generation
  const output = {
    position: {
      ticker: position.ticker,
      name: position.name,
      id: position._id,
      portfolioType: position.portfolioType,
      shares: position.shares,
      entryPrice: position.entryPrice,
      timeHorizon: position.timeHorizon,
    },
    priceData,
    profileData,
    articles: {
      worthy: articleData.worthy.map((a) => ({
        title: a.title,
        url: a.url,
        publisher: a.publisher,
        publishedAt: a.publishedAt,
        quality: a.quality,
        trustworthiness: a.trustworthiness,
        relevance: a.relevance,
        compositeScore: a.compositeScore,
      })),
      rejectedCount: articleData.rejected.length,
    },
  };

  console.log("\n📈 Financial Data:");
  console.log(JSON.stringify(output, null, 2));
  
  // If thesis was passed as env var (from OpenClaw cron), save it
  if (process.env.THESIS_CONTENT) {
    // Merge manually provided sources with auto-scored articles
    const sources = [];
    try {
      if (process.env.THESIS_SOURCES) {
        sources.push(...JSON.parse(process.env.THESIS_SOURCES));
      }
    } catch (e) {}

    // Append worthy articles as thesis sources (with scores)
    for (const article of articleData.worthy) {
      // Don't duplicate if already in sources
      if (!sources.some((s) => s.url === article.url)) {
        sources.push({
          title: article.title,
          url: article.url,
          publisher: article.publisher || undefined,
          publishedAt: article.publishedAt || undefined,
          quality: article.quality,
          trustworthiness: article.trustworthiness,
          relevance: article.relevance,
          compositeScore: article.compositeScore,
        });
      }
    }

    await convexMutation("investments:updatePosition", {
      id: position._id,
      thesis: process.env.THESIS_CONTENT,
      thesisSources: sources,
      thesisGeneratedAt: Date.now(),
    });
    console.log(`\n✅ Thesis saved for ${position.ticker} with ${sources.length} sources`);
  }
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
