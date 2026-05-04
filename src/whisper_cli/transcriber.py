from pathlib import Path

from faster_whisper import WhisperModel


class WhisperService:
    def __init__(self, model_size: str = "large-v3", device: str = "cuda", compute_type: str = "int8_float16"):
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe_file(self, audio_path: str | Path, language: str | None = None) -> str:
        segments, _info = self.model.transcribe(str(audio_path), language=language, beam_size=5)
        return "".join(seg.text for seg in segments).strip()


def transcribe(
    audio_path: str | Path,
    model_size: str = "large-v3",
    language: str | None = None,
    device: str = "cuda",
    compute_type: str = "int8_float16",
) -> str:
    svc = WhisperService(model_size=model_size, device=device, compute_type=compute_type)
    return svc.transcribe_file(audio_path, language)
