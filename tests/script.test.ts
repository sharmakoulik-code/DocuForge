import { describe, it, expect } from "vitest";
import {
  parseChapters,
  analyzeScript,
  validateChapterNumbering,
  extractTitle,
} from "../packages/engine/src/script";

const SAMPLE = `# My Film

## Chapter 1: Introduction

Hello world this is the opening narration.

## Chapter 2: Background

More narration here with several words to count properly.
`;

describe("script parsing (P1)", () => {
  it("parseChapters extracts chapter headings", () => {
    const chapters = parseChapters(SAMPLE);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].number).toBe(1);
    expect(chapters[0].title).toBe("Introduction");
    expect(chapters[1].title).toBe("Background");
  });

  it("parseChapters counts words per chapter", () => {
    const chapters = parseChapters(SAMPLE);
    expect(chapters[0].wordCount).toBeGreaterThan(0);
    expect(chapters[0].estimatedRuntime).toMatch(/^\d+:\d{2}$/);
  });

  it("analyzeScript totals words and estimates runtime", () => {
    const a = analyzeScript(SAMPLE, 25);
    expect(a.totalWords).toBeGreaterThan(0);
    expect(a.estimatedSeconds).toBeGreaterThan(0);
    expect(a.runtimeTargetMinutes).toBe(25);
  });

  it("validateChapterNumbering flags gaps", () => {
    const chapters = parseChapters("# T\n\n## Chapter 1: A\n\nx\n\n## Chapter 3: C\n\ny\n");
    const errors = validateChapterNumbering(chapters);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("validateChapterNumbering passes sequential chapters", () => {
    const chapters = parseChapters(SAMPLE);
    expect(validateChapterNumbering(chapters)).toEqual([]);
  });

  it("extractTitle reads H1", () => {
    expect(extractTitle(SAMPLE)).toBe("My Film");
    expect(extractTitle("no title", "Fallback")).toBe("Fallback");
  });
});
