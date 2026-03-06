import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_PAT ?? "";
const REPO = "MiloBrownAgent/look-and-seen";
const FILE_PATH = "src/lib/data.ts";
const WORK_MANIFEST_PATH = "public/work";

export interface ProjectCredits {
  client?: string;
  clientUrl?: string;
  agency?: string;
  agencyUrl?: string;
  creativeDirector?: string;
  creativeDirectorUrl?: string;
  artDirector?: string;
  artDirectorUrl?: string;
  photographer?: string;
  photographerUrl?: string;
  producer?: string;
  producerUrl?: string;
  role?: string;
  roleUrl?: string;
}

export interface Project {
  id: string;
  category: "Campaign" | "Portrait" | "Product" | "Generated Imagery";
  aspectRatio: string;
  imageSrc: string;
  alt: string;
  credits?: ProjectCredits;
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
    .filter((f: any) => /\.(jpg|jpeg|png|webp|mp4|webm|mov)$/i.test(f.name))
    .map((f: any) => f.name)
    .sort();
}

/** Extract individual project object strings from the array body, handling nested braces */
function extractObjectStrings(arrayBody: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < arrayBody.length; i++) {
    if (arrayBody[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (arrayBody[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        results.push(arrayBody.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return results;
}

function getStringField(obj: string, key: string): string {
  const m = obj.match(new RegExp(`${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "s"));
  return m ? m[1].replace(/\\"/g, '"') : "";
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
  const objects = extractObjectStrings(arrayContent);

  return objects.map((obj) => {
    const project: Project = {
      id: getStringField(obj, "id"),
      category: getStringField(obj, "category") as Project["category"],
      aspectRatio: getStringField(obj, "aspectRatio"),
      imageSrc: getStringField(obj, "imageSrc"),
      alt: getStringField(obj, "alt"),
    };

    // Parse optional credits block
    const creditsBlockStart = obj.indexOf("credits:");
    let creditsBody = "";
    if (creditsBlockStart !== -1) {
      const braceOpen = obj.indexOf("{", creditsBlockStart);
      const braceClose = obj.indexOf("}", braceOpen);
      if (braceOpen !== -1 && braceClose !== -1) {
        creditsBody = obj.slice(braceOpen + 1, braceClose);
      }
    }
    const creditsMatch: [string, string] | null = creditsBody ? ["", creditsBody] : null;
    if (creditsMatch) {
      const creditsBody = creditsMatch[1];
      const credits: ProjectCredits = {};
      const creditsFields: (keyof ProjectCredits)[] = [
        "client", "clientUrl", "agency", "agencyUrl",
        "creativeDirector", "creativeDirectorUrl",
        "artDirector", "artDirectorUrl",
        "photographer", "photographerUrl",
        "producer", "producerUrl",
        "role", "roleUrl",
      ];
      for (const field of creditsFields) {
        const val = getStringField(creditsBody, field);
        if (val) (credits as any)[field] = val;
      }
      if (Object.keys(credits).length > 0) project.credits = credits;
    }

    return project;
  }).filter((p) => p.id && p.imageSrc);
}

function serializeProjectsArray(projects: Project[]): string {
  return projects
    .map((p) => {
      let line = `  { id: ${JSON.stringify(p.id)}, category: ${JSON.stringify(p.category)}, aspectRatio: ${JSON.stringify(p.aspectRatio)}, imageSrc: ${JSON.stringify(p.imageSrc)}, alt: ${JSON.stringify(p.alt)}`;

      const c = p.credits;
      if (c && Object.values(c).some(Boolean)) {
        const creditsFields: (keyof ProjectCredits)[] = [
          "client", "clientUrl", "agency", "agencyUrl",
          "creativeDirector", "creativeDirectorUrl",
          "artDirector", "artDirectorUrl",
          "photographer", "photographerUrl",
          "producer", "producerUrl",
          "role", "roleUrl",
        ];
        const parts = creditsFields
          .filter((k) => c[k])
          .map((k) => `${k}: ${JSON.stringify(c[k])}`);
        line += `, credits: { ${parts.join(", ")} }`;
      }

      line += " },";
      return line;
    })
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

    const updateRes = await githubFetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Update image grid via MC Grid Manager",
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
