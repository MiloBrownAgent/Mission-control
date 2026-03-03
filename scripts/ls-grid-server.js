#!/usr/bin/env node
/**
 * Local API server for LS Grid Manager
 * Runs on Mac mini, serves grid data from look-and-seen/src/lib/data.ts
 * MC frontend calls this instead of Vercel serverless functions
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3847;
const DATA_FILE = "/Users/milo/Projects/look-and-seen/src/lib/data.ts";
const WORK_DIR = "/Users/milo/Projects/look-and-seen/public/work";

function parseProjectsFromSource(source) {
  const startMarker = "export const projects: Project[] = [";
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) throw new Error("Could not find projects array in data.ts");

  const arrayStart = startIdx + startMarker.length;
  let depth = 1;
  let i = arrayStart;
  while (i < source.length && depth > 0) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]") depth--;
    i++;
  }
  const arrayContent = source.slice(arrayStart, i - 1);

  const projectRegex =
    /\{\s*id:\s*"([^"]+)",\s*category:\s*"([^"]+)",\s*aspectRatio:\s*"([^"]+)",\s*imageSrc:\s*"([^"]+)",\s*alt:\s*"([^"]+)"\s*\}/g;

  const projects = [];
  let match;
  while ((match = projectRegex.exec(arrayContent)) !== null) {
    projects.push({
      id: match[1],
      category: match[2],
      aspectRatio: match[3],
      imageSrc: match[4],
      alt: match[5],
    });
  }
  return projects;
}

function serializeProjectsArray(projects) {
  return projects.map((p) => {
    return `  { id: ${JSON.stringify(p.id)},  category: ${JSON.stringify(p.category)}, aspectRatio: ${JSON.stringify(p.aspectRatio)}, imageSrc: ${JSON.stringify(p.imageSrc)}, alt: ${JSON.stringify(p.alt)} },`;
  }).join("\n");
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/api/ls-grid" && req.method === "GET") {
    try {
      const source = fs.readFileSync(DATA_FILE, "utf-8");
      const inGrid = parseProjectsFromSource(source);
      const inGridSrcs = new Set(inGrid.map((p) => p.imageSrc));

      const workFiles = fs
        .readdirSync(WORK_DIR)
        .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort();

      const notInGrid = workFiles.filter((f) => !inGridSrcs.has(`/work/${f}`));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ inGrid, notInGrid }));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(error) }));
    }
    return;
  }

  if (req.url === "/api/ls-grid" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projects: newProjects } = JSON.parse(body);
        if (!Array.isArray(newProjects)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "projects must be an array" }));
          return;
        }

        const source = fs.readFileSync(DATA_FILE, "utf-8");
        const startMarker = "export const projects: Project[] = [";
        const startIdx = source.indexOf(startMarker);
        if (startIdx === -1) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Could not find projects array" }));
          return;
        }

        const arrayStart = startIdx + startMarker.length;
        let depth = 1;
        let i = arrayStart;
        while (i < source.length && depth > 0) {
          if (source[i] === "[") depth++;
          else if (source[i] === "]") depth--;
          i++;
        }
        const closingIdx = i - 1;
        const before = source.slice(0, arrayStart);
        const after = source.slice(closingIdx);
        const serialized = "\n" + serializeProjectsArray(newProjects) + "\n";
        const newSource = before + serialized + after;

        fs.writeFileSync(DATA_FILE, newSource, "utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(error) }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`LS Grid API server running on port ${PORT}`);
});
