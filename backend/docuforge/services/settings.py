from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from ..config import AppSettings
from ..database import Database, SettingRecord
from ..files import read_json_file
from ..schemas import UserSettings, UserSettingsPatch


class RevisionConflictError(RuntimeError):
    pass


def _marker_matches(root: Path, value: dict) -> bool:
    marker_path = root.parent / ".docuforge-volume.json"
    if not root.exists() or not marker_path.is_file():
        return False
    try:
        marker, _ = read_json_file(marker_path)
    except (OSError, ValueError):
        return False
    return marker.get("marker_id") == value.get("marker_id") and marker.get(
        "volume_id"
    ) == value.get("volume_id")


class SettingsService:
    def __init__(self, database: Database, app_settings: AppSettings):
        self.database = database
        self.app_settings = app_settings

    def get_user_settings(self) -> UserSettings:
        with self.database.session() as session:
            record = session.get(SettingRecord, "user_settings")
            if record is None:
                value = UserSettings()
                record = SettingRecord(
                    key="user_settings", value=value.model_dump(), revision=value.revision
                )
                session.add(record)
                return value
            return UserSettings.model_validate({**record.value, "revision": record.revision})

    def update_user_settings(self, patch: UserSettingsPatch) -> UserSettings:
        with self.database.session() as session:
            record = session.get(SettingRecord, "user_settings")
            current_revision = record.revision if record else 1
            if patch.expected_revision != current_revision:
                raise RevisionConflictError("Settings changed in another browser tab")
            value = patch.model_dump(exclude={"expected_revision"})
            next_revision = current_revision + 1
            value["revision"] = next_revision
            if record is None:
                record = SettingRecord(key="user_settings", value=value, revision=next_revision)
                session.add(record)
            else:
                record.value = value
                record.revision = next_revision
            return UserSettings.model_validate(value)

    def managed_projects_root(self) -> Path | None:
        if self.app_settings.projects_root_override is not None:
            root = self.app_settings.projects_root_override
            root.mkdir(parents=True, exist_ok=True)
            return root
        with self.database.session() as session:
            record = session.get(SettingRecord, "storage")
            if record is None:
                return None
            root_text = record.value.get("root")
            if not isinstance(root_text, str):
                return None
            root = Path(root_text)
            if not _marker_matches(root, record.value):
                return None
            return root

    def storage_configuration(self) -> dict:
        if self.app_settings.projects_root_override is not None:
            root = self.app_settings.projects_root_override
            return {
                "configured": True,
                "online": root.exists(),
                "root": str(root),
                "volume_id": "environment-override",
                "source": "environment",
                "revision": 0,
            }
        with self.database.session() as session:
            record = session.get(SettingRecord, "storage")
            if record is None:
                return {
                    "configured": False,
                    "online": False,
                    "root": None,
                    "volume_id": None,
                    "source": "user-selection",
                    "revision": 0,
                }
            root_text = record.value.get("root")
            root = Path(root_text) if isinstance(root_text, str) else None
            return {
                **record.value,
                "configured": True,
                "online": bool(root and _marker_matches(root, record.value)),
                "revision": record.revision,
                "source": "user-selection",
            }

    def set_storage(self, *, root: Path, volume_id: str, marker_id: str) -> dict:
        value = {
            "root": str(root),
            "volume_id": volume_id,
            "marker_id": marker_id,
            "selected_at": datetime.now(UTC).isoformat(),
        }
        with self.database.session() as session:
            record = session.get(SettingRecord, "storage")
            if record is None:
                record = SettingRecord(key="storage", value=value, revision=1)
                session.add(record)
            else:
                record.value = value
                record.revision += 1
            revision = record.revision
        return {**value, "configured": True, "online": True, "revision": revision}
