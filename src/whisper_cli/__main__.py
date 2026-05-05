import argparse
import logging
import os
import socket
import sys
from datetime import datetime
from pathlib import Path

import uvicorn


def _get_app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


def _setup_logging(app_dir: Path):
    log_dir = app_dir / "logs"
    log_dir.mkdir(exist_ok=True)

    log_file = log_dir / f"{datetime.now().strftime('%Y-%m-%d')}.log"

    handlers = [logging.FileHandler(log_file, encoding="utf-8")]
    # Also keep stdout for Tauri to read READY line
    handlers.append(logging.StreamHandler(sys.stdout))

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
        handlers=handlers,
    )


def find_free_port(start: int = 8765, end: int = 8799) -> int:
    for port in range(start, end):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("127.0.0.1", port))
                return port
        except OSError:
            continue
    raise RuntimeError(f"No available port in range {start}-{end}")


def main():
    app_dir = _get_app_dir()
    data_dir = app_dir / "data"
    models_dir = app_dir / "models"
    data_dir.mkdir(exist_ok=True)
    models_dir.mkdir(exist_ok=True)
    os.environ["HF_HOME"] = str(data_dir / "hf")
    os.environ["HF_HUB_CACHE"] = str(models_dir)
    os.environ["XDG_CACHE_HOME"] = str(data_dir / "cache")
    os.environ["TEMP"] = str(data_dir / "tmp")
    (data_dir / "tmp").mkdir(exist_ok=True)

    _setup_logging(app_dir)

    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=0)
    args = parser.parse_args()

    port = args.port if args.port else find_free_port()
    print(f"READY http://{args.host}:{port}", flush=True)
    logging.info("Backend started on port %s", port)

    uvicorn.run(
        "whisper_cli.server:app",
        host=args.host,
        port=port,
        log_level="warning",
        log_config=None,
    )


if __name__ == "__main__":
    main()
