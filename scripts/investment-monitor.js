#!/usr/bin/env node
/**
 * Investment Monitor
 * 
 * Checks all active positions for:
 * - Price changes (significant moves)
 * - News that could impact thesis
 * 
 * Outputs structured data for OpenClaw cron to analyze and create alerts.
 * 
 * Usage: node investment-monitor.js
 */

const CONVEX_URL = "https://proper-rat-443.convex.cloud";

async function convexQuery(functionPath, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: functionPath, args }),
  });
  if (!res.ok) throw new Error(`Convex query failed: ${res.status}`);
  const data = await res.json();
  return data.value;
}

async function fetchYahooFinance(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`;
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
      dayChange: meta.regularMarketPrice - meta.chartPreviousClose,
      dayChangePct: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100).toFixed(2),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    };
  } catch (e) {
    return null;
  }
}

async function main() {
  const positions = await convexQuery("investments:listPositions", {});
  const active = positions.filter(p => p.status === "active");

  if (active.length === 0) {
    console.log("No active positions to monitor.");
    process.exit(0);
  }

  console.log(`📡 Monitoring ${active.length} active positions...\n`);

  const results = [];

  for (const pos of active) {
    const priceData = await fetchYahooFinance(pos.ticker);
    
    const result = {
      ticker: pos.ticker,
      name: pos.name,
      id: pos._id,
      portfolioType: pos.portfolioType,
      thesis: pos.thesis?.substring(0, 500),
      priceData,
      entryPrice: pos.entryPrice,
      shares: pos.shares,
    };

    if (priceData && pos.entryPrice) {
      result.totalReturn = ((priceData.price - pos.entryPrice) / pos.entryPrice * 100).toFixed(2);
      if (pos.shares) {
        result.currentValue = (priceData.price * pos.shares).toFixed(2);
        result.costBasis = (pos.entryPrice * pos.shares).toFixed(2);
        result.unrealizedPnL = ((priceData.price - pos.entryPrice) * pos.shares).toFixed(2);
      }
    }

    results.push(result);
    console.log(`${pos.ticker}: $${priceData?.price ?? 'N/A'} (${priceData?.dayChangePct ?? '?'}% today)${result.totalReturn ? ` | ${result.totalReturn}% from entry` : ''}`);
  }

  // Output full data for OpenClaw cron analysis
  console.log("\n📊 Full monitoring data:");
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
