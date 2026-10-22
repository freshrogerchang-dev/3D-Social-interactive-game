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
    parser.add_argument("--voice", default="Puck")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    lines = json.loads((ROOT / "lines.json").read_text(encoding="utf-8"))
    jobs = [(line, style) for line in lines for style in STYLES
            if (not args.line or line["id"] == args.line)
            and (not args.style or style == args.style)]
    if args.dry_run:
        for line, style in jobs:
            print(f'{line["id"]}_{style}.wav: {line["text"]} / voice={args.voice} / {STYLES[style]}')
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
        # Keep stage directions short: age/gender impressions require listening.
        delivery = {
            "A": "bright, youthful male voice; friendly and conversational",
            "B": "bright, youthful male voice; gentle, slightly slower and connected",
        }[style]
        prompt = (
            f"Read aloud in natural Taiwanese Mandarin, with a {delivery}. "
            "Speak only the following dialogue.\\n"
            f"{line['text']}"
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
                inline = part.get("inlineData", part.get("inline_data", {}))
                if not inline.get("mimeType", inline.get("mime_type", "")).lower().startswith("audio/"):
                    continue
                mime = inline.get("mimeType", inline.get("mime_type", ""))
                mime = mime.lower().replace(" ", "")
                if not mime.lower().startswith("audio/l16") or "rate=24000" not in mime:
                    raise ValueError(f"未支援的音訊格式：{mime}")
                chunks.append(base64.b64decode(inline["data"], validate=True))
            if not chunks:
                metadata = {
                    "voice": args.voice,
                    "style": style,
                    "candidate_count": len(candidates),
                    "part_count": len(parts),
                    "audio_part_count": len(chunks),
                }
                print("Response metadata: " + json.dumps(metadata), flush=True)
                finish = candidates[0].get("finishReason", "unknown") if candidates else "no candidates"
                block = result.get("promptFeedback", {}).get("blockReason", "none")
                raise ValueError(f"服務未回傳音訊；finishReason={finish}, blockReason={block}")
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
            detail = ""
            try:
                problem = json.loads(error.read(16384)).get("error", {})
                detail = str(problem.get("message", ""))[:1000].replace(key, "[REDACTED]")
            except (ValueError, AttributeError):
                pass
            print(f"生成中止：HTTP {error.code}。{detail} 請檢查模型可用性、權限或配額。"
                  "已完成的音檔會保留。", file=sys.stderr)
            return 1
        except (OSError, ValueError, KeyError) as error:
            detail = str(error).replace(key, "[REDACTED]")[:1000]
            print(f"生成中止：{type(error).__name__}：{detail}。請檢查連線或回傳音訊格式。"
                  "已完成的音檔會保留。", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
