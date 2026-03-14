import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("protocolNotes").order("desc").collect();
  },
});

export const add = mutation({
  args: {
    date: v.string(),
    phase: v.string(),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("protocolNotes", args);
  },
});

export const remove = mutation({
  args: { id: v.id("protocolNotes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
