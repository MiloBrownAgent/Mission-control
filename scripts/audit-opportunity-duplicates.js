#!/usr/bin/env node

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "https://proper-rat-443.convex.cloud";
const API_BASE = CONVEX_URL.replace(/\/$/, "");
const asJson = process.argv.includes("--json");

async function convexQuery(fn, args = {}) {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ path: fn, args }),
  });
  if (!res.ok) throw new Error(`query ${fn} failed: ${res.status} ${await res.text()}`);
  const payload = await res.json();
  return Object.prototype.hasOwnProperty.call(payload, "value") ? payload.value : payload;
}

function normalizeTicker(ticker) {
  return String(ticker || "").trim().toUpperCase();
}

function ts(opp) {
  return opp.lastRefreshedAt ?? opp.priceUpdatedAt ?? opp.createdAt ?? 0;
}

function statusRank(status) {
  switch (status) {
    case "active": return 4;
    case "hit_target": return 3;
    case "stopped_out": return 2;
    case "expired": return 1;
    default: return 0;
  }
}

function pickCanonical(group) {
  return [...group].sort((a, b) => ts(b) - ts(a) || statusRank(b.status) - statusRank(a.status))[0];
}

async function main() {
  const raw = await convexQuery("investments:listOpportunitiesRaw", {});
  if (!Array.isArray(raw)) {
    throw new Error("investments:listOpportunitiesRaw is not available on the current deployment yet. Deploy Convex first, then rerun this audit.");
  }

  const groups = new Map();
  for (const opportunity of raw) {
    const ticker = normalizeTicker(opportunity.ticker);
    if (!ticker) continue;
    if (!groups.has(ticker)) groups.set(ticker, []);
    groups.get(ticker).push({ ...opportunity, ticker });
  }

  const duplicates = [];
  for (const [ticker, group] of groups.entries()) {
    if (group.length < 2) continue;
    const canonical = pickCanonical(group);
    duplicates.push({
      ticker,
      count: group.length,
      canonicalId: canonical._id,
      canonicalStatus: canonical.status,
      canonicalCreatedAt: canonical.createdAt,
      canonicalLastRefreshedAt: ts(canonical),
      duplicateIds: group.filter((row) => row._id !== canonical._id).map((row) => row._id),
      rows: group.map((row) => ({
        id: row._id,
        status: row.status,
        createdAt: row.createdAt,
        firstSeenAt: row.firstSeenAt,
        lastRefreshedAt: row.lastRefreshedAt,
        priceUpdatedAt: row.priceUpdatedAt,
        emailedAt: row.emailedAt,
      })),
    });
  }

  const report = {
    ok: true,
    totalRows: (raw || []).length,
    uniqueTickers: groups.size,
    duplicateTickerCount: duplicates.length,
    duplicates,
    recommendation: duplicates.length === 0
      ? "No historical duplicate cleanup needed right now."
      : "Historical duplicates exist. Use the canonicalId per ticker for any one-time migration; do not auto-delete blindly.",
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`rows: ${report.totalRows}`);
  console.log(`unique tickers: ${report.uniqueTickers}`);
  console.log(`duplicate tickers: ${report.duplicateTickerCount}`);
  for (const item of duplicates) {
    console.log(`- ${item.ticker}: ${item.count} rows | canonical ${item.canonicalId} (${item.canonicalStatus || "unknown"}) | dupes ${item.duplicateIds.join(", ")}`);
  }
  console.log(report.recommendation);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
