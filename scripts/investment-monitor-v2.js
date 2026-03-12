#!/usr/bin/env node

/**
 * Investment Monitor V2
 * Checks price moves, news, short interest, insider activity, and thesis staleness.
 * Creates alerts in Convex and outputs summary for OpenClaw agent to notify via Telegram.
 */

const CONVEX_URL = "https://proper-rat-443.convex.cloud";
const SITE_URL = process.env.SITE_URL || "https://mc.lookandseen.com";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_THREAD_ID = process.env.TELEGRAM_THREAD_ID ? Number(process.env.TELEGRAM_THREAD_ID) : 6;

// ─── Alert Thresholds ────────────────────────────────────────────────────────
const THRESHOLDS = {
  // Price alerts
  DAY_DROP_HIGH: -10,          // % drop in a day → high severity
  DAY_DROP_MEDIUM: -5,         // % drop in a day → medium
  DAY_SPIKE_HIGH: 10,          // % spike in a day → medium (major upside move must trigger)
  FROM_ENTRY_CRITICAL: -25,    // % from entry → critical
  FROM_ENTRY_HIGH: -15,        // % from entry → high
  NEAR_52WK_LOW_PCT: 10,       // within X% of 52-week low → medium

  // Thesis staleness
  THESIS_STALE_DAYS: 30,       // days before thesis is considered stale
  THESIS_VERY_STALE_DAYS: 60,  // days before thesis is critically stale

  // Short interest
  SHORT_INTEREST_HIGH: 15,     // % of float → medium alert
  SHORT_INTEREST_CRITICAL: 25, // % of float → high alert

  // News sentiment
  NEGATIVE_NEWS_THRESHOLD: 3,  // number of negative articles in 7 days → alert
};

const NEGATIVE_KEYWORDS = [
  "probe", "investigation", "lawsuit", "fraud", "misses", "cut", "warning",
  "downgrade", "recall", "delay", "bankruptcy", "dilution", "secondary",
  "insider selling", "bearish", "collapse", "concern", "slump"
];

const POSITIVE_KEYWORDS = [
  "beats", "surge", "upgrade", "partnership", "contract", "approval",
  "buyback", "acquisition", "raises", "expands", "launches"
];

// ─── Convex Helpers ──────────────────────────────────────────────────────────

async function convexQuery(fn, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ path: fn, args }),
  });
  if (!res.ok) throw new Error(`Convex query ${fn} failed: ${res.status}`);
  return (await res.json()).value;
}

async function convexMutation(fn, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ path: fn, args }),
  });
  if (!res.ok) throw new Error(`Convex mutation ${fn} failed: ${res.status}`);
  return (await res.json()).value;
}

function effectiveStage(position) {
  return position.stage ?? ((position.shares && position.shares > 0 && position.entryPrice && position.entryPrice > 0) ? "portfolio" : "research");
}

function getRefreshReason(position, alerts) {
  const stage = effectiveStage(position);
  const staleThreshold = stage === "portfolio" ? 7 : 14;
  const cooldownHours = stage === "portfolio" ? 12 : 24;
  const nonFinalRetryDays = stage === "portfolio" ? 1 : 2;
  const ageMs = position.thesisGeneratedAt ? (Date.now() - position.thesisGeneratedAt) : Number.POSITIVE_INFINITY;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const thesisStatus = position.thesisStatus || (position.thesis ? "final" : "pending");
  const cooldownElapsed = ageMs >= cooldownMs;

  if (!position.thesis) return "missing thesis";
  if (!cooldownElapsed) return null;

  if (thesisStatus !== "final" && ageDays >= nonFinalRetryDays) {
    return `${thesisStatus} thesis retry (${Math.round(ageDays)}d)`;
  }

  if (alerts.some(a => a.type === "thesis_risk" && (a.severity === "critical" || a.severity === "high"))) {
    return "high-risk alert";
  }

  if (alerts.some(a => a.type === "thesis_evolution" && (a.severity === "medium" || a.severity === "high"))) {
    return "material thesis evolution";
  }

  if (ageDays >= staleThreshold) return `stale thesis (${Math.round(ageDays)}d)`;

  return null;
}

async function requestThesisRefresh(position, reason) {
  const res = await fetch(`${SITE_URL}/api/investments/generate-thesis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      ticker: position.ticker,
      name: position.name,
      positionId: position._id,
      portfolioType: position.portfolioType,
      shares: position.shares,
      entryPrice: position.entryPrice,
      timeHorizon: position.timeHorizon,
      refreshReason: reason,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok && res.status !== 422) throw new Error(`thesis refresh failed: ${res.status}`);
  return data || { status: res.ok ? "ok" : "partial" };
}

// ─── Data Fetchers ───────────────────────────────────────────────────────────

async function fetchPrice(ticker) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice || !meta?.previousClose) return null;

    const price = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const dayChangePct = ((price - previousClose) / previousClose) * 100;

    return {
      price,
      previousClose,
      dayChangePct,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      marketCap: meta.marketCap,
    };
  } catch {
    return null;
  }
}

async function fetchKeyStats(ticker) {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=defaultKeyStatistics,financialData`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const stats = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
    const fin = data?.quoteSummary?.result?.[0]?.financialData;

    return {
      shortPercentOfFloat: stats?.shortPercentOfFloat?.raw,
      shortRatio: stats?.shortRatio?.raw,
      beta: stats?.beta?.raw,
      heldPercentInsiders: stats?.heldPercentInsiders?.raw,
      heldPercentInstitutions: stats?.heldPercentInstitutions?.raw,
      targetMeanPrice: fin?.targetMeanPrice?.raw,
      recommendationKey: fin?.recommendationKey,
    };
  } catch {
    return null;
  }
}

async function fetchRecentNews(ticker) {
  try {
    const res = await fetch(
      `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15_000) }
    );
    if (res.ok) {
      const xml = await res.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]).slice(0, 10);
      return items.map((item) => ({
        title: (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || "").trim(),
        pubDate: item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1],
      }));
    }
  } catch {}
  return [];
}

// ─── Analysis Engine ─────────────────────────────────────────────────────────

function analyzePosition(position, priceData, keyStats, news) {
  const alerts = [];
  const ticker = position.ticker;

  // 1. Price move alerts
  if (priceData) {
    const dayPct = priceData.dayChangePct;

    if (dayPct <= THRESHOLDS.DAY_DROP_HIGH) {
      alerts.push({
        type: "price_alert", severity: "high",
        title: `${ticker} dropped ${dayPct.toFixed(1)}% in one day`,
        summary: `${ticker} dropped ${dayPct.toFixed(1)}% today to $${priceData.price.toFixed(2)}. Previous close: $${priceData.previousClose.toFixed(2)}. This is a significant single-day move that may require thesis review.`,
      });
    } else if (dayPct <= THRESHOLDS.DAY_DROP_MEDIUM) {
      alerts.push({
        type: "price_alert", severity: "medium",
        title: `${ticker} down ${dayPct.toFixed(1)}% today`,
        summary: `${ticker} is down ${dayPct.toFixed(1)}% today. Could be noise, but worth checking for news or market narrative shift.`,
      });
    }

    if (dayPct >= THRESHOLDS.DAY_SPIKE_HIGH) {
      alerts.push({
        type: "thesis_evolution", severity: "medium",
        title: `${ticker} surged ${dayPct.toFixed(1)}% today`,
        summary: `${ticker} up ${dayPct.toFixed(1)}% to $${priceData.price.toFixed(2)}. Check if this changes the thesis or presents a profit-taking opportunity.`,
      });
    }

    if (position.entryPrice && position.entryPrice > 0) {
      const fromEntry = ((priceData.price - position.entryPrice) / position.entryPrice) * 100;
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
          summary: `${ticker} is materially below your entry. Time to check if this is conviction opportunity or thesis break.`,
        });
      }
    }

    if (priceData.fiftyTwoWeekLow) {
      const aboveLowPct = ((priceData.price - priceData.fiftyTwoWeekLow) / priceData.fiftyTwoWeekLow) * 100;
      if (aboveLowPct <= THRESHOLDS.NEAR_52WK_LOW_PCT) {
        alerts.push({
          type: "price_alert", severity: "medium",
          title: `${ticker} near 52-week low`,
          summary: `${ticker} at $${priceData.price.toFixed(2)} is near its 52-week low of $${priceData.fiftyTwoWeekLow.toFixed(2)}. Could be a buying opportunity or a sign of deterioration.`,
        });
      }
    }

    if (position.entryPrice && priceData.price > position.entryPrice * 1.5) {
      alerts.push({
        type: "thesis_evolution", severity: "low",
        title: `${ticker} up >50% from entry`,
        summary: `${ticker} has appreciated significantly from entry. Re-underwrite upside vs. risk from here rather than anchoring to the original thesis.`,
      });
    }
  }

  // 2. Short interest / market structure
  if (keyStats?.shortPercentOfFloat != null) {
    const shortPct = keyStats.shortPercentOfFloat * 100;
    if (shortPct >= THRESHOLDS.SHORT_INTEREST_CRITICAL) {
      alerts.push({
        type: "thesis_risk", severity: "high",
        title: `${ticker} short interest elevated at ${shortPct.toFixed(1)}%`,
        summary: `${ticker} short interest is extremely high. That can create squeeze upside, but also signals market skepticism you should understand.`,
      });
    } else if (shortPct >= THRESHOLDS.SHORT_INTEREST_HIGH) {
      alerts.push({
        type: "thesis_risk", severity: "medium",
        title: `${ticker} short interest notable at ${shortPct.toFixed(1)}%`,
        summary: `${ticker} has meaningful short interest. Worth checking the bear case directly.`,
      });
    }
  }

  // 3. News sentiment scan
  if (news?.length > 0) {
    const negativeHeadlines = [];
    const positiveHeadlines = [];

    for (const article of news) {
      const title = article.title.toLowerCase();
      if (NEGATIVE_KEYWORDS.some(word => title.includes(word))) {
        negativeHeadlines.push(article.title);
      }
      if (POSITIVE_KEYWORDS.some(word => title.includes(word))) {
        positiveHeadlines.push(article.title);
      }
    }

    if (negativeHeadlines.length >= THRESHOLDS.NEGATIVE_NEWS_THRESHOLD) {
      alerts.push({
        type: "thesis_risk", severity: "high",
        title: `${ticker} has cluster of negative headlines`,
        summary: `Multiple negative news articles detected:\n${negativeHeadlines.slice(0, 3).map(h => `• ${h}`).join("\n")}\n\nThis pattern may indicate thesis deterioration.`,
      });
    } else if (negativeHeadlines.length > 0) {
      alerts.push({
        type: "thesis_risk", severity: "low",
        title: `${ticker} has ${negativeHeadlines.length} negative headline(s)`,
        summary: negativeHeadlines.slice(0, 3).join("\n"),
      });
    }

    if (positiveHeadlines.length >= 2) {
      alerts.push({
        type: "thesis_evolution", severity: "low",
        title: `${ticker} has constructive news flow`,
        summary: positiveHeadlines.slice(0, 3).join("\n"),
      });
    }
  }

  // 4. Thesis staleness alerts
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
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return alerts.filter(a => a.ticker === ticker && a.createdAt > oneDayAgo);
  } catch {
    return [];
  }
}

function isDuplicate(alert, recentAlerts) {
  return recentAlerts.some(existing =>
    existing.alertType === alert.type &&
    existing.title === alert.title &&
    existing.severity === alert.severity
  );
}

async function sendTelegramAlert(alerts) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || alerts.length === 0) return { status: "skipped" };

  const lines = [
    `🚨 Investment monitor: ${alerts.length} high-priority alert${alerts.length === 1 ? "" : "s"}`,
    "",
    ...alerts.slice(0, 8).map((alert) => `• ${alert.ticker}: ${alert.title}`),
  ];

  if (alerts.length > 8) {
    lines.push(`• ...and ${alerts.length - 8} more`);
  }

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: lines.join("\n"),
      ...(Number.isFinite(TELEGRAM_THREAD_ID) ? { message_thread_id: TELEGRAM_THREAD_ID } : {}),
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) {
    throw new Error(`telegram send failed: ${res.status} ${data?.description || "unknown error"}`);
  }

  return { status: "sent", messageId: data.result?.message_id };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n📈 Investment Monitor V2");
  console.log("─".repeat(50));

  const positions = await convexQuery("investments:listPositions", {});
  const active = positions.filter(p => p.status === "active");

  if (active.length === 0) {
    console.log("No active positions to monitor.");
    return;
  }

  console.log(`📡 Monitoring ${active.length} positions (${active.filter(p => p.portfolioType === "high_risk").length} high risk, ${active.filter(p => p.portfolioType === "low_risk").length} low risk)\n`);

  const allNewAlerts = [];
  const summary = [];
  const refreshedTheses = [];
  const softFailures = [];

  for (const pos of active) {
    try {
      const [priceData, keyStats, news] = await Promise.all([
        fetchPrice(pos.ticker),
        fetchKeyStats(pos.ticker),
        fetchRecentNews(pos.ticker),
      ]);

      const alerts = analyzePosition(pos, priceData, keyStats, news);

      const dayPct = priceData?.dayChangePct;
      const fromEntry = pos.entryPrice && priceData
        ? ((priceData.price - pos.entryPrice) / pos.entryPrice * 100).toFixed(1)
        : null;
      const emoji = dayPct > 2 ? "🟢" : dayPct < -2 ? "🔴" : "⚪";
      console.log(`${emoji} ${pos.ticker}: $${priceData?.price?.toFixed(2) || "N/A"} (${dayPct ? (dayPct >= 0 ? "+" : "") + dayPct.toFixed(1) + "%" : "?"} today${fromEntry ? `, ${fromEntry}% from entry` : ""})`);

      const recentAlerts = await getRecentAlerts(pos.ticker);
      const newAlerts = alerts.filter(a => !isDuplicate(a, recentAlerts));

      if (newAlerts.length > 0) {
        console.log(`  ⚠️ ${newAlerts.length} new alert(s):`);
        for (const alert of newAlerts) {
          console.log(`    [${alert.severity.toUpperCase()}] ${alert.title}`);

          try {
            await convexMutation("investments:createAlertPublic", {
              positionId: pos._id,
              ticker: pos.ticker,
              alertType: alert.type,
              severity: alert.severity,
              title: alert.title,
              summary: alert.summary,
              sources: [],
            });
          } catch (e) {
            console.log(`    ❌ Failed to save alert: ${e.message}`);
            softFailures.push({ stage: "alert_write", ticker: pos.ticker, message: e.message });
          }

          allNewAlerts.push({ ...alert, ticker: pos.ticker });
        }
      }

      for (const alert of newAlerts) {
        if (alert.severity === "high" || alert.severity === "critical") {
          summary.push(`🚨 [${alert.severity.toUpperCase()}] ${alert.title}`);
        }
      }

      const refreshReason = getRefreshReason(pos, alerts);
      if (refreshReason) {
        try {
          const data = await requestThesisRefresh(pos, refreshReason);
          refreshedTheses.push(`${pos.ticker} (${refreshReason})`);
          console.log(`  🔄 Thesis refresh requested: ${pos.ticker} — ${refreshReason} (${data.status || "ok"})`);
        } catch (e) {
          console.log(`  ❌ Thesis refresh failed for ${pos.ticker}: ${e.message}`);
          softFailures.push({ stage: "thesis_refresh", ticker: pos.ticker, message: e.message });
        }
      }
    } catch (e) {
      console.log(`❌ ${pos.ticker}: monitor failed — ${e.message}`);
      softFailures.push({ stage: "position_monitor", ticker: pos.ticker, message: e.message });
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n──────────────────────────────────`);
  console.log(`📊 Monitor complete: ${active.length} positions checked, ${allNewAlerts.length} new alerts`);

  if (refreshedTheses.length > 0) {
    console.log(`🧠 Thesis refreshes requested: ${refreshedTheses.join(", ")}`);
  }

  if (summary.length > 0) {
    console.log(`\n🚨 HIGH/CRITICAL ALERTS (need Telegram notification):`);
    for (const s of summary) console.log(s);

    const priorityAlerts = allNewAlerts.filter(a => a.severity === "high" || a.severity === "critical");

    console.log(`\n--- TELEGRAM_ALERT ---`);
    console.log(JSON.stringify({
      type: "investment_alerts",
      count: summary.length,
      alerts: priorityAlerts,
    }));
    console.log(`--- END_TELEGRAM_ALERT ---`);

    try {
      const telegramResult = await sendTelegramAlert(priorityAlerts);
      if (telegramResult.status === "sent") {
        console.log(`📬 Telegram alert delivered (message ${telegramResult.messageId ?? "ok"})`);
      } else {
        console.log(`📭 Telegram alert delivery skipped (missing config)`);
      }
    } catch (e) {
      console.log(`❌ Telegram alert delivery failed: ${e.message}`);
      softFailures.push({ stage: "telegram_alert", ticker: null, message: e.message });
    }
  } else {
    console.log(`✅ No high-priority alerts. All positions within normal parameters.`);
  }

  try {
    const opps = await convexQuery("investments:listAllOpportunitiesTracked", {});
    let updatedOpportunityCount = 0;
    for (const opp of opps.filter(o => o.status === "active")) {
      try {
        const price = await fetchPrice(opp.ticker);
        if (price && opp.priceAtRecommendation) {
          const returnPct = ((price.price - opp.priceAtRecommendation) / opp.priceAtRecommendation * 100);
          await convexMutation("investments:patchOpportunity", {
            id: opp._id,
            currentPrice: price.price,
            returnPct: Math.round(returnPct * 100) / 100,
            priceUpdatedAt: Date.now(),
          });
          updatedOpportunityCount += 1;
        }
      } catch (e) {
        console.log(`  ⚠️ Opportunity update failed for ${opp.ticker}: ${e.message}`);
        softFailures.push({ stage: "opportunity_update", ticker: opp.ticker, message: e.message });
      }
    }
    console.log(`\n📈 Updated ${updatedOpportunityCount} opportunity prices`);
  } catch (e) {
    console.log(`\n⚠️ Opportunity price update failed: ${e.message}`);
    softFailures.push({ stage: "opportunity_update", ticker: null, message: e.message });
  }

  if (softFailures.length > 0) {
    console.log(`\n⚠️ Monitor completed with ${softFailures.length} partial failure(s)`);
    console.log(JSON.stringify({ type: "investment_monitor_partial_failures", failures: softFailures }, null, 2));
    process.exitCode = 1;
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
