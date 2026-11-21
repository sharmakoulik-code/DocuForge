# DocuForge — Deferred License Reviews

The following tools are NOT installed in M1. Each needs a license review
before any M2+ adoption. This file records the deferral; no code for these
tools exists in the M1/P1 codebase (enforced by tests/license-gate.test.ts).

## Revideo — DEFERRED (renderer candidate, M2+)

- Status: NOT installed. No license review completed.
- Action: review license + patent grant before adopting as RENDERER adapter.
- Alternative: Motion Canvas or HTML+FFmpeg (typed adapter pattern).

## Kokoro-82M — DEFERRED (TTS, M2+)

- Status: NOT installed / NOT MEASURED in M1.
- Action: review model + code licenses before creating python-workers venv.
- M1 narration: own-recording WAV import only.

## faster-whisper — DEFERRED (captioner, M3+)

- Status: NOT installed / NOT MEASURED in M1.
- Action: review license before creating captioner venv.
- M1 has no captions feature.

## FFmpeg — INSTALLED (M1, runtime dependency)

- FFmpeg is an M1 runtime dependency (see LICENSES.md).
- License is build-dependent (LGPL-2.1+ / GPL-2.0+). Record the exact
  build's license in vendor/NOTICE.md when vendoring or pinning a build.
- No FFmpeg code is copied into this repo; it is invoked as a subprocess.

## Ollama — DEFERRED (optional LLM runtime, M4+)

- Status: NOT installed. Optional/pluggable only; never mandatory.
- Action: review before any M4 proposal/diff feature.

## Remotion — REJECTED

- License restricted for orgs > 3 people. Do not adopt.

## Piper TTS — REJECTED

- GPL-3.0 strong copyleft. Do not adopt.

## OpenMontage — MODE C REFERENCE ONLY

- https://github.com/OpenMontageInc/OpenMontage, GNU AGPL-3.0.
- Read for ideas only. No code copied. Patterns re-implemented in TypeScript.
