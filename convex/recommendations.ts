import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Priority sort order
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("recommendations").collect();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const recs = await ctx.db
      .query("recommendations")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return recs.sort((a, b) => {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pDiff !== 0) return pDiff;
      return a.createdAt - b.createdAt;
    });
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("health"),
      v.literal("nutrition"),
      v.literal("training"),
      v.literal("recovery"),
      v.literal("supplement")
    ),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("recommendations", {
      ...args,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const dismiss = mutation({
  args: { id: v.id("recommendations") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      status: "dismissed",
      dismissedAt: Date.now(),
    });
  },
});

export const complete = mutation({
  args: { id: v.id("recommendations") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "completed" });
  },
});

export const remove = mutation({
  args: { id: v.id("recommendations") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
