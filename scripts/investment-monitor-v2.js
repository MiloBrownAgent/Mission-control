#!/usr/bin/env node
/**
 * Investment Monitor v2
 * 
 * Comprehensive monitoring for ALL active positions (high_risk + low_risk).
 * Checks price moves, news, short interest, insider activity, and thesis staleness.
 * Creates alerts in Convex and outputs summary for OpenClaw agent to notify via Telegram.
 * 
 * Usage: node investment-monitor-v2.js
 * 
 * Runs every 15 min during market hours via OpenClaw cron.
 */

const CONVEX_URL = "https://proper-rat-443.convex.cloud";

// ─── Alert Thresholds ────────────────────────────────────────────────────────
const THRESHOLDS = {
  // Price alerts
  DAY_DROP_HIGH: -10,          // % drop in a day → high severity
  DAY_DROP_MEDIUM: -5,         // % drop in a day → medium
  DAY_SPIKE_HIGH: 15,          // % spike in a day → medium (could be squeeze or news)
  FROM_ENTRY_CRITICAL: -25,    // % from entry → critical
  FROM_ENTRY_HIGH: -15,        // % from entry → high
  NEAR_52WK_LOW_PCT: 10,      // within X% of 52-week low → medium
  HIT_ANALYST_TARGET: 0.95,   // within 5% of mean analyst target → low

  // News scoring
  NEGATIVE_NEWS_THRESHOLD: 3,  // number of negative articles in 7 days → alert
  
  // Thesis freshness
  THESIS_STALE_DAYS: 30,      // days before thesis is considered stale
  THESIS_VERY_STALE_DAYS: 60, // days before thesis is critically stale

  // Short interest
  SHORT_INTEREST_HIGH: 15,     // % of float → medium alert
  SHORT_INTEREST_CRITICAL: 25, // % of float → high alert
};

// ─── Negative news keywords ──────────────────────────────────────────────────
const NEGATIVE_KEYWORDS = [
  "downgrade", "lawsuit", "investigation", "sec probe", "fraud", "subpoena",
  "class action", "recall", "fda warning", "data breach", "ceo resign",
  "cfo resign", "bankruptcy", "default", "delisted", "dilution", "offering",
  "short seller", "short report", "audit concern", "restatement", "going concern",
  "layoff", "restructuring", "guidance cut", "missed estimate", "revenue miss",
  "earnings miss", "warning letter", "insider selling", "margin call",
];

const POSITIVE_KEYWORDS = [
  "upgrade", "beat estimate", "raised guidance", "partnership", "contract win",
  "fda approval", "buy rating", "price target raised", "insider buying",
  "revenue beat", "earnings beat", "expansion", "acquisition", "merger approved",
  "patent granted", "breakthrough", "record revenue", "buyback",
];

// ─── Convex ──────────────────────────────────────────────────────────────────
async function convexQuery(fn, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: fn, args }),
  });
  if (!res.ok) throw new Error(`Convex query ${fn} failed: ${res.status}`);
  return (await res.json()).value;
}

async function convexMutation(fn, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: fn, args }),
  });
  if (!res.ok) throw new Error(`Convex mutation ${fn} failed: ${res.status}`);
  return (await res.json()).value;
}

// ─── Data Fetchers ───────────────────────────────────────────────────────────

async function fetchPrice(ticker) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      price: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose,
      dayChange: meta.regularMarketPrice - meta.chartPreviousClose,
      dayChangePct: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    };
  } catch { return null; }
}

async function fetchKeyStats(ticker) {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=defaultKeyStatistics,financialData`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const r = data.quoteSummary?.result?.[0];
    return {
      shortPercentOfFloat: r?.defaultKeyStatistics?.shortPercentOfFloat?.raw,
      shortRatio: r?.defaultKeyStatistics?.shortRatio?.raw,
      sharesShort: r?.defaultKeyStatistics?.sharesShort?.raw,
      sharesShortPriorMonth: r?.defaultKeyStatistics?.sharesShortPriorMonth?.raw,
      heldPercentInsiders: r?.defaultKeyStatistics?.heldPercentInsiders?.raw,
      heldPercentInstitutions: r?.defaultKeyStatistics?.heldPercentInstitutions?.raw,
      targetMeanPrice: r?.financialData?.targetMeanPrice?.raw,
      targetHighPrice: r?.financialData?.targetHighPrice?.raw,
      targetLowPrice: r?.financialData?.targetLowPrice?.raw,
      recommendationKey: r?.financialData?.recommendationKey,
      numberOfAnalysts: r?.financialData?.numberOfAnalystOpinions?.raw,
    };
  } catch { return null; }
}

async function fetchRecentNews(ticker) {
  const articles = [];
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  try {
    const res = await fetch(
      `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const xml = await res.text();
      for (const item of xml.split("<item>").slice(1, 16)) {
        const t = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
        const d = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const title = t ? (t[1] || t[2]).replace(/&amp;/g, "&") : null;
        const pubDate = d ? new Date(d[1]) : null;
        if (title && pubDate && pubDate.getTime() > sevenDaysAgo) {
          articles.push({ title, date: pubDate.toISOString() });
        }
      }
    }
  } catch {}
  return articles;
}

// ─── Alert Logic ─────────────────────────────────────────────────────────────

function analyzePosition(position, priceData, keyStats, news) {
  const alerts = [];
  const ticker = position.ticker;

  // ── Price Alerts ──
  if (priceData) {
    const dayPct = priceData.dayChangePct;
    const fromEntry = position.entryPrice
      ? ((priceData.price - position.entryPrice) / position.entryPrice) * 100
      : null;
    const distFromLow = priceData.fiftyTwoWeekLow
      ? ((priceData.price - priceData.fiftyTwoWeekLow) / priceData.fiftyTwoWeekLow) * 100
      : null;

    // Big daily drop
    if (dayPct <= THRESHOLDS.DAY_DROP_HIGH) {
      alerts.push({
        type: "price_alert", severity: "high",
        title: `${ticker} crashed ${dayPct.toFixed(1)}% today`,
        summary: `${ticker} dropped ${dayPct.toFixed(1)}% today to $${priceData.price.toFixed(2)}. Previous close: $${priceData.previousClose.toFixed(2)}. This is a significant single-day move that may require thesis review.`,
      });
    } else if (dayPct <= THRESHOLDS.DAY_DROP_MEDIUM) {
      alerts.push({
        type: "price_alert", severity: "medium",
        title: `${ticker} down ${dayPct.toFixed(1)}% today`,
        summary: `${ticker} fell ${dayPct.toFixed(1)}% to $${priceData.price.toFixed(2)}. Monitor for continuation.`,
      });
    }

    // Big daily spike (could be news-driven)
    if (dayPct >= THRESHOLDS.DAY_SPIKE_HIGH) {
      alerts.push({
        type: "thesis_evolution", severity: "medium",
        title: `${ticker} surged +${dayPct.toFixed(1)}% today`,
        summary: `${ticker} up ${dayPct.toFixed(1)}% to $${priceData.price.toFixed(2)}. Check if this changes the thesis or presents a profit-taking opportunity.`,
      });
    }

    // From entry performance
    if (fromEntry !== null) {
      if (fromEntry <= THRESHOLDS.FROM_ENTRY_CRITICAL) {
        alerts.push({
          type: "thesis_risk", severity: "critical",
          title: `${ticker} down ${fromEntry.toFixed(1)}% from entry — thesis under pressure`,
          summary: `${ticker} is ${fromEntry.toFixed(1)}% below your $${position.entryPrice} entry (now $${priceData.price.toFixed(2)}). Unrealized loss: $${((position.entryPrice - priceData.price) * (position.shares || 0)).toFixed(0)}. Review whether the original thesis still holds.`,
        });
      } else if (fromEntry <= THRESHOLDS.FROM_ENTRY_HIGH) {
        alerts.push({
          type: "thesis_risk", severity: "high",
          title: `${ticker} down ${fromEntry.toFixed(1)}% from entry`,
          summary: `Position is ${fromEntry.toFixed(1)}% underwater at $${priceData.price.toFixed(2)} vs $${position.entryPrice} entry.`,
        });
      }
    }

    // Near 52-week low
    if (distFromLow !== null && distFromLow <= THRESHOLDS.NEAR_52WK_LOW_PCT) {
      alerts.push({
        type: "price_alert", severity: "medium",
        title: `${ticker} within ${distFromLow.toFixed(0)}% of 52-week low`,
        summary: `${ticker} at $${priceData.price.toFixed(2)} is near its 52-week low of $${priceData.fiftyTwoWeekLow.toFixed(2)}. Could be a buying opportunity or a sign of deterioration.`,
      });
    }

    // Near analyst target
    if (keyStats?.targetMeanPrice && priceData.price >= keyStats.targetMeanPrice * THRESHOLDS.HIT_ANALYST_TARGET) {
      alerts.push({
        type: "thesis_evolution", severity: "low",
        title: `${ticker} approaching analyst target ($${keyStats.targetMeanPrice.toFixed(2)})`,
        summary: `${ticker} at $${priceData.price.toFixed(2)} is within 5% of the mean analyst target of $${keyStats.targetMeanPrice.toFixed(2)}. Consider whether to hold for higher targets ($${keyStats.targetHighPrice?.toFixed(2) || "?"}) or take profits.`,
      });
    }
  }

  // ── Short Interest ──
  if (keyStats?.shortPercentOfFloat) {
    const shortPct = keyStats.shortPercentOfFloat * 100;
    if (shortPct >= THRESHOLDS.SHORT_INTEREST_CRITICAL) {
      alerts.push({
        type: "thesis_risk", severity: "high",
        title: `${ticker} short interest at ${shortPct.toFixed(1)}% of float`,
        summary: `${ticker} has ${shortPct.toFixed(1)}% of float sold short (${keyStats.shortRatio?.toFixed(1) || "?"} days to cover). This is extremely elevated and signals institutional bearishness. ${keyStats.sharesShortPriorMonth && keyStats.sharesShort > keyStats.sharesShortPriorMonth ? "Short interest is INCREASING month over month." : ""}`,
      });
    } else if (shortPct >= THRESHOLDS.SHORT_INTEREST_HIGH) {
      alerts.push({
        type: "thesis_risk", severity: "medium",
        title: `${ticker} elevated short interest: ${shortPct.toFixed(1)}%`,
        summary: `Short interest at ${shortPct.toFixed(1)}% of float. Days to cover: ${keyStats.shortRatio?.toFixed(1) || "?"}. Monitor for squeeze potential or further deterioration.`,
      });
    }
  }

  // ── News Analysis ──
  if (news && news.length > 0) {
    let negativeCount = 0;
    let positiveCount = 0;
    const negativeHeadlines = [];
    const positiveHeadlines = [];

    for (const article of news) {
      const lower = article.title.toLowerCase();
      const isNeg = NEGATIVE_KEYWORDS.some(kw => lower.includes(kw));
      const isPos = POSITIVE_KEYWORDS.some(kw => lower.includes(kw));
      if (isNeg) { negativeCount++; negativeHeadlines.push(article.title); }
      if (isPos) { positiveCount++; positiveHeadlines.push(article.title); }
    }

    if (negativeCount >= THRESHOLDS.NEGATIVE_NEWS_THRESHOLD) {
      alerts.push({
        type: "thesis_risk", severity: "high",
        title: `${ticker}: ${negativeCount} negative headlines in 7 days`,
        summary: `Multiple negative news articles detected:\n${negativeHeadlines.slice(0, 3).map(h => `• ${h}`).join("\n")}\n\nThis pattern may indicate thesis deterioration.`,
      });
    } else if (negativeCount >= 1) {
      alerts.push({
        type: "thesis_risk", severity: "low",
        title: `${ticker}: negative news detected`,
        summary: `${negativeCount} concerning headline(s):\n${negativeHeadlines.slice(0, 2).map(h => `• ${h}`).join("\n")}`,
      });
    }

    if (positiveCount >= 2) {
      alerts.push({
        type: "thesis_evolution", severity: "low",
        title: `${ticker}: positive momentum in news`,
        summary: `${positiveCount} bullish headline(s):\n${positiveHeadlines.slice(0, 3).map(h => `• ${h}`).join("\n")}`,
      });
    }
  }

  // ── Thesis Freshness ──
  if (position.thesisGeneratedAt) {
    const daysSinceThesis = (Date.now() - position.thesisGeneratedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceThesis >= THRESHOLDS.THESIS_VERY_STALE_DAYS) {
      alerts.push({
        type: "thesis_evolution", severity: "medium",
        title: `${ticker} thesis is ${Math.round(daysSinceThesis)} days old — needs refresh`,
        summary: `The investment thesis was last generated ${Math.round(daysSinceThesis)} days ago. Market conditions, fundamentals, and catalysts may have changed significantly. Regenerate the thesis.`,
      });
    } else if (daysSinceThesis >= THRESHOLDS.THESIS_STALE_DAYS) {
      alerts.push({
        type: "thesis_evolution", severity: "low",
        title: `${ticker} thesis aging (${Math.round(daysSinceThesis)} days)`,
        summary: `Consider refreshing the thesis to account for recent developments.`,
      });
    }
  }

  return alerts;
}

// ─── Deduplication ───────────────────────────────────────────────────────────

async function getRecentAlerts(ticker) {
  try {
    const alerts = await convexQuery("investments:listAlerts", {});
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return alerts.filter(a => a.ticker === ticker && a.createdAt > oneDayAgo);
  } catch { return []; }
}

function isDuplicate(alert, recentAlerts) {
  return recentAlerts.some(existing =>
    existing.alertType === alert.type &&
    existing.title === alert.title &&
    !existing.acknowledged
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const positions = await convexQuery("investments:listPositions", {});
  const active = positions.filter(p => p.status === "active");

  if (active.length === 0) {
    console.log("No active positions to monitor.");
    process.exit(0);
  }

  console.log(`📡 Monitoring ${active.length} positions (${active.filter(p => p.portfolioType === "high_risk").length} high risk, ${active.filter(p => p.portfolioType === "low_risk").length} low risk)\n`);

  const allNewAlerts = [];
  const summary = [];

  for (const pos of active) {
    // Fetch all data in parallel
    const [priceData, keyStats, news] = await Promise.all([
      fetchPrice(pos.ticker),
      fetchKeyStats(pos.ticker),
      fetchRecentNews(pos.ticker),
    ]);

    // Analyze
    const alerts = analyzePosition(pos, priceData, keyStats, news);
    
    // Price summary line
    const dayPct = priceData?.dayChangePct;
    const fromEntry = pos.entryPrice && priceData
      ? ((priceData.price - pos.entryPrice) / pos.entryPrice * 100).toFixed(1)
      : null;
    const emoji = dayPct > 2 ? "🟢" : dayPct < -2 ? "🔴" : "⚪";
    console.log(`${emoji} ${pos.ticker}: $${priceData?.price?.toFixed(2) || "N/A"} (${dayPct ? (dayPct >= 0 ? "+" : "") + dayPct.toFixed(1) + "%" : "?"} today${fromEntry ? `, ${fromEntry}% from entry` : ""})`);

    // Deduplicate against recent alerts
    const recentAlerts = await getRecentAlerts(pos.ticker);
    const newAlerts = alerts.filter(a => !isDuplicate(a, recentAlerts));

    if (newAlerts.length > 0) {
      console.log(`  ⚠️ ${newAlerts.length} new alert(s):`);
      for (const alert of newAlerts) {
        console.log(`    [${alert.severity.toUpperCase()}] ${alert.title}`);
        
        // Save to Convex
        try {
          await convexMutation("investments:createAlertPublic", {
            positionId: pos._id,
            ticker: pos.ticker,
            alertType: alert.type,
            severity: alert.severity,
            title: alert.title,
            summary: alert.summary,
            sources: [],
            acknowledged: false,
            createdAt: Date.now(),
          });
        } catch (e) {
          console.log(`    ❌ Failed to save alert: ${e.message}`);
        }

        allNewAlerts.push({ ...alert, ticker: pos.ticker });
      }
    }

    // Build summary for high/critical alerts
    for (const alert of newAlerts) {
      if (alert.severity === "high" || alert.severity === "critical") {
        summary.push(`🚨 [${alert.severity.toUpperCase()}] ${alert.title}`);
      }
    }

    // Small delay to avoid hammering Yahoo
    await new Promise(r => setTimeout(r, 300));
  }

  // ── Summary Output ──
  console.log(`\n──────────────────────────────────`);
  console.log(`📊 Monitor complete: ${active.length} positions checked, ${allNewAlerts.length} new alerts`);
  
  if (summary.length > 0) {
    console.log(`\n🚨 HIGH/CRITICAL ALERTS (need Telegram notification):`);
    for (const s of summary) console.log(s);
    
    // Output structured data for the calling agent to send via Telegram
    console.log(`\n--- TELEGRAM_ALERT ---`);
    console.log(JSON.stringify({
      type: "investment_alerts",
      count: summary.length,
      alerts: allNewAlerts.filter(a => a.severity === "high" || a.severity === "critical"),
    }));
    console.log(`--- END_TELEGRAM_ALERT ---`);
  } else {
    console.log(`✅ No high-priority alerts. All positions within normal parameters.`);
  }

  // Also update opportunity prices while we're here
  try {
    const opps = await convexQuery("investments:listAllOpportunitiesTracked", {});
    for (const opp of opps.filter(o => o.status === "active")) {
      const price = await fetchPrice(opp.ticker);
      if (price && opp.priceAtRecommendation) {
        const returnPct = ((price.price - opp.priceAtRecommendation) / opp.priceAtRecommendation * 100);
        await convexMutation("investments:patchOpportunity", {
          id: opp._id,
          currentPrice: price.price,
          returnPct: Math.round(returnPct * 100) / 100,
          priceUpdatedAt: Date.now(),
        });
      }
    }
    console.log(`\n📈 Updated ${opps.filter(o => o.status === "active").length} opportunity prices`);
  } catch (e) {
    console.log(`\n⚠️ Opportunity price update failed: ${e.message}`);
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
