/**
 * Static file serving for the built editor (single-server mode).
 *
 * Deliberately dependency-free: a small hand-rolled handler instead of
 * @fastify/static, so the API keeps its one runtime dependency (fastify).
 *
 * Behaviour:
 *   /                 -> index.html, no-store
 *   /assets/app-abc.js-> hashed build asset, immutable long cache
 *   /anything-else    -> SPA fallback to index.html (client routing)
 *   /api/*            -> never served from disk; 404 JSON
 *   path traversal    -> 403
 *   no build present  -> 503 page telling you to run `npm run build:web`
 */

import * as fs from "fs";
import * as path from "path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".srt": "text/plain; charset=utf-8",
  ".vtt": "text/vtt; charset=utf-8",
};

function missingBuildPage(webDir: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>DocuForge — UI not built</title>
<style>body{font-family:system-ui,sans-serif;background:#0e1116;color:#e6e9f0;max-width:640px;margin:12vh auto;padding:0 20px;line-height:1.6}
code{font-family:ui-monospace,Consolas,monospace;background:#1b212b;padding:2px 6px;border-radius:5px}
h1{font-size:20px}</style></head><body>
<h1>Editor not built yet</h1>
<p>The API is running, but no web build was found at:</p>
<p><code>${webDir}</code></p>
<p>Build it once:</p>
<p><code>npm run build:web</code></p>
<p>…then reload this page. While developing, use <code>npm run dev:web</code> instead — it serves the
editor with hot reload and proxies <code>/api</code> to this server.</p>
</body></html>`;
}

export function registerStatic(app: FastifyInstance, webDir: string): void {
  const root = path.resolve(webDir);
  const indexHtml = path.join(root, "index.html");
  const hasBuild = fs.existsSync(indexHtml);

  const handler = async (req: FastifyRequest, reply: FastifyReply) => {
    const rawPath = (req.raw.url ?? "/").split("?")[0];

    // The API owns /api/*; never let a wildcard fall through to disk.
    if (rawPath === "/api" || rawPath.startsWith("/api/")) {
      return reply.code(404).send({ error: "Not found", path: rawPath });
    }

    if (!hasBuild) {
      return reply
        .type("text/html; charset=utf-8")
        .header("cache-control", "no-store")
        .code(503)
        .send(missingBuildPage(root));
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(rawPath);
    } catch {
      return reply.code(400).send({ error: "Malformed URL encoding" });
    }

    const rel = decoded === "/" || decoded === "" ? "index.html" : decoded.replace(/^\/+/, "");
    const target = path.resolve(root, rel);
    if (target !== root && !target.startsWith(root + path.sep)) {
      return reply.code(403).send({ error: "Forbidden path" });
    }

    let filePath = target;
    let isFallback = false;
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = indexHtml;
      isFallback = true;
    }

    const ext = path.extname(filePath).toLowerCase();
    const isHashedAsset = /^assets[\\/]/.test(rel);
    reply.type(MIME[ext] ?? "application/octet-stream");
    reply.header(
      "cache-control",
      isHashedAsset && !isFallback ? "public, max-age=31536000, immutable" : "no-store"
    );
    return reply.send(fs.createReadStream(filePath));
  };

  app.get("/", handler);
  app.get("/*", handler);
}

/** Locate packages/web/dist by walking up from this file (dist-safe). */
export function defaultWebDir(startDir: string = __dirname): string {
  let dir = startDir;
  for (let depth = 0; depth < 6; depth++) {
    const candidate = path.join(dir, "packages", "web", "dist");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Not built yet — point at where it will appear.
  return path.resolve(startDir, "..", "..", "..", "packages", "web", "dist");
}
