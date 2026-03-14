import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("workouts").order("desc").collect();
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const workouts = await ctx.db.query("workouts").order("desc").collect();
    return workouts.slice(0, args.limit ?? 30);
  },
});

export const add = mutation({
  args: {
    date: v.string(),
    type: v.union(v.literal("lift"), v.literal("cardio"), v.literal("other")),
    duration: v.number(),
    exercises: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workouts", args);
  },
});

export const remove = mutation({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
