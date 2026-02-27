import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/office/links?error=no_code", request.url));
  }

  try {
    const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: process.env.DROPBOX_CLIENT_ID!,
        client_secret: process.env.DROPBOX_CLIENT_SECRET!,
        redirect_uri: "https://mc.lookandseen.com/api/dropbox/callback",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Dropbox token exchange failed:", err);
      return NextResponse.redirect(new URL(`/office/links?error=token_exchange&detail=${encodeURIComponent(err.slice(0, 200))}`, request.url));
    }

    const tokens = await tokenRes.json();

    try {
      await convex.mutation(api.dropboxConfig.saveConfig, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
    } catch (convexErr) {
      const msg = convexErr instanceof Error ? convexErr.message : String(convexErr);
      console.error("Convex save failed:", msg);
      return NextResponse.redirect(new URL(`/office/links?error=convex_save&detail=${encodeURIComponent(msg.slice(0, 200))}`, request.url));
    }

    return NextResponse.redirect(new URL("/office/links?connected=true", request.url));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Dropbox OAuth error:", msg);
    return NextResponse.redirect(new URL(`/office/links?error=oauth_failed&detail=${encodeURIComponent(msg.slice(0, 200))}`, request.url));
  }
}
