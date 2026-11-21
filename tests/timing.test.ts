import { describe, it, expect } from "vitest";
import {
  secondsToFrames,
  framesToSeconds,
  shotDurationFromAudio,
  isValidShotDuration,
  countWords,
  estimateRuntimeSeconds,
  FPS,
} from "../packages/engine/src/timing";

describe("timing", () => {
  it("secondsToFrames converts at 30fps", () => {
    expect(secondsToFrames(1)).toBe(30);
    expect(secondsToFrames(10)).toBe(300);
    expect(secondsToFrames(0.5)).toBe(15);
  });

  it("framesToSeconds converts at 30fps", () => {
    expect(framesToSeconds(30)).toBe(1);
    expect(framesToSeconds(300)).toBe(10);
  });

  it("seconds->frames->seconds round-trips", () => {
    expect(framesToSeconds(secondsToFrames(7.5))).toBeCloseTo(7.5, 5);
  });

  it("shotDurationFromAudio snaps to frame boundary", () => {
    const d = shotDurationFromAudio(8.333);
    expect(d * FPS).toBeCloseTo(Math.round(d * FPS), 5);
    expect(d).toBeCloseTo(8.333, 1);
  });

  it("isValidShotDuration accepts 6–12s range", () => {
    expect(isValidShotDuration(6)).toBe(true);
    expect(isValidShotDuration(9)).toBe(true);
    expect(isValidShotDuration(12)).toBe(true);
    expect(isValidShotDuration(5.9)).toBe(false);
    expect(isValidShotDuration(12.1)).toBe(false);
  });

  it("countWords counts whitespace-separated words", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  a  b\nc  ")).toBe(3);
  });

  it("estimateRuntimeSeconds uses 150 wpm planning figure", () => {
    expect(estimateRuntimeSeconds(150)).toBeCloseTo(60, 5);
    expect(estimateRuntimeSeconds(300)).toBeCloseTo(120, 5);
  });
});
