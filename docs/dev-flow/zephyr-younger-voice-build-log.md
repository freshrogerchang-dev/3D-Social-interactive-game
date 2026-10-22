# Zephyr 小女生聲音套用（2026-10-22）

## 使用者選定

原始 Zephyr 試聽由 Actions run 39726560092 生成。使用者已試聽並選定「較明顯調整版」：語速 0.85、升高 2.5 半音、Rubber Band formant preserved、pitchq quality、limiter 0.95（不自動增益）。不再次對播放端設定速度／音高，避免重複調整。

## 已準備的修改

- main：voice-profile.json 固定設定；apply_profile.py 離線後製；工作流程生成後對 Zephyr 自動後製並保留 raw-audio；保留既有手動觸發、dry-run 與確認欄位。第一句 A 保存原始 WAV 與來源描述，台詞／聲線／模型／版本全符合時重用，不呼叫 API。
- main-uv12jr：小晴 xiaoqing 與小芸 xiaoyun 預設使用 Zephyr 並離線套用同一設定；成人、男孩與覆寫成其他聲線不套用。每個檔案記錄實際 render 設定，避免部分失敗後把舊檔誤認為已更新。新增 --speaker 與 --limit 選項便於小量生成。
- 未修改 VoicePlayer、瀏覽器 pitch／rate、前端 API 或金鑰處理。缺少靜態音檔時仍使用既有裝置語音。沒有呼叫 Gemini 生成新角色台詞。

## 實際檢查

- Python 3.12；FFmpeg 本機 Rubber Band：離線後製 exit 0，輸出 WAV 與使用者選定樣本逐位元相同。
- Python py_compile：generate.py、apply_profile.py exit 0。
- 未設定 GEMINI_API_KEY 的第一句 A：重用原始檔 exit 0；後製重跑識別相同來源與設定，不累積效果，exit 0。
- Node 22.22.0：兩個遊戲 mjs 的 node --check exit 0；角色範圍與聲線覆寫的原生 assert exit 0。
- Node 輸出的遊戲濾鏡交由 Python 啟動 FFmpeg：與選定 WAV 逐位元相同，exit 0。先前 Node spawnSync ffmpeg 因本機 sandbox EPERM exit 1，不算整合通過。
- npm ci 被自動審查拒絕：AGENTS.md 要求逐項安裝授權。typecheck、lint、format:check、test、build 五項尚未執行，不能宣稱通過。
- 建立 commit 被自動審查拒絕：尚缺本次提交授權。雖已建立未掛接的 Git blob/tree，遠端分支沒有更新；未 push、未發布。

## 核准後驗證與同步

使用者已於 2026-10-22 回覆「都核准」，涵蓋 npm ci、檢查與本次 commit／push。遊戲修改存新分支，發布另確認。

- 執行環境：Node v22.22.0、npm 10.9.4；npm ci --no-audit --no-fund exit 0，依鎖檔新增 152 個依賴，沒有升級套件或修改鎖檔。ESLint 舊版支援期提示保留，未因此升級。
- npm run typecheck、npm run lint、npm run format:check、npm run test、npm run build：各 exit 0。測試 15 檔、145 項通過；build JS 692.03 kB／gzip 183.76 kB，既有大於 500 kB 的 chunk 警告保留。
- 新增工具檔先以既有 Prettier 整理，再執行上述五項。未改產品 UI、播放器、情境文字、鎖檔與套件版本。
- node tools/voice/generate-voice.mjs --dry-run --speaker=xiaoqing --limit=1：exit 0；範圍 2 句，預覽 1 句「對，我在排隊。」、聲線 Zephyr，無 API 呼叫。
- main 語音流程提交 840d8d77c53b70fbbe29ae08618565f70426d55b 已同步。遊戲端保存於 codex/zephyr-younger-profile（基於 df78b029552431d181ed25e5b8ab9e2fa718f4ac），不推 main-uv12jr，不觸發 Pages。

## 待完成

遊戲完整語音需按角色小量生成並試聽；這次沒有呼叫 Gemini。未完成前不宣稱線上遊戲已換聲。新版 Actions 後製步驟尚待遠端執行，既有本機輸出比對不等於遠端驗證。遊戲發布另行確認。
