import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

const BULLISH_WORDS = [
  "buy", "long", "bull", "bullish", "calls", "undervalued", "moon",
  "breaking out", "breakout", "accumulating", "dip buy", "upside",
  "support", "holding", "hold", "target", "upgrade", "upgraded",
  "outperform", "overweight", "strong buy", "accumulate", "rally",
  "squeeze", "gap up", "green", "rip", "send it", "lfg", "love",
];
const BULLISH_EMOJI = ["🚀", "📈", "💰", "🔥", "💪", "🐂", "💎", "🤑"];

const BEARISH_WORDS = [
  "sell", "short", "bear", "bearish", "puts", "overvalued", "dump",
  "crash", "crashing", "falling", "avoid", "doj", "investigation",
  "lawsuit", "scam", "dying", "fraud", "downgrade", "downgraded",
  "underperform", "underweight", "gap down", "red", "rug", "rip off",
  "ponzi", "dilution", "toxic", "warning", "risk", "bubble",
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
    const urlMatch = tweet.match(/url: (https:\/\/x\.com\/\S+)/);
    const key = urlMatch ? urlMatch[1] : tweet.substring(0, 80);
    if (!seen.has(key)) { seen.add(key); unique.push(tweet); }
  }
  return unique;
}

function fetchPrice(ticker: string): number | null {
  try {
    const res = execSync(
      `curl -sf 'https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d' -H 'User-Agent: Mozilla/5.0'`,
      { encoding: "utf-8", timeout: 10000 }
    );
    const data = JSON.parse(res);
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.toUpperCase();
  if (!ticker || !/^[A-Z]{1,6}$/.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }

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

  const tweets = parseTweets(allRaw.join("\n\n"));
  if (tweets.length === 0) {
    return NextResponse.json({ error: `No tweets found for ${ticker}` }, { status: 404 });
  }

  let bullishCount = 0, bearishCount = 0, neutralCount = 0;
  let bestBullishScore = 0, bestBearishScore = 0;
  let topBullish = "", topBearish = "";

  for (const tweet of tweets) {
    const score = scoreTweet(tweet);
    if (score > 0) {
      bullishCount++;
      if (score > bestBullishScore) { bestBullishScore = score; topBullish = tweet.substring(0, 200); }
    } else if (score < 0) {
      bearishCount++;
      if (score < bestBearishScore) { bestBearishScore = score; topBearish = tweet.substring(0, 200); }
    } else {
      neutralCount++;
    }
  }

  const total = tweets.length;
  const rawScore = total > 0 ? ((bullishCount - bearishCount) / total) * 100 : 0;
  const score = Math.max(-100, Math.min(100, Math.round(rawScore)));
  const price = fetchPrice(ticker);

  const result: any = {
    score, tweetCount: total, bullishCount, bearishCount, neutralCount,
    checkedAt: Date.now(),
  };
  if (topBullish) result.topBullish = topBullish;
  if (topBearish) result.topBearish = topBearish;
  if (price !== null) result.priceAtCheck = price;

  return NextResponse.json(result);
}
