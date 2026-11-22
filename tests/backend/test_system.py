from __future__ import annotations

import json
import socket
from pathlib import Path

from docuforge.config import AppSettings
from docuforge.services.settings import SettingsService
from docuforge.services.system import SystemService
from docuforge.supervisor import port_in_use


def test_storage_selection_writes_identity_marker(test_app, monkeypatch, tmp_path: Path) -> None:
    mount = tmp_path / "volume"
    mount.mkdir()
    system: SystemService = test_app.client.app.state.context.system
    volume = {
        "volume_id": "test-volume-001",
        "label": "External SSD",
        "mount_point": str(mount),
        "filesystem": "NTFS",
        "device": "TEST",
        "total_bytes": 256_000_000_000,
        "free_bytes": 200_000_000_000,
        "used_percent": 21.8,
        "is_external": True,
        "is_removable": True,
        "identity_confidence": "test",
        "writable": True,
    }
    monkeypatch.setattr(system, "volumes", lambda: [volume])
    selected = system.select_volume("test-volume-001", "DocuForgeData")
    marker = mount / "DocuForgeData" / ".docuforge-volume.json"
    assert selected["online"] is True
    assert selected["root"].endswith("projects")
    marker_value = json.loads(marker.read_text(encoding="utf-8"))
    assert marker_value["volume_id"] == "test-volume-001"

    settings_without_override = AppSettings(
        repo_root=Path.cwd(),
        data_root=test_app.settings.data_root,
        allowed_hosts=("testserver",),
        test_mode=True,
    )
    guarded = SettingsService(test_app.client.app.state.context.database, settings_without_override)
    assert guarded.storage_configuration()["online"] is True
    marker_value["marker_id"] = "different-drive-marker"
    marker.write_text(json.dumps(marker_value), encoding="utf-8")
    assert guarded.storage_configuration()["online"] is False
    assert guarded.managed_projects_root() is None


def test_hardware_report_uses_real_values_and_steps(test_app) -> None:
    system: SystemService = test_app.client.app.state.context.system
    steps: list[tuple[int, int, str]] = []
    report = system.hardware_report(
        lambda completed, total, step: steps.append((completed, total, step))
    )
    assert report["memory"]["physical_bytes"] > 0
    assert report["cpu"]["model"]
    assert report["runtimes"]["python"]["available"] is True
    assert report["render_capabilities"]["h264_qsv_validated"] is False
    assert [item[0] for item in steps] == list(range(7))
    assert all(item[1] == 7 for item in steps)


def test_port_detection_does_not_modify_other_processes() -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind(("127.0.0.1", 0))
        server.listen(1)
        port = server.getsockname()[1]
        assert port_in_use("127.0.0.1", port) is True
    assert port_in_use("127.0.0.1", port) is False


def test_hardware_scan_endpoint_enqueues_callable_task(test_app, monkeypatch) -> None:
    from docuforge.worker import tasks

    enqueued: list[str] = []
    monkeypatch.setattr(tasks, "hardware_scan", lambda job_id: enqueued.append(job_id))
    response = test_app.client.post("/api/v1/system/hardware/scan", headers=test_app.csrf_headers)
    assert response.status_code == 202
    assert response.json()["status"] == "queued"
    assert enqueued == [response.json()["job_id"]]


def test_settings_revision_conflict(test_app) -> None:
    current = test_app.client.get("/api/v1/settings").json()
    payload = {
        "expected_revision": current["revision"],
        "default_duration_minutes": 3,
        "internal_free_reserve_gb": 15,
        "external_free_reserve_percent": 20,
        "resource_refresh_seconds": 2,
    }
    first = test_app.client.put("/api/v1/settings", json=payload, headers=test_app.csrf_headers)
    assert first.status_code == 200
    stale = test_app.client.put("/api/v1/settings", json=payload, headers=test_app.csrf_headers)
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "REVISION_CONFLICT"
