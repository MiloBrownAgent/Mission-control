import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const PRIORITY_ORDER: Record<string, number> = { must: 0, if_time: 1, skip: 2 };

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("cleaningTasks").collect();
    return tasks.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 9;
      const pb = PRIORITY_ORDER[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return a.room.localeCompare(b.room);
    });
  },
});

export const add = mutation({
  args: {
    room: v.string(),
    task: v.string(),
    notes: v.optional(v.string()),
    priority: v.union(v.literal("must"), v.literal("if_time"), v.literal("skip")),
    recurring: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cleaningTasks", {
      ...args,
      addedAt: Date.now(),
    });
  },
});

export const toggleComplete = mutation({
  args: { id: v.id("cleaningTasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    if (task.completedAt) {
      await ctx.db.patch(args.id, { completedAt: undefined });
    } else {
      await ctx.db.patch(args.id, { completedAt: Date.now() });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("cleaningTasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const clearCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("cleaningTasks").collect();
    const completed = tasks.filter((t) => t.completedAt !== undefined);
    for (const task of completed) {
      await ctx.db.delete(task._id);
    }
    return completed.length;
  },
});

export const resetForNextVisit = mutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("cleaningTasks").collect();
    // Uncomplete all recurring tasks; delete non-recurring completed tasks
    for (const task of tasks) {
      if (task.completedAt !== undefined) {
        if (task.recurring) {
          await ctx.db.patch(task._id, { completedAt: undefined });
        } else {
          await ctx.db.delete(task._id);
        }
      }
    }
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("cleaningTasks"),
    task: v.string(),
    priority: v.union(v.literal("must"), v.literal("if_time"), v.literal("skip")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { task: args.task, priority: args.priority });
  },
});

// --- Cleaning Config (next visit date) ---

export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("cleaningConfig")
      .withIndex("by_key", (q) => q.eq("key", "config"))
      .first();
  },
});

export const setNextVisitDate = mutation({
  args: { nextVisitDate: v.number(), lastVisitDate: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cleaningConfig")
      .withIndex("by_key", (q) => q.eq("key", "config"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        nextVisitDate: args.nextVisitDate,
        ...(args.lastVisitDate !== undefined ? { lastVisitDate: args.lastVisitDate } : {}),
      });
    } else {
      await ctx.db.insert("cleaningConfig", {
        key: "config",
        nextVisitDate: args.nextVisitDate,
        lastVisitDate: args.lastVisitDate,
      });
    }
  },
});

export const markVisitComplete = mutation({
  args: { nextVisitDate: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Update config
    const existing = await ctx.db
      .query("cleaningConfig")
      .withIndex("by_key", (q) => q.eq("key", "config"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        nextVisitDate: args.nextVisitDate,
        lastVisitDate: now,
      });
    } else {
      await ctx.db.insert("cleaningConfig", {
        key: "config",
        nextVisitDate: args.nextVisitDate,
        lastVisitDate: now,
      });
    }
    // Reset recurring tasks, delete one-time completed tasks
    const tasks = await ctx.db.query("cleaningTasks").collect();
    for (const task of tasks) {
      if (task.completedAt !== undefined) {
        if (task.recurring) {
          await ctx.db.patch(task._id, { completedAt: undefined });
        } else {
          await ctx.db.delete(task._id);
        }
      }
    }
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("cleaningTasks").first();
    if (existing) return "Already seeded";

    const now = Date.now();
    const tasks = [
      { room: "Kitchen", task: "Wipe down all counters and backsplash", priority: "must" as const, recurring: true },
      { room: "Kitchen", task: "Clean stovetop and oven exterior", priority: "must" as const, recurring: true },
      { room: "Kitchen", task: "Mop kitchen floor", priority: "must" as const, recurring: true },
      { room: "Kitchen", task: "Clean out microwave", priority: "if_time" as const, recurring: true },
      { room: "Bathrooms", task: "Scrub both toilets", priority: "must" as const, recurring: true },
      { room: "Bathrooms", task: "Clean sinks and mirrors", priority: "must" as const, recurring: true },
      { room: "Bathrooms", task: "Scrub shower/tub", priority: "must" as const, recurring: true },
      { room: "Bathrooms", task: "Mop bathroom floors", priority: "must" as const, recurring: true },
      { room: "Living Room", task: "Vacuum all rugs and carpets", priority: "must" as const, recurring: true },
      { room: "Living Room", task: "Dust surfaces and shelves", priority: "must" as const, recurring: true },
      { room: "Bedrooms", task: "Change bed linens in master", priority: "must" as const, recurring: true },
      { room: "Bedrooms", task: "Vacuum bedroom floors", priority: "must" as const, recurring: true },
      { room: "Other", task: "Vacuum stairs", priority: "must" as const, recurring: true },
      { room: "Other", task: "Wipe down baseboards", priority: "if_time" as const, recurring: true },
    ];

    for (const t of tasks) {
      await ctx.db.insert("cleaningTasks", { ...t, addedAt: now });
    }
    return "Seeded 14 cleaning tasks";
  },
});
