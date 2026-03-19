import { NextRequest, NextResponse } from "next/server";
import { pbkdf2Sync, randomBytes } from "crypto";

const CONVEX_URL = "https://proper-rat-443.convex.cloud";

async function convexQuery(path: string, args: Record<string, unknown>) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Convex-Client": "npm-1.33.0",
    },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!res.ok) throw new Error(`Convex query failed: ${res.status}`);
  const data = await res.json();
  return data.value;
}

async function convexMutation(path: string, args: Record<string, unknown>) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Convex-Client": "npm-1.33.0",
    },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!res.ok) throw new Error(`Convex mutation failed: ${res.status}`);
  const data = await res.json();
  return data.value;
}

// GET /api/portal-admin/accounts — list all accounts
export async function GET() {
  try {
    const accounts = await convexQuery("clientPortal:listAccounts", {});
    return NextResponse.json({ accounts });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to list accounts" }, { status: 500 });
  }
}

// POST /api/portal-admin/accounts — create a new account
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; clientSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password, clientSlug } = body;
  if (!email || !password || !clientSlug) {
    return NextResponse.json({ error: "email, password, and clientSlug are required" }, { status: 400 });
  }

  // Hash password server-side with PBKDF2
  const salt = randomBytes(32).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100000, 64, "sha256").toString("hex");

  try {
    const id = await convexMutation("clientPortal:createAccount", {
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      passwordSalt: salt,
      clientSlug,
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
