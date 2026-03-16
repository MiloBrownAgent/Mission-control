import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ──────────────────────────────────────────────

export const listProperties = query({
  args: {
    city: v.optional(v.string()),
    status: v.optional(v.string()),
    propertyType: v.optional(v.string()),
    minScore: v.optional(v.number()),
    sortBy: v.optional(v.string()), // "score" | "price" | "newest" | "priceSF"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    let results = await ctx.db.query("creProperties").collect();

    // Filter out off_market unless specifically requested
    if (args.status) {
      results = results.filter((p) => p.status === args.status);
    } else {
      results = results.filter((p) => p.status !== "off_market");
    }
    if (args.city) results = results.filter((p) => p.city === args.city);
    if (args.propertyType) results = results.filter((p) => p.propertyType === args.propertyType);
    if (args.minScore != null) results = results.filter((p) => p.score >= args.minScore!);

    const sortBy = args.sortBy ?? "score";
    if (sortBy === "score") results.sort((a, b) => b.score - a.score);
    else if (sortBy === "price") results.sort((a, b) => a.askPrice - b.askPrice);
    else if (sortBy === "newest") results.sort((a, b) => b.createdAt - a.createdAt);
    else if (sortBy === "priceSF")
      results.sort((a, b) => (a.pricePerSF ?? Infinity) - (b.pricePerSF ?? Infinity));

    return results.slice(0, limit);
  },
});

export const getProperty = query({
  args: { id: v.id("creProperties") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const listWatchlist = query({
  args: {},
  handler: async (ctx) => {
    const watchlist = await ctx.db.query("creWatchlist").collect();
    const results = [];
    for (const item of watchlist) {
      const property = await ctx.db.get(item.propertyId);
      if (property) results.push({ ...item, property });
    }
    return results;
  },
});

export const getWatchlistIds = query({
  args: {},
  handler: async (ctx) => {
    const watchlist = await ctx.db.query("creWatchlist").collect();
    return watchlist.map((w) => w.propertyId);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("creProperties").collect();
    const active = all.filter((p) => p.status !== "off_market");
    const today = new Date().toISOString().split("T")[0];
    const todayTs = new Date(today).getTime();
    const newToday = active.filter((p) => p.createdAt >= todayTs);
    const priceDrops = active.filter((p) => p.flags?.includes("PRICE_DROP"));
    // Filter out garbage $/SF values (Crexi sometimes reports units as sqft)
    // Reasonable CRE range in MSP: $20-$1,000/SF
    const withPSF = active.filter((p) => p.pricePerSF && p.pricePerSF >= 20 && p.pricePerSF <= 1000);
    const avgPriceSF =
      withPSF.length > 0
        ? withPSF.reduce((s, p) => s + p.pricePerSF!, 0) / withPSF.length
        : 0;
    const withCap = active.filter((p) => p.capRate);
    const avgCapRate =
      withCap.length > 0
        ? withCap.reduce((s, p) => s + p.capRate!, 0) / withCap.length
        : null;

    const byType: Record<string, number> = {};
    active.forEach((p) => {
      byType[p.propertyType] = (byType[p.propertyType] || 0) + 1;
    });

    return {
      totalActive: active.length,
      newToday: newToday.length,
      priceDrops: priceDrops.length,
      avgPriceSF: Math.round(avgPriceSF),
      avgCapRate: avgCapRate ? parseFloat(avgCapRate.toFixed(1)) : null,
      byType,
      watchlistCount: (await ctx.db.query("creWatchlist").collect()).length,
    };
  },
});

export const listNotificationUpdates = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    const reads = await ctx.db.query("creUpdateReads").collect();
    const readKeys = new Set(reads.map((r) => r.updateKey));

    const properties = await ctx.db
      .query("creProperties")
      .order("desc")
      .take(200);

    const items = properties
      .filter((p) => p.status !== "off_market")
      .slice(0, limit)
      .map((p) => {
        const updateKey = `cre-${p._id}-${p.updatedAt}`;
        const kind = p.flags?.includes("PRICE_DROP")
          ? ("price_drop" as const)
          : p.flags?.includes("UPDATED")
            ? ("updated" as const)
            : ("new_listing" as const);
        return {
          updateKey,
          kind,
          address: p.address,
          propertyType: p.propertyType,
          askPrice: p.askPrice,
          previousPrice: p.previousPrice,
          score: p.score,
          title:
            kind === "price_drop"
              ? `Price Drop: ${p.address}`
              : kind === "updated"
                ? `Updated: ${p.address}`
                : `New: ${p.address}`,
          summary: `${p.propertyType.replace("_", " ")} · $${p.askPrice.toLocaleString()}${p.score ? ` · Score: ${p.score}` : ""}`,
          createdAt: p.updatedAt,
          unread: !readKeys.has(updateKey),
        };
      });

    return {
      items,
      unreadCount: items.filter((i) => i.unread).length,
    };
  },
});

// ── Mutations ─────────────────────────────────────────────

export const addToWatchlist = mutation({
  args: { propertyId: v.id("creProperties"), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("creWatchlist")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .first();
    if (existing) return existing._id;
    return ctx.db.insert("creWatchlist", {
      propertyId: args.propertyId,
      notes: args.notes,
      addedAt: Date.now(),
    });
  },
});

export const removeFromWatchlist = mutation({
  args: { propertyId: v.id("creProperties") },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("creWatchlist")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .first();
    if (item) await ctx.db.delete(item._id);
  },
});

export const updateWatchlistNotes = mutation({
  args: { propertyId: v.id("creProperties"), notes: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query("creWatchlist")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .first();
    if (item) await ctx.db.patch(item._id, { notes: args.notes });
  },
});

export const markNotificationRead = mutation({
  args: { updateKey: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("creUpdateReads")
      .withIndex("by_update_key", (q) => q.eq("updateKey", args.updateKey))
      .first();
    if (!existing) {
      await ctx.db.insert("creUpdateReads", {
        updateKey: args.updateKey,
        readAt: Date.now(),
      });
    }
  },
});

export const markAllNotificationsRead = mutation({
  args: { updateKeys: v.array(v.string()) },
  handler: async (ctx, args) => {
    for (const key of args.updateKeys) {
      const existing = await ctx.db
        .query("creUpdateReads")
        .withIndex("by_update_key", (q) => q.eq("updateKey", key))
        .first();
      if (!existing) {
        await ctx.db.insert("creUpdateReads", {
          updateKey: key,
          readAt: Date.now(),
        });
      }
    }
  },
});

// ── Internal Mutations (for scraper ingestion) ─────────────

export const batchUpsertProperties = internalMutation({
  args: {
    properties: v.array(
      v.object({
        address: v.string(),
        city: v.string(),
        state: v.string(),
        propertyType: v.string(),
        askPrice: v.number(),
        pricePerSF: v.optional(v.number()),
        squareFeet: v.optional(v.number()),
        lotSize: v.optional(v.string()),
        units: v.optional(v.number()),
        capRate: v.optional(v.number()),
        yearBuilt: v.optional(v.number()),
        zoning: v.optional(v.string()),
        assessedValue: v.optional(v.number()),
        assessedValueSource: v.optional(v.string()),
        listingDate: v.optional(v.string()),
        daysOnMarket: v.optional(v.number()),
        source: v.string(),
        sourceUrl: v.optional(v.string()),
        score: v.number(),
        scoreJustification: v.optional(v.string()),
        investmentMemo: v.optional(v.string()),
        comps: v.optional(v.any()),
        flags: v.optional(v.array(v.string())),
        riskFlags: v.optional(v.array(v.string())),
        imageUrl: v.optional(v.string()),
        description: v.optional(v.string()),
        listingAgent: v.optional(v.string()),
        listingBrokerage: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let newCount = 0,
      updatedCount = 0,
      priceDropCount = 0;

    for (const prop of args.properties) {
      const existing = await ctx.db
        .query("creProperties")
        .withIndex("by_address", (q) => q.eq("address", prop.address))
        .first();

      if (existing) {
        const flags = [...(prop.flags || [])];
        let previousPrice = existing.previousPrice;
        let priceHistory = existing.priceHistory || [];
        let status: "active" | "updated" | "price_drop" = "updated";

        if (prop.askPrice < existing.askPrice) {
          flags.push("PRICE_DROP");
          previousPrice = existing.askPrice;
          priceHistory.push({
            price: existing.askPrice,
            date: new Date().toISOString().split("T")[0],
            source: existing.source,
          });
          status = "price_drop";
          priceDropCount++;
        }

        if (!flags.includes("PRICE_DROP")) {
          flags.push("UPDATED");
        }

        const allSources = existing.allSources || [
          {
            source: existing.source,
            url: existing.sourceUrl || "",
            firstSeen: existing.createdAt,
          },
        ];
        if (!allSources.find((s) => s.source === prop.source)) {
          allSources.push({
            source: prop.source,
            url: prop.sourceUrl || "",
            firstSeen: Date.now(),
          });
        }

        await ctx.db.patch(existing._id, {
          ...prop,
          propertyType: prop.propertyType as any,
          status,
          previousPrice,
          priceHistory,
          flags,
          allSources,
          updatedAt: Date.now(),
        });
        updatedCount++;
      } else {
        const flags = [...(prop.flags || []), "NEW"];
        await ctx.db.insert("creProperties", {
          ...prop,
          propertyType: prop.propertyType as any,
          status: "active",
          flags,
          allSources: [
            {
              source: prop.source,
              url: prop.sourceUrl || "",
              firstSeen: Date.now(),
            },
          ],
          priceHistory: [
            {
              price: prop.askPrice,
              date: new Date().toISOString().split("T")[0],
              source: prop.source,
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        newCount++;
      }
    }

    return { newCount, updatedCount, priceDropCount };
  },
});

export const markOffMarket = internalMutation({
  args: { propertyIds: v.array(v.id("creProperties")) },
  handler: async (ctx, args) => {
    for (const id of args.propertyIds) {
      await ctx.db.patch(id, {
        status: "off_market",
        removedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
