import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const CORS = {
  "Access-Control-Allow-Origin": "https://lookandseen.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400, headers: CORS });
  }

  try {
    const config = await convex.query(api.dropboxConfig.getConfigInternal);
    if (!config) {
      return NextResponse.json({ error: "Dropbox not connected" }, { status: 401, headers: CORS });
    }

    const res = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path }),
    });

    if (!res.ok) {
      console.error("Dropbox get_temporary_link error:", await res.text());
      return NextResponse.json({ error: "Failed to get download link" }, { status: 502, headers: CORS });
    }

    const data = await res.json();
    return NextResponse.redirect(data.link, { headers: CORS });
  } catch (error) {
    console.error("Dropbox download error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
