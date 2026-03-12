#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
const hasExplicitMode = args.includes("--force") || args.includes("--dry-run");
const hasTicker = args.some((arg) => !arg.startsWith("--"));

const forwarded = ["scripts/thesis-refresh.js"];
if (hasTicker && !hasExplicitMode) forwarded.push("--force");
forwarded.push(...args);

const child = spawnSync(process.execPath, forwarded, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (child.error) {
  console.error(child.error);
  process.exit(1);
}

process.exit(child.status ?? 0);
