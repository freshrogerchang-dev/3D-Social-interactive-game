# 公園打招呼：10 句語音試聽

同一個 NPC 小安，相同聲線比較 A 自然聊天、B 溫和慢速，共 20 個 WAV。台詞為不同分支取樣，不是連續獨白。「你呢？」不要求提供真名。

## GitHub 操作

1. Settings → Secrets and variables → Actions 新增 Repository secret `GEMINI_API_KEY`。
2. Actions → **Park voice preview** → **Run workflow**。
3. scope 選 `first` 生成第一句 A/B；選 `all` 生成全部 20 個音檔。
4. 打開執行紀錄，下方 **Artifacts** 點 `park-voice-preview-編號` 下載 ZIP，解壓縮播放 WAV。下載需登入 GitHub。

工作流程加入 main 或該工作流程檔更新時，自動生成第一句 A/B。一般文件修改不會呼叫 API，無排程。每次執行都會重新生成、使用配額，可能依帳號計費。

音檔保留 14 天，不會自動提交 Git。生成失敗仍上傳已完成的音檔與台詞，請以 Generate preview audio 步驟狀態判斷是否完成。

## 常見問題

- 缺少 GEMINI_API_KEY：檢查 Secret 名稱與 repo。請使用 Repository secret；此流程未設定 environment。
- HTTP 400/403：檢查金鑰、權限、帳戶與地區限制。
- HTTP 404：依 Gemini TTS 官方文件確認模型是否已調整。
- HTTP 429：到 AI Studio 檢查配額或速率限制，避免連續重跑。
- 只有第一句：預設 first，要全部請手動選 all。

## 本機使用（可選）

需要 Python 3，無額外套件。在本資料夾執行：

```bash
python3 generate.py --dry-run
read -rsp 'Gemini API key: ' GEMINI_API_KEY
export GEMINI_API_KEY
python3 generate.py --line 01
python3 generate.py
```

結果寫入 audio/，本機已存在的音檔會略過。預設模型 `gemini-2.5-flash-preview-tts`、聲線 `Kore`，可用 --model、--voice 更換。金鑰只從環境變數讀取，請勿提交 Git 或貼到對話。

## 試聽

比較台灣華語口音、停頓、念錯或加字、聲線一致性與音量。生成指示無法保證每次表現一致，仍須人工試聽。目前未做音量統一或遊戲整合。
