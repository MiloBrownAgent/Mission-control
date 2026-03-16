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

// ─── Yahoo Auth (crumb + cookie required for v10 API) ────────────────────────
let _yahooCrumb: string | null = null;
let _yahooCookie: string | null = null;

async function getYahooAuth() {
  if (_yahooCrumb && _yahooCookie) return { crumb: _yahooCrumb, cookie: _yahooCookie };
  try {
    const cookieRes = await fetch("https://fc.yahoo.com", { redirect: "manual" });
    _yahooCookie = cookieRes.headers.get("set-cookie") || "";
    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": "Mozilla/5.0", Cookie: _yahooCookie },
    });
    if (crumbRes.ok) _yahooCrumb = await crumbRes.text();
  } catch {}
  return { crumb: _yahooCrumb, cookie: _yahooCookie };
}

// ─── Convex Helpers ──────────────────────────────────────────────────────────
async function convexMutation(functionPath: string, args: any = {}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: functionPath, args }),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Convex mutation failed: ${res.status}`);
  if (payload?.status && payload.status !== "success") {
    throw new Error(`Convex mutation ${functionPath} returned ${JSON.stringify(payload)}`);
  }
  return Object.prototype.hasOwnProperty.call(payload || {}, "value") ? payload.value : payload;
}

// ─── Peer Company Mapping ────────────────────────────────────────────────────
const PEER_MAP: Record<string, string[]> = {
  HIMS: ["TDOC", "AMWL", "GH", "DOCS", "NTRA"],
  IREN: ["MARA", "RIOT", "CORZ", "CLSK", "HUT"],
  ONDS: ["AVAV", "KTOS", "RCAT", "JOBY", "LUNR"],
  PTRN: ["UPST", "AFRM", "SOFI", "LC"],
  VST: ["CEG", "NRG", "AES", "EXC", "NEE"],
  AAPL: ["MSFT", "GOOGL", "AMZN", "NVDA"],
  RKLB: ["BA", "LMT", "ASTS", "SPCE", "LUNR"],
  SOFI: ["UPST", "AFRM", "LC", "HOOD", "ALLY"],
  NVO: ["LLY", "AMGN", "AZN", "PFE", "MRK"],
};

// ─── Data Fetchers ───────────────────────────────────────────────────────────

async function fetchPeerComps(ticker: string) {
  const peers = PEER_MAP[ticker] || [];
  if (peers.length === 0) return [];
  const { crumb, cookie } = await getYahooAuth();
  const crumbParam = crumb ? `&crumb=${encodeURIComponent(crumb)}` : "";
  const headers = { "User-Agent": "Mozilla/5.0", ...(cookie ? { Cookie: cookie } : {}) };
  const comps: any[] = [];
  for (const peer of peers.slice(0, 5)) {
    try {
      const [priceRes, profRes] = await Promise.all([
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${peer}?interval=1d&range=1mo`, { headers: { "User-Agent": "Mozilla/5.0" } }),
        fetch(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${peer}?modules=financialData,defaultKeyStatistics${crumbParam}`, { headers }),
      ]);
      const priceMeta = priceRes.ok ? (await priceRes.json()).chart?.result?.[0]?.meta : null;
      const profResult = profRes.ok ? (await profRes.json()).quoteSummary?.result?.[0] : null;
      if (priceMeta) {
        comps.push({
          ticker: peer,
          price: priceMeta.regularMarketPrice,
          marketCap: priceMeta.marketCap,
          revenue: profResult?.financialData?.totalRevenue?.raw,
          revenueGrowth: profResult?.financialData?.revenueGrowth?.raw,
          grossMargin: profResult?.financialData?.grossMargins?.raw,
          operatingMargin: profResult?.financialData?.operatingMargins?.raw,
          trailingPE: profResult?.defaultKeyStatistics?.trailingPE?.raw,
          forwardPE: profResult?.defaultKeyStatistics?.forwardPE?.raw,
          pegRatio: profResult?.defaultKeyStatistics?.pegRatio?.raw,
          evToRevenue: profResult?.defaultKeyStatistics?.enterpriseToRevenue?.raw,
          evToEbitda: profResult?.defaultKeyStatistics?.enterpriseToEbitda?.raw,
          shortPercentOfFloat: profResult?.defaultKeyStatistics?.shortPercentOfFloat?.raw,
        });
      }
      await new Promise((r) => setTimeout(r, 150));
    } catch {}
  }
  return comps;
}

async function fetchEarningsData(ticker: string) {
  try {
    const { crumb, cookie } = await getYahooAuth();
    const crumbParam = crumb ? `&crumb=${encodeURIComponent(crumb)}` : "";
    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=earningsTrend,earningsHistory${crumbParam}`,
      { headers: { "User-Agent": "Mozilla/5.0", ...(cookie ? { Cookie: cookie } : {}) } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.quoteSummary?.result?.[0];
    const trend = result?.earningsTrend?.trend || [];
    const history = result?.earningsHistory?.history || [];
    
    const revisions = trend.map((t: any) => ({
      period: t.period,
      endDate: t.endDate,
      currentEstimate: t.earningsEstimate?.avg?.raw,
      lowEstimate: t.earningsEstimate?.low?.raw,
      highEstimate: t.earningsEstimate?.high?.raw,
      numberOfAnalysts: t.earningsEstimate?.numberOfAnalysts?.raw,
      revenueEstimate: t.revenueEstimate?.avg?.raw,
      earningsGrowth: t.growth?.raw,
      upLast7: t.earningsEstimate?.upLast7days?.raw || 0,
      downLast7: t.earningsEstimate?.downLast7days?.raw || 0,
      upLast30: t.earningsEstimate?.upLast30days?.raw || 0,
      downLast30: t.earningsEstimate?.downLast30days?.raw || 0,
    }));

    const beats = history.map((h: any) => ({
      quarter: h.quarter?.raw,
      date: h.reportDate?.fmt,
      epsEstimate: h.epsEstimate?.raw,
      epsActual: h.epsActual?.raw,
      surprise: h.surprisePercent?.raw,
    }));

    return { revisions, beats };
  } catch { return null; }
}

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

async function fetchYahooQuoteSummary(ticker: string, modules: string, attempt = 0): Promise<any | null> {
  try {
    if (attempt > 0) {
      _yahooCrumb = null;
      _yahooCookie = null;
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
    const { crumb, cookie } = await getYahooAuth();
    const crumbParam = crumb ? `&crumb=${encodeURIComponent(crumb)}` : "";
    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${modules}${crumbParam}`,
      {
        headers: { "User-Agent": "Mozilla/5.0", ...(cookie ? { Cookie: cookie } : {}) },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      if ((res.status === 401 || res.status === 429) && attempt < 2) {
        return fetchYahooQuoteSummary(ticker, modules, attempt + 1);
      }
      return null;
    }
    const data = await res.json();
    return data.quoteSummary?.result?.[0] ?? null;
  } catch {
    if (attempt < 2) return fetchYahooQuoteSummary(ticker, modules, attempt + 1);
    return null;
  }
}

async function fetchYahooProfile(ticker: string) {
  const result = await fetchYahooQuoteSummary(
    ticker,
    "price,assetProfile,financialData,defaultKeyStatistics,earningsTrend,recommendationTrend"
  );
  if (!result) return null;
  return {
    symbol: result?.price?.symbol,
    shortName: result?.price?.shortName,
    longName: result?.price?.longName,
    exchange: result?.price?.exchangeName,
    currency: result?.price?.currency,
    currentPrice: result?.price?.regularMarketPrice?.raw ?? result?.financialData?.currentPrice?.raw,
    marketCap: result?.price?.marketCap?.raw,
    sharesOutstanding: result?.defaultKeyStatistics?.sharesOutstanding?.raw ?? result?.price?.sharesOutstanding?.raw,
    impliedSharesOutstanding: result?.defaultKeyStatistics?.impliedSharesOutstanding?.raw,
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

type MarketCapSource = "quoteSummary.price.marketCap" | "price_x_sharesOutstanding" | "price_x_impliedSharesOutstanding";

type VerifiedFacts = {
  ticker: string;
  companyName: string;
  exchange?: string;
  currency?: string;
  currentPrice: number;
  marketCap: number;
  marketCapSource: MarketCapSource;
  sharesOutstanding?: number;
  impliedSharesOutstanding?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  sector?: string;
  industry?: string;
  revenue?: number;
  revenueGrowth?: number;
  grossMargin?: number;
  operatingMargin?: number;
  freeCashflow?: number;
  totalDebt?: number;
  totalCash?: number;
  forwardPE?: number;
  shortPercentOfFloat?: number;
  analystConsensus?: string;
  targetMeanPrice?: number;
  validatedAt: number;
};

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function normalizeName(value?: string | null): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(inc|incorporated|corp|corporation|company|co|class a|class b|class c|holdings|holding|holdings inc|plc|ltd|limited|group)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactName(value?: string | null): string {
  return normalizeName(value).replace(/\s+/g, "");
}

function namesRoughlyMatch(inputName: string | undefined, candidates: Array<string | undefined>): boolean {
  const normalizedInput = normalizeName(inputName);
  const compactInput = compactName(inputName);
  if (!normalizedInput) return true;

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeName(candidate);
    const compactCandidate = compactName(candidate);
    if (!normalizedCandidate) return false;

    if (normalizedCandidate.includes(normalizedInput)) {
      return true;
    }

    if (compactCandidate && compactInput && compactCandidate === compactInput) {
      return true;
    }

    return false;
  });
}

function resolveMarketCap(currentPrice: number | undefined, profileData: any) {
  const directMarketCap = positiveNumber(profileData?.marketCap);
  if (directMarketCap) {
    return { marketCap: directMarketCap, marketCapSource: "quoteSummary.price.marketCap" as const };
  }

  const price = positiveNumber(currentPrice);
  const sharesOutstanding = positiveNumber(profileData?.sharesOutstanding);
  if (price && sharesOutstanding) {
    return {
      marketCap: price * sharesOutstanding,
      marketCapSource: "price_x_sharesOutstanding" as const,
    };
  }

  const impliedSharesOutstanding = positiveNumber(profileData?.impliedSharesOutstanding);
  if (price && impliedSharesOutstanding) {
    return {
      marketCap: price * impliedSharesOutstanding,
      marketCapSource: "price_x_impliedSharesOutstanding" as const,
    };
  }

  return null;
}

function buildVerifiedFacts(ticker: string, requestedName: string | undefined, priceData: any, profileData: any) {
  const errors: string[] = [];
  const normalizedTicker = ticker.toUpperCase();
  const yahooSymbol = profileData?.symbol?.toUpperCase?.();
  if (!yahooSymbol || yahooSymbol !== normalizedTicker) {
    errors.push(`ticker identity mismatch: requested ${normalizedTicker}, yahoo returned ${profileData?.symbol || "unknown"}`);
  }

  if (!namesRoughlyMatch(requestedName, [profileData?.longName, profileData?.shortName])) {
    errors.push(`company identity mismatch: requested "${requestedName}", yahoo returned "${profileData?.longName || profileData?.shortName || "unknown"}"`);
  }

  const currentPrice = positiveNumber(profileData?.currentPrice) ?? positiveNumber(priceData?.price);
  if (!currentPrice) {
    errors.push("current price missing or invalid");
  }

  const resolvedMarketCap = resolveMarketCap(currentPrice, profileData);
  if (!resolvedMarketCap?.marketCap) {
    errors.push("market cap missing; could not resolve from direct field or shares outstanding");
  }

  if (errors.length > 0 || !currentPrice || !resolvedMarketCap) {
    return { ok: false as const, errors };
  }

  const companyName = profileData?.longName || profileData?.shortName || requestedName || normalizedTicker;
  return {
    ok: true as const,
    facts: {
      ticker: normalizedTicker,
      companyName,
      exchange: profileData?.exchange || priceData?.exchange,
      currency: profileData?.currency || priceData?.currency,
      currentPrice,
      marketCap: resolvedMarketCap.marketCap,
      marketCapSource: resolvedMarketCap.marketCapSource,
      sharesOutstanding: positiveNumber(profileData?.sharesOutstanding),
      impliedSharesOutstanding: positiveNumber(profileData?.impliedSharesOutstanding),
      fiftyTwoWeekHigh: positiveNumber(priceData?.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: positiveNumber(priceData?.fiftyTwoWeekLow),
      sector: profileData?.sector,
      industry: profileData?.industry,
      revenue: positiveNumber(profileData?.revenue),
      revenueGrowth: typeof profileData?.revenueGrowth === "number" ? profileData.revenueGrowth : undefined,
      grossMargin: typeof profileData?.grossMargin === "number" ? profileData.grossMargin : undefined,
      operatingMargin: typeof profileData?.operatingMargin === "number" ? profileData.operatingMargin : undefined,
      freeCashflow: typeof profileData?.freeCashflow === "number" ? profileData.freeCashflow : undefined,
      totalDebt: positiveNumber(profileData?.totalDebt),
      totalCash: positiveNumber(profileData?.totalCash),
      forwardPE: positiveNumber(profileData?.forwardPE),
      shortPercentOfFloat: typeof profileData?.shortPercentOfFloat === "number" ? profileData.shortPercentOfFloat : undefined,
      analystConsensus: profileData?.recommendationKey,
      targetMeanPrice: positiveNumber(profileData?.targetMeanPrice),
      validatedAt: Date.now(),
    } satisfies VerifiedFacts,
  };
}

function formatCurrency(value: number | undefined, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `$${value.toFixed(digits)}`;
}

function formatBillions(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(0)}`;
}

function magnitudeToNumber(raw: string, unit?: string) {
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  const normalizedUnit = (unit || "").toLowerCase();
  if (normalizedUnit.startsWith("t")) return value * 1e12;
  if (normalizedUnit.startsWith("b")) return value * 1e9;
  if (normalizedUnit.startsWith("m")) return value * 1e6;
  if (normalizedUnit.startsWith("k")) return value * 1e3;
  return value;
}

function extractMentionedMarketCaps(text: string) {
  const matches: number[] = [];
  const patterns = [
    /market cap[^\n\r$]{0,40}\$([0-9][0-9,]*(?:\.[0-9]+)?)\s*([TBMK]|trillion|billion|million|thousand)?/gi,
    /\$([0-9][0-9,]*(?:\.[0-9]+)?)\s*([TBMK]|trillion|billion|million|thousand)\s+market cap/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const parsed = magnitudeToNumber(match[1], match[2]);
      if (parsed) matches.push(parsed);
    }
  }
  return matches;
}

function extractMentionedCurrentPrices(text: string) {
  const matches: number[] = [];
  const patterns = [
    /current price[^\n\r$]{0,20}\$([0-9][0-9,]*(?:\.[0-9]+)?)/gi,
    /(?:shares|stock) (?:trade|trades|trading)[^\n\r$]{0,20}\$([0-9][0-9,]*(?:\.[0-9]+)?)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const parsed = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(parsed)) matches.push(parsed);
    }
  }
  return matches;
}

function relativeDifference(a: number, b: number) {
  return Math.abs(a - b) / Math.max(Math.abs(b), 1);
}

function validateGeneratedThesis(thesis: string, facts: VerifiedFacts) {
  const issues: string[] = [];

  const marketCaps = extractMentionedMarketCaps(thesis);
  if (marketCaps.length > 0) {
    const hasCloseMarketCap = marketCaps.some((value) => relativeDifference(value, facts.marketCap) <= 0.25);
    if (!hasCloseMarketCap) {
      issues.push(`market cap in thesis does not match verified value (${formatBillions(facts.marketCap)})`);
    }
  }

  const currentPrices = extractMentionedCurrentPrices(thesis);
  if (currentPrices.length > 0) {
    const hasClosePrice = currentPrices.some((value) => relativeDifference(value, facts.currentPrice) <= 0.15);
    if (!hasClosePrice) {
      issues.push(`current price in thesis does not match verified value (${formatCurrency(facts.currentPrice)})`);
    }
  }

  const upper = thesis.toUpperCase();
  if (!upper.includes(facts.ticker)) {
    issues.push(`ticker ${facts.ticker} missing from thesis body`);
  }

  return { ok: issues.length === 0, issues };
}

function buildVerifiedFactsSection(facts: VerifiedFacts) {
  const lines = [
    `## VERIFIED FACTS — USE THESE NUMBERS EXACTLY`,
    `- Ticker: ${facts.ticker}`,
    `- Company: ${facts.companyName}`,
    `- Current price: ${formatCurrency(facts.currentPrice)}`,
    `- Market cap: ${formatBillions(facts.marketCap)} (${facts.marketCapSource})`,
    `- Shares outstanding: ${facts.sharesOutstanding ? facts.sharesOutstanding.toLocaleString("en-US") : "N/A"}`,
    `- Implied shares outstanding: ${facts.impliedSharesOutstanding ? facts.impliedSharesOutstanding.toLocaleString("en-US") : "N/A"}`,
    `- Exchange / currency: ${facts.exchange || "N/A"} / ${facts.currency || "N/A"}`,
    `- 52-week range: ${formatCurrency(facts.fiftyTwoWeekLow)} – ${formatCurrency(facts.fiftyTwoWeekHigh)}`,
    `- Revenue: ${formatBillions(facts.revenue)}`,
    `- Revenue growth: ${typeof facts.revenueGrowth === "number" ? `${(facts.revenueGrowth * 100).toFixed(1)}%` : "N/A"}`,
    `- Gross margin: ${typeof facts.grossMargin === "number" ? `${(facts.grossMargin * 100).toFixed(1)}%` : "N/A"}`,
    `- Operating margin: ${typeof facts.operatingMargin === "number" ? `${(facts.operatingMargin * 100).toFixed(1)}%` : "N/A"}`,
    `- Free cash flow: ${formatBillions(facts.freeCashflow)}`,
    `- Total debt: ${formatBillions(facts.totalDebt)}`,
    `- Total cash: ${formatBillions(facts.totalCash)}`,
    `- Forward P/E: ${typeof facts.forwardPE === "number" ? facts.forwardPE.toFixed(1) : "N/A"}`,
    `- Short % of float: ${typeof facts.shortPercentOfFloat === "number" ? `${(facts.shortPercentOfFloat * 100).toFixed(1)}%` : "N/A"}`,
    `- Analyst consensus: ${facts.analystConsensus || "N/A"}`,
    `- Mean target: ${formatCurrency(facts.targetMeanPrice)}`,
  ];
  return lines.join("\n");
}

function buildPartialThesisFromFacts(facts: VerifiedFacts | null, issues: string[], worthyArticles: any[], priceData: any, entryPrice: number | undefined, pnlPct: string) {
  const header = issues.length > 0 ? `[PARTIAL — thesis validation failed]` : `[PARTIAL — LLM synthesis pending]`;
  const factLines = facts ? [
    `Verified ticker: ${facts.ticker}`,
    `Verified company: ${facts.companyName}`,
    `Verified current price: ${formatCurrency(facts.currentPrice)}`,
    `Verified market cap: ${formatBillions(facts.marketCap)} (${facts.marketCapSource})`,
  ] : [
    `Current price: ${priceData?.price ? formatCurrency(priceData.price) : "N/A"}`,
    `Entry price: ${entryPrice ? formatCurrency(entryPrice) : "N/A"}`,
    `P&L: ${pnlPct}%`,
  ];
  const issueLines = issues.length > 0 ? [`Validation issues:`, ...issues.map((issue) => `- ${issue}`)] : [];
  const articleLines = worthyArticles.slice(0, 5).map((a: any) => `• ${a.title}`);
  return [header, "", ...factLines, "", ...issueLines, ...(issueLines.length ? [""] : []), `Top headlines:`, ...articleLines].join("\n");
}

function buildDeterministicFinalThesis(params: {
  facts: VerifiedFacts;
  profileData: any;
  worthyArticles: any[];
  secFilings: any[];
  peerComps: any[];
  earningsData: any;
  portfolioType?: string;
  shares?: number;
  entryPrice?: number;
  timeHorizon?: string;
  refreshReason?: string;
  pnlPct: string;
}) {
  const {
    facts,
    profileData,
    worthyArticles,
    secFilings,
    peerComps,
    earningsData,
    portfolioType,
    shares,
    entryPrice,
    timeHorizon,
    refreshReason,
    pnlPct,
  } = params;

  const topArticles = worthyArticles.slice(0, 5);
  const topFilings = secFilings.slice(0, 3);
  const topPeers = peerComps.slice(0, 5);
  const revisions = earningsData?.revisions?.slice?.(0, 3) ?? [];
  const beats = earningsData?.beats?.slice?.(0, 4) ?? [];
  const catalysts: string[] = [];

  if (typeof facts.revenueGrowth === "number" && facts.revenueGrowth > 0.15) {
    catalysts.push(`Revenue growth is still strong at ${(facts.revenueGrowth * 100).toFixed(1)}%, which keeps the upside case alive if that pace holds.`);
  }
  if (typeof facts.freeCashflow === "number" && facts.freeCashflow > 0) {
    catalysts.push(`Free cash flow is positive at ${formatBillions(facts.freeCashflow)}, so this is not purely a story stock.`);
  }
  if (typeof facts.totalCash === "number" && typeof facts.totalDebt === "number") {
    if (facts.totalCash > facts.totalDebt) {
      catalysts.push(`The balance sheet is net-cash positive with ${formatBillions(facts.totalCash)} cash against ${formatBillions(facts.totalDebt)} debt.`);
    } else {
      catalysts.push(`The capital structure needs watching: ${formatBillions(facts.totalDebt)} debt against ${formatBillions(facts.totalCash)} cash.`);
    }
  }
  if (typeof facts.shortPercentOfFloat === "number" && facts.shortPercentOfFloat >= 0.1) {
    catalysts.push(`Short interest sits at ${(facts.shortPercentOfFloat * 100).toFixed(1)}% of float, which can amplify both squeezes and downside if the thesis cracks.`);
  }
  if (topArticles.length === 0) {
    catalysts.push("Recent source coverage is thin, so conviction should stay tied to verified operating facts rather than narrative momentum.");
  }

  const riskLines = [
    `The stock currently trades around ${formatCurrency(facts.currentPrice)} on a verified market cap of ${formatBillions(facts.marketCap)}. If the market is wrong, the upside comes from execution improving from here. If the market is right, that valuation can still compress.`,
    typeof facts.revenueGrowth === "number" && facts.revenueGrowth > 0
      ? `If revenue growth falls materially below ${(facts.revenueGrowth * 100).toFixed(1)}%, the market will likely cut the multiple before it waits for management explanations.`
      : `If growth or margin evidence weakens, the market cap can fall faster than the operating business changes.`,
    typeof facts.operatingMargin === "number"
      ? `Operating margin is currently ${(facts.operatingMargin * 100).toFixed(1)}%. That leaves limited room for narrative mistakes if profitability disappoints.`
      : `Operating margin is not cleanly verified here, so margin durability remains a live underwriting risk.`,
  ];

  const peerLead = topPeers.length > 0
    ? `Peers worth anchoring against: ${topPeers.map((peer: any) => `${peer.ticker}${typeof peer.forwardPE === "number" ? ` (${peer.forwardPE.toFixed(1)}x fwd P/E)` : ""}`).join(", ")}.`
    : "Peer data did not resolve cleanly in this run, so valuation framing should stay conservative.";

  const revisionLead = revisions.length > 0
    ? revisions.map((r: any) => {
        const bits = [`${r.period}: ${r.numberOfAnalysts || 0} analysts`];
        if (typeof r.currentEstimate === "number") bits.push(`EPS est ${r.currentEstimate.toFixed(2)}`);
        if (typeof r.upLast30 === "number" || typeof r.downLast30 === "number") bits.push(`30d revisions ${r.upLast30 || 0} up / ${r.downLast30 || 0} down`);
        return bits.join(" | ");
      }).join("\n")
    : "No clean estimate-revision read came through the feed, so treat earnings-momentum confidence as limited.";

  const beatLead = beats.length > 0
    ? beats.map((b: any) => {
        const surprise = typeof b.surprise === "number"
          ? (b.surprise > 0 ? `beat ${(b.surprise * 100).toFixed(1)}%` : b.surprise < 0 ? `miss ${(Math.abs(b.surprise) * 100).toFixed(1)}%` : "met")
          : "result unavailable";
        return `${b.date || b.quarter || "Recent quarter"}: ${surprise}`;
      }).join("\n")
    : "Recent beat/miss history did not resolve cleanly in this run.";

  const managementScore = (() => {
    let score = 5;
    if (typeof facts.revenueGrowth === "number" && facts.revenueGrowth > 0.2) score += 1;
    if (typeof facts.freeCashflow === "number" && facts.freeCashflow > 0) score += 1;
    if (typeof facts.totalCash === "number" && typeof facts.totalDebt === "number" && facts.totalCash > facts.totalDebt) score += 1;
    if (typeof facts.operatingMargin === "number" && facts.operatingMargin < 0) score -= 1;
    return Math.max(3, Math.min(8, score));
  })();

  const lines = [
    `POSITION SUMMARY — ${facts.ticker} (${facts.companyName})`,
    `Ticker verified as ${facts.ticker}. Current price is ${formatCurrency(facts.currentPrice)}. Verified market cap is ${formatBillions(facts.marketCap)} via ${facts.marketCapSource}. Portfolio type: ${portfolioType || "N/A"}. Entry price: ${entryPrice ? formatCurrency(entryPrice) : "N/A"}. Shares: ${shares || "N/A"}. P&L: ${pnlPct}%. Time horizon: ${timeHorizon || "N/A"}. Refresh reason: ${refreshReason || "initial generation"}.`,
    "",
    `BULL CASE — ${facts.ticker} is only investable if the verified operating profile keeps improving faster than the market expects. ${catalysts.join(" ")}`,
    "",
    `PEER COMPARABLE ANALYSIS — ${peerLead} Subject company verified facts: revenue ${formatBillions(facts.revenue)}, gross margin ${typeof facts.grossMargin === "number" ? `${(facts.grossMargin * 100).toFixed(1)}%` : "N/A"}, operating margin ${typeof facts.operatingMargin === "number" ? `${(facts.operatingMargin * 100).toFixed(1)}%` : "N/A"}, forward P/E ${typeof facts.forwardPE === "number" ? facts.forwardPE.toFixed(1) : "N/A"}. Use that to decide whether the current valuation is cheap for the quality level or cheap for a reason.`,
    "",
    `SIMPLIFIED DCF — With revenue at ${formatBillions(facts.revenue)} and free cash flow at ${formatBillions(facts.freeCashflow)}, the clean way to frame value is scenario-based instead of fake precision. BEAR: growth slows hard and valuation compresses. BASE: current growth and margin structure broadly hold. BULL: growth persists and operating leverage expands. The key point is that the present market cap is ${formatBillions(facts.marketCap)}; underwriting should start from that verified value, not from an invented target.`,
    "",
    `KEY CATALYSTS WITH PROBABILITY WEIGHTING — 1) Execution against the current growth profile (${typeof facts.revenueGrowth === "number" ? `${(facts.revenueGrowth * 100).toFixed(1)}% revenue growth` : "growth rate unverified"}) is the primary upside driver. 2) Balance-sheet durability and cash generation (${formatBillions(facts.totalCash)} cash, ${formatBillions(facts.totalDebt)} debt, ${formatBillions(facts.freeCashflow)} FCF) determine whether the company can self-fund its thesis. 3) Market narrative can shift quickly if recent source flow is confirmed by filings and earnings rather than headlines alone.`,
    "",
    `EARNINGS REVISION MOMENTUM — ${revisionLead}\n${beatLead}`,
    "",
    `MANAGEMENT QUALITY — ${managementScore}/10. This is a deterministic score based on the verified operating profile, cash generation, and balance-sheet posture from this run. It is directionally useful, not a substitute for direct transcript work.`,
    "",
    `RISK FACTORS — ${riskLines.join(" ")}`,
    "",
    `PITZY MODEL ASSESSMENT — Retail edge exists only if the market is still underreacting to the operating trajectory and the source flow is identifying a real catalyst instead of recycled noise. Event certainty is ${topArticles.length > 0 || topFilings.length > 0 ? "moderate" : "low"}. Asymmetry depends on whether ${facts.ticker} can outperform what a ${formatBillions(facts.marketCap)} valuation already implies.`,
    "",
    `DECISION FRAMEWORK — Stay constructive only while verified facts remain intact: current price ${formatCurrency(facts.currentPrice)}, market cap ${formatBillions(facts.marketCap)}, and the latest operating metrics do not break. If those verified anchors weaken, downgrade fast. If they improve and the market still prices the company like a broken story, the position remains valid.`,
  ];

  if (topArticles.length > 0) {
    lines.push("", "SOURCE CHECK — Recent high-scoring articles used in this deterministic fallback:");
    for (const article of topArticles) {
      lines.push(`- ${article.title}${article.publisher ? ` (${article.publisher})` : ""}`);
    }
  }

  if (topFilings.length > 0) {
    lines.push("", "RECENT SEC FILINGS —");
    for (const filing of topFilings) {
      lines.push(`- ${filing.form} filed ${filing.filed}: ${filing.description}`);
    }
  }

  return lines.join("\n");
}

// ─── LLM Thesis Generation (Cascading Models) ───────────────────────────────

const SYSTEM_PROMPT = `You are a senior equity research analyst at a top-tier fund writing institutional-quality investment theses for the Pitzy Model — a retail-edge, event-driven value investing framework.

The Pitzy Model's core principles:
- Retail investors have a structural nimbleness advantage over institutions
- Institutions have quarterly goals and can't take down quarters — retail can
- Event-driven catalysts create windows where retail can capture value before institutions re-rate
- Rule One / Buffett value investing principles: buy wonderful companies at fair prices
- Track institutional flows, but bet against them when they're forced sellers
- Sentiment + Valuation + Event Catalyst + Certainty = Buy Signal

Write institutional-quality theses with real numbers, derived valuations, and honest risk assessment. No platitudes, no hedging, no "could potentially maybe." Call it like it is.

Hard rule: the VERIFIED FACTS block in the user prompt is the only source of truth for critical numeric facts like current price, market cap, shares outstanding, and valuation anchors. If you are unsure, say the number is unavailable. Never invent or approximate a market cap.

IMPORTANT FORMATTING RULES:
- Do NOT use markdown bold asterisks (**text**). Use plain text with clean formatting.
- Use ALL CAPS for emphasis instead of bold markers.
- Use dashes (—) for structure, not asterisks.

Structure your thesis as:
1. POSITION SUMMARY — ticker, entry, current price, P&L, shares, portfolio weight
2. BULL CASE — specific catalysts with data points, not generic statements
3. PEER COMPARABLE ANALYSIS — where does this trade vs comps? Premium/discount justified?
4. SIMPLIFIED DCF — 3 scenarios (bear/base/bull) with revenue projections, FCF, terminal value, per-share value. Show the math.
5. KEY CATALYSTS WITH PROBABILITY WEIGHTING — each catalyst gets: probability %, price impact, timeline, expected value
6. EARNINGS REVISION MOMENTUM — what are analysts doing? Beat/miss history.
7. MANAGEMENT QUALITY — score 1-10 on track record, insider ownership, capital allocation, communication
8. RISK FACTORS — brutally honest
9. PITZY MODEL ASSESSMENT — retail edge score, event certainty, asymmetry, timing
10. DECISION FRAMEWORK — specific price levels for hold/add/trim/exit`;

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
    signal: AbortSignal.timeout(45000),
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
    signal: AbortSignal.timeout(45000),
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
    signal: AbortSignal.timeout(30000),
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
    signal: AbortSignal.timeout(20000),
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
  const { ticker, name, positionId, portfolioType, shares, entryPrice, timeHorizon, refreshReason } = body;

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  }

  // When positionId is absent, we're in "discovery mode" — generate thesis and return it
  // without writing to a position
  const discoveryMode = !positionId;

  console.log(`\n📊 Deep thesis generation for ${ticker} (${name})${refreshReason ? ` — ${refreshReason}` : ""}...`);

  // Fetch ALL data in parallel
  const [priceData, profileData, yahooNews, braveNews, secFilings, deepSearch, earningsData, peerComps] = await Promise.all([
    fetchYahooFinance(ticker),
    fetchYahooProfile(ticker),
    fetchYahooNews(ticker),
    fetchBraveSearch(`${ticker} stock news analysis`, 10),
    fetchSECFilings(ticker),
    fetchFullTextSearch(ticker, name || ticker),
    fetchEarningsData(ticker),
    fetchPeerComps(ticker),
  ]);

  const verification = buildVerifiedFacts(ticker, name, priceData, profileData);
  if (!verification.ok) {
    const thesis = buildPartialThesisFromFacts(null, verification.errors, [], priceData, entryPrice, "N/A");
    if (!discoveryMode) {
      await convexMutation("investments:updatePosition", {
        id: positionId,
        thesis,
        thesisStatus: "partial",
        thesisValidationIssues: verification.errors,
        verifiedFacts: undefined,
        thesisSources: [],
        thesisGeneratedAt: Date.now(),
      });
    }
    return NextResponse.json({ status: "partial", ticker, thesis, errors: verification.errors }, { status: 422 });
  }

  const verifiedFacts = verification.facts;

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
  const pnlPct = verifiedFacts.currentPrice && entryPrice ? (((verifiedFacts.currentPrice - entryPrice) / entryPrice) * 100).toFixed(1) : "N/A";

  let context = `Generate a comprehensive investment thesis for ${verifiedFacts.ticker} (${verifiedFacts.companyName}).

${buildVerifiedFactsSection(verifiedFacts)}

## POSITION DATA
- Portfolio type: ${portfolioType}
- Shares: ${shares || "N/A"}
- Entry price: $${entryPrice || "N/A"}
- Current price: ${formatCurrency(verifiedFacts.currentPrice)}
- Unrealized P&L: ${pnlPct}%
- Time horizon: ${timeHorizon || "N/A"}
- Refresh reason: ${refreshReason || "initial generation"}

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

  // ─── Peer Comparable Analysis ──────────────────────────────────────────────
  if (peerComps && peerComps.length > 0) {
    const fmtB = (v: number | undefined) => v ? `$${(v / 1e9).toFixed(1)}B` : "N/A";
    const fmtPct = (v: number | undefined | null) => v != null ? `${(v * 100).toFixed(1)}%` : "N/A";
    context += `\n## PEER COMPARABLE ANALYSIS\nCompare ${ticker} valuations against direct competitors:\n\n`;
    context += `| Ticker | Mkt Cap | Revenue | Rev Growth | Gross Margin | P/E (fwd) | EV/Rev | EV/EBITDA | Short% |\n`;
    context += `|--------|---------|---------|------------|--------------|-----------|--------|-----------|--------|\n`;
    if (profileData) {
      context += `| ${ticker} (SUBJECT) | ${fmtB(verifiedFacts.marketCap)} | ${fmtB(profileData.revenue)} | ${fmtPct(profileData.revenueGrowth)} | ${fmtPct(profileData.grossMargin)} | ${profileData.forwardPE?.toFixed(1) || "N/A"} | N/A | N/A | ${fmtPct(profileData.shortPercentOfFloat)} |\n`;
    }
    for (const p of peerComps) {
      context += `| ${p.ticker} | ${fmtB(p.marketCap)} | ${fmtB(p.revenue)} | ${fmtPct(p.revenueGrowth)} | ${fmtPct(p.grossMargin)} | ${p.forwardPE?.toFixed(1) || "N/A"} | ${p.evToRevenue?.toFixed(1) || "N/A"} | ${p.evToEbitda?.toFixed(1) || "N/A"} | ${fmtPct(p.shortPercentOfFloat)} |\n`;
    }
    context += `\nAnalyze: Is ${ticker} trading at a premium or discount to peers? Is the premium/discount justified?\n`;
  }

  // ─── Earnings Estimate Revisions ───────────────────────────────────────────
  if (earningsData) {
    if (earningsData.revisions && earningsData.revisions.length > 0) {
      context += `\n## EARNINGS ESTIMATE REVISIONS\n`;
      for (const r of earningsData.revisions) {
        context += `- Period ${r.period} (ending ${r.endDate}): EPS estimate $${r.currentEstimate?.toFixed(2) || "N/A"} | ${r.numberOfAnalysts || 0} analysts | Growth: ${r.earningsGrowth ? (r.earningsGrowth * 100).toFixed(1) + "%" : "N/A"}`;
        if (r.upLast30 > 0 || r.downLast30 > 0) context += ` | 30d revisions: ${r.upLast30} up / ${r.downLast30} down`;
        if (r.upLast7 > 0 || r.downLast7 > 0) context += ` | 7d: ${r.upLast7} up / ${r.downLast7} down`;
        context += `\n`;
      }
    }
    if (earningsData.beats && earningsData.beats.length > 0) {
      context += `\n## EARNINGS HISTORY\n`;
      for (const b of earningsData.beats.slice(0, 4)) {
        const beatMiss = b.surprise > 0 ? `BEAT by ${(b.surprise * 100).toFixed(1)}%` : b.surprise < 0 ? `MISSED by ${(Math.abs(b.surprise) * 100).toFixed(1)}%` : "MET";
        context += `- Q${b.quarter || "?"} (${b.date || "?"}): Est $${b.epsEstimate?.toFixed(2) || "?"} → Actual $${b.epsActual?.toFixed(2) || "?"} → ${beatMiss}\n`;
      }
    }
  }

  context += `\n## INSTRUCTIONS
Write an institutional-quality thesis structured as:
1. POSITION SUMMARY — entry, current, P&L, shares
2. BULL CASE — specific catalysts, not generic statements
3. PEER COMPARABLE ANALYSIS — premium/discount to comps, justified?
4. SIMPLIFIED DCF — 3 scenarios (bear/base/bull): revenue → FCF → terminal value → per-share value. Show the math. Use 10% base discount rate.
5. KEY CATALYSTS WITH PROBABILITY WEIGHTING — each catalyst: probability %, price impact, timeline, expected value. Sum for probability-weighted target.
6. EARNINGS REVISION MOMENTUM — are analysts revising up/down? What does the beat/miss history tell us?
7. MANAGEMENT QUALITY — score 1-10: track record, insider ownership, capital allocation, communication
8. RISK FACTORS — brutally honest, what kills this thesis
9. PITZY MODEL ASSESSMENT — retail edge, event certainty, asymmetry, timing scores
10. DECISION FRAMEWORK — specific hold/add/trim/exit price levels

Do NOT use markdown bold (**text**). Use ALL CAPS for emphasis. Use actual numbers from the data. Do not fabricate data points. Reference source articles by name.

Critical rules: 1) Use the VERIFIED FACTS block exactly for current price and market cap. 2) If you mention market cap, it must match the verified market cap within rounding. 3) If a number is not verified, say it is unavailable instead of inventing it.`;

  // Generate thesis (cascading models)
  const { text: thesis, model: usedModel } = await generateThesisWithLLM(context);
  console.log(`  Model used: ${usedModel || "none"}`);

  const sources = worthyArticles.slice(0, 15).map((a: any) => ({
    title: a.title, url: a.url, publisher: a.publisher,
    publishedAt: a.publishedAt, quality: a.quality,
    trustworthiness: a.trustworthiness, relevance: a.relevance,
    compositeScore: a.compositeScore,
  }));

  if (!thesis) {
    console.log(`  ⚠️ LLM generation failed — using deterministic final-writer fallback`);
    const fallbackThesis = buildDeterministicFinalThesis({
      facts: verifiedFacts,
      profileData,
      worthyArticles,
      secFilings,
      peerComps,
      earningsData,
      portfolioType,
      shares,
      entryPrice,
      timeHorizon,
      refreshReason,
      pnlPct,
    });

    const fallbackValidation = validateGeneratedThesis(fallbackThesis, verifiedFacts);
    if (!fallbackValidation.ok) {
      console.log(`  ⚠️ Deterministic fallback validation failed: ${fallbackValidation.issues.join("; ")}`);
      const partialThesis = buildPartialThesisFromFacts(verifiedFacts, ["LLM synthesis failed", ...fallbackValidation.issues], worthyArticles, priceData, entryPrice, pnlPct);
      if (!discoveryMode) {
        await convexMutation("investments:updatePosition", {
          id: positionId,
          thesis: partialThesis,
          thesisStatus: "partial",
          thesisValidationIssues: ["LLM synthesis failed", ...fallbackValidation.issues],
          verifiedFacts,
          thesisSources: sources,
          thesisGeneratedAt: Date.now(),
        });
      }

      return NextResponse.json({ status: "partial", ticker, thesis: partialThesis, message: "Research saved, deterministic fallback failed validation", sources }, { status: 422 });
    }

    if (!discoveryMode) {
      await convexMutation("investments:updatePosition", {
        id: positionId,
        thesis: fallbackThesis,
        thesisStatus: "final",
        thesisValidationIssues: [],
        verifiedFacts,
        thesisSources: sources,
        thesisGeneratedAt: Date.now(),
      });
    }

    return NextResponse.json({ status: "ok", ticker, thesis: fallbackThesis, model: "deterministic-fallback", sourcesCount: sources.length, thesisLength: fallbackThesis.length, verifiedFacts, sources });
  }

  const thesisValidation = validateGeneratedThesis(thesis, verifiedFacts);
  if (!thesisValidation.ok) {
    console.log(`  ⚠️ Thesis validation failed: ${thesisValidation.issues.join("; ")}`);
    const partialThesis = buildPartialThesisFromFacts(verifiedFacts, thesisValidation.issues, worthyArticles, priceData, entryPrice, pnlPct);
    if (!discoveryMode) {
      await convexMutation("investments:updatePosition", {
        id: positionId,
        thesis: partialThesis,
        thesisStatus: "partial",
        thesisValidationIssues: thesisValidation.issues,
        verifiedFacts,
        thesisSources: sources,
        thesisGeneratedAt: Date.now(),
      });
    }
    return NextResponse.json({ status: "partial", ticker, thesis: partialThesis, issues: thesisValidation.issues, sources }, { status: 422 });
  }

  if (!discoveryMode) {
    await convexMutation("investments:updatePosition", {
      id: positionId,
      thesis,
      thesisStatus: "final",
      thesisValidationIssues: [],
      verifiedFacts,
      thesisSources: sources,
      thesisGeneratedAt: Date.now(),
    });
  }

  console.log(`  ✅ Thesis ${discoveryMode ? "generated" : "saved"} for ${ticker} with ${sources.length} sources`);

  return NextResponse.json({
    status: "ok",
    ticker,
    thesis,
    model: usedModel,
    sourcesCount: sources.length,
    thesisLength: thesis.length,
    verifiedFacts,
    sources,
  });
}
