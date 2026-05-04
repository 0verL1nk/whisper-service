.PHONY: build dev sidecar frontend

# 本地开发：启动前端 + 后端
dev:
	cd frontend && pnpm dev &
	uv run python -m whisper_cli --port 8765

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

# 本地构建 Tauri 可执行文件
build: sidecar
	@mkdir -p src-tauri/binaries
	cp dist/whisper-backend.exe src-tauri/binaries/whisper-backend-x86_64-pc-windows-msvc.exe
	cd src-tauri && cargo tauri build

# 只构建不打包 (更快，用于测试)
build-debug: sidecar
	@mkdir -p src-tauri/binaries
	cp dist/whisper-backend.exe src-tauri/binaries/whisper-backend-x86_64-pc-windows-msvc.exe
	cd src-tauri && cargo tauri build --debug

# 清理
clean:
	rm -rf dist/ build/ src-tauri/target/ src-tauri/binaries/whisper-backend*
