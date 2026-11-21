import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { buildApp } from "../packages/api/src/index";

/**
 * P1 API contract: the editor talks to these endpoints, so the destructive
 * paths matter more than the happy path. Project files are the source of
 * truth — a malformed request must never blank a script.
 */

let root: string;
let app: ReturnType<typeof buildApp>;

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "df-api-"));
  app = buildApp(root);
  await app.ready();
});

afterEach(async () => {
  await app.close();
  fs.rmSync(root, { recursive: true, force: true });
});

async function newProject(name = "p1-test", runtime = 28) {
  const res = await app.inject({
    method: "POST",
    url: "/api/projects",
    payload: { name, title: "Test Film", runtime_target_minutes: runtime },
  });
  expect(res.statusCode).toBe(201);
  return name;
}

const scriptPath = (name: string) => path.join(root, name, "script", "script.md");
const factcheckPath = (name: string) => path.join(root, name, "script", "factcheck.json");

const SCRIPT = "# Test Film\n\n## Chapter 1: Opening\n\nfive words in chapter one\n\n## Chapter 2: Close\n\nthree more words\n";

describe("script endpoints", () => {
  it("round-trips a script to disk", async () => {
    const name = await newProject();
    const put = await app.inject({ method: "PUT", url: `/api/projects/${name}/script`, payload: { markdown: SCRIPT } });
    expect(put.statusCode).toBe(200);
    expect(fs.readFileSync(scriptPath(name), "utf8")).toBe(SCRIPT);

    const get = await app.inject({ method: "GET", url: `/api/projects/${name}/script` });
    expect(get.statusCode).toBe(200);
    expect(get.json().markdown).toBe(SCRIPT);
  });

  it("REGRESSION: refuses a PUT without markdown instead of blanking the script", async () => {
    const name = await newProject();
    await app.inject({ method: "PUT", url: `/api/projects/${name}/script`, payload: { markdown: SCRIPT } });

    for (const payload of [{}, { markdown: null }, { markdown: 42 }, { text: "wrong field" }]) {
      const res = await app.inject({ method: "PUT", url: `/api/projects/${name}/script`, payload });
      expect(res.statusCode).toBe(400);
      expect(fs.readFileSync(scriptPath(name), "utf8")).toBe(SCRIPT); // untouched
    }
  });

  it("leaves no temp files behind (atomic write)", async () => {
    const name = await newProject();
    await app.inject({ method: "PUT", url: `/api/projects/${name}/script`, payload: { markdown: SCRIPT } });
    const leftovers = fs.readdirSync(path.join(root, name, "script")).filter((f) => f.includes(".tmp-"));
    expect(leftovers).toEqual([]);
  });

  it("analysis uses chapter bodies and the project runtime target", async () => {
    const name = await newProject("p1-test", 28);
    await app.inject({ method: "PUT", url: `/api/projects/${name}/script`, payload: { markdown: SCRIPT } });
    const { analysis } = (await app.inject({ method: "GET", url: `/api/projects/${name}/script/analysis` })).json();

    expect(analysis.chapters.map((c: { number: number }) => c.number)).toEqual([1, 2]);
    // "five words in chapter one" = 5, "three more words" = 3; pre-chapter title excluded
    expect(analysis.chapters.map((c: { wordCount: number }) => c.wordCount)).toEqual([5, 3]);
    expect(analysis.totalWords).toBe(8);
    expect(analysis.runtimeTargetMinutes).toBe(28);
    expect(analysis.withinTarget).toBe(false);
  });
});

describe("factcheck endpoints", () => {
  const claims = [
    { id: "c1", claim: "Claim one.", source: "https://example.org/a", status: "verified", chapter: 1 },
    { id: "c2", claim: "Claim two.", source: "", status: "unverified", chapter: null },
  ];

  it("persists claims with chapter links", async () => {
    const name = await newProject();
    const put = await app.inject({ method: "PUT", url: `/api/projects/${name}/factcheck`, payload: { claims } });
    expect(put.statusCode).toBe(200);

    const onDisk = JSON.parse(fs.readFileSync(factcheckPath(name), "utf8"));
    expect(onDisk.claims).toEqual(claims);

    const get = await app.inject({ method: "GET", url: `/api/projects/${name}/factcheck` });
    expect(get.json().claims).toEqual(claims);
  });

  it("REGRESSION: rejects a factcheck body that is not a claims array", async () => {
    const name = await newProject();
    await app.inject({ method: "PUT", url: `/api/projects/${name}/factcheck`, payload: { claims } });
    const before = fs.readFileSync(factcheckPath(name), "utf8");

    for (const payload of [{}, { claims: "nope" }, { claims: [{ id: 1 }] }, { claims: [{ ...claims[0], status: "maybe" }] }]) {
      const res = await app.inject({ method: "PUT", url: `/api/projects/${name}/factcheck`, payload });
      expect(res.statusCode).toBe(400);
      expect(fs.readFileSync(factcheckPath(name), "utf8")).toBe(before); // untouched
    }
  });

  it("drops unknown fields instead of persisting them", async () => {
    const name = await newProject();
    await app.inject({
      method: "PUT",
      url: `/api/projects/${name}/factcheck`,
      payload: { claims: [{ ...claims[0], injected: "<script>" }], junk: true },
    });
    const onDisk = JSON.parse(fs.readFileSync(factcheckPath(name), "utf8"));
    expect(onDisk).toEqual({ claims: [claims[0]] });
    expect(JSON.stringify(onDisk)).not.toContain("<script>");
  });
});
