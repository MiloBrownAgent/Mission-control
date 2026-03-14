import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const markerSchema = v.object({
  name: v.string(),
  value: v.number(),
  unit: v.string(),
  refRangeLow: v.optional(v.number()),
  refRangeHigh: v.optional(v.number()),
  flagged: v.boolean(),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("bloodwork").order("desc").collect();
  },
});

export const add = mutation({
  args: {
    date: v.string(),
    panelName: v.string(),
    markers: v.array(markerSchema),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bloodwork", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("bloodwork"),
    date: v.optional(v.string()),
    panelName: v.optional(v.string()),
    markers: v.optional(v.array(markerSchema)),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("bloodwork") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
