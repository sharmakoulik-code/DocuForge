/**
 * DocuForge dependency doctor (M1).
 *
 * Verifies Node 20+, FFmpeg presence/version, TypeScript.
 * Exits 0 when all checks pass; exits non-zero with fix
 * instructions when a required tool is missing.
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
  fix: string;
}

function checkNode(): Check {
  const v = process.version; // e.g. v22.22.3
  const m = v.match(/^v(\d+)\./);
  const major = m ? parseInt(m[1], 10) : 0;
  const ok = major >= 20;
  return {
    name: "Node.js",
    ok,
    detail: `Node ${v} (required >= 20)`,
    fix: "Install Node.js 20+ from https://nodejs.org/ (LTS recommended).",
  };
}

function checkFfmpeg(): Check {
  try {
    const out = execFileSync("ffmpeg", ["-version"], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const first = out.split("\n")[0].trim();
    return { name: "FFmpeg", ok: true, detail: first, fix: "" };
  } catch {
    return {
      name: "FFmpeg",
      ok: false,
      detail: "FFmpeg NOT FOUND on PATH",
      fix:
        "Install FFmpeg from https://ffmpeg.org/download.html and ensure `ffmpeg` is on PATH. " +
        "Windows: `winget install Gyan.FFmpeg` or download from https://www.gyan.dev/ffmpeg/builds/. " +
        "macOS: `brew install ffmpeg`. Linux: `sudo apt install ffmpeg`.",
    };
  }
}

function checkFfprobe(): Check {
  try {
    const out = execFileSync("ffprobe", ["-version"], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const first = out.split("\n")[0].trim();
    return { name: "FFprobe", ok: true, detail: first, fix: "" };
  } catch {
    return {
      name: "FFprobe",
      ok: false,
      detail: "FFprobe NOT FOUND on PATH",
      fix: "FFprobe ships with FFmpeg — reinstall FFmpeg from https://ffmpeg.org/download.html.",
    };
  }
}

/**
 * Locate the locally installed TypeScript compiler entry point.
 *
 * We deliberately avoid `npx`: on Windows `npx` is `npx.cmd`, a batch file
 * that Node's child_process refuses to execute without `shell: true`
 * (CVE-2024-27980 hardening), so `execFileSync("npx", …)` always throws
 * ENOENT on Windows even when TypeScript is installed correctly. Running
 * `<node> node_modules/typescript/lib/tsc.js` is shell-free and identical
 * on every platform.
 *
 * Walks up from this file so it works from packages/api/dist, from a
 * hoisted root node_modules (npm workspaces), or from a nested one.
 */
export function findLocalTsc(startDir: string = __dirname): string | null {
  let dir = startDir;
  for (let depth = 0; depth < 8; depth++) {
    const candidate = path.join(dir, "node_modules", "typescript", "lib", "tsc.js");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function checkTypeScript(): Check {
  const tscJs = findLocalTsc();
  if (tscJs) {
    try {
      const out = execFileSync(process.execPath, [tscJs, "--version"], {
        encoding: "utf8",
        timeout: 30_000,
        stdio: ["ignore", "pipe", "ignore"],
      });
      return { name: "TypeScript", ok: true, detail: out.trim(), fix: "" };
    } catch (err) {
      return {
        name: "TypeScript",
        ok: false,
        detail: `TypeScript present but failed to run (${tscJs}): ${(err as Error).message.split("\n")[0]}`,
        fix: "Delete node_modules and package-lock.json, then run `npm install` at the repo root.",
      };
    }
  }
  // Fallback: global npx. On Windows this needs a shell because npx is a .cmd.
  try {
    const isWin = process.platform === "win32";
    const out = execFileSync(isWin ? "npx.cmd" : "npx", ["tsc", "--version"], {
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "ignore"],
      shell: isWin,
    });
    return { name: "TypeScript", ok: true, detail: out.trim(), fix: "" };
  } catch {
    return {
      name: "TypeScript",
      ok: false,
      detail: "TypeScript NOT FOUND (no local node_modules/typescript and `npx tsc --version` failed)",
      fix: "Run `npm install` at the repo root to install TypeScript (devDependency).",
    };
  }
}

export function runDoctor(): Check[] {
  return [checkNode(), checkFfmpeg(), checkFfprobe(), checkTypeScript()];
}

export function formatDoctor(checks: Check[]): string {
  const lines: string[] = [];
  lines.push("DocuForge Dependency Doctor");
  lines.push("==========================");
  for (const c of checks) {
    lines.push(`${c.ok ? "PASS" : "FAIL"}  ${c.name}: ${c.detail}`);
    if (!c.ok && c.fix) {
      lines.push(`       Fix: ${c.fix}`);
    }
  }
  const failed = checks.filter((c) => !c.ok);
  lines.push("");
  if (failed.length === 0) {
    lines.push("All checks passed. DocuForge is ready.");
  } else {
    lines.push(`${failed.length} check(s) failed. Fix the items above and re-run \`npm run doctor\`.`);
  }
  return lines.join("\n");
}

// CLI entry: `node doctor.js`
if (require.main === module) {
  const checks = runDoctor();
  console.log(formatDoctor(checks));
  const failed = checks.filter((c) => !c.ok);
  process.exit(failed.length === 0 ? 0 : 1);
}
