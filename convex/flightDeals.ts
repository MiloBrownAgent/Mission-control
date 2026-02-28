import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function getThisWeekOf(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(now.setDate(diff));
  return mon.toISOString().split("T")[0];
}

export const getThisWeek = query({
  args: {},
  handler: async (ctx) => {
    const weekOf = getThisWeekOf();
    const deals = await ctx.db
      .query("flightDeals")
      .withIndex("by_week", (q) => q.eq("weekOf", weekOf))
      .collect();
    return deals.sort((a, b) => b.dealScore - a.dealScore);
  },
});

export const bulkInsert = mutation({
  args: {
    weekOf: v.string(),
    deals: v.array(v.object({
      origin: v.string(),
      destination: v.string(),
      destinationCity: v.string(),
      destinationCountry: v.string(),
      isInternational: v.boolean(),
      airline: v.string(),
      isNonstop: v.boolean(),
      departureDate: v.string(),
      returnDate: v.optional(v.string()),
      cashPricePerPerson: v.number(),
      cashPriceTotal: v.number(),
      skyMilesPerPerson: v.number(),
      skyMilesTotal: v.number(),
      cabinClass: v.string(),
      dealScore: v.number(),
      sourceUrl: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Clear existing deals for this week
    const existing = await ctx.db
      .query("flightDeals")
      .withIndex("by_week", (q) => q.eq("weekOf", args.weekOf))
      .collect();
    for (const deal of existing) {
      await ctx.db.delete(deal._id);
    }
    // Insert new deals
    const now = Date.now();
    for (const deal of args.deals) {
      await ctx.db.insert("flightDeals", {
        ...deal,
        weekOf: args.weekOf,
        pulledAt: now,
      });
    }
    return args.deals.length;
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("flightDeals").collect();
    for (const deal of all) {
      await ctx.db.delete(deal._id);
    }
    return all.length;
  },
});

export const clearWeek = mutation({
  args: { weekOf: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("flightDeals")
      .withIndex("by_week", (q) => q.eq("weekOf", args.weekOf))
      .collect();
    for (const deal of existing) {
      await ctx.db.delete(deal._id);
    }
    return existing.length;
  },
});
