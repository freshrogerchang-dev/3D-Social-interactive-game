# 每日遊戲語音 routine

使用者已核准：沿用現有 Tier 1 預付金鑰，這個 routine 每天最多 50 次生成請求，接受小額扣款。這不是每日免費額度。

- 排程：每天 UTC 12:00（台灣時間 20:00），GitHub 可能延後啟動。
- 使用者於 2026-10-22 追加授權：每日上限由 5 次提高至 50 次，以五天完成為目標；API 錯誤或排程延遲可能延後。
- 工作流程最多執行 180 分鐘，容納每日 50 次生成及保存。
- 2026-10-27 起改為每天台灣20:00；GitHub排程可能延遲或漏執行，不保證準時啟動。
- 範圍：226 句、8 位說話者；每日最多50次請求，失敗計入，完成後不再呼叫API。原10/27完成目標已因延遲與失敗無法達成；2026-10-27查詢時完成54句、剩172句。
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

截至2026-10-27台灣17:46查詢，已完成54/226，相比前次新增4句。太平洋日期10/26使用4次；10/27尚無新請求，不能用舊summary的剩餘數當今天額度。小晴1句累計三次需人工檢查；小宇、媽媽先前兩句已成功，unresolvedErrors已清空，但lastError仍有上一批保存失敗的誤標。

最新修正：只重試相同Git提交最多3次，失敗時以GIT_PUSH_FAILED停止，不再誤報成ENCODING_FAILED。不重送API、不force-push、不重設每日計數。

需要停止時，在 Actions 的 Daily game voice 選 Disable workflow。請勿刪除 voice-progress.json 來重設每日計數。

## 2026-10-25 工具準備修正

今日續作時 ubuntu-latest 使用 Ubuntu 26.04，FFmpeg 套件下載過慢，10 分鐘逾時，尚未呼叫新的 API。已固定 ubuntu-22.04，工具準備限時改為 20 分鐘；整批仍為 180 分鐘、每日最多 50 次請求（失敗計入）。空音訊會跳過繼續其他台詞，既有預算與音檔保留。

舊執行的 Re-run 使用舊版工作流程，無法採用 runner 修正；需由 main 的 Run workflow 啟動新版，取消 dry_run，會從當日已記錄的請求數接續。
