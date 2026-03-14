import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ──────────────────────────────────────────────────────────────────

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("livePrices").collect();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const updatePrices = mutation({
  args: {
    prices: v.array(
      v.object({
        ticker: v.string(),
        price: v.number(),
        change: v.number(),
        changePercent: v.number(),
        marketState: v.string(),
      })
    ),
  },
  handler: async (ctx, { prices }) => {
    const now = new Date().toISOString();
    for (const p of prices) {
      const existing = await ctx.db
        .query("livePrices")
        .withIndex("by_ticker", (q) => q.eq("ticker", p.ticker))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          price: p.price,
          change: p.change,
          changePercent: p.changePercent,
          marketState: p.marketState,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("livePrices", {
          ticker: p.ticker,
          price: p.price,
          change: p.change,
          changePercent: p.changePercent,
          marketState: p.marketState,
          updatedAt: now,
        });
      }
    }
    return { ok: true, updated: prices.length };
  },
});
