/**
 * DocuForge license gate (M1).
 *
 * FREE ONLY — open-source/free-licensed tools, no paid APIs.
 * M1 installs only: Node, TypeScript, Fastify, React, Vite, FFmpeg.
 *
 * Deferred (NOT installed in M1, reviewed in LICENSES-REVIEW.md):
 * Revideo, Kokoro-82M, faster-whisper, Ollama, Remotion, Piper.
 *
 * This module is the single source of truth for the gate. Tests
 * assert that no M1 source file imports a deferred tool and that
 * LICENSES.md does not list deferred tools as installed.
 */

export interface DeferredTool {
  id: string;
  name: string;
  status: "DEFERRED";
  reason: string;
}

export const DEFERRED_TOOLS: DeferredTool[] = [
  {
    id: "revideo",
    name: "Revideo",
    status: "DEFERRED",
    reason: "Renderer candidate for M2+; license review pending (LICENSES-REVIEW.md).",
  },
  {
    id: "kokoro",
    name: "Kokoro-82M",
    status: "DEFERRED",
    reason: "TTS for M2+; NOT installed in M1. Narration uses own-recording WAV import.",
  },
  {
    id: "faster-whisper",
    name: "faster-whisper",
    status: "DEFERRED",
    reason: "Captioner for M3+; NOT installed in M1.",
  },
  {
    id: "ollama",
    name: "Ollama",
    status: "DEFERRED",
    reason: "Optional/pluggable LLM runtime for M4+; never mandatory.",
  },
  {
    id: "remotion",
    name: "Remotion",
    status: "DEFERRED",
    reason: "Rejected: license restricted for orgs >3 people.",
  },
  {
    id: "piper",
    name: "Piper TTS",
    status: "DEFERRED",
    reason: "Rejected: GPL-3.0 strong copyleft.",
  },
];

/** Import specifiers / package names that must never appear in M1 source. */
export const FORBIDDEN_IMPORT_PATTERNS: string[] = [
  "kokoro",
  "faster-whisper",
  "faster_whisper",
  "ollama",
  "remotion",
  "@remotion",
  "piper",
  "revideo",
  "@revideo",
  "openai",
  "anthropic",
  "google-generative-ai",
];

/** Check whether a source file's contents violate the M1 license gate.
 * Only import/require statements count — plain string mentions (e.g.
 * hardware report text "Kokoro TTS: NOT INSTALLED") are allowed. */
export function checkSourceForForbiddenImports(source: string): string[] {
  const violations: string[] = [];
  const importRe = /(?:import\s+(?:[^'"]*?\s+from\s+)?|require\s*\(\s*|from\s+)(['"])([^'"]+)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source)) !== null) {
    const spec = m[2].toLowerCase();
    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      if (spec.includes(pattern)) {
        violations.push(pattern);
      }
    }
  }
  return [...new Set(violations)];
}

export function getDeferredToolIds(): string[] {
  return DEFERRED_TOOLS.map((t) => t.id);
}
