/**
 * DocuForge timing model.
 *
 * Narration timing is the authority. All shot timing derives from
 * narration audio duration. Output is 1920x1080 @ 30fps.
 *
 * Planning figure: ~150 words per minute for runtime estimation only.
 * This is NOT a narration synthesis rate — actual narration timing
 * comes from recorded audio (M1) or Kokoro TTS (M2+).
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Planning figure for script length -> runtime estimation only. */
export const PLANNING_WPM = 150;

/** Valid shot duration range in seconds (inclusive). */
export const MIN_SHOT_SECONDS = 6;
export const MAX_SHOT_SECONDS = 12;

/** Convert seconds to whole frames at 30fps (rounds to nearest). */
export function secondsToFrames(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`secondsToFrames: invalid seconds ${seconds}`);
  }
  return Math.round(seconds * FPS);
}

/** Convert frames to seconds at 30fps. */
export function framesToSeconds(frames: number): number {
  if (!Number.isFinite(frames) || frames < 0) {
    throw new Error(`framesToSeconds: invalid frames ${frames}`);
  }
  return frames / FPS;
}

/**
 * Derive a shot duration from narration audio duration.
 * Narration is authoritative: the shot lasts exactly as long as its
 * narration audio (clamped to frame precision).
 */
export function shotDurationFromAudio(audioSeconds: number): number {
  if (!Number.isFinite(audioSeconds) || audioSeconds <= 0) {
    throw new Error(`shotDurationFromAudio: invalid audioSeconds ${audioSeconds}`);
  }
  // Snap to frame boundary so video/audio stay in sync.
  return framesToSeconds(secondsToFrames(audioSeconds));
}

/** True when a shot duration is within the 6–12s house range. */
export function isValidShotDuration(seconds: number): boolean {
  return (
    Number.isFinite(seconds) &&
    seconds >= MIN_SHOT_SECONDS &&
    seconds <= MAX_SHOT_SECONDS
  );
}

/** Count words in a text block (splits on whitespace, ignores empties). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Estimate runtime in seconds from a word count using the 150 wpm
 * planning figure. Planning only — real runtime comes from narration
 * audio duration.
 */
export function estimateRuntimeSeconds(wordCount: number): number {
  if (!Number.isFinite(wordCount) || wordCount < 0) {
    throw new Error(`estimateRuntimeSeconds: invalid wordCount ${wordCount}`);
  }
  return (wordCount / PLANNING_WPM) * 60;
}

/** Format seconds as M:SS (e.g. 90 -> "1:30"). */
export function formatRuntime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
