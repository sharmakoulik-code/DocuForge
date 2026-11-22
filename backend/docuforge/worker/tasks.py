from __future__ import annotations

from huey import SqliteHuey

from ..config import AppSettings
from ..database import Database
from ..migrations import upgrade_database
from ..services.jobs import JobService
from ..services.settings import SettingsService
from ..services.system import SystemService

_settings = AppSettings.from_environment()
_settings.ensure_directories()
huey = SqliteHuey("docuforge", filename=str(_settings.queue_path), results=True)


@huey.task(retries=1, retry_delay=3)
def hardware_scan(job_id: str) -> dict:
    settings = AppSettings.from_environment()
    upgrade_database(settings)
    database = Database(settings)
    jobs = JobService(database)
    system = SystemService(SettingsService(database, settings))

    def progress(completed: int, total: int, step: str) -> None:
        jobs.update(
            job_id,
            status="running",
            completed=completed,
            total=total,
            step=step,
        )

    try:
        report = system.hardware_report(progress)
        jobs.update(
            job_id,
            status="completed",
            completed=7,
            total=7,
            step="Capability report complete",
            result=report,
        )
        return report
    except Exception as exc:
        jobs.update(
            job_id,
            status="failed",
            completed=0,
            total=7,
            step="Capability scan failed",
            error=f"{type(exc).__name__}: {exc}"[:2000],
        )
        raise
