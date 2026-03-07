import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const emailStatus = v.union(
  v.literal("draft"),
  v.literal("approved"),
  v.literal("sent"),
  v.literal("bounced"),
  v.literal("replied"),
  v.literal("skipped")
);

export const list = query({
  args: { status: v.optional(emailStatus) },
  handler: async (ctx, args) => {
    let emails = await ctx.db.query("prospectEmails").order("desc").collect();
    if (args.status) emails = emails.filter(e => e.status === args.status);
    return emails;
  },
});

export const get = query({
  args: { id: v.id("prospectEmails") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    prospectName: v.string(),
    company: v.string(),
    role: v.string(),
    email: v.string(),
    subject: v.string(),
    body: v.string(),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("prospectEmails", {
      ...args,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const approve = mutation({
  args: { id: v.id("prospectEmails") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "approved",
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const unapprove = mutation({
  args: { id: v.id("prospectEmails") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "draft",
      approvedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const markSent = mutation({
  args: { id: v.id("prospectEmails") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "sent",
      sentAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const skip = mutation({
  args: { id: v.id("prospectEmails") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "skipped",
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("prospectEmails"),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(emailStatus),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("prospectEmails").collect();
    return {
      total: all.length,
      draft: all.filter(e => e.status === "draft").length,
      approved: all.filter(e => e.status === "approved").length,
      sent: all.filter(e => e.status === "sent").length,
      replied: all.filter(e => e.status === "replied").length,
      skipped: all.filter(e => e.status === "skipped").length,
    };
  },
});

export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("prospectEmails")
      .withIndex("by_status", q => q.eq("status", "approved"))
      .collect();
  },
});
