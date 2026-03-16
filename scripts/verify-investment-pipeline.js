#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const NODE_BIN = process.execPath;

function run(label, args, timeoutMs = 120000, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = spawnSync(NODE_BIN, args, {
      cwd: ROOT,
      encoding: "utf8",
      timeout: timeoutMs,
    });

    let parsed = null;
    const stdout = (result.stdout || "").trim();
    if (stdout) {
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = null;
      }
    }

    const stderr = (result.stderr || "").trim();
    const isTransient = result.error || (stderr.includes("ETIMEDOUT") || stderr.includes("ECONNRESET") || stderr.includes("fetch failed"));

    if (result.status === 0 || attempt >= retries || !isTransient) {
      return { label, args, result, parsed, stdout, stderr };
    }

    // Brief pause before retry
    spawnSync("sleep", ["2"]);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function summarize(runResult) {
  return {
    label: runResult.label,
    status: runResult.result.status,
    signal: runResult.result.signal,
    stdout: runResult.stdout.slice(0, 400),
    stderr: runResult.stderr.slice(0, 400),
  };
}

function main() {
  const scanCheck = run("daily-opportunity-scan dry run", ["scripts/daily-opportunity-scan.js", "--dry-run"]);
  const thesisCheck = run("thesis-refresh dry run", ["scripts/thesis-refresh.js", "--dry-run"]);
  const auditCheck = run("duplicate audit", ["scripts/audit-opportunity-duplicates.js", "--json"]);

  for (const check of [scanCheck, thesisCheck]) {
    assert(check.result.error == null, `${check.label} failed to start: ${check.result.error?.message || "unknown error"}`);
    assert(check.result.status === 0, `${check.label} exited ${check.result.status}: ${check.stderr || check.stdout}`);
    assert(check.parsed && typeof check.parsed === "object", `${check.label} did not return JSON`);
  }

  assert(scanCheck.parsed.ok === true, "daily-opportunity-scan dry run did not return ok=true");
  assert(Array.isArray(scanCheck.parsed.failures), "daily-opportunity-scan dry run missing failures array");
  assert(typeof thesisCheck.parsed.ok === "boolean", "thesis-refresh dry run missing ok flag");
  assert(Array.isArray(thesisCheck.parsed.results) || thesisCheck.parsed.refreshed === 0, "thesis-refresh dry run missing results array");

  const auditSummary = summarize(auditCheck);
  const auditReady = auditCheck.result.status === 0 && auditCheck.parsed && typeof auditCheck.parsed.duplicateTickerCount === "number";

  console.log(JSON.stringify({
    ok: true,
    checks: [summarize(scanCheck), summarize(thesisCheck)],
    duplicateAudit: auditReady
      ? { ...auditSummary, duplicateTickerCount: auditCheck.parsed.duplicateTickerCount, ready: true }
      : { ...auditSummary, ready: false, note: "Duplicate audit helper needs the new Convex query deployed before it can inspect production data." },
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
}
