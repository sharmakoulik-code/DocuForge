import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  createProject,
  listProjects,
  readProject,
  validateProjectName,
  PROJECT_SUBDIRS,
} from "../packages/engine/src/project";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "docuforge-test-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("project scaffold (P1)", () => {
  it("validateProjectName accepts valid names", () => {
    expect(() => validateProjectName("my-film")).not.toThrow();
    expect(() => validateProjectName("film_01")).not.toThrow();
  });

  it("validateProjectName rejects invalid names", () => {
    expect(() => validateProjectName("")).toThrow();
    expect(() => validateProjectName("../evil")).toThrow();
    expect(() => validateProjectName("a/b")).toThrow();
    expect(() => validateProjectName("has space")).toThrow();
  });

  it("createProject scaffolds all subdirectories", () => {
    const { projectDir } = createProject("test-film", { projectsRoot: tmpRoot });
    for (const sub of PROJECT_SUBDIRS) {
      expect(fs.existsSync(path.join(projectDir, sub)), sub).toBe(true);
    }
  });

  it("createProject writes project.json with required fields", () => {
    const { projectDir } = createProject("test-film", {
      projectsRoot: tmpRoot,
      title: "Test Film",
      runtimeTargetMinutes: 30,
      language: "en",
      theme: "history",
      strictMode: true,
    });
    const pj = JSON.parse(fs.readFileSync(path.join(projectDir, "project.json"), "utf8"));
    expect(pj.title).toBe("Test Film");
    expect(pj.runtime_target_minutes).toBe(30);
    expect(pj.language).toBe("en");
    expect(pj.theme).toBe("history");
    expect(pj.strict_mode).toBe(true);
    expect(pj.originality_statement.length).toBeGreaterThan(0);
  });

  it("createProject writes template script and factcheck files", () => {
    const { projectDir } = createProject("test-film", { projectsRoot: tmpRoot });
    expect(fs.existsSync(path.join(projectDir, "script", "script.md"))).toBe(true);
    const fc = JSON.parse(fs.readFileSync(path.join(projectDir, "script", "factcheck.json"), "utf8"));
    expect(Array.isArray(fc.claims)).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "shots", "shots.json"))).toBe(true);
  });

  it("createProject refuses to overwrite an existing project", () => {
    createProject("dup", { projectsRoot: tmpRoot });
    expect(() => createProject("dup", { projectsRoot: tmpRoot })).toThrow(/already exists/);
  });

  it("listProjects and readProject round-trip", () => {
    createProject("alpha", { projectsRoot: tmpRoot, title: "Alpha" });
    createProject("beta", { projectsRoot: tmpRoot, title: "Beta" });
    const list = listProjects(tmpRoot);
    expect(list.map((p) => p.name)).toEqual(["alpha", "beta"]);
    expect(readProject(tmpRoot, "alpha").title).toBe("Alpha");
  });
});
