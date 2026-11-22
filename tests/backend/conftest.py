from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from docuforge.config import AppSettings
from docuforge.main import create_app


@dataclass
class TestApp:
    client: TestClient
    settings: AppSettings
    csrf_headers: dict[str, str]


@pytest.fixture
def test_app(tmp_path: Path) -> TestApp:
    root = tmp_path / "external" / "projects"
    root.mkdir(parents=True)
    settings = AppSettings(
        repo_root=Path.cwd(),
        data_root=tmp_path / "internal",
        projects_root_override=root,
        allowed_hosts=("testserver", "127.0.0.1", "localhost"),
        test_mode=True,
    )
    app = create_app(settings)
    with TestClient(app, base_url="http://testserver") as client:
        meta = client.get("/api/v1/meta").json()
        headers = {
            "Origin": "http://testserver",
            "X-DocuForge-CSRF": meta["csrf_token"],
        }
        yield TestApp(client=client, settings=settings, csrf_headers=headers)
    app.state.context.database.engine.dispose()
