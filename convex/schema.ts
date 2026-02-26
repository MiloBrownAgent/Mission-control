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

  activityLog: defineTable({
    message: v.string(),
    type: v.union(v.literal("success"), v.literal("info"), v.literal("warning")),
    category: v.union(v.literal("cron"), v.literal("task"), v.literal("system")),
    timestamp: v.number(),
  }),

  meals: defineTable({
    weekStart: v.string(),
    day: v.union(
      v.literal("Monday"),
      v.literal("Tuesday"),
      v.literal("Wednesday"),
      v.literal("Thursday"),
      v.literal("Friday"),
      v.literal("Saturday"),
      v.literal("Sunday")
    ),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner")
    ),
    name: v.string(),
    notes: v.optional(v.string()),
    sorenMeal: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_week", ["weekStart"])
    .index("by_week_day_meal", ["weekStart", "day", "mealType"]),

  groceryLists: defineTable({
    weekStart: v.string(),
    items: v.string(),
    updatedAt: v.number(),
  }).index("by_week", ["weekStart"]),

  groceryItems: defineTable({
    text: v.string(),
    checked: v.boolean(),
    category: v.optional(v.string()),
    addedAt: v.number(),
    addedBy: v.optional(v.string()),
  })
    .index("by_checked", ["checked"])
    .index("by_added", ["addedAt"]),

  daycareReports: defineTable({
    date: v.string(),           // "2026-02-18"
    childName: v.string(),
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    totalTime: v.optional(v.string()),
    meals: v.optional(v.number()),
    totalSleep: v.optional(v.string()),
    totalNaps: v.optional(v.number()),
    photoUrl: v.optional(v.string()),
    rawSubject: v.optional(v.string()),
    parsedAt: v.number(),
  }).index("by_date", ["date"]),

  weekendActivities: defineTable({
    title: v.string(),
    description: v.string(),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    driveTime: v.optional(v.string()),
    cost: v.optional(v.string()),
    category: v.string(),
    ageNote: v.optional(v.string()),
    url: v.optional(v.string()),
    source: v.optional(v.string()),
    weekOf: v.string(),       // Saturday date: "2026-02-28"
    rank: v.number(),         // 1–15
  })
    .index("by_week", ["weekOf"])
    .index("by_week_rank", ["weekOf", "rank"]),

  classBookings: defineTable({
    member: v.string(),                // "Amanda" | "Dave"
    className: v.string(),             // "CTR" | "Alpha Strength: Squat + Pull"
    classDate: v.string(),             // "2026-03-01"
    classTime: v.string(),             // "10:00 AM"
    location: v.optional(v.string()),  // "Reformer Studio, Highland Park"
    instructor: v.optional(v.string()),
    status: v.union(
      v.literal("booked"),
      v.literal("waitlisted"),
      v.literal("cancelled"),
    ),
    regId: v.optional(v.number()),
    spot: v.optional(v.string()),
    waitlistSpot: v.optional(v.string()),
    bookedAt: v.number(),
  })
    .index("by_date", ["classDate"])
    .index("by_member_date", ["member", "classDate"]),

  clientLinks: defineTable({
    token: v.string(),
    clientSlug: v.string(),
    folderPath: v.string(),
    label: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_client", ["clientSlug"]),

  dropboxConfig: defineTable({
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    connectedAt: v.number(),
  }),

  actionItems: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("LS"),
      v.literal("OurFable"),
      v.literal("Personal"),
      v.literal("Ops"),
    ),
    impact: v.string(),
    effort: v.string(),
    status: v.union(
      v.literal("proposed"),
      v.literal("approved"),
      v.literal("implementing"),
      v.literal("done"),
      v.literal("skipped"),
    ),
    generatedDate: v.string(),
    approvedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_date", ["generatedDate"])
    .index("by_status", ["status"]),
});
