from __future__ import annotations

from alembic import command
from alembic.config import Config

from .config import AppSettings


def upgrade_database(settings: AppSettings) -> None:
    settings.ensure_directories()
    config_path = settings.repo_root / "backend" / "alembic.ini"
    config = Config(str(config_path))
    config.set_main_option("script_location", str(settings.repo_root / "backend" / "migrations"))
    config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))
    command.upgrade(config, "head")
