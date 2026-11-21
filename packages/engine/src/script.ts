/**
 * DocuForge script parsing (P1).
 *
 * Script is Markdown with `## Chapter N: title` headings.
 * The user's script is authoritative. AI may only propose
 * accept/reject diffs (M4) — never write the final script.
 *
 * Word count vs runtime estimate uses the 150 wpm planning figure
 * only. Real runtime comes from narration audio duration.
 */

import { countWords, estimateRuntimeSeconds, formatRuntime } from "./timing";

export interface Chapter {
  number: number;
  title: string;
  body: string;
  wordCount: number;
  estimatedSeconds: number;
  estimatedRuntime: string;
}

export interface ScriptAnalysis {
  title: string;
  chapters: Chapter[];
  totalWords: number;
  estimatedSeconds: number;
  estimatedRuntime: string;
  runtimeTargetMinutes: number;
  withinTarget: boolean;
}

const CHAPTER_RE = /^##\s+Chapter\s+(\d+)\s*:\s*(.+?)\s*$/im;

/** Parse `## Chapter N: title` headings. Returns chapters in order. */
export function parseChapters(markdown: string): Chapter[] {
  const lines = markdown.split(/\r?\n/);
  const chapters: Chapter[] = [];
  let current: { number: number; title: string; bodyLines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.bodyLines.join("\n").trim();
    const wc = countWords(body);
    const est = estimateRuntimeSeconds(wc);
    chapters.push({
      number: current.number,
      title: current.title,
      body,
      wordCount: wc,
      estimatedSeconds: est,
      estimatedRuntime: formatRuntime(est),
    });
  };

  for (const line of lines) {
    const m = line.match(/^##\s+Chapter\s+(\d+)\s*:\s*(.+?)\s*$/);
    if (m) {
      flush();
      current = { number: parseInt(m[1], 10), title: m[2].trim(), bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
    // Lines before the first chapter (e.g. H1 title) are ignored for chapters.
  }
  flush();
  return chapters;
}

/** Extract the H1 title (first `# ...` line), or fallback. */
export function extractTitle(markdown: string, fallback = "Untitled"): string {
  const m = markdown.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : fallback;
}

export function analyzeScript(markdown: string, runtimeTargetMinutes = 25): ScriptAnalysis {
  const chapters = parseChapters(markdown);
  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);
  const estimatedSeconds = estimateRuntimeSeconds(totalWords);
  return {
    title: extractTitle(markdown),
    chapters,
    totalWords,
    estimatedSeconds,
    estimatedRuntime: formatRuntime(estimatedSeconds),
    runtimeTargetMinutes,
    withinTarget: estimatedSeconds >= runtimeTargetMinutes * 60 * 0.8 && estimatedSeconds <= 40 * 60,
  };
}

/** Validate chapter numbering is sequential starting at 1. */
export function validateChapterNumbering(chapters: Chapter[]): string[] {
  const errors: string[] = [];
  if (chapters.length === 0) {
    errors.push("No chapters found. Use `## Chapter 1: Title` headings.");
    return errors;
  }
  chapters.forEach((c, i) => {
    if (c.number !== i + 1) {
      errors.push(`Chapter ${c.number} ("${c.title}") should be Chapter ${i + 1}.`);
    }
  });
  return errors;
}

export { CHAPTER_RE };
