"""Build narration and measured section timings using the Edge TTS CLI."""

import argparse
import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
video = root / "docs/videos/01-game-plan"
cache = root / ".cache/game-plan"
cache.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument("--dry-run", action="store_true")
options = parser.parse_args()
sections = re.findall(r"^## (.+)\n\n(.+)$", (video / "script.md").read_text(), re.M)
if not sections:
    raise ValueError("Expected narrated sections")
print(
    f"{len(sections)} chapters, {sum(len(text.split()) for _, text in sections)} words"
)
if options.dry_run:
    raise SystemExit()
timings = []
for i, (heading, para) in enumerate(sections):
    mp3 = cache / f"part-{i}.mp3"
    subprocess.run(
        [
            "edge-tts",
            "--voice",
            "en-US-AvaMultilingualNeural",
            "--rate",
            "+4%",
            "--text",
            para,
            "--write-media",
            str(mp3),
            "--write-subtitles",
            str(cache / f"part-{i}.srt"),
        ],
        check=True,
    )
    duration = float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                str(mp3),
            ]
        )
    )
    timings.append(dict(heading=heading, seconds=duration, text=para))
(cache / "timings.json").write_text(json.dumps(timings, indent=2))
(cache / "audio.txt").write_text(
    "".join(f"file 'part-{i}.mp3'\n" for i in range(len(sections)))
)
subprocess.run(
    [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(cache / "audio.txt"),
        "-c:a",
        "copy",
        str(video / "01-game-plan.mp3"),
    ],
    check=True,
)
