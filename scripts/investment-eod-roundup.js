#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "https://proper-rat-443.convex.cloud";
const API_BASE = CONVEX_URL.replace(/\/$/, "");

async function convexCall(kind, fn, args = {}) {
  const res = await fetch(`${API_BASE}/api/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ path: fn, args }),
  });
  if (!res.ok) throw new Error(`${kind} ${fn} failed: ${res.status} ${await res.text()}`);
  const payload = await res.json();
  return Object.prototype.hasOwnProperty.call(payload, "value") ? payload.value : payload;
}

const query = (fn, args) => convexCall("query", fn, args);
const mutation = (fn, args) => convexCall("mutation", fn, args);

function chicagoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function effectiveStage(position) {
  return position.stage ?? ((position.shares && position.shares > 0 && position.entryPrice && position.entryPrice > 0) ? "portfolio" : "research");
}

async function main() {
  const date = chicagoDate();
  const [positions, alerts, opportunities] = await Promise.all([
    query("investments:listPositions", {}),
    query("investments:listAlerts", { limit: 50 }),
    query("investments:listOpportunities", { limit: 20 }),
  ]);

  const activePositions = (positions || []).filter((p) => p.status === "active");
  const partialTheses = activePositions.filter((p) => p.thesisStatus === "partial");
  const missingTheses = activePositions.filter((p) => !p.thesis);
  const portfolio = activePositions.filter((p) => effectiveStage(p) === "portfolio");
  const research = activePositions.filter((p) => effectiveStage(p) === "research");
  const criticalAlerts = (alerts || []).filter((a) => a.severity === "critical" || a.severity === "high");
  const activeOpportunities = (opportunities || []).filter((o) => o.status === "active");

  const roundup = {
    date,
    generatedAt: new Date().toISOString(),
    summary: {
      activePositions: activePositions.length,
      portfolio: portfolio.length,
      research: research.length,
      partialTheses: partialTheses.length,
      missingTheses: missingTheses.length,
      highOrCriticalAlerts: criticalAlerts.length,
      activeOpportunities: activeOpportunities.length,
    },
    partialThesisTickers: partialTheses.map((p) => ({
      ticker: p.ticker,
      issues: p.thesisValidationIssues || [],
    })),
    highPriorityAlerts: criticalAlerts.slice(0, 10).map((a) => ({
      ticker: a.ticker,
      severity: a.severity,
      title: a.title,
      summary: a.summary,
    })),
    topOpportunities: activeOpportunities.slice(0, 10).map((o) => ({
      ticker: o.ticker,
      name: o.name,
      opportunityType: o.opportunityType,
      expectedUpside: o.expectedUpside,
      createdAt: o.createdAt,
    })),
  };

  const logsDir = path.join(process.cwd(), "logs");
  await fs.mkdir(logsDir, { recursive: true });
  const filePath = path.join(logsDir, `investment-eod-roundup-${date}.json`);
  await fs.writeFile(filePath, JSON.stringify(roundup, null, 2));

  await mutation("activityLog:add", {
    message: `Investment EOD roundup saved — ${activePositions.length} active positions, ${partialTheses.length} partial theses, ${activeOpportunities.length} active opportunities`,
    type: partialTheses.length > 0 || missingTheses.length > 0 ? "warning" : "success",
    category: "cron",
  });

  console.log(JSON.stringify({ ok: true, filePath, summary: roundup.summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
