/**
 * WHOOP API utilities — token refresh + authenticated data fetch.
 * Credentials are stored in Convex and refreshed server-side only.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_API_BASE  = "https://api.prod.whoop.com/developer/v2";

function getConvex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

export interface WhoopTokens {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

/**
 * Refresh a WHOOP access token using the stored refresh token.
 * Updates Convex with the new tokens and returns them.
 */
export async function refreshWhoopToken(tokens: WhoopTokens): Promise<WhoopTokens> {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id:     process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WHOOP token refresh failed (${res.status}): ${body}`);
  }

  const json = await res.json();

  const updated: WhoopTokens = {
    userId:       tokens.userId,
    accessToken:  json.access_token,
    refreshToken: json.refresh_token ?? tokens.refreshToken,
    expiresAt:    Date.now() + (json.expires_in ?? 3600) * 1000,
    scope:        json.scope ?? tokens.scope,
  };

  // Persist refreshed tokens to Convex
  const convex = getConvex();
  await convex.mutation(api.whoop.updateTokens, {
    userId:       updated.userId,
    accessToken:  updated.accessToken,
    refreshToken: updated.refreshToken,
    expiresAt:    updated.expiresAt,
  });

  return updated;
}

/**
 * Make an authenticated request to the WHOOP API.
 * Automatically refreshes the access token if it is expired (or within 60 s of expiry).
 *
 * @param endpoint  Path relative to /developer/v2, e.g. "/recovery"
 * @param tokens    Current token set (pass reference; returned tokens may be refreshed)
 * @param options   Additional fetch options
 * @returns         { data, tokens } where tokens is potentially refreshed
 */
export async function fetchWhoopData(
  endpoint: string,
  tokens: WhoopTokens,
  options: RequestInit = {}
): Promise<{ data: unknown; tokens: WhoopTokens }> {
  // Refresh proactively if expiring within 60 seconds
  let currentTokens = tokens;
  if (currentTokens.expiresAt - Date.now() < 60_000) {
    currentTokens = await refreshWhoopToken(currentTokens);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${WHOOP_API_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${currentTokens.accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Mission-Control/1.0",
      ...options.headers,
    },
  });

  // Retry once on 401 (token might have just expired)
  if (res.status === 401) {
    currentTokens = await refreshWhoopToken(currentTokens);
    const retry = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${currentTokens.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "Mission-Control/1.0",
        ...options.headers,
      },
    });
    if (!retry.ok) {
      const body = await retry.text();
      throw new Error(`WHOOP API error after refresh (${retry.status}): ${body}`);
    }
    const data = await retry.json();
    return { data, tokens: currentTokens };
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WHOOP API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  return { data, tokens: currentTokens };
}

/**
 * Fetch the last N days of recovery or sleep records from WHOOP.
 * Returns the `records` array from the paginated response.
 */
export async function fetchWhoopRecords(
  type: "recovery" | "sleep" | "workout",
  tokens: WhoopTokens,
  days = 7
): Promise<{ records: unknown[]; tokens: WhoopTokens }> {
  const pathMap: Record<string, string> = {
    recovery: "/recovery",
    sleep: "/activity/sleep",
    workout: "/activity/workout",
  };
  const start = new Date(Date.now() - days * 86_400_000).toISOString();
  const endpoint = `${pathMap[type]}?start=${encodeURIComponent(start)}&limit=25`;

  const { data, tokens: refreshed } = await fetchWhoopData(endpoint, tokens);
  const records = (data as { records?: unknown[] }).records ?? [];
  return { records, tokens: refreshed };
}
