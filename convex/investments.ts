import { query, mutation, internalMutation, internalAction, action } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { internal } from "./_generated/api";

type PositionDoc = Doc<"investmentPositions">;
type AlertDoc = Doc<"investmentAlerts">;
type OpportunityDoc = Doc<"investmentOpportunities">;
type EventScanDoc = Doc<"eventScans">;
type UpdateReadDoc = Doc<"investmentUpdateReads">;

// ── Positions ──────────────────────────────────────

export const listPositions = query({
  args: {
    portfolioType: v.optional(v.union(v.literal("high_risk"), v.literal("low_risk"))),
    stage: v.optional(v.union(v.literal("research"), v.literal("portfolio"))),
  },
  handler: async (ctx, args) => {
    let results;
    if (args.portfolioType) {
      results = await ctx.db
        .query("investmentPositions")
        .withIndex("by_type", (q) => q.eq("portfolioType", args.portfolioType!))
        .collect();
    } else {
      results = await ctx.db.query("investmentPositions").collect();
    }
    if (args.stage) {
      results = results.filter((p) => {
        const effectiveStage = p.stage ?? ((p.shares && p.shares > 0 && p.entryPrice && p.entryPrice > 0) ? "portfolio" : "research");
        return effectiveStage === args.stage;
      });
    }
    return results;
  },
});

export const getPosition = query({
  args: { id: v.id("investmentPositions") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const getByTicker = query({
  args: { ticker: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("investmentPositions")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .first();
  },
});

export const addPosition = mutation({
  args: {
    ticker: v.string(),
    name: v.string(),
    portfolioType: v.union(v.literal("high_risk"), v.literal("low_risk")),
    shares: v.optional(v.number()),
    entryPrice: v.optional(v.number()),
    entryDate: v.optional(v.string()),
    timeHorizon: v.optional(v.union(v.literal("short"), v.literal("medium"), v.literal("long"))),
    stage: v.optional(v.union(v.literal("research"), v.literal("portfolio"))),
  },
  handler: async (ctx, args) => {
    const stage = args.stage ?? "research";
    const existing = await ctx.db
      .query("investmentPositions")
      .withIndex("by_ticker", (q) => q.eq("ticker", args.ticker.toUpperCase()))
      .first();
    
    // If position exists but was exited, reactivate it with new data
    if (existing && existing.status === "exited") {
      await ctx.db.patch(existing._id, {
        name: args.name,
        portfolioType: args.portfolioType,
        shares: args.shares,
        entryPrice: args.entryPrice,
        entryDate: args.entryDate,
        timeHorizon: args.timeHorizon,
        stage,
        status: "active",
        thesis: undefined,
        thesisStatus: "pending",
        thesisValidationIssues: undefined,
        verifiedFacts: undefined,
        thesisSources: undefined,
        thesisGeneratedAt: undefined,
        addedAt: Date.now(),
      });
      // Trigger thesis generation
      await ctx.scheduler.runAfter(0, internal.investments.triggerThesisGeneration, {
        positionId: existing._id,
        ticker: args.ticker.toUpperCase(),
        name: args.name,
        portfolioType: args.portfolioType,
        shares: args.shares,
        entryPrice: args.entryPrice,
        timeHorizon: args.timeHorizon,
      });
      // Notify agent via Telegram
      await ctx.scheduler.runAfter(0, internal.investments.notifyNewPosition, {
        ticker: args.ticker.toUpperCase(),
        name: args.name,
        portfolioType: args.portfolioType,
        shares: args.shares,
        entryPrice: args.entryPrice,
        timeHorizon: args.timeHorizon,
      });
      return existing._id;
    }
    
    if (existing) throw new Error(`Position ${args.ticker} already exists`);

    const id = await ctx.db.insert("investmentPositions", {
      ticker: args.ticker.toUpperCase(),
      name: args.name,
      portfolioType: args.portfolioType,
      shares: args.shares,
      entryPrice: args.entryPrice,
      entryDate: args.entryDate,
      timeHorizon: args.timeHorizon,
      stage,
      status: "active",
      thesisStatus: "pending",
      addedAt: Date.now(),
    });
    // Trigger thesis generation
    await ctx.scheduler.runAfter(0, internal.investments.triggerThesisGeneration, {
      positionId: id,
      ticker: args.ticker.toUpperCase(),
      name: args.name,
      portfolioType: args.portfolioType,
      shares: args.shares,
      entryPrice: args.entryPrice,
      timeHorizon: args.timeHorizon,
    });
    // Notify agent via Telegram
    await ctx.scheduler.runAfter(0, internal.investments.notifyNewPosition, {
      ticker: args.ticker.toUpperCase(),
      name: args.name,
      portfolioType: args.portfolioType,
      shares: args.shares,
      entryPrice: args.entryPrice,
      timeHorizon: args.timeHorizon,
    });
    return id;
  },
});

export const updatePosition = mutation({
  args: {
    id: v.id("investmentPositions"),
    shares: v.optional(v.number()),
    entryPrice: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("watching"), v.literal("exited"))),
    timeHorizon: v.optional(v.union(v.literal("short"), v.literal("medium"), v.literal("long"))),
    thesis: v.optional(v.string()),
    thesisStatus: v.optional(v.union(v.literal("pending"), v.literal("partial"), v.literal("final"))),
    thesisValidationIssues: v.optional(v.array(v.string())),
    verifiedFacts: v.optional(v.object({
      ticker: v.string(),
      companyName: v.string(),
      exchange: v.optional(v.string()),
      currency: v.optional(v.string()),
      currentPrice: v.number(),
      marketCap: v.number(),
      marketCapSource: v.union(
        v.literal("quoteSummary.price.marketCap"),
        v.literal("price_x_sharesOutstanding"),
        v.literal("price_x_impliedSharesOutstanding")
      ),
      sharesOutstanding: v.optional(v.number()),
      impliedSharesOutstanding: v.optional(v.number()),
      fiftyTwoWeekHigh: v.optional(v.number()),
      fiftyTwoWeekLow: v.optional(v.number()),
      sector: v.optional(v.string()),
      industry: v.optional(v.string()),
      revenue: v.optional(v.number()),
      revenueGrowth: v.optional(v.number()),
      grossMargin: v.optional(v.number()),
      operatingMargin: v.optional(v.number()),
      freeCashflow: v.optional(v.number()),
      totalDebt: v.optional(v.number()),
      totalCash: v.optional(v.number()),
      forwardPE: v.optional(v.number()),
      shortPercentOfFloat: v.optional(v.number()),
      analystConsensus: v.optional(v.string()),
      targetMeanPrice: v.optional(v.number()),
      validatedAt: v.number(),
    })),
    thesisSources: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
      publisher: v.optional(v.string()),
      publishedAt: v.optional(v.string()),
      quality: v.optional(v.number()),
      trustworthiness: v.optional(v.number()),
      relevance: v.optional(v.number()),
      compositeScore: v.optional(v.number()),
    }))),
    thesisGeneratedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) return;
    await ctx.db.patch(id, clean);
  },
});

export const updateThesisInternal = internalMutation({
  args: {
    id: v.id("investmentPositions"),
    thesis: v.string(),
    thesisStatus: v.optional(v.union(v.literal("pending"), v.literal("partial"), v.literal("final"))),
    thesisValidationIssues: v.optional(v.array(v.string())),
    verifiedFacts: v.optional(v.object({
      ticker: v.string(),
      companyName: v.string(),
      exchange: v.optional(v.string()),
      currency: v.optional(v.string()),
      currentPrice: v.number(),
      marketCap: v.number(),
      marketCapSource: v.union(
        v.literal("quoteSummary.price.marketCap"),
        v.literal("price_x_sharesOutstanding"),
        v.literal("price_x_impliedSharesOutstanding")
      ),
      sharesOutstanding: v.optional(v.number()),
      impliedSharesOutstanding: v.optional(v.number()),
      fiftyTwoWeekHigh: v.optional(v.number()),
      fiftyTwoWeekLow: v.optional(v.number()),
      sector: v.optional(v.string()),
      industry: v.optional(v.string()),
      revenue: v.optional(v.number()),
      revenueGrowth: v.optional(v.number()),
      grossMargin: v.optional(v.number()),
      operatingMargin: v.optional(v.number()),
      freeCashflow: v.optional(v.number()),
      totalDebt: v.optional(v.number()),
      totalCash: v.optional(v.number()),
      forwardPE: v.optional(v.number()),
      shortPercentOfFloat: v.optional(v.number()),
      analystConsensus: v.optional(v.string()),
      targetMeanPrice: v.optional(v.number()),
      validatedAt: v.number(),
    })),
    thesisSources: v.array(v.object({
      title: v.string(),
      url: v.string(),
      publisher: v.optional(v.string()),
      publishedAt: v.optional(v.string()),
      quality: v.optional(v.number()),
      trustworthiness: v.optional(v.number()),
      relevance: v.optional(v.number()),
      compositeScore: v.optional(v.number()),
    })),
    thesisGeneratedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      thesis: args.thesis,
      thesisStatus: args.thesisStatus,
      thesisValidationIssues: args.thesisValidationIssues,
      verifiedFacts: args.verifiedFacts,
      thesisSources: args.thesisSources,
      thesisGeneratedAt: args.thesisGeneratedAt,
    });
  },
});

export const promoteToPortfolio = mutation({
  args: {
    positionId: v.id("investmentPositions"),
    shares: v.number(),
    entryPrice: v.number(),
    entryDate: v.optional(v.string()),
    portfolioType: v.union(v.literal("high_risk"), v.literal("low_risk")),
    timeHorizon: v.optional(v.union(v.literal("short"), v.literal("medium"), v.literal("long"))),
  },
  handler: async (ctx, args) => {
    const position = await ctx.db.get(args.positionId);
    if (!position) throw new Error("Position not found");
    await ctx.db.patch(args.positionId, {
      stage: "portfolio",
      shares: args.shares,
      entryPrice: args.entryPrice,
      entryDate: args.entryDate,
      portfolioType: args.portfolioType,
      timeHorizon: args.timeHorizon,
    });
    // Notify agent via Telegram
    await ctx.scheduler.runAfter(0, internal.investments.notifyNewPosition, {
      ticker: position.ticker,
      name: position.name,
      portfolioType: args.portfolioType,
      shares: args.shares,
      entryPrice: args.entryPrice,
      timeHorizon: args.timeHorizon,
    });
  },
});

export const demoteToResearch = mutation({
  args: { positionId: v.id("investmentPositions") },
  handler: async (ctx, args) => {
    const position = await ctx.db.get(args.positionId);
    if (!position) throw new Error("Position not found");
    await ctx.db.patch(args.positionId, {
      stage: "research",
    });
  },
});

export const removePosition = mutation({
  args: { id: v.id("investmentPositions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "exited" as const });
  },
});

// ── Alerts ──────────────────────────────────────

export const listAlerts = query({
  args: {
    acknowledged: v.optional(v.boolean()),
    ticker: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results;

    if (args.acknowledged !== undefined) {
      results = await ctx.db
        .query("investmentAlerts")
        .withIndex("by_acknowledged", (idx) => idx.eq("acknowledged", args.acknowledged!))
        .order("desc")
        .collect();
    } else {
      results = await ctx.db
        .query("investmentAlerts")
        .order("desc")
        .collect();
    }

    if (args.ticker) {
      results = results.filter((a) => a.ticker === args.ticker!.toUpperCase());
    }

    return results.slice(0, args.limit ?? 50);
  },
});

export const createAlert = internalMutation({
  args: {
    positionId: v.optional(v.id("investmentPositions")),
    ticker: v.string(),
    alertType: v.union(
      v.literal("thesis_risk"),
      v.literal("thesis_evolution"),
      v.literal("opportunity"),
      v.literal("price_alert")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    title: v.string(),
    summary: v.string(),
    sources: v.optional(v.array(v.object({ title: v.string(), url: v.string() }))),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("investmentAlerts", {
      ...args,
      acknowledged: false,
      createdAt: Date.now(),
    });
  },
});

// Public version for monitor script
export const createAlertPublic = mutation({
  args: {
    positionId: v.optional(v.id("investmentPositions")),
    ticker: v.string(),
    alertType: v.union(
      v.literal("thesis_risk"),
      v.literal("thesis_evolution"),
      v.literal("opportunity"),
      v.literal("price_alert")
    ),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    title: v.string(),
    summary: v.string(),
    sources: v.optional(v.array(v.object({ title: v.string(), url: v.string() }))),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("investmentAlerts", {
      ...args,
      acknowledged: false,
      createdAt: Date.now(),
    });
  },
});

export const acknowledgeAlert = mutation({
  args: { id: v.id("investmentAlerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { acknowledged: true });
  },
});

export const deleteAlert = mutation({
  args: { id: v.id("investmentAlerts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Opportunities ──────────────────────────────────────

function normalizeOpportunityTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

function opportunityTimestamp(opportunity: OpportunityDoc) {
  return opportunity.lastRefreshedAt ?? opportunity.priceUpdatedAt ?? opportunity.createdAt ?? 0;
}

function opportunityStatusRank(status: OpportunityDoc["status"]) {
  switch (status) {
    case "active": return 4;
    case "hit_target": return 3;
    case "stopped_out": return 2;
    case "expired": return 1;
    default: return 0;
  }
}

function normalizeOpportunityRecord(opportunity: OpportunityDoc): OpportunityDoc {
  return {
    ...opportunity,
    ticker: normalizeOpportunityTicker(opportunity.ticker),
    firstSeenAt: opportunity.firstSeenAt ?? opportunity.createdAt,
    lastRefreshedAt: opportunity.lastRefreshedAt ?? opportunity.priceUpdatedAt ?? opportunity.createdAt,
  };
}

function pickCanonicalOpportunity(a: OpportunityDoc, b: OpportunityDoc): OpportunityDoc {
  const aTs = opportunityTimestamp(a);
  const bTs = opportunityTimestamp(b);
  if (bTs > aTs) return b;
  if (aTs > bTs) return a;
  if (opportunityStatusRank(b.status) > opportunityStatusRank(a.status)) return b;
  return a;
}

function mergeOpportunitiesByTicker(opportunities: OpportunityDoc[]) {
  const merged = new Map<string, OpportunityDoc>();

  for (const rawOpportunity of opportunities) {
    const opportunity = normalizeOpportunityRecord(rawOpportunity);
    if (!opportunity.ticker) continue;

    const existing = merged.get(opportunity.ticker);
    if (!existing) {
      merged.set(opportunity.ticker, opportunity);
      continue;
    }

    const canonical = pickCanonicalOpportunity(existing, opportunity);
    merged.set(opportunity.ticker, {
      ...canonical,
      ticker: opportunity.ticker,
      firstSeenAt: Math.min(existing.firstSeenAt ?? existing.createdAt, opportunity.firstSeenAt ?? opportunity.createdAt),
      lastRefreshedAt: Math.max(opportunityTimestamp(existing), opportunityTimestamp(opportunity)),
      emailedAt: Math.max(existing.emailedAt ?? 0, opportunity.emailedAt ?? 0) || undefined,
    });
  }

  return Array.from(merged.values()).sort((a, b) => opportunityTimestamp(b) - opportunityTimestamp(a));
}

export const listOpportunities = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const opportunities = await ctx.db
      .query("investmentOpportunities")
      .withIndex("by_created")
      .order("desc")
      .collect();

    return mergeOpportunitiesByTicker(opportunities).slice(0, args.limit ?? 20);
  },
});

export const createOpportunity = internalMutation({
  args: {
    ticker: v.string(),
    name: v.string(),
    opportunityType: v.string(),
    thesis: v.string(),
    sources: v.array(v.object({ title: v.string(), url: v.string() })),
    expectedUpside: v.optional(v.string()),
    catalysts: v.optional(v.array(v.string())),
    risks: v.optional(v.array(v.string())),
    timeHorizon: v.optional(v.string()),
    moralScreenPass: v.boolean(),
    priceAtRecommendation: v.optional(v.number()),
    currentPrice: v.optional(v.number()),
    priceUpdatedAt: v.optional(v.number()),
    returnPct: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("hit_target"), v.literal("stopped_out"), v.literal("expired"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("investmentOpportunities", {
      ...args,
      ticker: normalizeOpportunityTicker(args.ticker),
      createdAt: now,
      firstSeenAt: now,
      lastRefreshedAt: now,
      status: args.status ?? "active",
      priceUpdatedAt: args.priceUpdatedAt ?? now,
    });
  },
});

export const createOpportunityPublic = mutation({
  args: {
    ticker: v.string(),
    name: v.string(),
    opportunityType: v.string(),
    thesis: v.string(),
    sources: v.array(v.object({ title: v.string(), url: v.string() })),
    expectedUpside: v.optional(v.string()),
    catalysts: v.optional(v.array(v.string())),
    risks: v.optional(v.array(v.string())),
    timeHorizon: v.optional(v.string()),
    moralScreenPass: v.boolean(),
    createdAt: v.optional(v.number()),
    priceAtRecommendation: v.optional(v.number()),
    currentPrice: v.optional(v.number()),
    priceUpdatedAt: v.optional(v.number()),
    returnPct: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("hit_target"), v.literal("stopped_out"), v.literal("expired"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedTicker = normalizeOpportunityTicker(args.ticker);
    const indexedExisting = await ctx.db
      .query("investmentOpportunities")
      .withIndex("by_ticker", (q) => q.eq("ticker", normalizedTicker))
      .collect();
    const existing = indexedExisting.length > 0
      ? indexedExisting
      : (await ctx.db.query("investmentOpportunities").collect())
          .filter((opp) => normalizeOpportunityTicker(opp.ticker) === normalizedTicker);

    const canonical = [...existing]
      .map(normalizeOpportunityRecord)
      .sort((a, b) => opportunityTimestamp(b) - opportunityTimestamp(a) || opportunityStatusRank(b.status) - opportunityStatusRank(a.status))[0];

    const firstSeenAt = existing.length > 0
      ? Math.min(...existing.map((opp) => opp.firstSeenAt ?? opp.createdAt))
      : (args.createdAt ?? now);

    const payload = {
      ticker: normalizedTicker,
      name: args.name,
      opportunityType: args.opportunityType,
      thesis: args.thesis,
      sources: args.sources,
      expectedUpside: args.expectedUpside,
      catalysts: args.catalysts,
      risks: args.risks,
      timeHorizon: args.timeHorizon,
      moralScreenPass: args.moralScreenPass,
      createdAt: canonical?.createdAt ?? args.createdAt ?? now,
      firstSeenAt,
      lastRefreshedAt: now,
      priceAtRecommendation: args.priceAtRecommendation ?? canonical?.priceAtRecommendation,
      currentPrice: args.currentPrice ?? canonical?.currentPrice,
      priceUpdatedAt: args.priceUpdatedAt ?? canonical?.priceUpdatedAt ?? now,
      returnPct: args.returnPct ?? canonical?.returnPct,
      status: args.status ?? "active",
      emailedAt: canonical?.emailedAt,
    };

    if (canonical) {
      await ctx.db.patch(canonical._id, payload);
      return canonical._id;
    }

    return ctx.db.insert("investmentOpportunities", payload);
  },
});

export const listAllOpportunitiesTracked = query({
  args: {},
  handler: async (ctx) => {
    const opportunities = await ctx.db
      .query("investmentOpportunities")
      .withIndex("by_created")
      .order("desc")
      .collect();

    return mergeOpportunitiesByTicker(opportunities);
  },
});

export const listOpportunitiesRaw = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("investmentOpportunities")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

function normalizeNotificationText(value?: string) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function clipNotificationText(value?: string, maxLength = 220) {
  if (!value) return "";
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function dedupeEventScans(events: EventScanDoc[]) {
  const merged = new Map<string, EventScanDoc>();

  for (const event of events) {
    const signature = [
      normalizeOpportunityTicker(event.ticker),
      normalizeNotificationText(event.eventType),
      normalizeNotificationText(event.title),
      normalizeNotificationText(event.summary),
    ].join("|");

    const existing = merged.get(signature);
    if (!existing || event.detectedAt > existing.detectedAt) {
      merged.set(signature, {
        ...event,
        ticker: normalizeOpportunityTicker(event.ticker),
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.detectedAt - a.detectedAt);
}

function buildNotificationUpdates(args: {
  alerts: AlertDoc[];
  opportunities: OpportunityDoc[];
  positions: PositionDoc[];
  eventScans: EventScanDoc[];
  readMarks: UpdateReadDoc[];
}) {
  const readMarksByKey = new Map(args.readMarks.map((mark) => [mark.updateKey, mark.readAt]));

  const items = [
    ...args.alerts.map((alert) => ({
      updateKey: `alert:${String(alert._id)}`,
      kind: "alert" as const,
      ticker: normalizeOpportunityTicker(alert.ticker),
      title: alert.title,
      summary: clipNotificationText(alert.summary),
      severity: alert.severity,
      createdAt: alert.createdAt,
    })),
    ...mergeOpportunitiesByTicker(args.opportunities).map((opportunity) => {
      const createdAt = opportunity.firstSeenAt ?? opportunity.createdAt;
      return {
        updateKey: `opportunity:${opportunity.ticker}:${createdAt}`,
        kind: "opportunity" as const,
        ticker: opportunity.ticker,
        title: `${opportunity.ticker} — ${opportunity.name}`,
        summary: clipNotificationText(
          opportunity.expectedUpside
            ? `${opportunity.expectedUpside} upside · ${opportunity.opportunityType.replace(/_/g, " ")}`
            : opportunity.opportunityType.replace(/_/g, " ")
        ),
        createdAt,
      };
    }),
    ...args.positions
      .filter((position) => Boolean(position.thesisGeneratedAt))
      .map((position) => ({
        updateKey: `thesis:${String(position._id)}:${position.thesisGeneratedAt}`,
        kind: "thesis_refresh" as const,
        ticker: normalizeOpportunityTicker(position.ticker),
        title: `${position.ticker} thesis refreshed`,
        summary: clipNotificationText(position.thesis?.split("\n").filter(Boolean)[0] ?? `${position.name} thesis updated.`),
        createdAt: position.thesisGeneratedAt ?? 0,
      })),
    ...dedupeEventScans(args.eventScans).map((eventScan) => ({
      updateKey: `event:${eventScan.ticker}:${normalizeNotificationText(eventScan.eventType)}:${normalizeNotificationText(eventScan.title)}`,
      kind: "event_scan" as const,
      ticker: eventScan.ticker,
      title: eventScan.title,
      summary: clipNotificationText(eventScan.summary),
      createdAt: eventScan.detectedAt,
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  return items.map((item) => ({
    ...item,
    unread: (readMarksByKey.get(item.updateKey) ?? 0) < item.createdAt,
  }));
}

export const listNotificationUpdates = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const [alerts, opportunities, positions, eventScans, readMarks] = await Promise.all([
      ctx.db.query("investmentAlerts").order("desc").collect(),
      ctx.db.query("investmentOpportunities").withIndex("by_created").order("desc").collect(),
      ctx.db.query("investmentPositions").collect(),
      ctx.db.query("eventScans").withIndex("by_detected").order("desc").collect(),
      ctx.db.query("investmentUpdateReads").collect(),
    ]);

    let items = buildNotificationUpdates({ alerts, opportunities, positions, eventScans, readMarks });
    if (args.unreadOnly) {
      items = items.filter((item) => item.unread);
    }

    return {
      items: items.slice(0, args.limit ?? 50),
      unreadCount: items.filter((item) => item.unread).length,
    };
  },
});

export const markNotificationRead = mutation({
  args: { updateKey: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("investmentUpdateReads")
      .withIndex("by_update_key", (q) => q.eq("updateKey", args.updateKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { readAt: now });
      return existing._id;
    }

    return ctx.db.insert("investmentUpdateReads", {
      updateKey: args.updateKey,
      readAt: now,
    });
  },
});

export const markAllNotificationUpdatesRead = mutation({
  args: { updateKeys: v.array(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const uniqueKeys = Array.from(new Set(args.updateKeys.filter(Boolean)));

    for (const updateKey of uniqueKeys) {
      const existing = await ctx.db
        .query("investmentUpdateReads")
        .withIndex("by_update_key", (q) => q.eq("updateKey", updateKey))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { readAt: now });
      } else {
        await ctx.db.insert("investmentUpdateReads", { updateKey, readAt: now });
      }
    }

    return { marked: uniqueKeys.length };
  },
});

export const listWeeklySummaries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("investmentWeeklySummaries")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit ?? 52);
  },
});

export const createWeeklySummary = internalMutation({
  args: {
    weekOf: v.string(),
    summary: v.string(),
    totalPicks: v.number(),
    winnersCount: v.number(),
    losersCount: v.number(),
    bestPicker: v.optional(v.object({ ticker: v.string(), returnPct: v.number() })),
    worstPicker: v.optional(v.object({ ticker: v.string(), returnPct: v.number() })),
    avgReturn: v.optional(v.number()),
    positionUpdates: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("investmentWeeklySummaries", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const markOpportunityEmailed = internalMutation({
  args: { id: v.id("investmentOpportunities") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { emailedAt: Date.now() });
  },
});

// Public version for backfill/manual fixes
export const patchOpportunity = mutation({
  args: {
    id: v.id("investmentOpportunities"),
    priceAtRecommendation: v.optional(v.number()),
    currentPrice: v.optional(v.number()),
    returnPct: v.optional(v.number()),
    priceUpdatedAt: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("hit_target"), v.literal("stopped_out"), v.literal("expired"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) return;
    await ctx.db.patch(id, { ...clean, lastRefreshedAt: Date.now() });
  },
});

export const updateOpportunityTracking = internalMutation({
  args: {
    id: v.id("investmentOpportunities"),
    currentPrice: v.optional(v.number()),
    priceAtRecommendation: v.optional(v.number()),
    returnPct: v.optional(v.number()),
    priceUpdatedAt: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("hit_target"), v.literal("stopped_out"), v.literal("expired"))),
    weeklyNotes: v.optional(v.array(v.object({
      date: v.string(),
      price: v.number(),
      note: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    if (Object.keys(clean).length === 0) return;
    await ctx.db.patch(id, { ...clean, lastRefreshedAt: Date.now() });
  },
});

// ─── Thesis Generation (Event-Driven) ────────────────────────────────────────

// ─── Notify agent via Telegram when position is added ────────────────────────

export const notifyNewPosition = internalAction({
  args: {
    ticker: v.string(),
    name: v.string(),
    portfolioType: v.string(),
    shares: v.optional(v.number()),
    entryPrice: v.optional(v.number()),
    timeHorizon: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
      console.log("Telegram notification skipped: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return;
    }

    const emoji = args.portfolioType === "high_risk" ? "🔴" : "🟢";
    const shares = args.shares ? `${args.shares} shares` : "unknown shares";
    const entry = args.entryPrice ? `$${args.entryPrice}` : "unknown entry";
    const horizon = args.timeHorizon || "unset";
    
    const message = [
      `${emoji} New Position Added: ${args.ticker}`,
      ``,
      `Name: ${args.name}`,
      `Portfolio: ${args.portfolioType}`,
      `Shares: ${shares} @ ${entry}`,
      `Horizon: ${horizon}`,
      ``,
      `Generate thesis for ${args.ticker} now.`,
    ].join("\n");

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          message_thread_id: 6,
        }),
      });
      const data = await res.json();
      if (!data.ok) console.error("Telegram notification failed:", data.description);
      else console.log(`Telegram notification sent for ${args.ticker}`);
    } catch (e: any) {
      console.error("Telegram notification error:", e.message);
    }
  },
});

export const triggerThesisGeneration = internalAction({
  args: {
    positionId: v.id("investmentPositions"),
    ticker: v.string(),
    name: v.string(),
    portfolioType: v.optional(v.union(v.literal("high_risk"), v.literal("low_risk"))),
    shares: v.optional(v.number()),
    entryPrice: v.optional(v.number()),
    timeHorizon: v.optional(v.union(v.literal("short"), v.literal("medium"), v.literal("long"))),
  },
  handler: async (_ctx, args) => {
    const siteUrl = process.env.SITE_URL || "https://mc.lookandseen.com";
    try {
      const res = await fetch(`${siteUrl}/api/investments/generate-thesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: args.ticker,
          name: args.name,
          positionId: args.positionId,
          portfolioType: args.portfolioType,
          shares: args.shares,
          entryPrice: args.entryPrice,
          timeHorizon: args.timeHorizon,
        }),
      });
      const data = await res.json();
      console.log(`Thesis generation for ${args.ticker}:`, data.status || "unknown");
    } catch (e: any) {
      console.error(`Thesis generation failed for ${args.ticker}:`, e.message);
      // Convex will retry this action on failure
      throw e;
    }
  },
});

// ─── Sweep: Catch any positions without thesis ───────────────────────────────

export const sweepMissingTheses = internalAction({
  args: {},
  handler: async (ctx) => {
    // Query all positions
    const siteUrl = process.env.SITE_URL || "https://mc.lookandseen.com";
    const queryRes = await fetch(`https://proper-rat-443.convex.cloud/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "investments:listPositions", args: {} }),
    });
    const positions = (await queryRes.json()).value || [];
    
    const missing = positions.filter(
      (p: any) => p.status === "active" && !p.thesis && 
      // Don't retry if it was just added (give the event-driven trigger 2 minutes)
      (Date.now() - p.addedAt > 2 * 60 * 1000)
    );

    for (const pos of missing) {
      console.log(`Sweep: generating thesis for ${pos.ticker} (added ${Math.round((Date.now() - pos.addedAt) / 60000)}m ago)`);
      try {
        await fetch(`${siteUrl}/api/investments/generate-thesis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: pos.ticker,
            name: pos.name,
            positionId: pos._id,
            portfolioType: pos.portfolioType,
            shares: pos.shares,
            entryPrice: pos.entryPrice,
            timeHorizon: pos.timeHorizon,
          }),
        });
      } catch (e: any) {
        console.error(`Sweep failed for ${pos.ticker}:`, e.message);
      }
    }

    if (missing.length === 0) {
      console.log("Sweep: all positions have theses ✓");
    }
  },
});
