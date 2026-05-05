import asyncio
import gc
import logging
import os
import shutil
import stat
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .transcriber import WhisperService, _get_app_dir, _get_model_cache_dir

logger = logging.getLogger(__name__)


def _data_dir(name: str) -> Path:
    p = _get_app_dir() / name
    p.mkdir(exist_ok=True)
    return p


def _robust_rmtree(path: Path):
    """Remove directory tree, handling read-only files on Windows."""

    def _on_error(func, path_str, exc_info):
        os.chmod(path_str, stat.S_IWRITE)
        func(path_str)

    if path.exists():
        shutil.rmtree(path, onerror=_on_error)


def _is_model_complete(cache: Path, name: str) -> bool:
    """Check if a model is fully downloaded by verifying model.bin exists."""
    model_dir = cache / f"models--Systran--faster-whisper-{name}"
    ctranslate2_dir = cache / f"ct2-faster-whisper-{name}"

    # Legacy: CTranslate2 model directory
    if ctranslate2_dir.exists() and (ctranslate2_dir / "model.bin").exists():
        return True

    refs_main = model_dir / "refs" / "main"
    if not refs_main.exists():
        return False

    # Read commit hash from refs/main, then verify model.bin in snapshot
    try:
        commit_hash = refs_main.read_text().strip()
    except OSError:
        return False
    if not commit_hash:
        return False

    return (model_dir / "snapshots" / commit_hash / "model.bin").exists()


def _cleanup_incomplete_models():
    """Clean up model directories that cannot be resumed.

    huggingface_hub writes refs/main before downloading, so incomplete
    downloads can be resumed. Only delete directories that have no refs/main
    (truly unrecoverable state). Keep ct2 dirs without model.bin as they
    cannot be resumed either.
    """
    cache = _get_model_cache_dir()
    for name in AVAILABLE_MODELS:
        model_dir = cache / f"models--Systran--faster-whisper-{name}"
        ctranslate2_dir = cache / f"ct2-faster-whisper-{name}"

        # No refs/main → huggingface_hub can't resume → delete
        if model_dir.exists() and not (model_dir / "refs" / "main").exists():
            _robust_rmtree(model_dir)

        # Legacy ct2 dir without model.bin → not usable, delete
        if ctranslate2_dir.exists() and not (ctranslate2_dir / "model.bin").exists():
            _robust_rmtree(ctranslate2_dir)


UPLOAD_DIR = _data_dir("uploads")
RESULT_DIR = _data_dir("results")
FRONTEND_DIR = _get_app_dir() / "frontend" / "dist"

AVAILABLE_MODELS = ["tiny", "base", "small", "medium", "large-v3"]

# Approximate model sizes in bytes for progress estimation
MODEL_SIZES = {
    "tiny": 75_000_000,
    "base": 145_000_000,
    "small": 500_000_000,
    "medium": 1_500_000_000,
    "large-v3": 3_000_000_000,
}

app = FastAPI(title="Whisper 语音转文字")

_cleanup_incomplete_models()
logger.info("Server initialized")

_download_state: dict[str, dict] = {}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/models")
async def list_models():
    cache = _get_model_cache_dir()
    models = []
    for name in AVAILABLE_MODELS:
        downloaded = _is_model_complete(cache, name)
        state = _download_state.get(name)
        progress = 0
        status = "idle"
        if state:
            status = state.get("status", "idle")
            progress = state.get("progress", 0)
        models.append({"name": name, "downloaded": downloaded, "status": status, "progress": progress})
    return {"models": models}


@app.post("/api/models/{model_size}/download")
async def download_model(model_size: str):
    if model_size not in AVAILABLE_MODELS:
        raise HTTPException(400, f"不支持的模型: {model_size}")
    state = _download_state.get(model_size)
    if state and state.get("status") == "downloading":
        raise HTTPException(409, "正在下载中")

    _download_state[model_size] = {"status": "downloading", "progress": 0}
    logger.info("Model download started: %s", model_size)
    asyncio.create_task(_do_download(model_size))
    return {"status": "downloading"}


def _get_dir_size(path: Path) -> int:
    total = 0
    if path.exists():
        for f in path.rglob("*"):
            if f.is_file():
                total += f.stat().st_size
    return total


async def _do_download(model_size: str):
    cache = _get_model_cache_dir()
    expected = MODEL_SIZES.get(model_size, 1_000_000_000)
    loop = asyncio.get_event_loop()

    # Monitor progress while downloading
    model_dir_name = f"models--Systran--faster-whisper-{model_size}"
    monitor_started = False

    async def _monitor_progress():
        nonlocal monitor_started
        monitor_started = True
        while _download_state.get(model_size, {}).get("status") == "downloading":
            current_size = _get_dir_size(cache / model_dir_name)
            pct = min(int((current_size / expected) * 100), 99)
            _download_state[model_size]["progress"] = pct
            await asyncio.sleep(1)

    monitor = asyncio.create_task(_monitor_progress())

    def _download():
        from faster_whisper import WhisperModel

        WhisperModel(model_size, device="cpu", compute_type="int8", download_root=str(cache))

    try:
        await loop.run_in_executor(None, _download)
        _download_state[model_size] = {"status": "done", "progress": 100}
        logger.info("Model download complete: %s", model_size)
    except Exception as e:
        _download_state[model_size] = {"status": "error", "progress": 0, "error": str(e)}
        logger.error("Model download failed: %s — %s", model_size, e)
    finally:
        monitor.cancel()


@app.delete("/api/models/{model_size}")
async def delete_model(model_size: str):
    if model_size not in AVAILABLE_MODELS:
        raise HTTPException(400, f"不支持的模型: {model_size}")
    logger.info("Model delete: %s", model_size)
    _models.pop(model_size, None)
    gc.collect()
    await asyncio.sleep(0.5)
    cache = _get_model_cache_dir()
    for pattern in [f"models--Systran--faster-whisper-{model_size}", f"ct2-faster-whisper-{model_size}"]:
        d = cache / pattern
        if d.exists():
            # Delete refs/main first so model shows as not downloaded
            refs_main = d / "refs" / "main"
            if refs_main.exists():
                refs_main.unlink(missing_ok=True)
            shutil.rmtree(d, ignore_errors=True)
    _download_state.pop(model_size, None)
    return {"ok": True}


_models: dict[str, WhisperService] = {}
_tasks: dict[str, dict] = {}


def get_model(model_size: str) -> WhisperService:
    if model_size not in _models:
        _models[model_size] = WhisperService(model_size=model_size)
    return _models[model_size]


@app.post("/api/transcribe")
async def transcribe(
    files: list[UploadFile] = File(...),  # noqa: B008
    model: str = Form("large-v3"),  # noqa: B008
    language: str = Form(""),  # noqa: B008
):
    if not files:
        raise HTTPException(400, "请上传音频文件")

    task_id = uuid.uuid4().hex[:12]
    lang = language or None
    items = []

    for f in files:
        ext = Path(f.filename).suffix or ".mp3"
        saved_path = UPLOAD_DIR / f"{uuid.uuid4().hex[:8]}{ext}"
        content = await f.read()
        saved_path.write_bytes(content)
        items.append({"filename": f.filename, "path": str(saved_path)})

    _tasks[task_id] = {
        "id": task_id,
        "status": "processing",
        "total": len(items),
        "done": 0,
        "results": [
            {"filename": item["filename"], "text": None, "error": None, "status": "pending", "progress": 0}
            for item in items
        ],
        "model": model,
    }

    asyncio.create_task(_run_transcribe(task_id, items, model, lang))
    logger.info("Transcribe task %s: %d files, model=%s", task_id, len(items), model)
    return {"task_id": task_id, "total": len(items)}


async def _run_transcribe(task_id: str, items: list[dict], model_size: str, language: str | None):
    svc = get_model(model_size)
    loop = asyncio.get_event_loop()

    for i, item in enumerate(items):
        _tasks[task_id]["results"][i]["status"] = "processing"

        def make_cb(idx: int):
            def cb(pct: int):
                _tasks[task_id]["results"][idx]["progress"] = pct

            return cb

        try:
            text = await loop.run_in_executor(None, svc.transcribe_file, item["path"], language, make_cb(i))
            _tasks[task_id]["results"][i].update({"text": text, "error": None, "status": "done", "progress": 100})
        except Exception as e:
            _tasks[task_id]["results"][i].update({"text": None, "error": str(e), "status": "error", "progress": 0})
            logger.error("Transcribe failed %s — %s: %s", task_id, item["filename"], e)
        finally:
            _tasks[task_id]["done"] += 1

    _tasks[task_id]["status"] = "done"
    logger.info("Transcribe task %s complete", task_id)


@app.get("/api/task/{task_id}")
async def task_status(task_id: str):
    if task_id not in _tasks:
        raise HTTPException(404, "任务不存在")
    return _tasks[task_id]


@app.get("/api/download/{task_id}")
async def download_result(task_id: str):
    if task_id not in _tasks or _tasks[task_id]["status"] != "done":
        raise HTTPException(404, "结果未就绪")

    results = _tasks[task_id]["results"]
    content = "\n\n".join(
        f"=== {r['filename']} ===\n{r['text']}" if r["text"] else f"=== {r['filename']} ===\n[错误] {r['error']}"
        for r in results
    )
    out_path = RESULT_DIR / f"{task_id}.txt"
    out_path.write_text(content, encoding="utf-8")
    return FileResponse(out_path, filename=f"transcription_{task_id}.txt", media_type="text/plain")


@app.delete("/api/task/{task_id}")
async def delete_task(task_id: str):
    _tasks.pop(task_id, None)
    return {"ok": True}


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
