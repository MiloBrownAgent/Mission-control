import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ── Positions ──────────────────────────────────────

export const listPositions = query({
  args: { portfolioType: v.optional(v.union(v.literal("high_risk"), v.literal("low_risk"))) },
  handler: async (ctx, args) => {
    if (args.portfolioType) {
      return ctx.db
        .query("investmentPositions")
        .withIndex("by_type", (q) => q.eq("portfolioType", args.portfolioType!))
        .collect();
    }
    return ctx.db.query("investmentPositions").collect();
  },
});

export const getPosition = query({
  args: { id: v.id("investmentPositions") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const getByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("investmentPositions")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .first();
  },
});

export const addPosition = mutation({
  args: {
    ticker: v.string(),
    name: v.string(),
    portfolioType: v.union(v.literal("high_risk"), v.literal("low_risk")),
    shares: v.optional(v.number()),
    entryPrice: v.optional(v.number()),
    entryDate: v.optional(v.string()),
    timeHorizon: v.optional(v.union(v.literal("short"), v.literal("medium"), v.literal("long"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("investmentPositions")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .first();
    if (existing) throw new Error(`Position ${args.ticker} already exists`);

    return ctx.db.insert("investmentPositions", {
      ticker: args.ticker.toUpperCase(),
      name: args.name,
      portfolioType: args.portfolioType,
      shares: args.shares,
      entryPrice: args.entryPrice,
      entryDate: args.entryDate,
      timeHorizon: args.timeHorizon,
      status: "active",
      addedAt: Date.now(),
    });
  },
});

export const updatePosition = mutation({
  args: {
    id: v.id("investmentPositions"),
    shares: v.optional(v.number()),
    entryPrice: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("watching"), v.literal("exited"))),
    timeHorizon: v.optional(v.union(v.literal("short"), v.literal("medium"), v.literal("long"))),
    thesis: v.optional(v.string()),
    thesisSources: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      publisher: v.optional(v.string()),
      publishedAt: v.optional(v.string()),
      quality: v.optional(v.number()),
      trustworthiness: v.optional(v.number()),
      relevance: v.optional(v.number()),
      compositeScore: v.optional(v.number()),
    }))),
    thesisGeneratedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) return;
    await ctx.db.patch(id, clean);
  },
});

export const updateThesisInternal = internalMutation({
  args: {
    id: v.id("investmentPositions"),
    thesis: v.string(),
    thesisSources: v.array(v.object({
      title: v.string(),
      url: v.string(),
      publisher: v.optional(v.string()),
      publishedAt: v.optional(v.string()),
      quality: v.optional(v.number()),
      trustworthiness: v.optional(v.number()),
      relevance: v.optional(v.number()),
      compositeScore: v.optional(v.number()),
    })),
    thesisGeneratedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      thesis: args.thesis,
      thesisSources: args.thesisSources,
      thesisGeneratedAt: args.thesisGeneratedAt,
    });
  },
});

export const removePosition = mutation({
  args: { id: v.id("investmentPositions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "exited" as const });
  },
});

// ── Alerts ──────────────────────────────────────

export const listAlerts = query({
  args: {
    acknowledged: v.optional(v.boolean()),
    ticker: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results;

    if (args.acknowledged !== undefined) {
      results = await ctx.db
        .query("investmentAlerts")
        .withIndex("by_acknowledged", (idx) => idx.eq("acknowledged", args.acknowledged!))
        .order("desc")
        .collect();
    } else {
      results = await ctx.db
        .query("investmentAlerts")
        .order("desc")
        .collect();
    }

    if (args.ticker) {
      results = results.filter((a) => a.ticker === args.ticker!.toUpperCase());
    }

    return results.slice(0, args.limit ?? 50);
  },
});

export const createAlert = internalMutation({
  args: {
    positionId: v.optional(v.id("investmentPositions")),
    ticker: v.string(),
    alertType: v.union(
      v.literal("thesis_risk"),
      v.literal("thesis_evolution"),
      v.literal("opportunity"),
      v.literal("price_alert")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    title: v.string(),
    summary: v.string(),
    sources: v.optional(v.array(v.object({ title: v.string(), url: v.string() }))),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("investmentAlerts", {
      ...args,
      acknowledged: false,
      createdAt: Date.now(),
    });
  },
});

export const acknowledgeAlert = mutation({
  args: { id: v.id("investmentAlerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { acknowledged: true });
  },
});

// ── Opportunities ──────────────────────────────────────

export const listOpportunities = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("investmentOpportunities")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit ?? 20);
  },
});

export const createOpportunity = internalMutation({
  args: {
    ticker: v.string(),
    name: v.string(),
    opportunityType: v.string(),
    thesis: v.string(),
    sources: v.array(v.object({ title: v.string(), url: v.string() })),
    expectedUpside: v.optional(v.string()),
    catalysts: v.optional(v.array(v.string())),
    risks: v.optional(v.array(v.string())),
    timeHorizon: v.optional(v.string()),
    moralScreenPass: v.boolean(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("investmentOpportunities", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listAllOpportunitiesTracked = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("investmentOpportunities")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

export const listWeeklySummaries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("investmentWeeklySummaries")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit ?? 52);
  },
});

export const createWeeklySummary = internalMutation({
  args: {
    weekOf: v.string(),
    summary: v.string(),
    totalPicks: v.number(),
    winnersCount: v.number(),
    losersCount: v.number(),
    bestPicker: v.optional(v.object({ ticker: v.string(), returnPct: v.number() })),
    worstPicker: v.optional(v.object({ ticker: v.string(), returnPct: v.number() })),
    avgReturn: v.optional(v.number()),
    positionUpdates: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("investmentWeeklySummaries", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const markOpportunityEmailed = internalMutation({
  args: { id: v.id("investmentOpportunities") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { emailedAt: Date.now() });
  },
});

export const updateOpportunityTracking = internalMutation({
  args: {
    id: v.id("investmentOpportunities"),
    currentPrice: v.optional(v.number()),
    priceAtRecommendation: v.optional(v.number()),
    returnPct: v.optional(v.number()),
    priceUpdatedAt: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("hit_target"), v.literal("stopped_out"), v.literal("expired"))),
    weeklyNotes: v.optional(v.array(v.object({
      date: v.string(),
      price: v.number(),
      note: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) return;
    await ctx.db.patch(id, clean);
  },
});
