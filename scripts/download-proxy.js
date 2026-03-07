#!/usr/bin/env node
/**
 * Download Proxy Server — runs on Mac mini, exposed via Cloudflare Tunnel
 * Proxies Dropbox download_zip with NO timeout — streams any size file directly.
 * Port: 3031
 */

const http  = require("http");
const https = require("https");

const PORT               = 3031;
const CONVEX_URL         = "https://proper-rat-443.convex.cloud";
const DROPBOX_CLIENT_ID  = "u9cs93z05ropowr";
const DROPBOX_CLIENT_SECRET = "pn081t23liomqkf";
const ALLOWED_ORIGINS    = ["https://lookandseen.com", "https://mc.lookandseen.com", "null", ""];
// Shared secret — Vercel embeds this in short-lived signed tokens
const PROXY_SECRET       = process.env.PROXY_SECRET || "ls-proxy-9b384beb06bad182de84e8c1ebacbfcd";

// ─── Convex helpers ──────────────────────────────────────────────────────────

function convexMutation(name, args) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ path: name, args });
    const req  = https.request(
      {
        hostname: "proper-rat-443.convex.cloud",
        path:     "/api/mutation",
        method:   "POST",
        headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (d) => (data += d));
        res.on("end", () => {
          try {
            const r = JSON.parse(data);
            if (r.status === "error") reject(new Error(r.errorMessage || JSON.stringify(r)));
            else resolve("value" in r ? r.value : r);
          } catch (e) {
            reject(new Error("Convex parse error: " + data.slice(0, 200)));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function convexQuery(name, args) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ path: name, args });
    const req  = https.request(
      {
        hostname: "proper-rat-443.convex.cloud",
        path:     "/api/query",
        method:   "POST",
        headers:  { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (d) => (data += d));
        res.on("end", () => {
          try {
            const r = JSON.parse(data);
            if (r.status === "error") reject(new Error(r.errorMessage || JSON.stringify(r)));
            else resolve("value" in r ? r.value : r);
          } catch (e) {
            reject(new Error("Convex parse error: " + data.slice(0, 200)));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─── Token management ────────────────────────────────────────────────────────

let cachedToken        = null;
let cachedRefreshToken = null;

async function getToken() {
  if (cachedToken) return cachedToken;
  const config = await convexQuery("dropboxConfig:getConfigInternal", {});
  cachedToken        = config?.accessToken   ?? null;
  cachedRefreshToken = config?.refreshToken  ?? null;
  console.log("[token] Loaded from Convex:", cachedToken ? "ok" : "MISSING");
  return cachedToken;
}

async function refreshAccessToken() {
  if (!cachedRefreshToken) throw new Error("No refresh token");
  const body = new URLSearchParams({
    grant_type:    "refresh_token",
    refresh_token: cachedRefreshToken,
    client_id:     DROPBOX_CLIENT_ID,
    client_secret: DROPBOX_CLIENT_SECRET,
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.dropboxapi.com",
        path:     "/oauth2/token",
        method:   "POST",
        headers:  { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (d) => (data += d));
        res.on("end", () => {
          try {
            const j = JSON.parse(data);
            if (!j.access_token) throw new Error("No access_token: " + data);
            cachedToken = j.access_token;
            console.log("[token] Refreshed OK");
            resolve(cachedToken);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─── Dropbox helpers ─────────────────────────────────────────────────────────

function dropboxPost(path, bodyObj, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj);
    const req  = https.request({
      hostname: "api.dropboxapi.com",
      path,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// List all files recursively under a Dropbox path
async function listAllFiles(token, folderPath) {
  const files = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    let res;
    if (!cursor) {
      res = await dropboxPost("/2/files/list_folder", { path: folderPath, recursive: true, limit: 500 }, token);
    } else {
      res = await dropboxPost("/2/files/list_folder/continue", { cursor }, token);
    }

    if (res.status === 401) throw new Error("401");

    const entries = res.body.entries || [];
    for (const e of entries) {
      if (e[".tag"] === "file") files.push(e);
    }
    hasMore = res.body.has_more;
    cursor  = res.body.cursor;
  }

  return files;
}

// Stream a single file from Dropbox and return its readable stream
function downloadDropboxFile(token, dropboxPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "content.dropboxapi.com",
      path:     "/2/files/download",
      method:   "POST",
      headers:  {
        Authorization:    `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath }),
        "Content-Length": "0",
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`Dropbox download failed: ${res.statusCode} for ${dropboxPath}`));
        return;
      }
      resolve(res);
    });
    req.on("error", reject);
    req.end();
  });
}

// Build and stream a ZIP to clientRes using archiver — starts immediately
async function streamCustomZip(token, dropboxPath, clientRes) {
  const archiver = require("/Users/milo/Projects/mission-control/node_modules/archiver");

  const zipName = dropboxPath.split("/").filter(Boolean).pop().replace(/[^a-zA-Z0-9._-]/g, "_") + ".zip";

  // Send headers immediately so browser starts download right away
  clientRes.writeHead(200, {
    "Content-Type":        "application/zip",
    "Content-Disposition": `attachment; filename="${zipName}"`,
    "Transfer-Encoding":   "chunked",
    "Cache-Control":       "no-store",
  });

  const archive = archiver("zip", { zlib: { level: 1 } }); // level 1 = fast, minimal CPU
  archive.pipe(clientRes);

  archive.on("error", (err) => {
    console.error("[archiver] Error:", err.message);
    clientRes.end();
  });

  console.log("[zip] Listing files in", dropboxPath);
  const files = await listAllFiles(token, dropboxPath);
  console.log(`[zip] Found ${files.length} files — starting ZIP stream`);

  // Strip the root folder path prefix for clean relative paths inside the ZIP
  const prefix = dropboxPath.toLowerCase();

  for (const file of files) {
    const relativePath = file.path_lower.startsWith(prefix)
      ? file.path_lower.slice(prefix.length).replace(/^\//, "")
      : file.name;

    try {
      const stream = await downloadDropboxFile(token, file.path_lower);
      archive.append(stream, { name: relativePath });
    } catch (e) {
      console.warn(`[zip] Skipping ${file.name}:`, e.message);
    }
  }

  await archive.finalize();
  let bytes = 0;
  archive.on("data", chunk => {
    bytes += chunk.length;
    if (bytes % (50 * 1024 * 1024) < chunk.length)
      console.log(`[zip] Streamed ${(bytes / 1024 / 1024).toFixed(0)} MB`);
  });
  archive.on("end", () => console.log(`[zip] Done — ${(bytes / 1024 / 1024).toFixed(1)} MB total`));
}

// ─── Main streaming entry point ───────────────────────────────────────────────

async function streamDropboxZip(token, dropboxPath, clientRes, retried) {
  try {
    await streamCustomZip(token, dropboxPath, clientRes);
  } catch (e) {
    if (e.message === "401" && !retried) {
      console.log("[token] Refreshing...");
      try {
        const newToken = await refreshAccessToken();
        await streamDropboxZip(newToken, dropboxPath, clientRes, true);
      } catch (e2) {
        if (!clientRes.headersSent) clientRes.writeHead(502);
        clientRes.end(JSON.stringify({ error: "Token refresh failed" }));
      }
    } else {
      console.error("[dropbox] Error:", e.message);
      if (!clientRes.headersSent) clientRes.writeHead(500);
      clientRes.end(JSON.stringify({ error: e.message }));
    }
  }
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, clientRes) => {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    clientRes.setHeader("Access-Control-Allow-Origin", origin);
    clientRes.setHeader("Vary", "Origin");
  }
  clientRes.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  clientRes.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { clientRes.writeHead(204); clientRes.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== "/download-zip") {
    clientRes.writeHead(404); clientRes.end(JSON.stringify({ error: "Not found" })); return;
  }

  // Validate signed token: format = "<ts>.<hmac-sha256>"
  const reqToken = url.searchParams.get("token");
  if (!reqToken) {
    clientRes.writeHead(401); clientRes.end(JSON.stringify({ error: "Missing token" })); return;
  }
  try {
    const [tsStr, sig] = reqToken.split(".");
    const ts = parseInt(tsStr, 10);
    if (isNaN(ts) || Date.now() - ts > 10 * 60 * 1000) {
      clientRes.writeHead(401); clientRes.end(JSON.stringify({ error: "Token expired" })); return;
    }
    const crypto = require("crypto");
    const expected = crypto.createHmac("sha256", PROXY_SECRET).update(tsStr).digest("hex");
    if (expected !== sig) {
      clientRes.writeHead(401); clientRes.end(JSON.stringify({ error: "Invalid token" })); return;
    }
  } catch {
    clientRes.writeHead(401); clientRes.end(JSON.stringify({ error: "Bad token" })); return;
  }

  const dropboxPath = url.searchParams.get("path");
  if (!dropboxPath) {
    clientRes.writeHead(400); clientRes.end(JSON.stringify({ error: "Missing path" })); return;
  }

  // Set CORS headers for direct browser access
  clientRes.setHeader("Access-Control-Allow-Origin", "*");
  clientRes.setHeader("Content-Disposition", `attachment; filename="${dropboxPath.split("/").pop()}.zip"`);

  console.log("[request] Download:", dropboxPath);

  try {
    const token = await getToken();
    if (!token) {
      clientRes.writeHead(401); clientRes.end(JSON.stringify({ error: "No token" })); return;
    }
    streamDropboxZip(token, dropboxPath, clientRes, false);
  } catch (e) {
    console.error("[error]", e.message);
    if (!clientRes.headersSent) clientRes.writeHead(500);
    clientRes.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`[download-proxy] Listening on port ${PORT}`);

  // Write tunnel URL to Convex so MC route can find us (set via TUNNEL_URL env var)
  const tunnelUrl = process.env.TUNNEL_URL;
  if (tunnelUrl) {
    convexMutation("dropboxConfig:setProxyUrl", { proxyUrl: tunnelUrl })
      .then(() => console.log(`[proxy] Registered tunnel URL in Convex: ${tunnelUrl}`))
      .catch((e) => console.error("[proxy] Failed to register tunnel URL:", e.message));
  } else {
    console.log("[proxy] No TUNNEL_URL env var — not registering in Convex");
  }
});
