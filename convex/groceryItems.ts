import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("groceryItems")
      .withIndex("by_added")
      .order("desc")
      .collect();
  },
});

export const addItem = mutation({
  args: {
    text: v.string(),
    category: v.optional(v.string()),
    addedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("groceryItems", {
      text: args.text,
      checked: false,
      category: args.category,
      addedAt: Date.now(),
      addedBy: args.addedBy,
    });
  },
});

export const toggleItem = mutation({
  args: { id: v.id("groceryItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (item) {
      await ctx.db.patch(args.id, { checked: !item.checked });
    }
  },
});

export const deleteItem = mutation({
  args: { id: v.id("groceryItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const clearChecked = mutation({
  args: {},
  handler: async (ctx) => {
    const checked = await ctx.db
      .query("groceryItems")
      .withIndex("by_checked", (q) => q.eq("checked", true))
      .collect();
    for (const item of checked) {
      await ctx.db.delete(item._id);
    }
  },
});
