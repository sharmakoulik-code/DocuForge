import { describe, it, expect } from "vitest";
import {
  getHardwareReport,
  detectCpu,
  detectGpu,
  runBenchmark,
  formatReport,
} from "../packages/engine/src/hardware";

describe("hardware", () => {
  it("getHardwareReport returns OS/RAM/CPU/GPU structure", () => {
    const r = getHardwareReport();
    expect(typeof r.os).toBe("string");
    expect(r.os.length).toBeGreaterThan(0);
    expect(r.ramBytes).toBeGreaterThan(0);
    expect(r.ramGb).toBeGreaterThan(0);
    expect(r.cpu.model).toBeTruthy();
    expect(r.cpu.threads).toBeGreaterThan(0);
    expect(typeof r.gpu.detected).toBe("boolean");
    expect(r.gpu.summary.length).toBeGreaterThan(0);
    expect(r.nodeVersion).toMatch(/^v\d+\./);
  });

  it("detectCpu reports cores and threads", () => {
    const c = detectCpu();
    expect(c.threads).toBeGreaterThan(0);
    expect(c.cores).toBeGreaterThan(0);
    expect(c.cores).toBeLessThanOrEqual(c.threads);
  });

  it("detectGpu reports presence/absence without crashing", () => {
    const g = detectGpu();
    expect(typeof g.detected).toBe("boolean");
    expect(g.summary.length).toBeGreaterThan(0);
  });

  it("runBenchmark reports Kokoro/faster-whisper as NOT INSTALLED / NOT MEASURED", () => {
    const b = runBenchmark();
    expect(b.cpuRenderFps).toBeGreaterThan(0);
    expect(b.kokoroTts).toMatch(/NOT INSTALLED \/ NOT MEASURED/);
    expect(b.fasterWhisper).toMatch(/NOT INSTALLED \/ NOT MEASURED/);
    expect(b.estimated30MinFilmMinutes).not.toBeNull();
  });

  it("formatReport includes OS, RAM, CPU, GPU, benchmark", () => {
    const text = formatReport(getHardwareReport(), runBenchmark());
    expect(text).toMatch(/OS:/);
    expect(text).toMatch(/RAM:/);
    expect(text).toMatch(/CPU:/);
    expect(text).toMatch(/GPU:/);
    expect(text).toMatch(/Kokoro TTS:/);
    expect(text).toMatch(/faster-whisper:/);
  });

  it("benchmark estimates a 30-min film time", () => {
    const b = runBenchmark();
    expect(b.estimated30MinFilmMinutes!).toBeGreaterThan(0);
    expect(b.estimateNote.length).toBeGreaterThan(0);
  });

  it("hardware report is JSON-serializable", () => {
    const r = getHardwareReport();
    expect(() => JSON.stringify(r)).not.toThrow();
  });
});
