# Milestone 1 acceptance record

**Run date:** 2026-11-22  
**Branch:** `arena/3e79c7b2-docuforge`  
**Base:** `2e0f851e37c3da5ccdd8f1ec1c397f2385ea73a1`  
**Scope:** approved M1 Core Platform only

## Decision

**Sandbox acceptance: PASS WITH TARGET-MACHINE ITEMS DEFERRED.** The automated backend/frontend suites, production build, live API/supervisor/worker smoke tests, dependency checks, and source-file integrity checks passed. Full M1 acceptance is **not claimed** because this Linux sandbox has no Chrome/Chromium and is not the target Windows 11/Intel/external-SSD machine. The required real-Chrome UI workflows/screenshots, Windows launcher run, and physical SSD unplug/reconnect test remain deferred rather than simulated or reported as passing.

No M2+ model, voice, media, cloud provider, research/writing/render dependency, or external repository code was integrated.

## Environment actually measured

This is a sandbox measurement, not a claim about the user's target PC.

- Linux `6.1.158+`, x86-64
- exposed CPU: Intel Xeon, 1 physical core / 2 logical threads
- exposed physical memory: 4,131,278,848 bytes
- Python 3.11.2; Node 22.22.3; npm 10.9.8
- no GPU exposed
- no Chrome/Chromium executable found
- no FFmpeg/ffprobe executable found
- no Ollama or llama.cpp runtime found

## Automated verification

| Check | Exact command | Result |
|---|---|---|
| Python formatting | `.venv/bin/ruff format --check backend tests/backend` | PASS |
| Python lint | `.venv/bin/ruff check backend tests/backend` | PASS |
| Backend/API tests | `.venv/bin/pytest` | PASS — **34 passed**, one upstream FastAPI/Starlette TestClient deprecation warning |
| TypeScript + production build + frontend tests | `npm run check` | PASS — Vite build and **3 Vitest tests** passed |
| Python dependency consistency | `.venv/bin/python -m pip check` | PASS — no broken requirements |
| npm vulnerability audit | `npm audit --audit-level=high` | PASS — zero vulnerabilities reported |
| System-Chrome E2E | `npm run test:e2e` | **BLOCKED** — 2 workflows could not launch because `/opt/google/chrome/chrome` does not exist; no browser was downloaded |

The backend suite covers Host/Origin/CSRF enforcement, strict and size-limited JSON, hostile Windows/path aliases, symlink escape, atomic writes, non-ASCII and CRLF round trips, revision conflicts, source-of-truth index rebuild, legacy-project immutability, durable Huey recovery, marker/volume identity, hardware reporting, port detection, settings conflicts, real task enqueue behavior, and Alembic logger preservation.

The one warning is:

```text
StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated;
install `httpx2` instead.
```

`httpx2` was not added because it was not part of the approved M1 dependency set. The tests pass despite this upstream warning.

## Live-service smoke evidence

A built frontend was served by FastAPI under the real supervisor with one Huey worker and isolated runtime roots. Arena preview required an explicit temporary `0.0.0.0` override; this does **not** change the production default of `127.0.0.1`.

| Operation | Result |
|---|---|
| Alembic upgrade on an empty data root | PASS; revision `0001_milestone_one` applied |
| `GET /api/v1/health` | PASS; HTTP 200, database online |
| built SPA root/assets | PASS; HTTP 200 |
| persistent worker hardware scan | PASS; queued, executed by Huey, completed 7/7 in 1.591 s |
| real resources endpoint | PASS; process RSS, CPU, memory, and disk values returned |
| resource SSE | PASS; repeated measured samples received at `/api/v1/system/resources/events` |
| service logs endpoint | PASS; real worker logs returned |
| worker restart | PASS; PID changed from 3005 to 3293 and service returned to running |
| API restart | PASS; PID changed from 3006 to 3384 and health returned HTTP 200 |
| topic-only 2-minute draft | PASS through the real API; UTF-8 project manifest atomically appeared under the isolated managed project root and was retrieved after a full stop/start |
| occupied DocuForge port | PASS; second default-local supervisor reported the existing instance, opened/fell back to it, killed nothing, selected no alternate port, and exited 0 |
| stop-all | PASS; supervisor, API, and worker stopped; final service record marked all stopped; supervisor exited 0 |

A cold isolated supervisor launch reached a healthy API in **1.790 seconds**. At that point measured RSS was:

| Process | RSS |
|---|---:|
| supervisor | 60,346,368 bytes |
| API | 82,485,248 bytes |
| worker | 68,599,808 bytes |
| **total** | **211,431,424 bytes (201.64 MiB)** |

A separate production `stop_all` command was used for the successful graceful-shutdown acceptance check.

## Footprint

Measured with `du -sb` after the final verification run:

| Item | Bytes |
|---|---:|
| Python `.venv` | 114,475,306 |
| npm `node_modules` | 164,843,425 |
| production frontend `dist` | 2,840,213 |
| isolated live-test internal data after final shutdown | 137,759 |
| isolated live-test external data | 703 |

The production bundle contains 469,942 bytes of JavaScript (148.15 kB gzip), 35,674 bytes of CSS (8.63 kB gzip), a 515-byte HTML entry, and a 2,333,894-byte source map. Generated environments, bundles, test output, and runtime roots are ignored by Git.

## Dependency and licence record

- [`planning/dependency-attribution-register.csv`](planning/dependency-attribution-register.csv) has all 188 evaluated candidates and now records approved M1 versions, approval date, aggregate measured footprint, and audit result for the selected M1 rows.
- [`M1-DEPENDENCY-INVENTORY.csv`](M1-DEPENDENCY-INVENTORY.csv) records the exact resolved graph: **31 Python lock rows** (including the evaluated Windows-only `colorama==0.4.6` pytest dependency) and **174 npm lock locators**.
- Every resolved row has a licence value from installed distribution metadata, downloaded wheel metadata, or `package-lock.json`; no row is blank or labelled `NOT DECLARED`.
- These are package-publisher metadata and repository-evaluation records, not legal advice. They do not clear future model weights, voices, datasets, fonts, media, or remote services.
- FFmpeg remains an approved external-CLI boundary only. No FFmpeg binary was installed in this sandbox, and the exact target Windows build/licence configuration remains unverified.
- `npm audit` reported zero vulnerabilities. A Python vulnerability scanner was not installed because none was in the approved M1 set; `pip check` passed, but it is a consistency check rather than a vulnerability audit.

## Existing-work integrity

`git diff --exit-code 2e0f851e37c3da5ccdd8f1ec1c397f2385ea73a1 -- projects/first-documentary` returned 0. The 13 tracked files in `projects/first-documentary` are byte-for-byte unchanged from the base commit. The application indexes this project as legacy/read-only and does not migrate it.

## Defects found and fixed during acceptance

1. Lucide 1.77.0 did not export `Github`; switched to the available `GitFork` icon. The production build is the regression check.
2. Python-mode Pydantic revalidation rejected serialized timestamps and hid newly created projects; changed to JSON-mode validation and added project tests.
3. FastAPI's current validation error object rejected Pydantic-only keyword arguments; normalized details explicitly and added malformed-request coverage.
4. Selected storage accepted a marker without also matching the expected volume identity; now both IDs must match, with regression coverage.
5. The hardware route called a nonexistent Huey `TaskWrapper.delay`; changed it to the wrapper's callable enqueue API and added endpoint coverage. A real worker task then completed successfully.
6. Alembic `fileConfig` disabled already-created supervisor loggers; preserved existing loggers and added a migration regression test.

## Acceptance matrix

| Criterion | Status | Evidence / remaining work |
|---|---|---|
| One-click local Chrome UI, no public default bind | **DEFERRED ON TARGET** | Default is `127.0.0.1`; scripts/supervisor exist and local port behavior passed. Must run the CMD/PowerShell launcher with installed Chrome on Windows 11. |
| Dashboard/services/logs/resources/progress use real data | **PASS API / DEFERRED UI** | Live endpoints, SSE, logs, restarts, and Huey progress passed. Real-Chrome visual confirmation remains. |
| Topic-only draft persists after restart | **PASS API / DEFERRED UI** | Real API wrote the manifest; persistence and rebuild are tested. Chrome form workflow remains blocked. |
| Existing first documentary remains unchanged | **PASS** | Git tree diff returned 0 for all 13 files. |
| Database can be rebuilt without project loss | **PASS** | Automated source-of-truth rebuild test passes. |
| Concurrent edits cannot silently overwrite | **PASS** | Revision-conflict regression test passes with HTTP 409. |
| External-drive loss cannot redirect writes | **PASS SIMULATION / DEFERRED PHYSICAL** | Marker plus volume-ID checks and simulated-loss tests pass. Real unplug/reconnect is required on the target SSD. |
| All tests pass and screenshots attached | **BLOCKED** | 34 backend and 3 frontend tests pass; two authored Playwright workflows cannot launch without system Chrome. No fabricated screenshots are attached. |
| Dependency/attribution record complete for M1 | **PASS FOR SANDBOX** | Exact lock inventory, approval/version records, footprint, npm audit, and pip consistency results recorded. Windows installed footprint remains to measure. |
| No M2+ feature/dependency present | **PASS** | Future studios are disabled/milestone-labelled; the resolved inventory contains only approved M1 platform/tooling dependencies. |

## Target Windows 11 checklist before unconditional M1 acceptance

1. Run `scripts\setup-docuforge.ps1`, then `scripts\start-docuforge.cmd` from a normal user account.
2. Confirm the supervisor binds only `127.0.0.1:3000`, detects the actual Chrome install, and opens the app.
3. Run `npm run test:e2e` against system Chrome and retain the screenshots from `artifacts/playwright/`.
4. Create and edit the 2–3 minute test draft in Chrome; restart API/worker/the whole app and confirm persistence.
5. Select the real external SSD, physically unplug it during the safe test, confirm writes block, reconnect it, and confirm identity recovery without redirection.
6. Record actual i3 model/generation, Intel GPU/driver, RAM, drive identity/free space, FFmpeg build/configuration if installed, cold-start time, peak RAM, and Windows installed footprint.
7. Re-run Ruff, pytest, `npm run check`, `npm audit`, and `pip check` on that machine.
