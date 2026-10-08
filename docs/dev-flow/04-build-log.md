# S4 建置紀錄：路線圖 Phase 0 + Phase 1 最小可運行骨架

日期：2026-10-08。環境：claude.ai 雲端容器（Linux），分支 `main-uv12jr`。`/s4-build` 指令在本工作階段未安裝，依 `03-research.md` §7.3 交接 prompt 手動執行。

**這不是可玩 MVP。** 沒有 NPC、對話、移動、音訊或儲存。內容（介面文案）是工程原型暫定版，未經專業審查；不宣稱療效，也不代表已核准兒童使用。

## 1. 使用者授權（2026-10-08，逐項確認）

| # | 項目 | 回答 |
|---|---|---|
| 1 | 建立 package.json、tsconfig、Vite／ESLint／Prettier／Vitest 設定與 src、tests 檔案（手動建立，不用 create-vite） | 同意 |
| 2 | 以 exact 版本安裝下列套件，不用 --force／--legacy-peer-deps | 同意 |
| 3 | 在容器內啟動 preview，用系統預裝的 Chromium（全域 Playwright，不加入專案）檢查 | 同意 |
| 4 | 檢查通過後 commit 並推到 `main-uv12jr`（不開 PR）。交接 prompt 原寫「不 commit／push」是改成雲端前的條件 | 同意 |

## 2. 版本核對與安裝

`npm view` 查 registry metadata（2026-10-08）：

| 套件 | 版本 | 發布日 | 授權 | engines／peer 重點 |
|---|---|---|---|---|
| three | 0.186.1 | 2026-09-24 | MIT | — |
| vite | 8.3.3 | 2026-10-06 | MIT | node ^20.19 \|\| >=22.12 |
| vitest | 5.0.3 | 2026-09-30 | MIT | node ^22.12 \|\| ^24 \|\| >=26；peer vite ^6.4 \|\| ^7 \|\| ^8 |
| typescript | 5.9.3 | — | Apache-2.0 | node >=14.17 |
| @types/three | 0.186.0 | 2026-09-11 | MIT | 同 minor 的已發布版（S2 提到的 0.186.9999 不可安裝） |
| @types/node | 22.20.5 | — | MIT | 配合 Node 22 |
| eslint／@eslint/js | 9.39.5 | — | MIT | node ^18.18 \|\| ^20.9 \|\| >=21.1 |
| typescript-eslint | 8.71.1 | 2026-10-05 | MIT | peer eslint ^8.57 \|\| ^9 \|\| ^10；typescript >=4.8.4 <6.1.0（5.9.3 在範圍內） |
| prettier | 3.9.9 | 2026-09-23 | MIT | node >=14 |

執行環境：Node v22.22.0、npm 10.9.4（S2 記錄的是 Windows 本機 22.21.0；雲端容器版本不同）。

```text
npm install --save-exact three@0.186.1                       → exit 0，0 vulnerabilities
npm install --save-exact -D vite@8.3.3 vitest@5.0.3 typescript@5.9.3 @types/three@0.186.0 \
  @types/node@22.20.5 eslint@9.39.5 @eslint/js@9.39.5 typescript-eslint@8.71.1 prettier@3.9.9
                                                              → exit 0，149 packages，0 vulnerabilities
npm ls --depth=0                                              → exit 0（無 invalid／missing peer）
```

`package.json` 記錄 `engines.node: >=22.12.0 <23`；鎖檔 `package-lock.json` 已產生，重現環境用 `npm ci`。傳遞依賴的完整授權清單尚未盤點。

## 3. 建立的檔案

| 檔案 | 責任 |
|---|---|
| `index.html`、`src/styles.css` | zh-Hant-TW；常駐「暫停」「返回安全區」是 HTML 裡的真實 button，不依賴 WebGL；休息／安全區／錯誤／結束面板；預留 `zhuyin-slot`（注音）與 `voice-slot`（語音）位置；按鈕至少 64 px；不透明淺底深字；全域停用 CSS 動畫與轉場 |
| `src/main.ts` | 協調層：建立引擎與 canvas、重試或重新開始前先銷毀舊實例；ResizeObserver、visibilitychange（隱藏時暫停、回來不自動恢復）、pagehide、Esc 暫停；初始化中或無法顯示場景時由 DOM 休息畫面接管 |
| `src/core/RenderLoop.ts` | 單一 RAF；可注入排程器；第一幀 delta=0、單幀上限 0.05 秒、elapsed 不含停止期間 |
| `src/core/GameEngine.ts` | 狀態 `new → initializing → ready → running ⇄ paused`、`error`、`disposed`；init 共用同一個 Promise、回傳具型別結果；returnToSafety 重設相機、畫一次並保持 paused；context lost 進入 error；dispose 可重複、晚到的 renderer 會被釋放；DPR 上限 2 |
| `src/core/settings.ts` | 保守預設：`reducedMotion: true`、`maxPixelRatio: 2`；預留 `detailLevel`（Q6，尚未使用） |
| `src/scene/ParkScene.ts` | 地面＋安全標記（PBR 材質）、半球光＋一盞柔和方向光；無陰影、粒子、模糊、晃動；顏色 HSL S ≤ 0.6；相機在 1.1 m 視線高度 |
| `tests/core/RenderLoop.test.ts`、`tests/core/GameEngine.test.ts`、`tests/scene/ParkScene.test.ts`、`tests/helpers.ts` | 26 項 node 環境測試；RAF 與 renderer 以替身注入 |
| `tsconfig.json`、`tsconfig.node.json`、`vite.config.ts`、`eslint.config.js`、`.prettierrc.json`、`.prettierignore` | strict + noUncheckedIndexedAccess；ESLint strictTypeChecked + no-explicit-any；Prettier 不改寫既有 Markdown 與 docs |
| `docs/dev-flow/s4-screenshots/` | 瀏覽器檢查截圖與檢查腳本 `browser-check.mjs` |

寫實管線（Q6，03 §9.5）：renderer 用 `SRGBColorSpace` 輸出、`ACESFilmicToneMapping`；材質為 `MeshStandardMaterial`。不載入外部素材、不加後製效果。

## 4. 驗證結果

| 檢查 | 命令 | 結果 |
|---|---|---|
| 型別 | `npm run typecheck`（tsc 5.9.3，app＋tests 與 vite.config 兩個 tsconfig） | exit 0 |
| Lint | `npm run lint`（ESLint 9.39.5） | exit 0 |
| 格式 | `npm run format:check`（Prettier 3.9.9） | exit 0 |
| 單元測試 | `npm run test`（Vitest 5.0.3，node 環境） | exit 0，3 檔 26 項全過 |
| Build | `npm run build`（Vite 8.3.3） | exit 0；JS 538.97 kB（gzip 134.83 kB），有「chunk 大於 500 kB」警告，主要是 three.js 本身大小；尚未處理 |
| 瀏覽器 | `vite preview` + `docs/dev-flow/s4-screenshots/browser-check.mjs`（Chromium headless，SwiftShader 軟體 WebGL2） | 22/22 通過 |

單元測試涵蓋：重複 start／resume 只有一個 RAF；暫停時不更新也不繪製；恢復後第一幀 delta=0 且 elapsed 不含暫停期間；分頁隱藏時暫停、回來不自動恢復；returnToSafety 重設相機並保持暫停；dispose 可重複、資源只釋放一次、之後不能 start／resume／init；dispose 後 context lost 事件不再有作用；context lost 進入 error；renderer 建立失敗後可用新實例重試；初始化期間 dispose 時，晚到的 renderer 會被釋放、不會啟動；ParkScene 的 geometry／material 各釋放一次。

瀏覽器檢查涵蓋：載入後看到地面與安全標記；常駐按鈕 ≥ 64×64 px；滑鼠「暫停」／「繼續」與焦點移動；Esc 暫停、Enter 觸發；Tab 依序到「暫停」「返回安全區」；執行中與暫停中都能返回安全區；模擬分頁隱藏；「結束本次」移除 canvas、「重新開始」只有一個 canvas；結束／重新開始 20 次後仍只有一個 canvas；console 無錯誤；1024×768 觸控模擬點按；640×360 窄畫面沒有水平捲動、工具列不遮住面板；停用 WebGL 時顯示「目前無法顯示場景」與重試／結束，返回安全區由 DOM 接管。

建置過程中修正的問題：

- dispose 後再呼叫 `init` 原本會拿到舊的成功結果。已改成只有 initializing 時才共用 Promise，其他非 new 狀態一律拒絕，並加測試。
- 地面原本是 40 m，畫面兩側看得到邊緣斜角，已改成 400 m。

## 5. 未驗證（不能標 PASS）

- 真實 GPU：瀏覽器檢查用 SwiftShader 軟體渲染，不代表任何實機的畫面或效能。
- Firefox、Safari（macOS）、iPadOS Safari、Android 平板 Chrome：都沒有測。
- 平板實機觸控：1024×768 觸控模擬不等於實機。
- FPS、p95 frame time、載入時間、記憶體：都沒有量測。20 次重建只確認 canvas 數量，沒有做 heap 快照或 `renderer.info` 資源計數。
- 200% 文字縮放：只用 640×360 版面近似，沒有用瀏覽器文字縮放實測。
- 色彩對比：沒有量測。
- 螢幕報讀器：沒有測。
- 真實的分頁切換：用覆寫 `visibilityState` 加上派送事件模擬。
- 真實的 WebGL context lost：只有單元測試派送事件，沒有在瀏覽器觸發。
- 介面文案：工程暫定版，尚待專業審查（03 §5）。

## 6. 後續

- S5：獨立審查本次程式碼，並補實機與跨瀏覽器驗證。
- 路線圖 Phase 2（第一人稱移動）以 03 §9.2 的移動與相機設定作為驗收條件。
- 是否處理 build 的 chunk 大小警告（例如拆出 three），留到 Phase 7 資源與效能時決定。
