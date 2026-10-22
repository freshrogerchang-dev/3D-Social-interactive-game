"""Apply the user-approved Zephyr profile offline; never calls a speech API."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parent


def apply_profile(source, output, profile):
    source = Path(source).resolve()
    output = Path(output).resolve()
    if source == output:
        raise ValueError("請保留原始音檔，輸入與輸出不能使用相同路徑。")
    if not shutil.which("ffmpeg"):
        raise ValueError("需要 ffmpeg 與 rubberband 濾鏡；本工具不會呼叫語音 API。")
    ratio = 2 ** (profile["pitchSemitones"] / 12)
    audio_filter = (
        f'rubberband=tempo={profile["tempo"]}:pitch={ratio}:'
        f'formant={profile["formant"]}:pitchq={profile["pitchQuality"]},'
        f'alimiter=limit={profile["limiter"]}:level=false'
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    signature = {
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "profile": profile,
    }
    stamp = output.with_suffix(".profile.json")
    if output.exists() and stamp.exists():
        if json.loads(stamp.read_text(encoding="utf-8")) == signature:
            print(f"設定相同，沿用：{output.name}")
            return
    with tempfile.TemporaryDirectory(dir=output.parent) as temp:
        staged = Path(temp) / "processed.wav"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(source), "-af", audio_filter,
            "-c:a", "pcm_s16le", str(staged),
        ], check=True)
        with wave.open(str(staged)) as wav:
            if not wav.getnframes():
                raise ValueError("後製結果沒有音訊。")
        staged.replace(output)
    stamp.write_text(json.dumps(signature, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"已套用 {profile['id']}：{output.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    sources = sorted(args.input_dir.glob("*.wav"))
    if not sources:
        parser.error("輸入資料夾沒有 WAV 音檔。")
    profile = json.loads((ROOT / "voice-profile.json").read_text(encoding="utf-8"))
    for source in sources:
        apply_profile(source, args.output_dir / source.name, profile)


if __name__ == "__main__":
    main()
