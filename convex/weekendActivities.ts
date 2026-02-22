import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("weekendActivities")
      .withIndex("by_week")
      .order("desc")
      .take(30);
    if (!all.length) return { weekOf: null, activities: [] };
    const latestWeek = all[0].weekOf;
    const activities = all
      .filter((a) => a.weekOf === latestWeek)
      .sort((a, b) => a.rank - b.rank);
    return { weekOf: latestWeek, activities };
  },
});

export const bulkInsert = mutation({
  args: {
    weekOf: v.string(),
    activities: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        location: v.optional(v.string()),
        address: v.optional(v.string()),
        driveTime: v.optional(v.string()),
        cost: v.optional(v.string()),
        category: v.string(),
        ageNote: v.optional(v.string()),
        url: v.optional(v.string()),
        source: v.optional(v.string()),
        rank: v.number(),
      })
    ),
  },
  handler: async (ctx, { weekOf, activities }) => {
    // Clear existing for this week
    const existing = await ctx.db
      .query("weekendActivities")
      .withIndex("by_week", (q) => q.eq("weekOf", weekOf))
      .collect();
    for (const a of existing) await ctx.db.delete(a._id);
    // Insert new
    const ids = [];
    for (const activity of activities) {
      const id = await ctx.db.insert("weekendActivities", { ...activity, weekOf });
      ids.push(id);
    }
    return { ids };
  },
});
