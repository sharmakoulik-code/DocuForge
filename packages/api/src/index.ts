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
      const md = (req.body as { markdown?: string })?.markdown ?? "";
      fs.writeFileSync(p, md, "utf8");
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
    const body = req.body ?? { claims: [] };
    fs.writeFileSync(p, JSON.stringify(body, null, 2) + "\n", "utf8");
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
