import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ───────────────────────────────────────────────────────────────────

/** Most recent sentiment reading. */
export const latest = query({
  handler: async (ctx) => {
    return ctx.db
      .query("hims_sentiment")
      .withIndex("by_checked")
      .order("desc")
      .first();
  },
});

/** Last 24h of readings (for sparkline / chart). */
export const history = query({
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const all = await ctx.db
      .query("hims_sentiment")
      .withIndex("by_checked")
      .order("desc")
      .collect();
    return all.filter((r) => r.checkedAt >= cutoff).reverse();
  },
});

/** Today's readings only (CST timezone). */
export const todayReadings = query({
  handler: async (ctx) => {
    // Start of today CST (UTC-6)
    const now = new Date();
    const cstOffset = -6 * 60 * 60 * 1000;
    const cstNow = new Date(now.getTime() + cstOffset);
    const startOfDay = new Date(
      cstNow.getFullYear(),
      cstNow.getMonth(),
      cstNow.getDate()
    );
    const cutoff = startOfDay.getTime() - cstOffset;

    const all = await ctx.db
      .query("hims_sentiment")
      .withIndex("by_checked")
      .order("desc")
      .collect();
    return all.filter((r) => r.checkedAt >= cutoff).reverse();
  },
});

// ─── Mutations ─────────────────────────────────────────────────────────────────

export const store = mutation({
  args: {
    score: v.number(),
    tweetCount: v.number(),
    bullishCount: v.number(),
    bearishCount: v.number(),
    neutralCount: v.number(),
    topBullish: v.optional(v.string()),
    topBearish: v.optional(v.string()),
    priceAtCheck: v.optional(v.number()),
    checkedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("hims_sentiment", args);
  },
});
