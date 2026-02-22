import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("activityLog")
      .order("desc")
      .take(limit);
  },
});

export const add = mutation({
  args: {
    message: v.string(),
    type: v.union(v.literal("success"), v.literal("info"), v.literal("warning")),
    category: v.union(v.literal("cron"), v.literal("task"), v.literal("system")),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityLog", {
      message: args.message,
      type: args.type,
      category: args.category,
      timestamp: args.timestamp ?? Date.now(),
    });
  },
});

export const seedActivityLog = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("activityLog").first();
    if (existing) return "Already seeded";

    const feb22 = new Date("2026-02-22").getTime();
    const hour = 60 * 60 * 1000;

    const entries = [
      {
        message: "Built OurFable COPPA consent flow — ConsentGate, DB records, data deletion, retention cron",
        type: "success" as const,
        category: "cron" as const,
        timestamp: feb22 + 2 * hour,
      },
      {
        message: "Deleted L&S legacy routes — /pitch, /portal, /api/portal/*. Build passing.",
        type: "success" as const,
        category: "cron" as const,
        timestamp: feb22 + 4 * hour,
      },
      {
        message: "MEMORY.md + PROJECTS.md updated. Flight noted. All overnight work logged.",
        type: "info" as const,
        category: "system" as const,
        timestamp: feb22 + 4 * hour + 30 * 60 * 1000,
      },
      {
        message: "Morning briefing delivered to Dave",
        type: "success" as const,
        category: "cron" as const,
        timestamp: feb22 + 6 * hour,
      },
      {
        message: "Mission Control upgraded: production mode, /family, /finance, /projects, /meals pages shipped",
        type: "success" as const,
        category: "task" as const,
        timestamp: feb22 + 7 * hour,
      },
    ];

    for (const entry of entries) {
      await ctx.db.insert("activityLog", entry);
    }

    return "Activity log seeded";
  },
});
