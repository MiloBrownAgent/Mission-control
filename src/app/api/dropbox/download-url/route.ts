import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

/**
 * Returns a signed direct-download URL pointing to the Mac mini proxy.
 * The browser then fetches that URL directly — Vercel is NOT in the data path.
 * Token is valid for 10 minutes.
 */

const CORS = {
  "Access-Control-Allow-Origin": "https://lookandseen.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const PROXY_SECRET = process.env.PROXY_SECRET || "ls-proxy-9b384beb06bad182de84e8c1ebacbfcd";
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400, headers: CORS });
  }

  // Get Mac mini proxy URL from Convex
  const config = await convex.query(api.dropboxConfig.getConfigInternal);
  const proxyUrl = config?.proxyUrl;

  if (!proxyUrl) {
    return NextResponse.json({ error: "Proxy unavailable" }, { status: 503, headers: CORS });
  }

  // Issue a short-lived signed token
  const ts = Date.now().toString();
  const sig = createHmac("sha256", PROXY_SECRET).update(ts).digest("hex");
  const token = `${ts}.${sig}`;

  const downloadUrl = `${proxyUrl}/download-zip?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`;

  return NextResponse.json({ url: downloadUrl }, { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export const runtime = "nodejs";
