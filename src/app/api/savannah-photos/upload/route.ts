import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const FOLDER_PATH = "/Savannah March 2026";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

export async function POST(request: NextRequest) {
  try {
    const config = await convex.query(api.dropboxConfig.getConfigInternal);
    if (!config) {
      return NextResponse.json({ error: "Dropbox not connected" }, { status: 401 });
    }

    let token = config.accessToken;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const uploaderName = (formData.get("uploaderName") as string) || "unknown";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 });
    }

    const timestamp = Date.now();
    const safeName = uploaderName.replace(/[^a-zA-Z0-9\-_]/g, "_");
    const originalName = file.name;
    const newFileName = `${safeName}-${timestamp}-${originalName}`;
    const uploadPath = `${FOLDER_PATH}/${newFileName}`;

    const fileBuffer = await file.arrayBuffer();

    const dropboxArg = JSON.stringify({
      path: uploadPath,
      mode: "add",
      autorename: true,
      mute: false,
    });

    let uploadRes = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": dropboxArg,
      },
      body: fileBuffer,
    });

    // Handle expired token
    if (uploadRes.status === 401 && config.refreshToken) {
      const newToken = await refreshDropboxToken(config.refreshToken);
      if (newToken) {
        token = newToken;
        uploadRes = await fetch("https://content.dropboxapi.com/2/files/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": dropboxArg,
          },
          body: fileBuffer,
        });
      }
    }

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error("Dropbox upload error:", errorText);
      return NextResponse.json({ error: "Upload failed" }, { status: 502 });
    }

    const result = await uploadRes.json();

    return NextResponse.json({
      success: true,
      path: result.path_lower,
      name: result.name,
    });
  } catch (error) {
    console.error("savannah-photos upload error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
