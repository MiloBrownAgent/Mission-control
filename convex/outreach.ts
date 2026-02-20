import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("outreach").order("desc").collect(),
});

export const listByContact = query({
  args: { contactId: v.id("crmContacts") },
  handler: async (ctx, args) => {
    return await ctx.db.query("outreach").withIndex("by_contact", q => q.eq("contactId", args.contactId)).collect();
  },
});

export const dueToday = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const all = await ctx.db.query("outreach").withIndex("by_nextFollowUp").collect();
    return all.filter(o => o.nextFollowUpDate && o.nextFollowUpDate <= today && o.status !== "replied" && o.status !== "bounced");
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("outreach").collect();
    return {
      total: all.length,
      draft: all.filter(o => o.status === "draft").length,
      sent: all.filter(o => o.status === "sent").length,
      opened: all.filter(o => o.status === "opened").length,
      replied: all.filter(o => o.status === "replied").length,
      bounced: all.filter(o => o.status === "bounced").length,
    };
  },
});

export const create = mutation({
  args: {
    contactId: v.id("crmContacts"),
    type: v.union(v.literal("initial"), v.literal("followUp1"), v.literal("followUp2"), v.literal("breakup")),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("opened"), v.literal("replied"), v.literal("bounced")),
    sentAt: v.optional(v.number()),
    subject: v.optional(v.string()),
    templateUsed: v.optional(v.string()),
    responseNotes: v.optional(v.string()),
    nextFollowUpDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => await ctx.db.insert("outreach", args),
});

export const update = mutation({
  args: {
    id: v.id("outreach"),
    type: v.optional(v.union(v.literal("initial"), v.literal("followUp1"), v.literal("followUp2"), v.literal("breakup"))),
    status: v.optional(v.union(v.literal("draft"), v.literal("sent"), v.literal("opened"), v.literal("replied"), v.literal("bounced"))),
    sentAt: v.optional(v.number()),
    subject: v.optional(v.string()),
    templateUsed: v.optional(v.string()),
    responseNotes: v.optional(v.string()),
    nextFollowUpDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("outreach") },
  handler: async (ctx, args) => await ctx.db.delete(args.id),
});
