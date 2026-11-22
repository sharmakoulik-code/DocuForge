# DocuForge

DocuForge is a private, local-first documentary production studio for Windows 11. It runs in Chrome at `http://127.0.0.1:3000`; project files remain plain JSON/Markdown/media on drives selected by the user.

## Current scope: Milestone 1 Foundation

Implemented and real:

- React/Vite/TypeScript cinematic browser interface
- Python/FastAPI local API
- SQLite index, settings and job state with WAL and Alembic migrations
- Huey SQLite persistent queue with one low-memory worker
- topic-only documentary draft creation and local project library
- atomic project writes, revision conflict detection and index rebuild
- hardware/runtime/model-presence detection without loading models
- external-volume selection and marker-based disconnect protection
- live CPU, RAM, process and disk telemetry using server-sent events
- Windows one-click supervisor for API/worker health, logs, restart and shutdown
- strict local network, body-size and filesystem safety gates

Not implemented in M1: AI planning, research, script generation, storyboards, TTS, visual production, timeline editing, rendering, publishing or model downloads. The interface labels these later milestones as unavailable rather than simulating them.

## Windows setup

Requirements:

- Windows 11
- 64-bit Python 3.11 or newer
- Node.js 22.12 or newer (Node 24 LTS is supported)
- Google Chrome
- FFmpeg/ffprobe are detected but not required for M1 project management

From PowerShell in the repository:

```powershell
.\scripts\setup-docuforge.ps1
```

The setup script installs only the approved pinned M1 packages, skips Playwright's browser download, and builds the frontend. It does not install models or external services.

## One-click launch

Double-click:

```text
scripts\start-docuforge.cmd
```

The launcher:

1. checks the local virtual environment and built UI;
2. refuses to take a port used by another process;
3. starts one FastAPI process and one Huey worker;
4. opens Chrome at `http://127.0.0.1:3000`;
5. writes local service logs and supports safe restart/shutdown from Control Centre.

The default bind is `127.0.0.1`. DocuForge refuses a wider bind unless `DOCUFORGE_ALLOW_PUBLIC_BIND=1` is explicitly set, and the UI then shows a warning.

## Development

```bash
# Python
python -m venv .venv
# Windows: .venv\Scripts\python -m pip install -r backend\requirements.lock
# Linux/macOS:
.venv/bin/python -m pip install -r backend/requirements.lock

# Frontend (does not download a Playwright browser)
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
npm run build

# Backend tests and quality
.venv/bin/pytest
.venv/bin/ruff format --check backend tests/backend
.venv/bin/ruff check backend tests/backend

# Frontend tests and build
npm run test
npm run build
```

Run the API directly for development:

```bash
PYTHONPATH=backend DOCUFORGE_DATA_ROOT=.runtime/dev/internal \
DOCUFORGE_PROJECTS_ROOT=.runtime/dev/external/projects \
.venv/bin/python -m uvicorn docuforge.main:app --host 127.0.0.1 --port 3000
```

Direct API startup is intentionally shown as “supervisor not running” in Control Centre; restart/stop controls are available only through the one-click supervisor.

Playwright is configured to use the user's existing Chrome installation:

```bash
npm run test:e2e
```

## Storage and data safety

- Internal control data defaults to `%LOCALAPPDATA%\DocuForge`.
- SQLite stays internal and uses WAL, full sync, short transactions and online backup support.
- The selected external root contains `.docuforge-volume.json` and `projects/`.
- Volume identity is checked before returning a configured project root. A changed or missing marker makes storage offline.
- New project folders use server-generated UUIDs; client topics never become paths.
- Project JSON is validated in full, written to a sibling temporary file, flushed, and atomically replaced.
- Existing `projects/first-documentary` is indexed as a read-only legacy project and is never silently migrated.
- Deleting SQLite does not delete project content; startup rebuilds the index from manifests.

## Security defaults

- loopback bind and trusted local Host values only;
- same-origin mutation check plus per-launch anti-CSRF token;
- strict JSON schemas and a 1 MiB M1 request limit;
- rejection of traversal, absolute/UNC/drive paths, alternate data streams, Windows reserved names, control characters, symlinks and junction escapes;
- no provider credentials in M1 and no secrets in logs;
- no automatic downloads or paid/cloud services.

## Architecture and evaluation records

- [`docs/planning/milestone-1-foundation-plan.md`](docs/planning/milestone-1-foundation-plan.md)
- [`docs/planning/repository-evaluation-report.md`](docs/planning/repository-evaluation-report.md)
- [`docs/planning/dependency-attribution-register.csv`](docs/planning/dependency-attribution-register.csv)
- [`docs/M1-DEPENDENCY-INVENTORY.csv`](docs/M1-DEPENDENCY-INVENTORY.csv)
- [`docs/M1-ACCEPTANCE.md`](docs/M1-ACCEPTANCE.md)

Project files are the source of truth. SQLite is only an index, queue/control store and settings database.
