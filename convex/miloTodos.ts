import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    if (status) {
      return await ctx.db
        .query("milo_todos")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("milo_todos").order("desc").collect();
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    notes: v.optional(v.string()),
    category: v.string(),
    priority: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("milo_todos", {
      ...args,
      status: "open",
      addedAt: Date.now(),
    });
  },
});

export const markDone = mutation({
  args: { id: v.id("milo_todos") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "done", doneAt: Date.now() });
  },
});

export const markOpen = mutation({
  args: { id: v.id("milo_todos") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "open", doneAt: undefined });
  },
});

export const remove = mutation({
  args: { id: v.id("milo_todos") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("milo_todos").first();
    if (existing) return "already seeded";

    const todos = [
      {
        title: "Grove — Replace Chronicle with World Snapshot",
        notes: "Remove daily Chronicle. Replace with auto-generated monthly snapshot: headlines, #1 song, market close, sports. One optional family note. Works at any age, zero maintenance.",
        category: "grove",
        priority: "high",
        source: "dave",
        status: "open",
        addedAt: Date.now(),
      },
      {
        title: "Grove — Set up sweeney.family sending domain in Resend",
        notes: "Current Resend key has no verified domains. Need new account or domain added so invite emails send from grove@sweeney.family not hello@ourfable.ai. Dave to set up; I'll handle DNS.",
        category: "infra",
        priority: "high",
        source: "dave",
        status: "open",
        addedAt: Date.now() - 1000,
      },
      {
        title: "Price update cron — every 15 min during market hours",
        notes: "Standalone script, not heartbeat. Portfolio prices refresh automatically during trading session.",
        category: "infra",
        priority: "medium",
        source: "milo",
        status: "open",
        addedAt: Date.now() - 2000,
      },
    ];

    for (const todo of todos) {
      await ctx.db.insert("milo_todos", todo);
    }
    return "seeded";
  },
});
