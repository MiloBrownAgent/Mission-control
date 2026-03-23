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
    owner: v.string(),
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

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("milo_todos").collect();
    for (const t of all) await ctx.db.delete(t._id);
    return all.length;
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("milo_todos").first();
    if (existing) return "already seeded";

    const t = Date.now();
    const todos = [
      // ── DAVE owns these ────────────────────────────────────────────────
      {
        title: "Set up sweeney.family sending domain in Resend",
        notes: "Create a new free Resend account at resend.com, add sweeney.family as a domain. I'll handle DNS records once you're in. Needed so Grove invites send from grove@sweeney.family.",
        category: "grove",
        priority: "high",
        owner: "dave",
        source: "dave",
        status: "open",
        addedAt: t - 100,
      },
      {
        title: "Confirm Soren's pediatric appointment today — 8:45 AM",
        notes: "Dr. Mahady. Pre-registration pending at appointment.",
        category: "family",
        priority: "high",
        owner: "dave",
        source: "milo",
        status: "open",
        addedAt: t - 200,
      },
      {
        title: "Labcorp bloodwork — 2:00 PM today",
        notes: "TRT baseline labs. Results will drive protocol decision.",
        category: "personal",
        priority: "high",
        owner: "dave",
        source: "milo",
        status: "open",
        addedAt: t - 300,
      },
      {
        title: "Nijo Castle Sakura Nights tickets — April 8, Kyoto",
        notes: "Dave needs to book directly. Evening illumination event during cherry blossom season. Book before selling out.",
        category: "personal",
        priority: "high",
        owner: "dave",
        source: "milo",
        status: "open",
        addedAt: t - 400,
      },
      {
        title: "Kindfull invoice — confirm rate and submit expenses",
        notes: "Outstanding invoice rate needs confirmation from Dave before Milo can finalize.",
        category: "business",
        priority: "medium",
        owner: "dave",
        source: "milo",
        status: "open",
        addedAt: t - 500,
      },
      {
        title: "Rainbow Lawn Care — unpaid balance",
        notes: "Outstanding balance needs to be settled.",
        category: "ops",
        priority: "medium",
        owner: "dave",
        source: "milo",
        status: "open",
        addedAt: t - 600,
      },
      {
        title: "Mailchimp — Sweeney330 campaign decision",
        notes: "Deadline March 28. Dave needs to decide go/no-go on the campaign.",
        category: "business",
        priority: "medium",
        owner: "dave",
        source: "milo",
        status: "open",
        addedAt: t - 700,
      },
      {
        title: "FedEx HELIONS book — $78.30",
        notes: "Outstanding FedEx charge for the HELIONS book delivery.",
        category: "ops",
        priority: "low",
        owner: "dave",
        source: "milo",
        status: "open",
        addedAt: t - 800,
      },
      // ── MILO owns these ────────────────────────────────────────────────
      {
        title: "Grove — Replace Chronicle with World Snapshot",
        notes: "Remove daily Chronicle. Build auto-generated monthly snapshot: headlines, #1 song, market close, sports. One optional family note line. Zero maintenance at any age.",
        category: "grove",
        priority: "high",
        owner: "milo",
        source: "dave",
        status: "open",
        addedAt: t - 900,
      },
      {
        title: "Grove — Rebuild home page (current-focused)",
        notes: "Lead with Soren's age today, latest milestone, latest letter, latest photo. Circle second. World Snapshot third. Chronicle removed.",
        category: "grove",
        priority: "high",
        owner: "milo",
        source: "dave",
        status: "open",
        addedAt: t - 1000,
      },
      {
        title: "Grove — Milestone checklist UI (pre-populated + tap to log)",
        notes: "40-50 universal milestones as a checklist. Tap = logged. Optional note/date. Custom milestone = one text field. Circle members can suggest milestones parents confirm with one tap.",
        category: "grove",
        priority: "high",
        owner: "milo",
        source: "dave",
        status: "open",
        addedAt: t - 1100,
      },
      {
        title: "Grove — PWA manifest (add to home screen)",
        notes: "Grove needs to work as a PWA so families can install it from Safari/Chrome without App Store friction.",
        category: "grove",
        priority: "medium",
        owner: "milo",
        source: "milo",
        status: "open",
        addedAt: t - 1200,
      },
      {
        title: "Price update cron — every 15 min during market hours",
        notes: "Standalone script, not heartbeat. Portfolio prices on Health Command Center refresh automatically.",
        category: "infra",
        priority: "medium",
        owner: "milo",
        source: "milo",
        status: "open",
        addedAt: t - 1300,
      },
      {
        title: "Confirm Muromachi Wakuden dinner — April 6, Kyoto",
        notes: "Request sent Mar 22. Still awaiting confirmation from restaurant. Follow up before Japan departure.",
        category: "personal",
        priority: "medium",
        owner: "milo",
        source: "milo",
        status: "open",
        addedAt: t - 1400,
      },
      {
        title: "LS Client Portal — set PORTAL_SECRET env var in Vercel",
        notes: "Portal is built and deployed. Blocker: PORTAL_SECRET must be set in Vercel look-and-seen project before go-live.",
        category: "infra",
        priority: "medium",
        owner: "milo",
        source: "milo",
        status: "open",
        addedAt: t - 1500,
      },
    ];

    for (const todo of todos) {
      await ctx.db.insert("milo_todos", todo);
    }
    return `seeded ${todos.length} todos`;
  },
});
