"""Resume offline game TTS generation with a durable 50-request daily cap."""
import argparse
import base64
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import wave
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
MAX_DAILY_REQUESTS = 50
MAX_ATTEMPTS_PER_SOURCE = 3
BRANCH = "codex/daily-game-voice"
BOYS = {"xiaoan", "xiaoyu", "xiaozhe"}
GIRLS = {"xiaoqing", "xiaoyun"}


def read_json(path, default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    staged = path.with_suffix(path.suffix + ".tmp")
    staged.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    staged.replace(path)


def digest(value):
    if not isinstance(value, bytes):
        value = json.dumps(value, ensure_ascii=False, sort_keys=True).encode()
    return hashlib.sha256(value).hexdigest()


def quota_day():
    # Gemini RPD resets at midnight Pacific, not the runner's UTC midnight.
    return datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()


def preflight():
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("需要 ffmpeg／ffprobe；尚未呼叫 API。")
    filters = subprocess.run(
        ["ffmpeg", "-hide_banner", "-filters"], check=True, capture_output=True, text=True,
    ).stdout
    if "rubberband" not in filters:
        raise RuntimeError("需要 rubberband 濾鏡；尚未呼叫 API。")


class NoAudioError(RuntimeError):
    def __init__(self, payload):
        super().__init__("NO_AUDIO")
        candidates = payload.get("candidates", [])
        candidate = candidates[0] if candidates else {}
        def label(value):
            return value if isinstance(value, str) and re.fullmatch(r"[A-Z_]{1,64}", value) else "UNKNOWN"
        self.diagnostics = {
            "finishReason": label(candidate.get("finishReason")),
            "blockReason": label(payload.get("promptFeedback", {}).get("blockReason")),
            "candidateCount": len(candidates),
        }


def synthesize(item, key):
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/"
        + urllib.parse.quote(item["model"], safe="") + ":generateContent",
        data=json.dumps({
            "contents": [{"parts": [{"text": item["prompt"]}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": item["voice"]},
                }},
            },
        }).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        # Never print the provider's raw error body or any credential.
        raise RuntimeError(f"HTTP_{error.code}") from None
    except (OSError, ValueError):
        raise RuntimeError("NETWORK_OR_JSON_ERROR") from None
    candidates = payload.get("candidates", [])
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    chunks = []
    rate = None
    for part in parts:
        inline = part.get("inlineData", part.get("inline_data", {}))
        mime = inline.get("mimeType", inline.get("mime_type", "")).lower().replace(" ", "")
        if not mime.startswith("audio/"):
            continue
        match = re.search(r"rate=(\d+)", mime)
        if not mime.startswith("audio/l16") or not match:
            raise RuntimeError("UNSUPPORTED_AUDIO_FORMAT")
        current_rate = int(match.group(1))
        if not 8000 <= current_rate <= 48000 or (rate is not None and rate != current_rate):
            raise RuntimeError("INVALID_AUDIO_RATE")
        rate = current_rate
        try:
            chunks.append(base64.b64decode(inline["data"], validate=True))
        except (ValueError, KeyError):
            raise RuntimeError("INVALID_AUDIO_DATA") from None
    pcm = b"".join(chunks)
    if rate is None or not pcm or len(pcm) % 2:
        raise NoAudioError(payload)
    return pcm, rate


def encode(source, target, profile):
    if profile:
        ratio = 2 ** (profile["pitchSemitones"] / 12)
        filters = (
            f'rubberband=tempo={profile["tempo"]}:pitch={ratio}:'
            f'formant={profile["formant"]}:pitchq={profile["pitchQuality"]},'
            f'alimiter=limit={profile["limiter"]}:level=false'
        )
    else:
        filters = "loudnorm=I=-20:TP=-3"
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=target.parent) as temp:
        staged = Path(temp) / "clip.m4a"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
            "-af", filters, "-ar", "24000", "-ac", "1", "-c:a", "aac",
            "-b:a", "40k", "-movflags", "+faststart", str(staged),
        ], check=True)
        probe = subprocess.run([
            "ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
            "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", str(staged),
        ], check=True, capture_output=True, text=True)
        info = json.loads(probe.stdout)
        stream = info["streams"][0]
        if (stream["codec_name"] != "aac" or stream["sample_rate"] != "24000"
                or stream["channels"] != 1 or float(info["format"]["duration"]) <= 0):
            raise RuntimeError("INVALID_ENCODED_AUDIO")
        staged.replace(target)


def git_checkpoint(root):
    def git(*args, **kwargs):
        return subprocess.run(["git", *args], cwd=root, check=True, **kwargs)
    branch = git("branch", "--show-current", capture_output=True, text=True).stdout.strip()
    if branch != BRANCH:
        raise RuntimeError("只能保存到專用語音分支，不能更新發布分支。")
    paths = [name for name in ["voice-progress.json", "voice-source", "public/assets/voice"]
             if (root / name).exists()]
    git("add", "--", *paths)
    diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=root)
    if diff.returncode == 0:
        return
    if diff.returncode != 1:
        raise RuntimeError("GIT_DIFF_FAILED")
    git("commit", "-m", "chore: checkpoint daily voice generation")
    git("push", "origin", f"HEAD:refs/heads/{BRANCH}")


class Batch:
    def __init__(self, root=ROOT, checkpoint=None, request=synthesize, encoder=encode,
                 sleeper=time.sleep, today=quota_day, check_tools=preflight):
        self.root = Path(root)
        self.queue = read_json(self.root / "tools/voice/queue.json")["lines"]
        self.presets = read_json(self.root / "tools/voice/voice-presets.json")
        self.girl = read_json(self.root / "tools/voice/voice-profile.json")
        self.boy = read_json(self.root / "tools/voice/boy-profile.json")
        self.state_path = self.root / "voice-progress.json"
        self.state = read_json(self.state_path, {"version": 1, "days": {}, "attempts": {}})
        if self.state.get("version") != 1 or not isinstance(self.state.get("days"), dict):
            raise RuntimeError("進度資料格式錯誤，不自動重設每日預算。")
        self.manifest_path = self.root / "public/assets/voice/manifest.json"
        self.manifest = read_json(self.manifest_path, {"files": [], "rendered": {}})
        self.manifest.setdefault("rendered", {})
        self.checkpoint = checkpoint or (lambda: None)
        self.request, self.encoder, self.sleep = request, encoder, sleeper
        self.today, self.check_tools = today, check_tools
        self.state.setdefault("sourceErrors", {})
        self.items = []
        for line in self.queue:
            if not re.fullmatch(r"assets/voice/[a-z]+-[0-9a-f]{8}\.m4a", line["file"]):
                raise RuntimeError("音檔路徑不符合遊戲規則。")
            preset = self.presets["speakers"][line["speaker"]]
            profile = self.boy if line["speaker"] in BOYS else (
                self.girl if line["speaker"] in GIRLS else None)
            if profile and profile["voice"] != preset["voice"]:
                profile = None
            item = {**line, "model": self.presets["model"], "voice": preset["voice"],
                    "prompt": "Read aloud in natural Taiwanese Mandarin, with a "
                    + preset["delivery"] + ". Speak only the following dialogue.\n" + line["text"],
                    "profile": profile}
            item["sourceKey"] = digest({key: item[key] for key in ["model", "voice", "prompt"]})
            item["renderKey"] = digest({"sourceKey": item["sourceKey"], "profile": profile,
                                         "encoding": "aac-40k-24000-mono-v1"})
            self.items.append(item)

        # Preserve an error from the older state format without resetting budgets.
        previous = self.state.get("lastError", {})
        for item in self.items:
            if item["file"] == previous.get("file"):
                self.state["sourceErrors"].setdefault(item["sourceKey"], previous)

    def target(self, item):
        return self.root / "public" / item["file"]

    def raw(self, item):
        return self.root / "voice-source" / (item["sourceKey"] + ".wav")

    def ready(self, item):
        record = self.manifest["rendered"].get(item["file"], {})
        target = self.target(item)
        return (record.get("renderKey") == item["renderKey"] and target.exists()
                and record.get("sha256") == digest(target.read_bytes()))

    def budget(self):
        day = self.state["days"].get(self.today(), {})
        used = day.get("requests", 0)
        if not isinstance(used, int) or used < 0:
            raise RuntimeError("每日預算紀錄損壞，不呼叫 API。")
        return max(0, MAX_DAILY_REQUESTS - used)

    def plan(self):
        ready = [item for item in self.items if self.ready(item)]
        blocked = [item for item in self.items if not self.ready(item) and not self.raw(item).exists()
                   and self.state["attempts"].get(item["sourceKey"], 0) >= MAX_ATTEMPTS_PER_SOURCE]
        return {"total": len(self.items), "complete": len(ready),
                "remaining": len(self.items) - len(ready), "needsReview": len(blocked),
                "status": self.state.get("status", "planned"),
                "halted": self.state.get("halted"),
                "lastError": self.state.get("lastError"),
                "unresolvedErrors": [self.state["sourceErrors"][source] for source in dict.fromkeys(
                    item["sourceKey"] for item in self.items if not self.ready(item))
                    if source in self.state["sourceErrors"]],
                "cachedPending": sum(not self.ready(item) and self.raw(item).exists()
                                     for item in self.items),
                "quotaDayPacific": self.today(), "requestsRemainingToday": self.budget(),
                "bySpeaker": {speaker: {
                    "total": sum(item["speaker"] == speaker for item in self.items),
                    "complete": sum(item["speaker"] == speaker for item in ready),
                } for speaker in self.presets["speakers"]}}

    def persist(self, status=None):
        if status:
            self.state["status"] = status
        self.state["summary"] = self.plan()
        self.state["updatedAt"] = datetime.now(timezone.utc).isoformat()
        save_json(self.state_path, self.state)
        self.manifest["files"] = [item["file"] for item in self.items if self.ready(item)]
        self.manifest["generator"] = "tools/voice/daily_generate.py"
        save_json(self.manifest_path, self.manifest)

    def run(self, key):
        if self.state.get("halted") or not self.plan()["remaining"]:
            return self.plan()
        self.check_tools()  # Must succeed before reserving or spending a request.
        requests_this_run = 0
        failed_sources_this_run = set()
        for item in self.items:
            if self.ready(item) or item["sourceKey"] in failed_sources_this_run:
                continue
            raw = self.raw(item)
            if not raw.exists():
                if self.state["attempts"].get(item["sourceKey"], 0) >= MAX_ATTEMPTS_PER_SOURCE:
                    continue
                if not key or not self.budget():
                    break
                if requests_this_run:
                    self.sleep(25)
                # Push the reservation BEFORE the HTTP request. A restart or manual
                # re-run on the same Pacific date cannot reset the paid-request cap.
                day = self.state["days"].setdefault(self.today(), {"requests": 0})
                day["requests"] += 1
                self.state["attempts"][item["sourceKey"]] = (
                    self.state["attempts"].get(item["sourceKey"], 0) + 1)
                self.persist("generating")
                self.checkpoint()  # If the push fails, never issue the request.
                requests_this_run += 1
                try:
                    pcm, rate = self.request(item, key)
                    raw.parent.mkdir(parents=True, exist_ok=True)
                    with wave.open(str(raw), "wb") as wav:
                        wav.setnchannels(1)
                        wav.setsampwidth(2)
                        wav.setframerate(rate)
                        wav.writeframes(pcm)
                    self.state.pop("lastError", None)
                    self.persist("rendering")
                    self.checkpoint()  # Preserve the source even if encoding fails.
                except (RuntimeError, OSError, ValueError) as error:
                    reason = str(error)
                    if not re.fullmatch(r"HTTP_\d{3}|NO_AUDIO|NETWORK_OR_JSON_ERROR|"
                                        r"UNSUPPORTED_AUDIO_FORMAT|INVALID_AUDIO_RATE|INVALID_AUDIO_DATA",
                                        reason):
                        reason = "API_OR_SOURCE_SAVE_FAILED"
                    failure = {"file": item["file"], "reason": reason}
                    if isinstance(error, NoAudioError):
                        failure["diagnostics"] = error.diagnostics
                    self.state["lastError"] = failure
                    self.state["sourceErrors"][item["sourceKey"]] = failure
                    if reason == "NO_AUDIO":
                        failed_sources_this_run.add(item["sourceKey"])
                        self.persist("active_with_errors")
                        self.checkpoint()
                        continue  # Try other dialogue; never retry this source in this run.
                    if reason in {"HTTP_401", "HTTP_402", "HTTP_403", "HTTP_404"}:
                        self.state["halted"] = reason
                    self.persist("paused_after_error")
                    self.checkpoint()
                    break  # No automatic retry or paid-model fallback.
            try:
                self.encoder(raw, self.target(item), item["profile"])
                self.manifest["rendered"][item["file"]] = {
                    "voice": item["voice"], "profile": item["profile"],
                    "sourceKey": item["sourceKey"], "renderKey": item["renderKey"],
                    "sha256": digest(self.target(item).read_bytes()),
                }
                self.state.pop("lastError", None)
                self.state["sourceErrors"].pop(item["sourceKey"], None)
                self.persist("active")
                self.checkpoint()
            except (RuntimeError, OSError, ValueError, subprocess.SubprocessError):
                self.state["lastError"] = {"file": item["file"], "reason": "ENCODING_FAILED"}
                self.persist("paused_after_error")
                self.checkpoint()
                break
        plan = self.plan()
        if not plan["remaining"]:
            self.persist("complete")
        elif not key:
            self.persist("waiting_for_key")
        elif self.state.get("status") != "paused_after_error":
            self.persist("needs_review" if plan["needsReview"] == plan["remaining"]
                         else "daily_limit_reached")
        self.checkpoint()
        return self.plan()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", action="store_true")
    parser.add_argument("--checkpoint", action="store_true")
    parser.add_argument("--github-output", type=Path)
    args = parser.parse_args()
    batch = Batch(checkpoint=(lambda: git_checkpoint(ROOT)) if args.checkpoint else None)
    if not args.plan and not args.checkpoint:
        parser.error("實際 API 生成必須使用 --checkpoint，先保存預算再發出請求。")
    report = batch.plan() if args.plan else batch.run(os.environ.get("GEMINI_API_KEY"))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.github_output:
        with args.github_output.open("a", encoding="utf-8") as output:
            actionable = not report["halted"] and (report["cachedPending"] > 0 or (
                report["remaining"] > report["needsReview"] and report["requestsRemainingToday"] > 0))
            output.write(f'needs_work={str(actionable).lower()}\n')
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as output:
            output.write(f'\n已完成 {report["complete"]}/{report["total"]} 句；'
                         f'剩餘 {report["remaining"]} 句。\n')
            output.write(f'當日剩餘請求上限：{report["requestsRemainingToday"]}/{MAX_DAILY_REQUESTS}；'
                         f'需人工檢查：{report["needsReview"]} 句。\n')
            output.write(f'未解決錯誤：{len(report["unresolvedErrors"])} 句（詳見進度 JSON）。\n')
            output.write(f'狀態：{report["status"]}；暫停原因：{report["halted"] or "無"}。\n')
    if not args.plan and report["unresolvedErrors"]:
        print("::warning::部分台詞未產生音訊，已記錄並繼續其他台詞；未解決清單見 voice-progress.json。")
    if not args.plan and (report["halted"] or report["status"] == "paused_after_error"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
