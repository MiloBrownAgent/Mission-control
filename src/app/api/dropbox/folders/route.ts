import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") || "";

  try {
    const config = await convex.query(api.dropboxConfig.getConfigInternal);
    if (!config) {
      return NextResponse.json({ error: "Dropbox not connected" }, { status: 401 });
    }

    const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: path || "",
        limit: 200,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Dropbox list_folder error:", err);
      return NextResponse.json({ error: "Failed to list folder" }, { status: 502 });
    }

    const data = await res.json();

    const folders = data.entries
      .filter((e: { ".tag": string }) => e[".tag"] === "folder")
      .map((e: { name: string; path_lower: string }) => ({
        name: e.name,
        path: e.path_lower,
      }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    const files = data.entries
      .filter((e: { ".tag": string }) => e[".tag"] === "file")
      .map((e: { name: string; path_lower: string; size: number }) => ({
        name: e.name,
        path: e.path_lower,
        size: e.size,
      }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "https://lookandseen.com");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");

    return NextResponse.json({ folders, files }, { headers });
  } catch (error) {
    console.error("Dropbox folders error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://lookandseen.com",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
