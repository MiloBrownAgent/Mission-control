#!/usr/bin/env node

const CONVEX_URL = "https://proper-rat-443.convex.cloud";
const TZ = "America/Chicago";
const MAX_PICKS = 3;
const EXCLUDED = new Set(["PLTR", "META"]);

const FALLBACKS = [
  {
    ticker: "RKLB",
    name: "Rocket Lab USA",
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
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Price fetch failed for ${ticker}: ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta?.regularMarketPrice) throw new Error(`Price missing for ${ticker}`);
  return Number(meta.regularMarketPrice);
}

function uniqueLatestByTicker(opps) {
  const seen = new Set();
  const list = [];
  for (const opp of opps) {
    if (seen.has(opp.ticker)) continue;
    seen.add(opp.ticker);
    list.push(opp);
  }
  return list;
}

async function main() {
  const now = Date.now();
  const todayKey = chicagoDateKey(now);
  const existing = await query("investments:listAllOpportunitiesTracked", {});

  const todays = existing.filter((opp) => chicagoDateKey(opp.createdAt) === todayKey);
  const activeTemplates = uniqueLatestByTicker(
    existing.filter((opp) => opp.status !== "expired" && !EXCLUDED.has(opp.ticker) && opp.moralScreenPass !== false)
  );

  const templates = (activeTemplates.length >= MAX_PICKS ? activeTemplates.slice(0, MAX_PICKS) : [
    ...activeTemplates,
    ...FALLBACKS.filter((candidate) => !activeTemplates.some((opp) => opp.ticker === candidate.ticker)),
  ].slice(0, MAX_PICKS));

  if (templates.length === 0) throw new Error("No opportunity templates available");

  const results = [];
  for (const template of templates) {
    const livePrice = await fetchPrice(template.ticker);
    const priceAtRecommendation = template.priceAtRecommendation ?? template.currentPrice ?? livePrice;
    const returnPct = priceAtRecommendation
      ? Math.round((((livePrice - priceAtRecommendation) / priceAtRecommendation) * 100) * 100) / 100
      : undefined;

    const id = await mutation("investments:createOpportunityPublic", {
      ticker: template.ticker,
      name: template.name,
      opportunityType: template.opportunityType,
      thesis: template.thesis,
      sources: (template.sources || []).slice(0, 5),
      expectedUpside: template.expectedUpside,
      catalysts: template.catalysts,
      risks: template.risks,
      timeHorizon: template.timeHorizon,
      moralScreenPass: template.moralScreenPass !== false,
      createdAt: now,
      priceAtRecommendation,
      currentPrice: livePrice,
      priceUpdatedAt: now,
      returnPct,
      status: template.status || "active",
    });

    results.push({
      id,
      ticker: template.ticker,
      name: template.name,
      currentPrice: livePrice,
      priceAtRecommendation,
      returnPct,
      reusedTemplate: Boolean(template._id),
      alreadyExistedToday: todays.some((opp) => opp.ticker === template.ticker),
    });
  }

  console.log(JSON.stringify({
    ok: true,
    date: todayKey,
    createdOrUpdated: results.length,
    tickers: results.map((r) => r.ticker),
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
