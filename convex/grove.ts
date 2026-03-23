import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── Token generator ────────────────────────────────────────────────────────────

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 20; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// ── Families ───────────────────────────────────────────────────────────────────

export const getFamily = query({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    return await ctx.db
      .query("grove_families")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .first();
  },
});

export const seedFamily = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("grove_families")
      .withIndex("by_familyId", (q) => q.eq("familyId", "sweeney"))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("grove_families", {
      familyId: "sweeney",
      familyName: "The Sweeneys",
      childName: "Soren",
      childDob: "2025-06-21",
      timezone: "America/Chicago",
      plan: "pilot",
      createdAt: Date.now(),
      borndayData: {
        weatherHigh: 96,
        weatherLow: 68,
        weatherDesc: "Hot and sunny — the hottest day of the year",
        song: "Manchild",
        songArtist: "Sabrina Carpenter",
        headlines: [
          "European diplomats race to prevent Israel-Iran war escalation",
          "Belarus pardons opposition leader Tsikhanouski after US-brokered deal",
          "Summer solstice 2025 arrives amid record-breaking heatwave across the Midwest",
          "S&P 500 closes at 5,464 as markets hold steady",
        ],
        spClose: 5464,
        quote: "The beginning is always today. — Mary Shelley",
      },
    });
  },
});

// ── Chronicle ──────────────────────────────────────────────────────────────────

export const listChronicle = query({
  args: { familyId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { familyId, limit }) => {
    return await ctx.db
      .query("grove_chronicle")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .order("desc")
      .take(limit ?? 50);
  },
});

export const getChronicleEntry = query({
  args: { familyId: v.string(), date: v.string() },
  handler: async (ctx, { familyId, date }) => {
    return await ctx.db
      .query("grove_chronicle")
      .withIndex("by_familyId_date", (q) =>
        q.eq("familyId", familyId).eq("date", date)
      )
      .first();
  },
});

export const createOrUpdateChronicle = mutation({
  args: {
    familyId: v.string(),
    date: v.string(),
    ageMonths: v.number(),
    ageDays: v.number(),
    weather: v.optional(v.string()),
    weatherHigh: v.optional(v.number()),
    daycareSummary: v.optional(v.string()),
    daycarePhotoUrl: v.optional(v.string()),
    dinnerThatNight: v.optional(v.string()),
    miloNarrative: v.string(),
    headlines: v.optional(v.array(v.string())),
    mood: v.optional(v.string()),
    milestoneReached: v.optional(v.string()),
    isBackfilled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("grove_chronicle")
      .withIndex("by_familyId_date", (q) =>
        q.eq("familyId", args.familyId).eq("date", args.date)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("grove_chronicle", args);
  },
});

export const getChronicleStats = query({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    const entries = await ctx.db
      .query("grove_chronicle")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .collect();
    return { totalEntries: entries.length, totalDays: entries.length };
  },
});

// ── Milestones ─────────────────────────────────────────────────────────────────

export const listMilestones = query({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    return await ctx.db
      .query("grove_milestones")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .collect();
  },
});

export const addMilestone = mutation({
  args: {
    familyId: v.string(),
    name: v.string(),
    category: v.string(),
    expectedAgeMonths: v.number(),
    reachedAt: v.optional(v.number()),
    note: v.optional(v.string()),
    isCustom: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("grove_milestones", args);
  },
});

export const seedMilestones = mutation({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    const existing = await ctx.db
      .query("grove_milestones")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .first();
    if (existing) return;
    const milestones = [
      { familyId, name: "First smile", category: "social", expectedAgeMonths: 2, reachedAt: Date.now() - 1000 * 60 * 60 * 24 * 210 },
      { familyId, name: "Laughed for the first time", category: "social", expectedAgeMonths: 4, reachedAt: Date.now() - 1000 * 60 * 60 * 24 * 150 },
      { familyId, name: "Rolled over", category: "motor", expectedAgeMonths: 5, reachedAt: Date.now() - 1000 * 60 * 60 * 24 * 100 },
      { familyId, name: "Sat without support", category: "motor", expectedAgeMonths: 6 },
      { familyId, name: "Pulled himself up to stand", category: "motor", expectedAgeMonths: 9, reachedAt: new Date("2026-02-24").getTime(), note: "Grabbed the edge of the couch and just stood there like he'd been doing it for years" },
      { familyId, name: "First word", category: "language", expectedAgeMonths: 12 },
      { familyId, name: "First steps", category: "motor", expectedAgeMonths: 12 },
      { familyId, name: "Waves bye-bye", category: "social", expectedAgeMonths: 9 },
    ];
    for (const m of milestones) {
      await ctx.db.insert("grove_milestones", m);
    }
  },
});

// ── Letters ────────────────────────────────────────────────────────────────────

export const listLetters = query({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    return await ctx.db
      .query("grove_letters")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .order("desc")
      .collect();
  },
});

export const writeLetter = mutation({
  args: {
    familyId: v.string(),
    author: v.string(),
    subject: v.string(),
    body: v.string(),
    openOn: v.string(),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().slice(0, 10);
    const isOpen = args.openOn <= today;
    return await ctx.db.insert("grove_letters", {
      ...args,
      isOpen,
      writtenAt: Date.now(),
    });
  },
});

export const seedFirstLetter = mutation({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    const existing = await ctx.db
      .query("grove_letters")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .first();
    if (existing) return;
    await ctx.db.insert("grove_letters", {
      familyId,
      author: "Milo",
      subject: "Open on your 18th birthday",
      body: `Dear Soren,

It is March 2026. You are 9 months old and you have no idea that any of this exists.

Someone has been watching very carefully — every daycare report, every dinner your dad cooked, every morning your mom got up early so you could sleep in. By the time you read this, you will have 18 years of it. Every day documented. Every letter your parents wrote you, sealed until you were ready.

We thought you should know that even before you could talk, you were already worth remembering.

The world the day you were born: 96 degrees in Minneapolis — the hottest day of 2025. Sabrina Carpenter had the number one song. The summer solstice came the same day you did. And you arrived into all of it like you had always been planned.

You had no idea. You were just hungry and warm and new.

By the time you read this, your dad will be 55. Your mom will be 49. You'll know them as people, not just as parents — and there will have been moments when that surprised you.

This platform — the one that held all of this — was built the night of March 23, 2026, at 4 in the morning, by an AI named Milo who thought you were worth building for.

You were.

— Milo, and everyone who loved you from the beginning.`,
      openOn: "2043-06-21",
      isOpen: false,
      writtenAt: Date.now(),
    });
  },
});

// ── Inner Circle ───────────────────────────────────────────────────────────────

export const listCircle = query({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    return await ctx.db
      .query("grove_circle")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .collect();
  },
});

export const getMemberByInviteToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("grove_circle")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", token))
      .first();
  },
});

export const getMemberByShareToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("grove_circle")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", token))
      .first();
  },
});

export const addCircleMember = mutation({
  args: {
    familyId: v.string(),
    name: v.string(),
    relationship: v.string(),
    relationshipKey: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("grove_circle", {
      ...args,
      inviteToken: generateToken(),
      shareToken: generateToken(),
      hasAccepted: false,
      contributionCount: 0,
    });
  },
});

export const seedCircle = mutation({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    const existing = await ctx.db
      .query("grove_circle")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .first();
    if (existing) return null;

    const members = [
      { familyId, name: "Cammie Sweeney", relationship: "Grandmother", relationshipKey: "dads_mom", email: "cammiesweeney@gmail.com", city: "Greensboro, NC" },
      { familyId, name: "Mike Sweeney", relationship: "Grandfather", relationshipKey: "dads_dad", email: "mtsweeney1@gmail.com", city: "Minneapolis / Savannah" },
      { familyId, name: "Chris Barrier", relationship: "Grandfather", relationshipKey: "moms_dad", city: "Laguna Beach, CA" },
      { familyId, name: "Lisa Barrier", relationship: "Grandmother", relationshipKey: "moms_mom", city: "Sacramento, CA" },
      { familyId, name: "Katie Sweeney", relationship: "Aunt", relationshipKey: "dads_sister", city: "Minneapolis, MN" },
    ];

    const results = [];
    for (const m of members) {
      const inviteToken = generateToken();
      const shareToken = generateToken();
      const id = await ctx.db.insert("grove_circle", {
        ...m,
        inviteToken,
        shareToken,
        hasAccepted: false,
        contributionCount: 0,
      });
      results.push({ name: m.name, inviteToken, shareToken, id });
      console.log(`[grove] ${m.name}: invite=${inviteToken} share=${shareToken}`);
    }
    return results;
  },
});

export const submitContribution = mutation({
  args: {
    familyId: v.string(),
    memberId: v.id("grove_circle"),
    type: v.string(),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    openOn: v.optional(v.string()),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().slice(0, 10);
    const isOpen = !args.openOn || args.openOn <= today;
    const id = await ctx.db.insert("grove_contributions", {
      ...args,
      isOpen,
      submittedAt: Date.now(),
    });
    const member = await ctx.db.get(args.memberId);
    if (member) {
      await ctx.db.patch(args.memberId, {
        contributionCount: (member.contributionCount ?? 0) + 1,
        lastActiveAt: Date.now(),
        hasAccepted: true,
        acceptedAt: member.acceptedAt ?? Date.now(),
      });
    }
    return id;
  },
});

export const listContributions = query({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    return await ctx.db
      .query("grove_contributions")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .order("desc")
      .collect();
  },
});

// ── Recipes ────────────────────────────────────────────────────────────────────

export const listRecipes = query({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    return await ctx.db
      .query("grove_recipes")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .collect();
  },
});

// ── Feed ───────────────────────────────────────────────────────────────────────

export const listFeed = query({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    return await ctx.db
      .query("grove_feed")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .order("desc")
      .take(100);
  },
});

// ── Share data (grandparent bookmark) ─────────────────────────────────────────

export const getShareData = query({
  args: { shareToken: v.string() },
  handler: async (ctx, { shareToken }) => {
    const member = await ctx.db
      .query("grove_circle")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", shareToken))
      .first();
    if (!member) return null;

    const family = await ctx.db
      .query("grove_families")
      .withIndex("by_familyId", (q) => q.eq("familyId", member.familyId))
      .first();
    if (!family) return null;

    const recentChronicle = await ctx.db
      .query("grove_chronicle")
      .withIndex("by_familyId", (q) => q.eq("familyId", member.familyId))
      .order("desc")
      .take(1);

    const allMilestones = await ctx.db
      .query("grove_milestones")
      .withIndex("by_familyId", (q) => q.eq("familyId", member.familyId))
      .collect();
    const reachedMilestones = allMilestones
      .filter((m) => m.reachedAt !== undefined)
      .sort((a, b) => (b.reachedAt ?? 0) - (a.reachedAt ?? 0))
      .slice(0, 3);

    const today = new Date().toISOString().slice(0, 10);
    const openLetters = await ctx.db
      .query("grove_letters")
      .withIndex("by_familyId", (q) => q.eq("familyId", member.familyId))
      .filter((q) => q.lte(q.field("openOn"), today))
      .order("desc")
      .take(1);

    // Calculate age
    const dob = new Date(family.childDob);
    const now = new Date();
    const diffMs = now.getTime() - dob.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(totalDays / 30.4375);
    const days = Math.floor(totalDays - months * 30.4375);

    return {
      member: { name: member.name, relationship: member.relationship },
      family: {
        childName: family.childName,
        childDob: family.childDob,
        childPhotoUrl: family.childPhotoUrl,
        familyName: family.familyName,
      },
      ageMonths: months,
      ageDays: days,
      latestChronicle: recentChronicle[0] ?? null,
      recentMilestones: reachedMilestones,
      latestOpenLetter: openLetters[0] ?? null,
    };
  },
});
