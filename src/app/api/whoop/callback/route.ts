import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { fetchWhoopRecords, type WhoopTokens } from "@/lib/whoop";

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_PROFILE_URL = "https://api.prod.whoop.com/developer/v1/user/profile/basic";

function convex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

/**
 * GET /api/whoop/callback
 * Handles the OAuth redirect from WHOOP. Exchanges ?code= for tokens,
 * stores them in Convex, and fetches 7 days of recovery + sleep data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  // ── Auth error from WHOOP ──────────────────────────────────────────────
  if (error) {
    const desc = searchParams.get("error_description") ?? error;
    console.error("WHOOP auth error:", desc);
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem;background:#060606;color:#E8E4DF;">
        <h2 style="color:#C4533A;">WHOOP Authorization Failed</h2>
        <p>${desc}</p>
        <a href="/" style="color:#B8956A;">← Back to dashboard</a>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new NextResponse("Missing authorization code.", { status: 400 });
  }

  const clientId     = process.env.WHOOP_CLIENT_ID!;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET!;
  const redirectUri  = process.env.WHOOP_REDIRECT_URI ?? "https://mc.lookandseen.com/api/whoop/callback";

  if (!clientId || !clientSecret) {
    return new NextResponse(
      "WHOOP credentials not configured. Add WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET in Vercel.",
      { status: 503 }
    );
  }

  try {
    // ── 1. Exchange code for tokens ──────────────────────────────────────
    const tokenRes = await fetch(WHOOP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:   "authorization_code",
        code,
        client_id:    clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("WHOOP token exchange failed:", body);
      throw new Error(`Token exchange failed (${tokenRes.status}): ${body}`);
    }

    const tokenJson = await tokenRes.json();
    const expiresAt = Date.now() + (tokenJson.expires_in ?? 3600) * 1000;

    // ── 2. Fetch user profile to get a stable userId ─────────────────────
    let userId = "dave";  // fallback for single-user MC
    try {
      const profileRes = await fetch(WHOOP_PROFILE_URL, {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        // WHOOP user ID is a number — stringify for Convex
        if (profile.user_id) userId = String(profile.user_id);
      }
    } catch {
      // Non-fatal: fall back to "dave"
    }

    const tokens: WhoopTokens = {
      userId,
      accessToken:  tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      expiresAt,
      scope: tokenJson.scope ?? "",
    };

    // ── 3. Store tokens in Convex ────────────────────────────────────────
    await convex().mutation(api.whoop.storeTokens, {
      userId:       tokens.userId,
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt:    tokens.expiresAt,
      scope:        tokens.scope,
    });

    // ── 4. Fetch initial data (last 7 days) ──────────────────────────────
    const db = convex();

    try {
      const { records: recoveryRecords, tokens: t1 } = await fetchWhoopRecords("recovery", tokens, 7);
      for (const record of recoveryRecords) {
        const rec = record as Record<string, unknown>;
        const date = extractDate(rec);
        if (date) {
          await db.mutation(api.whoop.storeData, { type: "recovery", date, data: rec });
        }
      }

      // Use potentially-refreshed tokens for sleep fetch
      const { records: sleepRecords } = await fetchWhoopRecords("sleep", t1, 7);
      for (const record of sleepRecords) {
        const rec = record as Record<string, unknown>;
        const date = extractDate(rec);
        if (date) {
          await db.mutation(api.whoop.storeData, { type: "sleep", date, data: rec });
        }
      }
    } catch (syncErr) {
      // Non-fatal — tokens are saved, sync can be retried
      console.error("Initial WHOOP data sync error:", syncErr);
    }

    // ── 5. Redirect to success ───────────────────────────────────────────
    return NextResponse.redirect(new URL("/api/whoop/success", request.url));

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("WHOOP callback error:", msg);
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem;background:#060606;color:#E8E4DF;">
        <h2 style="color:#C4533A;">WHOOP Connection Failed</h2>
        <p style="color:#6B6560;">${msg.slice(0, 500)}</p>
        <a href="/" style="color:#B8956A;">← Back to dashboard</a>
      </body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

/** Pull the most relevant date string (ISO) from a WHOOP record */
function extractDate(record: Record<string, unknown>): string | null {
  // Recovery cycle uses created_at; sleep uses start
  const raw =
    (record.created_at as string) ??
    (record.start as string) ??
    (record.during as { lower?: string })?.lower ??
    null;

  if (!raw) return null;
  return raw.slice(0, 10);  // "YYYY-MM-DD"
}
