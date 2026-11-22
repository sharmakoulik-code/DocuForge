from __future__ import annotations

import contextlib
import hashlib
import json
import os
import re
import stat
import tempfile
from pathlib import Path, PureWindowsPath
from typing import Any

MAX_MANIFEST_BYTES = 1_048_576
WINDOWS_RESERVED = {
    "CON",
    "PRN",
    "AUX",
    "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}
SAFE_FOLDER_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$")


class UnsafePathError(ValueError):
    pass


def validate_path_segment(segment: str) -> str:
    if not segment or segment in {".", ".."}:
        raise UnsafePathError("Path segment is empty or relative")
    if any(ord(char) < 32 for char in segment):
        raise UnsafePathError("Control characters are not allowed")
    if "/" in segment or "\\" in segment or ":" in segment:
        raise UnsafePathError(
            "Path separators, drive letters and alternate streams are not allowed"
        )
    if segment.endswith((".", " ")):
        raise UnsafePathError("Windows trailing dot/space aliases are not allowed")
    windows = PureWindowsPath(segment)
    if windows.is_absolute() or windows.drive or windows.root:
        raise UnsafePathError("Absolute and drive-qualified paths are not allowed")
    stem = segment.split(".", 1)[0].upper()
    if stem in WINDOWS_RESERVED:
        raise UnsafePathError("Windows reserved device name is not allowed")
    if not SAFE_FOLDER_RE.fullmatch(segment):
        raise UnsafePathError("Path segment contains unsupported characters")
    return segment


def _is_reparse_or_symlink(path: Path) -> bool:
    try:
        info = path.lstat()
    except FileNotFoundError:
        return False
    if stat.S_ISLNK(info.st_mode):
        return True
    return bool(getattr(info, "st_file_attributes", 0) & 0x400)


def ensure_no_link_components(path: Path, stop_at: Path) -> None:
    stop = stop_at.resolve(strict=False)
    current = path
    while True:
        if current.exists() and _is_reparse_or_symlink(current):
            raise UnsafePathError("Symlinks and junction/reparse points are not allowed")
        if current.resolve(strict=False) == stop:
            return
        if current.parent == current:
            raise UnsafePathError("Path is outside the configured root")
        current = current.parent


def resolve_inside(root: Path, *segments: str, require_exists: bool = False) -> Path:
    root = root.resolve(strict=require_exists)
    clean = [validate_path_segment(segment) for segment in segments]
    candidate = root.joinpath(*clean)
    ensure_no_link_components(candidate, root)
    resolved = candidate.resolve(strict=require_exists)
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise UnsafePathError("Resolved path escapes the configured root") from exc
    return resolved


def read_json_file(path: Path, max_bytes: int = MAX_MANIFEST_BYTES) -> tuple[dict[str, Any], bytes]:
    with path.open("rb") as handle:
        raw = handle.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise ValueError("JSON file exceeds the allowed size")
    value = json.loads(raw.decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError("JSON root must be an object")
    return value, raw


def atomic_write_bytes(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    ensure_no_link_components(path, path.parent.resolve(strict=True))
    temp_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", prefix=f".{path.name}.", suffix=".tmp", dir=path.parent, delete=False
        ) as handle:
            temp_name = handle.name
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
        temp_name = None
        if os.name != "nt":
            directory_fd = os.open(path.parent, os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
    finally:
        if temp_name:
            with contextlib.suppress(FileNotFoundError):
                os.unlink(temp_name)


def atomic_write_json(path: Path, value: dict[str, Any]) -> bytes:
    content = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if len(content) > MAX_MANIFEST_BYTES:
        raise ValueError("Serialized manifest exceeds the allowed size")
    atomic_write_bytes(path, content)
    return content


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()
