from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field
from pathlib import Path

LOCAL_HOSTS = ("127.0.0.1", "localhost", "testserver")


def _default_data_root() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
        return base / "DocuForge"
    return Path.home() / ".local" / "share" / "DocuForge"


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(slots=True)
class AppSettings:
    repo_root: Path
    data_root: Path
    host: str = "127.0.0.1"
    port: int = 3000
    allow_public_bind: bool = False
    allowed_hosts: tuple[str, ...] = LOCAL_HOSTS
    csrf_token: str = field(default_factory=lambda: secrets.token_urlsafe(32))
    max_json_body_bytes: int = 1_048_576
    projects_root_override: Path | None = None
    test_mode: bool = False

    @classmethod
    def from_environment(cls) -> AppSettings:
        repo_root = Path(__file__).resolve().parents[2]
        data_root = Path(os.environ.get("DOCUFORGE_DATA_ROOT", _default_data_root()))
        host = os.environ.get("DOCUFORGE_HOST", "127.0.0.1").strip()
        allow_public = _env_bool("DOCUFORGE_ALLOW_PUBLIC_BIND")
        if host not in {"127.0.0.1", "localhost"} and not allow_public:
            raise RuntimeError(
                "Refusing a non-local bind. Set DOCUFORGE_ALLOW_PUBLIC_BIND=1 explicitly "
                "and review the Control Centre warning."
            )
        port_text = os.environ.get("DOCUFORGE_PORT", "3000")
        try:
            port = int(port_text)
        except ValueError as exc:
            raise RuntimeError("DOCUFORGE_PORT must be an integer") from exc
        if not 1 <= port <= 65535:
            raise RuntimeError("DOCUFORGE_PORT must be between 1 and 65535")

        hosts_text = os.environ.get("DOCUFORGE_ALLOWED_HOSTS")
        if hosts_text:
            allowed_hosts = tuple(item.strip() for item in hosts_text.split(",") if item.strip())
        elif allow_public:
            allowed_hosts = ("*",)
        else:
            allowed_hosts = LOCAL_HOSTS

        projects_override = os.environ.get("DOCUFORGE_PROJECTS_ROOT")
        return cls(
            repo_root=repo_root,
            data_root=data_root.expanduser().resolve(),
            host=host,
            port=port,
            allow_public_bind=allow_public,
            allowed_hosts=allowed_hosts,
            projects_root_override=(
                Path(projects_override).expanduser().resolve() if projects_override else None
            ),
            test_mode=_env_bool("DOCUFORGE_TEST_MODE"),
        )

    @property
    def database_path(self) -> Path:
        return self.data_root / "db" / "docuforge.sqlite3"

    @property
    def queue_path(self) -> Path:
        return self.data_root / "db" / "queue.sqlite3"

    @property
    def logs_dir(self) -> Path:
        return self.data_root / "logs"

    @property
    def runtime_dir(self) -> Path:
        return self.data_root / "runtime"

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.database_path.as_posix()}"

    @property
    def legacy_projects_root(self) -> Path:
        return self.repo_root / "projects"

    @property
    def frontend_dist(self) -> Path:
        return self.repo_root / "frontend" / "dist"

    def ensure_directories(self) -> None:
        for path in (
            self.data_root,
            self.database_path.parent,
            self.logs_dir,
            self.runtime_dir,
            self.data_root / "backups" / "database",
            self.data_root / "cache" / "proxies",
            self.data_root / "temp",
        ):
            path.mkdir(parents=True, exist_ok=True)
