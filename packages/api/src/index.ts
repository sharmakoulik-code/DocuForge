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
 *   GET  /api/projects
 *   POST /api/projects
 *   GET  /api/projects/:name
 *   GET  /api/projects/:name/script
 *   PUT  /api/projects/:name/script
 *   GET  /api/projects/:name/script/analysis
 *   GET  /api/projects/:name/factcheck
 *   PUT  /api/projects/:name/factcheck
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

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

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

export function buildApp(projectsRoot = defaultProjectsRoot()) {
  const app = Fastify({ logger: true });

  app.get("/api/health", async () => ({ ok: true, service: "docuforge-api", version: "0.2.0" }));

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

  return app;
}

if (require.main === module) {
  const app = buildApp();
  app.listen({ port: PORT, host: HOST }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    console.log(`DocuForge API listening on http://${HOST}:${PORT}`);
  });
}
