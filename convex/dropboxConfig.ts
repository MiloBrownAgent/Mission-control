import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("dropboxConfig").order("desc").first();
    if (!config) return null;
    return { _id: config._id, connectedAt: config.connectedAt };
  },
});

export const getConfigInternal = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("dropboxConfig").order("desc").first();
  },
});

export const saveConfig = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Clear any existing configs
    const existing = await ctx.db.query("dropboxConfig").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    return await ctx.db.insert("dropboxConfig", {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      connectedAt: Date.now(),
    });
  },
});

export const clearConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("dropboxConfig").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }
  },
});
