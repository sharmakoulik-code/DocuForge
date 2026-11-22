from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select

from ..database import Database, JobEvent, JobRecord, SettingRecord


class JobNotFoundError(LookupError):
    pass


class JobService:
    def __init__(self, database: Database):
        self.database = database

    def create(self, job_type: str, *, total: int, step: str) -> dict:
        job_id = str(uuid.uuid4())
        with self.database.session() as session:
            record = JobRecord(
                job_id=job_id,
                job_type=job_type,
                status="queued",
                progress_completed=0,
                progress_total=total,
                progress_step=step,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            session.add(record)
            session.add(JobEvent(job_id=job_id, status="queued", message=step))
        return self.get(job_id)

    def update(
        self,
        job_id: str,
        *,
        status: str,
        completed: int,
        total: int,
        step: str,
        result: dict | None = None,
        error: str | None = None,
    ) -> dict:
        with self.database.session() as session:
            record = session.get(JobRecord, job_id)
            if record is None:
                raise JobNotFoundError(job_id)
            changed = record.status != status or record.progress_step != step
            record.status = status
            record.progress_completed = completed
            record.progress_total = total
            record.progress_step = step
            record.result = result
            record.error = error
            record.updated_at = datetime.now(UTC)
            if changed:
                session.add(JobEvent(job_id=job_id, status=status, message=step))
            if job_id and result is not None and record.job_type == "hardware_scan":
                hardware = session.get(SettingRecord, "hardware_report")
                value = {"report": result, "job_id": job_id}
                if hardware is None:
                    session.add(SettingRecord(key="hardware_report", value=value, revision=1))
                else:
                    hardware.value = value
                    hardware.revision += 1
        return self.get(job_id)

    def get(self, job_id: str) -> dict:
        with self.database.session() as session:
            record = session.get(JobRecord, job_id)
            if record is None:
                raise JobNotFoundError(job_id)
            return self._serialize(record)

    def list(self, limit: int = 20) -> list[dict]:
        with self.database.session() as session:
            records = session.scalars(
                select(JobRecord).order_by(JobRecord.created_at.desc()).limit(limit)
            ).all()
            return [self._serialize(record) for record in records]

    def latest_hardware_report(self) -> dict | None:
        with self.database.session() as session:
            record = session.get(SettingRecord, "hardware_report")
            return record.value if record else None

    @staticmethod
    def _serialize(record: JobRecord) -> dict:
        return {
            "job_id": record.job_id,
            "job_type": record.job_type,
            "status": record.status,
            "progress_completed": record.progress_completed,
            "progress_total": record.progress_total,
            "progress_step": record.progress_step,
            "result": record.result,
            "error": record.error,
            "created_at": record.created_at.isoformat() if record.created_at else None,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None,
        }
