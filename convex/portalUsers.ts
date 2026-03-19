import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Insert a new portal user — password hashing is done in the API route before calling this
export const createPortalUser = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    clientSlug: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("portalUsers", {
      email: args.email,
      passwordHash: args.passwordHash,
      clientSlug: args.clientSlug,
      name: args.name,
      active: true,
      createdAt: Date.now(),
    });
    return id;
  },
});

// Look up a portal user by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("portalUsers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// List all portal users for a given clientSlug
export const listByClient = query({
  args: { clientSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("portalUsers")
      .withIndex("by_client", (q) => q.eq("clientSlug", args.clientSlug))
      .collect();
  },
});

// List all portal users (admin use)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("portalUsers").collect();
  },
});

// Update lastLoginAt to now
export const updateLastLogin = mutation({
  args: { id: v.id("portalUsers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastLoginAt: Date.now() });
  },
});

// Deactivate a portal user (soft delete)
export const deactivateUser = mutation({
  args: { id: v.id("portalUsers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { active: false });
  },
});

// Permanently delete a portal user
export const deleteUser = mutation({
  args: { id: v.id("portalUsers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
