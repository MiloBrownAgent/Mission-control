#!/usr/bin/env node
/**
 * $HIMS Twitter Sentiment Analyzer
 * Fetches recent tweets via Bird CLI, scores sentiment, stores to Convex.
 * Run: node scripts/hims-sentiment.js
 * Cron: every 15 min, 8-14h, Mon-Fri
 */

const { execSync } = require("child_process");

// ─── Config ──────────────────────────────────────────────────────────────────
const SEARCH_QUERIES = [
  "$HIMS",
  "HIMS stock",
  '"Hims" OR "Hims & Hers"',
];
const TWEET_COUNT = 50; // per query — ~150 total before dedup

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreTweet(text) {
  const lower = text.toLowerCase();
  let score = 0;

  for (const word of BULLISH_WORDS) {
    if (lower.includes(word)) score += 1;
  }
  for (const emoji of BULLISH_EMOJI) {
    if (text.includes(emoji)) score += 1;
  }
  for (const word of BEARISH_WORDS) {
    if (lower.includes(word)) score -= 1;
  }
  for (const emoji of BEARISH_EMOJI) {
    if (text.includes(emoji)) score -= 1;
  }

  // Price target detection
  const priceTargetMatch = lower.match(/(?:pt|price target|target)\s*\$?\s*(\d+)/);
  if (priceTargetMatch) {
    const pt = parseInt(priceTargetMatch[1], 10);
    if (pt > 60) score += 2;  // bullish if high target
    if (pt < 30) score -= 2;  // bearish if low target
  }

  return score;
}

function classifyTweet(score) {
  if (score > 0) return "bullish";
  if (score < 0) return "bearish";
  return "neutral";
}

function fetchTweets() {
  const allRaw = [];
  for (const query of SEARCH_QUERIES) {
    try {
      const raw = execSync(
        `source ~/.zshrc 2>/dev/null; bird search '${query}' -n ${TWEET_COUNT} --plain`,
        { encoding: "utf-8", timeout: 30000, shell: "/bin/zsh" }
      );
      allRaw.push(raw);
    } catch (err) {
      console.error(`Failed to fetch tweets for "${query}":`, err.message);
    }
  }
  return allRaw.join("\n\n");
}

function parseTweets(raw) {
  if (!raw.trim()) return [];
  const tweets = raw
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter((t) => t.length > 10);

  // Deduplicate by extracting tweet URL (unique per tweet)
  const seen = new Set();
  const unique = [];
  for (const tweet of tweets) {
    const urlMatch = tweet.match(/url: (https:\/\/x\.com\/\S+)/);
    const key = urlMatch ? urlMatch[1] : tweet.substring(0, 80);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(tweet);
    }
  }
  return unique;
}

function fetchHimsPrice() {
  try {
    // Try Yahoo Finance API for quick price
    const res = execSync(
      `curl -sf 'https://query1.finance.yahoo.com/v8/finance/chart/HIMS?interval=1d&range=1d' -H 'User-Agent: Mozilla/5.0'`,
      { encoding: "utf-8", timeout: 10000 }
    );
    const data = JSON.parse(res);
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price && typeof price === "number") return price;
    return null;
  } catch {
    console.error("Could not fetch HIMS price");
    return null;
  }
}

async function getLastReading() {
  try {
    const raw = execSync(
      `cd /Users/milo/Projects/mission-control && npx convex run --prod himsSentiment:latest '{}'`,
      { encoding: "utf-8", timeout: 15000 }
    );
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function storeReading(reading) {
  const args = JSON.stringify(reading);
  try {
    execSync(
      `cd /Users/milo/Projects/mission-control && npx convex run --prod himsSentiment:store '${args.replace(/'/g, "'\\''")}'`,
      { encoding: "utf-8", timeout: 15000 }
    );
    console.log("Stored reading:", JSON.stringify(reading, null, 2));
  } catch (err) {
    console.error("Failed to store reading:", err.message);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[${new Date().toISOString()}] Running HIMS sentiment analysis...`);

  // 1. Fetch tweets
  const raw = fetchTweets();
  const tweets = parseTweets(raw);
  console.log(`Fetched ${tweets.length} tweets`);

  if (tweets.length === 0) {
    console.log("No tweets found, skipping.");
    return;
  }

  // 2. Score each tweet
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  let bestBullishScore = 0;
  let bestBearishScore = 0;
  let topBullish = "";
  let topBearish = "";

  for (const tweet of tweets) {
    const score = scoreTweet(tweet);
    const classification = classifyTweet(score);

    if (classification === "bullish") {
      bullishCount++;
      if (score > bestBullishScore) {
        bestBullishScore = score;
        topBullish = tweet.substring(0, 200);
      }
    } else if (classification === "bearish") {
      bearishCount++;
      if (score < bestBearishScore) {
        bestBearishScore = score;
        topBearish = tweet.substring(0, 200);
      }
    } else {
      neutralCount++;
    }
  }

  const total = tweets.length;
  const rawScore = total > 0 ? ((bullishCount - bearishCount) / total) * 100 : 0;

  // 3. Smooth with last reading (70% current + 30% last)
  const lastReading = await getLastReading();
  let smoothedScore;
  if (lastReading && typeof lastReading.score === "number") {
    smoothedScore = Math.round(rawScore * 0.7 + lastReading.score * 0.3);
  } else {
    smoothedScore = Math.round(rawScore);
  }
  // Clamp to -100..+100
  smoothedScore = Math.max(-100, Math.min(100, smoothedScore));

  // 4. Fetch price
  const price = fetchHimsPrice();

  // 5. Store
  const reading = {
    score: smoothedScore,
    tweetCount: total,
    bullishCount,
    bearishCount,
    neutralCount,
    checkedAt: Date.now(),
  };
  if (topBullish) reading.topBullish = topBullish;
  if (topBearish) reading.topBearish = topBearish;
  if (price !== null) reading.priceAtCheck = price;

  console.log(`Score: ${smoothedScore} (raw: ${rawScore.toFixed(1)}) | Bull: ${bullishCount} Bear: ${bearishCount} Neutral: ${neutralCount} | Price: ${price ?? "N/A"}`);

  storeReading(reading);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
