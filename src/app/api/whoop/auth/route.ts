import { NextResponse } from "next/server";

/**
 * GET /api/whoop/auth
 * Initiates WHOOP OAuth 2.0 authorization code flow.
 * Redirects the browser to WHOOP's auth page with all required scopes.
 */
export async function GET() {
  const clientId     = process.env.WHOOP_CLIENT_ID;
  const redirectUri  = process.env.WHOOP_REDIRECT_URI ?? "https://mc.lookandseen.com/api/whoop/callback";

  if (!clientId) {
    return new NextResponse("WHOOP_CLIENT_ID environment variable is not set. Add credentials in Vercel.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // All available WHOOP API scopes
  const scopes = [
    "read:recovery",
    "read:sleep",
    "read:profile",
    "read:workout",
    "read:body_measurement",
    "read:cycles",
    "offline",   // required for refresh tokens
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    redirect_uri:  redirectUri,
    scope:         scopes,
    state:         "mc_whoop_auth",   // simple CSRF token; no server-side session needed for single-user
  });

  const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
