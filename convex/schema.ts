import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    assignee: v.union(v.literal("Dave"), v.literal("Milo")),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  memories: defineTable({
    title: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).searchIndex("search_memories", {
    searchField: "content",
    filterFields: ["category"],
  }),

  events: defineTable({
    title: v.string(),
    description: v.string(),
    date: v.string(),
    time: v.optional(v.string()),
    type: v.union(
      v.literal("task"),
      v.literal("cron"),
      v.literal("reminder"),
      v.literal("event")
    ),
    createdAt: v.number(),
  }),

  content: defineTable({
    title: v.string(),
    platform: v.union(
      v.literal("Instagram"),
      v.literal("Twitter"),
      v.literal("LinkedIn"),
      v.literal("Blog")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("scheduled"),
      v.literal("published")
    ),
    scheduledDate: v.optional(v.string()),
    notes: v.string(),
    mediaUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  contacts: defineTable({
    name: v.string(),
    role: v.string(),
    company: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.string(),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  clients: defineTable({
    name: v.string(),
    website: v.optional(v.string()),
    category: v.union(
      v.literal("DTC/CPG"),
      v.literal("Agency"),
      v.literal("E-commerce"),
      v.literal("Fashion"),
      v.literal("AI Opportunity")
    ),
    location: v.optional(v.string()),
    estimatedRevenue: v.optional(v.string()),
    status: v.union(
      v.literal("prospect"),
      v.literal("contacted"),
      v.literal("responded"),
      v.literal("meeting"),
      v.literal("proposal"),
      v.literal("active"),
      v.literal("inactive")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  crmContacts: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    emailConfidence: v.optional(
      v.union(v.literal("verified"), v.literal("constructed"), v.literal("unknown"))
    ),
    linkedIn: v.optional(v.string()),
    phone: v.optional(v.string()),
    isPrimary: v.boolean(),
    notes: v.optional(v.string()),
  }).index("by_client", ["clientId"]),

  outreach: defineTable({
    contactId: v.id("crmContacts"),
    type: v.union(
      v.literal("initial"),
      v.literal("followUp1"),
      v.literal("followUp2"),
      v.literal("breakup")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("opened"),
      v.literal("replied"),
      v.literal("bounced")
    ),
    sentAt: v.optional(v.number()),
    subject: v.optional(v.string()),
    templateUsed: v.optional(v.string()),
    responseNotes: v.optional(v.string()),
    nextFollowUpDate: v.optional(v.string()),
  }).index("by_contact", ["contactId"])
    .index("by_status", ["status"])
    .index("by_nextFollowUp", ["nextFollowUpDate"]),

  pipeline: defineTable({
    clientId: v.id("clients"),
    service: v.union(
      v.literal("retouching"),
      v.literal("digitalTech"),
      v.literal("aiImageGen"),
      v.literal("other")
    ),
    value: v.optional(v.number()),
    stage: v.union(
      v.literal("lead"),
      v.literal("qualified"),
      v.literal("proposal"),
      v.literal("negotiation"),
      v.literal("closed_won"),
      v.literal("closed_lost")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_client", ["clientId"])
    .index("by_stage", ["stage"]),
});
