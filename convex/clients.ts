import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const clientStatus = v.union(
  v.literal("prospect"), v.literal("contacted"), v.literal("responded"),
  v.literal("meeting"), v.literal("proposal"), v.literal("active"), v.literal("inactive")
);

const clientCategory = v.union(
  v.literal("DTC/CPG"), v.literal("Agency"), v.literal("E-commerce"),
  v.literal("Fashion"), v.literal("AI Opportunity")
);

export const list = query({
  args: {
    status: v.optional(clientStatus),
    category: v.optional(clientCategory),
  },
  handler: async (ctx, args) => {
    let clients = await ctx.db.query("clients").order("desc").collect();
    if (args.status) clients = clients.filter(c => c.status === args.status);
    if (args.category) clients = clients.filter(c => c.category === args.category);
    return clients;
  },
});

export const get = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    name: v.string(),
    website: v.optional(v.string()),
    category: clientCategory,
    location: v.optional(v.string()),
    estimatedRevenue: v.optional(v.string()),
    status: clientStatus,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("clients", { ...args, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    name: v.optional(v.string()),
    website: v.optional(v.string()),
    category: v.optional(clientCategory),
    location: v.optional(v.string()),
    estimatedRevenue: v.optional(v.string()),
    status: v.optional(clientStatus),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => await ctx.db.delete(args.id),
});

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    const pipeline = await ctx.db.query("pipeline").collect();
    const outreach = await ctx.db.query("outreach").collect();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return {
      totalProspects: clients.filter(c => c.status === "prospect").length,
      contacted: clients.filter(c => c.status === "contacted").length,
      responded: clients.filter(c => c.status === "responded").length,
      activeClients: clients.filter(c => c.status === "active").length,
      totalClients: clients.length,
      pipelineValue: pipeline.reduce((sum, p) => sum + (p.value || 0), 0),
      pipelineCount: pipeline.length,
      outreachSentThisWeek: outreach.filter(o => o.sentAt && o.sentAt > weekAgo).length,
      responseRate: outreach.length > 0
        ? Math.round((outreach.filter(o => o.status === "replied").length / outreach.filter(o => o.status !== "draft").length) * 100) || 0
        : 0,
    };
  },
});
