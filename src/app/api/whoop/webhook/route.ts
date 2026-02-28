/**
 * WHOOP V2 Webhook Handler
 * WHOOP POSTs here when recovery, sleep, or workout data updates.
 * V2 payload has an empty `payload` field — we fetch the data ourselves.
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { fetchWhoopData, WhoopTokens } from "@/lib/whoop";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const DAVE_CHAT_ID = "8510702982";

function getConvex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

export async function POST(req: NextRequest) {
  // Always return 200 fast — WHOOP retries on non-2xx
  const body = await req.json().catch(() => null);
  if (!body?.type) return NextResponse.json({ ok: true });

  const { type } = body as { type: string };

  // Fire-and-forget data sync
  syncWhoopData(type).catch((err) =>
    console.error("[WHOOP webhook] sync error:", err)
  );

  return NextResponse.json({ ok: true });
}

async function syncWhoopData(type: string) {
  const convex = getConvex();

  const stored = await convex.query(api.whoop.getLatestTokens, {});
  if (!stored) {
    console.warn("[WHOOP webhook] No tokens stored — skipping sync");
    return;
  }

  const tokens: WhoopTokens = {
    userId: stored.userId,
    accessToken: stored.accessToken,
    refreshToken: stored.refreshToken,
    expiresAt: stored.expiresAt,
    scope: stored.scope ?? "",
  };

  const endpointMap: Record<string, { path: string; type: string; dateKey: string }> = {
    "recovery.updated":  { path: "/recovery",          type: "recovery", dateKey: "created_at" },
    "sleep.updated":     { path: "/activity/sleep",    type: "sleep",    dateKey: "start" },
    "workout.updated":   { path: "/activity/workout",  type: "workout",  dateKey: "start" },
  };

  const mapping = endpointMap[type];
  if (!mapping) return;

  const { data } = await fetchWhoopData(mapping.path, tokens);
  const json = data as { records?: unknown[] } | null;
  const record = (json?.records?.[0] ?? json) as Record<string, string> | null;
  if (!record) return;

  const date =
    (record[mapping.dateKey] as string | undefined)?.split("T")[0] ??
    new Date().toISOString().split("T")[0];

  await convex.mutation(api.whoop.storeData, {
    type: mapping.type,
    date,
    data: record,
  });

  // Red-zone recovery alert: notify Dave via Telegram when score < 33
  if (mapping.type === "recovery") {
    const scoreData = (record as unknown as Record<string, Record<string, number>>).score;
    const recoveryScore = scoreData?.recovery_score;
    if (typeof recoveryScore === "number" && recoveryScore < 33) {
      const hrv  = scoreData?.hrv_rmssd_milli    ?? scoreData?.hrv_rmssd_on_wrist ?? null;
      const rhr  = scoreData?.resting_heart_rate ?? null;
      const text =
        `🔴 Recovery alert: Dave's WHOOP score is ${Math.round(recoveryScore)}% today.\n` +
        `HRV: ${hrv !== null ? Math.round(hrv) : "—"}ms · RHR: ${rhr !== null ? Math.round(rhr) : "—"}bpm\n` +
        `Take it easy today.`;
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: DAVE_CHAT_ID, text }),
      }).catch((err) => console.error("[WHOOP webhook] Telegram alert error:", err));
    }
  }
}
