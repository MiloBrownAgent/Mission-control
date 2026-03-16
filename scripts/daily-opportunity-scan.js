#!/usr/bin/env node

const CONVEX_URL = "https://proper-rat-443.convex.cloud";
const TZ = "America/Chicago";
const MAX_PICKS = 3;
const EXCLUDED = new Set(["PLTR", "META"]);
const DRY_RUN = process.argv.includes("--dry-run");

const FALLBACKS = [
  {
    ticker: "RKLB",
    name: "Rocket Lab USA",
    description: "Rocket Lab designs and manufactures small and medium-lift launch vehicles and spacecraft. The company provides end-to-end space solutions including satellite components, flight software, and on-orbit management. (Industrials — Aerospace & Defense)",
    opportunityType: "secular_growth",
    expectedUpside: "50-100% (12-24 months)",
    catalysts: [
      "Neutron first launch execution",
      "Higher Electron cadence and defense launches",
      "Space systems revenue mix shift"
    ],
    risks: [
      "Neutron delays",
      "SpaceX pricing pressure",
      "Capital intensity"
    ],
    timeHorizon: "12-24 months",
    moralScreenPass: true,
    sources: [
      { title: "Rocket Lab Investor Relations", url: "https://www.rocketlabusa.com/investors/" },
      { title: "Yahoo Finance: RKLB", url: "https://finance.yahoo.com/quote/RKLB/" },
      { title: "Reuters: Rocket Lab USA", url: "https://www.reuters.com/markets/companies/RKLB.OQ/" }
    ],
    thesis: "Rocket Lab remains one of the cleanest asymmetric space infrastructure names. The Neutron launch program is the unlock for a larger valuation rerating, while the existing components and launch business keep the story from being pure vapor. If execution holds, the market still underestimates how strategically important a credible non-SpaceX launch and space systems platform could become."
  },
  {
    ticker: "SOFI",
    name: "SoFi Technologies",
    description: "SoFi Technologies operates a digital financial services platform offering lending, banking, investing, and financial planning. It also runs Galileo, a fintech infrastructure platform powering other financial apps. (Financial Services — Financial Conglomerates)",
    opportunityType: "growth_inflection",
    expectedUpside: "40-70% (6-12 months)",
    catalysts: [
      "Sustained GAAP profitability",
      "Galileo / Technisys growth",
      "Further student loan refi momentum"
    ],
    risks: [
      "Credit deterioration",
      "Rate sensitivity",
      "Banking regulation changes"
    ],
    timeHorizon: "6-12 months",
    moralScreenPass: true,
    sources: [
      { title: "SoFi Investor Relations", url: "https://investors.sofi.com/" },
      { title: "Yahoo Finance: SOFI", url: "https://finance.yahoo.com/quote/SOFI/" },
      { title: "Reuters: SoFi", url: "https://www.reuters.com/markets/companies/SOFI.OQ/" }
    ],
    thesis: "SoFi is still a profitable-fintech rerating story, not a broken lender. The setup remains attractive because the market has not fully priced the durability of deposits, platform revenue, and cross-sell. If management keeps stacking profitable quarters, the multiple can expand again without requiring heroic assumptions."
  },
  {
    ticker: "NVO",
    name: "Novo Nordisk",
    description: "Novo Nordisk is a global healthcare company specializing in diabetes care, obesity treatment, and rare disease therapies. It manufactures insulin, GLP-1 receptor agonists (Ozempic, Wegovy), and hemophilia products. (Healthcare — Drug Manufacturers)",
    opportunityType: "catalyst_pullback",
    expectedUpside: "50-80% (12-18 months)",
    catalysts: [
      "Volume response to GLP-1 pricing reset",
      "Broader distribution including telehealth channels",
      "Pipeline readouts restoring confidence"
    ],
    risks: [
      "Margin compression",
      "Lilly competition",
      "Regulatory pressure on telehealth prescribing"
    ],
    timeHorizon: "12-18 months",
    moralScreenPass: true,
    sources: [
      { title: "Yahoo Finance: NVO", url: "https://finance.yahoo.com/quote/NVO/" },
      { title: "Reuters: Novo Nordisk", url: "https://www.reuters.com/markets/companies/NVO/" },
      { title: "Novo Nordisk Investor Relations", url: "https://www.novonordisk.com/investors.html" }
    ],
    thesis: "Novo still looks mispriced versus the durability of obesity demand and the company’s distribution power. The market is over-fixated on near-term pricing and underestimating what a broader GLP-1 footprint can do for volumes. This is still a high-quality compounder trading like the thesis is already broken."
  }
];

async function convex(kind, path, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ path, args }),
  });
  if (!res.ok) throw new Error(`${kind} ${path} failed: ${res.status}`);
  const payload = await res.json();
  return Object.prototype.hasOwnProperty.call(payload, "value") ? payload.value : payload;
}

const query = (path, args) => convex("query", path, args);
const mutation = (path, args) => convex("mutation", path, args);

function chicagoDateKey(ts = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

async function fetchPrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Price fetch failed for ${ticker}: ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta?.regularMarketPrice) throw new Error(`Price missing for ${ticker}`);
  return Number(meta.regularMarketPrice);
}

function normalizeTicker(ticker) {
  return String(ticker || "").trim().toUpperCase();
}

function uniqueLatestByTicker(opportunities) {
  const seen = new Set();
  const unique = [];
  for (const opp of opportunities || []) {
    const ticker = normalizeTicker(opp.ticker);
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    unique.push({ ...opp, ticker });
  }
  return unique;
}

function buildUpsertPayload(template, now, livePrice) {
  const priceAtRecommendation = template.priceAtRecommendation ?? template.currentPrice ?? livePrice;
  const returnPct = priceAtRecommendation
    ? Math.round((((livePrice - priceAtRecommendation) / priceAtRecommendation) * 100) * 100) / 100
    : undefined;

  return {
    ticker: normalizeTicker(template.ticker),
    name: template.name,
    description: template.description,
    opportunityType: template.opportunityType,
    thesis: template.thesis,
    sources: (template.sources || []).slice(0, 5),
    expectedUpside: template.expectedUpside,
    catalysts: template.catalysts,
    risks: template.risks,
    timeHorizon: template.timeHorizon,
    moralScreenPass: template.moralScreenPass !== false,
    priceAtRecommendation,
    currentPrice: livePrice,
    priceUpdatedAt: now,
    returnPct,
    status: template.status || "active",
  };
}

async function upsertOpportunity(template, now) {
  const livePrice = await fetchPrice(template.ticker);
  const payload = buildUpsertPayload(template, now, livePrice);

  if (DRY_RUN) {
    return {
      id: template._id || null,
      ...payload,
      dryRun: true,
    };
  }

  const id = await mutation("investments:createOpportunityPublic", payload);
  return { id, ...payload };
}

async function settleUpserts(templates, now, kind) {
  const successes = [];
  const failures = [];

  for (const template of templates) {
    try {
      successes.push(await upsertOpportunity(template, now));
    } catch (error) {
      failures.push({
        kind,
        ticker: normalizeTicker(template.ticker),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { successes, failures };
}

async function main() {
  const now = Date.now();
  const todayKey = chicagoDateKey(now);
  const existing = uniqueLatestByTicker(await query("investments:listAllOpportunitiesTracked", {}));

  const activeExisting = existing.filter((opp) => (
    opp.status !== "expired" &&
    !EXCLUDED.has(normalizeTicker(opp.ticker)) &&
    opp.moralScreenPass !== false
  ));

  const existingByTicker = new Map(activeExisting.map((opp) => [normalizeTicker(opp.ticker), opp]));

  const { successes: refreshResults, failures: refreshFailures } = await settleUpserts(activeExisting, now, "refresh");

  const newCandidates = FALLBACKS
    .filter((candidate) => !EXCLUDED.has(normalizeTicker(candidate.ticker)))
    .filter((candidate) => !existingByTicker.has(normalizeTicker(candidate.ticker)))
    .slice(0, MAX_PICKS);

  const { successes: newResults, failures: newFailures } = await settleUpserts(newCandidates, now, "new");
  const failures = [...refreshFailures, ...newFailures];

  if (refreshResults.length === 0 && newResults.length === 0) {
    throw new Error(`Opportunity scan produced no successful upserts${failures.length ? `; failures: ${failures.map((f) => `${f.ticker} (${f.message})`).join(", ")}` : ""}`);
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun: DRY_RUN,
    date: todayKey,
    refreshedExisting: refreshResults.length,
    surfacedNew: newResults.length,
    skippedBecauseAlreadyKnown: FALLBACKS
      .map((candidate) => normalizeTicker(candidate.ticker))
      .filter((ticker) => existingByTicker.has(ticker)),
    refreshedTickers: refreshResults.map((r) => r.ticker),
    newTickers: newResults.map((r) => r.ticker),
    failures,
    refreshResults,
    newResults,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
