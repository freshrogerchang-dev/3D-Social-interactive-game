# 每日遊戲語音 routine

使用者已核准：沿用現有 Tier 1 預付金鑰，這個 routine 每天最多 5 次生成請求，接受小額扣款。這不是每日免費額度。

- 排程：每天 UTC 09:23（台灣時間 17:23），GitHub 可能延後啟動。
- 首次排程：2026-10-23；若想今天先開始，可手動 Run workflow 並取消 dry_run。
- 範圍：226 句、8 位說話者；順利每天 5 次時約 46 天。失敗也計入上限，完成後不再呼叫 API。
- 小男孩：Sadaltager、已選定的 B 溫和慢速語氣、升高 2.5 半音。
- 小女生：Zephyr、已選定的 85% 速度與升高 2.5 半音。
- 媽媽、阿公、旁白：維持原先設定的成人聲線。
- 沿用 Repository secret GEMINI_API_KEY；沒有新金鑰放入程式。
- 每次先把預留計數存到 Git，再發請求；同日手動重跑不重設每日上限。日界線使用 Google 官方的太平洋時間。
- 原始音檔與後製結果保存在專用分支，修改後製不必重複付費生成。401／402／403／404 會暫停，其他失敗不立即重試，單一來源最多嘗試 3 次。
- 原音／音檔／進度只存到 codex/daily-game-voice；不自動推送 main-uv12jr，不發布網站。

[執行與進度](https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/workflows/daily-game-voice.yml)  
[目前進度 JSON](https://github.com/freshrogerchang-dev/3D-Social-interactive-game/blob/codex/daily-game-voice/voice-progress.json)  
[完整規則與維護說明](https://github.com/freshrogerchang-dev/3D-Social-interactive-game/blob/codex/daily-game-voice/tools/voice/README.md)

初始進度為 0/226，目前沒有新的角色語音生成；遠端排程首次執行尚待驗證。本機通過五項工程檢查、147 項單元測試、11 項預算與接續測試，以及 Git checkpoint／實際音訊編碼檢查。

需要停止時，在 Actions 的 Daily game voice 選 Disable workflow。請勿刪除 voice-progress.json 來重設每日計數。
