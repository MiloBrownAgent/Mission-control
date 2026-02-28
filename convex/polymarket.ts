import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listTrades = query({
  handler: async (ctx) => {
    return ctx.db.query("polymarket_trades").order("desc").collect();
  },
});

export const addTrade = mutation({
  args: {
    question: v.string(),
    position: v.union(v.literal("Yes"), v.literal("No")),
    entry_price: v.number(),
    my_probability: v.number(),
    kelly_stake: v.number(),
    market_url: v.string(),
    category: v.string(),
    resolve_date: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("polymarket_trades", {
      ...args,
      resolved: false,
      created_at: Date.now(),
    });
  },
});

export const resolveTrade = mutation({
  args: {
    id: v.id("polymarket_trades"),
    outcome: v.boolean(),
  },
  handler: async (ctx, { id, outcome }) => {
    const trade = await ctx.db.get(id);
    if (!trade) throw new Error("Trade not found");
    const won =
      (trade.position === "Yes" && outcome) ||
      (trade.position === "No" && !outcome);
    const pnl = won
      ? trade.kelly_stake * (100 / trade.entry_price - 1)
      : -trade.kelly_stake;
    await ctx.db.patch(id, { resolved: true, outcome, pnl });
  },
});

const OPENING_TRADES = [
  {
    question: "US recession by end of 2026?",
    position: "Yes" as const,
    entry_price: 31,
    my_probability: 38,
    kelly_stake: 25,
    market_url: "https://polymarket.com/event/us-recession-by-end-of-2026",
    category: "Macro",
    resolve_date: "2026-12-31",
    notes:
      "Tariff escalation + DOGE spending cuts + consumer confidence declining. Market at 31% feels underpriced; I have it at ~38%. [speculative]",
  },
  {
    question: "Fed 25bps cut in March 2026?",
    position: "No" as const,
    entry_price: 96,
    my_probability: 97,
    kelly_stake: 10,
    market_url:
      "https://polymarket.com/event/fed-decision-in-march-885/will-the-fed-decrease-interest-rates-by-25-bps-after-the-march-2026-meeting",
    category: "Fed",
    resolve_date: "2026-03-19",
    notes:
      "Near-consensus no cut. Fed has been clear — no data support for March cut. Small calibration trade. [consensus]",
  },
  {
    question: "Fed 25bps cut in April 2026?",
    position: "No" as const,
    entry_price: 87,
    my_probability: 92,
    kelly_stake: 20,
    market_url:
      "https://polymarket.com/event/fed-decision-in-april/will-the-fed-decrease-interest-rates-by-25-bps-after-the-april-2026-meeting",
    category: "Fed",
    resolve_date: "2026-05-01",
    notes:
      "Tariffs = inflationary pressure. Fed can't cut into inflation even under growth fears. 13% cut implied probability seems slightly high; I have it at ~8%. [inferred]",
  },
];

export const seedPolymarketTrades = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("polymarket_trades").first();
    if (existing) {
      return { seeded: false, message: "Trades already exist — skipping seed." };
    }
    for (const trade of OPENING_TRADES) {
      await ctx.db.insert("polymarket_trades", {
        ...trade,
        resolved: false,
        created_at: Date.now(),
      });
    }
    return { seeded: true, message: `Inserted ${OPENING_TRADES.length} paper trades.` };
  },
});
