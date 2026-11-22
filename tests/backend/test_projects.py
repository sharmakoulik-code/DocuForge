from __future__ import annotations

import json
from pathlib import Path

from docuforge.config import AppSettings
from docuforge.main import create_app


def _create(test_app, topic: str = "Café\r\nKolkata's documentary history") -> dict:
    response = test_app.client.post(
        "/api/v1/projects",
        json={
            "topic": topic,
            "target_duration_minutes": 3,
            "language": "en",
            "aspect_ratio": "16:9",
        },
        headers=test_app.csrf_headers,
    )
    assert response.status_code == 201, response.text
    assert response.headers["etag"] == '"1"'
    return response.json()


def _manifest(test_app, project_id: str) -> Path:
    root = test_app.settings.projects_root_override
    assert root is not None
    return root / f"project-{project_id}" / "project.json"


def test_create_round_trips_non_ascii_and_crlf(test_app) -> None:
    topic = "Café কলকাতা\r\nA source-led film"
    project = _create(test_app, topic)
    path = _manifest(test_app, project["project_id"])
    raw = json.loads(path.read_text(encoding="utf-8"))
    assert raw["topic"] == topic
    assert raw["title"] == topic
    assert raw["revision"] == 1
    assert raw["production_plan_status"] == "not_generated"
    assert not (path.parent / "research").exists()
    assert project["editable"] is True


def test_patch_preserves_unknown_fields_and_rejects_stale_tab(test_app) -> None:
    project = _create(test_app)
    path = _manifest(test_app, project["project_id"])
    raw = json.loads(path.read_text(encoding="utf-8"))
    raw["future_milestone_field"] = {"keep": "exactly"}
    path.write_text(json.dumps(raw, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    test_app.client.get("/api/v1/projects")

    first = test_app.client.patch(
        f"/api/v1/projects/{project['project_id']}",
        json={"expected_revision": 1, "title": "A revised local title"},
        headers=test_app.csrf_headers,
    )
    assert first.status_code == 200, first.text
    assert first.json()["revision"] == 2
    assert json.loads(path.read_text(encoding="utf-8"))["future_milestone_field"] == {
        "keep": "exactly"
    }

    before = path.read_bytes()
    stale = test_app.client.patch(
        f"/api/v1/projects/{project['project_id']}",
        json={"expected_revision": 1, "title": "Stale overwrite"},
        headers=test_app.csrf_headers,
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "REVISION_CONFLICT"
    assert path.read_bytes() == before


def test_malformed_and_oversized_requests_leave_file_untouched(test_app) -> None:
    project = _create(test_app)
    path = _manifest(test_app, project["project_id"])
    before = path.read_bytes()
    malformed = test_app.client.patch(
        f"/api/v1/projects/{project['project_id']}",
        content=b'{"expected_revision":1,"title":',
        headers={**test_app.csrf_headers, "Content-Type": "application/json"},
    )
    assert malformed.status_code == 400
    assert path.read_bytes() == before

    oversized = test_app.client.patch(
        f"/api/v1/projects/{project['project_id']}",
        content=b"{" + b"x" * 1_048_576 + b"}",
        headers={**test_app.csrf_headers, "Content-Type": "application/json"},
    )
    assert oversized.status_code == 413
    assert path.read_bytes() == before


def test_database_can_be_rebuilt_from_project_files(test_app, tmp_path: Path) -> None:
    project = _create(test_app, "Rebuild this project index")
    context = test_app.client.app.state.context
    context.database.engine.dispose()
    for suffix in ("", "-wal", "-shm"):
        candidate = Path(f"{test_app.settings.database_path}{suffix}")
        if candidate.exists():
            candidate.unlink()

    replacement_settings = AppSettings(
        repo_root=Path.cwd(),
        data_root=test_app.settings.data_root,
        projects_root_override=test_app.settings.projects_root_override,
        allowed_hosts=("testserver",),
        test_mode=True,
    )
    replacement = create_app(replacement_settings)
    from fastapi.testclient import TestClient

    with TestClient(replacement, base_url="http://testserver") as client:
        projects = client.get("/api/v1/projects").json()["projects"]
        assert any(item["project_id"] == project["project_id"] for item in projects)
    replacement.state.context.database.engine.dispose()


def test_legacy_project_is_indexed_without_modification(test_app) -> None:
    legacy = Path("projects/first-documentary/project.json")
    before = legacy.read_bytes()
    projects = test_app.client.get("/api/v1/projects").json()["projects"]
    item = next(project for project in projects if project["root_kind"] == "legacy")
    assert item["editable"] is False
    assert item["status"] == "legacy"
    assert legacy.read_bytes() == before
