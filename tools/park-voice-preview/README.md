# 公園打招呼：Zephyr 語音

使用者已選定「較明顯調整版」：Zephyr、語速 85%、音高提高 2.5 個半音。這是離線後製設定，不是 Gemini 的數值 pitch 參數。

## 已固定的效果

voice-profile.json 是設定來源，apply_profile.py 使用 FFmpeg Rubber Band 將速度與音高分開處理，保留共振特徵，並限制峰值。將設定套用到原始試聽後，輸出與使用者選定的 WAV 逐位元相同。後製後播放時不要再調高 pitch 或降低播放速度，以免效果重複。

## GitHub Actions

1. Actions → Park voice preview → Run workflow。
2. 預設 dry-run 只檢查台詞，不呼叫 API。
3. 試聽選 first、Zephyr、A；仍需勾選原有確認欄位。
4. audio/ 的 WAV 已套用選定效果；raw-audio/ 保留原始音檔，*.profile.json 記錄來源 SHA256 與效果設定。音檔在 Artifacts ZIP，保留 14 天，下載需登入 GitHub。

first 只處理一個音檔；all 會處理目前選定版本的十句台詞。A/B 是說話語氣，Zephyr 的兩個版本都會套用相同的後製設定。其他聲線不套用本次 Zephyr 效果。

source/01_A.wav 保留已生成的 Zephyr 原始第一句，旁邊的 JSON 記錄聲線、模型、台詞與版本；完全相符才重用。因此重做 Zephyr 第一句 A 的後製不呼叫 Gemini，亦不消耗 Gemini 額度。修改台詞／聲線／模型後不會誤用舊音檔。

新的句子仍需呼叫 Gemini，可能使用預付餘額。沒有自動觸發、排程、自動重試或付費備援。確認欄位不代表供應商保證免費，腳本也不會改動供應商帳單設定。不要在對話、程式或 Git 放入金鑰。

## 本機使用

需要 Python 3、FFmpeg（含 rubberband），不需額外 Python 套件：

```bash
python3 generate.py --line 01 --style A --voice Zephyr
python3 apply_profile.py --input-dir audio --output-dir tuned-audio
```

第一句 A 可直接沿用保留的原始 WAV，不需金鑰。其他句子需要環境變數 GEMINI_API_KEY。請將輸入／輸出設為不同資料夾，保留原音。相同輸入與設定的後製會沿用輸出，不累積升調。

## 狀態與限制

後製與來源重用已在本機驗證；新版 Actions 尚待實際執行。main 目前是語音試聽流程，遊戲位於 main-uv12jr。本次設定不等於遊戲所有角色語音已生成或線上遊戲已更新；遊戲缺少靜態音檔時仍使用裝置語音。聲線年齡感依使用者試聽選定，不作年齡或真人聲音保證。

## Sadaltager 升調試聽候選

已新增 Sadaltager 聲線選項。先選 first、Sadaltager、A，並勾選既有確認欄位；僅生成 1 句。後製讀取 sadaltager-higher.json，升高 2.5 個半音，維持原語速；Zephyr 的既有設定與預設聲線不變。audio/ 為升調後，raw-audio/ 為原音，日後可離線微調而不重複呼叫 API。這是待試聽候選，尚未套用到遊戲角色，不保證小男孩年齡聽感。
