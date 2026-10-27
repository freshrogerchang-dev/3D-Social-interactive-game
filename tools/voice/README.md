# 每日遊戲語音製作

使用者於 2026-10-22 選定小男孩使用 Sadaltager、B 溫和慢速語氣、離線升高 2.5 半音，並明確核准「沿用 Tier 1 預付金鑰，每天最多生成 50 句，接受小額扣款」。原先每日 5 次，使用者後續要求改為五天完成，已提高至每日 50 次。這不是每日免費額度方案。

## 範圍與聲音

queue.json 由遊戲共用 voiceLines() 匯出，包含公園、生活練習、延伸支持情境與街區文字變體，共 226 句。依說話者輪流排序，避免先把 155 句旁白全做完才輪到其他人物。

| 人物 | 句數 | 聲線／語氣 | 後製 |
|---|---:|---|---|
| 小安 | 3 | Sadaltager，溫和慢速 | +2.5 半音，原速度 |
| 小宇 | 5 | 同上 | 同上 |
| 小哲 | 4 | 同上 | 同上 |
| 小晴 | 2 | Zephyr，自然友善 | +2.5 半音，85% 速度 |
| 小芸 | 5 | 同上 | 同上 |
| 媽媽 | 48 | Sulafat，溫柔有耐心 | 原設定，統一音量 |
| 阿公 | 4 | Algenib，和藹緩慢 | 原設定，統一音量 |
| 旁白 | 155 | Achernar，清楚溫和 | 原設定，統一音量 |

## Routine

預設分支 main 的 `.github/workflows/daily-game-voice.yml` 每天 UTC 12:00（台灣時間 20:00）排程；GitHub 可能延後執行。排程會 checkout `codex/daily-game-voice`，只在該分支保存音檔、原音與進度，不推發布分支、不開 PR、不部署。

沿用 Repository secret `GEMINI_API_KEY`。每天最多 50 次本 routine 的 HTTP 請求，包含失敗與保守預留；不是整個 Gemini 專案的所有應用共用計數。每天順利完成 50 句時約需 5 天（50＋50＋50＋50＋26）；預計 2026-10-23 至 10-27，實際因共用原音、失敗或暫停而不同。

每日計數依官方 RPD 重設時區 `America/Los_Angeles`（太平洋時間）。同日手動重跑也會讀取已保存計數，不重設上限。每次請求先將預留計數 commit／push 到遠端，再呼叫 API；保存失敗則不呼叫 API。

原始 WAV 保存在 voice-source/，處理好的 AAC／M4A 與 manifest 放在 public/assets/voice/。來源指紋包含模型、聲線與完整提示；後製參數變更時可用原音重新編碼，不必再次付費生成。同聲線／同提示的完全相同台詞共用原音。

空音訊（NO_AUDIO）會保存該句錯誤並跳過，繼續其他台詞直到當日最多 50 次請求；同一原音來源在單批內不重試。失敗也計入 50 次，因此不保證成功產出 50 句。下次排程可再試尚未達三次上限的來源。不會即時重試 429，不切換付費備援模型。401／402／403／404 會永久暫停，等人工修正。單一來源累計失敗 3 次後列入人工檢查，避免無限重做；其餘台詞繼續。429、網路／回應格式異常、寫檔或編碼錯誤仍停止本批。未解決錯誤保存在 voice-progress.json 的 sourceErrors 與 summary.unresolvedErrors，後面的成功不會清除其他來源的錯誤；該來源成功編碼後才移除。未輸出音訊時只保存供應商 finishReason／blockReason 的 enum 標籤與候選數，不記錄完整回應或金鑰。全部完成後日常排程只檢查進度，不再呼叫 API，也不再安裝音訊工具。

## 查看或手動執行

Actions → Daily game voice → Run workflow：預設 `dry_run=true`，只看清單／進度。若要今天先做第一批，取消 dry_run；仍受同一個每天 50 次上限。不要用舊預覽或舊手動生成器作為 routine，它們不共用這份每日計數。

執行摘要顯示已完成／總數、當日剩餘上限與需人工檢查數。音檔永久保存在專用 Git 分支；下載附件只保留 7 天。若保存或編碼失敗，額外的 recovery 附件保留當次原音，避免重新生成。

預付餘額、API 使用費由 Google 計費，此程式只限制請求次數，不能保證每次扣款金額。官方文件：

- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/billing
- https://ai.google.dev/gemini-api/docs/rate-limits

## 維護

修改情境後，先執行 `node tools/voice/export-queue.mjs` 更新清單，再跑既有五項工程檢查；新測試會核對清單與當前遊戲台詞完全一致。

排程只需要 Python 3.12、FFmpeg／ffprobe（含 rubberband），沒有新的 Python 第三方套件。若 GitHub 沒有音訊工具，會先限時安裝，安裝未完成時不呼叫 API。

可在 GitHub Actions 選 Disable workflow 暫停。遇到 halted 時，先修正服務／金鑰設定；恢復只移除 voice-progress.json 的 halted 欄位，不刪除 days 計數。需重新測試某句時只處理該來源的 attempts，仍保留當日預算。

目前尚未發布到遊戲網站；全部音檔完成並確認後，再決定併入 main-uv12jr 與發布。前端只讀靜態音檔，沒有金鑰或即時 API。

2026-10-27 更新：Git 推送同一提交最多嘗試 3 次（等待 3／6 秒），不重送 Gemini，不 force-push。仍失敗時以 GIT_PUSH_FAILED 停止，不再誤報 ENCODING_FAILED；原音與編碼可從 recovery 附件保留。GitHub schedule 為盡力排程，可能延遲或漏執行，設定20:00不保證準時。
