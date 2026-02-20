import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db.query("crmContacts").withIndex("by_client", q => q.eq("clientId", args.clientId)).collect();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("crmContacts").collect(),
});

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    emailConfidence: v.optional(v.union(v.literal("verified"), v.literal("constructed"), v.literal("unknown"))),
    linkedIn: v.optional(v.string()),
    phone: v.optional(v.string()),
    isPrimary: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => await ctx.db.insert("crmContacts", args),
});

export const update = mutation({
  args: {
    id: v.id("crmContacts"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    emailConfidence: v.optional(v.union(v.literal("verified"), v.literal("constructed"), v.literal("unknown"))),
    linkedIn: v.optional(v.string()),
    phone: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("crmContacts") },
  handler: async (ctx, args) => await ctx.db.delete(args.id),
});
