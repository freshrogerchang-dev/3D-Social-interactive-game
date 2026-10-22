"""Generate 20 Gemini TTS samples. Python standard library only."""
import argparse
import base64
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request
import wave

ROOT = Path(__file__).resolve().parent
STYLES = {
    "A": "像在公園和新朋友輕鬆聊天，語速自然，親切而不過度熱情。",
    "B": "溫和、放鬆，語速比平常稍慢，語意之間留一點空間，但保持連貫，不逐字拖長。",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--line", choices=[f"{i:02d}" for i in range(1, 11)])
    parser.add_argument("--style", choices=list(STYLES))
    parser.add_argument("--model", default="gemini-2.5-flash-preview-tts")
    parser.add_argument("--voice", default="Kore")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    lines = json.loads((ROOT / "lines.json").read_text(encoding="utf-8"))
    jobs = [(line, style) for line in lines for style in STYLES
            if (not args.line or line["id"] == args.line)
            and (not args.style or style == args.style)]
    if args.dry_run:
        for line, style in jobs:
            print(f'{line["id"]}_{style}.wav: {line["text"]} / {STYLES[style]}')
        return 0
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("尚未設定 GEMINI_API_KEY；未發出請求。", file=sys.stderr)
        return 1
    output = ROOT / "audio"
    output.mkdir(exist_ok=True)
    for line, style in jobs:
        target = output / f'{line["id"]}_{style}.wav'
        if target.exists():
            print(f"已存在，略過：{target.name}")
            continue
        prompt = (
            "請用自然的台灣華語說出以下台詞。你是公園裡一位語氣溫和的朋友。"
            "音量穩定，依語意自然停頓，不用播報腔，不用誇張卡通語氣。"
            "不要刻意模仿幼童。只說台詞，不朗讀指示，不加字。"
            f"本次說話方式：{STYLES[style]}\n台詞：{line['text']}"
        )
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": args.voice}
                }},
            },
        }
        url = ("https://generativelanguage.googleapis.com/v1beta/models/"
               + urllib.parse.quote(args.model, safe="") + ":generateContent")
        request = urllib.request.Request(
            url, data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": key},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                result = json.load(response)
            candidates = result.get("candidates", [])
            parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
            chunks = []
            for part in parts:
                inline = part.get("inlineData", {})
                if not inline.get("mimeType", "").startswith("audio/"):
                    continue
                mime = inline["mimeType"]
                if not mime.lower().startswith("audio/l16") or "rate=24000" not in mime:
                    raise ValueError(f"未支援的音訊格式：{mime}")
                chunks.append(base64.b64decode(inline["data"], validate=True))
            if not chunks:
                raise ValueError("服務未回傳音訊；請檢查模型支援或內容限制。")
            pcm = b"".join(chunks)
            if len(pcm) % 2:
                raise ValueError("PCM 音訊長度異常。")
            temp = target.with_suffix(".wav.tmp")
            with wave.open(str(temp), "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(24000)
                wav.writeframes(pcm)
            temp.replace(target)
            print(f"已生成：{target.name}")
        except urllib.error.HTTPError as error:
            print(f"生成中止：HTTP {error.code}。請檢查模型可用性、權限或配額。"
                  "已完成的音檔會保留。", file=sys.stderr)
            return 1
        except (OSError, ValueError, KeyError) as error:
            print(f"生成中止：{type(error).__name__}。請檢查連線或回傳音訊格式。"
                  "已完成的音檔會保留。", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
