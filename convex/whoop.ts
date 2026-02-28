import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── Token management ───────────────────────────────────────────────────────

export const storeTokens = mutation({
  args: {
    userId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    // Replace any existing token row for this user
    const existing = await ctx.db
      .query("whoop_tokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
        lastSyncedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("whoop_tokens", {
      userId: args.userId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      lastSyncedAt: Date.now(),
    });
  },
});

export const getTokens = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whoop_tokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/** Get the most recently stored token (single-user MC setup) */
export const getLatestTokens = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("whoop_tokens").order("desc").first();
  },
});

export const updateTokens = mutation({
  args: {
    userId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whoop_tokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!existing) throw new Error(`No WHOOP token record found for user ${args.userId}`);

    await ctx.db.patch(existing._id, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      lastSyncedAt: Date.now(),
    });
  },
});

// ── Data storage ───────────────────────────────────────────────────────────

export const storeData = mutation({
  args: {
    type: v.string(),
    date: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Upsert: replace any existing record for this type+date
    const existing = await ctx.db
      .query("whoop_data")
      .withIndex("by_type_date", (q) =>
        q.eq("type", args.type).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.data,
        storedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("whoop_data", {
      type: args.type,
      date: args.date,
      data: args.data,
      storedAt: Date.now(),
    });
  },
});

export const getLatestByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    // Get all records for this type, sorted by date descending
    const records = await ctx.db
      .query("whoop_data")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .order("desc")
      .take(10);

    // Return the most recent by date string (ISO date sorts lexicographically)
    if (!records.length) return null;
    records.sort((a, b) => b.date.localeCompare(a.date));
    return records[0];
  },
});

export const getByTypeAndRange = query({
  args: {
    type: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("whoop_data")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();

    return records
      .filter((r) => r.date >= args.startDate && r.date <= args.endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
});
