import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

export const maxDuration = 300; // Vercel Pro — large Dropbox folders with many thumbnails

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

    // --- Paginate list_folder to get ALL entries ---
    type DropboxEntry = { ".tag": string; name: string; path_lower: string; size?: number };
    const allEntries: DropboxEntry[] = [];

    const doList = async (tkn: string): Promise<{ entries: DropboxEntry[]; has_more: boolean; cursor: string }> => {
      const r = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
        method: "POST",
        headers: { Authorization: `Bearer ${tkn}`, "Content-Type": "application/json" },
        body: JSON.stringify({ path: path || "", limit: 1000 }),
      });
      if (!r.ok) throw new Error(`list_folder ${r.status}`);
      return r.json();
    };

    let page = await doList(token).catch(async (e) => {
      if (String(e).includes("401") && config.refreshToken) {
        const newToken = await refreshDropboxToken(config.refreshToken);
        if (newToken) { token = newToken; return doList(newToken); }
      }
      throw e;
    });

    allEntries.push(...page.entries);

    while (page.has_more) {
      const cont = await fetch("https://api.dropboxapi.com/2/files/list_folder/continue", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cursor: page.cursor }),
      });
      if (!cont.ok) break;
      page = await cont.json();
      allEntries.push(...page.entries);
    }

    const folders = allEntries
      .filter((e) => e[".tag"] === "folder")
      .map((e) => ({ name: e.name, path: e.path_lower }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const rawFiles = allEntries.filter((e) => e[".tag"] === "file");

    // --- Batch-fetch thumbnails: max 25/batch, 5 concurrent to avoid rate limits ---
    const imageFiles = rawFiles.filter((e) => isImageFile(e.name));
    const thumbnailMap: Record<string, string> = {};
    const THUMB_BATCH = 25;
    const CONCURRENCY  = 5;

    const thumbChunks: DropboxEntry[][] = [];
    for (let i = 0; i < imageFiles.length; i += THUMB_BATCH) {
      thumbChunks.push(imageFiles.slice(i, i + THUMB_BATCH));
    }

    // Process in windows of CONCURRENCY batches at a time
    for (let i = 0; i < thumbChunks.length; i += CONCURRENCY) {
      await Promise.all(
        thumbChunks.slice(i, i + CONCURRENCY).map(async (chunk) => {
          const entries = chunk.map((e) => ({
            path: e.path_lower,
            format: { ".tag": "jpeg" },
            size: { ".tag": "w128h128" },   // smaller = faster for large folders
            mode: { ".tag": "fitone_bestfit" },
          }));
          try {
            const r = await fetch("https://content.dropboxapi.com/2/files/get_thumbnail_batch", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ entries }),
            });
            if (r.ok) {
              const d = await r.json();
              for (const entry of d.entries) {
                if (entry[".tag"] === "success") {
                  thumbnailMap[entry.metadata.path_lower] = `data:image/jpeg;base64,${entry.thumbnail}`;
                }
              }
            }
          } catch (e) {
            console.warn("Thumbnail batch failed:", e);
          }
        })
      );
    }

    const files = rawFiles
      .map((e: DropboxEntry) => ({
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
