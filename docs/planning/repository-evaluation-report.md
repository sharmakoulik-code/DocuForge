# DocuForge Repository Evaluation Report

**Evaluation date:** 2026-11-22
**Scope:** all repository candidates in Sections 25.2–25.5 plus live-search discoveries
**Paper-evaluation result:** 188 live repository records: **72 A**, **95 B**, **21 C**. Nothing was installed during that evaluation. On 2026-11-22 the user subsequently approved the listed M1 subset; the register now records its exact integrated versions and approval date.

## Classification and approval meaning

- **A — proposed for isolated evaluation.** This is an engineering recommendation, not yet user approval. Installation is forbidden until the relevant milestone is approved. M1 may install only M1 Core Platform entries.
- **B — reference only.** Read documentation/design; do not install and do not copy code.
- **C — blocked.** Licence, maintenance, hardware, safety, ambiguity, or duplication fails a gate. A later change requires explicit re-evaluation and approval.

The machine-readable, seeded Dependency and Attribution Register is
[`dependency-attribution-register.csv`](dependency-attribution-register.csv). It contains code, model/weight and data licence fields separately; canonical URL; commit and release dates; archive state; Windows/8 GB assessment; duplicate function; integration complexity; milestone; approval date; and status.

## Verification method and limits

1. Queried the live GitHub repository on 2026-11-22 for canonical redirects, default-branch commit, latest GitHub release, archive state, detected licence, and public issues carrying the exact `security` label.
2. Retrieved/read non-standard repository licence files where GitHub returned `NOASSERTION`, and cross-checked the PyPI licence field for WMI, pywin32 and Matplotlib. Fields without adequate evidence remain **UNVERIFIED**.
3. Queried PyPI and npm registries for proposed package versions and artifact metadata. No package, model, browser, runtime, or repository was downloaded/installed.
4. The `security` count is **not a vulnerability audit**. It misses private reports, advisories without that label, transitive vulnerabilities and unreported defects. Those remain **UNVERIFIED** until a lockfile exists and `pip-audit`/`npm audit` plus repository advisory review run after approval.
5. GitHub `diskUsage` is repository storage, not installed footprint. Installed peak RAM/disk/time remain **UNVERIFIED** until the required isolated benchmark on the user's Windows computer.
6. Model weights, voices, fonts, geographic data and media files are separate works. A permissive code licence never clears those assets.

## Decision summary

### Recommended M1 set

FastAPI, Uvicorn/Starlette, Pydantic, SQLAlchemy/Alembic, Huey with SQLite, pytest, Ruff, psutil, py-cpuinfo, React, Vite, TypeScript, Tailwind, selected Radix primitives, TanStack Query, React Resizable Panels, Lucide, Vitest and Playwright using the already-installed Chrome. FFmpeg is detected as an external CLI; its exact build licence is recorded before use.

**Not selected for M1:** structlog (stdlib logging is sufficient), WMI/pywin32 (fixed PowerShell CIM plus psutil first), watchdog (volume polling is a better drive-removal mechanism), shadcn/ui (its generator copies component source), Zustand (React state + Query is enough), Motion (CSS first), dnd-kit (defer to storyboard/timeline), and Honcho (the Control Centre requires a project-specific supervisor).

### Queue decision: Huey vs custom SQLite queue

**Recommend Huey (`SqliteHuey`) behind a `TaskQueue` port**, configured as one worker and one execution thread. It is MIT, current, small (135,393-byte wheel), persistent, retry-capable and avoids writing a custom broker. DocuForge still owns user-visible job state, checkpoint manifests, idempotency keys, drive requirements and recovery rules in its own SQLite/file schemas. If the isolated Windows test reveals locking, shutdown, retry or pause defects, stop and return for approval before substituting a custom SQLite queue.

### Major later choices (paper only)

- Retrieval: SQLite FTS5 first; compare FastEmbed + sqlite-vec only when semantic search is justified. Do not carry LanceDB and Chroma.
- Local LLM: compare external Ollama and llama.cpp with one 1–3B quantised model; do not load both. IPEX-LLM is archived.
- TTS: bake off kokoro-onnx, Piper as a separate GPL CLI, and sherpa-onnx or KittenTTS. No candidate passes until code, model and each voice licence pass.
- STT: compare faster-whisper and whisper.cpp using tiny/base int8; avoid WhisperX/MFA by default on 8 GB.
- Motion: FFmpeg first, then one of Motion Canvas/Pixi after measurement. Revideo is a duplicate. Remotion and GSAP are blocked by custom terms.
- Maps: MapLibre + D3 + PMTiles; all historical data remains source-cited and uncertainty-labelled.
- Timeline: evaluate React Timeline Editor + OpenTimelineIO; use Tiptap for script editing and jsdiff for focused changes.
- Backup: restic as a separate CLI in M10; SQLite online backup and Git text snapshots are native earlier.

## Feature-to-repository decision matrix (Sections 4–28)

| Section | Planned choice | Why / custom boundary |
|---|---|---|
| 4 UI | React, Vite, Tailwind, Radix, Resizable Panels, Lucide | Premium studio shell; visual design is custom. Disabled future routes are labelled, never fake-functional. |
| 5 Project creation | Pydantic, SQLAlchemy; custom manifest writer | Topic-only draft creation in M1. AI production-plan proposal is later and is not mocked. |
| 6 Research | HTTPX/direct authorised APIs, Playwright, Trafilatura, pypdf/pdfplumber, dateparser, citeproc, ReportLab; SQLite FTS5 first | Sequential custom research state machine; file-level provenance and claims are custom. |
| 7 Fact checking | SQLite/FTS plus custom claim-to-source graph | No mature library supplies DocuForge's evidence classes, contradiction and ethical gates. |
| 8 Script studio | Tiptap + jsdiff later | Versioned paragraph model, evidence links, hook/pacing heuristics are custom. |
| 9 Storyboard | dnd-kit later + custom paragraph→beat→scene model | Scene dependencies and regeneration are app-specific. |
| 10 Visuals | FFmpeg, Pillow, Motion Canvas/Pixi, PySceneDetect later | Asset licences and alteration labels are custom; no automatic copyrighted-media downloader. |
| 11 Maps | MapLibre, D3, PMTiles; optional GeoPandas/Shapely/pyproj | Border geometry must come from cited dated data; never from an LLM. |
| 12 Infographics | D3 + Motion Canvas | Editable specs and cited data; avoid duplicate chart frameworks. |
| 13 Narration | Adapter bake-off: kokoro-onnx, Piper CLI, sherpa-onnx/KittenTTS | Pronunciation dictionary and consent records are custom. No winner before listening approval. |
| 14 Audio | FFmpeg filters + WaveSurfer.js | Prefer measurable native filters over embedded GPL or heavy neural stacks. |
| 15 Timeline | React Timeline Editor + OpenTimelineIO evaluation | Proxy-aware custom production model; virtualise large timelines. |
| 16 Subtitles | faster-whisper vs whisper.cpp; pysubs2/libass | Narration audio is timing authority; style model is custom. |
| 17 Regeneration | jsdiff plus custom dependency graph/checkpoints | Explicitly app-specific; preserve unrelated scenes. |
| 18 Rendering | FFmpeg/ffprobe external CLI | Chunk manifests, cache keys, last-good output and QSV validation are custom. |
| 19 Shorts | Existing timeline/render adapters; no extra pipeline | Selection/reframing is custom; short-form repositories are references only. |
| 20 Publishing | No external repository needed | Local text/file export only; no YouTube account connection. |
| 21 Thumbnails | Konva later | Editable canvas and licence/disclosure records are custom. |
| 22 Resources/storage | psutil + PowerShell CIM; custom volume identity/drive gate | Database stays internal; external disconnect handling is app-specific. |
| 23 Model manager | Ollama/llama.cpp external adapters; optional OpenVINO evaluation | Model licence/size/SHA gates and single-model memory policy are custom. |
| 24 Free-first | No dependency | Allow-list and quota/paid-routing blocks are policy code. |
| 25 Repository integration | GitHub metadata via explicit adapters later; register in CSV | No repository code copying; approvals are recorded. |
| 26 Control Centre | Custom small Python supervisor | Honcho lacks the app-specific safe restart, log and drive/task controls. |
| 27 Backup | SQLite online backup + Git; restic later | Never delete the only copy; external destination is user-selected. |
| 28 QA | FFmpeg/ffprobe, pytest, Vitest, Playwright; PySceneDetect later | Measurable checks remain separate from heuristic warnings. |

## Full live repository catalogue

Legend: **W/D** = model weights/data licence (`N/A` none evaluated, `U` UNVERIFIED, `NC` non-commercial concern); **8GB** = `Y` feasible/light, `C` conditional/sequential, `N` unsuitable/default blocked, `R` reference only; **Sec** = public open issue count with the exact `security` label only.

### Core platform and hardware detection (M1 candidates)
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [FastAPI](https://github.com/fastapi/fastapi) | A | MIT | N/A/N/A | 2026-11-18 | 0.165.0 (2026-11-18) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Uvicorn](https://github.com/Kludex/uvicorn) | A | BSD-3-Clause | N/A/N/A | 2026-11-22 | 0.54.0 (2026-09-25) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Starlette](https://github.com/Kludex/starlette) | A | BSD-3-Clause | N/A/N/A | 2026-11-22 | 1.10.0 (2026-10-24) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Pydantic](https://github.com/pydantic/pydantic) | A | MIT | N/A/N/A | 2026-11-21 | v2.14.4 (2026-11-19) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy) | A | MIT | N/A/N/A | 2026-11-19 | rel_2_1_9 (2026-11-16) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Alembic](https://github.com/sqlalchemy/alembic) | A | MIT | N/A/N/A | 2026-11-22 | rel_1_20_1 (2026-10-22) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Huey](https://github.com/coleifer/huey) | A | MIT | N/A/N/A | 2026-11-05 | 3.5.4 (2026-11-01) | Y | L | 0 | Recommended over custom queue: mature MIT SqliteHuey, tiny package, single worker/thread; app manifests still own checkpoint state. |
| [structlog](https://github.com/hynek/structlog) | B | MIT OR Apache-2.0 (LICENSE-MIT/LICENSE-APACHE) | N/A/N/A | 2026-11-22 | 26.1.0 (2026-06-06) | Y | L | 0 | Reference/duplicate; do not install or copy. |
| [pytest](https://github.com/pytest-dev/pytest) | A | MIT | N/A/N/A | 2026-11-22 | 9.2.0 (2026-10-27) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Ruff](https://github.com/astral-sh/ruff) | A | MIT | N/A/N/A | 2026-11-22 | 0.17.6 (2026-11-19) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [psutil](https://github.com/giampaolo/psutil) | A | BSD-3-Clause | N/A/N/A | 2026-11-20 | NONE FOUND / UNVERIFIED | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [py-cpuinfo](https://github.com/workhorsy/py-cpuinfo) | A | MIT | N/A/N/A | 2022-11-19 | NONE FOUND / UNVERIFIED | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [WMI](https://github.com/tjguk/wmi) | C | MIT claimed by PyPI; repository LICENSE absent—UNVERIFIED | N/A/N/A | 2020-04-29 | NONE FOUND / UNVERIFIED | N | L | 0 | Stale and repository licence absent; use fixed PowerShell CIM queries plus psutil instead. |
| [pywin32](https://github.com/mhammond/pywin32) | B | PSF claimed by PyPI; repository LICENSE endpoint absent—UNVERIFIED | N/A/N/A | 2026-11-12 | b312 (2026-06-04) | Y | L | 0 | Avoid in M1 unless stdlib/PowerShell cannot expose required Windows data. |
| [watchdog](https://github.com/gorakhargosh/watchdog) | B | Apache-2.0 | N/A/N/A | 2026-11-21 | v7.1.1 (2026-11-21) | Y | L | 0 | Filesystem watcher does not reliably solve drive removal; use volume polling/identity marker. |
| [FFmpeg](https://github.com/FFmpeg/FFmpeg) | A | LGPL-2.1-or-later default; GPL-2.0-or-later if GPL build options enabled | N/A/N/A | 2026-11-22 | NONE FOUND / UNVERIFIED | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [React](https://github.com/react/react) | A | MIT | N/A/N/A | 2026-11-21 | v19.3.1 (2026-10-14) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Vite](https://github.com/vitejs/vite) | A | MIT | N/A/N/A | 2026-11-20 | v8.3.8 (2026-11-11) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [TypeScript](https://github.com/microsoft/TypeScript) | A | Apache-2.0 | N/A/N/A | 2026-11-21 | v7.0.2 (2026-08-20) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | A | MIT | N/A/N/A | 2026-11-20 | v4.3.5 (2026-11-06) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | B | MIT | N/A/N/A | 2026-11-21 | shadcn@4.23.0 (2026-10-27) | Y | L | 0 | Reference/design recipes only: generator copies component code, conflicting with the no-copy/vendor rule. |
| [Radix Primitives](https://github.com/radix-ui/primitives) | A | MIT | N/A/N/A | 2026-10-14 | NONE FOUND / UNVERIFIED | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Zustand](https://github.com/pmndrs/zustand) | B | MIT | N/A/N/A | 2026-11-06 | v5.1.0 (2026-11-06) | Y | L | 0 | Reference/duplicate; do not install or copy. |
| [TanStack Query](https://github.com/TanStack/query) | A | MIT | N/A/N/A | 2026-11-22 | release-2026-11-20-1337 (2026-11-20) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [dnd-kit](https://github.com/clauderic/dnd-kit) | A | MIT | N/A/N/A | 2026-10-31 | @dnd-kit/geometry@0.5.3 (2026-10-31) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [React Resizable Panels](https://github.com/bvaughn/react-resizable-panels) | A | MIT | N/A/N/A | 2026-11-21 | 4.24.1 (2026-11-18) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Motion](https://github.com/motiondivision/motion) | B | MIT | N/A/N/A | 2026-11-21 | NONE FOUND / UNVERIFIED | Y | L | 0 | Reference/duplicate; do not install or copy. |
| [Lucide](https://github.com/lucide-icons/lucide) | A | ISC; some Feather-derived icons MIT | N/A/N/A | 2026-11-22 | 1.77.0 (2026-11-20) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Vitest](https://github.com/vitest-dev/vitest) | A | MIT | N/A/N/A | 2026-11-20 | v5.1.1 (2026-11-17) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Playwright](https://github.com/microsoft/playwright) | A | Apache-2.0 | N/A/N/A | 2026-11-21 | v1.65.1 (2026-11-13) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Honcho](https://github.com/nickstenning/honcho) | B | MIT | N/A/N/A | 2025-06-03 | v2.0.0 (2024-10-06) | Y | L | 0 | Custom small supervisor is app-specific and avoids another process manager. |
| [HTTPX (test client)](https://github.com/encode/httpx) | A | BSD-3-Clause | N/A/N/A | 2026-11-16 | 0.28.1 (2024-12-06) | Y | L | 0 | Evaluate only in stated milestone after approval. |

### Local AI and retrieval
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [Ollama](https://github.com/ollama/ollama) | A | MIT | U/N/A | 2026-11-22 | v0.40.17 (2026-11-10) | C | M | 0 | Evaluate only in stated milestone after approval. |
| [llama.cpp](https://github.com/ggml-org/llama.cpp) | A | MIT | U/N/A | 2026-11-22 | v1.0.0 (2026-11-13) | C | M | 1 | Evaluate only in stated milestone after approval. |
| [llama-cpp-python](https://github.com/abetlen/llama-cpp-python) | B | MIT | U/N/A | 2026-11-22 | v0.3.37-hip-radeon (2026-11-15) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [OpenVINO](https://github.com/openvinotoolkit/openvino) | A | Apache-2.0 | U/N/A | 2026-11-22 | 2026.4.1 (2026-10-01) | C | M | 0 | Evaluate only in stated milestone after approval. |
| [OpenVINO GenAI](https://github.com/openvinotoolkit/openvino.genai) | B | Apache-2.0 | U/N/A | 2026-11-20 | 2026.4.1.0 (2026-10-01) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [IPEX-LLM](https://github.com/intel/ipex-llm) | C | Apache-2.0 | U/N/A | 2026-01-28 | v2.2.0 (2025-04-07) | N | M | 0 | Archived; blocked. |
| [LiteLLM](https://github.com/BerriAI/litellm) | B | MIT outside enterprise directory; enterprise code separately licensed | U/N/A | 2026-11-22 | v1.110.2 (2026-11-20) | C | M | 0 | Too broad and can route paid providers; implement a thin allow-listed local/free adapter. |
| [Outlines](https://github.com/dottxt-ai/outlines) | B | Apache-2.0 | U/N/A | 2026-08-24 | 1.3.3 (2026-08-06) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [Instructor](https://github.com/567-labs/instructor) | B | MIT | U/N/A | 2026-11-18 | v1.17.0 (2026-09-09) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [FastEmbed](https://github.com/qdrant/fastembed) | A | Apache-2.0 | U/N/A | 2026-11-18 | v0.9.1 (2026-10-24) | C | M | 0 | Evaluate only in stated milestone after approval. |
| [Sentence Transformers](https://github.com/huggingface/sentence-transformers) | B | Apache-2.0 | U/N/A | 2026-11-20 | v6.3.0 (2026-11-11) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [sqlite-vec](https://github.com/asg017/sqlite-vec) | A | Apache-2.0 | U/N/A | 2026-05-18 | v0.1.9 (2026-03-31) | C | M | 0 | Evaluate only in stated milestone after approval. |
| [LanceDB](https://github.com/lancedb/lancedb) | B | Apache-2.0 | U/N/A | 2026-11-22 | v0.41.0 (2026-10-29) | N | M | 0 | Reference/duplicate; do not install or copy. |
| [Chroma](https://github.com/chroma-core/chroma) | B | Apache-2.0 | U/N/A | 2026-11-07 | 1.5.9 (2026-05-05) | N | M | 0 | Reference/duplicate; do not install or copy. |

### Research, documents, translation, NLP and citation
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [SearXNG](https://github.com/searxng/searxng) | B | AGPL-3.0 | N/A/U | 2026-11-21 | NONE FOUND / UNVERIFIED | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [Crawl4AI](https://github.com/unclecode/crawl4ai) | B | Apache-2.0 | N/A/U | 2026-11-20 | v0.9.6 (2026-11-20) | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [Playwright Python](https://github.com/microsoft/playwright-python) | B | Apache-2.0 | N/A/U | 2026-11-20 | v1.65.2 (2026-11-14) | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [Trafilatura](https://github.com/adbar/trafilatura) | A | Apache-2.0 | N/A/U | 2026-11-20 | v2.3.1 (2026-10-06) | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [Readability](https://github.com/mozilla/readability) | B | Apache-2.0 | N/A/U | 2026-07-09 | NONE FOUND / UNVERIFIED | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [GPT Researcher](https://github.com/assafelovic/gpt-researcher) | B | Apache-2.0 | N/A/U | 2026-11-09 | v3.8.0 (2026-11-09) | N | M | 0 | Reference/duplicate; do not install or copy. |
| [STORM](https://github.com/stanford-oval/storm) | B | MIT | N/A/U | 2025-09-30 | v1.1.0 (2025-01-23) | N | M | 0 | Reference/duplicate; do not install or copy. |
| [pypdf](https://github.com/py-pdf/pypdf) | A | BSD-3-Clause text (LICENSE) | N/A/U | 2026-11-22 | 7.1.1 (2026-11-18) | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [pdfplumber](https://github.com/jsvine/pdfplumber) | A | MIT | N/A/U | 2026-11-21 | v0.11.11 (2026-11-21) | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [Docling](https://github.com/docling-project/docling) | B | MIT | N/A/U | 2026-11-22 | v2.151.1 (2026-11-19) | N | M | 0 | Reference/duplicate; do not install or copy. |
| [PyMuPDF](https://github.com/pymupdf/PyMuPDF) | C | AGPL-3.0 | N/A/U | 2026-11-20 | 2.1 (2026-11-02) | Y | M | 0 | AGPL embedding blocked without explicit approval. |
| [Argos Translate](https://github.com/argosopentech/argos-translate) | B | MIT | N/A/U | 2026-11-17 | v1.4.0 (2021-08-24) | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate) | B | AGPL-3.0 | N/A/U | 2026-11-14 | v1.9.6 (2026-05-26) | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [spaCy](https://github.com/explosion/spaCy) | B | MIT | N/A/U | 2026-11-21 | release-v3.8.20 (2026-11-21) | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [GLiNER](https://github.com/urchade/GLiNER) | B | Apache-2.0 | N/A/U | 2026-11-11 | v0.2.30 (2026-11-02) | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [dateparser](https://github.com/scrapinghub/dateparser) | A | BSD-3-Clause | N/A/U | 2026-11-18 | v1.5.1 (2026-11-17) | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [citeproc-py](https://github.com/citeproc-py/citeproc-py) | A | BSD-2-Clause text (LICENSE) | N/A/U | 2026-11-12 | v0.12.3 (2026-11-12) | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [WeasyPrint](https://github.com/Kozea/WeasyPrint) | B | BSD-3-Clause | N/A/U | 2026-11-19 | v70.0 (2026-09-08) | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [ReportLab mirror](https://github.com/MrBitBucket/reportlab-mirror) | A | BSD-3-Clause | N/A/U | 2026-10-26 | NONE FOUND / UNVERIFIED | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [Pywikibot](https://github.com/wikimedia/pywikibot) | B | MIT | N/A/U | 2026-11-22 | NONE FOUND / UNVERIFIED | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [Internet Archive Python client](https://github.com/jjjake/internetarchive) | B | AGPL-3.0 | N/A/U | 2026-11-16 | v5.13.0 (2026-11-16) | Y | M | 0 | AGPL helper blocked for embedding; use documented HTTP API directly. |

### Existing video pipelines (reference candidates)
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [OpenMontage](https://github.com/OpenMontageInc/OpenMontage) | B | AGPL-3.0 | U/U | 2026-11-16 | NONE FOUND / UNVERIFIED | R | H | 0 | AGPL full pipeline; Mode B architecture reference only, no code copied. |
| [ArcReel](https://github.com/ArcReel/ArcReel) | B | AGPL-3.0 | U/U | 2026-11-22 | v0.37.0 (2026-11-16) | R | H | 0 | AGPL full pipeline; Mode B reference only and generative-video focus exceeds hardware. |
| [ai-shortVideo-pipeline](https://github.com/myccarl/ai-shortVideo-pipeline) | B | MIT | U/U | 2026-11-13 | NONE FOUND / UNVERIFIED | R | H | 0 | Reference/duplicate; do not install or copy. |
| [video-explainer-system](https://github.com/nemock/video-explainer-system) | B | MIT | U/U | 2026-06-07 | v1.0.0 (2026-05-30) | R | H | 0 | Reference/duplicate; do not install or copy. |
| [video_explainer](https://github.com/prajwal-y/video_explainer) | C | No repository LICENSE found—UNVERIFIED | U/U | 2026-02-24 | NONE FOUND / UNVERIFIED | N | H | 0 | Blocked by current gate. |
| [Claude Code Video Toolkit](https://github.com/digitalsamba/claude-code-video-toolkit) | B | MIT | U/U | 2026-11-22 | v0.30.0 (2026-11-22) | R | H | 0 | Reference/duplicate; do not install or copy. |
| [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | B | MIT | U/U | 2026-11-22 | v1.3.10 (2026-11-07) | R | H | 0 | Reference/duplicate; do not install or copy. |
| [ShortGPT](https://github.com/RayVentura/ShortGPT) | B | MIT | U/U | 2025-02-10 | v0.3.0 (2025-02-10) | R | H | 0 | Reference/duplicate; do not install or copy. |
| [ClipsAI](https://github.com/ClipsAI/clipsai) | B | MIT | U/U | 2024-01-17 | NONE FOUND / UNVERIFIED | R | H | 0 | Reference/duplicate; do not install or copy. |
| [FunClip](https://github.com/modelscope/FunClip) | B | MIT | U/U | 2026-11-01 | v2.2.1 (2026-09-01) | R | H | 0 | Reference/duplicate; do not install or copy. |
| [motion-skills (likely match)](https://github.com/iart-ai/motion-skills) | B | MIT | U/U | 2026-11-18 | NONE FOUND / UNVERIFIED | R | H | 0 | Reference/duplicate; do not install or copy. |
| [Claude Code Video Toolkit (alternate match)](https://github.com/wilwaldon/Claude-Code-Video-Toolkit) | B | UNVERIFIED | U/U | 2026-02-26 | NONE FOUND / UNVERIFIED | R | H | 0 | Reference/duplicate; do not install or copy. |
| [AI Video Studio (ambiguous match)](https://github.com/nguyentatkiem/ai-video-studio) | B | UNVERIFIED | U/U | 2026-11-12 | NONE FOUND / UNVERIFIED | R | H | 0 | Reference/duplicate; do not install or copy. |

### Narration and TTS
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [Kokoro](https://github.com/hexgrad/kokoro) | B | Apache-2.0 | U/N/A | 2025-08-06 | NONE FOUND / UNVERIFIED | C | H | 0 | Reference/duplicate; do not install or copy. |
| [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) | A | MIT | U/N/A | 2026-09-01 | model-files-v1.1 (2025-03-01) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | A | Apache-2.0 | U/N/A | 2026-11-22 | v2.0.3 (2026-11-22) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [Piper archived](https://github.com/rhasspy/piper) | C | MIT | U/N/A | 2025-08-26 | 2023.11.14-2 (2023-11-14) | N | H | 0 | Archived predecessor; do not adopt. |
| [Piper successor](https://github.com/OHF-Voice/piper1-gpl) | A | GPL-3.0 | U/N/A | 2026-11-19 | v1.8.0 (2026-09-04) | C | H | 0 | Only as separate GPL CLI after explicit approval; each voice licence must pass. |
| [MeloTTS](https://github.com/myshell-ai/MeloTTS) | B | MIT | U/N/A | 2024-12-24 | v0.1.2 (2024-03-01) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [KittenTTS](https://github.com/KittenML/KittenTTS) | A | Apache-2.0 | U/N/A | 2026-11-19 | 0.8.1 (2026-02-24) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [StyleTTS2](https://github.com/yl4579/StyleTTS2) | B | MIT | U/N/A | 2024-03-07 | NONE FOUND / UNVERIFIED | N | H | 0 | Reference/duplicate; do not install or copy. |
| [Parler-TTS](https://github.com/huggingface/parler-tts) | B | Apache-2.0 | U/N/A | 2024-12-10 | NONE FOUND / UNVERIFIED | N | H | 0 | Reference/duplicate; do not install or copy. |
| [Chatterbox](https://github.com/resemble-ai/chatterbox) | B | MIT | U/N/A | 2026-11-04 | v0.1.2 (2025-06-13) | N | H | 0 | Reference/duplicate; do not install or copy. |
| [Bark](https://github.com/suno-ai/bark) | C | MIT | U/N/A | 2024-04-05 | NONE FOUND / UNVERIFIED | N | H | 0 | Blocked by current gate. |
| [OpenVoice](https://github.com/myshell-ai/OpenVoice) | B | MIT | U/N/A | 2025-04-19 | NONE FOUND / UNVERIFIED | C | H | 0 | Reference/duplicate; do not install or copy. |
| [eSpeak NG](https://github.com/espeak-ng/espeak-ng) | B | GPL-3.0 | U/N/A | 2026-11-19 | 1.52.0 (2024-12-12) | C | H | 5 | Reference/duplicate; do not install or copy. |
| [Coqui TTS / XTTS](https://github.com/coqui-ai/TTS) | C | MPL-2.0 | NC/N/A | 2024-02-10 | v0.22.0 (2023-12-12) | C | H | 0 | XTTS-v2 weights conservatively blocked; code licence does not clear weights. |
| [F5-TTS](https://github.com/SWivid/F5-TTS) | C | MIT | NC/N/A | 2026-11-03 | 1.1.22 (2026-07-23) | C | H | 0 | Weights conservatively blocked as non-commercial until contrary live evidence is verified. |

### Speech-to-text and alignment
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | A | MIT | U/N/A | 2026-11-12 | v1.2.1 (2025-10-31) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | A | MIT | U/N/A | 2026-11-20 | v1.9.5 (2026-10-06) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [Whisper](https://github.com/openai/whisper) | B | MIT | U/N/A | 2026-08-31 | v20250625 (2025-06-26) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [stable-ts](https://github.com/jianfch/stable-ts) | C | MIT | U/N/A | 2026-05-30 | 2.0.0 (2023-03-17) | N | H | 0 | Blocked by current gate. |
| [WhisperX](https://github.com/m-bain/whisperX) | B | BSD-2-Clause | U/N/A | 2026-11-21 | v3.8.6 (2026-05-25) | N | H | 0 | Reference/duplicate; do not install or copy. |
| [Montreal Forced Aligner](https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner) | B | MIT | U/N/A | 2026-11-16 | v3.4.4 (2026-11-16) | N | H | 0 | Reference/duplicate; do not install or copy. |
| [Vosk](https://github.com/alphacep/vosk-api) | B | Apache-2.0 | U/N/A | 2026-10-15 | v0.3.50 (2024-04-22) | C | H | 0 | Reference/duplicate; do not install or copy. |

### Audio production
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [pyloudnorm](https://github.com/csteinmetz1/pyloudnorm) | B | MIT | N/A/N/A | 2026-01-04 | v0.2.0 (2026-01-04) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [librosa](https://github.com/librosa/librosa) | B | ISC | N/A/N/A | 2026-11-21 | 1.0.1 (2026-11-12) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [pydub](https://github.com/jiaaro/pydub) | B | MIT | N/A/N/A | 2026-03-19 | v0.25.1 (2021-03-10) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [noisereduce](https://github.com/timsainb/noisereduce) | B | MIT | N/A/N/A | 2024-10-06 | v3.0.0 (2023-09-10) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [DeepFilterNet](https://github.com/Rikorose/DeepFilterNet) | B | MIT OR Apache-2.0 | N/A/N/A | 2026-11-06 | v0.5.6 (2023-08-31) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [RNNoise](https://github.com/xiph/rnnoise) | B | BSD-3-Clause | N/A/N/A | 2025-02-22 | v0.2 (2024-04-15) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [Demucs](https://github.com/facebookresearch/demucs) | C | MIT | N/A/N/A | 2023-11-16 | NONE FOUND / UNVERIFIED | N | M | 0 | Blocked by current gate. |
| [WaveSurfer.js](https://github.com/katspaugh/wavesurfer.js) | A | BSD-3-Clause | N/A/N/A | 2026-11-12 | 8.1.0 (2026-11-12) | C | M | 0 | Evaluate only in stated milestone after approval. |
| [Peaks.js](https://github.com/bbc/peaks.js) | B | LGPL-3.0 | N/A/N/A | 2025-11-08 | v3.4.2 (2024-08-15) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [audiowaveform](https://github.com/bbc/audiowaveform) | B | GPL-3.0 | N/A/N/A | 2025-08-24 | 1.10.3 (2025-08-20) | C | M | 0 | Reference/duplicate; do not install or copy. |
| [Pedalboard](https://github.com/spotify/pedalboard) | C | GPL-3.0 | N/A/N/A | 2026-11-09 | v0.9.26 (2026-10-07) | C | M | 0 | Blocked by current gate. |
| [AudioCraft / MusicGen](https://github.com/facebookresearch/audiocraft) | C | MIT | NC/N/A | 2025-03-13 | NONE FOUND / UNVERIFIED | C | M | 0 | MusicGen/AudioCraft weights blocked as non-commercial. |

### Video, motion graphics and rendering
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [PyAV](https://github.com/PyAV-Org/PyAV) | B | BSD-3-Clause | N/A/N/A | 2026-11-21 | v19.0.2 (2026-10-21) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [OpenCV](https://github.com/opencv/opencv) | B | Apache-2.0 | N/A/N/A | 2026-11-22 | 5.1.0 (2026-11-06) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [Pillow](https://github.com/python-pillow/Pillow) | A | HPND (LICENSE) | N/A/N/A | 2026-11-22 | 13.0.0 (2026-10-16) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [skia-python](https://github.com/skia-python/skia-python) | B | BSD-3-Clause | N/A/N/A | 2026-11-21 | v144.1 (2026-10-20) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [Manim](https://github.com/ManimCommunity/manim) | A | MIT | N/A/N/A | 2026-11-22 | v0.22.1 (2026-10-27) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [Motion Canvas](https://github.com/motion-canvas/motion-canvas) | A | MIT | N/A/N/A | 2026-07-02 | v3.17.2 (2024-12-14) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [Revideo](https://github.com/midrender/revideo) | B | MIT | N/A/N/A | 2026-07-15 | NONE FOUND / UNVERIFIED | C | H | 0 | Reference/duplicate; do not install or copy. |
| [lottie-web](https://github.com/airbnb/lottie-web) | A | MIT | N/A/N/A | 2024-11-19 | NONE FOUND / UNVERIFIED | C | H | 0 | Evaluate only in stated milestone after approval. |
| [PixiJS](https://github.com/pixijs/pixijs) | A | MIT | N/A/N/A | 2026-11-20 | v8.23.0 (2026-11-11) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [three.js](https://github.com/mrdoob/three.js) | B | MIT | N/A/N/A | 2026-11-22 | r187 (2026-10-30) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [Editly](https://github.com/mifi/editly) | B | MIT | N/A/N/A | 2025-02-20 | v0.15.0-rc.1 (2025-01-19) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [MLT](https://github.com/mltframework/mlt) | B | LGPL-2.1 | N/A/N/A | 2026-11-21 | v7.42.0 (2026-10-03) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [OpenTimelineIO](https://github.com/AcademySoftwareFoundation/OpenTimelineIO) | A | Apache-2.0 | N/A/N/A | 2026-11-20 | NONE FOUND / UNVERIFIED | C | H | 0 | Evaluate only in stated milestone after approval. |
| [MoviePy](https://github.com/Zulko/moviepy) | B | MIT | N/A/N/A | 2026-08-26 | v2.2.1 (2025-05-21) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [Remotion](https://github.com/remotion-dev/remotion) | C | Custom Remotion License—commercial/company restrictions; not OSI open source | N/A/N/A | 2026-11-20 | v4.0.545 (2026-11-18) | N | H | 0 | Custom licence conflicts with unrestricted local integration; blocked. |
| [GSAP](https://github.com/greensock/GSAP) | C | Custom terms / no repository LICENSE endpoint—UNVERIFIED | N/A/N/A | 2026-11-04 | NONE FOUND / UNVERIFIED | N | H | 0 | Custom/unverified terms; use CSS/Web Animations/Motion Canvas alternatives. |
| [Blender](https://github.com/blender/blender) | B | GPL-3.0-or-later (COPYING) | N/A/N/A | 2026-11-22 | NONE FOUND / UNVERIFIED | N | H | 0 | Reference/duplicate; do not install or copy. |

### Timeline/editor UI, subtitles and script editing
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [React Timeline Editor](https://github.com/xzdarcy/react-timeline-editor) | A | MIT | N/A/N/A | 2026-01-25 | v1.0.0 (2026-01-25) | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [OpenCut](https://github.com/OpenCut-app/OpenCut) | B | MIT | N/A/N/A | 2026-09-24 | v0.3.0 (2026-04-15) | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [DesignCombo React Video Editor](https://github.com/openvideodev/react-video-editor) | C | Custom/no SPDX—UNVERIFIED pending legal review | N/A/N/A | 2026-06-30 | NONE FOUND / UNVERIFIED | Y | M | 0 | Blocked by current gate. |
| [Konva](https://github.com/konvajs/konva) | A | MIT text (LICENSE) | N/A/N/A | 2026-11-20 | 10.10.0 (2026-11-20) | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [Fabric.js](https://github.com/fabricjs/fabric.js) | B | MIT | N/A/N/A | 2026-11-10 | v740 (2026-05-18) | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [Diffusion Studio Core](https://github.com/diffusionstudio/core) | B | MPL-2.0 | N/A/N/A | 2025-11-18 | v1.1.1 (2024-10-29) | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [Omniclip](https://github.com/omni-media/omniclip) | B | MIT | N/A/N/A | 2025-08-07 | NONE FOUND / UNVERIFIED | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [pysubs2](https://github.com/tkarabela/pysubs2) | A | MIT | N/A/N/A | 2026-10-30 | NONE FOUND / UNVERIFIED | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [libass](https://github.com/libass/libass) | A | ISC | N/A/N/A | 2026-11-21 | 0.17.5 (2026-06-24) | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [srt](https://github.com/cdown/srt) | B | MIT | N/A/N/A | 2023-11-02 | NONE FOUND / UNVERIFIED | Y | M | 0 | Reference/duplicate; do not install or copy. |
| [jsdiff](https://github.com/kpdecker/jsdiff) | A | BSD-3-Clause | N/A/N/A | 2026-11-18 | NONE FOUND / UNVERIFIED | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [diff-match-patch](https://github.com/google/diff-match-patch) | C | Apache-2.0 | N/A/N/A | 2019-07-25 | NONE FOUND / UNVERIFIED | N | M | 0 | Archived; jsdiff is active and sufficient. |
| [Tiptap](https://github.com/ueberdosis/tiptap) | A | MIT | N/A/N/A | 2026-11-22 | v3.35.0 (2026-11-20) | Y | M | 0 | Evaluate only in stated milestone after approval. |
| [CodeMirror](https://github.com/codemirror/dev) | C | MIT text (LICENSE); repository archived | N/A/N/A | 2026-04-15 | NONE FOUND / UNVERIFIED | N | M | 0 | Archived monorepo; Tiptap chosen for script editing evaluation. |

### Image and visual AI
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [FastSD CPU](https://github.com/rupeshs/fastsdcpu) | A | MIT | U/N/A | 2026-11-06 | NONE FOUND / UNVERIFIED | C | H | 0 | Evaluate only in stated milestone after approval. |
| [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp) | A | MIT | U/N/A | 2026-11-22 | master-1111-6874e49 (2026-11-22) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [Optimum Intel](https://github.com/huggingface/optimum-intel) | B | Apache-2.0 | U/N/A | 2026-11-21 | v2.2.0 (2026-09-17) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) | A | BSD-3-Clause | U/N/A | 2024-04-02 | v0.3.0 (2022-09-20) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [rembg](https://github.com/danielgatis/rembg) | A | MIT | U/N/A | 2026-11-06 | v2.0.87 (2026-11-06) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [Practical-RIFE](https://github.com/hzwer/Practical-RIFE) | B | MIT | U/N/A | 2026-08-27 | NONE FOUND / UNVERIFIED | C | H | 0 | Reference/duplicate; do not install or copy. |
| [rife-ncnn-vulkan](https://github.com/nihui/rife-ncnn-vulkan) | B | MIT | U/N/A | 2022-10-23 | 20221029 (2022-10-29) | C | H | 0 | Reference/duplicate; do not install or copy. |
| [DeOldify](https://github.com/jantic/DeOldify) | C | MIT | U/N/A | 2024-10-19 | NONE FOUND / UNVERIFIED | N | H | 0 | Blocked by current gate. |
| [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2) | A | Apache-2.0 | U/N/A | 2026-03-24 | NONE FOUND / UNVERIFIED | C | H | 0 | Evaluate only in stated milestone after approval. |
| [MiDaS](https://github.com/isl-org/MiDaS) | B | MIT | U/N/A | 2024-08-23 | NONE FOUND / UNVERIFIED | C | H | 0 | Reference/duplicate; do not install or copy. |
| [3D Ken Burns](https://github.com/sniklaus/3d-ken-burns) | C | Non-commercial terms indicated in LICENSE—BLOCKED | U/N/A | 2026-11-19 | NONE FOUND / UNVERIFIED | N | H | 0 | Non-commercial licence; blocked. |
| [OpenCLIP](https://github.com/mlfoundations/open_clip) | A | MIT code; weights separate | U/N/A | 2026-11-21 | v4.2.2 (2026-11-10) | C | H | 0 | Evaluate only in stated milestone after approval. |
| [PySceneDetect](https://github.com/Breakthrough/PySceneDetect) | A | BSD-3-Clause | U/N/A | 2026-11-22 | v0.7.3 (2026-11-08) | C | H | 0 | Evaluate only in stated milestone after approval. |

### Maps and data visualisation
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) | A | BSD-3-Clause text (LICENSE.txt) | N/A/U | 2026-11-21 | v6.19.0 (2026-11-17) | Y | H | 0 | Evaluate only in stated milestone after approval. |
| [Leaflet](https://github.com/Leaflet/Leaflet) | B | BSD-2-Clause | N/A/U | 2026-11-22 | v1.9.4 (2023-05-18) | Y | H | 0 | Reference/duplicate; do not install or copy. |
| [deck.gl](https://github.com/visgl/deck.gl) | B | MIT | N/A/U | 2026-11-22 | v9.3.12 (2026-10-30) | Y | H | 0 | Reference/duplicate; do not install or copy. |
| [D3](https://github.com/d3/d3) | A | ISC | N/A/U | 2026-11-03 | v7.9.2 (2026-11-03) | Y | H | 0 | Evaluate only in stated milestone after approval. |
| [ECharts](https://github.com/apache/echarts) | B | Apache-2.0 | N/A/U | 2026-10-04 | 6.1.0 (2026-05-19) | Y | H | 0 | Reference/duplicate; do not install or copy. |
| [Recharts](https://github.com/recharts/recharts) | B | MIT | N/A/U | 2026-11-22 | v3.11.0 (2026-11-17) | Y | H | 0 | Reference/duplicate; do not install or copy. |
| [Plotly.js](https://github.com/plotly/plotly.js) | B | MIT | N/A/U | 2026-11-20 | v4.3.0 (2026-11-10) | Y | H | 0 | Reference/duplicate; do not install or copy. |
| [Vega-Lite](https://github.com/vega/vega-lite) | B | BSD-3-Clause | N/A/U | 2026-11-13 | v6.5.0 (2026-10-08) | Y | H | 0 | Reference/duplicate; do not install or copy. |
| [Matplotlib](https://github.com/matplotlib/matplotlib) | B | Matplotlib/PSF-style license from LICENSE and PyPI | N/A/U | 2026-11-21 | v3.11.2 (2026-09-11) | Y | H | 0 | Reference/duplicate; do not install or copy. |
| [PMTiles](https://github.com/protomaps/PMTiles) | A | BSD-3-Clause code; spec CC0; samples separately licensed | N/A/U | 2026-09-16 | NONE FOUND / UNVERIFIED | Y | H | 0 | Evaluate only in stated milestone after approval. |
| [GeoPandas](https://github.com/geopandas/geopandas) | A | BSD-3-Clause | N/A/U | 2026-11-19 | v1.2.0 (2026-09-28) | Y | H | 0 | Evaluate only in stated milestone after approval. |
| [Shapely](https://github.com/shapely/shapely) | A | BSD-3-Clause | N/A/U | 2026-11-06 | 2.2.0 (2026-10-07) | Y | H | 2 | Evaluate only in stated milestone after approval. |
| [pyproj](https://github.com/pyproj4/pyproj) | A | MIT | N/A/U | 2026-11-16 | 3.8.0 (2026-09-05) | Y | H | 0 | Evaluate only in stated milestone after approval. |
| [Historical Basemaps](https://github.com/aourednik/historical-basemaps) | B | GPL-3.0 | N/A/U | 2026-11-02 | NONE FOUND / UNVERIFIED | Y | H | 0 | GPL data and approximate borders; reference only pending dataset/legal/accuracy decision. |
| [OpenHistoricalMap Embed](https://github.com/OpenHistoricalMap/openhistoricalmap-embed) | B | CC0-1.0 | N/A/U | 2026-11-10 | NONE FOUND / UNVERIFIED | Y | H | 0 | Code/data/API terms differ; dataset use remains UNVERIFIED. |

### Quality assurance
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [pymediainfo](https://github.com/sbraz/pymediainfo) | B | MIT text (LICENSE) | N/A/N/A | 2026-11-04 | v7.0.1 (2025-02-12) | Y | L | 0 | Reference/duplicate; do not install or copy. |

### Backup and recovery
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [restic](https://github.com/restic/restic) | A | BSD-2-Clause | N/A/N/A | 2026-11-22 | v0.20.0 (2026-11-19) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Kopia](https://github.com/kopia/kopia) | B | Apache-2.0 | N/A/N/A | 2026-11-20 | v0.23.1 (2026-06-16) | Y | L | 1 | Reference/duplicate; do not install or copy. |
| [rclone](https://github.com/rclone/rclone) | B | MIT | N/A/N/A | 2026-11-22 | v1.76.0 (2026-11-06) | Y | L | 2 | Reference/duplicate; do not install or copy. |

### Repository vetting
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [OpenSSF Scorecard](https://github.com/ossf/scorecard) | A | Apache-2.0 | N/A/N/A | 2026-11-19 | v5.7.0 (2026-11-19) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [pip-audit](https://github.com/pypa/pip-audit) | A | Apache-2.0 | N/A/N/A | 2026-11-19 | v2.10.1 (2026-06-10) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [OSV-Scanner](https://github.com/google/osv-scanner) | B | Apache-2.0 | N/A/N/A | 2026-11-20 | v2.7.1 (2026-11-09) | Y | L | 0 | Reference/duplicate; do not install or copy. |
| [pip-licenses](https://github.com/raimon49/pip-licenses) | A | MIT | N/A/N/A | 2026-11-19 | v-5.5.5 (2026-03-28) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [license-checker](https://github.com/davglass/license-checker) | C | BSD-3-Clause text; repository inactive | N/A/N/A | 2019-01-10 | NONE FOUND / UNVERIFIED | Y | L | 0 | Inactive since 2019; use package-manager data and maintained audit tooling. |
| [ScanCode Toolkit](https://github.com/aboutcode-org/scancode-toolkit) | B | Apache-2.0 code; bundled license data has mixed terms | N/A/N/A | 2026-11-02 | v32.5.0 (2026-01-15) | Y | L | 2 | Reference/duplicate; do not install or copy. |
| [Syft](https://github.com/anchore/syft) | A | Apache-2.0 | N/A/N/A | 2026-11-20 | v1.57.2 (2026-11-16) | Y | L | 0 | Evaluate only in stated milestone after approval. |
| [Trivy](https://github.com/aquasecurity/trivy) | B | Apache-2.0 | N/A/N/A | 2026-11-20 | v0.76.2 (2026-11-05) | Y | L | 0 | Reference/duplicate; do not install or copy. |

### Additional repositories discovered during live search
| Candidate | Class | Code licence | W/D | Last commit | Latest release | 8GB | Complexity | Sec | Decision note |
|---|:---:|---|:---:|---|---|:---:|:---:|:---:|---|
| [Short Video Maker](https://github.com/gyoridavid/short-video-maker) | B | MIT | U/U | 2025-06-21 | NONE FOUND / UNVERIFIED | R | M | 0 | Reference/duplicate; do not install or copy. |
| [Video Talkcraft](https://github.com/Vincentwei1021/video-talkcraft) | C | PolyForm Noncommercial-1.0.0—BLOCKED for monetized use | U/U | 2026-11-21 | gallery-media (2026-08-28) | N | M | 0 | Discovered live repository is explicitly non-commercial; blocked. |
| [Rendiv](https://github.com/thecodacus/rendiv) | B | Apache-2.0 | U/U | 2026-09-15 | NONE FOUND / UNVERIFIED | R | M | 0 | Reference/duplicate; do not install or copy. |

## Repositories with explicit security-label hits

The live query found exact-label hits for llama.cpp (1), eSpeak NG (5), Shapely (2), Kopia (1), rclone (2), and ScanCode Toolkit (2). These are triage signals, not proof of an exploitable vulnerability. Every A candidate still requires lockfile-based audit and review before integration.

## Ambiguous or unresolved names

- **`forge`**: no canonical owner/name was supplied, and live search produced many unrelated or newly created repositories. Classification: **C / UNVERIFIED** until the exact URL is provided.
- **`AI Video Studio / ai-video-pipeline`**: not unique. The register records `nguyentatkiem/ai-video-studio` as an ambiguous match and `myccarl/ai-shortVideo-pipeline` as a close pipeline match; both are B only.
- **`motion-skills`**: `iart-ai/motion-skills` is the most plausible exact-name match and is B only.
- **`Claude-Code-Video-Toolkit`**: both `digitalsamba/...` and `wilwaldon/...` were found and recorded. Neither is integrated.
- **ReportLab**: the live GitHub record is a mirror, not the canonical upstream. Package licence was cross-checked on PyPI; use the packaged release, not GitHub source.

## Model and voice licence register (separate from code)

| Candidate | Weight/voice result | Decision |
|---|---|---|
| Qwen, Llama 3.2, Phi, Gemma, Mistral quantisations | Exact model/revision/model-card licence **UNVERIFIED** in this restricted evaluation | No model recommendation/download yet. Prefer only a verified commercial-use 1–3B Q4 model. |
| Kokoro / kokoro-onnx voices | **UNVERIFIED** per weight and voice | Bake-off candidate only after verification. |
| sherpa-onnx TTS/STT models | **UNVERIFIED** per model | Runtime A; no model cleared. |
| Piper voices | **UNVERIFIED** per voice; runtime GPL CLI | No voice cleared; explicit GPL process decision required. |
| KittenTTS, MeloTTS, StyleTTS2, Parler, Chatterbox, Bark | **UNVERIFIED** model terms | No weights cleared; heavy options are B/C. |
| Whisper/faster-whisper/whisper.cpp models | **UNVERIFIED** as separate weight artifacts | Runtime evaluation may proceed only after exact model record. |
| OPUS-MT/Argos packages | **UNVERIFIED** per language-pair model | No translation model cleared. |
| NLLB | Non-commercial concern from candidate policy; live terms **UNVERIFIED** | Conservatively blocked. |
| XTTS-v2, F5-TTS, MusicGen/AudioCraft | Non-commercial concern; live terms **UNVERIFIED** | Blocked. |
| Stable Diffusion/FLUX/image weights | Exact checkpoint terms **UNVERIFIED**; FLUX.1-dev explicitly treated as blocked by policy | No checkpoint cleared. |
| Depth Anything/OpenCLIP/Real-ESRGAN/RIFE/rembg models | Code may be A/B; every weight remains **UNVERIFIED** until its exact card/hash is recorded | No weight cleared. |
| Generative video models | Licence aside, infeasible on the target | Do not install. |

## Data/API/media source register

The current environment could not browse the official non-GitHub terms pages, so no site-wide memory claim is treated as verified. For **Wikipedia/Wikimedia Commons/Wikidata, Internet Archive, Library of Congress, NARA, Openverse, Europeana, DPLA, Smithsonian, The Met, Rijksmuseum, NASA, Pexels, Pixabay, GeoNames and Pleiades**, API terms and data licences are **UNVERIFIED** here. M2 must record both source/API terms and **file-level** rights evidence; aggregation-site labels alone are insufficient. Pexels/Pixabay keys are optional and user-provided. Internet Archive's Python client is AGPL and blocked for embedding; direct authorised HTTP is preferred.

For historical geography, Natural Earth, OpenHistoricalMap, CShapes, Pleiades, GeoNames and `historical-basemaps` all remain **UNVERIFIED per dataset/version/period**. `historical-basemaps` repository code/data shows GPL-3.0 and approximate borders; it is B only. No border may be generated by an LLM or drawn without a cited dataset and uncertainty annotation.

## GPL/AGPL/LGPL decision flags

- SearXNG and LibreTranslate: AGPL; at most separate services, but B by default.
- OpenMontage and ArcReel: AGPL full applications; B reference only.
- PyMuPDF and Internet Archive Python client: AGPL embedding blocked.
- Piper successor/eSpeak NG/audiowaveform: GPL; separate CLI/process only after explicit approval.
- MLT/libass/Peaks.js: LGPL/ISC combinations require component-specific review; prefer CLI or permissive alternatives.
- Blender: GPL external CLI only and too heavy for the default target.
- Pedalboard: GPL embedding blocked; use FFmpeg filters.

## Paper-evaluation conclusion

The minimal architecture is viable, but only M1's small local stack should be considered now. Every A item remains conditional on user approval and an isolated Windows benchmark. There is no basis yet to install a model, voice, data pack, full video pipeline, cloud wrapper or generative-video system.
