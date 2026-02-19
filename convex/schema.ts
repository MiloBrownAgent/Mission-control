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
});
