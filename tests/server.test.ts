import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { buildApp } from "../packages/api/src/index";
import { defaultWebDir } from "../packages/api/src/static";

/**
 * Single-server mode: one Fastify process serves /api/* and the built editor.
 * The interesting cases are the boundaries — /api must never fall through to
 * the SPA, and disk paths must not escape the web root.
 */

const INDEX = `<!doctype html><html><body><div id="root"></div><script src="/assets/app-abc123.js"></script></body></html>`;

let root: string; // projects root
let webDir: string; // fake built editor
let app: ReturnType<typeof buildApp>;

function makeWebDir(withBuild = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "df-web-"));
  if (withBuild) {
    fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), INDEX);
    fs.writeFileSync(path.join(dir, "assets", "app-abc123.js"), "console.log('hi')");
    fs.writeFileSync(path.join(dir, "assets", "index-D712MSw7.css"), "body{color:red}");
    fs.writeFileSync(path.join(dir, "favicon.svg"), "<svg/>");
  }
  return dir;
}

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "df-projects-"));
  webDir = makeWebDir(true);
  fs.mkdirSync(path.join(root, "demo", "script"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "demo", "project.json"),
    JSON.stringify({ name: "demo", title: "Demo", runtime_target_minutes: 25 } as never)
  );
  fs.writeFileSync(path.join(root, "demo", "script", "script.md"), "# Demo\n\n## Chapter 1: A\n\nhi\n");
  app = buildApp(root, { webDir, logger: false });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(webDir, { recursive: true, force: true });
});

describe("static editor serving", () => {
  it("serves index.html at / with no-store caching", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body).toContain('id="root"');
  });

  it("serves hashed assets with immutable caching and correct MIME", async () => {
    const js = await app.inject({ method: "GET", url: "/assets/app-abc123.js" });
    expect(js.statusCode).toBe(200);
    expect(js.headers["content-type"]).toContain("text/javascript");
    expect(js.headers["cache-control"]).toContain("immutable");

    const css = await app.inject({ method: "GET", url: "/assets/index-D712MSw7.css" });
    expect(css.statusCode).toBe(200);
    expect(css.headers["content-type"]).toContain("text/css");

    const svg = await app.inject({ method: "GET", url: "/favicon.svg" });
    expect(svg.headers["content-type"]).toContain("image/svg+xml");
    expect(svg.headers["cache-control"]).toBe("no-store"); // not a hashed asset
  });

  it("falls back to index.html for unknown client routes", async () => {
    const res = await app.inject({ method: "GET", url: "/some/client/route" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain('id="root"');
  });

  it("never serves /api/* from disk", async () => {
    const res = await app.inject({ method: "GET", url: "/api/does-not-exist" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.json().error).toBe("Not found");
  });

  it("still answers real API routes when a web dir is configured", async () => {
    const res = await app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(200);
    expect(res.json().projects[0].name).toBe("demo");
  });

  it("never leaks a file above the web root", async () => {
    const secret = path.join(path.dirname(webDir), "secret.txt");
    fs.writeFileSync(secret, "top secret");
    try {
      // The router normalizes most dot-segments (they resolve inside the web
      // root and hit the SPA fallback); the encoded-slash form reaches our
      // guard and gets a 403. Either way the file must not come back.
      for (const url of [
        "/../secret.txt",
        "/%2e%2e/secret.txt",
        "/assets/../../secret.txt",
        "/%2e%2e%2fsecret.txt",
      ]) {
        const res = await app.inject({ method: "GET", url });
        expect(res.body, url).not.toContain("top secret");
        if (res.statusCode === 200) {
          // A 200 is only acceptable as the SPA fallback, never as the file.
          expect(res.headers["content-type"], url).toContain("text/html");
          expect(res.body, url).toContain('id="root"');
        } else {
          expect([400, 403, 404], url).toContain(res.statusCode);
        }
      }
      // the encoded-slash form must be explicitly refused, not silently mapped
      const encoded = await app.inject({ method: "GET", url: "/%2e%2e%2fsecret.txt" });
      expect(encoded.statusCode).toBe(403);
    } finally {
      fs.rmSync(secret, { force: true });
    }
  });

  it("explains itself with a 503 page when the UI has not been built", async () => {
    const emptyWeb = makeWebDir(false);
    const bare = buildApp(root, { webDir: emptyWeb, logger: false });
    try {
      await bare.ready();
      const res = await bare.inject({ method: "GET", url: "/" });
      expect(res.statusCode).toBe(503);
      expect(res.body).toContain("npm run build:web");
      // API still functional without a build
      expect((await bare.inject({ method: "GET", url: "/api/health" })).statusCode).toBe(200);
    } finally {
      await bare.close();
      fs.rmSync(emptyWeb, { recursive: true, force: true });
    }
  });
});

describe("/api/meta", () => {
  it("reports what the process is serving", async () => {
    const res = await app.inject({ method: "GET", url: "/api/meta" });
    expect(res.statusCode).toBe(200);
    const meta = res.json();
    expect(meta.mode).toBe("single-server");
    expect(meta.webBuildPresent).toBe(true);
    expect(meta.projectsRoot).toBe(root);
    expect(meta.webDir).toBe(webDir);
    expect(meta.node).toMatch(/^v\d+\./);
    expect(typeof meta.uptimeSeconds).toBe("number");
  });
});

describe("error handling", () => {
  it("returns JSON, not HTML, for malformed payloads", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/projects/demo/script",
      headers: { "content-type": "application/json" },
      payload: "{not json",
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.headers["content-type"]).toContain("application/json");
  });
});

describe("defaultWebDir", () => {
  it("points at packages/web/dist from the built api directory", () => {
    const fromDist = path.resolve(__dirname, "..", "packages", "api", "dist");
    expect(defaultWebDir(fromDist).replace(/\\/g, "/").endsWith("packages/web/dist")).toBe(true);
  });
});
