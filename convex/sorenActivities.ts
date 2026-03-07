import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveWeeklyActivities = mutation({
  args: {
    weekOf: v.string(),
    items: v.array(v.object({
      title: v.string(),
      description: v.string(),
      location: v.optional(v.string()),
      url: v.optional(v.string()),
      type: v.union(v.literal("event"), v.literal("idea")),
      date: v.optional(v.string()),
    })),
    sources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Delete existing entry for this week
    const existing = await ctx.db
      .query("soren_activities")
      .withIndex("by_week", (q) => q.eq("weekOf", args.weekOf))
      .first();
    if (existing) await ctx.db.delete(existing._id);

    return await ctx.db.insert("soren_activities", {
      weekOf: args.weekOf,
      items: args.items,
      generatedAt: Date.now(),
      sources: args.sources,
    });
  },
});

export const getLatestActivities = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("soren_activities")
      .order("desc")
      .first();
  },
});

export const getActivitiesForWeek = query({
  args: { weekOf: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("soren_activities")
      .withIndex("by_week", (q) => q.eq("weekOf", args.weekOf))
      .first();
  },
});
