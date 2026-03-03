import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_PAT ?? "";
const REPO = "MiloBrownAgent/look-and-seen";
const FILE_PATH = "src/lib/data.ts";
const WORK_MANIFEST_PATH = "public/work"; // we'll list via GitHub API

export interface Project {
  id: string;
  category: "Campaign" | "Portrait" | "Product" | "Generated Imagery";
  aspectRatio: string;
  imageSrc: string;
  alt: string;
}

async function githubFetch(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers ?? {}),
    },
  });
  return res;
}

async function getFileContent(): Promise<{ content: string; sha: string }> {
  const res = await githubFetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`
  );
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

async function getWorkFiles(): Promise<string[]> {
  const res = await githubFetch(
    `https://api.github.com/repos/${REPO}/contents/${WORK_MANIFEST_PATH}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter((f: any) => /\.(jpg|jpeg|png|webp)$/i.test(f.name))
    .map((f: any) => f.name)
    .sort();
}

function parseProjectsFromSource(source: string): Project[] {
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

  const projects: Project[] = [];
  let match;
  while ((match = projectRegex.exec(arrayContent)) !== null) {
    projects.push({
      id: match[1],
      category: match[2] as Project["category"],
      aspectRatio: match[3],
      imageSrc: match[4],
      alt: match[5],
    });
  }
  return projects;
}

function serializeProjectsArray(projects: Project[]): string {
  return projects
    .map(
      (p) =>
        `  { id: ${JSON.stringify(p.id)}, category: ${JSON.stringify(p.category)}, aspectRatio: ${JSON.stringify(p.aspectRatio)}, imageSrc: ${JSON.stringify(p.imageSrc)}, alt: ${JSON.stringify(p.alt)} },`
    )
    .join("\n");
}

export async function GET() {
  try {
    const { content: source } = await getFileContent();
    const inGrid = parseProjectsFromSource(source);
    const inGridSrcs = new Set(inGrid.map((p) => p.imageSrc));

    const workFiles = await getWorkFiles();
    const notInGrid = workFiles.filter((f) => !inGridSrcs.has(`/work/${f}`));

    return NextResponse.json({ inGrid, notInGrid });
  } catch (error) {
    console.error("ls-grid GET error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newProjects: Project[] = body.projects;

    if (!Array.isArray(newProjects)) {
      return NextResponse.json({ error: "projects must be an array" }, { status: 400 });
    }

    // Get current file to preserve non-projects content
    const { content: source, sha } = await getFileContent();

    const startMarker = "export const projects: Project[] = [";
    const startIdx = source.indexOf(startMarker);
    if (startIdx === -1) {
      return NextResponse.json({ error: "Could not find projects array" }, { status: 500 });
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

    // Write back via GitHub API
    const updateRes = await githubFetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Update image grid order via MC Grid Manager",
          content: Buffer.from(newSource).toString("base64"),
          sha,
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`GitHub PUT failed: ${updateRes.status} ${err}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ls-grid POST error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
