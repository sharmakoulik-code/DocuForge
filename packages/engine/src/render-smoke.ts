/**
 * DocuForge 10-second smoke-test render (M1).
 *
 * Assembles a title card + one kinetic-text shot + one audio track
 * via FFmpeg to renders/smoke-10s/smoke.mp4:
 *   1920x1080, 30 fps, H.264/AAC, ~10s.
 *
 * This is a smoke test, NOT the acceptance film. The M1 acceptance
 * film (60–120s, chapter-by-chapter) comes in P4.
 *
 * Requires FFmpeg + FFprobe on PATH. Exits non-zero with fix
 * instructions when missing.
 */

import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

export const SMOKE_WIDTH = 1920;
export const SMOKE_HEIGHT = 1080;
export const SMOKE_FPS = 30;
export const SMOKE_DURATION = 10;

function have(cmd: string): boolean {
  try {
    execFileSync(cmd, ["-version"], { stdio: ["ignore", "pipe", "ignore"], timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** Find a usable font file for drawtext, or null to skip text. */
function findFont(): string | null {
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "C:\\Windows\\Fonts\\arial.ttf",
    "C:\\Windows\\Fonts\\Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial.ttf",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Fall back to fc-match on Linux.
  try {
    const out = execFileSync("fc-match", ["-f", "%{file}", "DejaVu Sans"], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (out && fs.existsSync(out)) return out;
  } catch {
    // ignore
  }
  return null;
}

export interface SmokeResult {
  outputPath: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  audioCodec: string;
}

export function renderSmoke(outDir?: string): SmokeResult {
  if (!have("ffmpeg")) {
    console.error(
      "ERROR: FFmpeg not found on PATH.\n" +
        "Fix: install FFmpeg (https://ffmpeg.org/download.html) and ensure `ffmpeg` is on PATH, then re-run `npm run smoke:render`."
    );
    process.exit(1);
  }

  const root = outDir ?? path.resolve(process.cwd(), "renders", "smoke-10s");
  fs.mkdirSync(root, { recursive: true });
  const outputPath = path.join(root, "smoke.mp4");

  const font = findFont();
  const fontOpt = font ? `fontfile=${font.replace(/\\/g, "\\\\").replace(/:/g, "\\:")}:` : "";

  // Video: 0-3s title card, 3-10s kinetic text.
  // Title card: dark background + "DocuForge" + subtitle.
  // Kinetic shot: background + animated text (drawtext with enable).
  const titleText = "DocuForge";
  const subText = "Smoke Test - M1";
  const kineticText = "Narration timing is the authority";

  const drawFilters = font
    ? [
        `drawtext=${fontOpt}text='${titleText}':fontsize=120:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-60:enable='between(t,0,3)'`,
        `drawtext=${fontOpt}text='${subText}':fontsize=56:fontcolor=0x9fb4ff:x=(w-text_w)/2:y=(h-text_h)/2+80:enable='between(t,0,3)'`,
        `drawtext=${fontOpt}text='${kineticText}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,3,10)'`,
      ].join(",")
    : "null";

  const filterComplex = `[0:v]${drawFilters}[v]`;

  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=0x0b1020:s=${SMOKE_WIDTH}x${SMOKE_HEIGHT}:r=${SMOKE_FPS}:d=${SMOKE_DURATION}`,
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=440:duration=${SMOKE_DURATION}:sample_rate=48000`,
    "-filter_complex",
    filterComplex,
    "-map",
    "[v]",
    "-map",
    "1:a",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(SMOKE_FPS),
    "-s",
    `${SMOKE_WIDTH}x${SMOKE_HEIGHT}`,
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-t",
    String(SMOKE_DURATION),
    "-movflags",
    "+faststart",
    outputPath,
  ];

  console.log(`Rendering smoke test -> ${outputPath}`);
  if (!font) {
    console.log("Note: no font file found; rendering without drawtext overlay (color-only).");
  }
  try {
    execFileSync("ffmpeg", args, { stdio: "inherit" });
  } catch (err) {
    console.error(`ERROR: FFmpeg smoke render failed: ${(err as Error).message}`);
    process.exit(1);
  }

  // Validate with ffprobe when available.
  let probe: SmokeResult = {
    outputPath,
    durationSeconds: SMOKE_DURATION,
    width: SMOKE_WIDTH,
    height: SMOKE_HEIGHT,
    fps: SMOKE_FPS,
    videoCodec: "h264",
    audioCodec: "aac",
  };
  if (have("ffprobe")) {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "stream=codec_type,codec_name,width,height,r_frame_rate",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        outputPath,
      ],
      { encoding: "utf8", timeout: 30_000 }
    );
    const j = JSON.parse(out) as {
      streams: Array<{
        codec_type: string;
        codec_name: string;
        width?: number;
        height?: number;
        r_frame_rate?: string;
      }>;
      format: { duration: string };
    };
    const v = j.streams.find((s) => s.codec_type === "video");
    const a = j.streams.find((s) => s.codec_type === "audio");
    const fpsStr = v?.r_frame_rate ?? "30/1";
    const [num, den] = fpsStr.split("/").map(Number);
    probe = {
      outputPath,
      durationSeconds: parseFloat(j.format.duration),
      width: v?.width ?? SMOKE_WIDTH,
      height: v?.height ?? SMOKE_HEIGHT,
      fps: den ? num / den : num,
      videoCodec: v?.codec_name ?? "unknown",
      audioCodec: a?.codec_name ?? "unknown",
    };
    console.log(
      `Validated: ${probe.width}x${probe.height} @ ${probe.fps}fps, ` +
        `${probe.videoCodec}/${probe.audioCodec}, ${probe.durationSeconds.toFixed(2)}s`
    );
  } else {
    console.log("Note: ffprobe not found; skipping validation (install ffprobe to validate).");
  }

  return probe;
}

// CLI entry: `node render-smoke.js`
if (require.main === module) {
  const result = renderSmoke();
  console.log(`Smoke render complete: ${result.outputPath}`);
}
