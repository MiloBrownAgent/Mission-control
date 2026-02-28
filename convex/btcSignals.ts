import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ───────────────────────────────────────────────────────────────────

export const listSignals = query({
  handler: async (ctx) => {
    return ctx.db
      .query("btc_candle_signals")
      .withIndex("by_created")
      .order("desc")
      .take(50);
  },
});

/** Return the most-recent unresolved signal for a given interval. */
export const getUnresolved = query({
  args: { interval: v.string() },
  handler: async (ctx, { interval }) => {
    const all = await ctx.db
      .query("btc_candle_signals")
      .withIndex("by_created")
      .order("desc")
      .collect();
    return all.find((s) => s.interval === interval && s.outcome === undefined) ?? null;
  },
});

// ─── Mutations ─────────────────────────────────────────────────────────────────

export const addSignal = mutation({
  args: {
    candle_open_time: v.string(),
    interval: v.string(),
    open_price: v.number(),
    signal_price: v.number(),
    signal_direction: v.union(v.literal("UP"), v.literal("DOWN")),
    signal_confidence: v.number(),
    polymarket_url: v.string(),
    my_probability: v.number(),
  },
  handler: async (ctx, args) => {
    // Idempotent: skip if we already stored a signal for this candle+interval
    const existing = await ctx.db
      .query("btc_candle_signals")
      .withIndex("by_created")
      .collect();
    const dupe = existing.find(
      (s) =>
        s.candle_open_time === args.candle_open_time &&
        s.interval === args.interval
    );
    if (dupe) return dupe._id;

    return ctx.db.insert("btc_candle_signals", {
      ...args,
      created_at: Date.now(),
    });
  },
});

export const resolveSignal = mutation({
  args: {
    id: v.id("btc_candle_signals"),
    close_price: v.number(),
    outcome: v.union(v.literal("UP"), v.literal("DOWN")),
  },
  handler: async (ctx, { id, close_price, outcome }) => {
    const signal = await ctx.db.get(id);
    if (!signal) throw new Error("Signal not found");
    const correct = signal.signal_direction === outcome;
    await ctx.db.patch(id, {
      close_price,
      outcome,
      correct,
      resolved_at: Date.now(),
    });
    return { correct, signal_direction: signal.signal_direction, outcome };
  },
});
