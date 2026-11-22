from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.middleware.trustedhost import TrustedHostMiddleware

from . import __version__
from .api.middleware import RequestSafetyMiddleware
from .config import AppSettings
from .database import Database, ServiceCommand
from .files import read_json_file
from .migrations import upgrade_database
from .schemas import (
    ControlCommandRequest,
    ProjectCreate,
    ProjectPatch,
    StorageSelectRequest,
    UserSettingsPatch,
)
from .services.jobs import JobNotFoundError, JobService
from .services.projects import (
    ProjectNotFoundError,
    ProjectReadOnlyError,
    ProjectRevisionConflictError,
    ProjectService,
    StorageNotConfiguredError,
)
from .services.settings import RevisionConflictError, SettingsService
from .services.system import SystemService


@dataclass(slots=True)
class AppContext:
    settings: AppSettings
    database: Database
    settings_service: SettingsService
    projects: ProjectService
    jobs: JobService
    system: SystemService


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def _service_status(settings: AppSettings) -> dict[str, Any]:
    status_path = settings.runtime_dir / "services.json"
    state: dict[str, Any] = {
        "supervisor": {"status": "not_running", "pid": None},
        "api": {"status": "running", "pid": os.getpid()},
        "worker": {"status": "unknown", "pid": None},
        "public_bind_warning": settings.allow_public_bind,
    }
    if status_path.exists():
        try:
            stored, _ = read_json_file(status_path, max_bytes=128_000)
            state.update(stored)
            state["api"] = {"status": "running", "pid": os.getpid()}
        except (OSError, ValueError):
            state["supervisor"] = {"status": "status_unreadable", "pid": None}
    return state


def create_app(settings: AppSettings | None = None) -> FastAPI:
    settings = settings or AppSettings.from_environment()
    settings.ensure_directories()
    database = Database(settings)
    settings_service = SettingsService(database, settings)
    context = AppContext(
        settings=settings,
        database=database,
        settings_service=settings_service,
        projects=ProjectService(database, settings_service),
        jobs=JobService(database),
        system=SystemService(settings_service),
    )

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        upgrade_database(settings)
        context.settings_service.get_user_settings()
        context.projects.scan()
        yield

    app = FastAPI(
        title="DocuForge Local API",
        version=__version__,
        docs_url=None,
        redoc_url=None,
        openapi_url="/api/v1/openapi.json" if settings.test_mode else None,
        lifespan=lifespan,
    )
    app.state.context = context
    app.add_middleware(
        RequestSafetyMiddleware,
        csrf_token=settings.csrf_token,
        max_body_bytes=settings.max_json_body_bytes,
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(settings.allowed_hosts))

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request validation failed",
                    "details": [
                        {
                            "type": item.get("type"),
                            "location": list(item.get("loc", ())),
                            "message": item.get("msg"),
                        }
                        for item in exc.errors()
                    ],
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def http_error(_request: Request, exc: HTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "code" in exc.detail:
            detail = exc.detail
        else:
            detail = {"code": "HTTP_ERROR", "message": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content={"error": detail})

    @app.get("/api/v1/health")
    def health() -> dict:
        with database.session() as session:
            session.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "version": __version__,
            "database": "online",
            "time": datetime.now(UTC).isoformat(),
        }

    @app.get("/api/v1/meta")
    def meta() -> dict:
        return {
            "app": "DocuForge",
            "version": __version__,
            "milestone": 1,
            "csrf_token": settings.csrf_token,
            "local_url": f"http://127.0.0.1:{settings.port}",
            "public_bind_warning": settings.allow_public_bind,
            "features": {
                "projects": True,
                "hardware_detection": True,
                "storage_monitoring": True,
                "resource_monitor": True,
                "ai_production_plan": False,
            },
        }

    @app.get("/api/v1/projects")
    def list_projects() -> dict:
        return {"projects": [item.model_dump(mode="json") for item in context.projects.scan()]}

    @app.post("/api/v1/projects", status_code=201)
    def create_project(payload: ProjectCreate, response: Response) -> dict:
        try:
            project = context.projects.create(payload)
        except StorageNotConfiguredError as exc:
            raise _error(409, "STORAGE_NOT_CONFIGURED", str(exc)) from exc
        except (OSError, ValueError) as exc:
            raise _error(400, "PROJECT_CREATE_FAILED", str(exc)) from exc
        response.headers["ETag"] = f'"{project.revision}"'
        return project.model_dump(mode="json")

    @app.get("/api/v1/projects/{project_id}")
    def get_project(project_id: str, response: Response) -> dict:
        try:
            project = context.projects.get(project_id)
        except ProjectNotFoundError as exc:
            raise _error(404, "PROJECT_NOT_FOUND", "Project does not exist") from exc
        response.headers["ETag"] = f'"{project.revision}"'
        return project.model_dump(mode="json")

    @app.patch("/api/v1/projects/{project_id}")
    def patch_project(project_id: str, payload: ProjectPatch, response: Response) -> dict:
        try:
            project = context.projects.patch(project_id, payload)
        except ProjectNotFoundError as exc:
            raise _error(404, "PROJECT_NOT_FOUND", "Project does not exist") from exc
        except ProjectReadOnlyError as exc:
            raise _error(409, "PROJECT_READ_ONLY", str(exc)) from exc
        except ProjectRevisionConflictError as exc:
            raise _error(409, "REVISION_CONFLICT", str(exc)) from exc
        response.headers["ETag"] = f'"{project.revision}"'
        return project.model_dump(mode="json")

    @app.get("/api/v1/settings")
    def get_settings() -> dict:
        return context.settings_service.get_user_settings().model_dump()

    @app.put("/api/v1/settings")
    def put_settings(payload: UserSettingsPatch, response: Response) -> dict:
        try:
            updated = context.settings_service.update_user_settings(payload)
        except RevisionConflictError as exc:
            raise _error(409, "REVISION_CONFLICT", str(exc)) from exc
        response.headers["ETag"] = f'"{updated.revision}"'
        return updated.model_dump()

    @app.get("/api/v1/storage")
    def get_storage() -> dict:
        return {
            "configuration": context.settings_service.storage_configuration(),
            "volumes": context.system.volumes(),
        }

    @app.post("/api/v1/storage/select")
    def select_storage(payload: StorageSelectRequest) -> dict:
        try:
            configuration = context.system.select_volume(payload.volume_id, payload.folder_name)
        except LookupError as exc:
            raise _error(404, "VOLUME_NOT_FOUND", str(exc)) from exc
        except PermissionError as exc:
            raise _error(403, "VOLUME_NOT_WRITABLE", str(exc)) from exc
        except (OSError, RuntimeError, ValueError) as exc:
            raise _error(400, "STORAGE_SELECTION_FAILED", str(exc)) from exc
        context.projects.scan()
        return configuration

    @app.get("/api/v1/system/resources")
    def resources() -> dict:
        return context.system.resource_snapshot()

    @app.get("/api/v1/system/resources/events")
    async def resource_events(request: Request) -> StreamingResponse:
        async def stream():
            while not await request.is_disconnected():
                snapshot = context.system.resource_snapshot()
                yield f"data: {json.dumps(snapshot)}\n\n"
                refresh = context.settings_service.get_user_settings().resource_refresh_seconds
                await asyncio.sleep(refresh)

        return StreamingResponse(
            stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @app.get("/api/v1/system/hardware")
    def hardware_report() -> dict:
        current = context.jobs.latest_hardware_report()
        return current or {"report": None, "job_id": None}

    @app.post("/api/v1/system/hardware/scan", status_code=202)
    def start_hardware_scan() -> dict:
        job = context.jobs.create("hardware_scan", total=7, step="Waiting for hardware worker")
        try:
            from .worker.tasks import hardware_scan

            hardware_scan(job["job_id"])
        except Exception as exc:
            context.jobs.update(
                job["job_id"],
                status="failed",
                completed=0,
                total=7,
                step="Could not enqueue hardware scan",
                error=str(exc),
            )
            raise _error(503, "QUEUE_UNAVAILABLE", "Hardware worker queue is unavailable") from exc
        return context.jobs.get(job["job_id"])

    @app.get("/api/v1/jobs")
    def list_jobs() -> dict:
        return {"jobs": context.jobs.list()}

    @app.get("/api/v1/jobs/{job_id}")
    def get_job(job_id: str) -> dict:
        try:
            return context.jobs.get(job_id)
        except JobNotFoundError as exc:
            raise _error(404, "JOB_NOT_FOUND", "Job does not exist") from exc

    @app.get("/api/v1/control/services")
    def services() -> dict:
        return _service_status(settings)

    @app.get("/api/v1/control/logs/{service}")
    def service_logs(service: str, lines: int = 120) -> dict:
        if service not in {"api", "worker", "supervisor"}:
            raise _error(404, "SERVICE_NOT_FOUND", "Unknown service")
        lines = max(1, min(lines, 500))
        path = settings.logs_dir / f"{service}.log"
        if not path.exists():
            return {"service": service, "lines": [], "available": False}
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            content = handle.readlines()[-lines:]
        return {
            "service": service,
            "lines": [line.rstrip("\r\n") for line in content],
            "available": True,
        }

    @app.post("/api/v1/control/commands", status_code=202)
    def control_command(payload: ControlCommandRequest) -> dict:
        state = _service_status(settings)
        if state.get("supervisor", {}).get("status") != "running":
            raise _error(
                409, "SUPERVISOR_NOT_RUNNING", "Start DocuForge with the one-click launcher"
            )
        command_id = str(uuid4())
        with database.session() as session:
            session.add(
                ServiceCommand(
                    command_id=command_id,
                    action=payload.action,
                    status="pending",
                    created_at=datetime.now(UTC),
                )
            )
        return {"command_id": command_id, "action": payload.action, "status": "pending"}

    if settings.frontend_dist.exists():
        assets = settings.frontend_dist / "assets"
        if assets.exists():
            app.mount("/assets", StaticFiles(directory=assets), name="assets")

        @app.get("/{full_path:path}")
        def spa(full_path: str):
            if full_path.startswith("api/"):
                raise _error(404, "NOT_FOUND", "API route does not exist")
            candidate = settings.frontend_dist / full_path
            if (
                full_path
                and candidate.is_file()
                and candidate.resolve().is_relative_to(settings.frontend_dist.resolve())
            ):
                return FileResponse(candidate)
            return FileResponse(settings.frontend_dist / "index.html")

    else:

        @app.get("/{full_path:path}")
        def frontend_missing(full_path: str) -> HTMLResponse:
            if full_path.startswith("api/"):
                raise _error(404, "NOT_FOUND", "API route does not exist")
            return HTMLResponse(
                "<h1>DocuForge UI is not built</h1><p>Run <code>npm run build</code>.</p>",
                status_code=503,
            )

    return app


app = create_app()
