import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Signal Briefings ──────────────────────────────────────

export const getLatestBriefing = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("signalBriefings")
      .withIndex("by_date")
      .order("desc")
      .first();
  },
});

export const getBriefingByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("signalBriefings")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
  },
});

export const createBriefing = mutation({
  args: {
    date: v.string(),
    marketStatus: v.string(),
    sections: v.array(v.object({
      type: v.string(),
      title: v.string(),
      summary: v.string(),
      ticker: v.optional(v.string()),
      importance: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    })),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("signalBriefings", {
      ...args,
      generatedAt: Date.now(),
    });
  },
});

// ── Event Scans ──────────────────────────────────────

export const listEventScans = query({
  args: {
    eventType: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("expired"), v.literal("acted_on"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results;
    if (args.status) {
      results = await ctx.db
        .query("eventScans")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      results = await ctx.db
        .query("eventScans")
        .withIndex("by_detected")
        .order("desc")
        .collect();
    }
    if (args.eventType) {
      results = results.filter((e) => e.eventType === args.eventType);
    }
    return results.slice(0, args.limit ?? 50);
  },
});

export const createEventScan = mutation({
  args: {
    ticker: v.string(),
    eventType: v.string(),
    title: v.string(),
    summary: v.string(),
    pitzyScore: v.number(),
    sector: v.optional(v.string()),
    sources: v.optional(v.array(v.object({ title: v.string(), url: v.string() }))),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("acted_on")),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("eventScans", {
      ...args,
      detectedAt: Date.now(),
    });
  },
});

export const updateEventScanStatus = mutation({
  args: {
    id: v.id("eventScans"),
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("acted_on")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

// ── Macro Snapshots ──────────────────────────────────────

export const getLatestMacro = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("macroSnapshots")
      .withIndex("by_date")
      .order("desc")
      .first();
  },
});

export const createMacroSnapshot = mutation({
  args: {
    date: v.string(),
    fedFundsRate: v.optional(v.number()),
    fedNextMeeting: v.optional(v.string()),
    fedChangeProb: v.optional(v.number()),
    vix: v.optional(v.number()),
    vixTrend: v.optional(v.string()),
    yieldCurveStatus: v.optional(v.string()),
    yield2y10ySpread: v.optional(v.number()),
    dxy: v.optional(v.number()),
    dxyTrend: v.optional(v.string()),
    sectorRotation: v.optional(v.any()),
    earningsCalendar: v.optional(v.array(v.object({ ticker: v.string(), date: v.string(), estimate: v.optional(v.string()) }))),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("macroSnapshots", {
      ...args,
      generatedAt: Date.now(),
    });
  },
});
