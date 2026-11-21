import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { findLocalTsc } from "../packages/api/src/doctor";

/**
 * Regression guard for the Windows doctor failure:
 * `execFileSync("npx", ["tsc", "--version"])` throws ENOENT on Windows
 * because `npx` is a `.cmd` batch file that Node will not spawn without
 * `shell: true`. The doctor must resolve the local TypeScript compiler
 * directly instead of shelling out to npx.
 */
describe("doctor / TypeScript detection", () => {
  it("finds the hoisted root node_modules TypeScript from packages/api/dist", () => {
    const distDir = path.resolve(__dirname, "..", "packages", "api", "dist");
    const found = findLocalTsc(distDir);
    expect(found).not.toBeNull();
    expect(found!.endsWith(path.join("typescript", "lib", "tsc.js"))).toBe(true);
    expect(fs.existsSync(found!)).toBe(true);
  });

  it("finds TypeScript when it is nested in the package instead of hoisted", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "df-doctor-"));
    try {
      const nested = path.join(tmp, "packages", "api", "node_modules", "typescript", "lib");
      fs.mkdirSync(nested, { recursive: true });
      fs.writeFileSync(path.join(nested, "tsc.js"), "// stub\n");
      expect(findLocalTsc(path.join(tmp, "packages", "api", "dist"))).toBe(
        path.join(nested, "tsc.js")
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("returns null when TypeScript is not installed anywhere up the tree", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "df-doctor-empty-"));
    try {
      // Walk-up cannot escape a temp tree without node_modules, but stop the
      // search from finding the repo's own install by asserting on a depth
      // that cannot reach it: an artificial chain deeper than the limit.
      let deep = tmp;
      for (let i = 0; i < 10; i++) deep = path.join(deep, "a");
      fs.mkdirSync(deep, { recursive: true });
      expect(findLocalTsc(deep)).toBeNull();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("never spawns npx (no shell-out to a Windows .cmd wrapper)", async () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "..", "packages", "api", "src", "doctor.ts"),
      "utf8"
    );
    // Allow mention in comments, but not as an executed command.
    const executed = src
      .split("\n")
      .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
      .filter((line) => /execFileSync\(\s*"npx"/.test(line));
    expect(executed).toEqual([]);
  });
});
