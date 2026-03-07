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
const ALLOWED_ORIGINS    = ["https://lookandseen.com", "https://mc.lookandseen.com"];

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

// ─── Dropbox streaming ───────────────────────────────────────────────────────

function streamDropboxZip(token, dropboxPath, clientRes, retried) {
  const apiArg = JSON.stringify({ path: dropboxPath });
  const req    = https.request(
    {
      hostname: "content.dropboxapi.com",
      path:     "/2/files/download_zip",
      method:   "POST",
      headers:  { Authorization: `Bearer ${token}`, "Dropbox-API-Arg": apiArg },
    },
    (dbRes) => {
      console.log("[dropbox] Status:", dbRes.statusCode, "for", dropboxPath);

      if (dbRes.statusCode === 401 && !retried) {
        dbRes.resume();
        refreshAccessToken()
          .then((t) => streamDropboxZip(t, dropboxPath, clientRes, true))
          .catch((e) => {
            if (!clientRes.headersSent) clientRes.writeHead(502);
            clientRes.end(JSON.stringify({ error: "Token refresh failed" }));
          });
        return;
      }

      if (dbRes.statusCode !== 200) {
        if (!clientRes.headersSent) clientRes.writeHead(dbRes.statusCode ?? 502);
        dbRes.pipe(clientRes);
        return;
      }

      // Stream the ZIP directly to the client — no buffering
      const zipName = dropboxPath.split("/").pop().replace(/[^a-zA-Z0-9._-]/g, "_") + ".zip";
      clientRes.writeHead(200, {
        "Content-Type":        "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Transfer-Encoding":   "chunked",
        "Cache-Control":       "no-store",
      });
      dbRes.pipe(clientRes);

      let bytes = 0;
      dbRes.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes % (50 * 1024 * 1024) < chunk.length)
          console.log(`[dropbox] Streamed ${(bytes / 1024 / 1024).toFixed(0)} MB`);
      });
      dbRes.on("end", () => console.log(`[dropbox] Done — ${(bytes / 1024 / 1024).toFixed(1)} MB total`));
    }
  );
  req.on("error", (e) => {
    console.error("[dropbox] Request error:", e.message);
    if (!clientRes.headersSent) clientRes.writeHead(502);
    clientRes.end(JSON.stringify({ error: e.message }));
  });
  req.end();
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

  const dropboxPath = url.searchParams.get("path");
  if (!dropboxPath) {
    clientRes.writeHead(400); clientRes.end(JSON.stringify({ error: "Missing path" })); return;
  }

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
