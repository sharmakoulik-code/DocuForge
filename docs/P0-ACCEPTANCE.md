# DocuForge — P0 Acceptance Report

**Scope:** P0 = M1 foundation (CPU-only) + P1 (Projects + Script). No M2+ work included.
**Status:** 10 of 11 items PASS. Item 11 (human playback check) is the only item not provable by command.
**Verified on:** user Windows 10/11 machine (primary) and Linux sandbox (secondary).

---

## Environment

| | User machine (primary) | Sandbox (secondary) |
|---|---|---|
| OS | Windows (OneDrive Desktop) | Debian 12, x86-64 |
| Node | v24.15.0 | v22.22.3 |
| npm | bundled with Node 24 | 10.9.8 |
| FFmpeg | 8.1-full (gyan.dev) | static n9.0.2 (imageio-ffmpeg, verification only) |
| FFprobe | 8.1-full (gyan.dev) | not available |
| TypeScript | 5.9.3 (local devDependency) | 5.9.3 |
| GPU | none assumed (Intel i3-7020U, ~8 GB RAM) | none |

Note: FFmpeg/FFprobe are **system dependencies only**. They are never bundled,
vendored, or imported by DocuForge code; the engine shells out to them.

---

## Results

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Clean build (engine + api + web) | PASS | `npm run build` exit 0; engine then api via tsc, web via vite |
| 2 | Type checks (`tsc --noEmit`, all packages) | PASS | exit 0 |
| 3 | Test suite | PASS | 36/36 tests, 6 files (timing 7, hardware 7, license-gate 5, project 7, script 6, doctor 4) |
| 4 | Hardware report | PASS | CPU benchmark 188 fps; FFmpeg encode 170 fps / decode 368 fps; ~8 min estimate for a 30-min film |
| 5 | Dependency doctor | PASS | 4/4 checks, "All checks passed. DocuForge is ready.", `DOCTOR_EXIT=0` |
| 6 | License gate / no deferred tools | PASS | import scan clean; no Kokoro, faster-whisper, Ollama, Revideo, Remotion, Piper |
| 7 | Real 10s smoke render | PASS | `frame=300`, 221 KiB, 42.69 kb/s, rendered in ~4.9 s |
| 8 | FFprobe MP4 spec | PASS | video h264 1920x1080 `30/1`; audio aac 48000 Hz mono; duration `10.000000`; 300 frames counted |
| 9 | Text overlays actually drawn | PASS | YMIN 17 (background), YMAX 247 (glyphs), YAVG 31.5, UMAX 139 / VMAX 130 (chroma subtitle) |
| 10 | Deferred-tool absence / scope guard | PASS | no new runtime deps; no M2/M3 features; narration import is own-WAV only |
| 11 | Human playback check | PENDING | requires eyeball: title card 0–3 s, kinetic text 3–10 s |

### Smoke render specification (measured, both platforms)

```
duration  00:00:10.00
video     h264 (High), yuv420p, 1920x1080, 30 fps, 300 frames
audio     aac (LC), 48000 Hz, mono, 127-128 kb/s
container mp4, +faststart
size      221-226 KiB
```

---

## Bugs found and fixed during acceptance

### 1. Windows font path broke the smoke render — fixed in `e61453d`

Symptom:

```
[AVFilterGraph] No option name near '\Windows\Fonts\arial.ttf:text=DocuForge:...'
[AVFilterGraph] Error parsing a filter description
```

Cause: the `drawtext fontfile` value was built from the raw Windows path.
FFmpeg parses a filter description in two passes (filtergraph, then filter
options), so the drive-letter `:` splits the option list unless its escaping
backslash is itself escaped. Backslash separators are also escape characters.

Fix: `escapeFilterPath()` in `packages/engine/src/render-smoke.ts` normalizes
`\` to `/` (Windows accepts forward slashes) and emits `\\:` for the drive
colon. Measured matrix against real FFmpeg:

| argv value | result |
|---|---|
| `C:/Windows/Fonts/arial.ttf` | parse error |
| `C\:/Windows/Fonts/arial.ttf` | parse error |
| `fontfile='C:/Windows/Fonts/arial.ttf'` | parse error |
| `C\\:/Windows/Fonts/arial.ttf` | parses **and loads the file** |

"Loads the file" was proven by matching DejaVuSans vs DejaVuSansMono frame
hashes against plain-POSIX ground truth, which rules out FFmpeg's silent
fallback to a default font. POSIX paths contain neither character and are
byte-identical to the previous behavior.

### 2. Doctor false-negative on Windows — fixed in `e203d7a`

Symptom: `FAIL TypeScript: TypeScript NOT FOUND (npx tsc failed)` immediately
after `npm run build` had compiled both packages with that same TypeScript.

Cause: `execFileSync("npx", ["tsc", "--version"])`. On Windows `npx` is
`npx.cmd`, a batch file that Node's `child_process` refuses to spawn without
`shell: true` (CVE-2024-27980 hardening). The check only ever worked on POSIX,
where `npx` is a shebang script.

Fix: `findLocalTsc()` in `packages/api/src/doctor.ts` walks up for
`node_modules/typescript/lib/tsc.js` and runs it with `process.execPath` — no
shell, no `.cmd`, identical on all platforms. `npx` remains only as a fallback
(`npx.cmd` + `shell: true` on win32). Regression-tested by
`tests/doctor.test.ts` (4 tests) and by running the doctor with `npx` removed
from `PATH`.

---

## Reproducing this report

```powershell
npm install
npm run build
npm run test
npm run doctor
"DOCTOR_EXIT=$LASTEXITCODE"
npm run hardware:report
npm run smoke:render
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels -show_entries format=duration -of json "renders\smoke-10s\smoke.mp4"
ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -of csv=p=0 "renders\smoke-10s\smoke.mp4"
ffmpeg  -v error -ss 5 -i "renders\smoke-10s\smoke.mp4" -frames:v 1 -vf signalstats,metadata=print:file=- -f null -
```

`renders/` is git-ignored; the smoke MP4 is a build product, not a fixture.

---

## Explicitly out of scope for P0

Shot editor (P3), captions (P7), Kokoro TTS, faster-whisper, Ollama, GPU
rendering, AI script generation, three-gate M3 export pipeline. Narration in M1
is an imported self-recorded WAV only. The 10-second smoke render is a
plumbing test; the 60–120 s chapter-by-chapter acceptance film belongs to P4.
