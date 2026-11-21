import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  DEFERRED_TOOLS,
  checkSourceForForbiddenImports,
  getDeferredToolIds,
} from "../packages/engine/src/license-gate";

const REPO_ROOT = path.resolve(__dirname, "..");

function readSourceFiles(): { file: string; content: string }[] {
  const dirs = [
    path.join(REPO_ROOT, "packages/engine/src"),
    path.join(REPO_ROOT, "packages/api/src"),
    path.join(REPO_ROOT, "packages/web/src"),
  ];
  const out: { file: string; content: string }[] = [];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (/\.(ts|tsx)$/.test(f)) {
        out.push({ file: path.join(d, f), content: fs.readFileSync(path.join(d, f), "utf8") });
      }
    }
  }
  return out;
}

describe("license gate", () => {
  it("deferred tools list includes Revideo, Kokoro, faster-whisper", () => {
    const ids = getDeferredToolIds();
    expect(ids).toContain("revideo");
    expect(ids).toContain("kokoro");
    expect(ids).toContain("faster-whisper");
    expect(ids).toContain("ollama");
  });

  it("no M1 source file imports a deferred tool", () => {
    const files = readSourceFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const { file, content } of files) {
      // license-gate.ts itself names the deferred tools by design.
      if (file.endsWith("license-gate.ts")) continue;
      const violations = checkSourceForForbiddenImports(content);
      expect(violations, `${file} imports forbidden: ${violations.join(", ")}`).toEqual([]);
    }
  });

  it("LICENSES.md does not list deferred tools as installed", () => {
    const licenses = fs.readFileSync(path.join(REPO_ROOT, "LICENSES.md"), "utf8");
    // Deferred tools may be mentioned only in a "deferred/not installed" context.
    for (const t of DEFERRED_TOOLS) {
      if (licenses.toLowerCase().includes(t.name.toLowerCase())) {
        expect(licenses.toLowerCase()).toMatch(/deferred|not installed|excluded/i);
      }
    }
  });

  it("LICENSES-REVIEW.md exists and covers deferred reviews", () => {
    const p = path.join(REPO_ROOT, "LICENSES-REVIEW.md");
    expect(fs.existsSync(p)).toBe(true);
    const text = fs.readFileSync(p, "utf8").toLowerCase();
    expect(text).toContain("revideo");
    expect(text).toContain("kokoro");
    expect(text).toContain("faster-whisper");
  });

  it("checkSourceForForbiddenImports flags forbidden imports", () => {
    expect(checkSourceForForbiddenImports('import { x } from "kokoro"')).toContain("kokoro");
    expect(checkSourceForForbiddenImports("const a = 1;")).toEqual([]);
  });
});
