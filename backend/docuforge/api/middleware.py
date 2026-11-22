from __future__ import annotations

import json
from urllib.parse import urlparse

from starlette.types import ASGIApp, Message, Receive, Scope, Send


async def _json_error(send: Send, status: int, code: str, message: str) -> None:
    content = json.dumps({"error": {"code": code, "message": message}}).encode()
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", b"application/json; charset=utf-8"),
                (b"content-length", str(len(content)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": content})


class RequestSafetyMiddleware:
    def __init__(self, app: ASGIApp, *, csrf_token: str, max_body_bytes: int):
        self.app = app
        self.csrf_token = csrf_token
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        method = scope.get("method", "GET").upper()
        path = scope.get("path", "")
        if method not in {"POST", "PUT", "PATCH", "DELETE"} or not path.startswith("/api/"):
            await self.app(scope, receive, send)
            return

        headers = {key.decode().lower(): value.decode() for key, value in scope.get("headers", [])}
        if headers.get("x-docuforge-csrf") != self.csrf_token:
            await _json_error(send, 403, "CSRF_REJECTED", "Missing or invalid local session token")
            return
        origin = headers.get("origin")
        host = headers.get("host", "")
        if not origin or urlparse(origin).netloc.casefold() != host.casefold():
            await _json_error(send, 403, "ORIGIN_REJECTED", "Request origin must match DocuForge")
            return

        content_length = headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.max_body_bytes:
                    await _json_error(send, 413, "BODY_TOO_LARGE", "JSON request is too large")
                    return
            except ValueError:
                await _json_error(send, 400, "INVALID_LENGTH", "Invalid Content-Length")
                return

        messages: list[Message] = []
        size = 0
        while True:
            message = await receive()
            messages.append(message)
            if message["type"] == "http.disconnect":
                return
            if message["type"] == "http.request":
                size += len(message.get("body", b""))
                if size > self.max_body_bytes:
                    await _json_error(send, 413, "BODY_TOO_LARGE", "JSON request is too large")
                    return
                if not message.get("more_body", False):
                    break

        if size and headers.get("content-type", "").split(";", 1)[0].strip() != "application/json":
            await _json_error(send, 415, "JSON_REQUIRED", "Use application/json")
            return

        iterator = iter(messages)

        async def replay() -> Message:
            try:
                return next(iterator)
            except StopIteration:
                return {"type": "http.request", "body": b"", "more_body": False}

        await self.app(scope, replay, send)
