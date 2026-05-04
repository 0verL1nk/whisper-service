# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Whisper is a desktop speech-to-text application (Chinese UI, "语音转文字") built as a Tauri 2 app with three layers:
- **Rust/Tauri shell** (`src-tauri/`) — desktop window, manages the Python sidecar lifecycle, proxies HTTP requests to it
- **Python backend** (`src/whisper_cli/`) — FastAPI server using `faster-whisper` for transcription, PyInstaller-bundled as a sidecar binary
- **React frontend** (`frontend/`) — Vite + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Zustand

The app is Chinese-language throughout (UI text, error messages, comments in the build pipeline).

## Development Commands

```bash
# Start frontend dev server + Python backend locally
make dev

# Or run individually:
cd frontend && pnpm dev                    # Vite dev server on :5173
uv run python -m whisper_cli --port 8765   # Backend API on :8765

# Frontend lint/typecheck/build
cd frontend && pnpm lint
cd frontend && pnpm tsc -b
cd frontend && pnpm build

# Python lint/format
uv run ruff check src/
uv run ruff format --check src/
uv run pyright                              # optional, basic mode

# Rust lint/format (from project root)
cd src-tauri && cargo fmt --check
cd src-tauri && cargo clippy -- -D warnings
```

## Build Pipeline

The full build (`make build`) produces a Tauri installer:
1. `make frontend` — builds the React app into `frontend/dist/`
2. `make sidecar` — PyInstaller bundles the Python backend into `dist/whisper-backend.exe` (or platform equivalent)
3. Sidecar binary is copied to `src-tauri/binaries/whisper-backend-{target_triple}` — Tauri expects this naming convention
4. `cargo tauri build` produces the final installer

For faster iteration without packaging: `make build-debug`.

### CI

Three parallel jobs on every push/PR (`.github/workflows/ci.yml`):
- **frontend**: lint, typecheck, build (pnpm)
- **backend**: ruff check + format check (uv)
- **rust**: cargo fmt, clippy (needs a dummy sidecar file at `src-tauri/binaries/whisper-backend-x86_64-unknown-linux-gnu`)

Release builds (`.github/workflows/build.yml`) trigger on `v*` tags, building for Windows x64, macOS ARM, and Linux x64.

## Architecture

### Sidecar Communication

The Tauri Rust layer (`src-tauri/src/lib.rs`) spawns the Python sidecar with `--port 0`, reads stdout until it prints `READY http://127.0.0.1:{port}`, then stores the port. The frontend communicates with the backend via Tauri `invoke` commands (`proxy_get`, `proxy_post`, `proxy_delete`) that use `ureq` to forward requests to `localhost:{port}`. File uploads for transcription bypass the proxy and go directly to `http://127.0.0.1:{port}/api/transcribe` via `fetch`.

### Backend API Endpoints (FastAPI)

- `GET /health` — health check
- `GET /api/models` — list available models with download status
- `POST /api/models/{size}/download` — start async model download
- `DELETE /api/models/{size}` — delete cached model
- `POST /api/transcribe` — upload audio files, returns `task_id` (multipart: `files`, `model`, `language`)
- `GET /api/task/{id}` — poll transcription progress
- `GET /api/download/{id}` — download result as .txt
- `DELETE /api/task/{id}` — cleanup task

Transcription is async: the POST returns immediately, frontend polls `GET /api/task/{id}` for progress.

### Frontend State

- Zustand store (`stores/transcription.ts`) holds selected files, model, and language
- TanStack Query handles API calls and polling (health check, task status, model list)
- The app uses a custom titlebar (decorations disabled in Tauri config) with drag-to-move, minimize, and close buttons

### Python Package

`src/whisper_cli/` is a Python package managed by `uv` (pyproject.toml). It has two entry points:
- `whisper_cli.cli:main` — standalone CLI (`whisper` command after pip install)
- `whisper_cli.__main__:main` — the sidecar server entry point for Tauri

Model cache and upload/result dirs are stored relative to the binary location (not in home directory) when running as a frozen PyInstaller binary.

## Version Management

Version is synced across three files on release: `src-tauri/tauri.conf.json`, `pyproject.toml`, `frontend/package.json`. The CI release workflow reads the version from the git tag and updates all three files before building.

## Frontend Conventions

- Path alias: `@` maps to `frontend/src/`
- UI components from shadcn/ui live in `frontend/src/components/ui/`
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin, not PostCSS)
- Tauri v2 APIs (`@tauri-apps/api`, `@tauri-apps/plugin-*`)
