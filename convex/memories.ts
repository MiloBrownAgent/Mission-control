import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("memories").order("desc").collect();
  },
});

export const search = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.query) {
      if (args.category) {
        return await ctx.db
          .query("memories")
          .filter((q) => q.eq(q.field("category"), args.category))
          .order("desc")
          .collect();
      }
      return await ctx.db.query("memories").order("desc").collect();
    }

    let searchQuery = ctx.db
      .query("memories")
      .withSearchIndex("search_memories", (q) => {
        let s = q.search("content", args.query);
        if (args.category) {
          s = s.eq("category", args.category);
        }
        return s;
      });

    return await searchQuery.collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("memories", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("memories"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
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
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const categories = query({
  args: {},
  handler: async (ctx) => {
    const memories = await ctx.db.query("memories").collect();
    const cats = new Set(memories.map((m) => m.category));
    return Array.from(cats).sort();
  },
});
