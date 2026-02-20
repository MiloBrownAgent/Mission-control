import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const stageVal = v.union(
  v.literal("lead"), v.literal("qualified"), v.literal("proposal"),
  v.literal("negotiation"), v.literal("closed_won"), v.literal("closed_lost")
);

const serviceVal = v.union(
  v.literal("retouching"), v.literal("digitalTech"), v.literal("aiImageGen"), v.literal("other")
);

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("pipeline").order("desc").collect(),
});

export const listByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db.query("pipeline").withIndex("by_client", q => q.eq("clientId", args.clientId)).collect();
  },
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("pipeline").collect();
    const stages = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
    const byStage = Object.fromEntries(stages.map(s => [s, { count: 0, value: 0 }]));
    for (const deal of all) {
      byStage[deal.stage].count++;
      byStage[deal.stage].value += deal.value || 0;
    }
    return { byStage, totalValue: all.reduce((s, d) => s + (d.value || 0), 0), totalDeals: all.length };
  },
});

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    service: serviceVal,
    value: v.optional(v.number()),
    stage: stageVal,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("pipeline", { ...args, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: {
    id: v.id("pipeline"),
    service: v.optional(serviceVal),
    value: v.optional(v.number()),
    stage: v.optional(stageVal),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("pipeline") },
  handler: async (ctx, args) => await ctx.db.delete(args.id),
});
