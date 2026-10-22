# 公園打招呼：10 句語音試聽

同一個 NPC 小安，相同聲線比較 A 自然聊天、B 溫和慢速，共 20 個 WAV。台詞為不同分支取樣，不是連續獨白。「你呢？」不要求提供真名。

## GitHub 操作

1. Settings → Secrets and variables → Actions 新增 Repository secret `GEMINI_API_KEY`。
2. Actions → **Park voice preview** → **Run workflow**。
3. 預設 `dry-run` 只檢查台詞，不呼叫 Gemini、不消耗 Gemini 配額。先確認 AI Studio 所屬專案可使用免費 TTS 配額後，才選 `first`（2 個音檔）或 `all`（20 個音檔），並勾選 `free_quota_confirmed`。勾選本身不會替供應商設定計費上限。
4. 打開執行紀錄，下方 **Artifacts** 點 `park-voice-preview-編號` 下載 ZIP，解壓縮播放 WAV。下載需登入 GitHub。

僅限手動觸發，推送或修改檔案都不會自動執行，無排程、無自動重試、無付費模型備援。生成模式每次使用全新工作區，重跑仍會消耗配額；腳本無法保證供應商不計費。尚未確認免費配額時請維持 dry-run，不為試聽啟用付費帳單。

音檔保留 14 天，不會自動提交 Git。生成失敗仍上傳已完成的音檔與台詞，請以 Generate preview audio 步驟狀態判斷是否完成。

## 常見問題

- 缺少 GEMINI_API_KEY：檢查 Secret 名稱與 repo。請使用 Repository secret；此流程未設定 environment。
- HTTP 400/403：檢查金鑰、權限、帳戶與地區限制。
- HTTP 404：依 Gemini TTS 官方文件確認模型是否已調整。
- HTTP 429：到 AI Studio 檢查配額或速率限制，避免連續重跑。
- HTTP 402：上次生成遇到此錯誤，僅憑狀態碼無法確定原因；先檢查帳戶與免費配額，不要直接啟用付費或反覆重跑。
- 沒有音檔：dry-run 不生成音檔；first 僅生成第一句，要全部請選 all。

## 本機使用（可選）

需要 Python 3，無額外套件。在本資料夾執行：

```bash
python3 generate.py --dry-run
read -rsp 'Gemini API key: ' GEMINI_API_KEY
export GEMINI_API_KEY
python3 generate.py --line 01
python3 generate.py
```

結果寫入 audio/，本機已存在的音檔會略過。預設模型 `gemini-2.5-flash-preview-tts`、聲線 `Puck`，可用 --model、--voice 更換。金鑰只從環境變數讀取，請勿提交 Git 或貼到對話。

## 試聽

比較台灣華語口音、停頓、念錯或加字、聲線一致性與音量。生成指示無法保證每次表現一致，仍須人工試聽。目前未做音量統一或遊戲整合。

## 小男孩 NPC 聲音候選

預設試聽方向改為八到十歲男孩小安，採年輕、明亮、自然台灣華語，不裝可愛、不使用尖銳娃娃音。Puck 是聲線候選，並非供應商保證的男童聲音；仍需人工試聽，提示也不能保證年齡或性別聽感。Actions 的 voice 選項可比較 Puck、Charon、原本 Kore。保留原有手動觸發與配額確認，修改設定不會呼叫 API。先用 first 比較第一句 A/B，再決定是否製作其餘台詞。

## 低用量排查模式

Puck 試聽連續回傳 finishReason=OTHER，無法從該欄位判定原因。已將提示簡化為年輕、明亮男聲的自然台灣華語，不再以精確年齡與大量限制描述。此設定尚待遠端試聽驗證，不保證男童聽感。

Actions 新增 style 選項（A/B，預設 A）；目前 first 每次只生成所選版本的 1 個音檔，all 每次生成所選版本的 10 個音檔。若要 20 個 A/B 版本，須分別執行兩次。此段數量取代上方舊 A/B 同批生成說明。確認欄位、手動觸發與 dry-run 預設均保留，無自動重試。
