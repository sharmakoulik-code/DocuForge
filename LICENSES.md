# DocuForge — License Register (M1)

DocuForge is FREE ONLY: open-source / free-licensed tools, no paid APIs.
This file lists only M1-installed runtimes and dependencies.
Deferred tools (Revideo, Kokoro-82M, faster-whisper, Ollama, Remotion, Piper)
are NOT installed in M1 — see LICENSES-REVIEW.md.

## Runtimes (not vendored; user-installed)

| Runtime | Version required | License | Notes |
|---|---|---|---|
| Node.js | >= 20 | MIT | JavaScript runtime; runs engine + API |
| FFmpeg | >= 5 (7.x recommended) | LGPL-2.1+ / GPL-2.0+ (build-dependent) | Video assembly, encode/decode; ships `ffmpeg` + `ffprobe` |

## npm dependencies (M1)

| Package | License | Used by |
|---|---|---|
| typescript | Apache-2.0 | engine, api, web (build) |
| vitest | MIT | tests |
| @types/node | MIT | engine, api (types) |
| fastify | MIT | api (HTTP server) |
| react | MIT | web (UI) |
| react-dom | MIT | web (UI) |
| vite | MIT | web (dev server + build) |
| @vitejs/plugin-react | MIT | web (build) |
| @types/react | MIT | web (types) |
| @types/react-dom | MIT | web (types) |

## Python

M1 uses no Python. Kokoro TTS and faster-whisper Python venvs are deferred
to M2/M3 (see LICENSES-REVIEW.md) and are NOT installed in M1.

## Notes

- No paid APIs. No cloud accounts. No proprietary project format.
- Ollama is optional/pluggable for M4+ and never mandatory; not installed in M1.
- OpenMontage (https://github.com/OpenMontageInc/OpenMontage, GNU AGPL-3.0)
  was used as a Mode C reference only — no code copied.
