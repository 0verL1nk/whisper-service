import argparse
import sys
from pathlib import Path

from .transcriber import transcribe

MODELS = ["tiny", "base", "small", "medium", "large-v3"]


def main():
    parser = argparse.ArgumentParser(description="Whisper 语音转文字 CLI")
    parser.add_argument("audio", type=Path, help="音频文件路径 (mp3/wav/m4a 等)")
    parser.add_argument("-m", "--model", default="large-v3", choices=MODELS, help="模型大小 (默认: large-v3)")
    parser.add_argument("-l", "--language", default=None, help="语言 (如 zh, en)，不指定则自动检测")
    parser.add_argument("-o", "--output", default=None, help="输出文件路径，不指定则打印到终端")
    parser.add_argument("--cpu", action="store_true", help="强制使用 CPU")
    args = parser.parse_args()

    if not args.audio.exists():
        print(f"文件不存在: {args.audio}", file=sys.stderr)
        sys.exit(1)

    device = "cpu" if args.cpu else "cuda"
    compute_type = "int8" if args.cpu else "int8_float16"

    print(f"加载模型 {args.model} (device={device})...", file=sys.stderr)
    text = transcribe(
        args.audio,
        model_size=args.model,
        language=args.language,
        device=device,
        compute_type=compute_type,
    )

    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
        print(f"已保存到 {args.output}", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()
