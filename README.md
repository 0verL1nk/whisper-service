<p align="center">
  <img src="src-tauri/icons/icon.png" width="80" height="80" alt="Whisper">
</p>

<h1 align="center">Whisper</h1>

<p align="center">
  <strong>离线语音转文字桌面客户端</strong><br>
  基于 faster-whisper 的本地转录工具，无需联网，数据不离开本机
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/tag/0verL1nk/whisper-service?label=version" alt="version">
  <img src="https://img.shields.io/github/actions/workflow/status/0verL1nk/whisper-service/build.yml?branch=master&label=build" alt="build">
  <img src="https://img.shields.io/github/license/0verL1nk/whisper-service" alt="license">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="platform">
</p>

<p align="center">
  <a href="#-下载安装">下载安装</a> · <a href="#-功能">功能</a> · <a href="#-开发">开发</a> · <a href="#-技术栈">技术栈</a>
</p>

---

## ✨ 功能

- **完全离线** — 模型下载后无需联网，音频数据不离开本机
- **批量转录** — 拖入多个音频文件，一键开始转录
- **多语言支持** — 中文、英文、日语、韩语、法语、德语、西班牙语，或自动检测
- **多档位模型** — Tiny (75MB) 到 Large-v3 (3GB)，速度与精度自由选择
- **模型管理** — 内置模型下载、删除、进度显示、断点续传
- **结果导出** — 转录结果可导出为 .txt 文件
- **轻量原生** — Tauri 构建，安装包小，资源占用低

## 📸 截图

> TODO: 添加应用截图

## 📥 下载安装

前往 [Releases](https://github.com/0verL1nk/whisper-service/releases) 下载对应平台的安装包：

| 平台 | 架构 | 文件 |
|------|------|------|
| Windows | x86_64 | `Whisper_x64-setup.exe` |
| macOS | Apple Silicon | `Whisper_aarch64.dmg` |
| Linux | x86_64 | `Whisper_amd64.AppImage` |

首次打开后，进入「模型管理」页面下载一个模型即可使用。推荐 Large-v3 获得最佳中文效果。

## 🛠 开发

### 环境要求

- [Node.js](https://nodejs.org/) 22+ & [pnpm](https://pnpm.io/)
- [Rust](https://rustup.rs/) stable
- Python 3.13+ & [uv](https://docs.astral.sh/uv/)

### 启动开发环境

```bash
# 前端 + 后端同时启动
make dev
```

前端 Vite 开发服务器运行在 `http://localhost:5173`，后端 API 运行在 `http://localhost:8765`。

### 构建安装包

```bash
make build          # 完整构建
make build-debug    # 快速构建（不含打包）
```

### 代码检查

```bash
# 前端
cd frontend && pnpm lint && pnpm tsc -b

# Python
uv run --extra dev ruff check src/
uv run --extra dev ruff format --check src/

# Rust
cd src-tauri && cargo fmt --check && cargo clippy -- -D warnings
```

## 🏗 技术栈

| 层 | 技术 |
|---|------|
| 桌面壳 | [Tauri 2](https://v2.tauri.app/) (Rust) |
| 前端 | React 19 · TypeScript · [Tailwind CSS 4](https://tailwindcss.com/) · [shadcn/ui](https://ui.shadcn.com/) · [Zustand](https://zustand.docs.pmnd.rs/) |
| 后端 | Python 3.13 · [FastAPI](https://fastapi.tiangolo.com/) · [faster-whisper](https://github.com/SYSTRAN/faster-whisper) |
| 打包 | PyInstaller (sidecar) · Cargo (Tauri) |
| CI | GitHub Actions — lint + build + auto-release |

## ⚙️ 架构

```
┌─────────────────────────────────────────┐
│              Tauri Window               │
│  ┌───────────────────────────────────┐  │
│  │          React Frontend           │  │
│  │  Zustand store · TanStack Query   │  │
│  └──────────────┬────────────────────┘  │
│                 │ invoke / fetch         │
│  ┌──────────────┴────────────────────┐  │
│  │         Rust Proxy Layer          │  │
│  │   proxy_get / proxy_post / ...    │  │
│  └──────────────┬────────────────────┘  │
│                 │ ureq / http            │
│  ┌──────────────┴────────────────────┐  │
│  │     Python Sidecar (FastAPI)      │  │
│  │   faster-whisper · asyncio        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

- **Rust 层** 启动 Python sidecar（`--port 0`），读取 stdout 获取随机端口，前端通过 Tauri `invoke` 命令代理 HTTP 请求
- **Python 层** 提供 REST API（转录、模型管理），转录异步执行，前端轮询进度
- **前端** 负责文件拖放、模型选择、语言选择、结果展示

## 📄 License

[MIT](LICENSE)
