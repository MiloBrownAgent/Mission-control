/**
 * WHOOP periodic sync — pulls fresh recovery, sleep & workout data
 * so the dashboard stays current even if webhooks stop firing.
 */

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v2";

interface StoredTokens {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

async function refreshToken(tokens: StoredTokens): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}> {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing WHOOP_CLIENT_ID or WHOOP_CLIENT_SECRET env vars");
  }

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WHOOP token refresh failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}

async function whoopFetch(endpoint: string, accessToken: string) {
  const url = `${WHOOP_API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Mission-Control/1.0",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WHOOP API ${endpoint} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export const syncAll = internalAction({
  args: {},
  handler: async (ctx) => {
    // 1. Get stored tokens
    const stored = await ctx.runQuery(internal.whoopSync.getLatestTokensInternal, {});
    if (!stored) {
      console.log("[WHOOP sync] No tokens stored — skipping");
      return;
    }

    let accessToken = stored.accessToken;

    // 2. Refresh token if expiring within 5 minutes
    if (stored.expiresAt - Date.now() < 5 * 60_000) {
      console.log("[WHOOP sync] Refreshing token...");
      const refreshed = await refreshToken(stored);
      accessToken = refreshed.accessToken;

      await ctx.runMutation(internal.whoopSync.updateTokensInternal, {
        userId: stored.userId,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
      });
    }

    // 3. Fetch recent data for each type
    const types = [
      { endpoint: "/recovery", type: "recovery", dateKey: "created_at" },
      { endpoint: "/activity/sleep", type: "sleep", dateKey: "start" },
      { endpoint: "/activity/workout", type: "workout", dateKey: "start" },
    ];

    for (const { endpoint, type, dateKey } of types) {
      try {
        const start = new Date(Date.now() - 3 * 86_400_000).toISOString();
        const data = await whoopFetch(
          `${endpoint}?start=${encodeURIComponent(start)}&limit=10`,
          accessToken
        );
        const records = (data as { records?: unknown[] }).records ?? [];

        for (const record of records) {
          const rec = record as Record<string, string>;
          const date =
            rec[dateKey]?.split("T")[0] ??
            new Date().toISOString().split("T")[0];

          await ctx.runMutation(internal.whoopSync.storeDataInternal, {
            type,
            date,
            data: record,
          });
        }

        console.log(`[WHOOP sync] ${type}: stored ${records.length} records`);
      } catch (err) {
        console.error(`[WHOOP sync] ${type} error:`, err);
      }
    }

    console.log("[WHOOP sync] Complete");
  },
});

// ── Internal helpers (queries/mutations callable from actions) ──────────────

import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getLatestTokensInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("whoop_tokens").order("desc").first();
    if (!row) return null;
    return {
      userId: row.userId,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      expiresAt: row.expiresAt,
      scope: row.scope ?? "",
    };
  },
});

export const updateTokensInternal = internalMutation({
  args: {
    userId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whoop_tokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!existing) throw new Error(`No token record for user ${args.userId}`);

    await ctx.db.patch(existing._id, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      lastSyncedAt: Date.now(),
    });
  },
});

export const storeDataInternal = internalMutation({
  args: {
    type: v.string(),
    date: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whoop_data")
      .withIndex("by_type_date", (q) =>
        q.eq("type", args.type).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.data,
        storedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("whoop_data", {
        type: args.type,
        date: args.date,
        data: args.data,
        storedAt: Date.now(),
      });
    }
  },
});
