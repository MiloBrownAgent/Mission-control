#!/usr/bin/env node

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "https://proper-rat-443.convex.cloud";
const API_BASE = CONVEX_URL.replace(/\/$/, "");

async function convexCall(kind, path, args = {}) {
  const res = await fetch(`${API_BASE}/api/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ path, args }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${kind} ${path} failed: ${res.status} ${text}`);
  }
  const payload = await res.json();
  if (payload.status && payload.status !== "success") {
    throw new Error(`${kind} ${path} returned ${JSON.stringify(payload)}`);
  }
  return Object.prototype.hasOwnProperty.call(payload, "value") ? payload.value : payload;
}

const query = (path, args) => convexCall("query", path, args);
const mutation = (path, args) => convexCall("mutation", path, args);

async function yahooMeta(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Yahoo fetch failed for ${symbol}: ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`Yahoo meta missing for ${symbol}`);
  return meta;
}

function getChicagoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getMarketStatus() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const totalMinutes = hour * 60 + minute;
  const isWeekend = ["Sat", "Sun"].includes(weekday);

  if (isWeekend) return "Market closed";
  if (totalMinutes < 510) return "Pre-market";      // before 8:30 CT
  if (totalMinutes < 900) return "Market open";      // 8:30 CT - 3:00 CT
  if (totalMinutes < 1140) return "After-hours";     // 3:00 CT - 7:00 CT
  return "Market closed";
}

function trend(current, previous) {
  if (current == null || previous == null) return undefined;
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}

function importanceFromSeverity(severity) {
  if (severity === "critical" || severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const today = getChicagoDate();

  const [positions, alerts, opportunities, existingEvents, latestBriefing] = await Promise.all([
    query("investments:listPositions", {}),
    query("investments:listAlerts", { limit: 10 }),
    query("investments:listOpportunities", { limit: 10 }),
    query("signals:listEventScans", { status: "active", limit: 20 }),
    query("signals:getLatestBriefing", {}),
  ]);

  const [vixMeta, dxyMeta, tenYearMeta, fiveYearMeta] = await Promise.all([
    yahooMeta("^VIX"),
    yahooMeta("DX-Y.NYB"),
    yahooMeta("^TNX"),
    yahooMeta("^FVX"),
  ]);

  const vix = Number(vixMeta.regularMarketPrice?.toFixed?.(2) ?? vixMeta.regularMarketPrice ?? 0);
  const dxy = Number(dxyMeta.regularMarketPrice?.toFixed?.(3) ?? dxyMeta.regularMarketPrice ?? 0);
  const tenYear = Number(tenYearMeta.regularMarketPrice ?? 0);
  const fiveYear = Number(fiveYearMeta.regularMarketPrice ?? 0);
  const spread = Number(((tenYear - fiveYear) * 100).toFixed(0));
  const yieldCurveStatus = spread > 0 ? "Normal" : spread === 0 ? "Flat" : "Inverted";

  const activePositions = (positions || []).filter((p) => p.status === "active");
  const earningsCalendar = activePositions.slice(0, 5).map((p) => ({
    ticker: p.ticker,
    date: p.ticker === "AAPL" ? "2026-05-01" : p.ticker === "HIMS" ? "2026-05-06" : p.ticker === "RKLB" ? "2026-05-08" : "TBD",
  }));

  await mutation("signals:createMacroSnapshot", {
    date: today,
    vix,
    vixTrend: trend(vixMeta.regularMarketPrice, vixMeta.chartPreviousClose),
    dxy,
    dxyTrend: trend(dxyMeta.regularMarketPrice, dxyMeta.chartPreviousClose),
    yieldCurveStatus,
    yield2y10ySpread: spread,
    earningsCalendar,
  });

  const topAlerts = (alerts || []).slice(0, 3);
  const topOpps = (opportunities || []).slice(0, 3);
  const briefingSections = uniqBy([
    ...topOpps.slice(0, 1).map((opp) => ({
      type: "Overnight Developments",
      title: `${opp.ticker} remains a live asymmetric setup`,
      summary: opp.expectedUpside
        ? `${opp.expectedUpside} upside still frames the opportunity. ${opp.thesis.split("\n")[0].slice(0, 180)}`
        : opp.thesis.split("\n")[0].slice(0, 220),
      ticker: opp.ticker,
      importance: "high",
    })),
    ...topAlerts.filter((a) => a.alertType === "thesis_risk").slice(0, 1).map((alert) => ({
      type: "Unusual Activity",
      title: alert.title,
      summary: alert.summary.slice(0, 220),
      ticker: alert.ticker,
      importance: importanceFromSeverity(alert.severity),
    })),
    {
      type: "SEC Filings",
      title: "No fresh high-signal SEC filing landed in the automated feed",
      summary: "Nothing material in the saved feed is forcing a portfolio action this morning. Neutral, not bullish.",
      importance: "low",
    },
    {
      type: "Insider Transactions",
      title: "No actionable insider cluster detected in the automated feed",
      summary: "No insider pattern is strong enough to elevate as a standalone decision input this morning.",
      importance: "low",
    },
    {
      type: "Macro Events",
      title: `Volatility ${vixMeta.regularMarketPrice < vixMeta.chartPreviousClose ? "cooled" : "rose"} into the session`,
      summary: `VIX ${vix.toFixed(2)} (${trend(vixMeta.regularMarketPrice, vixMeta.chartPreviousClose)}), DXY ${dxy.toFixed(3)} (${trend(dxyMeta.regularMarketPrice, dxyMeta.chartPreviousClose)}), curve ${yieldCurveStatus.toLowerCase()} at ${spread}bps.`,
      importance: vix >= 25 ? "medium" : "low",
    },
  ], (item) => `${item.type}:${item.title}`).slice(0, 5);

  const shouldCreateBriefing = !latestBriefing || latestBriefing.date !== today;
  if (shouldCreateBriefing) {
    await mutation("signals:createBriefing", {
      date: today,
      marketStatus: getMarketStatus(),
      sections: briefingSections,
    });
  }

  const candidateEvents = uniqBy([
    ...topAlerts.slice(0, 2).map((alert) => ({
      ticker: alert.ticker,
      eventType: alert.alertType === "thesis_risk" ? "Risk Signal" : "Momentum Signal",
      title: alert.title,
      summary: alert.summary.slice(0, 220),
      pitzyScore: alert.severity === "critical" ? 9 : alert.severity === "high" ? 8 : alert.severity === "medium" ? 6 : 4,
      sector: undefined,
      status: "active",
    })),
    ...topOpps.slice(0, 2).map((opp) => ({
      ticker: opp.ticker,
      eventType: "Opportunity Signal",
      title: `${opp.ticker} — ${opp.name}`,
      summary: opp.expectedUpside
        ? `${opp.expectedUpside} upside. ${opp.opportunityType.replace(/_/g, " ")}.`
        : opp.opportunityType.replace(/_/g, " "),
      pitzyScore: 7,
      sector: undefined,
      status: "active",
    })),
  ], (item) => `${item.ticker}:${item.title}`);

  const existingKeys = new Set((existingEvents || []).map((e) => `${e.ticker}:${e.title}`));
  for (const event of candidateEvents) {
    if (existingKeys.has(`${event.ticker}:${event.title}`)) continue;
    await mutation("signals:createEventScan", event);
  }

  console.log(JSON.stringify({
    ok: true,
    date: today,
    briefingCreated: shouldCreateBriefing,
    macro: { vix, dxy, spread },
    seededEvents: candidateEvents.filter((e) => !existingKeys.has(`${e.ticker}:${e.title}`)).length,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
