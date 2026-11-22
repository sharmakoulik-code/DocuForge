from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import ValidationError
from sqlalchemy import select

from ..database import Database, ProjectIndex
from ..files import (
    UnsafePathError,
    atomic_write_json,
    ensure_no_link_components,
    read_json_file,
    resolve_inside,
    sha256_bytes,
)
from ..schemas import ProjectCreate, ProjectManifest, ProjectPatch, ProjectSummary
from .settings import SettingsService


class ProjectNotFoundError(LookupError):
    pass


class ProjectReadOnlyError(RuntimeError):
    pass


class ProjectRevisionConflictError(RuntimeError):
    pass


class StorageNotConfiguredError(RuntimeError):
    pass


def _parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


class ProjectService:
    def __init__(self, database: Database, settings_service: SettingsService):
        self.database = database
        self.settings_service = settings_service

    def scan(self) -> list[ProjectSummary]:
        roots: list[tuple[str, Path]] = []
        managed = self.settings_service.managed_projects_root()
        if managed is not None:
            roots.append(("managed", managed))
        legacy = self.settings_service.app_settings.legacy_projects_root
        if legacy.exists() and (managed is None or legacy.resolve() != managed.resolve()):
            roots.append(("legacy", legacy))

        seen_paths: set[str] = set()
        with self.database.session() as session:
            for root_kind, root in roots:
                try:
                    root = root.resolve(strict=True)
                    ensure_no_link_components(root, root)
                except (OSError, UnsafePathError):
                    continue
                for folder in sorted(root.iterdir(), key=lambda item: item.name.casefold()):
                    if not folder.is_dir() or folder.is_symlink():
                        continue
                    manifest_path = folder / "project.json"
                    if not manifest_path.is_file() or manifest_path.is_symlink():
                        continue
                    try:
                        manifest_path.resolve(strict=True).relative_to(root)
                        raw, content = read_json_file(manifest_path)
                    except (OSError, ValueError):
                        continue
                    path_key = str(manifest_path.resolve())
                    seen_paths.add(path_key)
                    project = self._index_values(raw, content, manifest_path, root_kind, root)
                    record = session.get(ProjectIndex, project["project_id"])
                    if record is None:
                        record = ProjectIndex(**project)
                        session.add(record)
                    else:
                        for key, value in project.items():
                            setattr(record, key, value)
            for record in session.scalars(select(ProjectIndex)).all():
                if record.manifest_path not in seen_paths:
                    record.online = False
        return self.list_indexed()

    def _index_values(
        self,
        raw: dict[str, Any],
        content: bytes,
        manifest_path: Path,
        root_kind: str,
        root: Path,
    ) -> dict[str, Any]:
        try:
            manifest = ProjectManifest.model_validate_json(content)
        except ValidationError:
            identity = hashlib.sha256(str(manifest_path.resolve()).encode()).hexdigest()[:20]
            project_id = f"legacy-{identity}"
            title = str(raw.get("title") or raw.get("name") or manifest_path.parent.name)[:500]
            topic = str(raw.get("topic") or title)[:500]
            status = "legacy"
            revision = int(raw.get("revision", 0)) if str(raw.get("revision", "0")).isdigit() else 0
            schema_version = (
                int(raw.get("schema_version", raw.get("version", 0)))
                if str(raw.get("schema_version", raw.get("version", "0"))).isdigit()
                else 0
            )
            created_at = _parse_datetime(raw.get("created_at"))
        else:
            project_id = manifest.project_id
            title = manifest.title
            topic = manifest.topic
            status = manifest.status
            revision = manifest.revision
            schema_version = manifest.schema_version
            created_at = manifest.created_at
        return {
            "project_id": project_id,
            "title": title,
            "topic": topic,
            "status": status,
            "manifest_path": str(manifest_path.resolve()),
            "root_kind": root_kind,
            "relative_folder": str(manifest_path.parent.resolve().relative_to(root)),
            "revision": revision,
            "schema_version": schema_version,
            "manifest_sha256": sha256_bytes(content),
            "online": True,
            "created_at": created_at,
            "updated_at": _parse_datetime(raw.get("updated_at")) or datetime.now(UTC),
        }

    def list_indexed(self) -> list[ProjectSummary]:
        with self.database.session() as session:
            records = session.scalars(
                select(ProjectIndex).order_by(ProjectIndex.updated_at.desc())
            ).all()
            return [self._summary(record) for record in records]

    def _summary(self, record: ProjectIndex) -> ProjectSummary:
        extra: dict[str, Any] = {}
        if record.online:
            try:
                raw, _ = read_json_file(Path(record.manifest_path))
                extra = {
                    "target_duration_minutes": raw.get("target_duration_minutes"),
                    "language": raw.get("language"),
                    "aspect_ratio": raw.get("aspect_ratio"),
                    "production_plan_status": raw.get("production_plan_status"),
                }
            except (OSError, ValueError):
                pass
        return ProjectSummary(
            project_id=record.project_id,
            title=record.title,
            topic=record.topic,
            status=record.status,
            revision=record.revision,
            schema_version=record.schema_version,
            root_kind=record.root_kind,
            relative_folder=record.relative_folder,
            online=record.online,
            editable=record.root_kind == "managed" and record.status == "draft" and record.online,
            created_at=record.created_at,
            updated_at=record.updated_at,
            **extra,
        )

    def create(self, request: ProjectCreate) -> ProjectSummary:
        root = self.settings_service.managed_projects_root()
        if root is None:
            raise StorageNotConfiguredError("Choose a project storage location first")
        root.mkdir(parents=True, exist_ok=True)
        root = root.resolve(strict=True)
        ensure_no_link_components(root, root)

        project_uuid = str(uuid.uuid4())
        folder_name = f"project-{project_uuid}"
        final_folder = resolve_inside(root, folder_name)
        now = datetime.now(UTC)
        manifest = ProjectManifest(
            project_id=project_uuid,
            revision=1,
            topic=request.topic,
            title=request.topic,
            target_duration_minutes=request.target_duration_minutes,
            language=request.language,
            aspect_ratio=request.aspect_ratio,
            created_at=now,
            updated_at=now,
        )
        temp_folder = Path(tempfile.mkdtemp(prefix="._creating-", dir=root))
        try:
            content = atomic_write_json(
                temp_folder / "project.json", manifest.model_dump(mode="json")
            )
            os.replace(temp_folder, final_folder)
            if os.name != "nt":
                descriptor = os.open(root, os.O_RDONLY)
                try:
                    os.fsync(descriptor)
                finally:
                    os.close(descriptor)
        except Exception:
            shutil.rmtree(temp_folder, ignore_errors=True)
            raise

        values = self._index_values(
            manifest.model_dump(mode="json"),
            content,
            final_folder / "project.json",
            "managed",
            root,
        )
        with self.database.session() as session:
            record = ProjectIndex(**values)
            session.add(record)
        return self.get(project_uuid)

    def get(self, project_id: str) -> ProjectSummary:
        with self.database.session() as session:
            record = session.get(ProjectIndex, project_id)
            if record is None:
                raise ProjectNotFoundError(project_id)
            return self._summary(record)

    def patch(self, project_id: str, request: ProjectPatch) -> ProjectSummary:
        with self.database.session() as session:
            record = session.get(ProjectIndex, project_id)
            if record is None:
                raise ProjectNotFoundError(project_id)
            if record.root_kind != "managed" or record.status != "draft" or not record.online:
                raise ProjectReadOnlyError("This project is offline, legacy, or read-only")
            manifest_path = Path(record.manifest_path)
            raw, original = read_json_file(manifest_path)
            if request.expected_revision != record.revision or request.expected_revision != raw.get(
                "revision"
            ):
                raise ProjectRevisionConflictError("Project changed in another browser tab")

            updated = dict(raw)
            for field in ("topic", "title", "target_duration_minutes", "aspect_ratio"):
                value = getattr(request, field)
                if value is not None:
                    updated[field] = value
            updated["revision"] = request.expected_revision + 1
            updated["updated_at"] = datetime.now(UTC).isoformat()
            validated = ProjectManifest.model_validate_json(json.dumps(updated, ensure_ascii=False))
            serialized = validated.model_dump(mode="json")
            if sha256_bytes(original) != record.manifest_sha256:
                raise ProjectRevisionConflictError("Project file changed outside DocuForge")
            content = atomic_write_json(manifest_path, serialized)
            values = self._index_values(
                serialized,
                content,
                manifest_path,
                "managed",
                manifest_path.parent.parent,
            )
            for key, value in values.items():
                setattr(record, key, value)
        return self.get(project_id)
