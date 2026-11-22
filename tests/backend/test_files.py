from __future__ import annotations

import json
from pathlib import Path

import pytest

from docuforge.files import (
    UnsafePathError,
    atomic_write_json,
    resolve_inside,
    validate_path_segment,
)


@pytest.mark.parametrize(
    "value",
    [
        "..",
        ".",
        "C:\\Windows",
        "C:stream",
        "\\\\server\\share",
        "/absolute",
        "folder/child",
        "folder\\child",
        "CON",
        "con.txt",
        "NUL",
        "LPT9.log",
        "project.",
        "project ",
        "bad\x00name",
    ],
)
def test_windows_and_traversal_aliases_are_rejected(value: str) -> None:
    with pytest.raises(UnsafePathError):
        validate_path_segment(value)


def test_safe_server_owned_segment_resolves_inside(tmp_path: Path) -> None:
    path = resolve_inside(tmp_path, "project-1234")
    assert path == tmp_path / "project-1234"


def test_symlink_escape_is_rejected(tmp_path: Path) -> None:
    outside = tmp_path / "outside"
    outside.mkdir()
    root = tmp_path / "root"
    root.mkdir()
    link = root / "project-link"
    try:
        link.symlink_to(outside, target_is_directory=True)
    except OSError:
        pytest.skip("Symlink creation is not permitted on this platform")
    with pytest.raises(UnsafePathError):
        resolve_inside(root, "project-link")


def test_atomic_json_replaces_complete_document(tmp_path: Path) -> None:
    target = tmp_path / "project.json"
    atomic_write_json(target, {"revision": 1, "text": "café\r\nline"})
    assert json.loads(target.read_text(encoding="utf-8"))["text"] == "café\r\nline"
    atomic_write_json(target, {"revision": 2, "text": "complete"})
    assert json.loads(target.read_text(encoding="utf-8")) == {
        "revision": 2,
        "text": "complete",
    }
    assert not list(tmp_path.glob("*.tmp"))
