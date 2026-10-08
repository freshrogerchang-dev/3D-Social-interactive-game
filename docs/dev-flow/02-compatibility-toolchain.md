# S2 相容性與工具鏈（軟體精簡版）

日期：2026-10-07。**S2 文件與唯讀盤點完成；完整工具鏈、API 編譯與裝置執行尚未驗證，不能標 PASS。**

## 1. 範圍、規範與現況

本 session 依 S1 第 11 節交接執行，只新增本文件並更新 STATE.md。無安裝、專案初始化、遊戲實作、部署、commit/push；不進入 S3–S5。

已讀 STATE.md、S1 文件及可用 `C:/Users/fresh/.agents/skills/s2-hw/SKILL.md`、`C:/Users/fresh/.agents/skills/dev-flow/CONVENTIONS.md`；指定 `.Codex/skills/dev-flow/CONVENTIONS.md` 仍不存在，專案實體 AGENTS.md 仍不存在，沿用使用者提供的全域指示。已回查兩份原始設計文件的套件／API 相關段落。使用者文件限定指示優先於 skill 的安裝與 schema 通用模板。

現在專案只有兩份原始設計文件與 S1 階段文件，沒有 package.json、node_modules、鎖檔、程式碼或 CI。`git status --short` 仍回報非 Git 倉庫，無法用 Git 判定未提交差異；沒有初始化 Git。原始設計文件與 S1 文件在本 session 前後以 SHA256 核對，保留不變。

證據標籤：**本機已讀取**＝命令／檔案結果；**官方文件已查證**＝公開文件或套件 metadata；**候選建議**＝未獲使用者確認的版本與設定；**未驗證**＝未安裝、未編譯或未實機執行。文件查證不是整合測試。

## 2. 硬體、韌體與通訊

無 MCU、感測器、外接裝置或韌體需求；硬體採購、OTA、BLE／serial、模擬器及通訊封包不適用。桌面與平板是瀏覽器驗收載具，仍需實機檢查，不能因無韌體而略過。

| 項目 | 本機唯讀結果 | 限制 |
|---|---|---|
| Windows | OSVersion 10.0.26200.0；Registry DisplayVersion 25H2、CurrentBuild 26200 | Registry ProductName 顯示 Windows 10 Home，名稱與 build 世代不一致；不以名稱單獨判定 Playwright OS 支援，後續核對實際 Windows 版本 |
| Node | v22.21.0；實際 process.execPath 為 C:/Program Files/nodejs/node.exe | PATH 另有 Codex bundled node，不能混用兩個 runtime 的版本／套件 |
| npm | 10.9.4；命令來自 C:/Program Files/nodejs | 只執行 --version，沒有 npm install／npx／npm exec |
| Chrome | 檔案 ProductVersion 154.0.8037.98 | C:/Program Files/Google/Chrome/Application/chrome.exe；僅讀 metadata，未啟動／驗證 WebGL |
| Edge | 檔案 ProductVersion 154.0.4258.53 | C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe；同上 |
| Firefox | C:/Program Files/Mozilla Firefox/firefox.exe 未找到 | 不是完整系統搜索，不能斷言未安裝 |
| Safari／平板 | 未提供實機型號、OS、瀏覽器版本 | 未驗證；Windows WebKit 自動化不等於 iPadOS Safari 實機 |

## 3. 軟體相容性矩陣與候選版本

查證日期 2026-10-07。**推薦候選組合**：現有 Node 22.21.0 + npm 10.9.4；Vite 8.x、Vitest 5.x、TypeScript 5.9.3、Three 0.186.x 與相同 minor 的 @types/three、ESLint 9.x + 同 major @eslint/js + 支援該 TS 版本的 typescript-eslint、Prettier 3.x。這是降低變數的候選，不是已解算且可安裝的鎖定組合。套件精確 patch、peer dependencies、傳遞依賴須在後續獲准安裝前核對 registry metadata。

| 元件 | 官方需求／版本證據 | 本機專案版本 | 狀態與處理建議 |
|---|---|---|---|
| Node／Vite | Vite Guide 下限 Node 20.19+、22.12+；官方 main package.json 顯示 Vite 8.3.3、MIT | Node 22.21.0；Vite 無 | Node 數值符合文件下限；main 不是 npm 發布保證，Vite 8.x 候選未安裝／未驗證 |
| npm | 已讀 10.9.4；採 npm package-lock 與 npm ci | npm 可呼叫，無鎖檔 | 可執行版本命令；套件取得／解析未驗證 |
| TypeScript | 官方有 5.9.3 release；npm latest metadata 本次為 7.0.2（Apache-2.0） | 無 | 建議 5.9.3，避免直接 latest；其 npm 版本 metadata 本次未取得，不代表不可用 |
| typescript-eslint | 文件 TS >=4.8.4 <6.1.0；ESLint ^8.57.0 或 ^9 或 ^10；Node ^18.18／^20.9／>=21.1 | 無 | TS 7.0.2 超出文件支援範圍；5.9.3 位於範圍內，但 peer 解算與 lint 未驗證 |
| ESLint | 當前文件 Node ^20.19／^22.13／>=24、型別需 TS ≥5.3 | 無 | 本機 Node 數值符合；建議 9.x 保守線，不把當前文件當 ESLint 9 所有 patch 的 metadata |
| Three.js | npm latest metadata 0.186.1、MIT；WebGLRenderer 文件要求 WebGL2，r163 起不支援 WebGL1 | 無 | 0.186.1 可作候選，尚未安裝／編譯／渲染 |
| @types/three | DefinitelyTyped main 顯示 0.186.9999（原始碼開發標記，非 npm 可安裝版） | 無 | 選正式已發布 0.186.x；不能把 0.186.9999 拿去安裝；不假定 patch 必須相同 |
| Vitest | Guide Node ≥22.12、Vite ≥6.4；main package.json 5.0.3、MIT | 無 | 本機 Node 與 Vite 8.x 候選滿足文件下限；發布與整合未驗證 |
| Prettier | 官方建議本地安裝並鎖 exact；MIT | 無 | 候選 3.x；patch／Node engine 待核對；獨立格式檢查，不與 lint 混為一談 |
| @types/node | 僅用於工具／測試的 Node 型別 | 無 | 建議 22.x 配 runtime；瀏覽器 app 型別與 Node tests 分離 |
| DOM 測試環境 | Vitest 預設 node，支援另装 jsdom 或 happy-dom | 無 | 核心 loop 測試優先 node + 注入 scheduler／renderer；若有 DOM 單測，再選 jsdom 並核對 engines。不能用 DOM 模擬驗證 WebGL |
| @playwright/test | 官方列 Node 最新 22/24/26，Windows 11+ 等；提供 Chromium／Firefox／WebKit | 無 | 後續選用；本機 22.21 非已確認最新 patch，不能僅憑 major 判符合最新要求。瀏覽器 binaries 與 OS 配套未驗證 |

來源：[Vite Guide](https://vite.dev/guide/)、[Vite package metadata](https://github.com/vitejs/vite/blob/main/packages/vite/package.json)、[Vitest Guide](https://vitest.dev/guide/)、[Vitest package metadata](https://github.com/vitest-dev/vitest/blob/main/packages/vitest/package.json)、[TS 5.9.3 release](https://github.com/microsoft/TypeScript/releases/tag/v5.9.3)、[TS latest registry](https://registry.npmjs.org/typescript/latest)、[typescript-eslint 版本表](https://typescript-eslint.io/users/dependency-versions/)、[ESLint 起始說明](https://eslint.org/docs/latest/use/getting-started)、[Three registry](https://registry.npmjs.org/three/latest)、[@types/three 原始 metadata](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/three/package.json)、[Prettier 安裝](https://prettier.io/docs/install)、[Vitest 環境](https://vitest.dev/guide/environment.html)、[Playwright 安裝與系統要求](https://playwright.dev/docs/intro)。

### 查證限制與版本解算門檻

web 工具能取得 TypeScript／Three latest metadata，其他多個 registry endpoint 未能讀取。本機唯讀 Invoke-RestMethod 查詢 registry.npmjs.org 失敗，錯誤為主機名稱解析失敗；這是本次網路限制，不是套件不存在或不相容。未安裝、未嘗試 npx 暫時下載，也未變更 DNS／npm registry。GitHub main 文件可能領先正式發布；本文件明確區分。

後續安裝前需取得各候選 exact 版的 engines、peerDependencies、license、dist.integrity；若推薦 main 版本尚未發布，選同 major 正式 patch 並記錄理由。不得以 --force／--legacy-peer-deps 消除相容性問題。若 TS 升級，先重查 lint 支援範圍，不直接全部 latest。

建議 package.json 記錄 Node >=22.21.0 <23 與 npm 10.9.4（候選重現環境，不是安全更新政策）；日後 Node 22 patch 更新需記錄並重跑檢查。頂層依賴 exact pin、保存 package-lock.json，後續用 npm ci；不得把共享 Codex runtime 或其他專案 node_modules 當專案依賴。傳遞依賴與實際完整授權只能在鎖檔產生後盤點。[npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci/)

## 4. TypeScript、lint 與測試設定計畫

以下是後續 S4 的設定草案，不建立任何設定檔。

- 使用 ESM、vanilla TypeScript，Vite moduleResolution=Bundler 候選；app 使用 DOM／DOM.Iterable／ES2022 型別與 noEmit。strict=true，建議加 noUncheckedIndexedAccess；catch unknown 後縮窄，不以 any 補洞。工具／測試可分 tsconfig，typecheck 必須涵蓋兩者。[TS strict](https://www.typescriptlang.org/tsconfig/strict.html)
- Vite 轉譯 TS 不保證型別正確；scripts 分 `dev: vite`、`build: vite build`、`preview: vite preview`、`typecheck: tsc --noEmit`（若拆 config 則涵蓋全部）、`test: vitest run`、`lint: eslint .`、`format:check: prettier --check .`。這些只是文件草案，尚無 npm scripts。[Vite TypeScript](https://vite.dev/guide/features.html#typescript)
- ESLint flat config 採 @eslint/js + typescript-eslint；明確 no-explicit-any，strict 本身不禁止顯式 any。對 Promise／unsafe 操作如採 typed lint，設定 projectService 並只涵蓋納入專案的 TS 檔；不把 browser globals 給 Node config。[typescript-eslint 入門](https://typescript-eslint.io/getting-started/)
- Vitest node 環境測單一 RAF、重複 start、pause、resume 第一幀 delta=0、dispose、初始化錯誤及晚到結果。RAF scheduler／renderer 用介面替身，fake timer 只能驗計時邏輯，不代表畫面／觸控已驗證。
- 真實 DOM 焦點、暫停後按鈕、resize/context loss 用後續瀏覽器驗收；jsdom 不提供真實 GPU。Playwright 可選用來自動化 UI，但 WebKit 與平板模擬不等於真實 Safari、iPad 或 FPS。

## 5. 原始範例 API／套件疑點核對

| 原始來源 | 查證／靜態判讀 | 後續處理與狀態 |
|---|---|---|
| 路線圖 Phase 1 L229 ACESToneMapping | Three 正式常數為 ACESFilmicToneMapping；outputColorSpace 可用 SRGBColorSpace | 改採正式名稱；文件已查證，編譯未驗證。[Three renderer](https://threejs.org/docs/pages/WebGLRenderer.html) |
| 藍圖 §10.2 L1550 debugInfo.getParameter | extension 提供 enum，取值是 gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)，須先檢查 extension 是否存在 | 不依 GPU 字串推測正式畫質；骨架不需要此辨識。[Khronos extension 規格](https://registry.khronos.org/webgl/extensions/WEBGL_debug_renderer_info/) |
| 藍圖 §8.2／8.6 proximityStopDistance | schema 在 behavior，讀取卻是 safety；near 分支先 return，可能略過互動提示 | 原始文字靜態確認，非外部 API；MVP 靜止 NPC 避免此排程複雜度，後續型別與流程測試 |
| 藍圖 §10.6 settings／this.settings、NPCLineData | 範例未完整保存／宣告相關欄位，呼叫資料也不一致 | 不當完整可編譯實作；S4 按 S1 縮小契約實作並 typecheck |
| 路線圖建構 L861／藍圖附錄 A howler.js | 正式 npm 名稱 howler，import { Howl, Howler } from 'howler'；官方 MIT | 未做語音則不安裝；@types/howler 正式版另核對。[Howler](https://github.com/goldfire/howler.js) |
| 路線圖 L864 three-gltf-pipeline／藍圖附錄 A | Cesium 官方工具是 gltf-pipeline，Apache-2.0；用於離線處理模型 | 不判定 three-gltf-pipeline 不存在，但不能當同一包；骨架無模型管線需求。[gltf-pipeline](https://github.com/CesiumGS/gltf-pipeline) |
| 藍圖 §11.2 tx.done／objectStore.get | idb openDB 回傳 Promise 封裝資料庫，tx.done 是其擴充，原生 IDBTransaction 無此屬性 | MVP 無儲存；若後續採 idb（ISC 授權），明確 openDB 型別及 transaction 完成語意。[idb](https://github.com/jakearchibald/idb) |
| 藍圖 §10.3／10.5 pause、setTimeout | 瀏覽器 timer 不會因引擎 isPaused 自動凍結；回呼可能退出後讀取已清空的 currentTree | 採 S1 單一模擬時鐘、取消／失效回呼、恢復時間基準；runtime 未驗證 |
| 藍圖 §10.4 每幀 new／固定 slerp | 與路線圖禁每幀配置衝突；固定因子與幀率相關 | 重用暫存物件、delta 相關平滑；不把降低靈敏度或 timeScale=0.5 等同完整 reduced motion |
| 藍圖 renderer.dispose | Renderer 釋放不能替代場景 geometry/material/texture 的擁有權清理，也不清除自己掛的 DOM listeners | 各資源明確 owner，dispose 可重複；後續測 20 次重建及 late init，不宣稱無洩漏 |

授權修正說明：S1 工具比較把 Howler 與 idb 合列為「均 MIT」，官方 idb LICENSE 實為 ISC。本 session 不修改 S1 文件；以本節明確更正查證事實，這不改變產品決策。其他直接套件：Vite／Vitest／Three／Prettier／ESLint 通常為 MIT、TypeScript Apache-2.0、typescript-eslint MIT；正式選版時核對發布包 LICENSE。模型／音訊／字型有獨立授權，不能由函式庫授權推論。

## 6. 桌面／平板瀏覽器與能力矩陣

| 驗收目標 | 建議條件與操作 | 本次狀態 |
|---|---|---|
| Windows Chrome／Edge | 本機版本作初始矩陣；HTTP dev 與 production preview 各測；WebGL2 可建立才進入 3D；鍵盤／滑鼠／DOM 操作 | 檔案版本已讀；app／GPU 未驗證 |
| 桌面 Firefox | 後續確認實際正式版與硬體加速；不要依 Chromium 結果外推 | 路徑未找到，執行未驗證 |
| macOS Safari | 取得實機 OS／Safari／DPR，測 resize、焦點、WebGL2、失焦暫停 | 無實機，未驗證 |
| iPadOS Safari | 實機型號／OS／Safari 待取得，橫直屏、單指操作、safe-area、取消觸控、200% 字級 | 未驗證；不以模擬替代 |
| Android 平板 Chrome | 如為目標，需指定型號／OS／Chrome；低階 GPU、DPR／旋轉與觸控驗收 | 是否正式支援待實機矩陣，未驗證 |

Vite 現行文件的 dev 預設採較新的瀏覽器能力，production 預設 target 以固定 Baseline 年份決定；dev 能否開啟與 production 相容性需分測。若需更舊 Safari，先選明確 build.target 並驗證；語法轉譯不能補 WebGL2 或缺失的瀏覽器 API，不先加 legacy plugin。[Vite 瀏覽器說明](https://vite.dev/guide/)

能力檢查／降級建議：

- WebGLRenderer 自 r163 只支援 WebGL2，不能 getContext 失敗就把畫質設 low 後照常初始化。呈現 DOM 可讀錯誤、重試／結束；context lost 暫停與提供明確恢復。特定 renderer 能建立不保證長時間 GPU 穩定。[Three renderer](https://threejs.org/docs/pages/WebGLRenderer.html)
- Pointer Events 統一 mouse／touch／pen；在操作區限定 touch-action，處理 pointerup、pointercancel、lostpointercapture、blur／hidden 清輸入。UI 不需雙指同時移動／轉向，保留鍵盤與按鈕導覽。[Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- Pointer lock 為選用，需主動操作、成功／錯誤事件及退出機制；平板不用它。ESC 與退出後回復焦點；不同瀏覽器返回 Promise 的行為要防守處理。[Pointer Lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)
- DPR ≤2 是上限而非效能保證，平板候選先 1；以容器 CSS 尺寸更新相機 aspect/projection、renderer buffer，零尺寸暫不渲染。DOM 字級不跟 render resolution 縮小。安全按鈕避開 notch／工具列，縮放及旋轉後不可遮擋。
- 暫停不讓 DOM 停止操作；恢復首幀 delta=0，hidden 不自動恢復；參考 prefers-reduced-motion 但保留使用者控制。實機驗收再判是否可用，不宣稱感官安全或療效。

效能仍沿 S1 條件：production build、前景、記錄設備／viewport／DPR／刷新率／電源、暖機 10 秒後 60 秒量測 ×3。桌面 60 FPS、入門平板 30 FPS 僅目標；FPS、p95 frame time、載入與記憶體全部未驗證，不以 browser metadata 判 PASS。

## 7. MCP／開發工具與 Database

| 工具 | 用途／session | 本次可用性與需求 |
|---|---|---|
| PowerShell／命令工具 | S2 唯讀盤點；S4/S5 執行檢查 | 本次已用；不使用 npm exec／npx 隱式下載 |
| web 官方資料查詢 | S2 相容性、S3 證據查詢 | 本次可用；本機 registry DNS 失敗不妨礙文件查證 |
| Codex Browser／CUA | 後續 S4/S5 UI 驗收 | 本次會話提供 browser 工具，但本次未建立頁籤或確認可控瀏覽器；可用工具不等於已驗 app |
| Playwright | 後續可選自動化 | 專案未安裝、binaries 未驗證；不是現有瀏覽器驗收證據 |
| 額外 MCP server | 無 runtime 必要 | 無需新增、搜尋 registry 或連接帳號；不推測 Supabase／GitHub 帳號已連線 |

Database：骨架／MVP 無持久資料需求，僅記憶體狀態；不選雲端 DB，不建立 schema／migration／RLS。無登入、第三方 API、API key、rate limit 或服務計費需求。後續若保留偏好，可再選 local storage；若儲存兒童進度，另定用途、保存／清除與授權，不因 skill 的預設就加入 Supabase。

## 8. 待安裝／待申請與驗證方案（未執行）

目前不要求申請 API key 或 MCP。候選待安裝：three；開發依賴 Vite、TypeScript、@types/three、@types/node、ESLint、@eslint/js、typescript-eslint、Prettier、Vitest。jsdom 與 @playwright/test／瀏覽器 binaries 僅在所需測試確定後加入；Howler、idb、gltf-pipeline、i18next 不預裝。

精確 patch 尚待 registry 查證，因此不提供可誤執行的全套 latest 安裝命令。以下是後續獲准時的程序，**不是本 session 執行指令或驗證結果**：

1. 在專案目錄核對 runtime 路徑與候選 exact engines／peers／授權，解決 TS latest 與 lint 範圍衝突；固定頂層版與 npm／Node 資訊。
2. 手動建立最少 package／config 與 Phase 0 骨架，保留既有 docs，避免 create-vite 對非空資料夾覆寫。執行一次獲准安裝，生成 package-lock，確認 npm ls 無 invalid peer。
3. 跑 typecheck、lint、format:check、vitest run、build；結果需保留命令、版本、exit code。重現環境以 npm ci 安裝鎖檔。
4. 使用 HTTP dev／production preview 驗證安全 UI、WebGL2、初始化失敗、pause/resume、resize/dispose；必要時再安裝 Playwright binaries，分開報告自動化與實機證據。
5. 實機桌面／平板測操作、文字／焦點、旋轉及效能，缺裝置仍標未驗證；不以測試全綠或可 build 宣稱完整驗收。

## 9. 風險、未決問題與狀態結論

- Q1 年齡／閱讀程度／陪同、Q2 自由移動或固定站點、Q3 真人語音必要性仍未回答；保留 S1 的建議身分，不自行批准。
- 最新 TS 與 lint 支援範圍不一致；候選與鎖檔整合未驗證。部分 exact metadata 無法取得，不能承諾完整工具鏈可安裝。
- WebGL2、瀏覽器與平板實機、FPS、載入／記憶體均未驗證；Safari 與平板型號待取得。
- 專業內容審查未開始，MVP 安全與無障礙仍需 S3 與後續實測。
- S2 僅標「完成（文件與唯讀盤點；整合未驗證）」；S3/S4/S5、所有功能 Phase 0–10 仍未開始。S1 的 idb 授權誤列已在本文件更正，無產品方向變更。

## 10. 下一個 session

建議指令：`/s3-research 社交情境內容、無障礙依據與專業審查需求`。本次停止，不自動執行。

```text
請在 C:\Users\fresh\projects\Social-interactive-game 執行 /s3-research，使用繁體中文。
先讀 AGENTS.md（若有）、docs/dev-flow/STATE.md、01-landscape-architecture.md、02-compatibility-toolchain.md 與可用 skill／CONVENTIONS。
S1/S2 文件整理完成，工具鏈整合與瀏覽器／平板未驗證；S3–S5 與路線圖 Phase 0–10 未開始。
本次只做社交情境內容與證據整理，產出 03-research.md 並更新 STATE.md，不安裝、不實作、不部署、不 commit/push。
聚焦公園打招呼、兩種平等回應、幫助、不參與、重試／修復與退出；不強迫眼神接觸，不宣稱療效。
保留 Q1 年齡／陪同、Q2 導覽方式、Q3 語音必要性為待確認。優先官方無障礙依據與原始研究，區分證據、設計建議與未驗證假設。
定義專業審查項目、角色、所需版本證據與兒童評估前門檻，不能宣稱已完成專業審查。呼吸訓練與完整控制台維持後續範圍。
後續 S4 首里程碑僅 Phase 0 + Phase 1 骨架；安裝需另行授權與 exact 版核對。完成 S3 文件後停止，等待下一個 session。
```

