#!/usr/bin/env node

const CONVEX_URL = "https://proper-rat-443.convex.cloud";
const SITE_URL = process.env.SITE_URL || "https://mc.lookandseen.com";

async function convexQuery(fn, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ path: fn, args }),
  });
  if (!res.ok) throw new Error(`Convex query ${fn} failed: ${res.status}`);
  return (await res.json()).value;
}

async function requestThesisRefresh(position, reason, dryRun = false) {
  if (dryRun) return { status: "dry-run" };
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
  if (!res.ok && res.status !== 422) {
    throw new Error(`Refresh failed for ${position.ticker}: ${res.status} ${JSON.stringify(data)}`);
  }
  return data || { status: res.ok ? "ok" : "partial" };
}

function effectiveStage(position) {
  return position.stage ?? ((position.shares && position.shares > 0 && position.entryPrice && position.entryPrice > 0) ? "portfolio" : "research");
}

function getCandidateReason(position, force = false) {
  if (force) return "manual force refresh";

  if (!position.thesis) return "missing thesis";

  const stage = effectiveStage(position);
  const ageDays = position.thesisGeneratedAt
    ? (Date.now() - position.thesisGeneratedAt) / (1000 * 60 * 60 * 24)
    : Number.POSITIVE_INFINITY;
  const thesisStatus = position.thesisStatus || (position.thesis ? "final" : "pending");
  const nonFinalRetryDays = stage === "portfolio" ? 1 : 2;

  if (thesisStatus !== "final" && ageDays >= nonFinalRetryDays) {
    return `${stage} ${thesisStatus} thesis retry (${Math.round(ageDays)}d)`;
  }

  if (stage === "portfolio" && ageDays >= 7) return `portfolio thesis stale (${Math.round(ageDays)}d)`;
  if (stage === "research" && ageDays >= 14) return `research thesis stale (${Math.round(ageDays)}d)`;

  return null;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const force = args.has("--force");
  const tickers = process.argv.slice(2).filter((arg) => !arg.startsWith("--")).map((s) => s.toUpperCase());

  const positions = await convexQuery("investments:listPositions", {});
  const active = positions.filter((p) => p.status === "active");
  const filtered = tickers.length > 0 ? active.filter((p) => tickers.includes(p.ticker)) : active;

  const candidates = filtered
    .map((position) => ({ position, reason: getCandidateReason(position, force) }))
    .filter((item) => Boolean(item.reason));

  if (candidates.length === 0) {
    console.log(JSON.stringify({ ok: true, dryRun, refreshed: 0, failed: 0, message: "No thesis refresh candidates" }, null, 2));
    return;
  }

  const results = [];
  const failures = [];
  for (const { position, reason } of candidates) {
    try {
      const data = await requestThesisRefresh(position, reason, dryRun);
      results.push({ ticker: position.ticker, reason, status: data.status || "ok" });
    } catch (error) {
      failures.push({
        ticker: position.ticker,
        reason,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const ok = failures.length === 0;
  console.log(JSON.stringify({ ok, dryRun, refreshed: results.length, failed: failures.length, results, failures }, null, 2));
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
