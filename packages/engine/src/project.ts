/**
 * DocuForge project scaffold (P1).
 *
 * `docuforge new <name>` creates a plain-file project under
 * projects/<name>/ — Markdown/JSON/WAV/SRT/MP4 only. No proprietary
 * format. Project files are the source of truth; SQLite (later) is
 * only an index/job store.
 *
 * Layout:
 *   projects/<name>/
 *     project.json
 *     research/ (notes.md, sources.json)
 *     script/ (script.md, factcheck.json)
 *     audio/ (source/, narration/, music/, music-registry.json)
 *     assets/ (media + asset-log.json)
 *     fonts/ (font-registry.json)
 *     shots/shots.json
 *     renders/ (chapter-XX/, render-manifest.json)
 *     captions/ (*.srt, *.vtt)
 *     publish/ (titles.md, description.md, thumbnail-brief.md, retention-report.md)
 *     final/ (final.mp4, production-report.md)
 */

import * as fs from "fs";
import * as path from "path";

export interface ProjectJson {
  name: string;
  title: string;
  runtime_target_minutes: number;
  language: string;
  originality_statement: string;
  theme: string;
  strict_mode: boolean;
  created_at: string;
  version: number;
}

export interface NewProjectOptions {
  title?: string;
  runtimeTargetMinutes?: number;
  language?: string;
  theme?: string;
  strictMode?: boolean;
  originalityStatement?: string;
  projectsRoot?: string;
}

export const PROJECT_SUBDIRS = [
  "research",
  "script",
  "audio/source",
  "audio/narration",
  "audio/music",
  "assets",
  "fonts",
  "shots",
  "renders",
  "captions",
  "publish",
  "final",
] as const;

export function validateProjectName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error("Project name must not be empty.");
  }
  if (!/^[a-z0-9][a-z0-9-_]*$/i.test(name)) {
    throw new Error(
      `Invalid project name "${name}". Use letters, numbers, hyphens, underscores (e.g. "my-film").`
    );
  }
  if (name === "." || name === ".." || name.includes("/") || name.includes("\\")) {
    throw new Error(`Invalid project name "${name}".`);
  }
}

export function defaultProjectsRoot(): string {
  // When running from repo root, projects/ lives at <root>/projects.
  // Engine dist is at packages/engine/dist, so walk up to find repo root.
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, "package.json")) && fs.existsSync(path.join(dir, "projects"))) {
      return path.join(dir, "projects");
    }
    if (fs.existsSync(path.join(dir, "package.json")) && dir.endsWith("DocuForge")) {
      return path.join(dir, "projects");
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: cwd/projects (CLI is run from repo root).
  return path.resolve(process.cwd(), "projects");
}

export function createProject(name: string, options: NewProjectOptions = {}): { projectDir: string; project: ProjectJson } {
  validateProjectName(name);
  const projectsRoot = options.projectsRoot ?? defaultProjectsRoot();
  const projectDir = path.join(projectsRoot, name);
  if (fs.existsSync(projectDir)) {
    throw new Error(`Project "${name}" already exists at ${projectDir}.`);
  }

  const project: ProjectJson = {
    name,
    title: options.title ?? name,
    runtime_target_minutes: options.runtimeTargetMinutes ?? 25,
    language: options.language ?? "en",
    originality_statement:
      options.originalityStatement ??
      "All narration, graphics, and music in this project are original or properly licensed. No fabricated facts, quotes, or statistics.",
    theme: options.theme ?? "",
    strict_mode: options.strictMode ?? false,
    created_at: new Date().toISOString(),
    version: 1,
  };

  fs.mkdirSync(projectDir, { recursive: true });
  for (const sub of PROJECT_SUBDIRS) {
    fs.mkdirSync(path.join(projectDir, sub), { recursive: true });
  }

  fs.writeFileSync(path.join(projectDir, "project.json"), JSON.stringify(project, null, 2) + "\n", "utf8");

  // Template files (plain Markdown/JSON — source of truth).
  fs.writeFileSync(
    path.join(projectDir, "script", "script.md"),
    `# ${project.title}\n\n## Chapter 1: Introduction\n\nWrite your narration here. The script is authoritative — AI may only propose accept/reject diffs, never rewrite the final script.\n\n## Chapter 2: Background\n\nContinue here.\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(projectDir, "script", "factcheck.json"),
    JSON.stringify({ claims: [] }, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(path.join(projectDir, "research", "notes.md"), "# Research notes\n\n", "utf8");
  fs.writeFileSync(
    path.join(projectDir, "research", "sources.json"),
    JSON.stringify({ sources: [] }, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(projectDir, "audio", "music-registry.json"),
    JSON.stringify({ tracks: [] }, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(projectDir, "assets", "asset-log.json"),
    JSON.stringify({ assets: [] }, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(projectDir, "fonts", "font-registry.json"),
    JSON.stringify({ fonts: [] }, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(projectDir, "shots", "shots.json"),
    JSON.stringify({ shots: [] }, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(
    path.join(projectDir, "renders", "render-manifest.json"),
    JSON.stringify({ renders: [] }, null, 2) + "\n",
    "utf8"
  );
  fs.writeFileSync(path.join(projectDir, "publish", "titles.md"), "# Title options\n\n", "utf8");
  fs.writeFileSync(path.join(projectDir, "publish", "description.md"), "# Description\n\n", "utf8");
  fs.writeFileSync(path.join(projectDir, "publish", "thumbnail-brief.md"), "# Thumbnail brief\n\n", "utf8");
  fs.writeFileSync(path.join(projectDir, "publish", "retention-report.md"), "# Retention report\n\n", "utf8");
  fs.writeFileSync(path.join(projectDir, "final", "production-report.md"), "# Production report\n\n", "utf8");

  return { projectDir, project };
}

export function readProject(projectsRoot: string, name: string): ProjectJson {
  validateProjectName(name);
  const p = path.join(projectsRoot, name, "project.json");
  if (!fs.existsSync(p)) {
    throw new Error(`Project "${name}" not found at ${p}.`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as ProjectJson;
}

export function listProjects(projectsRoot: string): ProjectJson[] {
  if (!fs.existsSync(projectsRoot)) return [];
  const out: ProjectJson[] = [];
  for (const entry of fs.readdirSync(projectsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pj = path.join(projectsRoot, entry.name, "project.json");
    if (fs.existsSync(pj)) {
      try {
        out.push(JSON.parse(fs.readFileSync(pj, "utf8")) as ProjectJson);
      } catch {
        // skip malformed project.json
      }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
