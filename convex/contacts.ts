import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contacts").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    company: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("contacts", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, {
      ...fields,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const listByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("contacts").order("desc").collect();
    return all.filter(c => c.tags.includes(args.tag));
  },
});

export const listOutreachQueue = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("contacts").order("desc").collect();
    return all
      .filter(c => c.tags.includes("outreach-queue"))
      .sort((a, b) => {
        const priority = { high: 0, medium: 1, low: 2 };
        const pa = a.tags.includes("priority-high") ? 0 : a.tags.includes("priority-medium") ? 1 : 2;
        const pb = b.tags.includes("priority-high") ? 0 : b.tags.includes("priority-medium") ? 1 : 2;
        return pa - pb;
      });
  },
});

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("contacts").order("desc").collect();
    const q = args.q.toLowerCase();
    return all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    ).slice(0, 20);
  },
});
