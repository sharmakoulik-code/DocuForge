# DocuForge

A FREE, local-first app that turns a user-written script into a narrated,
captioned 1080p long-form documentary (target 25–30 min, max 40) for a
monetized YouTube channel. It is a production / quality-control tool, NOT a
"topic in, film out" generator. **Narration timing is the authority.**
Output is explainer-style graphics and stills (title cards, kinetic text,
quote cards, charts, timelines, Ken Burns stills, archival frames, music,
captions).

- **FREE ONLY** — open-source / free-licensed tools, no paid APIs. Ollama is
  optional/pluggable; DocuForge works fully with none.
- **LOCAL-FIRST** — all data on your machine as plain files
  (Markdown / JSON / WAV / SRT / MP4). No cloud account. No proprietary
  project format.
- **NO FABRICATION** — never invent facts, sources, quotes, or statistics.
- **AUTHORSHIP** — AI never writes the final script; it only proposes
  accept/reject diffs (M4).
- **HARDWARE-AWARE** — detects OS/RAM/CPU/GPU at startup, prints a report,
  runs a quick benchmark, estimates realistic time for a 30-min film.
  M1–M3 must work on CPU only.
- **PERSONAL USE, NOT A PRODUCT** — this is a private tool for one creator's
  own channel, not something to sell, publish, or host for others. There is
  no sign-up, no multi-user support, no billing, no public deployment, and no
  packaging/installer work. Do not add distribution or commercialization
  requirements; open-source license compliance is tracked only because it is
  free and cheap to respect, not because the app is redistributed.

## Current milestone: P1 (Projects + Script) on top of M1 (P0)

P0 (M1 engineering-hardened) delivered the engine, doctor, hardware report,
and 10-second smoke render. P1 adds project scaffolding (`docuforge new`),
the web script editor, live word count / runtime estimate, chapter outline,
and source/claim linking. Still M1 scope: no Kokoro, no faster-whisper,
no Ollama, no GPU.

## Quick start

Requirements: Node.js 20+, FFmpeg (with ffprobe).

```powershell
# Windows (PowerShell)
npm install
npm run build
npm run doctor
npm run hardware:report
npm run smoke:render
npm run test
```

```bash
# macOS / Linux
npm install
npm run build
npm run doctor
npm run hardware:report
npm run smoke:render
npm run test
```

### Commands

| Command | What it does |
|---|---|
| `npm run build` | Compile TypeScript (engine + api). Web builds separately via `npm run build:web`. |
| `npm run doctor` | Dependency doctor: Node 20+, FFmpeg, FFprobe, TypeScript. Exits 0 when all pass; non-zero with fix instructions when missing. |
| `npm run hardware:report` | OS/RAM/CPU/GPU report + CPU/FFmpeg benchmark + 30-min film estimate. Kokoro TTS and faster-whisper report as NOT INSTALLED / NOT MEASURED. |
| `npm run smoke:render` | 10-second smoke render to `renders/smoke-10s/smoke.mp4` (1920x1080, 30 fps, H.264/AAC), validated by FFprobe when available. |
| `npm run test` | Run Vitest suite: timing, hardware, license gate, project, script, doctor, API contract, single-server/static. |
| `npm run docuforge -- new <name> [--title ...] [--runtime ...] [--language ...] [--theme ...] [--strict]` | Create a new project under `projects/<name>/`. |
| `npm run docuforge -- list` | List projects. |
| `npm run build:all` | Compile everything: engine + api + web. |
| `npm start` | **Single-server mode.** One Fastify process serves the API and the built editor on http://localhost:3001. Requires `npm run build:all` first. |
| `npm run dev:api` | Start the API alone on http://localhost:3001 (no UI). |
| `npm run dev:web` | Start the Vite dev server on http://localhost:5173 with hot reload; proxies `/api` to port 3001. |

### Running it

Two modes, pick one:

**Single server (normal use)** — one process, one port, no proxy:

```bash
npm run build:all
npm start                      # http://localhost:3001
```

**Dev mode (editing the UI)** — two terminals, hot reload:

```bash
npm run dev:api                # terminal A: API on :3001
npm run dev:web                # terminal B: editor on :5173
```

Configuration (environment variables, all optional):

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3001` | HTTP port. Invalid values are refused at startup. |
| `HOST` | `0.0.0.0` | Bind address. Use `127.0.0.1` to keep it off the LAN. |
| `PROJECTS_ROOT` | `<repo>/projects` | Where project folders live. |
| `DOCUFORGE_WEB_DIR` | `<repo>/packages/web/dist` | Where the built editor lives. |

`GET /api/meta` reports what the running process is actually serving (mode, roots,
pid, uptime), so you never have to guess which build is live. `SIGINT`/`SIGTERM`
shut down gracefully — in-flight requests finish, project files are never touched.

If the UI has not been built, `/` returns a 503 page telling you to run
`npm run build:web` instead of a blank error.

## Hardware report format

`npm run hardware:report` prints:

```
DocuForge Hardware Report
========================
OS: linux x64 (release ...)
Hostname: ...
RAM: X GB total (... bytes), Y GB free
CPU: <model> — N cores / M threads @ ... MHz
GPU: <presence/absence summary>
Node: v20.x.x
FFmpeg: <version> | NOT INSTALLED

Benchmark
---------
CPU render speed: N fps (proxy)
FFmpeg encode: N fps | NOT MEASURED
FFmpeg decode: N fps | NOT MEASURED
FFmpeg note: ...
Kokoro TTS: NOT INSTALLED / NOT MEASURED (excluded from M1 ...)
faster-whisper: NOT INSTALLED / NOT MEASURED (excluded from M1 ...)
Estimated time for 30-min film: ~N minutes
Estimate note: ...
```

GPU detection reports presence/absence only; M1 does no GPU-accelerated
rendering. On the reference machine (Intel Core i3-7020U, 8 GB RAM,
integrated graphics) expect CPU-only operation.

## Project layout

```
docuforge/
  packages/engine/    TS core: pipeline, timing model, shot graph, QC, hardware, project, script
  packages/api/       Fastify API + CLI (doctor, docuforge new)
  packages/web/       React + Vite UI (script editor, outline, factcheck)
  python-workers/     DEFERRED to M2+ (Kokoro TTS, faster-whisper venvs) — README only in M1/P1
  vendor/             Permissive-license submodules + NOTICE.md (deferred)
  LICENSES.md         M1 dependency/runtime license register
  LICENSES-REVIEW.md  Deferred reviews: Revideo, Kokoro-82M, faster-whisper, FFmpeg, Ollama
  projects/           User projects — plain Markdown/JSON/WAV/SRT/MP4
  tests/              Vitest suite
```

### Project folder (`projects/<name>/`)

```
project.json          title, runtime_target_minutes, language, originality_statement, theme, strict_mode
research/             notes.md, sources.json
script/               script.md, factcheck.json
audio/                source/, narration/, music/, music-registry.json
assets/               media + asset-log.json
fonts/                font-registry.json
shots/                shots.json
renders/              chapter-XX/, render-manifest.json
captions/             *.srt, *.vtt
publish/              titles.md, description.md, thumbnail-brief.md, retention-report.md
final/                final.mp4, production-report.md
```

## Script format (P1)

Markdown with `## Chapter N: title` headings. The script is authoritative.
Live word count vs runtime estimate uses the ~150 wpm planning figure only —
real runtime comes from narration audio duration.

```markdown
# My Film

## Chapter 1: Introduction

Narration here…

## Chapter 2: Background

More narration…
```

Source/claim linking lives in `script/factcheck.json` (`{ "claims": [...] }`).
Every claim needs a source — no fabrication.

## Architecture

- **WEB UI** (React + Vite): script editor, shot editor, captions, QC
  dashboard, export gate. The UI never touches FFmpeg/renderers directly.
- **API LAYER** (Node 20 + TypeScript + Fastify): persistent job queue
  (progress, cancel, retry, crash recovery) — job queue lands in a later
  milestone; P1 exposes project/script/factcheck endpoints. SQLite is the
  index + job store ONLY; project files are the source of truth.
- **Typed adapters**: RENDERER (Revideo / Motion Canvas / HTML+FFmpeg),
  TTS (Kokoro-82M Python venv CPU + own-recording WAV import),
  CAPTIONER (faster-whisper Python venv CPU). Adapters are deferred to
  M2+; M1 uses own-recording WAV import only.
- **FFmpeg assembly**: 1920x1080, 30 fps, H.264/AAC. Chapter renders to
  `final/`, −16 LUFS loudness, ducking, crossfade (later milestones).

## Known limitations (M1/P1)

- Smoke test is 10 seconds only; the M1 acceptance film (60–120 s,
  chapter-by-chapter) comes in P4.
- Kokoro TTS and faster-whisper are explicitly excluded from M1; narration
  in M1 uses own-recording WAV import only. No captions feature yet (P7).
- No GPU detection beyond reporting presence/absence; no GPU-accelerated
  rendering in M1.
- No shot editor yet (P3). No export gates yet (P4+). No AI diffs yet (M4).
- SQLite index/job store and persistent job queue are deferred; P1 API
  reads/writes project files directly.

## Reference (Mode C — no code copied)

OpenMontage (https://github.com/OpenMontageInc/OpenMontage, GNU AGPL-3.0)
was read for ideas only: declarative pipeline manifests, typed
adapter/selector contracts, checkpoint + render-manifest persistence with
input hashes, human approval gates, events journaling, SSE + filesystem
watcher, preview ladder, fail-closed JSON Schema validation. Patterns were
re-implemented in TypeScript; no AGPL code was copied.
