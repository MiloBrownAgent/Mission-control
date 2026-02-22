import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const TELEGRAM_BOT_TOKEN = "8214613908:AAGhMq6p7ygcybeS6fdWnf-DnpuUEJvDfOY";
const DAVE_CHAT_ID = "8510702982";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: Array<{ id: string; title: string }> = body.items ?? [];

    if (!items.length) {
      return NextResponse.json({ ok: false, error: "No items provided" }, { status: 400 });
    }

    // Mark approved in Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const ids = items.map((i) => i.id as Id<"actionItems">);
    await convex.mutation(api.actionItems.bulkApprove, { ids });

    // Notify Dave via Telegram
    const list = items.map((i, idx) => `${idx + 1}. ${i.title}`).join("\n");
    const message = `✅ Got it — ${items.length} item${items.length > 1 ? "s" : ""} approved:\n\n${list}\n\nI'll start on these shortly.`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: DAVE_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    return NextResponse.json({ ok: true, approved: items.length });
  } catch (err) {
    console.error("submit-approvals error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
