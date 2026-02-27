import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const CORS = {
  "Access-Control-Allow-Origin": "https://lookandseen.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Auto-refresh expired Dropbox access token using stored refresh token
async function refreshDropboxToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.DROPBOX_CLIENT_ID || "u9cs93z05ropowr",
        client_secret: process.env.DROPBOX_CLIENT_SECRET || "pn081t23liomqkf",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newToken = data.access_token as string;
    // Save new token to Convex
    await convex.mutation(api.dropboxConfig.saveConfig, {
      accessToken: newToken,
      refreshToken,
    });
    return newToken;
  } catch {
    return null;
  }
}

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".tiff", ".tif"]);

function isImageFile(name: string) {
  const ext = name.toLowerCase().slice(name.lastIndexOf("."));
  return IMAGE_EXTS.has(ext);
}

function getFileType(name: string): string {
  const ext = name.toLowerCase().slice(name.lastIndexOf("."));
  if (IMAGE_EXTS.has(ext)) return "image";
  if ([".mp4", ".mov", ".avi", ".webm"].includes(ext)) return "video";
  if ([".pdf"].includes(ext)) return "pdf";
  if ([".doc", ".docx"].includes(ext)) return "doc";
  if ([".xls", ".xlsx"].includes(ext)) return "sheet";
  if ([".zip", ".rar", ".7z"].includes(ext)) return "archive";
  if ([".ai", ".psd", ".eps"].includes(ext)) return "design";
  return "file";
}

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path") || "";

  try {
    const config = await convex.query(api.dropboxConfig.getConfigInternal);
    if (!config) {
      return NextResponse.json({ error: "Dropbox not connected" }, { status: 401 });
    }

    let token = config.accessToken;

    // List folder (with auto-refresh on 401)
    let listRes = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path: path || "", limit: 200 }),
    });

    if (listRes.status === 401 && config.refreshToken) {
      const newToken = await refreshDropboxToken(config.refreshToken);
      if (newToken) {
        token = newToken;
        listRes = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ path: path || "", limit: 200 }),
        });
      }
    }

    if (!listRes.ok) {
      console.error("Dropbox list_folder error:", await listRes.text());
      return NextResponse.json({ error: "Failed to list folder" }, { status: 502, headers: CORS });
    }

    const data = await listRes.json();

    const folders = data.entries
      .filter((e: { ".tag": string }) => e[".tag"] === "folder")
      .map((e: { name: string; path_lower: string }) => ({ name: e.name, path: e.path_lower }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    const rawFiles = data.entries.filter((e: { ".tag": string }) => e[".tag"] === "file");

    // Batch-fetch thumbnails for image files (max 25 per batch)
    const imageFiles = rawFiles.filter((e: { name: string }) => isImageFile(e.name));
    const thumbnailMap: Record<string, string> = {};

    if (imageFiles.length > 0) {
      const entries = imageFiles.slice(0, 25).map((e: { path_lower: string }) => ({
        path: e.path_lower,
        format: { ".tag": "jpeg" },
        size: { ".tag": "w640h480" },
        mode: { ".tag": "fitone_bestfit" },
      }));

      try {
        const thumbRes = await fetch("https://content.dropboxapi.com/2/files/get_thumbnail_batch", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
        });

        if (thumbRes.ok) {
          const thumbData = await thumbRes.json();
          for (const entry of thumbData.entries) {
            if (entry[".tag"] === "success") {
              const path = entry.metadata.path_lower;
              thumbnailMap[path] = `data:image/jpeg;base64,${entry.thumbnail}`;
            }
          }
        }
      } catch (e) {
        console.warn("Thumbnail batch failed:", e);
      }
    }

    const files = rawFiles
      .map((e: { name: string; path_lower: string; size: number }) => ({
        name: e.name,
        path: e.path_lower,
        size: e.size,
        fileType: getFileType(e.name),
        isImage: isImageFile(e.name),
        thumbnailUrl: thumbnailMap[e.path_lower] || null,
      }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return NextResponse.json({ folders, files }, { headers: CORS });
  } catch (error) {
    console.error("Dropbox folders error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
