import { NextRequest, NextResponse } from "next/server";

const IS_VERCEL = !!process.env.VERCEL;

const BULLISH_WORDS = [
  "buy", "long", "bull", "bullish", "calls", "undervalued", "moon",
  "breaking out", "breakout", "accumulating", "dip buy", "upside",
  "support", "holding", "hold", "target", "upgrade", "upgraded",
  "outperform", "overweight", "strong buy", "accumulate", "rally",
  "squeeze", "gap up", "green", "rip", "send it", "lfg", "love",
  "beat", "exceeded", "growth", "momentum", "strong", "winner",
];
const BULLISH_EMOJI = ["🚀", "📈", "💰", "🔥", "💪", "🐂", "💎", "🤑"];

const BEARISH_WORDS = [
  "sell", "short", "bear", "bearish", "puts", "overvalued", "dump",
  "crash", "crashing", "falling", "avoid", "doj", "investigation",
  "lawsuit", "scam", "dying", "fraud", "downgrade", "downgraded",
  "underperform", "underweight", "gap down", "red", "rug", "rip off",
  "ponzi", "dilution", "toxic", "warning", "risk", "bubble",
  "miss", "missed", "weak", "concern", "worried", "trouble",
];
const BEARISH_EMOJI = ["📉", "⚠️", "🐻", "💀", "🔻", "❌", "😱"];

function scoreTweet(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const word of BULLISH_WORDS) if (lower.includes(word)) score += 1;
  for (const emoji of BULLISH_EMOJI) if (text.includes(emoji)) score += 1;
  for (const word of BEARISH_WORDS) if (lower.includes(word)) score -= 1;
  for (const emoji of BEARISH_EMOJI) if (text.includes(emoji)) score -= 1;
  return score;
}

function parseTweets(raw: string): string[] {
  if (!raw.trim()) return [];
  const tweets = raw.split(/\n{2,}/).map((t) => t.trim()).filter((t) => t.length > 10);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const tweet of tweets) {
    const key = tweet.substring(0, 80).toLowerCase();
    if (!seen.has(key)) { seen.add(key); unique.push(tweet); }
  }
  return unique;
}

function fetchPrice(ticker: string): Promise<number | null> {
  return fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
    { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) }
  ).then(r => r.json()).then(d => d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null).catch(() => null);
}

// ── Multi-source social/news sentiment gathering ──

async function fetchStockTwitsMessages(ticker: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(ticker)}.json`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.messages || []).map((m: any) => m.body || "").filter((b: string) => b.length > 10);
  } catch { return []; }
}

async function fetchRedditPosts(ticker: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(ticker + " stock")}&sort=new&limit=30&t=week`,
      { headers: { "User-Agent": "MissionControl/1.0" }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.children || []).map((c: any) => {
      const d = c.data;
      return `${d.title || ""} ${d.selftext?.substring(0, 200) || ""}`.trim();
    }).filter((t: string) => t.length > 10);
  } catch { return []; }
}

async function fetchYahooFinanceNews(ticker: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split("<item>").slice(1, 15);
    return items.map((item) => {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      return (titleMatch?.[1] || titleMatch?.[2] || "").replace(/&amp;/g, "&");
    }).filter((t) => t.length > 10);
  } catch { return []; }
}

async function fetchBirdTweets(ticker: string): Promise<string[]> {
  // Only available locally (Mac mini) where bird CLI is installed
  if (IS_VERCEL) return [];
  
  try {
    const { execSync } = await import("child_process");
    const queries = [`$${ticker}`, `${ticker} stock`];
    const allRaw: string[] = [];
    
    for (const query of queries) {
      try {
        const raw = execSync(
          `source ~/.zshrc 2>/dev/null; bird search '${query}' -n 50 --plain`,
          { encoding: "utf-8", timeout: 30000, shell: "/bin/zsh" }
        );
        allRaw.push(raw);
      } catch { /* skip */ }
    }
    
    return parseTweets(allRaw.join("\n\n"));
  } catch { return []; }
}

// ── Main handler ──

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.toUpperCase();
  if (!ticker || !/^[A-Z]{1,6}$/.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }

  // Fetch from multiple sources in parallel
  const [stocktwits, reddit, yahooNews, birdTweets, price] = await Promise.all([
    fetchStockTwitsMessages(ticker),
    fetchRedditPosts(ticker),
    fetchYahooFinanceNews(ticker),
    fetchBirdTweets(ticker),
    fetchPrice(ticker),
  ]);

  // Combine all text sources
  const allTexts = [...birdTweets, ...stocktwits, ...reddit, ...yahooNews];
  
  if (allTexts.length === 0) {
    return NextResponse.json(
      { error: `No social/news data found for ${ticker}. Try a more popular ticker.` },
      { status: 404 }
    );
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const text of allTexts) {
    const key = text.substring(0, 60).toLowerCase();
    if (!seen.has(key)) { seen.add(key); unique.push(text); }
  }

  let bullishCount = 0, bearishCount = 0, neutralCount = 0;
  let bestBullishScore = 0, bestBearishScore = 0;
  let topBullish = "", topBearish = "";

  for (const text of unique) {
    const score = scoreTweet(text);
    if (score > 0) {
      bullishCount++;
      if (score > bestBullishScore) { bestBullishScore = score; topBullish = text.substring(0, 200); }
    } else if (score < 0) {
      bearishCount++;
      if (score < bestBearishScore) { bestBearishScore = score; topBearish = text.substring(0, 200); }
    } else {
      neutralCount++;
    }
  }

  const total = unique.length;
  const rawScore = total > 0 ? ((bullishCount - bearishCount) / total) * 100 : 0;
  const score = Math.max(-100, Math.min(100, Math.round(rawScore)));

  const result: Record<string, unknown> = {
    score,
    tweetCount: total,
    bullishCount,
    bearishCount,
    neutralCount,
    checkedAt: Date.now(),
    sources: {
      stocktwits: stocktwits.length,
      reddit: reddit.length,
      yahooNews: yahooNews.length,
      twitter: birdTweets.length,
    },
  };
  if (topBullish) result.topBullish = topBullish;
  if (topBearish) result.topBearish = topBearish;
  if (price !== null) result.priceAtCheck = price;

  return NextResponse.json(result);
}
