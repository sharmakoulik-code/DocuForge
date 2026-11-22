from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

AspectRatio = Literal["16:9", "9:16"]


class ProjectManifest(BaseModel):
    model_config = ConfigDict(extra="allow", strict=True)

    schema_version: int = Field(default=1, ge=1)
    project_id: str
    revision: int = Field(ge=1)
    topic: str = Field(min_length=1, max_length=500)
    title: str = Field(min_length=1, max_length=500)
    status: Literal["draft"] = "draft"
    target_duration_minutes: int = Field(default=35, ge=2, le=180)
    language: Literal["en"] = "en"
    aspect_ratio: AspectRatio = "16:9"
    production_plan_status: Literal["not_generated"] = "not_generated"
    created_at: datetime
    updated_at: datetime


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    topic: str = Field(min_length=1, max_length=500)
    target_duration_minutes: int = Field(default=35, ge=2, le=180)
    language: Literal["en"] = "en"
    aspect_ratio: AspectRatio = "16:9"

    @field_validator("topic")
    @classmethod
    def topic_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Topic cannot be blank")
        return value


class ProjectPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    expected_revision: int = Field(ge=1)
    topic: str | None = Field(default=None, min_length=1, max_length=500)
    title: str | None = Field(default=None, min_length=1, max_length=500)
    target_duration_minutes: int | None = Field(default=None, ge=2, le=180)
    aspect_ratio: AspectRatio | None = None

    @model_validator(mode="after")
    def has_change(self) -> ProjectPatch:
        if all(
            value is None
            for value in (
                self.topic,
                self.title,
                self.target_duration_minutes,
                self.aspect_ratio,
            )
        ):
            raise ValueError("At least one project field must change")
        if self.topic is not None and not self.topic.strip():
            raise ValueError("Topic cannot be blank")
        if self.title is not None and not self.title.strip():
            raise ValueError("Title cannot be blank")
        return self


class ProjectSummary(BaseModel):
    project_id: str
    title: str
    topic: str
    status: str
    revision: int
    schema_version: int
    target_duration_minutes: int | None = None
    language: str | None = None
    aspect_ratio: str | None = None
    production_plan_status: str | None = None
    root_kind: str
    relative_folder: str
    online: bool
    editable: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None


class StorageSelectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    volume_id: str = Field(min_length=1, max_length=200)
    folder_name: str = Field(default="DocuForgeData", min_length=1, max_length=80)


class UserSettings(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    revision: int = Field(default=1, ge=1)
    default_duration_minutes: int = Field(default=35, ge=2, le=180)
    internal_free_reserve_gb: int = Field(default=15, ge=5, le=500)
    external_free_reserve_percent: int = Field(default=20, ge=5, le=80)
    resource_refresh_seconds: int = Field(default=2, ge=1, le=30)


class UserSettingsPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    expected_revision: int = Field(ge=1)
    default_duration_minutes: int = Field(ge=2, le=180)
    internal_free_reserve_gb: int = Field(ge=5, le=500)
    external_free_reserve_percent: int = Field(ge=5, le=80)
    resource_refresh_seconds: int = Field(ge=1, le=30)


class ControlCommandRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    action: Literal["restart_api", "restart_worker", "stop_all"]
