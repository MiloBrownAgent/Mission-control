import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

/**
 * ZIP download proxy — routes through Mac mini download-proxy server.
 *
 * 1. Reads proxyUrl from Convex (set by start-download-proxy.js on boot)
 * 2. Calls Mac mini at proxyUrl/download-zip?path=...
 * 3. Streams the ZIP back to the client (no Vercel timeout — Mac mini handles it)
 *
 * Falls back to Dropbox shared-link redirect if proxy is unavailable.
 */
export const maxDuration = 300;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://lookandseen.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function getProxyUrl(): Promise<string | null> {
  try {
    const config = await convex.query(api.dropboxConfig.getConfigInternal);
    return config?.proxyUrl ?? null;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<{ token: string; refreshToken?: string } | null> {
  const config = await convex.query(api.dropboxConfig.getConfigInternal);
  if (!config?.accessToken) return null;
  return { token: config.accessToken, refreshToken: config.refreshToken ?? undefined };
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.DROPBOX_CLIENT_ID ?? "u9cs93z05ropowr",
      client_secret: process.env.DROPBOX_CLIENT_SECRET ?? "pn081t23liomqkf",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

async function getOrCreateSharedLink(token: string, path: string): Promise<string | null> {
  const createRes = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path, settings: { requested_visibility: "viewer" } }),
  });
  if (createRes.ok) {
    const data = await createRes.json();
    return data.url ?? null;
  }
  if (createRes.status === 409) {
    const errBody = await createRes.json().catch(() => ({}));
    const tag = errBody?.error?.[".tag"] ?? errBody?.error_summary ?? "";
    if (tag.includes("shared_link_already_exists")) {
      const listRes = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ path, direct_only: true }),
      });
      if (!listRes.ok) return null;
      const listData = await listRes.json();
      return listData?.links?.[0]?.url ?? null;
    }
  }
  return null;
}

function toDirectDownloadUrl(shareUrl: string): string {
  try {
    const u = new URL(shareUrl);
    u.searchParams.set("dl", "1");
    return u.toString();
  } catch {
    return shareUrl.includes("?") ? `${shareUrl}&dl=1` : `${shareUrl}?dl=1`;
  }
}

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400, headers: CORS_HEADERS });
  }

  // ── Path A: stream through Mac mini proxy ────────────────────────────────
  const proxyUrl = await getProxyUrl();
  if (proxyUrl) {
    try {
      const url = `${proxyUrl}/download-zip?path=${encodeURIComponent(path)}`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(290_000) });
      if (upstream.ok && upstream.body) {
        const headers: Record<string, string> = { ...CORS_HEADERS };
        const ct = upstream.headers.get("content-type");
        const cd = upstream.headers.get("content-disposition");
        const cl = upstream.headers.get("content-length");
        if (ct) headers["Content-Type"] = ct;
        if (cd) headers["Content-Disposition"] = cd;
        if (cl) headers["Content-Length"] = cl;
        return new NextResponse(upstream.body, { status: 200, headers });
      }
    } catch (err) {
      console.error("[download-zip] Proxy error, falling back:", err);
    }
  }

  // ── Path B: shared-link redirect fallback ────────────────────────────────
  try {
    let creds = await getAccessToken();
    if (!creds) {
      return NextResponse.json({ error: "Dropbox not connected" }, { status: 401, headers: CORS_HEADERS });
    }
    let shareUrl = await getOrCreateSharedLink(creds.token, path);
    if (!shareUrl && creds.refreshToken) {
      const newToken = await refreshAccessToken(creds.refreshToken);
      if (newToken) shareUrl = await getOrCreateSharedLink(newToken, path);
    }
    if (!shareUrl) {
      return NextResponse.json({ error: "Could not generate download link." }, { status: 502, headers: CORS_HEADERS });
    }
    return NextResponse.redirect(toDirectDownloadUrl(shareUrl), {
      status: 302,
      headers: { ...CORS_HEADERS, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[download-zip] Fallback error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
