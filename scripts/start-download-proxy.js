#!/usr/bin/env node
/**
 * start-download-proxy.js
 *
 * Launches cloudflared quick tunnel → captures URL → registers in Convex →
 * starts the download-proxy server (port 3031).
 *
 * No Cloudflare account needed (trycloudflare.com).
 * URL auto-registers in Convex on every boot so Vercel route always finds us.
 */

const { spawn } = require("child_process");
const https      = require("https");

const CONVEX_URL     = "https://proper-rat-443.convex.cloud";
const PROXY_PORT     = 3031;
const CF_BIN         = "/opt/homebrew/bin/cloudflared";

// ── Convex helper ─────────────────────────────────────────────────────────────
function setProxyUrl(proxyUrl) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ path: "dropboxConfig:setProxyUrl", args: { proxyUrl } });
    const req  = https.request(
      { hostname: "proper-rat-443.convex.cloud", path: "/api/mutation",
        method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => { res.resume(); res.on("end", resolve); }
    );
    req.on("error", (e) => { console.error("[convex] Failed to register URL:", e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

// ── Start cloudflared quick tunnel ───────────────────────────────────────────
console.log("[launcher] Starting cloudflared quick tunnel → localhost:" + PROXY_PORT);

const cf = spawn(CF_BIN, [
  "tunnel", "--url", `http://localhost:${PROXY_PORT}`,
  "--no-autoupdate",
], { stdio: ["ignore", "pipe", "pipe"] });

let tunnelUrl = null;

function parseTunnelUrl(data) {
  const str = data.toString();
  const match = str.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (match && !tunnelUrl) {
    tunnelUrl = match[0];
    console.log("[launcher] Tunnel URL:", tunnelUrl);
    setProxyUrl(tunnelUrl).then(() => {
      console.log("[launcher] Registered in Convex:", tunnelUrl);
    });
  }
  // Log cloudflared output for debugging
  process.stdout.write("[cf] " + str);
}

cf.stdout.on("data", parseTunnelUrl);
cf.stderr.on("data", parseTunnelUrl);

cf.on("exit", (code) => {
  console.error("[launcher] cloudflared exited with code", code, "— restarting in 5s");
  setTimeout(() => {
    // LaunchAgent KeepAlive will restart the whole process
    process.exit(1);
  }, 5000);
});

// ── Start the download-proxy server ──────────────────────────────────────────
// Small delay to let the tunnel come up first
setTimeout(() => {
  console.log("[launcher] Starting download-proxy server on port", PROXY_PORT);
  require("./download-proxy.js");
}, 2000);
