import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("content").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    platform: v.union(
      v.literal("Instagram"),
      v.literal("Twitter"),
      v.literal("LinkedIn"),
      v.literal("Blog")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("scheduled"),
      v.literal("published")
    ),
    scheduledDate: v.optional(v.string()),
    notes: v.string(),
    mediaUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("content", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("content"),
    title: v.optional(v.string()),
    platform: v.optional(
      v.union(
        v.literal("Instagram"),
        v.literal("Twitter"),
        v.literal("LinkedIn"),
        v.literal("Blog")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("in_review"),
        v.literal("scheduled"),
        v.literal("published")
      )
    ),
    scheduledDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, {
      ...fields,
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("content"),
    status: v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("scheduled"),
      v.literal("published")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("content") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
