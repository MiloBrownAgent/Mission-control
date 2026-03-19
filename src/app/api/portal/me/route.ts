import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/portal-session";

// GET /api/portal/me — return current portal session or 401
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
  }

  return NextResponse.json(session);
}
