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
      childName: "Soren Sweeney",
      childDob: "2025-06-21",
      childEmailAlias: "soren@sweeney.family",
      parentNames: "Dave & Amanda",
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

export const patchFamily = mutation({
  args: {
    familyId: v.string(),
    parentNames: v.optional(v.string()),
    childEmailAlias: v.optional(v.string()),
    childName: v.optional(v.string()),
    childPhotoUrl: v.optional(v.string()),
    borndayData: v.optional(v.object({
      weatherHigh: v.optional(v.number()),
      weatherLow: v.optional(v.number()),
      weatherDesc: v.optional(v.string()),
      song: v.optional(v.string()),
      songArtist: v.optional(v.string()),
      headlines: v.optional(v.array(v.string())),
      spClose: v.optional(v.number()),
      quote: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { familyId, ...patch }) => {
    const existing = await ctx.db
      .query("grove_families")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .first();
    if (!existing) return null;
    await ctx.db.patch(existing._id, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    return existing._id;
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

export const markMilestoneReached = mutation({
  args: {
    milestoneId: v.id("grove_milestones"),
    reachedAt: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { milestoneId, reachedAt, note }) => {
    await ctx.db.patch(milestoneId, {
      reachedAt: reachedAt ?? Date.now(),
      ...(note !== undefined ? { note } : {}),
    });
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

export const getCircleMember = query({
  args: { memberId: v.id("grove_circle") },
  handler: async (ctx, { memberId }) => {
    return await ctx.db.get(memberId);
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

// ── Vault (Contributions v2) ──────────────────────────────────────────────────

export const listVaultEntries = query({
  args: {
    familyId: v.string(),
    includeSealed: v.optional(v.boolean()),
  },
  handler: async (ctx, { familyId, includeSealed = false }) => {
    const all = await ctx.db
      .query("grove_contributions")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .order("desc")
      .collect();
    if (includeSealed) return all;
    return all.filter((e) => e.isOpen);
  },
});

export const listSealedEntries = query({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    return await ctx.db
      .query("grove_contributions")
      .withIndex("by_familyId_isOpen", (q) =>
        q.eq("familyId", familyId).eq("isOpen", false)
      )
      .order("desc")
      .collect();
  },
});

export const unlockEntry = mutation({
  args: {
    entryId: v.id("grove_contributions"),
    byParent: v.optional(v.boolean()),
  },
  handler: async (ctx, { entryId, byParent = false }) => {
    await ctx.db.patch(entryId, {
      isOpen: true,
      openedAt: Date.now(),
      openedByParent: byParent,
    });
  },
});

export const submitVaultEntry = mutation({
  args: {
    familyId: v.string(),
    memberId: v.id("grove_circle"),
    type: v.string(),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    mediaStorageId: v.optional(v.string()),
    mediaMimeType: v.optional(v.string()),
    openOn: v.optional(v.string()),
    unlocksAtAge: v.optional(v.number()),
    unlocksAtEvent: v.optional(v.string()),
    prompt: v.optional(v.string()),
    promptId: v.optional(v.string()),
    submissionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Calculate isOpen based on unlock criteria
    const today = new Date().toISOString().slice(0, 10);
    let isOpen = false;
    if (args.openOn && args.openOn <= today) isOpen = true;
    if (!args.openOn && !args.unlocksAtAge && !args.unlocksAtEvent) isOpen = false; // sealed until parent opens

    const id = await ctx.db.insert("grove_contributions", {
      ...args,
      isOpen,
      submittedAt: Date.now(),
    });

    // Mark prompt as responded if promptId provided
    if (args.submissionToken) {
      const queueEntry = await ctx.db
        .query("grove_prompt_queue")
        .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
        .filter((q) => q.eq(q.field("submissionToken"), args.submissionToken))
        .first();
      if (queueEntry) {
        await ctx.db.patch(queueEntry._id, { status: "responded" });
      }
    }

    // Update member contribution count
    const member = await ctx.db.get(args.memberId);
    if (member) {
      await ctx.db.patch(args.memberId, {
        contributionCount: (member.contributionCount ?? 0) + 1,
        lastActiveAt: Date.now(),
      });
    }

    return id;
  },
});

// Generate Convex upload URL for media (photo/video/voice)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getMediaUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

// ── Prompt Queue ──────────────────────────────────────────────────────────────

export const queuePrompt = mutation({
  args: {
    familyId: v.string(),
    memberId: v.id("grove_circle"),
    promptText: v.string(),
    promptCategory: v.string(),
    promptUnlocksAtAge: v.optional(v.number()),
    promptUnlocksAtEvent: v.optional(v.string()),
    scheduledFor: v.string(),
  },
  handler: async (ctx, args) => {
    const token = generateToken();
    return await ctx.db.insert("grove_prompt_queue", {
      ...args,
      status: "pending",
      submissionToken: token,
    });
  },
});

export const listPromptQueue = query({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    return await ctx.db
      .query("grove_prompt_queue")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .collect();
  },
});

export const getPendingPrompts = query({
  args: { asOfDate: v.string() },
  handler: async (ctx, { asOfDate }) => {
    return await ctx.db
      .query("grove_prompt_queue")
      .withIndex("by_status_scheduledFor", (q) =>
        q.eq("status", "pending")
      )
      .filter((q) => q.lte(q.field("scheduledFor"), asOfDate))
      .collect();
  },
});

export const markPromptSent = mutation({
  args: { promptId: v.id("grove_prompt_queue") },
  handler: async (ctx, { promptId }) => {
    await ctx.db.patch(promptId, { status: "sent", sentAt: Date.now() });
  },
});

export const getPromptByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const prompt = await ctx.db
      .query("grove_prompt_queue")
      .withIndex("by_memberId")
      .filter((q) => q.eq(q.field("submissionToken"), token))
      .first();
    if (!prompt) return null;

    const member = await ctx.db.get(prompt.memberId);
    if (!member) return null;

    const family = await ctx.db
      .query("grove_families")
      .withIndex("by_familyId", (q) => q.eq("familyId", prompt.familyId))
      .first();

    return { prompt, member, family };
  },
});

export const seedPromptQueue = mutation({
  args: { familyId: v.string() },
  handler: async (ctx, { familyId }) => {
    const members = await ctx.db
      .query("grove_circle")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .collect();

    const family = await ctx.db
      .query("grove_families")
      .withIndex("by_familyId", (q) => q.eq("familyId", familyId))
      .first();

    if (!family) return;

    const childName = family.childName.split(" ")[0];
    const today = new Date();

    // Schedule first prompt for each member — 1 week from now, staggered by 2 days each
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const scheduledDate = new Date(today);
      scheduledDate.setDate(scheduledDate.getDate() + 7 + i * 2);

      const prompt = getFirstPromptForRelationship(member.relationshipKey, childName, family.parentNames ?? "Dave & Amanda");
      if (!prompt) continue;

      const existing = await ctx.db
        .query("grove_prompt_queue")
        .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
        .first();

      if (!existing) {
        const token = generateToken();
        await ctx.db.insert("grove_prompt_queue", {
          familyId,
          memberId: member._id,
          promptText: prompt.text,
          promptCategory: prompt.category,
          promptUnlocksAtAge: prompt.unlocksAtAge,
          promptUnlocksAtEvent: prompt.unlocksAtEvent,
          scheduledFor: scheduledDate.toISOString().slice(0, 10),
          status: "pending",
          submissionToken: token,
        });
      }
    }
  },
});

// ── Prompt library ────────────────────────────────────────────────────────────

interface PromptDef {
  text: string;
  category: string;
  unlocksAtAge?: number;
  unlocksAtEvent?: string;
}

// Map circle relationship keys to prompt library keys
const KEY_MAP: Record<string, string> = {
  dads_mom: "grandmother",
  moms_mom: "grandmother",
  dads_dad: "grandfather",
  moms_dad: "grandfather",
  dads_sister: "aunt",
  moms_sister: "aunt",
  dads_brother: "uncle",
  moms_brother: "uncle",
  dads_best_friend: "dads_best_friend",
  moms_best_friend: "moms_best_friend",
  family_friend: "family_friend",
  godparent: "godparent",
  cousin: "cousin",
  grandmother: "grandmother",
  grandfather: "grandfather",
  aunt: "aunt",
  uncle: "uncle",
};

function resolvePromptKey(relationshipKey: string): string {
  return KEY_MAP[relationshipKey] ?? "family_friend";
}

function getFirstPromptForRelationship(
  relationshipKey: string,
  childName: string,
  parentNames: string
): PromptDef | null {
  const key = resolvePromptKey(relationshipKey);
  const prompts = PROMPT_LIBRARY[key] ?? PROMPT_LIBRARY["family_friend"];
  return prompts?.[0]
    ? {
        ...prompts[0],
        text: prompts[0].text
          .replace(/\{childName\}/g, childName)
          .replace(/\{parentNames\}/g, parentNames),
      }
    : null;
}

export function getPromptsForRelationship(
  relationshipKey: string,
  childName: string,
  parentNames: string
): PromptDef[] {
  const key = resolvePromptKey(relationshipKey);
  const prompts = PROMPT_LIBRARY[key] ?? PROMPT_LIBRARY["family_friend"];
  return prompts.map((p) => ({
    ...p,
    text: p.text
      .replace(/\{childName\}/g, childName)
      .replace(/\{parentNames\}/g, parentNames),
  }));
}

const PROMPT_LIBRARY: Record<string, PromptDef[]> = {
  grandmother: [
    {
      text: "Tell {childName} a story about when you were growing up. What was one of the most impactful moments of your life — something you'd want them to carry with them?",
      category: "story",
      unlocksAtAge: 13,
    },
    {
      text: "Share a photo of yourself when you were young — around {childName}'s age someday — with a few lines about what life was like then. What do you wish someone had told you?",
      category: "photo",
      unlocksAtAge: 16,
    },
    {
      text: "Record a voice memo telling {childName} how you'd like to be remembered. What do you want them to know about you — not the grandmother role, but the person you are?",
      category: "voice",
      unlocksAtAge: 18,
    },
    {
      text: "Write a letter to {childName} for their wedding day. What do you know about love, about making a life with someone, that took you years to understand?",
      category: "memory",
      unlocksAtEvent: "wedding",
    },
  ],
  grandfather: [
    {
      text: "Tell {childName} about the work of your life — what you built, what you're proud of, what you'd do differently. What does a life well-lived look like to you?",
      category: "wisdom",
      unlocksAtAge: 18,
    },
    {
      text: "Share a photo of yourself with {parentNames} — one that tells a story. Write a sentence or two about what was happening that day.",
      category: "photo",
      unlocksAtAge: 13,
    },
    {
      text: "Record a voice memo for {childName}. Tell them one thing about being a person in this world that you wish someone had told you when you were young.",
      category: "voice",
      unlocksAtAge: 16,
    },
    {
      text: "Write {childName} a letter for when they graduate. What advice do you have for someone stepping out into the world for the first time?",
      category: "memory",
      unlocksAtEvent: "graduation",
    },
  ],
  great_grandmother: [
    {
      text: "Record a voice memo for {childName} explaining how you would like them to remember you when you're gone. Speak directly to them — they'll hear your voice someday.",
      category: "voice",
      unlocksAtAge: 18,
    },
    {
      text: "Tell {childName} about the world as you knew it growing up. What was different? What stayed the same? What do you want them to know about where the family comes from?",
      category: "story",
      unlocksAtAge: 16,
    },
  ],
  great_grandfather: [
    {
      text: "Record a voice memo for {childName}. Tell them about the hardest thing you've ever done — and what it taught you.",
      category: "voice",
      unlocksAtAge: 18,
    },
    {
      text: "Tell {childName} one thing about the family — where you came from, what you built, what you want them to carry forward.",
      category: "story",
      unlocksAtAge: 16,
    },
  ],
  aunt: [
    {
      text: "Share a photo of you with {parentNames} — the sillier the better — with a story behind it. What do you want {childName} to know about who their parent was before they were a parent?",
      category: "photo",
      unlocksAtAge: 13,
    },
    {
      text: "Write a letter to {childName} for when they're a teenager. What's something you know about growing up that would have been useful at 16?",
      category: "memory",
      unlocksAtAge: 16,
    },
  ],
  uncle: [
    {
      text: "Share a photo of you and {parentNames} — something candid, real, from before {childName} was born. Write a sentence about what was happening.",
      category: "photo",
      unlocksAtAge: 13,
    },
    {
      text: "Write {childName} a letter for when they graduate. What advice do you actually wish someone had given you?",
      category: "wisdom",
      unlocksAtEvent: "graduation",
    },
  ],
  family_friend: [
    {
      text: "You've been part of {childName}'s family circle. Submit a photo of you with their parents — with a little backstory. What moment does it capture?",
      category: "photo",
      unlocksAtAge: 13,
    },
    {
      text: "Write {childName} something for when they're older. What's one thing you know about life that took you too long to learn?",
      category: "wisdom",
      unlocksAtAge: 18,
    },
  ],
  dads_best_friend: [
    {
      text: "Submit a photo of you and {parentNames}. Make sure it's age-appropriate — {childName} will see this when they turn 13. Write a little backstory behind the photo.",
      category: "photo",
      unlocksAtAge: 13,
    },
    {
      text: "Tell {childName} a story about their dad that he'd probably never tell himself. Keep it real, keep it warm — they'll read this when they're older.",
      category: "story",
      unlocksAtAge: 18,
    },
    {
      text: "Record a voice memo or write a note for {childName} about what their father was like before he was a dad. What should they know about him?",
      category: "voice",
      unlocksAtAge: 16,
    },
  ],
  moms_best_friend: [
    {
      text: "Submit a photo of you and {parentNames} — something real, from before {childName} was born. Write a few lines about what was happening.",
      category: "photo",
      unlocksAtAge: 13,
    },
    {
      text: "Tell {childName} something about their mother that she would never say about herself. What do you see in her that they should know?",
      category: "story",
      unlocksAtAge: 18,
    },
  ],
  godparent: [
    {
      text: "You are {childName}'s godparent. Write them a letter for when they turn 18 — about what that role meant to you, and what you hope for them.",
      category: "memory",
      unlocksAtAge: 18,
    },
    {
      text: "Share something you want {childName} to know about faith, values, or how to be a good person. You can write it, record it, or send a photo — whatever feels right.",
      category: "wisdom",
      unlocksAtAge: 16,
    },
  ],
  cousin: [
    {
      text: "Write {childName} a note for when they're a teenager. What's it like growing up in this family? What do you want them to know about being part of it?",
      category: "memory",
      unlocksAtAge: 13,
    },
  ],
};
