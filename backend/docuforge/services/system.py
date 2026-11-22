from __future__ import annotations

import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import cpuinfo
import psutil

from ..files import atomic_write_json, read_json_file, validate_path_segment
from .settings import SettingsService

ProgressCallback = Callable[[int, int, str], None]


def _fixed_command(command: list[str], timeout: int = 8) -> dict[str, Any]:
    executable = shutil.which(command[0])
    if executable is None:
        return {"available": False, "version": None, "detail": "Not installed"}
    try:
        completed = subprocess.run(
            [executable, *command[1:]],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            encoding="utf-8",
            errors="replace",
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {"available": True, "version": None, "detail": str(exc)[:500]}
    output = (completed.stdout or completed.stderr).strip()
    first_line = output.splitlines()[0] if output else "No version output"
    return {
        "available": completed.returncode == 0,
        "version": first_line[:300],
        "detail": output[:2000],
        "exit_code": completed.returncode,
    }


def _intel_generation(model: str) -> dict[str, str | None]:
    import re

    match = re.search(r"Core\(TM\)\s+i[3579]-([0-9]{4,5})", model, re.IGNORECASE)
    if not match:
        match = re.search(r"Core\s+i[3579]-([0-9]{4,5})", model, re.IGNORECASE)
    if not match:
        return {"generation": None, "generation_confidence": "unknown"}
    digits = match.group(1)
    generation = digits[:2] if len(digits) == 5 else digits[:1]
    return {
        "generation": f"{int(generation)}th generation (inferred from model name)",
        "generation_confidence": "inferred",
    }


def _powershell_json(script: str) -> Any | None:
    executable = shutil.which("powershell.exe") or shutil.which("powershell")
    if executable is None:
        return None
    try:
        completed = subprocess.run(
            [executable, "-NoProfile", "-NonInteractive", "-Command", script],
            capture_output=True,
            text=True,
            timeout=12,
            check=False,
            encoding="utf-8-sig",
            errors="replace",
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if completed.returncode != 0 or not completed.stdout.strip():
        return None
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError:
        return None


class SystemService:
    def __init__(self, settings_service: SettingsService):
        self.settings_service = settings_service

    def volumes(self) -> list[dict[str, Any]]:
        if os.name == "nt":
            windows = self._windows_volumes()
            if windows:
                return windows
        volumes: list[dict[str, Any]] = []
        seen: set[str] = set()
        for partition in psutil.disk_partitions(all=False):
            mount = partition.mountpoint
            if mount in seen:
                continue
            seen.add(mount)
            try:
                usage = psutil.disk_usage(mount)
            except (PermissionError, FileNotFoundError, OSError):
                continue
            identity = hashlib.sha256(
                f"{partition.device}|{partition.mountpoint}|{partition.fstype}".encode()
            ).hexdigest()[:24]
            volumes.append(
                {
                    "volume_id": f"fallback-{identity}",
                    "label": Path(mount).name or mount,
                    "mount_point": mount,
                    "filesystem": partition.fstype or "unknown",
                    "device": partition.device,
                    "total_bytes": usage.total,
                    "free_bytes": usage.free,
                    "used_percent": usage.percent,
                    "is_external": False,
                    "is_removable": False,
                    "identity_confidence": "fallback",
                    "writable": os.access(mount, os.W_OK),
                }
            )
        return volumes

    def _windows_volumes(self) -> list[dict[str, Any]]:
        script = (
            "$ErrorActionPreference='Stop';"
            "@(Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,VolumeName,"
            "FileSystem,Size,FreeSpace,DriveType,VolumeSerialNumber) | "
            "ConvertTo-Json -Depth 3 -Compress"
        )
        data = _powershell_json(script)
        if data is None:
            return []
        entries = data if isinstance(data, list) else [data]
        result = []
        for item in entries:
            mount = f"{item.get('DeviceID', '')}\\"
            total = int(item.get("Size") or 0)
            free = int(item.get("FreeSpace") or 0)
            drive_type = int(item.get("DriveType") or 0)
            serial = str(item.get("VolumeSerialNumber") or "unknown")
            device_id = str(item.get("DeviceID") or "")
            result.append(
                {
                    "volume_id": f"windows-{serial}-{device_id.replace(':', '')}",
                    "label": item.get("VolumeName") or device_id,
                    "mount_point": mount,
                    "filesystem": item.get("FileSystem") or "unknown",
                    "device": device_id,
                    "total_bytes": total,
                    "free_bytes": free,
                    "used_percent": round(((total - free) / total * 100), 1) if total else 0,
                    "is_external": drive_type in {2, 5},
                    "is_removable": drive_type == 2,
                    "identity_confidence": "volume-serial",
                    "writable": os.access(mount, os.W_OK),
                }
            )
        return result

    def select_volume(self, volume_id: str, folder_name: str) -> dict[str, Any]:
        validate_path_segment(folder_name)
        selected = next((item for item in self.volumes() if item["volume_id"] == volume_id), None)
        if selected is None:
            raise LookupError("Volume is no longer available")
        if not selected["writable"]:
            raise PermissionError("Volume is not writable by DocuForge")
        data_root = Path(selected["mount_point"]) / folder_name
        data_root.mkdir(parents=True, exist_ok=True)
        marker_path = data_root / ".docuforge-volume.json"
        marker_id = str(uuid.uuid4())
        if marker_path.exists():
            marker, _ = read_json_file(marker_path)
            existing_volume = marker.get("volume_id")
            existing_marker = marker.get("marker_id")
            if existing_volume != volume_id or not isinstance(existing_marker, str):
                raise RuntimeError("Existing DocuForge marker belongs to a different volume")
            marker_id = existing_marker
        else:
            atomic_write_json(
                marker_path,
                {
                    "schema_version": 1,
                    "marker_id": marker_id,
                    "volume_id": volume_id,
                    "created_at": datetime.now(UTC).isoformat(),
                },
            )
        projects_root = data_root / "projects"
        projects_root.mkdir(parents=True, exist_ok=True)
        return self.settings_service.set_storage(
            root=projects_root, volume_id=volume_id, marker_id=marker_id
        )

    def resource_snapshot(self) -> dict[str, Any]:
        memory = psutil.virtual_memory()
        process = psutil.Process()
        disks = []
        for volume in self.volumes():
            disks.append(
                {
                    "volume_id": volume["volume_id"],
                    "label": volume["label"],
                    "free_bytes": volume["free_bytes"],
                    "total_bytes": volume["total_bytes"],
                    "used_percent": volume["used_percent"],
                }
            )
        return {
            "timestamp": datetime.now(UTC).isoformat(),
            "cpu_percent": psutil.cpu_percent(interval=None),
            "memory": {
                "total_bytes": memory.total,
                "available_bytes": memory.available,
                "used_percent": memory.percent,
            },
            "docuforge_process": {
                "rss_bytes": process.memory_info().rss,
                "cpu_percent": process.cpu_percent(interval=None),
            },
            "disks": disks,
        }

    def hardware_report(self, progress: ProgressCallback | None = None) -> dict[str, Any]:
        total = 7

        def step(number: int, label: str) -> None:
            if progress:
                progress(number, total, label)

        step(0, "Reading CPU and operating system")
        cpu = cpuinfo.get_cpu_info()
        model = str(cpu.get("brand_raw") or platform.processor() or "Unknown")
        cpu_section = {
            "model": model,
            "architecture": platform.machine(),
            "physical_cores": psutil.cpu_count(logical=False),
            "logical_threads": psutil.cpu_count(logical=True),
            "frequency_mhz": (psutil.cpu_freq().max if psutil.cpu_freq() else None),
            **_intel_generation(model),
        }

        step(1, "Reading physical and available memory")
        memory = psutil.virtual_memory()
        memory_section = {
            "physical_bytes": memory.total,
            "available_bytes": memory.available,
            "used_percent": memory.percent,
        }

        step(2, "Reading graphics adapters")
        gpu_section = self._gpu_report()

        step(3, "Reading internal and external volumes")
        volume_section = self.volumes()

        step(4, "Checking Python, Node and FFmpeg")
        runtimes = {
            "python": {
                "available": True,
                "version": platform.python_version(),
                "executable": sys.executable,
            },
            "node": _fixed_command(["node", "--version"]),
            "npm": _fixed_command(["npm", "--version"]),
            "ffmpeg": _fixed_command(["ffmpeg", "-version"]),
            "ffprobe": _fixed_command(["ffprobe", "-version"]),
        }

        step(5, "Checking local AI runtimes without loading models")
        ollama = _fixed_command(["ollama", "--version"])
        ollama_models: list[dict[str, str]] = []
        if ollama["available"]:
            listing = _fixed_command(["ollama", "list"], timeout=12)
            if listing["available"]:
                for line in listing.get("detail", "").splitlines()[1:]:
                    columns = line.split()
                    if columns:
                        ollama_models.append(
                            {
                                "name": columns[0],
                                "size": " ".join(columns[2:4]) if len(columns) > 3 else "unknown",
                            }
                        )
        ai = {
            "ollama": {**ollama, "models": ollama_models},
            "llama_cpp_cli": _fixed_command(["llama-cli", "--version"]),
            "llama_cpp_server": _fixed_command(["llama-server", "--version"]),
        }

        step(6, "Finalising capability report")
        ffmpeg_detail = runtimes["ffmpeg"].get("detail", "")
        quick_sync_listed = "--enable-libmfx" in ffmpeg_detail or "--enable-libvpl" in ffmpeg_detail
        return {
            "schema_version": 1,
            "captured_at": datetime.now(UTC).isoformat(),
            "os": {
                "system": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "machine": platform.machine(),
            },
            "cpu": cpu_section,
            "memory": memory_section,
            "gpus": gpu_section,
            "volumes": volume_section,
            "runtimes": runtimes,
            "ai_runtimes": ai,
            "render_capabilities": {
                "h264_qsv_listed_or_build_enabled": quick_sync_listed,
                "h264_qsv_validated": False,
                "note": "Listing is not validation. Run Full diagnostics before future use.",
            },
        }

    def _gpu_report(self) -> list[dict[str, Any]]:
        if os.name == "nt":
            script = (
                "$ErrorActionPreference='Stop';"
                "@(Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,"
                "DriverVersion,VideoProcessor) | ConvertTo-Json -Depth 3 -Compress"
            )
            data = _powershell_json(script)
            if data is not None:
                entries = data if isinstance(data, list) else [data]
                return [
                    {
                        "name": item.get("Name") or "Unknown",
                        "adapter_ram_bytes": item.get("AdapterRAM"),
                        "driver_version": item.get("DriverVersion"),
                        "processor": item.get("VideoProcessor"),
                        "memory_confidence": (
                            "best-effort; shared-memory GPUs may report inaccurately"
                        ),
                    }
                    for item in entries
                ]
        command = _fixed_command(["lspci"])
        if not command["available"]:
            return []
        return [
            {"name": line, "adapter_ram_bytes": None, "memory_confidence": "unavailable"}
            for line in command["detail"].splitlines()
            if any(token in line.lower() for token in ("vga", "3d controller", "display"))
        ]
