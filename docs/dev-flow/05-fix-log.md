# S5 四項問題修正紀錄

日期：2026-10-08。基準：`main-uv12jr` 的 `de286057b5f0e113023f7b898c67ede9c76b1e93`。
使用者於 S5 審查後要求繼續，這次只處理 [05-review.md](05-review.md) 的 F1–F4；未進 Phase 2。

最後更新：2026-10-09。正式五項檢查、38 項單元測試、22 項既有瀏覽器檢查及 15 項補充檢查已通過，詳見 §5。完整 S5 的實機與專業審查仍未完成。

## 1. 修正內容

| 發現 | 修正 | 本次證據 |
|---|---|---|
| F1：放大文字後工具列遮住面板 | app 改為兩列 grid；工具列占實際高度、面板使用剩餘可捲動區域；高面板不再向上溢出；保留 safe-area 與 ≥64px 按鈕 | 系統 Chromium 8/8 版面、焦點、命中與捲動檢查通過 |
| F2：背景初始化完成後仍 start | 起始 hidden 直接顯示 DOM 休息畫面；初始化中的 hidden／pagehide 取消實例；init 完成再檢查可見性；回前景不自動開始 | Node 24 替身邊界：初始 hidden、hidden 事件、pagehide、沒有事件但狀態 hidden、正常前景／明確恢復均通過 |
| F3：WebGL error 時 pause 無作用 | error／ready／initializing 由 DOM 休息畫面接管；沒有可用引擎時仍可暫停或回安全區；Esc 使用同一個暫停動作 | init 失敗後 pause、未預期 init 拒絕後 pause／safety 邊界通過 |
| F4：初始化後半段拋錯不顯示錯誤 | runInit 的 try/catch 包含資源接管、事件掛載、初次尺寸設定與繪製；失敗移除 listener、停止 loop、釋放資源；區域變數轉交所有權後清空，避免重複釋放；main 有最後的 Promise 錯誤邊界 | 對 setPixelRatio／setSize／render 注入例外均回傳 failed、進 error，資源各釋放一次 |

正常前景仍自動開始 S4 骨架；背景開始與初始化取消後要明確按「重新開始」。error 暫停後也是重新開始；不宣稱硬體無法渲染時能提供 3D 安全區。

## 2. 檔案與正式回歸測試

- src/styles.css：工具列與面板版面。
- src/main.ts：背景／pagehide、error pause、協調層 Promise 邊界。
- src/core/GameEngine.ts：整段初始化的失敗清理與 ready 回呼內 dispose 結果。
- tests/core/GameEngine.test.ts：新增 3 項參數化初次 renderer 例外及 1 項 ready 回呼內 dispose。
- tests/main.test.ts：新增 8 項協調層測試，使用 DOM／引擎／UI 邊界替身，不新增 jsdom 套件。
- docs/dev-flow/s5-fix-browser.mjs：局部 HTML/CSS 回歸工具。
- docs/dev-flow/s5-fixed-evidence/：本次截圖與局部邊界腳本／結果。原 s5-evidence 保留審查前證據。

原 26 項加上本次 12 項，Vitest 共 38 項，2026-10-09 在 Node 22.22.0 下實際 38/38 通過。TypeScript 語法解析不等於型別檢查；正式 typecheck 也已 exit 0。

## 3. 前置局部驗證（2026-10-08，保留歷史）

| 指令／環境 | exit code | 結果與限制 |
|---|---|---|
| curl --max-time 10 -I https://registry.npmjs.org（沙箱內） | 7 | 仍連不上代理 |
| 同一唯讀檢查（取得沙箱外執行權限） | 0 | HTTP 200；網路問題已定位為執行隔離差異，不是 npm 網域未開放 |
| git clone --branch main-uv12jr --single-branch … /tmp/s5-fix-base（沙箱外） | 0 | 已取得完整原始碼及 git metadata，基準 de28605 |
| node /tmp/s5-fix-check.cjs（Node v24.19.0） | 0 | 10/10 邊界替身通過；非正式 Vitest、非真實 WebGL |
| node docs/dev-flow/s5-fixed-evidence/boundary-check.cjs | 0 | 保存的同一邊界腳本可重跑；結果見 boundary-result.txt |
| PLAYWRIGHT_MODULE_DIR=/opt/codex/runtimes/cua/lib/node_modules CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node docs/dev-flow/s5-fix-browser.mjs docs/dev-flow/s5-fixed-evidence（沙箱外） | 0 | Chromium 151.0.7922.173，8/8 局部版面通過 |
| Node 內建 stripTypeScriptTypes 解析四個修改的 TS 檔 | 0 | 僅語法／轉譯；不是 tsc |
| git diff --check | 0 | 差異無空白錯誤 |
| npm ci、typecheck、lint、format:check、test、build、production preview、完整 browser-check.mjs | 當時未執行 | 2026-10-09 取得授權後已執行，結果見 §5 |

前置局部驗證未安裝或升級套件。2026-10-09 經授權安裝 Node 22 並 npm ci；package.json、package-lock.json、.nvmrc 與專案工具設定仍維持原版，沒有升級依賴。

局部版面條件：1280×720、640×360、320×568、320×360，各使用 16px／32px root 字級。檢查工具列與面板不重疊、無水平捲動、安全按鈕 ≥64px 且可命中、resume／end 焦點及捲動後可點擊。32px root 字級是文字放大近似，仍非瀏覽器原生 200% 文字縮放驗收。

- [320px 文字放大後](s5-fixed-evidence/layout-320-568-32.png)
- [640px 文字放大後](s5-fixed-evidence/layout-640-360-32.png)
- [邊界結果](s5-fixed-evidence/boundary-result.txt)

## 4. 待完成

Node 22、npm ci 與 preview 的逐項授權已取得，正式五項及瀏覽器安全路徑已完成。接下來補實機與下列未驗證項目；不自動進 Phase 2。

實機、Firefox／Safari／iPad／Android、螢幕報讀器、原生 200% 文字縮放、效能、heap／GPU 資源累積與專業內容審查仍未完成，沿用 05-review.md 的待辦矩陣；完整 S5 尚未通過。context loss 已在軟體 WebGL 以真實 extension 觸發，不再僅有派送事件的證據，但仍非真實 GPU 驗收。

使用者於正式驗證完成後已同意提交修正與紀錄，並推送到 main-uv12jr；push 會觸發公開 Pages 自動發布，結果以該提交的 GitHub Actions 紀錄為準。

## 5. 正式驗證（2026-10-09）

使用者已逐項同意：在 /tmp 安裝 Node 22、依鎖檔 npm ci、啟動本地 production preview。正式驗證完成後，使用者亦已同意本次 commit／push 到 main-uv12jr。

環境：Node v22.22.0、npm 10.9.4、Linux；安裝官方 Node 壓縮檔並核對 SHASUMS256.txt，SHA256 為 `9aa8e9d2298ab68c600bd6fb86a6c13bce11a4eca1ba9b39d79fa021755d7c37`。Node 位於 /tmp/node-v22.22.0-linux-x64，未取代共享 Node 24。透過保留原代理設定的沙箱外執行完成下載與 npm ci。

| 指令 | exit code | 實際結果 |
|---|---|---|
| PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH npm ci --cache /tmp/s5-npm-cache | 0 | added 152 packages；不改鎖檔，不宣稱此輸出代表完整安全稽核 |
| npm ls --depth=0（相同 Node 22 PATH） | 0 | 精確頂層版本符合原鎖檔，沒有 invalid／missing |
| npm run typecheck | 0 | app／tests 與工具 tsconfig 都通過 |
| npm run lint | 0 | ESLint 9.39.5 通過 |
| npm run format:check | 0 | Prettier 3.9.9 通過；favicon 修改後亦重跑 exit 0 |
| npm run test | 0 | Vitest 5.0.3，4 檔 38 項通過 |
| npm run build | 0 | Vite 8.3.3；final index.html 3.60 kB（gzip 1.16 kB）、JS 539.37 kB（gzip 134.90 kB）；仍有 >500 kB 已知警告 |
| npm run preview -- --host 127.0.0.1 --port 4173 --strictPort | 啟動成功；停止時 143 | 僅本地 preview，測完以 SIGTERM 停止 |
| node docs/dev-flow/s4-screenshots/browser-check.mjs http://127.0.0.1:4173/ docs/dev-flow/s5-formal-evidence | 0 | 22/22 通過 |
| node docs/dev-flow/s5-runtime-browser.mjs http://127.0.0.1:4173/ docs/dev-flow/s5-formal-evidence | 0 | 15/15 補充檢查通過 |
| curl --max-time 5 http://127.0.0.1:4173/ --output /dev/null | 7（預期） | 停止後連線被拒，確認 preview 未留下 |
| git diff --check | 0 | 差異無空白錯誤 |

兩支瀏覽器指令使用同一 Node 22 PATH，並指定 `PLAYWRIGHT_MODULE_DIR=/opt/codex/runtimes/cua/lib/node_modules`、`CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`；在沙箱外執行。實際為預裝 playwright-core 1.57.0／Chromium 151.0.7922.173，不是 Claude 使用的 Playwright 1.56.1。未安裝新瀏覽器套件。

既有瀏覽器腳本只新增可選的 playwright-core／系統 Chromium 路徑支援，沒有忽略錯誤或降低既有 22 項斷言。新增 15 項包括：production 起始 hidden 不建立 canvas、回前景不自動開始、明確重新開始、以 WEBGL_lose_context 真實觸發 context loss、之後的滑鼠／Esc／模擬觸控安全控制、320／640px production 文字放大與焦點／捲動可達性，以及 WebGL 停用時滑鼠／鍵盤／模擬觸控暫停。這仍是 headless Chromium + SwiftShader；hidden 模擬與 root 字級放大不代表真實分頁或原生文字縮放。

實際遇到並處理的失敗：

- 初次 typecheck exit 2／lint exit 1：TypeScript 將 await 前的 visibilityState 縮窄沿用到 await 後；以 isPageHidden() 每次重新讀取，不使用型別斷言或關掉規則。格式初次 exit 1，對修改檔執行 Prettier 後通過。
- 首次既有瀏覽器檢查為 21/22、exit 1：系統 Chromium 自動請求 /favicon.ico，preview 回 404；以明確的空 data favicon 阻止不必要的請求。index.html 是這次唯一追加的產品修正；重新建置後 22/22，正常路徑 console 無錯誤。
- 補充檢查初次 exit 1：320×360 放大文字時 Chrome 為保留「繼續」焦點捲動 36px。overlay.top 仍為196px、toolbar.bottom 為196px；面板頂端被自己的捲動區裁切，而非工具列覆蓋。檢查改成先回頂端核對標題，再分別驗證聚焦／捲動後的按鈕命中；15/15 通過。產品 CSS 不因這次腳本誤判而再更改。
- npm ci 提示精確版 ESLint 已停止支援；只記錄，未升級。npm 的 major 升級提示也未採用。

證據：

- [正式命令輸出](s5-formal-evidence/formal-checks.txt)
- [22 項瀏覽器結果](s5-formal-evidence/browser-22-result.txt)
- [15 項補充結果](s5-formal-evidence/runtime-15-result.txt)
- [context loss 後安全區畫面](s5-formal-evidence/context-loss-safety.png)
- [production 320px 放大文字](s5-formal-evidence/production-320-568-32.png)

F1–F4 已在本地完成修正與上述工程驗證；實機與專業內容審查仍未完成。本次沒有 commit、push 或觸發 GitHub Pages 更新。

