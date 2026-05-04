import argparse

import uvicorn


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    print(f"READY http://{args.host}:{args.port}", flush=True)
    uvicorn.run(
        "whisper_cli.server:app",
        host=args.host,
        port=args.port,
        log_level="warning",
    )


if __name__ == "__main__":
    main()
