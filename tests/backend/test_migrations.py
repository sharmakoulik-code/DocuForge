from __future__ import annotations

import logging
from pathlib import Path

from docuforge.config import AppSettings
from docuforge.migrations import upgrade_database


def test_migration_keeps_supervisor_logger_enabled(tmp_path: Path) -> None:
    settings = AppSettings(repo_root=Path.cwd(), data_root=tmp_path / "data", test_mode=True)
    logger = logging.getLogger("docuforge.supervisor.regression")
    handler = logging.NullHandler()
    logger.addHandler(handler)
    logger.disabled = False
    try:
        upgrade_database(settings)
        assert logger.disabled is False
        assert handler in logger.handlers
    finally:
        logger.removeHandler(handler)
