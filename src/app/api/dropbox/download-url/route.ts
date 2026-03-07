import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

/**
 * Returns a temporary Dropbox shared link for a file or folder.
 * Browser downloads directly from Dropbox CDN — no Mac mini, no Vercel in the data path.
 * Folders download as ZIP from Dropbox's own infrastructure.
 * Links expire after 4 hours.
 */

const CORS = {
  "Access-Control-Allow-Origin": "https://lookandseen.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DROPBOX_CLIENT_ID     = process.env.DROPBOX_CLIENT_ID     || "u9cs93z05ropowr";
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET || "pn081t23liomqkf";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function refreshToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    refresh_token: refreshToken,
    client_id:     DROPBOX_CLIENT_ID,
    client_secret: DROPBOX_CLIENT_SECRET,
  });
  const res  = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token refresh failed");
  return data.access_token;
}

async function getOrCreateSharedLink(token: string, path: string): Promise<string> {
  // Try to create a new shared link
  const createRes = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      settings: {
        requested_visibility: { ".tag": "public" },
        audience: { ".tag": "public" },
        access: { ".tag": "viewer" },
      },
    }),
  });

  const createData = await createRes.json();

  // If link already exists, fetch it
  if (createData.error_summary?.startsWith("shared_link_already_exists")) {
    const listRes = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path, direct_only: true }),
    });
    const listData = await listRes.json();
    const link = listData.links?.[0]?.url;
    if (!link) throw new Error("Could not retrieve existing shared link");
    return link;
  }

  if (!createData.url) throw new Error(`Dropbox error: ${createData.error_summary || JSON.stringify(createData)}`);
  return createData.url;
}

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400, headers: CORS });
  }

  try {
    // Get Dropbox token from Convex
    const config = await convex.query(api.dropboxConfig.getConfigInternal);
    let token: string = config?.accessToken ?? "";
    if (!token) return NextResponse.json({ error: "No Dropbox token" }, { status: 503, headers: CORS });

    // Get or create a shared link
    let sharedUrl: string;
    try {
      sharedUrl = await getOrCreateSharedLink(token, path);
    } catch (e: any) {
      // Try refreshing token once
      if (config?.refreshToken) {
        token     = await refreshToken(config.refreshToken);
        sharedUrl = await getOrCreateSharedLink(token, path);
      } else {
        throw e;
      }
    }

    // Convert www.dropbox.com share URL → direct download:
    // Replace ?dl=0 with ?dl=1 (or add it), and use dl.dropboxusercontent.com for direct stream
    const downloadUrl = sharedUrl
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace(/[?&]dl=0/, "")
      .replace(/(\?.*)$/, "$1&dl=1")
      .replace(/^([^?]*)$/, "$1?dl=1");

    return NextResponse.json({ url: downloadUrl }, { headers: CORS });
  } catch (err: any) {
    console.error("[download-url] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export const runtime = "nodejs";
