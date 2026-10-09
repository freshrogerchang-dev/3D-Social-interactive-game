# S5 補充審查：發布、可及性與資源

日期：2026-10-09。基準：`main-uv12jr`／`ab28b9a281698589e18f12f3e21ea9c5a22c93d1`。使用者要求繼續 S5；本輪只新增審查、重現腳本、證據與操作表，沒有改產品程式、安裝套件、啟動伺服器或發布。完整 S5 尚未通過。

補充：使用者已修改 Pages Source，F5 已在後續重新發布與線上 22＋15＋10 項檢查排除，見 §6；F6／F7 的本地修正與回歸見 §7。下文 §1–5 保留發現當時的證據。

## 1. 結論與待處理問題

### F5 — P1：公開 Pages 提供原始 HTML，場景未載入

2026-10-09 curl 與 Chromium 實際讀取正式網址，HTML 仍引用 `<script type="module" src="/src/main.ts">`。瀏覽器因此請求 `https://freshrogerchang-dev.github.io/src/main.ts`，沒有載入建置 JS／CSS；等待場景 30 秒逾時。DOM 安全按鈕仍出現，但 JS 沒有載入，不能把按鈕存在當作功能通過。

同一 commit 的兩套流程：

- [37952794274：Deploy to GitHub Pages](https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/runs/37952794274)，Vite build／deploy success。
- [37952793354：pages build and deployment](https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/runs/37952793354)，另有 Jekyll build／deploy，亦 success。

這與分支來源的 Jekyll 發布一致。工具未讀到 Pages Source 設定本身，不能宣稱已確認設定值或兩次 deploy 的確切覆蓋順序。需要使用者在 Settings → Pages → Source 確認改為 GitHub Actions，然後重跑 Vite 發布。只重跑 Vite、未處理發布來源，不足以排除後續覆蓋。

修正驗收：線上 HTML 引用 `/3D-Social-interactive-game/assets/*.js` 與 CSS；載入資源 HTTP 200、場景啟動、安全動作與錯誤路徑實際通過。先前回報「Actions 成功，網站已更新」只建立流程成功證據；本輪已更正網站可用性的判斷。

證據：[原始線上 HTML](s5-extended-evidence/pages-source.html)、[首次瀏覽器請求](s5-extended-evidence/pages-first-result.json)、[逾時輸出](s5-extended-evidence/pages-first-result.txt)。線上驗收為不通過，不以後述本地結果代替。

### F6 — P2：執行期 renderer 例外沒有錯誤轉移

位置：src/core/GameEngine.ts 的 frame／renderOnce、resize、returnToSafety；src/core/RenderLoop.ts 的 tick。F4 已修好初始化例外，但執行期仍沒有對應邊界。

Node 22 以 TypeScript 轉譯原始 core／scene、注入 renderer 與 scheduler，分別在初始化成功後的 frame.render、resize.setSize、returnToSafety.render 拋錯，3/3 均重現：

| 路徑 | 拋錯後 state | 待執行 RAF | onError |
|---|---|---|---|
| frame.render | running | 1 | 未呼叫 |
| resize.setSize | running | 1 | 未呼叫 |
| returnToSafety.render | running | 0 | 未呼叫 |

frame 先排下一幀，render 再拋錯；若 renderer 持續拋錯，排程仍會繼續。安全區路徑雖已停止 loop，但例外使相機重設後的 paused／DOM 安全狀態轉移未完成。這是注入例外的工程證據，不宣稱某台 GPU 已遇到相同硬體錯誤。

建議修正：集中執行期錯誤轉移，停止 loop、清理資源並顯示可操作的 DOM 錯誤／休息畫面；返回安全區遇到渲染例外時也須完成 DOM 接管。補三條路徑的正式單元測試及重試回歸。

證據：[重現腳本](s5-extended-evidence/runtime-error-proof.cjs)、[3/3 重現結果](s5-extended-evidence/runtime-error-result.txt)。exit 0 表示重現成立，不是驗收通過。此腳本用 CommonJS 邊界載入 three，會有 THREE_CJS_DEPRECATED 提示；正式產品仍採 ESM，未修改工具設定。

### F7 — P2：建置發布物未附 three 的 MIT 授權文字

package.json 的唯一 runtime 依賴為 three 0.186.1；node_modules/three/LICENSE 的 MIT 條件要求隨副本保留著作權與許可通知。本地 dist 只有 HTML／CSS／JS，沒有 LICENSE／NOTICE，JS 也未保留 three 的授權標頭或完整 MIT 文字。僅 package-lock 的 license="MIT" 不能代替發布物內的許可通知。

建議修正：將實際隨網站發布的第三方程式碼及 bundler runtime helper 盤點後，隨靜態建置提供 THIRD_PARTY_NOTICES，至少保留 three 的完整原文；確認 dist 與 Pages 均可取得。這是具體發布檔案缺口，不宣稱完整法律審查完成。

three LICENSE SHA256：`8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc`。本輪尚未修正或發布 notice。

### 資源觀察：21 個 detached canvas，原因尚待定位

DPR=3、1280×720、SwiftShader，初次結束後再重建 20 次，每 5 次強制 GC／讀 CDP heap 與 DOM counters。監聽數固定 30；scene canvas／待執行 RAF 每次結束皆為 0，整輪最大 RAF=1。

| 重建次數 | GC 後 used JS heap（bytes） | DOM nodes | 監聽數 |
|---|---|---|---|
| 0 | 3,312,884 | 124 | 30 |
| 5 | 3,800,036 | 132 | 30 |
| 10 | 4,273,912 | 137 | 30 |
| 15 | 4,400,532 | 142 | 30 |
| 20 | 4,549,708 | 147 | 30 |

DOM.getDetachedDomNodes 回傳 21 個帶 scene-canvas／three r186 的 detached CANVAS。這比單純數 canvas 更完整，但尚未取得 heap retainer paths、排除瀏覽器／DevTools／測試工具持有或 context 回收延遲；不能直接宣稱永久洩漏，也不能宣稱無洩漏。下一步應比較無測試插樁、延遲回收與 heap snapshot 的持有鏈，另查 renderer.info／真實 GPU。

## 2. 已完成的局部工程檢查

本地 dist 由 Playwright route 讀取檔案，不啟動 preview。URL 只是路由測試的虛擬來源，**不是正式 Pages 成功證據**。Node 22.22.0、預裝 playwright-core 1.57.0、Chromium 151.0.7922.173、SwiftShader；兩次執行各 10/10 通過，第二次另保存 detached DOM 診斷。

- DPR 3 時實際 canvas ratio=2，補足舊腳本只驗寬高非零的缺口。
- 可及樹：執行中「暫停」「返回安全區」名稱正確；休息畫面含標題、繼續、結束；隱藏重試／重新開始未外露。
- 暫停 pending RAF=0，等待後回呼計數不增加；20 次重建最大 pending RAF=1，結束均為 0。
- 320px 調整行高／字距／詞距／段落間距後，四個可見按鈕皆可聚焦、命中、≥64px。只涵蓋該休息畫面與按鈕，不宣稱所有文案或 WCAG 1.4.12 全面通過。
- 本地載入無未處理 JS 例外；本地路由只發出同 origin 靜態 GET。這不是公開網站的流量稽核。
- 實際兩個 headless 分頁 bringToFront 前後 visibilityState 仍 visible；沒有 hidden 事件，系統切頁維持未驗證。

可及樹名稱不能代替 NVDA／VoiceOver 實測；root 字級放大不能代替原生文字 200%；本輪未量實機 FPS、載入時間或 GPU 資源。

證據：[10 項輸出](s5-extended-evidence/local-result.txt)、[AX／資源／請求 JSON](s5-extended-evidence/local/browser-result.json)、[文字間距截圖](s5-extended-evidence/local/text-spacing-320.png)。

## 3. 傳遞依賴盤點

鎖檔非根項目 175；本機已安裝 152，另 23 項未安裝，主要是其他平台選用項目，未讀其實際授權檔。

| lockfile license | 項目數 |
|---|---|
| MIT | 129 |
| Apache-2.0 | 17 |
| MPL-2.0 | 12 |
| ISC | 7 |
| BSD-2-Clause | 6 |
| BSD-3-Clause | 2 |
| BlueOak-1.0.0 | 1 |
| Python-2.0 | 1 |

145 個已安裝項目在套件根目錄有授權／NOTICE 類檔案；本輪保存檔案 SHA256，未逐一作法律內容解讀。原本另 7 項沒有根目錄授權檔：esrecurse 與 imurmurhash 的完整許可文字在 README／原始碼找到；natural-compare 只有 MIT 標示與外部連結，@humanfs/types、兩個 @rolldown binding、keyv 只有 metadata 等資訊，本輪未補取完整文字。完整傳遞授權／散布義務盤點仍未完成。

多數項目是 dev tool 或 dev tool 的依賴，不能把其全部 license 當作網站 runtime 的授權組合；依最終發布檔案辨認義務。清單見 [license-inventory.json](s5-extended-evidence/license-inventory.json)。

## 4. 指令與 exit code

| 指令 | exit code／結果 |
|---|---|
| curl --fail --location --max-time 30 https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ --output /tmp/s5-online.html | 0；讀到原始 HTML |
| node docs/dev-flow/s5-extended-browser.mjs（線上 URL） | 1；等待場景 30 秒逾時，不通過 |
| node docs/dev-flow/s5-extended-browser.mjs https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ docs/dev-flow/s5-extended-evidence/local --local | 0；10/10；第二次增加 detached DOM 診斷仍 exit 0 |
| node docs/dev-flow/s5-extended-evidence/runtime-error-proof.cjs --baseline | 初版 1：腳本誤用 scenes／config 目錄；修正成實際 core／scene 後 0，3/3 問題重現 |
| Python lockfile／已安裝 license inventory | 0；175 項 metadata／152 項已安裝文件盤點 |
| node --check docs/dev-flow/s5-extended-browser.mjs | 0 |
| git diff --check | 0 |
| 安裝、五項檢查、preview、commit、push | 本輪未執行；只新增 docs 與審查工具，產品基準的既有五項證據見 05-fix-log.md §5 |

Node 指令使用 /tmp/node-v22.22.0-linux-x64/bin/node。Chromium 沙箱外執行；網路保留 HTTPS_PROXY，未停用 TLS 驗證，未繞過政策。Cloud spec 37：running／connected、observations_current=true、unrestricted／enforced；無 VPN。

## 5. 下一步與 S5 狀態

1. 處理 F5 的 Pages Source 與線上建置版本驗證；使用者設定回覆待確認。
2. 修正 F6 執行期錯誤邊界，補 F7 發布通知；定位 detached canvas 持有鏈。
3. 使用 [實機與專業審查操作表](05-device-review-checklist.md) 補外部驗證。表中沒有填入虛構結果，也未聯絡任何審查者。

本輪新增文件／證據尚未提交。完整 S5 未通過，不進 Phase 2。


## 6. F5 Pages 修正與線上驗證

使用者於同日回覆「已改好了」，已在 GitHub 將 Source 設為 GitHub Actions。重新發布前 curl 仍讀到原始 HTML，表示改 Source 不會自動把既有頁面換成 Vite 產物。

透過 github_rerun_workflow_job 重跑 Vite deploy job 113895799734，API success；run 37952794274 的第 2 次 attempt 最後為 success，build／deploy 均 success。部署 commit 保持 ab28b9a，未新增 commit／push。這是重新發布已核准版本，不是發布本地新增文件或修正 F6／F7。

重新發布後：

- curl 正式 HTML exit 0，引用 `/3D-Social-interactive-game/assets/index-C1phOaOP.js` 與 `index-qvAmfl4J.css`，沒有 `/src/main.ts`。
- curl 線上 JS exit 0；SHA256=`04e64b0b3dfe30fd2a9d6b02fcc7341bbdea8141839841ae745010db93098927`，與本地已驗證 dist 一致。
- 公開網址 browser-check.mjs 22/22、exit 0；s5-runtime-browser.mjs 15/15、exit 0。含滑鼠／鍵盤／模擬觸控、窄畫面、正常 console 無錯誤、20 次重建及真實軟體 WebGL context loss／停用 WebGL 後的安全動作。
- 檢視公開網址 desktop-running 截圖，公園地面與兩個安全按鈕正常顯示。

命令（Node 22.22.0；預裝 playwright-core 1.57.0／Chromium 151.0.7922.173；沙箱外執行）：

```bash
# 兩支腳本新增可選 PLAYWRIGHT_PROXY_SERVER；沿用既有 HTTPS_PROXY，沒有停用 TLS。
PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH PLAYWRIGHT_MODULE_DIR=/opt/codex/runtimes/cua/lib/node_modules CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium PLAYWRIGHT_PROXY_SERVER="$HTTPS_PROXY" node docs/dev-flow/s4-screenshots/browser-check.mjs https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ docs/dev-flow/s5-extended-evidence/pages
PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH PLAYWRIGHT_MODULE_DIR=/opt/codex/runtimes/cua/lib/node_modules CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium PLAYWRIGHT_PROXY_SERVER="$HTTPS_PROXY" node docs/dev-flow/s5-runtime-browser.mjs https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ docs/dev-flow/s5-extended-evidence/pages-supplementary
```

代理選項只影響 docs 測試工具的網路，不降低原有斷言；沒有安裝、啟動伺服器或改產品設定。既有五項 Node 22 驗證仍見 05-fix-log.md §5，本輪沒有宣稱重跑五項。

F5 已排除；F6／F7、資源持有鏈與完整 S5 外部驗收仍待完成。證據：[HTML](s5-extended-evidence/pages/index.html)、[22 項結果](s5-extended-evidence/pages/browser-22-result.txt)、[15 項結果](s5-extended-evidence/pages-supplementary/runtime-15-result.txt)、[重新發布 jobs](s5-extended-evidence/pages/redeploy-jobs.json)、[公開網站截圖](s5-extended-evidence/pages/desktop-running.png)。


## 7. F6／F7 修正與正式回歸

沿用本工作階段 S5 的程式修正與提交／推送授權，完成下列修正，不進 Phase 2：

- GameEngine 的 frame／resize／returnToSafety 增加 unknown 例外邊界；失敗停止 RAF、移除 context listener、釋放 park／renderer、轉入 error 並呼叫 onError('render-failed')。初始化仍由 runInit 處理 init-failed，避免誤把 init 當成功。
- main 的返回安全區繪製失敗時立即 teardown 並顯示 safety-rest；不要求使用者再按一次安全按鈕。
- 新增 5 個引擎例外回歸：frame、setPixelRatio、setSize、paused render、safety render；確認無拋到呼叫端、資源只釋放一次、RAF 歸零、不再接收舊 context loss，且新引擎可啟動。
- 新增 1 個 main 協調層回歸：安全區渲染失敗後 DOM 接管、canvas 移除、可重新開始。
- 新增 public/THIRD_PARTY_NOTICES.txt，保留 three 0.186.1 的完整 MIT 許可與著作權，以及 Vite 8.3.3 runtime helper 的核心 MIT 許可。Vite 公開 LICENSE 中的建置工具 bundled dependencies 沒有因此全部當作網站 runtime 散布；完整傳遞依賴義務仍待盤點。

Node 22.22.0／npm 10.9.4：typecheck、lint、format:check、test、build 最終均 exit 0；Vitest 4 檔 44 項。首次 lint exit 1 是新測試中的 void shorthand callback，改為區塊回呼後通過，未降低 lint 規則。build JS 539.81 kB、gzip 134.95 kB，既有 >500 kB 警告仍保留。cmp public/THIRD_PARTY_NOTICES.txt dist/THIRD_PARTY_NOTICES.txt exit 0。

瀏覽器本地 dist（Playwright route 提供，未啟動伺服器）：

| 指令／檢查 | exit code | 結果 |
|---|---|---|
| s5-local-dist-runner.mjs 執行原 browser-check.mjs | 0 | 22/22 |
| s5-local-dist-runner.mjs 執行 s5-runtime-browser.mjs | 0 | 15/15 |
| s5-render-errors-browser.mjs | 0 | 4/4：frame、resize、paused-resize、safety；注入 WebGL drawElements 或 canvas width setter 例外，驗證可讀狀態、RAF=0、DOM 安全接管、重新開始及無未處理 pageerror |
| runtime-error-proof.cjs（最新本地 source） | 0 | 3/3 回歸；加 --baseline 可重現 ab28b9a 原問題 |
| node --check 新增／修改瀏覽器腳本 | 0 | 語法通過 |
| git diff --check | 0 | 無空白錯誤 |

這是可控制的 renderer／WebGL API 注入例外，不能宣稱已模擬所有 GPU 失效；既有 context-loss extension 測試仍有效。沒有新增依賴、修改設定檔或啟動伺服器。

證據：[五項輸出](s5-extended-evidence/fixes/five-checks.txt)、[22 項](s5-extended-evidence/fixes/browser-22-result.txt)、[15 項](s5-extended-evidence/fixes/runtime-15-result.txt)、[4 項 renderer 例外](s5-extended-evidence/fixes/render-errors-result.txt)、[source 例外回歸](s5-extended-evidence/fixes/runtime-error-result.txt)。本節隨修正提交；新 commit 的公開發布結果以 Actions 與線上實際驗證為準。

F6／F7 已本地修正；detached canvas 持有鏈、實機、原生文字縮放、報讀器、效能、專業審查仍待完成。完整 S5 未通過。
