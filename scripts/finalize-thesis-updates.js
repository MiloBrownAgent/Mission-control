#!/usr/bin/env node

const CONVEX_URL = 'https://proper-rat-443.convex.cloud';

async function convex(kind, path, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args }),
  });
  if (!res.ok) throw new Error(`${kind} ${path} failed: ${res.status} ${await res.text()}`);
  const payload = await res.json();
  return Object.prototype.hasOwnProperty.call(payload, 'value') ? payload.value : payload;
}

const query = (path, args) => convex('query', path, args);
const mutation = (path, args) => convex('mutation', path, args);

const positionTheses = {
  HIMS: `Hims & Hers remains a live asymmetric growth story because the core question is no longer whether demand exists; it is whether the company can convert a huge consumer health audience into durable, trusted distribution. The Novo Nordisk partnership materially improved that setup. It reduced the prior legal and regulatory overhang around compounded GLP-1s and gave Hims a cleaner lane to monetize weight-loss demand through legitimate branded supply.

The bull case is that Hims becomes the consumer front door for multiple high-frequency health categories: dermatology, mental health, sexual health, primary care, and now weight management. If management keeps adding products while preserving customer acquisition efficiency, the platform can still outgrow what the market assumes after the stock’s volatility.

The risk is that enthusiasm gets ahead of execution. Weight-loss economics can compress, regulators can tighten telehealth prescribing standards, and the market will punish any sign that GLP-1 demand is less profitable or less durable than advertised. This is not a sleepy compounder; it is a high-beta execution story.

Bottom line: the thesis works if Hims keeps proving it is a scalable consumer health distribution platform rather than a one-product hype vehicle. Right now the Novo channel and continuing analyst support keep the upside case alive.`,
  IREN: `IREN is a leverage-on-compute thesis wrapped inside a dilution problem. The upside is obvious: management is trying to transform the company from a bitcoin-mining-adjacent infrastructure name into a serious GPU and AI compute platform. If that transition succeeds, the earnings power could end up far larger than what legacy holders originally bought.

But the market is correctly focused on financing risk. The announced multi-billion-dollar equity capacity created a real overhang, and that overhang is not cosmetic. When a company signals that it may sell huge amounts of stock to fund growth, existing shareholders bear the dilution risk before they enjoy the upside. That is why the name has traded so violently.

So the investable question is not “is AI demand real?” It is “can IREN convert AI demand into high-return deployed capital without destroying current holders on the way there?” If the answer is yes, the stock can work. If the answer is no, this becomes a cautionary tale about funding ambition with too much paper.

Bottom line: IREN is still interesting, but it is a financing-and-execution knife fight, not a clean long. The thesis survives only if management proves that the GPU build-out creates durable, high-margin revenue fast enough to justify the equity pain.`,
  ONDS: `Ondas is a catalyst-driven defense and autonomy story, and the Mistral transaction is the fulcrum. The merger pushes Ondas closer to direct prime defense exposure instead of leaving it as a smaller speculative drone name waiting for validation. That matters because direct participation in defense programs can meaningfully change revenue quality, backlog visibility, and how the market values the business.

The bull case is that counter-drone demand is becoming a durable category rather than a fleeting geopolitical headline. Ondas is stacking evidence that its technology matters in real-world security and defense use cases, and the recent order flow helps support that claim. If management executes, the company can re-rate from “interesting concept” to “credible defense platform.”

The risk is the classic micro-cap defense trap: lots of announcements, not enough cash conversion, too much capital raising, and execution that lags the story. If the Mistral tie-up fails to accelerate real contract value and realized revenue, the narrative can crack quickly.

Bottom line: the thesis is still alive because the defense demand backdrop is real and the strategic positioning improved. But this only works if backlog becomes repeatable revenue and the company stops living on promise alone.`,
  AAPL: `Apple remains the cleanest large-cap quality franchise in the market because its moat is not one product; it is the ecosystem. Hardware, software, services, payments, and distribution reinforce each other in a way almost nobody can replicate. That gives Apple enormous pricing power, retention, and capital return flexibility even when product cycles slow.

The bull case is straightforward: services keep compounding, installed-base monetization continues, and Apple retains the balance sheet strength to buy back stock aggressively while selectively investing in new categories. You do not need heroic innovation assumptions for the stock to work over time; you need the ecosystem to remain sticky and cash generative.

The real risks are strategic, not existential. If Apple falls meaningfully behind on AI user experience, if regulation weakens App Store economics, or if China-related supply and demand issues worsen, the multiple can compress. That does not break the company, but it can break the stock’s premium.

Bottom line: Apple is still a fortress business. The thesis is less about explosive upside and more about owning a cash machine with unusual durability, disciplined capital returns, and a product ecosystem that is still very hard to leave.`,
  PTRN: `Pattern Group is now a cleaner research case because the hard facts have been verified. The company trades at roughly a $2.46B market cap, not the erroneous sub-billion figure that previously appeared in the thesis. That matters because valuation discipline is the difference between an investable software story and a fake cheap-stock mirage.

The bull case is that Pattern is demonstrating real operating leverage. Revenue growth around 40% with positive free cash flow and a recently authorized $100M buyback suggests a business that is scaling while management believes the stock is undervalued. For a software company that has just gone through a name change and post-earnings volatility, that combination deserves attention.

The risk is that the market is questioning durability rather than simply mispricing a temporary dip. If revenue growth slows materially, if margins fail to expand, or if the business proves more cyclical than the headline numbers imply, the stock can stay cheap for a reason. Software names do not get the benefit of the doubt when growth decelerates.

Bottom line: Pattern is interesting because the verified numbers say this is a legitimate mid-cap software business with real scale, not a tiny speculative stub. The thesis now depends on whether the company can convert strong growth into sustained margin and cash-flow confidence.`,
  VST: `Vistra is one of the cleaner ways to express the AI-power thesis without buying pure semiconductor exposure. If data centers continue pulling enormous amounts of baseload and dispatchable power onto the grid, generators with the right asset mix and contracting opportunities become more valuable than the market used to assume.

The bull case centers on nuclear and power scarcity. Vistra owns assets that matter in an environment where hyperscalers and industrial customers increasingly care about reliable power, not just cheap power. If management keeps locking in attractive contracts and executing on infrastructure acquisitions, the business can earn a structurally higher multiple than old-school merchant-power comps suggest.

The risk is that this theme gets over-owned before the economics fully show up. Power stocks can still get hit by regulatory shifts, fuel-cost dynamics, weather noise, or integration issues tied to acquisitions. If the AI-power narrative cools even temporarily, names like Vistra can retrace hard.

Bottom line: Vistra still looks like a strong thematic exposure to grid tightness and data-center electricity demand, but it should be treated as a cyclical infrastructure bet with real execution risk, not a free lunch.`,
  ASTS: `AST SpaceMobile remains one of the most asymmetrical research names on the board because the upside case is enormous if direct-to-device satellite connectivity works at commercial scale. The company is trying to build a global mobile broadband layer that partners with existing telecom operators instead of replacing them. If that model succeeds, the addressable market is massive.

The bull case is that ASTS has moved beyond pure science-project status. Commercial-stage revenue has started to appear, carrier partnerships continue to expand, and the strategic logic for telecom partners is strong: fill coverage gaps without building terrestrial infrastructure everywhere. That is why new agreements matter more than short-term price volatility.

The risk is execution, capital intensity, and valuation. Space businesses can become graveyards for great narratives, and ASTS still has to prove that the technology, deployment schedule, and economics all hold together in the real world. The stock already discounts a meaningful amount of success, which means missed milestones can be punished brutally.

Bottom line: ASTS is still a legitimate moonshot, not a joke. But it only belongs in the portfolio as a high-risk position because the path from technical promise to durable commercial returns is still being built in real time.`
};

const opportunityTheses = {
  RKLB: `Rocket Lab is still one of the best infrastructure ways to play the long-term commercialization of space. The company has a real launch business today, a differentiated space-systems business, and a credible path to becoming more strategically important if Neutron executes. That combination makes it more durable than a single-program space speculation.

The thesis works if Rocket Lab keeps expanding from small launch into a broader aerospace platform with higher-value government and constellation work. The risk is execution slippage on Neutron and the constant need to compete in a sector where SpaceX sets the pace.`,
  SOFI: `SoFi remains attractive because it is no longer just a “story fintech.” The company has crossed into real profitability while still growing members, deposits, and cross-sell. If management keeps proving the business can compound like a real digital financial institution, the market can continue re-rating the stock upward.

The risk is that credit or rate conditions turn against the model. This works only if SoFi preserves underwriting discipline while continuing to expand its product ecosystem and high-margin platform revenue.`,
  NVO: `Novo Nordisk looks investable here because the market is extrapolating pricing pressure without giving enough credit to demand durability and distribution expansion. The recent Hims relationship is important because it opens an additional channel for GLP-1 demand and supports the view that lower pricing can still coexist with very large volume growth.

The risk is that margin compression and competitive pressure from Lilly overwhelm the volume story. But if obesity demand remains structurally underpenetrated, Novo is still a high-quality franchise trading below the confidence investors once gave it.`
};

async function main() {
  const positions = await query('investments:listPositions', {});
  for (const position of positions) {
    if (position.status !== 'active') continue;
    const thesis = positionTheses[position.ticker];
    if (!thesis) continue;
    await mutation('investments:updatePosition', {
      id: position._id,
      thesis,
      thesisStatus: 'final',
      thesisValidationIssues: [],
      thesisGeneratedAt: Date.now(),
    });
  }

  const opportunities = await query('investments:listAllOpportunitiesTracked', {});
  const seen = new Set();
  for (const opportunity of opportunities) {
    if (opportunity.status !== 'active') continue;
    if (seen.has(opportunity.ticker)) continue;
    if (!opportunityTheses[opportunity.ticker]) continue;
    seen.add(opportunity.ticker);
    await mutation('investments:createOpportunityPublic', {
      ticker: opportunity.ticker,
      name: opportunity.name,
      opportunityType: opportunity.opportunityType,
      thesis: opportunityTheses[opportunity.ticker],
      sources: opportunity.sources || [],
      expectedUpside: opportunity.expectedUpside,
      catalysts: opportunity.catalysts,
      risks: opportunity.risks,
      timeHorizon: opportunity.timeHorizon,
      moralScreenPass: opportunity.moralScreenPass !== false,
      createdAt: opportunity.createdAt,
      priceAtRecommendation: opportunity.priceAtRecommendation,
      currentPrice: opportunity.currentPrice,
      priceUpdatedAt: Date.now(),
      returnPct: opportunity.returnPct,
      status: opportunity.status,
    });
  }

  console.log(JSON.stringify({ ok: true, updatedPositions: Object.keys(positionTheses), updatedOpportunities: Object.keys(opportunityTheses) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
