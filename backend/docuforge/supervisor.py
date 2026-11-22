from __future__ import annotations

import json
import logging
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from datetime import UTC, datetime
from pathlib import Path
from typing import IO

from sqlalchemy import select

from .config import AppSettings
from .database import Database, ServiceCommand
from .files import atomic_write_json
from .migrations import upgrade_database


class Supervisor:
    def __init__(self, settings: AppSettings):
        self.settings = settings
        settings.ensure_directories()
        self.database = Database(settings)
        self.children: dict[str, subprocess.Popen] = {}
        self.log_handles: dict[str, IO[str]] = {}
        self.stopping = False
        self.logger = self._logger()

    def _logger(self) -> logging.Logger:
        logger = logging.getLogger("docuforge.supervisor")
        logger.setLevel(logging.INFO)
        if not logger.handlers:
            handler = logging.FileHandler(
                self.settings.logs_dir / "supervisor.log", encoding="utf-8"
            )
            handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
            logger.addHandler(handler)
            logger.addHandler(logging.StreamHandler())
        return logger

    def _base_env(self) -> dict[str, str]:
        env = dict(os.environ)
        backend = str(self.settings.repo_root / "backend")
        current = env.get("PYTHONPATH")
        env["PYTHONPATH"] = backend if not current else os.pathsep.join((backend, current))
        env["DOCUFORGE_DATA_ROOT"] = str(self.settings.data_root)
        env["DOCUFORGE_HOST"] = self.settings.host
        env["DOCUFORGE_PORT"] = str(self.settings.port)
        if self.settings.projects_root_override:
            env["DOCUFORGE_PROJECTS_ROOT"] = str(self.settings.projects_root_override)
        return env

    def _command(self, service: str) -> list[str]:
        if service == "api":
            return [
                sys.executable,
                "-m",
                "uvicorn",
                "docuforge.main:app",
                "--host",
                self.settings.host,
                "--port",
                str(self.settings.port),
                "--no-access-log",
            ]
        if service == "worker":
            return [
                sys.executable,
                "-m",
                "huey.bin.huey_consumer",
                "docuforge.worker.tasks.huey",
                "-k",
                "thread",
                "-w",
                "1",
            ]
        raise ValueError(service)

    def start_service(self, service: str) -> None:
        existing = self.children.get(service)
        if existing is not None and existing.poll() is None:
            return
        handle = (self.settings.logs_dir / f"{service}.log").open(
            "a", encoding="utf-8", buffering=1
        )
        self.log_handles[service] = handle
        creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        process = subprocess.Popen(
            self._command(service),
            cwd=self.settings.repo_root,
            env=self._base_env(),
            stdin=subprocess.DEVNULL,
            stdout=handle,
            stderr=subprocess.STDOUT,
            creationflags=creationflags,
        )
        self.children[service] = process
        self.logger.info("Started %s pid=%s", service, process.pid)

    def stop_service(self, service: str, timeout: float = 10) -> None:
        process = self.children.get(service)
        if process is None or process.poll() is not None:
            return
        self.logger.info("Stopping %s pid=%s", service, process.pid)
        process.terminate()
        try:
            process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            self.logger.warning("Force-stopping unresponsive %s pid=%s", service, process.pid)
            process.kill()
            process.wait(timeout=5)
        handle = self.log_handles.pop(service, None)
        if handle:
            handle.close()

    def restart_service(self, service: str) -> None:
        self.stop_service(service)
        self.start_service(service)

    def write_status(self) -> None:
        state = {
            "captured_at": datetime.now(UTC).isoformat(),
            "launch_id": str(os.getpid()),
            "supervisor": {"status": "running", "pid": os.getpid()},
            "api": self._child_status("api"),
            "worker": self._child_status("worker"),
            "public_bind_warning": self.settings.allow_public_bind,
        }
        atomic_write_json(self.settings.runtime_dir / "services.json", state)

    def _child_status(self, service: str) -> dict:
        process = self.children.get(service)
        if process is None:
            return {"status": "not_started", "pid": None, "exit_code": None}
        code = process.poll()
        return {
            "status": "running" if code is None else "stopped",
            "pid": process.pid,
            "exit_code": code,
        }

    def handle_commands(self) -> None:
        with self.database.session() as session:
            commands = session.scalars(
                select(ServiceCommand)
                .where(ServiceCommand.status == "pending")
                .order_by(ServiceCommand.created_at)
            ).all()
            actions = [(command.command_id, command.action) for command in commands]
            for command in commands:
                command.status = "handling"
        for command_id, action in actions:
            message = "Completed"
            status = "completed"
            try:
                if action == "restart_api":
                    self.restart_service("api")
                elif action == "restart_worker":
                    self.restart_service("worker")
                elif action == "stop_all":
                    self.stopping = True
                    message = "Safe shutdown requested"
                else:
                    raise ValueError(f"Unsupported action: {action}")
            except Exception as exc:
                status = "failed"
                message = f"{type(exc).__name__}: {exc}"[:500]
                self.logger.exception("Control command failed: %s", action)
            with self.database.session() as session:
                command = session.get(ServiceCommand, command_id)
                if command:
                    command.status = status
                    command.message = message
                    command.handled_at = datetime.now(UTC)

    def run(self) -> int:
        upgrade_database(self.settings)
        if port_in_use(self.settings.host, self.settings.port):
            if healthy_docuforge(self.settings.port):
                self.logger.info("DocuForge is already running on port %s", self.settings.port)
                open_chrome(f"http://127.0.0.1:{self.settings.port}", self.logger)
                return 0
            self.logger.error(
                "Port %s is in use by another process. DocuForge will not kill it or change ports.",
                self.settings.port,
            )
            return 2
        self.start_service("worker")
        self.start_service("api")
        self.write_status()
        if wait_for_health(self.settings.port, timeout=30):
            open_chrome(f"http://127.0.0.1:{self.settings.port}", self.logger)
        else:
            self.logger.error("API did not become healthy; see api.log")
        try:
            while not self.stopping:
                self.handle_commands()
                for service in ("api", "worker"):
                    process = self.children.get(service)
                    if process and process.poll() is not None:
                        self.logger.error("%s exited with code %s", service, process.returncode)
                self.write_status()
                time.sleep(0.75)
        finally:
            self.stop_service("worker")
            self.stop_service("api")
            atomic_write_json(
                self.settings.runtime_dir / "services.json",
                {
                    "captured_at": datetime.now(UTC).isoformat(),
                    "supervisor": {"status": "stopped", "pid": os.getpid()},
                    "api": {"status": "stopped", "pid": None},
                    "worker": {"status": "stopped", "pid": None},
                    "public_bind_warning": self.settings.allow_public_bind,
                },
            )
        return 0


def port_in_use(host: str, port: int) -> bool:
    bind_host = "127.0.0.1" if host in {"0.0.0.0", "::"} else host
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.3)
        return sock.connect_ex((bind_host, port)) == 0


def healthy_docuforge(port: int) -> bool:
    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}/api/v1/health", timeout=1
        ) as response:
            payload = json.load(response)
            return payload.get("status") == "healthy" and "version" in payload
    except (OSError, urllib.error.URLError, ValueError):
        return False


def wait_for_health(port: int, timeout: float) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if healthy_docuforge(port):
            return True
        time.sleep(0.25)
    return False


def _chrome_candidates() -> list[Path]:
    candidates: list[Path] = []
    if os.name == "nt":
        try:
            import winreg

            for root in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
                try:
                    with winreg.OpenKey(
                        root,
                        r"Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe",
                    ) as key:
                        candidates.append(Path(winreg.QueryValue(key, None)))
                except OSError:
                    pass
        except ImportError:
            pass
        for variable in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"):
            base = os.environ.get(variable)
            if base:
                candidates.append(Path(base) / "Google" / "Chrome" / "Application" / "chrome.exe")
    else:
        for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
            executable = shutil.which(name)
            if executable:
                candidates.append(Path(executable))
    return candidates


def open_chrome(url: str, logger: logging.Logger) -> None:
    for candidate in _chrome_candidates():
        if candidate.is_file():
            subprocess.Popen(
                [str(candidate), "--new-window", url],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            logger.info("Opened Chrome at %s", url)
            return
    logger.warning("Chrome was not found in standard locations; opening the default browser")
    webbrowser.open_new(url)


def main() -> int:
    settings = AppSettings.from_environment()
    supervisor = Supervisor(settings)

    def request_stop(_signum, _frame) -> None:  # type: ignore[no-untyped-def]
        supervisor.stopping = True

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)
    return supervisor.run()


if __name__ == "__main__":
    raise SystemExit(main())
