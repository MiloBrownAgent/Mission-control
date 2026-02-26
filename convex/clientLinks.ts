import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const createLink = mutation({
  args: {
    clientSlug: v.string(),
    folderPath: v.string(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const token = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");

    const id = await ctx.db.insert("clientLinks", {
      token,
      clientSlug: args.clientSlug,
      folderPath: args.folderPath,
      label: args.label,
      active: true,
      createdAt: Date.now(),
    });

    return {
      id,
      token,
      url: "https://lookandseen.com/p/" + token,
    };
  },
});

export const listLinks = query({
  args: { clientSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clientLinks")
      .withIndex("by_client", (q) => q.eq("clientSlug", args.clientSlug))
      .order("desc")
      .collect();
  },
});

export const validateToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("clientLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link || !link.active) return null;
    return link;
  },
});

export const revokeLink = mutation({
  args: { id: v.id("clientLinks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: false });
  },
});

export const activateLink = mutation({
  args: { id: v.id("clientLinks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: true });
  },
});
