/**
 * DocuForge hardware detection + CPU/FFmpeg benchmark.
 *
 * Detects OS / RAM / CPU / GPU at startup, prints a report, runs a
 * quick benchmark, and estimates realistic time for a 30-min film.
 *
 * M1 scope: CPU-only. No GPU-accelerated rendering. Kokoro TTS and
 * faster-whisper are explicitly NOT INSTALLED / NOT MEASURED in M1.
 * No GPU detection beyond reporting presence/absence.
 */

import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

export interface CpuInfo {
  model: string;
  cores: number;
  threads: number;
  speedMhz: number | null;
}

export interface GpuInfo {
  detected: boolean;
  summary: string;
  detail: string;
}

export interface HardwareReport {
  os: string;
  osRelease: string;
  arch: string;
  hostname: string;
  ramBytes: number;
  ramGb: number;
  freeRamBytes: number;
  cpu: CpuInfo;
  gpu: GpuInfo;
  nodeVersion: string;
  ffmpeg: { present: boolean; version: string | null };
}

export interface BenchmarkResult {
  cpuRenderFps: number;
  ffmpegEncodeFps: number | null;
  ffmpegDecodeFps: number | null;
  ffmpegNote: string;
  kokoroTts: string;
  fasterWhisper: string;
  estimated30MinFilmMinutes: number | null;
  estimateNote: string;
}

function safeExec(cmd: string, args: string[], timeoutMs = 5000): string | null {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      timeout: timeoutMs,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

export function detectCpu(): CpuInfo {
  const cpus = os.cpus();
  const threads = cpus.length;
  const model = threads > 0 ? cpus[0].model.trim() : "Unknown CPU";
  const speedMhz = threads > 0 && cpus[0].speed > 0 ? cpus[0].speed : null;
  // Node reports logical CPUs; physical cores are best-effort.
  // On most systems threads/2 is a reasonable estimate for hyperthreaded
  // CPUs, but we report threads and estimate cores conservatively.
  const cores = Math.max(1, Math.ceil(threads / 2));
  return { model, cores, threads, speedMhz };
}

/**
 * Best-effort GPU presence detection. Reports presence/absence only;
 * M1 does no GPU-accelerated rendering.
 */
export function detectGpu(): GpuInfo {
  const platform = os.platform();

  // NVIDIA discrete GPU?
  const nvidia = safeExec("nvidia-smi", ["--query-gpu=name", "--format=csv,noheader"]);
  if (nvidia && nvidia.length > 0) {
    return {
      detected: true,
      summary: `NVIDIA GPU detected: ${nvidia.split("\n")[0].trim()}`,
      detail: nvidia,
    };
  }

  if (platform === "linux") {
    // DRM render nodes indicate GPU presence (integrated or discrete).
    try {
      const dri = fs.readdirSync("/dev/dri").filter((f) => f.startsWith("renderD"));
      if (dri.length > 0) {
        const lspci = safeExec("lspci", []);
        const vga = lspci
          ? lspci
              .split("\n")
              .filter((l) => /VGA|3D|Display/i.test(l))
              .join("; ")
          : "";
        return {
          detected: true,
          summary: vga ? `GPU present: ${vga}` : "GPU present (integrated graphics assumed)",
          detail: vga || "DRM render node present; no lspci detail available.",
        };
      }
    } catch {
      // /dev/dri not accessible — fall through.
    }
    const lspci = safeExec("lspci", []);
    if (lspci) {
      const vga = lspci
        .split("\n")
        .filter((l) => /VGA|3D|Display/i.test(l))
        .join("; ");
      if (vga) {
        return { detected: true, summary: `GPU present: ${vga}`, detail: vga };
      }
    }
    return {
      detected: false,
      summary: "No GPU detected (integrated graphics / CPU-only assumed)",
      detail: "No DRM render node and no VGA device found via lspci.",
    };
  }

  if (platform === "win32") {
    const wmic = safeExec("wmic", ["path", "win32_VideoController", "get", "name"]);
    if (wmic) {
      const lines = wmic
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !/^Name$/i.test(l));
      if (lines.length > 0) {
        return {
          detected: true,
          summary: `GPU present: ${lines.join("; ")}`,
          detail: lines.join("\n"),
        };
      }
    }
    return {
      detected: false,
      summary: "No GPU detected via wmic (CPU-only assumed)",
      detail: "wmic returned no video controllers.",
    };
  }

  if (platform === "darwin") {
    const sys = safeExec("system_profiler", ["SPDisplaysDataType"]);
    if (sys && /Display|GPU|Chipset/i.test(sys)) {
      const first = sys
        .split("\n")
        .map((l) => l.trim())
        .find((l) => /Chipset|Model|Vendor/i.test(l));
      return {
        detected: true,
        summary: first ? `GPU present: ${first}` : "GPU present (Apple Silicon / integrated)",
        detail: sys.slice(0, 1000),
      };
    }
    return {
      detected: false,
      summary: "No GPU detected (CPU-only assumed)",
      detail: "system_profiler returned no display info.",
    };
  }

  return {
    detected: false,
    summary: "GPU detection not available on this platform (CPU-only assumed)",
    detail: `Platform ${platform} has no GPU probe in M1.`,
  };
}

export function detectFfmpeg(): { present: boolean; version: string | null } {
  const out = safeExec("ffmpeg", ["-version"]);
  if (!out) return { present: false, version: null };
  const first = out.split("\n")[0].trim();
  return { present: true, version: first };
}

export function getHardwareReport(): HardwareReport {
  const total = os.totalmem();
  const free = os.freemem();
  const ffmpeg = detectFfmpeg();
  return {
    os: `${os.platform()} ${os.arch()}`,
    osRelease: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    ramBytes: total,
    ramGb: Math.round((total / 1024 ** 3) * 100) / 100,
    freeRamBytes: free,
    cpu: detectCpu(),
    gpu: detectGpu(),
    nodeVersion: process.version,
    ffmpeg,
  };
}

/**
 * CPU render micro-benchmark: measures how fast this machine can run
 * a representative CPU-bound loop (proxy for frame compositing cost).
 * Returns operations per second.
 */
export function benchmarkCpu(iterations = 200_000): number {
  const start = process.hrtime.bigint();
  let acc = 0;
  for (let i = 0; i < iterations; i++) {
    // Mix of arithmetic + Math ops resembling per-frame work.
    acc += Math.sqrt((i % 1000) * 1.7 + 1) * Math.sin(i % 360);
    acc += (i * 2654435761) % 997;
  }
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  // Prevent dead-code elimination from skewing results.
  if (acc === Number.NaN) throw new Error("benchmark failed");
  const opsPerSecond = iterations / (elapsedMs / 1000);
  // Convert to a "render fps" proxy: assume ~50k ops per 1080p frame.
  return Math.max(1, Math.round(opsPerSecond / 50_000));
}

/**
 * Measure FFmpeg encode/decode speed on a tiny synthetic clip.
 * Returns null fps when FFmpeg is unavailable (NOT MEASURED).
 */
export function benchmarkFfmpeg(): { encodeFps: number | null; decodeFps: number | null; note: string } {
  const probe = detectFfmpeg();
  if (!probe.present) {
    return {
      encodeFps: null,
      decodeFps: null,
      note: "FFmpeg NOT INSTALLED — encode/decode NOT MEASURED. Install FFmpeg to measure.",
    };
  }
  const tmp = path.join(os.tmpdir(), `docuforge-bench-${process.pid}.mp4`);
  try {
    // Encode 2s of 640x360 testsrc at ultrafast, measure wall time.
    const encStart = Date.now();
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=duration=2:size=640x360:rate=30",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-pix_fmt",
        "yuv420p",
        tmp,
      ],
      { stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 }
    );
    const encMs = Date.now() - encStart;
    const encodeFps = Math.round((2 * 30) / (encMs / 1000));

    // Decode benchmark: count frames via ffprobe if available, else time null decode.
    const decStart = Date.now();
    execFileSync("ffmpeg", ["-v", "error", "-i", tmp, "-f", "null", "-"], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    });
    const decMs = Date.now() - decStart;
    const decodeFps = Math.round((2 * 30) / (decMs / 1000));

    return { encodeFps, decodeFps, note: `Measured on 640x360 testsrc (2s clip).` };
  } catch (err) {
    return {
      encodeFps: null,
      decodeFps: null,
      note: `FFmpeg benchmark failed: ${(err as Error).message}. Reported as NOT MEASURED.`,
    };
  } finally {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

export function runBenchmark(): BenchmarkResult {
  const cpuRenderFps = benchmarkCpu();
  const ff = benchmarkFfmpeg();

  // Estimate: 30-min film = 1800s @ 30fps = 54,000 frames.
  // Assume render+encode pipeline runs at min(cpu, encode) fps with
  // 1.5x overhead for assembly/muxing. If FFmpeg unmeasured, estimate
  // from CPU proxy only and flag as rough.
  const frames = 1800 * 30;
  const effectiveFps = ff.encodeFps ? Math.min(cpuRenderFps, ff.encodeFps) : cpuRenderFps;
  const estMinutes = Math.round((frames / effectiveFps / 60) * 1.5);
  const estimateNote = ff.encodeFps
    ? `Estimated from measured CPU (${cpuRenderFps} fps) and FFmpeg encode (${ff.encodeFps} fps), with 1.5x assembly overhead.`
    : `FFmpeg NOT MEASURED — estimated from CPU proxy only (${cpuRenderFps} fps), with 1.5x overhead. Install FFmpeg for a real measurement.`;

  return {
    cpuRenderFps,
    ffmpegEncodeFps: ff.encodeFps,
    ffmpegDecodeFps: ff.decodeFps,
    ffmpegNote: ff.note,
    kokoroTts: "NOT INSTALLED / NOT MEASURED (excluded from M1 — narration uses own-recording WAV import)",
    fasterWhisper: "NOT INSTALLED / NOT MEASURED (excluded from M1 — captioning deferred to M3)",
    estimated30MinFilmMinutes: estMinutes,
    estimateNote,
  };
}

export function formatReport(report: HardwareReport, bench: BenchmarkResult): string {
  const lines: string[] = [];
  lines.push("DocuForge Hardware Report");
  lines.push("========================");
  lines.push(`OS: ${report.os} (release ${report.osRelease})`);
  lines.push(`Hostname: ${report.hostname}`);
  lines.push(`RAM: ${report.ramGb} GB total (${report.ramBytes} bytes), ${Math.round((report.freeRamBytes / 1024 ** 3) * 100) / 100} GB free`);
  lines.push(
    `CPU: ${report.cpu.model} — ${report.cpu.cores} cores / ${report.cpu.threads} threads` +
      (report.cpu.speedMhz ? ` @ ${report.cpu.speedMhz} MHz` : "")
  );
  lines.push(`GPU: ${report.gpu.summary}`);
  lines.push(`Node: ${report.nodeVersion}`);
  lines.push(
    `FFmpeg: ${report.ffmpeg.present ? report.ffmpeg.version : "NOT INSTALLED"}`
  );
  lines.push("");
  lines.push("Benchmark");
  lines.push("---------");
  lines.push(`CPU render speed: ${bench.cpuRenderFps} fps (proxy)`);
  lines.push(
    `FFmpeg encode: ${bench.ffmpegEncodeFps !== null ? `${bench.ffmpegEncodeFps} fps` : "NOT MEASURED"}`
  );
  lines.push(
    `FFmpeg decode: ${bench.ffmpegDecodeFps !== null ? `${bench.ffmpegDecodeFps} fps` : "NOT MEASURED"}`
  );
  lines.push(`FFmpeg note: ${bench.ffmpegNote}`);
  lines.push(`Kokoro TTS: ${bench.kokoroTts}`);
  lines.push(`faster-whisper: ${bench.fasterWhisper}`);
  lines.push(
    `Estimated time for 30-min film: ${
      bench.estimated30MinFilmMinutes !== null
        ? `~${bench.estimated30MinFilmMinutes} minutes`
        : "unknown"
    }`
  );
  lines.push(`Estimate note: ${bench.estimateNote}`);
  lines.push("");
  lines.push("M1 scope: CPU-only. No GPU-accelerated rendering. M1–M3 must work on CPU only.");
  return lines.join("\n");
}

// CLI entry: `node hardware.js --report`
if (require.main === module) {
  const report = getHardwareReport();
  const bench = runBenchmark();
  console.log(formatReport(report, bench));
}
