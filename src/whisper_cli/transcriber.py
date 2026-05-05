import sys
from pathlib import Path

from faster_whisper import WhisperModel


def _get_app_dir() -> Path:
    """Return the directory where the sidecar binary lives (== install dir)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


def _get_model_cache_dir() -> Path:
    """Model cache inside install dir, not ~/.cache/huggingface."""
    p = _get_app_dir() / "models"
    p.mkdir(exist_ok=True)
    return p


class WhisperService:
    def __init__(self, model_size: str = "large-v3", device: str = "cuda", compute_type: str = "int8_float16"):
        cache = _get_model_cache_dir()
        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            download_root=str(cache),
        )

    def transcribe_file(
        self,
        audio_path: str | Path,
        language: str | None = None,
        progress_callback: object = None,
    ) -> str:
        segments, info = self.model.transcribe(str(audio_path), language=language, beam_size=5)
        duration = info.duration
        text_parts: list[str] = []
        for seg in segments:
            text_parts.append(seg.text)
            if duration > 0 and callable(progress_callback):
                pct = min(int((seg.end / duration) * 100), 99)
                progress_callback(pct)
        return "".join(text_parts).strip()


def transcribe(
    audio_path: str | Path,
    model_size: str = "large-v3",
    language: str | None = None,
    device: str = "cuda",
    compute_type: str = "int8_float16",
) -> str:
    svc = WhisperService(model_size=model_size, device=device, compute_type=compute_type)
    return svc.transcribe_file(audio_path, language)
