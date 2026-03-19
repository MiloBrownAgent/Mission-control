export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";

function isAdminAuthed(request: NextRequest): boolean {
  return request.cookies.get("mc_work_auth")?.value === "authenticated";
}

// GET /api/portal/users — list portal users (admin only)
export async function GET(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientSlug = searchParams.get("clientSlug");

  const users = clientSlug
    ? await fetchQuery(api.portalUsers.listByClient, { clientSlug })
    : await fetchQuery(api.portalUsers.listAll, {});

  // Strip password hashes from response
  const safeUsers = users.map(({ passwordHash: _ph, ...rest }) => rest);

  return NextResponse.json(safeUsers);
}

// POST /api/portal/users — create a portal user (admin only)
export async function POST(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, password, clientSlug, name } = await request.json();

    if (!email || !password || !clientSlug) {
      return NextResponse.json({ error: "email, password, and clientSlug are required" }, { status: 400 });
    }

    // Check for duplicate email
    const existing = await fetchQuery(api.portalUsers.getByEmail, { email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const id = await fetchMutation(api.portalUsers.createPortalUser, {
      email: email.toLowerCase().trim(),
      passwordHash,
      clientSlug,
      name,
    });

    return NextResponse.json({ success: true, id, email, clientSlug, name }, { status: 201 });
  } catch (err) {
    console.error("[portal/users POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
