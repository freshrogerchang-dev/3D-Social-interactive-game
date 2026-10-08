# AGENTS.md — 公園打招呼社交練習（Three.js 第一人稱 3D）

給接手的程式代理（Codex、Claude Code 等）。先讀 `docs/dev-flow/STATE.md`，那裡是目前狀態與下一步的唯一來源。

## 溝通與文件

- 回覆、文件、介面文字一律用**繁體中文（台灣用語）**。
- 每完成一個階段，更新 `docs/dev-flow/STATE.md`，並寫該階段的紀錄檔（例如 `04-build-log.md`）。
- 如實回報：沒跑過的檢查標「未驗證」，不能寫成通過。附上命令、版本與 exit code。

## 授權與範圍

- 安裝或升級套件、新增設定檔、啟動 dev server／preview、commit、push，都要先取得使用者**逐項**同意。
- 只做使用者指定的範圍。完成一個 Dev-Flow 階段就停下，不自動進入下一階段（S4 之後不自動做 S5 或 Phase 2）。
- 不開 PR、不部署、不推到 `main`，除非使用者明確要求。目前開發分支是 `main-uv12jr`。
- 套件版本用 exact pin，安裝用 `npm ci`；不要用 `--force` 或 `--legacy-peer-deps`。升級 TypeScript 前，先確認 typescript-eslint 支援的範圍（目前 TS 需 `<6.1.0`）。

## 產品規則（不可違反）

- 這是**工程原型**：不宣稱診斷或療效，也不宣稱已核准給兒童使用。情境內容是「待專業審查草案」（`docs/dev-flow/03-research.md`）。
- 「暫停」與「返回安全區」隨時可用，而且是真實 DOM 按鈕，不依賴 WebGL。
- 沒有計時器、倒數、評分，也不顯示「成功／失敗」等評價語；不要求眼神接觸。
- 「說你好」與「點頭」完全對等；退出或「先不參與」不算完成，也不算失敗。
- 低刺激預設：不閃爍、不做 head bob、晃動、模糊或後製效果；顏色 HSL 飽和度 ≤ 0.6；觸控目標至少 64 px。
- 高度寫實（Q6）只指形狀、比例、材質與光線，不取代上述規則（03 §9.5）。
- 不收集兒童資料；沒有後端、登入、追蹤或分析。
- 語音採 Gemini TTS **離線預先生成**靜態音檔，App 不呼叫 API、前端沒有金鑰；前提是僅使用者自己使用（Q5）。

## 程式規則

- Vite + strict TypeScript + Three.js（WebGL2），DOM/CSS overlay；不加 React、全域 EventBus 或預先建立的空殼模組。
- `strict` + `noUncheckedIndexedAccess`；禁止 `any`；`catch` 一律用 `unknown` 再縮窄。
- 資源有明確擁有者，`dispose()` 可重複呼叫；只有一個 RAF；恢復後第一幀 delta=0。
- 提交前五項都要 exit 0：`npm run typecheck`、`npm run lint`、`npm run format:check`、`npm run test`、`npm run build`。
