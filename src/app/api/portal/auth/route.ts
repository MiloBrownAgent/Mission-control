export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import {
  createSessionToken,
  verifySessionToken,
  COOKIE_NAME,
  MAX_AGE,
} from "@/lib/portal-session";

// POST /api/portal/auth — login
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await fetchQuery(api.portalUsers.getByEmail, { email: email.toLowerCase().trim() });

    if (!user || !user.active) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user._id,
      email: user.email,
      clientSlug: user.clientSlug,
      name: user.name,
    });

    // Update lastLoginAt (fire and forget — don't block response)
    fetchMutation(api.portalUsers.updateLastLogin, { id: user._id }).catch(console.error);

    const response = NextResponse.json({
      success: true,
      clientSlug: user.clientSlug,
      name: user.name,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[portal/auth POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/portal/auth — logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
