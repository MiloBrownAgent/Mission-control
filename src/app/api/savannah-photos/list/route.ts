import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const FOLDER_PATH = "/Savannah March 2026";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".heic", ".gif", ".webp"]);

function isImageFile(name: string) {
  const ext = name.toLowerCase().slice(name.lastIndexOf("."));
  return IMAGE_EXTS.has(ext);
}

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
    await convex.mutation(api.dropboxConfig.saveConfig, {
      accessToken: newToken,
      refreshToken,
    });
    return newToken;
  } catch {
    return null;
  }
}

async function ensureFolder(token: string) {
  try {
    await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path: FOLDER_PATH, autorename: false }),
    });
  } catch {
    // folder may already exist — ignore
  }
}

export async function GET() {
  try {
    const config = await convex.query(api.dropboxConfig.getConfigInternal);
    if (!config) {
      return NextResponse.json({ error: "Dropbox not connected" }, { status: 401 });
    }

    let token = config.accessToken;

    // List folder
    let listRes = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ path: FOLDER_PATH, limit: 200 }),
    });

    // Handle expired token
    if (listRes.status === 401 && config.refreshToken) {
      const newToken = await refreshDropboxToken(config.refreshToken);
      if (newToken) {
        token = newToken;
        listRes = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ path: FOLDER_PATH, limit: 200 }),
        });
      }
    }

    // Handle folder not found — create it and return empty
    if (!listRes.ok) {
      const errorText = await listRes.text();
      if (errorText.includes("not_found") || errorText.includes("path/not_found")) {
        await ensureFolder(token);
        return NextResponse.json({ photos: [] });
      }
      console.error("Dropbox list_folder error:", errorText);
      return NextResponse.json({ error: "Failed to list folder" }, { status: 502 });
    }

    const data = await listRes.json();

    const rawFiles = (data.entries as Array<{ ".tag": string; name: string; path_lower: string; size: number; server_modified: string }>)
      .filter((e) => e[".tag"] === "file" && isImageFile(e.name));

    // Batch thumbnails (max 25)
    const thumbnailMap: Record<string, string> = {};
    if (rawFiles.length > 0) {
      const entries = rawFiles.slice(0, 25).map((e) => ({
        path: e.path_lower,
        format: { ".tag": "jpeg" },
        size: { ".tag": "w480h320" },
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
              thumbnailMap[entry.metadata.path_lower] = `data:image/jpeg;base64,${entry.thumbnail}`;
            }
          }
        }
      } catch (e) {
        console.warn("Thumbnail batch failed:", e);
      }
    }

    const photos = rawFiles.map((e) => ({
      name: e.name,
      path: e.path_lower,
      size: e.size,
      modified: e.server_modified,
      thumbnailUrl: thumbnailMap[e.path_lower] || null,
    }));

    // Sort by modified descending (newest first)
    photos.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("savannah-photos list error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
