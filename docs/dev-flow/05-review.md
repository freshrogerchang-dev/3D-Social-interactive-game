# S5 獨立工程審查紀錄

後續修正紀錄：[05-fix-log.md](05-fix-log.md)。下文保留 de28605 審查當時的發現與證據；本地 F1–F4 修正已於 2026-10-09 完成正式 Node 22、38 項單元及 22+15 項 Chromium 驗證；實機與專業審查仍未完成。

日期：2026-10-08。審查基準：`main-uv12jr` 的 `de286057b5f0e113023f7b898c67ede9c76b1e93`。使用者指定 S5 審查；未修改產品程式，未安裝套件、啟動伺服器或發布新版本。

**結論：完成本次可執行的程式碼審查與局部重現，完整 S5 驗收未完成。** 找到四項 P2 問題；應先修正並補回歸驗證。實機、完整遊戲瀏覽器驗證、螢幕報讀器與專業內容審查仍待完成。既有 26 項單元測試與 22 項瀏覽器檢查不能覆蓋下列邊界。

## 1. 審查方法與環境限制

透過 GitHub 工具固定讀取上述 commit：AGENTS.md、STATE、01／02／03 指定章節、04、全部 src、tests、設定、package-lock 與 Pages workflow。不是本地 git clone。

- Node v24.19.0、npm 11.9.0；不符合專案 Node 22 規定。
- `curl --max-time 10 -I https://registry.npmjs.org`：exit 7，無法連接 proxy:8080。不是 npm 網域被拒絕的證據。
- npm ci、專案 typecheck／lint／format:check／Vitest／build：Codex 本次均未執行。
- 重現工具使用 Node 內建 stripTypeScriptTypes／vm 執行原始程式，邊界注入替身；不等於專案 Vitest 或真實 WebGL 通過。
- 局部版面檢查使用系統 Chromium 151.0.7922.173 與預裝 playwright-core，直接 setContent 載入原始 HTML/CSS，不啟動伺服器、不載入遊戲 JS。沙箱內 Chromium 因 setsockopt 限制退出；經執行權限審查後在沙箱外完成本地檢查。
- Playwright 預期快取的 Chromium 不存在；改用 /usr/bin/chromium。不是交接指定的 Playwright 1.56.1／完整瀏覽器腳本驗收。
- GitHub Actions [run 37845590764](https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/runs/37845590764) 的 build／deploy，以及 npm ci、typecheck、lint、test、Pages build 步驟均 success。workflow 以 .nvmrc 選 Node 22；不包含 format:check 或瀏覽器驗證。

## 2. 問題（依優先處理順序）

### F1 — P2：放大文字後工具列遮住休息面板

位置：src/styles.css:48、:123、:130。toolbar 可換行且高度隨文字增長，但 overlay 頂部空間只固定取 64px + 36px；flex 垂直置中在面板較高時也使面板向上擴展。

重現：原始 HTML/CSS，顯示 paused 面板及 resume／end、清除 loading status，root 字級由 16px 改 32px。在 640×360，toolbar bottom=92、panel top=42；在 320×568，toolbar bottom=184、panel top=70。兩者均重疊，320px 截圖可見「返回安全區」遮住標題。這是 200% root 字級的局部近似，不宣稱完成瀏覽器原生文字縮放驗收。16px 的同尺寸對照沒有重疊。

建議：以工具列實際高度安排面板區域，或使用能自然分配空間的版面；短視窗時讓面板從可用區域頂端開始並可捲動，不讓垂直置中裁掉內容。

修正驗收：320／640 CSS px、橫直向、16／32px root 字級及原生 200% 文字縮放；標題、所有動作與焦點不被工具列遮住，結束按鈕可到達，安全控制維持 ≥64px。焦點與點擊命中另測。

證據：[320px 放大截圖](s5-evidence/layout-320-568-32.png)、[640px 放大截圖](s5-evidence/layout-640-360-32.png)、layout.cjs。

### F2 — P2：背景初始化完成後仍啟動場景

位置：src/main.ts:77、:128、:134。初始化完成後只檢查實例與結果，沒有檢查分頁狀態；visibilitychange／pagehide 也只處理 running。

重現：頁面起始即 hidden，或可延遲的 init 尚未完成時送出 hidden 事件，init 完成後仍呼叫 start、狀態 running。替身腳本已重現這兩條路徑。正式 renderer 目前同步建立，不應把延遲替身的整段競態當作真實 GPU 行為；起始 hidden 未防護則直接存在於協調層。

影響：背景初始化忽略暫停規則；瀏覽器可能節流 RAF，但回前景仍可在未按「繼續」時進入執行。這是生命週期控制問題，不宣稱背景實際 FPS。

建議：初始化完成時決定是否保持休息／暫停；初始化中的 hidden／pagehide 應取消或保留暫停意圖，前景恢復由玩家明確選擇。

修正驗收：起始 hidden、初始化中 hidden、pagehide、回前景皆不能自動開始；保留正常前景載入；晚到結果仍正確釋放。

### F3 — P2：WebGL 出錯後「暫停」沒有作用

位置：src/main.ts:88、src/core/GameEngine.ts:98。pause 只在 initializing 時由 DOM 接管；error 時 engine.pause() 回 false。相鄰 returnToSafety 已處理 error，但 pause 未處理。

重現：注入 init 失敗使協調層顯示 error，再呼叫 UI 的 pause action，畫面仍為 error；probe.cjs 已重現。context lost 的 error 狀態亦走相同分支。按鈕存在不代表控制功能有效。

建議：error 時由 DOM 休息畫面接管並清理場景，保留重新開始路徑。

修正驗收：真實／注入 WebGL 不可用與 context lost 後，滑鼠、鍵盤、觸控均能暫停到 DOM 休息畫面；返回安全區、結束、重試仍可用且無多餘 canvas／RAF。

### F4 — P2：初始化後半段拋錯不會進入可讀錯誤狀態

位置：src/core/GameEngine.ts:153、:175、:180，src/main.ts:77、:145。runInit 的 try/catch 只包場景與 renderer 建立，後面的尺寸設定與第一次 render 在 catch 之外；startSession 沒有處理被拒絕的 Promise。

重現：使用真正 GameEngine 原始碼，替身 renderer.setSize 拋錯。init Promise 拒絕，但 engine.state 仍 ready、onError 未被呼叫。init-failure.cjs 已重現。這證明 renderer 初始化邊界的例外缺口，不證明真實 GPU 每次都會發生此錯。

影響：UI 可能停在「正在準備公園…」，並出現未處理 Promise rejection；已有資源不在這個失敗路徑立即釋放。

建議：將整個初始化／初次尺寸設定／繪製納入錯誤與清理策略；協調層亦要有最後的 Promise 錯誤邊界。RAF 內 render 例外目前同樣沒有錯誤轉移，後續驗收應覆蓋，但本次未用實機證明。

修正驗收：分別注入 setPixelRatio／setSize／初次 render 拋錯，回傳具型別失敗或被明確捕獲，顯示錯誤介面、停止 RAF、釋放部分資源，重試沒有殘留；同時測 dispose／init 競態。

## 3. 已核對與證據限制

- 原始碼有 DOM 常駐按鈕、單一 RAF 管理、停止後清時間基準、dispose 冪等、場景自行釋放 geometry／material；這是靜態符合性，不是此次完整 runtime PASS。
- 靜態產品範圍未見登入、儲存兒童資料、追蹤、NPC／對話／語音；不實作 Phase 2。
- CSS 不透明淺底深字；以 WCAG sRGB 相對亮度公式計算指定色對：ink/paper=13.78:1、border/paper=3.71:1、focus/paper=7.82:1。未計算所有合成背景或焦點周邊，也未完成 WCAG 符合性審查。
- lockfile v3 含 176 個 package entries（含根目錄），非根 entry 均有 license metadata。清單含 MIT、Apache-2.0、ISC、BSD-2-Clause、BSD-3-Clause、BlueOak-1.0.0、Python-2.0、MPL-2.0；不能把全部傳遞依賴宣稱 MIT。metadata 不代替原始 LICENSE／NOTICE 與發布義務盤點。
- main.ts 的 ResizeObserver 與全域監聽每頁只建立一次；場景 teardown 未 disconnect／移除，不能僅據此判每次重建都洩漏。頁面完整卸載／重新掛載契約及 heap／renderer.info 仍待查。
- browser-check.mjs 的「canvas 有尺寸（DPR 上限內）」只檢查寬高 >0，沒有驗證 DPR 上限；像素讀取的註解也沒有對應實際像素斷言。20 次重建只數 canvas，不能證明 GPU／heap 沒有累積。
- 正常路徑 22/22 與單元測試 26 項的既有證據有效，但不能排除 F1–F4。

## 4. 本次執行紀錄

| 命令／檢查 | 結果 | 可支持的結論 |
|---|---|---|
| curl --max-time 10 -I https://registry.npmjs.org | exit 7 | 終端代理連線阻塞 |
| node /tmp/s5-review/probe.cjs | 初版 exit 1；修正替身腳本跨 vm 的微任務等待後 exit 0 | F2 的兩條路徑、F3 已重現 |
| node /tmp/s5-review/init-failure.cjs | exit 0 | F4 已重現 |
| node /tmp/s5-review/layout.cjs | 快取 binary 缺失／沙箱啟動失敗各 exit 1；使用系統 Chromium 並取得沙箱外執行後 exit 0 | F1 局部版面重疊已重現 |
| node docs/dev-flow/s5-evidence/probe.cjs | exit 0 | 保存副本可重跑重現 |
| node docs/dev-flow/s5-evidence/init-failure.cjs | exit 0 | 保存副本可重跑重現 |
| CSS 對比、lockfile metadata 計算 | 在工具 JavaScript 執行並返回結果，無 shell exit code | 指定色對與 metadata 盤點 |
| npm ci、五項專案檢查、完整 browser-check.mjs | 未執行／未驗證 | 不標 Codex PASS |

重現腳本的 exit 0 代表「成功重現問題」，不是產品驗收通過。probe 使用 Node 24 內建實驗性轉譯，只作審查證據；不更改專案 Node engines。

## 5. 待完成的實機矩陣

| 項目 | 操作與證據要求 | 狀態 |
|---|---|---|
| 桌面 Chrome／Firefox／Safari | 記 OS／瀏覽器版本；載入、暫停、Esc／Tab／Enter、安全區、結束／重新開始 | 未驗證 |
| iPadOS Safari／Android 平板 Chrome | 型號、OS、橫直向、觸控目標、鍵盤彈出與安全區 inset；完整安全路徑 | 未驗證 |
| 原生文字 200%／窄版 | 瀏覽器原生文字縮放、320 CSS px；可捲動、焦點不遮蔽、無內容損失 | 局部 F1 重現；完整驗收未完成 |
| NVDA／VoiceOver | 按鈕名稱、讀序、live region、焦點轉移、canvas 的替代說明 | 未驗證 |
| 真實分頁／context lost | 系統切頁、背景載入、WEBGL_lose_context 後安全控制與重試 | 替身邊界重現；實機未驗證 |
| 20 次重建資源 | RAF／監聽數、heap 快照、renderer.info 趨勢 | 未驗證 |
| 效能 | production／實機，暖機 10 秒、量測 60 秒×3；平均 FPS、p95 frame time、冷暖載入、DPR | 未驗證 |
| 專業內容與兒童使用前門檻 | 依 03 §5／§6；專業審查獨立完成 | 未完成 |

後續先處理 F1–F4，再於 Node 22 重跑五項與完整瀏覽器檢查；取得實機資料後才能結束完整 S5。不自動進 Phase 2。

## 6. 文件與提交狀態

本次報告、證據快照與 STATE.md 更新僅在本地，尚未 commit／push。本工作階段先前的提交授權針對 S4 文件同步；S5 的新提交仍需逐項確認。push 到 main-uv12jr 會再次更新公開 Pages。產品程式與工作流程未改動。

