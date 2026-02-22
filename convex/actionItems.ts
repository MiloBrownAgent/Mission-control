import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get the latest batch of action items (most recent generatedDate)
export const getLatestBatch = query({
  args: {},
  handler: async (ctx) => {
    // Get all items ordered by generatedDate desc, take the latest date
    const all = await ctx.db.query("actionItems").withIndex("by_date").order("desc").take(20);
    if (all.length === 0) return { date: null, items: [] };
    const latestDate = all[0].generatedDate;
    const items = all.filter((item) => item.generatedDate === latestDate);
    return { date: latestDate, items };
  },
});

// Insert a new batch of 10 items (called by the nightly cron agent)
export const bulkInsert = mutation({
  args: {
    generatedDate: v.string(),
    items: v.array(
      v.object({
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
      })
    ),
  },
  handler: async (ctx, { generatedDate, items }) => {
    // Remove any existing proposed items for this date (idempotent)
    const existing = await ctx.db
      .query("actionItems")
      .withIndex("by_date", (q) => q.eq("generatedDate", generatedDate))
      .collect();
    for (const item of existing) {
      if (item.status === "proposed") {
        await ctx.db.delete(item._id);
      }
    }
    // Insert new items
    const ids = [];
    for (const item of items) {
      const id = await ctx.db.insert("actionItems", {
        ...item,
        status: "proposed",
        generatedDate,
      });
      ids.push(id);
    }
    return { ids };
  },
});

// Mark a single item's status
export const updateStatus = mutation({
  args: {
    id: v.id("actionItems"),
    status: v.union(
      v.literal("proposed"),
      v.literal("approved"),
      v.literal("implementing"),
      v.literal("done"),
      v.literal("skipped"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    const patch: Record<string, unknown> = { status };
    if (status === "approved") patch.approvedAt = Date.now();
    if (status === "done") patch.completedAt = Date.now();
    await ctx.db.patch(id, patch);
  },
});

// Bulk approve a set of items by ID
export const bulkApprove = mutation({
  args: {
    ids: v.array(v.id("actionItems")),
  },
  handler: async (ctx, { ids }) => {
    const now = Date.now();
    for (const id of ids) {
      await ctx.db.patch(id, { status: "approved", approvedAt: now });
    }
    return { approved: ids.length };
  },
});
