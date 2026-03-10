import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Trade Rules ──────────────────────────────────────

export const listTradeRules = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("tradeRules").collect();
  },
});

export const getTradeRuleByPosition = query({
  args: { positionId: v.id("investmentPositions") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tradeRules")
      .withIndex("by_position", (q) => q.eq("positionId", args.positionId))
      .first();
  },
});

export const upsertTradeRule = mutation({
  args: {
    positionId: v.id("investmentPositions"),
    ticker: v.string(),
    entryZone: v.optional(v.object({ low: v.number(), high: v.number() })),
    addZone: v.optional(v.object({ low: v.number(), high: v.number() })),
    trimZone: v.optional(v.object({ low: v.number(), high: v.number() })),
    stopZone: v.optional(v.object({ low: v.number(), high: v.number() })),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tradeRules")
      .withIndex("by_position", (q) => q.eq("positionId", args.positionId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("tradeRules", { ...args, updatedAt: Date.now() });
  },
});

// ── Trade Decisions ──────────────────────────────────────

export const listTradeDecisions = query({
  args: {
    ticker: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("tradeDecisions")
      .withIndex("by_decided")
      .order("desc")
      .collect();
    if (args.ticker) {
      results = results.filter((d) => d.ticker === args.ticker);
    }
    return results.slice(0, args.limit ?? 50);
  },
});

export const createTradeDecision = mutation({
  args: {
    positionId: v.optional(v.id("investmentPositions")),
    ticker: v.string(),
    action: v.union(v.literal("buy"), v.literal("sell"), v.literal("add"), v.literal("trim"), v.literal("hold")),
    price: v.number(),
    shares: v.optional(v.number()),
    followedSystem: v.optional(v.boolean()),
    systemSaid: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("tradeDecisions", {
      ...args,
      decidedAt: Date.now(),
    });
  },
});

// ── Closed Trades ──────────────────────────────────────

export const listClosedTrades = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("closedTrades")
      .withIndex("by_closed")
      .order("desc")
      .take(args.limit ?? 100);
  },
});

export const createClosedTrade = mutation({
  args: {
    ticker: v.string(),
    name: v.string(),
    portfolioType: v.string(),
    entryPrice: v.number(),
    exitPrice: v.number(),
    shares: v.number(),
    entryDate: v.string(),
    exitDate: v.string(),
    returnPct: v.number(),
    returnDollars: v.number(),
    holdDays: v.number(),
    thesis: v.optional(v.string()),
    exitReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("closedTrades", {
      ...args,
      closedAt: Date.now(),
    });
  },
});
