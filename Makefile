.PHONY: build dev sidecar frontend check lint typecheck test clean tag

# === 开发 ===

# 启动前端 + 后端
dev:
	cd frontend && pnpm dev &
	uv run python -m whisper_cli --port 8765

# === 构建 ===

# 构建前端
frontend:
	cd frontend && pnpm install && pnpm build

# 构建 Python sidecar
sidecar: frontend
	uv sync --extra build
	uv run pyinstaller --onefile --noconsole \
		--name whisper-backend \
		--hidden-import=whisper_cli \
		--hidden-import=whisper_cli.__main__ \
		--hidden-import=whisper_cli.server \
		--hidden-import=whisper_cli.transcriber \
		--hidden-import=uvicorn \
		--hidden-import=uvicorn.logging \
		--hidden-import=uvicorn.loops \
		--hidden-import=uvicorn.loops.auto \
		--hidden-import=uvicorn.protocols \
		--hidden-import=uvicorn.protocols.http \
		--hidden-import=uvicorn.protocols.http.auto \
		--hidden-import=uvicorn.protocols.websockets \
		--hidden-import=uvicorn.protocols.websockets.auto \
		--hidden-import=uvicorn.lifespan \
		--hidden-import=uvicorn.lifespan.on \
		--hidden-import=python_multipart \
		src/whisper_cli/__main__.py

# 本地构建 Tauri 安装包
build: sidecar
	@mkdir -p src-tauri/binaries
	cp dist/whisper-backend.exe src-tauri/binaries/whisper-backend-x86_64-pc-windows-msvc.exe
	cd src-tauri && cargo tauri build

# 快速构建 (不打包, 用于测试)
build-debug: sidecar
	@mkdir -p src-tauri/binaries
	cp dist/whisper-backend.exe src-tauri/binaries/whisper-backend-x86_64-pc-windows-msvc.exe
	cd src-tauri && cargo tauri build --debug

# === 检查 ===

# 运行全部检查 (lint + typecheck + test)
check: lint typecheck test

# Lint: 前端 + 后端 + Rust
lint:
	cd frontend && pnpm lint
	uv run ruff check src/
	uv run ruff format --check src/
	cd src-tauri && cargo fmt --check && cargo clippy -- -D warnings

# TypeScript / Rust 类型检查
typecheck:
	cd frontend && pnpm tsc -b
	cd src-tauri && cargo check

# 测试 (如有)
test:
	@echo "暂无测试"

# === 版本管理 ===

# 打 patch tag 并推送 (用法: make tag)
tag:
	@CURRENT=$$(git tag --sort=-v:refname | head -1 | sed 's/v//') && \
	Major=$$(echo $$CURRENT | cut -d. -f1) && \
	Minor=$$(echo $$CURRENT | cut -d. -f2) && \
	Patch=$$(echo $$CURRENT | cut -d. -f3) && \
	NEXT="v$$Major.$$Minor.$$((Patch + 1))" && \
	echo "Tagging $$NEXT..." && \
	git tag $$NEXT && \
	git push origin master --tags

# === 清理 ===

clean:
	rm -rf dist/ build/ src-tauri/target/ src-tauri/binaries/whisper-backend*
