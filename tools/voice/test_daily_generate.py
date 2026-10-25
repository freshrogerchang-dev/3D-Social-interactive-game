"""Financial limits and resumability tests; no network and no API key needed."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from daily_generate import Batch, NoAudioError, synthesize, read_json, save_json, ROOT


class DailyBatchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.tools = self.root / "tools/voice"
        self.tools.mkdir(parents=True)
        for name in ["voice-presets.json", "voice-profile.json", "boy-profile.json"]:
            (self.tools / name).write_bytes((ROOT / "tools/voice" / name).read_bytes())
        self.set_lines(8)
        self.request = Mock(return_value=(b"\0\0" * 2400, 24000))
        self.encoder = Mock(side_effect=self.encode)
        self.checkpoint = Mock()
        self.day = "2026-10-22"

    def tearDown(self):
        self.temp.cleanup()

    def set_lines(self, count):
        save_json(self.tools / "queue.json", {"version": 1, "lines": [
            {"speaker": "xiaoan", "text": f"測試句 {n}", "tone": "neutral",
             "file": f"assets/voice/xiaoan-{n:08x}.m4a"} for n in range(count)
        ]})

    @staticmethod
    def encode(source, target, profile):
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"mock encoded audio" + source.read_bytes())

    def batch(self):
        return Batch(self.root, checkpoint=self.checkpoint, request=self.request,
                     encoder=self.encoder, sleeper=lambda _: None, today=lambda: self.day,
                     check_tools=lambda: None)

    def test_226_clips_finish_in_five_days_without_exceeding_fifty(self):
        self.set_lines(226)
        for offset, expected in enumerate([50, 100, 150, 200, 226]):
            self.day = f"2026-10-{23 + offset}"
            self.assertEqual(self.batch().run("not-a-real-key")["complete"], expected)
            self.assertEqual(self.batch().run("not-a-real-key")["complete"], expected)
            self.assertEqual(self.request.call_count, expected)
        state = read_json(self.root / "voice-progress.json")
        self.assertEqual([day["requests"] for day in state["days"].values()],
                         [50, 50, 50, 50, 26])
        self.day = "2026-10-28"
        self.batch().run("not-a-real-key")
        self.assertEqual(self.request.call_count, 226)

    def test_existing_five_reservations_are_preserved_when_cap_increases(self):
        self.set_lines(60)
        save_json(self.root / "voice-progress.json", {
            "version": 1, "days": {self.day: {"requests": 5}}, "attempts": {},
        })
        self.assertEqual(self.batch().run("not-a-real-key")["complete"], 45)
        self.batch().run("not-a-real-key")
        self.assertEqual(self.request.call_count, 45)
        state = read_json(self.root / "voice-progress.json")
        self.assertEqual(state["days"][self.day]["requests"], 50)

    def test_no_audio_continues_and_restart_keeps_daily_cap(self):
        self.set_lines(60)
        failed = self.batch().items[0]["sourceKey"]
        def request(item, key):
            if item["sourceKey"] == failed:
                raise NoAudioError({"candidates": [{"finishReason": "OTHER"}]})
            return b"\0\0" * 2400, 24000
        self.request.side_effect = request
        report = self.batch().run("not-a-real-key")
        self.assertEqual(self.request.call_count, 50)
        self.assertEqual(report["complete"], 49)
        self.assertEqual(report["requestsRemainingToday"], 0)
        self.assertEqual(report["unresolvedErrors"][0]["diagnostics"]["finishReason"], "OTHER")
        self.batch().run("not-a-real-key")
        self.assertEqual(self.request.call_count, 50)
        self.day = "2026-10-23"
        self.request.side_effect = None
        report = self.batch().run("not-a-real-key")
        self.assertEqual(report["complete"], 60)
        self.assertEqual(report["unresolvedErrors"], [])

    def test_all_empty_outputs_count_and_do_not_abort_batch(self):
        self.set_lines(60)
        self.request.side_effect = RuntimeError("NO_AUDIO")
        report = self.batch().run("not-a-real-key")
        self.assertEqual(self.request.call_count, 50)
        self.assertEqual(report["complete"], 0)
        self.assertEqual(len(report["unresolvedErrors"]), 50)
        self.assertEqual(report["requestsRemainingToday"], 0)

    def test_shared_failed_source_is_not_retried_in_same_batch(self):
        queue = read_json(self.tools / "queue.json")
        queue["lines"][1].update({"text": queue["lines"][0]["text"]})
        save_json(self.tools / "queue.json", queue)
        self.request.side_effect = RuntimeError("NO_AUDIO")
        self.batch().run("not-a-real-key")
        self.assertEqual(self.request.call_count, 7)

    def test_synthesis_records_only_safe_provider_diagnostics(self):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.return_value = json.dumps({
            "candidates": [{"finishReason": "OTHER", "content": {"parts": []}}],
            "promptFeedback": {"blockReason": "do not copy arbitrary provider text"},
        }).encode()
        with patch("daily_generate.urllib.request.urlopen", return_value=response):
            with self.assertRaises(NoAudioError) as caught:
                synthesize(self.batch().items[0], "not-a-real-key")
        self.assertEqual(caught.exception.diagnostics, {
            "finishReason": "OTHER", "blockReason": "UNKNOWN", "candidateCount": 1,
        })

    def test_http_429_counts_once_and_does_not_retry(self):
        self.request.side_effect = RuntimeError("HTTP_429")
        self.batch().run("not-a-real-key")
        self.assertEqual(self.request.call_count, 1)
        state = read_json(self.root / "voice-progress.json")
        self.assertEqual(state["days"][self.day]["requests"], 1)
        self.assertEqual(state["lastError"]["reason"], "HTTP_429")

    def test_permission_or_billing_failure_stops_future_spending(self):
        self.request.side_effect = RuntimeError("HTTP_403")
        self.batch().run("not-a-real-key")
        self.day = "2026-10-23"
        self.batch().run("not-a-real-key")
        self.assertEqual(self.request.call_count, 1)
        self.assertEqual(self.batch().plan()["halted"], "HTTP_403")

    def test_failed_checkpoint_blocks_http_request(self):
        self.checkpoint.side_effect = RuntimeError("push failed")
        with self.assertRaises(RuntimeError):
            self.batch().run("not-a-real-key")
        self.request.assert_not_called()

    def test_reservation_is_saved_before_network(self):
        def request(item, key):
            state = read_json(self.root / "voice-progress.json")
            self.assertGreaterEqual(state["days"][self.day]["requests"], 1)
            self.assertGreaterEqual(self.checkpoint.call_count, 1)
            return b"\0\0" * 2400, 24000
        self.request.side_effect = request
        self.batch().run("not-a-real-key")

    def test_encoding_failure_keeps_source_for_free_retry(self):
        self.encoder.side_effect = RuntimeError("encoder failed")
        self.batch().run("not-a-real-key")
        self.assertEqual(self.request.call_count, 1)
        self.assertEqual(len(list((self.root / "voice-source").glob("*.wav"))), 1)
        self.encoder.side_effect = self.encode
        self.batch().run(None)  # Existing raw audio can be encoded without a key.
        self.assertEqual(self.request.call_count, 1)
        self.assertEqual(self.batch().plan()["complete"], 1)

    def test_profile_change_reuses_raw_audio(self):
        self.set_lines(1)
        self.batch().run("not-a-real-key")
        profile = read_json(self.tools / "boy-profile.json")
        profile["pitchSemitones"] = 3.0
        save_json(self.tools / "boy-profile.json", profile)
        self.batch().run(None)
        self.assertEqual(self.request.call_count, 1)
        self.assertEqual(self.encoder.call_count, 2)

    def test_three_failures_require_review_without_endless_spending(self):
        self.set_lines(1)
        self.request.side_effect = RuntimeError("NO_AUDIO")
        for day in range(4):
            self.day = f"2026-10-{22 + day}"
            self.batch().run("not-a-real-key")
        self.assertEqual(self.request.call_count, 3)
        self.assertEqual(self.batch().plan()["needsReview"], 1)

    def test_missing_key_never_calls_api(self):
        self.batch().run(None)
        self.request.assert_not_called()

    def test_boy_uses_approved_voice_tone_and_pitch(self):
        item = self.batch().items[0]
        self.assertEqual(item["voice"], "Sadaltager")
        self.assertIn("gentle, slightly slower and connected", item["prompt"])
        self.assertEqual(item["profile"]["pitchSemitones"], 2.5)
        self.assertEqual(item["profile"]["tempo"], 1.0)

    def test_corrupt_budget_never_silently_resets(self):
        save_json(self.root / "voice-progress.json", {
            "version": 1, "days": {self.day: {"requests": "broken"}}, "attempts": {},
        })
        with self.assertRaises(RuntimeError):
            self.batch().run("not-a-real-key")
        self.request.assert_not_called()


if __name__ == "__main__":
    unittest.main()
