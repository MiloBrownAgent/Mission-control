import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("vitals").order("desc").collect();
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const vitals = await ctx.db.query("vitals").order("desc").collect();
    return vitals.slice(0, args.limit ?? 90);
  },
});

export const add = mutation({
  args: {
    date: v.string(),
    weight: v.optional(v.number()),
    bodyComp: v.optional(v.number()),
    energy: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    mood: v.optional(v.number()),
    appetite: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("vitals", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("vitals"),
    weight: v.optional(v.number()),
    bodyComp: v.optional(v.number()),
    energy: v.optional(v.number()),
    sleepQuality: v.optional(v.number()),
    mood: v.optional(v.number()),
    appetite: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("vitals") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
