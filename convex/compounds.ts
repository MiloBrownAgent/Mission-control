import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("compounds").order("asc").collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    dose: v.string(),
    frequency: v.string(),
    route: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("planned"), v.literal("paused"), v.literal("discontinued")),
    notes: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("compounds", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("compounds"),
    name: v.optional(v.string()),
    dose: v.optional(v.string()),
    frequency: v.optional(v.string()),
    route: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("planned"), v.literal("paused"), v.literal("discontinued"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("compounds") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
