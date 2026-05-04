import asyncio
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .transcriber import WhisperService

UPLOAD_DIR = Path("uploads")
RESULT_DIR = Path("results")
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
UPLOAD_DIR.mkdir(exist_ok=True)
RESULT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Whisper 语音转文字")

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
        "results": [],
        "model": model,
    }

    asyncio.create_task(_run_transcribe(task_id, items, model, lang))
    return {"task_id": task_id, "total": len(items)}


async def _run_transcribe(task_id: str, items: list[dict], model_size: str, language: str | None):
    svc = get_model(model_size)
    loop = asyncio.get_event_loop()

    for item in items:
        try:
            text = await loop.run_in_executor(None, svc.transcribe_file, item["path"], language)
            _tasks[task_id]["results"].append({"filename": item["filename"], "text": text, "error": None})
        except Exception as e:
            _tasks[task_id]["results"].append({"filename": item["filename"], "text": None, "error": str(e)})
        finally:
            _tasks[task_id]["done"] += 1

    _tasks[task_id]["status"] = "done"


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
