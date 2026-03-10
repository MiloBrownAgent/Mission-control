import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db
      .query("daycareReports")
      .withIndex("by_date")
      .order("desc")
      .take(1);
    return reports[0] ?? null;
  },
});

// Internal version for use by Convex actions (daycareSync)
export const upsertInternal = internalMutation({
  args: {
    date: v.string(),
    childName: v.string(),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    totalTime: v.optional(v.string()),
    meals: v.optional(v.number()),
    totalSleep: v.optional(v.string()),
    totalNaps: v.optional(v.number()),
    pees: v.optional(v.number()),
    poops: v.optional(v.number()),
    photoUrl: v.optional(v.string()),
    rawSubject: v.optional(v.string()),
    parsedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("daycareReports")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
    } else {
      await ctx.db.insert("daycareReports", args);
    }
  },
});

export const upsert = mutation({
  args: {
    date: v.string(),
    childName: v.string(),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    totalTime: v.optional(v.string()),
    meals: v.optional(v.number()),
    totalSleep: v.optional(v.string()),
    totalNaps: v.optional(v.number()),
    pees: v.optional(v.number()),
    poops: v.optional(v.number()),
    photoUrl: v.optional(v.string()),
    rawSubject: v.optional(v.string()),
    parsedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("daycareReports")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
    } else {
      await ctx.db.insert("daycareReports", args);
    }
  },
});
