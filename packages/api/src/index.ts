/**
 * DocuForge Fastify API (P1).
 *
 * The web UI never touches FFmpeg/renderers directly. It submits
 * jobs here. Project files are the source of truth; this API
 * reads/writes them. SQLite (index + job store only) arrives
 * with the persistent job queue in a later milestone.
 *
 * Endpoints (P1):
 *   GET  /api/health
 *   GET  /api/meta
 *   GET  /api/projects
 *   POST /api/projects
 *   GET  /api/projects/:name
 *   GET  /api/projects/:name/script
 *   PUT  /api/projects/:name/script
 *   GET  /api/projects/:name/script/analysis
 *   GET  /api/projects/:name/factcheck
 *   PUT  /api/projects/:name/factcheck
 *   GET  /*                       — the built editor (single-server mode)
 *
 * Configuration (env):
 *   PORT=3001  HOST=0.0.0.0  PROJECTS_ROOT=<repo>/projects
 *   DOCUFORGE_WEB_DIR=<repo>/packages/web/dist
 */

import Fastify from "fastify";
import * as fs from "fs";
import * as path from "path";
import {
  createProject,
  listProjects,
  readProject,
  analyzeScript,
  defaultProjectsRoot,
  validateProjectName,
} from "@docuforge/engine";
import { registerStatic, defaultWebDir } from "./static";

const DEFAULT_PORT = 3001;

/** Parse PORT, refusing nonsense instead of silently listening on NaN. */
function resolvePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_PORT;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 65535) {
    throw new Error(`Invalid PORT "${raw}" — expected an integer 0-65535.`);
  }
  return n;
}

const PORT = resolvePort(process.env.PORT);
const HOST = process.env.HOST ?? "0.0.0.0";
const STARTED_AT = Date.now();

export interface BuildAppOptions {
  /** Directory containing the built editor (index.html + assets/). */
  webDir?: string;
  /** Set false in tests to keep output quiet. */
  logger?: boolean;
}

const CLAIM_STATUSES = ["verified", "unverified", "disputed"] as const;

/**
 * Write through a temp file + rename so an interrupted write can never leave
 * a half-written (or zero-length) script behind. Project files are the source
 * of truth — losing them is worse than failing the request.
 */
function writeFileAtomic(target: string, data: string): void {
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, data, "utf8");
  fs.renameSync(tmp, target);
}

export function buildApp(
  projectsRoot: string = process.env.PROJECTS_ROOT?.trim()
    ? path.resolve(process.env.PROJECTS_ROOT.trim())
    : defaultProjectsRoot(),
  options: BuildAppOptions = {}
) {
  const webDir = options.webDir ?? process.env.DOCUFORGE_WEB_DIR ?? defaultWebDir();
  const app = Fastify({ logger: options.logger ?? true });

  app.get("/api/health", async () => ({ ok: true, service: "docuforge-api", version: "0.2.0" }));

  // Everything the UI / a human needs to answer "what is this process serving?"
  app.get("/api/meta", async () => {
    const webBuildPresent = fs.existsSync(path.join(webDir, "index.html"));
    return {
      service: "docuforge-api",
      version: "0.2.0",
      mode: webBuildPresent ? "single-server" : "api-only",
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      pid: process.pid,
      uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
      projectsRoot,
      webDir,
      webBuildPresent,
    };
  });

  app.get("/api/projects", async () => {
    return { projects: listProjects(projectsRoot) };
  });

  app.post<{ Body: { name: string; title?: string; runtime_target_minutes?: number; language?: string; theme?: string; strict_mode?: boolean } }>(
    "/api/projects",
    async (req, reply) => {
      const b = req.body ?? ({} as never);
      if (!b.name) {
        return reply.code(400).send({ error: "name is required" });
      }
      try {
        const { project } = createProject(b.name, {
          title: b.title,
          runtimeTargetMinutes: b.runtime_target_minutes,
          language: b.language,
          theme: b.theme,
          strictMode: b.strict_mode,
          projectsRoot,
        });
        return reply.code(201).send({ project });
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    }
  );

  app.get<{ Params: { name: string } }>("/api/projects/:name", async (req, reply) => {
    try {
      const project = readProject(projectsRoot, req.params.name);
      return { project };
    } catch (err) {
      return reply.code(404).send({ error: (err as Error).message });
    }
  });

  app.get<{ Params: { name: string } }>("/api/projects/:name/script", async (req, reply) => {
    const p = path.join(projectsRoot, req.params.name, "script", "script.md");
    if (!fs.existsSync(p)) return reply.code(404).send({ error: "Script not found" });
    return { markdown: fs.readFileSync(p, "utf8") };
  });

  app.put<{ Params: { name: string }; Body: { markdown: string } }>(
    "/api/projects/:name/script",
    async (req, reply) => {
      try {
        validateProjectName(req.params.name);
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
      const p = path.join(projectsRoot, req.params.name, "script", "script.md");
      if (!fs.existsSync(path.dirname(p))) return reply.code(404).send({ error: "Project not found" });
      const md = (req.body as { markdown?: unknown } | undefined)?.markdown;
      if (typeof md !== "string") {
        // Never fall back to "" here: that would silently wipe the script.
        return reply
          .code(400)
          .send({ error: 'body must be {"markdown": string} — script left untouched' });
      }
      writeFileAtomic(p, md);
      return { ok: true };
    }
  );

  app.get<{ Params: { name: string } }>("/api/projects/:name/script/analysis", async (req, reply) => {
    const p = path.join(projectsRoot, req.params.name, "script", "script.md");
    if (!fs.existsSync(p)) return reply.code(404).send({ error: "Script not found" });
    let runtimeTarget = 25;
    try {
      runtimeTarget = readProject(projectsRoot, req.params.name).runtime_target_minutes;
    } catch {
      // keep default
    }
    const analysis = analyzeScript(fs.readFileSync(p, "utf8"), runtimeTarget);
    return { analysis };
  });

  app.get<{ Params: { name: string } }>("/api/projects/:name/factcheck", async (req, reply) => {
    const p = path.join(projectsRoot, req.params.name, "script", "factcheck.json");
    if (!fs.existsSync(p)) return reply.code(404).send({ error: "Factcheck file not found" });
    return JSON.parse(fs.readFileSync(p, "utf8"));
  });

  app.put<{ Params: { name: string } }>("/api/projects/:name/factcheck", async (req, reply) => {
    const p = path.join(projectsRoot, req.params.name, "script", "factcheck.json");
    if (!fs.existsSync(path.dirname(p))) return reply.code(404).send({ error: "Project not found" });
    const claims = (req.body as { claims?: unknown } | undefined)?.claims;
    if (!Array.isArray(claims)) {
      return reply
        .code(400)
        .send({ error: 'body must be {"claims": [...]} — factcheck left untouched' });
    }
    for (const c of claims as Array<Record<string, unknown>>) {
      const statusOk = typeof c?.status === "string" && CLAIM_STATUSES.includes(c.status as never);
      const chapterOk = c?.chapter === null || c?.chapter === undefined || typeof c?.chapter === "number";
      if (typeof c?.id !== "string" || typeof c?.claim !== "string" || typeof c?.source !== "string" || !statusOk || !chapterOk) {
        return reply.code(400).send({
          error:
            'each claim needs {id: string, claim: string, source: string, status: "verified"|"unverified"|"disputed", chapter: number|null}',
        });
      }
    }
    // Persist only the known fields, in a stable order.
    const normalized = (claims as Array<Record<string, unknown>>).map((c) => ({
      id: c.id as string,
      claim: c.claim as string,
      source: c.source as string,
      status: c.status as (typeof CLAIM_STATUSES)[number],
      chapter: typeof c.chapter === "number" ? c.chapter : null,
    }));
    writeFileAtomic(p, JSON.stringify({ claims: normalized }, null, 2) + "\n");
    return { ok: true };
  });

  // Uniform JSON errors; never an HTML stack trace from an API route.
  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error({ err }, "request failed");
    return reply.code(status).send({
      error: err.name || "Error",
      message: err.message,
      path: req.raw.url,
    });
  });

  // Registered last: /api/* routes win, everything else is the built editor.
  registerStatic(app, webDir);

  return app;
}

if (require.main === module) {
  const app = buildApp();
  const webDir = process.env.DOCUFORGE_WEB_DIR ?? defaultWebDir();
  const webBuildPresent = fs.existsSync(path.join(webDir, "index.html"));

  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    console.log(`${signal} received — closing DocuForge, waiting for in-flight requests…`);
    const timer = setTimeout(() => {
      console.error("Shutdown timed out after 5s — exiting.");
      process.exit(1);
    }, 5000);
    app
      .close()
      .then(() => {
        clearTimeout(timer);
        console.log("Closed cleanly. Project files are untouched on disk.");
        process.exit(0);
      })
      .catch((err) => {
        clearTimeout(timer);
        console.error("Error during shutdown:", err);
        process.exit(1);
      });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  app
    .listen({ port: PORT, host: HOST })
    .then(() => {
      console.log(`DocuForge listening on http://${HOST}:${PORT}`);
      if (webBuildPresent) {
        console.log(`Editor (built UI, same port): http://localhost:${PORT}/`);
      } else {
        console.log("Editor: no web build found — run `npm run build:web`, or use `npm run dev:web`");
      }
      console.log(`Projects: ${defaultProjectsRoot()}`);
    })
    .catch(async (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
        // If the thing holding the port is another DocuForge, say so plainly
        // instead of making the user hunt a pid.
        try {
          const res = await fetch(`http://127.0.0.1:${PORT}/api/meta`, {
            signal: AbortSignal.timeout(1500),
          });
          if (res.ok) {
            const meta = (await res.json()) as {
              pid?: number;
              mode?: string;
              uptimeSeconds?: number;
              webBuildPresent?: boolean;
            };
            console.error(
              `Another DocuForge is already running there (pid ${meta.pid}, mode ${meta.mode}, up ${meta.uptimeSeconds}s).`
            );
            console.error(`Just open it: http://localhost:${PORT}/`);
            if (!meta.webBuildPresent) {
              console.error("(That instance was started before the UI was built — restart it to serve the editor.)");
            }
          }
        } catch {
          // Not a DocuForge instance, or it is not answering. Fall through.
        }
        console.error("");
        console.error("Stop the process holding the port:");
        console.error(
          `  PowerShell:  Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
        );
        console.error(`  Or use another port:  $env:PORT=${PORT + 1}; npm start`);
        process.exit(1);
      }
      console.error("Failed to start:", err);
      process.exit(1);
    });
}
