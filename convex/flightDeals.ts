import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function getThisWeekOf(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun (UTC)
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday (UTC)
  const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return mon.toISOString().split("T")[0]; // always "YYYY-MM-DD" in UTC
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
      cashFarePerPerson: v.optional(v.number()),
      cashFareTotal: v.optional(v.number()),
      skyMilesPerPerson: v.optional(v.number()),
      skyMilesTotal: v.optional(v.number()),
      centsPerMile: v.optional(v.number()),
      priceSource: v.optional(v.string()),
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

export const upsertCashFares = mutation({
  args: {
    weekOf: v.string(),
    fares: v.array(v.object({
      destination: v.string(),
      cashFarePerPerson: v.number(),
      cashFareTotal: v.number(),
      centsPerMile: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const deals = await ctx.db
      .query("flightDeals")
      .withIndex("by_week", (q) => q.eq("weekOf", args.weekOf))
      .collect();
    for (const fare of args.fares) {
      const deal = deals.find((d) => d.destination === fare.destination);
      if (deal) {
        await ctx.db.patch(deal._id, {
          cashFarePerPerson: fare.cashFarePerPerson,
          cashFareTotal: fare.cashFareTotal,
          centsPerMile: fare.centsPerMile,
        });
      }
    }
    return args.fares.length;
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
