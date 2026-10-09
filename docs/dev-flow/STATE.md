# Social-interactive-game — Dev-Flow State

最後更新：2026-10-09（S5 Pages 原始 HTML 問題已修正，線上 22＋15 項檢查通過；執行期例外與授權通知已修正，資源持有鏈已定位，F8 共用 DFG_LUT 監聽尚待正式修正，實機待辦未完成）

## 一句話目標

規劃一個可自主參與、低刺激、可退出及重試的繁體中文公園打招呼社交練習工具；不宣稱診斷或治療效果。

## 專案實況與規範

- 2026-10-08：使用者要求改成雲端執行。已 `git init`（main），加入 .gitignore，首次 commit 並推送到 https://github.com/freshrogerchang-dev/3D-Social-interactive-game 。下文「非 Git 倉庫」是 S1–S3 當時的狀態。

- 初始化前僅有 `Claude 實作路線圖.md`、`Three.js ASD 社交小遊戲完整架構藍圖.md`，無程式碼、package.json、測試、CI 或既有階段文件。
- S1–S3 時專案沒有 `AGENTS.md`，採用使用者訊息提供的全域規範。2026-10-08 交接 Codex 時新增根目錄 `AGENTS.md`，整理本專案規則。
- `git status` 與 `git log` 回報非 Git 倉庫；無法提供 Git 未提交差異或歷史。本次不初始化 Git，保留兩份原始文件。
- 指定 `C:/Users/fresh/.Codex/skills/dev-flow/CONVENTIONS.md` 不存在。已找到並讀取 `C:/Users/fresh/.agents/skills/dev-flow/SKILL.md`、`C:/Users/fresh/.agents/skills/s1-arch/SKILL.md` 與 `C:/Users/fresh/.agents/skills/dev-flow/CONVENTIONS.md`。
- 本次明確指示優先於通用 skill：精簡比較，不展開大量競品調查；不套用 React／Supabase 預設，不安裝或實作。

## 開發流程狀態（Dev-Flow S1–S5）

| Session | 狀態 | 實際證據與後續工作 |
|---|---|---|
| S1 架構 | 完成（文件整理） | `01-landscape-architecture.md`：盤點、衝突、精簡比較、MVP 與骨架契約；產品方向問題仍待確認 |
| S2 相容性 | 完成（文件與唯讀盤點；整合未驗證） | `02-compatibility-toolchain.md`：本機版本、官方限制、候選組合與 API 核對；未安裝、未編譯、未實機驗收，不能標 PASS |
| S3 考察 | 文件與研究整理完成；專業審查及使用者評估未完成 | `03-research.md`：公園打招呼情境 v0.1-draft（待專業審查草案）、狀態圖檢查（scratchpad，非專案測試）、官方指引與 10 篇文獻摘要級整理、審查計畫、兒童評估前門檻與停止準則。審查者尚未參與 |
| S4 建置 | 第一里程碑完成（Phase 0 + Phase 1 骨架）；實機與跨瀏覽器未驗證 | `04-build-log.md`：exact 版本安裝；typecheck、lint、format:check、test（26 項）、build 皆 exit 0；headless Chromium（SwiftShader）檢查 22/22。不是可玩 MVP |
| S5 驗證 | 進行中：四項修正與正式工程驗證完成，完整驗收未完成 | 05-fix-log.md §5 的既有五項／38＋22＋15 工程證據有效；05-extended-review.md 新增 F5–F7、10/10 本地補充檢查與 detached canvas 觀察；Pages 線上 22＋15 項已通過；F6／F7 本地修正，五項與 44＋22＋15＋4 回歸通過；資源持有鏈、實機與專業審查仍待完成 |

## 功能實作狀態（路線圖 Phase 0–10）

Phase 0（設定）與 Phase 1（引擎骨架）已建立並通過自動化檢查（04）；Phase 2–10 未開始：2 操作、3 NPC、4 對話、5 情緒調節、6 無障礙、7 資源效能、8 進度資料、9 內容、10 測試打磨。

S1 完成不代表 Phase 0 或 Phase 1 完成；S4 不等於路線圖 Phase 4。安全控制與基本無障礙須從 Phase 0–1 建立，不等到 Phase 6 或 Phase 10。

## 關鍵決策（ADR 精簡版）

| 日期 | Session | 決策／來源狀態 | 理由 | 替代方案 |
|---|---|---|---|---|
| 2026-10-07 | S1 | 使用者已確認：本次文件限定；不安裝、不寫遊戲、不部署、不 commit/push，完成停止 | 本次工作邊界 | 無 |
| 2026-10-07 | S1 | 使用者已確認：以 Vite + TypeScript + Three.js 為評估起點，第一工程里程碑為 Phase 0 + Phase 1 骨架 | 明確任務要求 | Babylon.js 已精簡比較 |
| 2026-10-07 | S1 | 建議：vanilla TypeScript + Three.js + DOM/CSS overlay，無後端／登入／雲端／AI／追蹤 | 單情境、單 NPC 不需額外框架或服務 | React；完整遊戲引擎 |
| 2026-10-07 | S1 | 建議：公園、安全區、靜止 NPC、打招呼、兩個回應加幫助／退出；不儲存兒童練習歷史 | 最小垂直切片與資料最小化 | 完整街坊與資料控制台 |
| 2026-10-07 | S1 | 建議預設：HSL S ≤0.6；禁 blur/shake；不限時；深色 UI 文字；安全控制先做 | 調和規則與範例衝突 | 詳見 S1 衝突表 |
| 2026-10-07 | S2 | 使用者已確認：本 session 只唯讀盤點、查證、寫 S2 與更新狀態，完成停止 | 保留文件限定範圍 | 無 |
| 2026-10-08 | S3 | 使用者已確認：本 session 只做研究、內容草案與交接；不安裝、不實作、不部署、不 commit/push，不進 S4/S5 | 工作邊界 | 無 |
| 2026-10-08 | S3 | 使用者已確認 Q1：目標為幼稚園大班到國小低年級（約 5–8 歲），文字附注音，以語音為主 | 使用者回答 | — |
| 2026-10-08 | S3 | 使用者已確認 Q2：自由第一人稱移動，可自己探索，也可給任務（例：媽媽請我去隔壁買菜） | 使用者回答 | 固定站點導覽 |
| 2026-10-08 | S3 | 使用者已確認 Q3：首版要有文字＋圖示＋注音＋語音；語音參考 KnowMood，以 Gemini TTS 每日免費額度預先生成 | 使用者回答 | 只用文字＋圖示 |
| 2026-10-08 | S3 | 使用者已決定 Q4：買菜任務延後；第一個 MVP 維持公園打招呼 | 控制第一版範圍 | 買菜進 MVP |
| 2026-10-08 | S3 | 使用者已決定 Q5：採用 Gemini TTS，前提是僅自己使用 | KnowMood 已採同樣方式；非公開發布 | Cloud TTS、Azure、真人錄音、裝置語音 |
| 2026-10-08 | S3 | 使用者已決定 Q6：公園場景高度寫實 | 使用者回答；期望更容易類化到現實（未驗證假設） | 寫實比例＋簡化質感（原建議）、卡通風格 |
| 2026-10-08 | S3 | 建議：高度寫實不取代低刺激規則——不用 bloom／模糊等後製、保守飽和度、NPC 臉部不追求照片級、提供細節程度設定、素材限 CC0 或明確授權（03 §9.5） | R3、R4 個別差異；恐怖谷；平板效能 | 照片級人物＋完整後製 |
| 2026-10-08 | S3 | 建議：語音採離線預先生成靜態音檔、前端無金鑰；注音人工標註；觸控以點地面前往為主 | 沿用 KnowMood 已驗證流程；5–8 歲操作負荷；XAG 117 | 瀏覽器即時呼叫 TTS；自動注音轉換；雙搖桿 |
| 2026-10-08 | S3 | 建議：點頭與口語回應完全對等；幫助保留原節點；結果分 finished／skipped／exited，退出與先不參與不算完成；無計時、評分、眼神接觸要求 | R1、R2、COGA、WCAG 2.2.1；修正藍圖 §8.4 範例問題 | 沿用藍圖範例（含 eye_contact、不可達修復節點） |
| 2026-10-08 | S3 | 建議：低飽和／平滑相機只當保守預設，不寫成 ASD 共同偏好；不作療效宣稱 | R3、R4 顯示個別差異與單篇小樣本；R5–R7 證據不一致或不足 | 固定「ASD 友善」風格規則 |
| 2026-10-08 | S3 | 建議：工程驗收、專業內容審查、兒童使用評估三者分開；兒童評估需滿足 G1–G9 | 避免以文件或測試代替審查 | 直接做兒童試玩 |
| 2026-10-08 | S4 | 使用者已授權：建立專案檔、以 exact 版本安裝、容器內 preview 與 headless 瀏覽器檢查、檢查通過後 commit 並推到 main-uv12jr | 雲端容器是暫時的，成果需推上 GitHub | 不 commit（原交接條件） |
| 2026-10-08 | S4 | 實際版本：three 0.186.1；vite 8.3.3、vitest 5.0.3、typescript 5.9.3、@types/three 0.186.0、@types/node 22.20.5、eslint／@eslint/js 9.39.5、typescript-eslint 8.71.1、prettier 3.9.9；Node 22.22.0（雲端） | S2 候選＋registry metadata 核對，peer 無衝突 | 全部 latest（TS 7 超出 typescript-eslint 範圍） |
| 2026-10-07 | S2 | 建議候選：現有 Node 22.21.0／npm 10.9.4；Vite 8.x、Vitest 5.x、TS 5.9.3、Three 0.186.x + 同 minor 型別、ESLint 9.x；exact patch 與鎖檔仍待核對 | 官方 TS latest 7.0.2 超出 typescript-eslint 文件支援範圍，不全裝 latest | 待核對正式發布 metadata 與 peer 解算 |

上表「建議」均未獲使用者確認，不能在後續文件改寫成已批准產品決策。來源文件要求亦不等於使用者已確認所有細節。

## 未決問題／風險

1. Q1–Q3 已於 2026-10-08 確認（見關鍵決策）。
2. Q4 已決定：買菜任務延後，不進第一個可玩 MVP。
3. Q5 已決定：採用 Gemini TTS 預先生成音檔。前提是只有使用者自己使用；條款（不得用於可能被未滿 18 歲者使用的服務）的解讀由使用者負責。若日後分享或發布，須重新檢查或改用其他語音來源。
3a. Q6 已決定：高度寫實。效能預算（平板 60 FPS 目標、素材首載 50 MB 上限）只是起點，未經實機量測；寫實素材授權、KTX2／Draco loader 版本待 Phase 7 核對；寫實程度對刺激負荷的影響待專業審查（03 §9.5）。
4. 原始範例未經編譯或 runtime 驗證；存在型別、套件名稱、計時器與生命週期問題，不能直接複製即宣稱可用。
5. 專業內容審查未開始、未完成（03 §5 審查紀錄為「未完成」）；兒童使用評估未開始，前置門檻 G1–G9 全未滿足（03 §6）。
6. 工具鏈整合已在 S4 驗證（Linux 雲端、Node 22.22.0）；Windows 本機（Node 22.21.0）沒有跑過 S4 的檢查。桌面與平板實機、FPS 仍未驗證。
7. 頂層套件的 exact 版本、engines、peer 依賴與授權已在 S4 核對，鎖檔已產生；傳遞依賴的完整授權清單尚未盤點。
8. 文獻只讀 PubMed 摘要、未讀全文；點頭在台灣兒童情境的文化適切性、字數上限、圖示可理解度與桌面／平板第一人稱動暈率均無直接證據，屬待審查假設。
9. NICE CG170 頁面日期本次未能擷取；以頁面為準。

### S4 骨架已知問題（04 §4–§5）

10. `npm run build` 有「chunk 大於 500 kB」警告（JS 538.97 kB，gzip 134.83 kB），主要是 three.js 本身大小；build 仍 exit 0。是否拆分留到 Phase 7。
11. 瀏覽器檢查只在 headless Chromium＋SwiftShader（軟體 WebGL2）跑過。真實 GPU、Firefox、Safari、iPadOS、Android 平板、FPS、p95 frame time、載入時間、記憶體（heap 快照、`renderer.info`）、瀏覽器 200% 文字縮放、色彩對比、螢幕報讀器都未驗證。
12. 分頁隱藏仍以覆寫 `visibilityState` 模擬。S4 的 WebGL context lost 只在單元測試派送事件；S5 已在 headless Chromium／SwiftShader 透過 WEBGL_lose_context 真實觸發，並通過錯誤後安全控制；真實 GPU 與系統切頁仍未驗證。
13. 介面文案（「休息一下」「已返回安全區」「目前無法顯示場景」等）是工程暫定版，未經專業審查。`zhuyin-slot` 與 `voice-slot` 只預留位置，沒有注音或語音內容。
14. `docs/dev-flow/s4-screenshots/browser-check.mjs` 使用專案外 Playwright 或 playwright-core 與 Chromium，不在 `package.json` 中；S4 是 Playwright 1.56.1，S5 是預裝 playwright-core 1.57.0／系統 Chromium 151.0.7922.173，可用環境變數指定模組與執行檔。
15. GitHub 預設分支 `main` 仍停在 `0171bd0`（只有 S1–S3 文件）；S4 程式碼只在 `main-uv12jr`。是否合併由使用者決定。

## 決策變更

無既有已確認產品決策遭推翻。S2 更正 S1 把 idb 授權誤列為 MIT：官方為 ISC；詳細查證寫入 S2 文件，S1 原檔保留。兩份原始文件與 S1 文件於 S2 前後 SHA256 相同。S3 沒有推翻任何已確認決策；S3 前後兩份原始文件、01、02 的 SHA256 不變，只新增 03 並更新本檔。

## 交接：OpenAI Codex 雲端（2026-10-08）

- Repo：https://github.com/freshrogerchang-dev/3D-Social-interactive-game ，分支 `main-uv12jr`（不是 `main`）。
- 交接範圍：**只有現有 S4 骨架**。接手後先在乾淨環境重跑驗證，不開發 Phase 2，也不新增功能。
- 必讀順序：`AGENTS.md` → 本檔 → `04-build-log.md` → `01-landscape-architecture.md` §5、§7、§8 → `02-compatibility-toolchain.md` §3、§4 → `03-research.md` §3.1、§4、§7、§9。兩份原始設計文件（根目錄的路線圖與藍圖）只作背景參考，範例程式碼不能直接移植（02 §5、03 §3.5）。

乾淨環境驗證步驟（需要 Node 22.12 以上的 22.x，`.nvmrc` 為 22）：

```bash
git clone https://github.com/freshrogerchang-dev/3D-Social-interactive-game.git
cd 3D-Social-interactive-game
git checkout main-uv12jr
node -v                      # 應為 v22.x（>=22.12）
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test                 # 預期 3 檔 26 項通過
npm run build                # 預期 exit 0，會有 chunk >500 kB 警告
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

瀏覽器檢查（選用，另開終端機，preview 執行中）：

```bash
npm install -g playwright@1.56.1
npx -y playwright@1.56.1 install --with-deps chromium
mkdir -p /tmp/s4-shots
node docs/dev-flow/s4-screenshots/browser-check.mjs http://127.0.0.1:4173/ /tmp/s4-shots   # 預期 22/22 passed
```

若全域模組不在 `npm root -g`，設定 `PLAYWRIGHT_MODULE_DIR` 指向含 `playwright` 的 node_modules 目錄。

GitHub Pages（2026-10-08 使用者同意新增與公開發布）：`.github/workflows/pages.yml` 在 push 到 `main-uv12jr` 時自動執行。原本只設手動觸發，但 GitHub 只認預設分支上的手動流程（回 404、流程數 0），使用者同意改成 push 觸發。流程是 Node 22 → `npm ci` → typecheck、lint、test → `vite build --base=/3D-Social-interactive-game/` → 發布。網址：https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ 。需要使用者在 repo 設定：Pages Source 選 GitHub Actions；`github-pages` environment 允許 `main-uv12jr`。網址公開，頁面是未經專業審查的工程原型。子路徑 build 在容器內用 headless Chromium 檢查 22/22 通過；已透過 GitHub API 確認 run 37843973381 第 2 次執行（commit 085804f071addc3d6464b19af161d0a1bad2ee7e）的 build 與 deploy 均為 success：https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/runs/37843973381 。線上頁面內容仍待使用者在真實裝置確認；發布成功不等於實機驗收通過。

## 下一步

1. F1–F4 修正已提交 `ab28b9a`；Actions run 37952794274 build／deploy success。但本輪實讀 Pages 仍為 `/src/main.ts` 原始 HTML，另有 Jekyll run 37952793354，不能算線上可用。使用者已改為 GitHub Actions，重新發布後線上 22＋15 項通過，詳見下方「Pages 修正驗證」。
2. F6／F7 修正及回歸已完成，詳見 05-extended-review.md §7；持有鏈已定位為 three 共用 DFG_LUT 的 dispose listener；下一步處理 F8 的正式生命週期修正，不能宣稱沒有洩漏。
3. 依 05-device-review-checklist.md 補實機、原生文字縮放、報讀器、效能與專業審查。完整 S5 尚未通過，不自動進入 Phase 2。

Q1–Q6 已確認或決定；專業審查與兒童使用評估未完成。S4 只完成骨架，不是可玩 MVP；不宣稱療效或已核准兒童使用。

## Codex 接手驗證紀錄（2026-10-08）

- 目標 commit：`085804f071addc3d6464b19af161d0a1bad2ee7e`（`main-uv12jr`）。透過 GitHub 工具讀取 AGENTS.md、STATE、04、01／02／03 指定章節、核心程式碼與 Pages workflow；未完成本地 clone。
- `node --version`：exit 0，v24.19.0，不符合專案要求 `>=22.12.0 <23`；先前 `npm --version`：exit 0，11.9.0。
- `curl --max-time 10 -I https://registry.npmjs.org`：exit 7，無法連接 proxy:8080。這是代理連線失敗，沒有證據顯示 npm 網域被政策封鎖。
- `npm ci`、typecheck、lint、format:check、test、build、preview、瀏覽器檢查：Codex 環境未驗證，均未執行；不能沿用其他環境的成功結果標成 Codex 通過。
- 外部建置證據：GitHub Actions run 37843973381，第 2 次執行的 build、deploy 及 npm ci／typecheck／lint／test／Pages 子路徑 build 步驟均 success；workflow 以 .nvmrc 選 Node 22。Actions 流程沒有 format:check 或瀏覽器檢查，不構成這兩項的證據。
- 靜態閱讀：HTML 有常駐安全按鈕；RenderLoop 停止後清時間基準；ParkScene 釋放自有 geometry／material。此為程式碼閱讀，不能取代執行驗證或 S5。
- 待核對：01 §7 要求斷開 ResizeObserver／全域監聽；main.ts 的 observer 與全域監聽常駐頁面、每次場景 teardown 不移除。它們未在每次重建新增，但頁面完整清理契約與記憶體仍需後續驗證；本次不改程式。
- 使用者已於本工作階段逐項同意本次文件 commit 與推送到 main-uv12jr，並知悉會觸發 Pages 重新發布。因終端代理不可用，改用 GitHub Contents API 提交文件；本次沒有在 Codex 重跑五項檢查，以上未驗證狀態仍有效。


## S5 審查更新（2026-10-08）

- 使用者已指定 S5 審查，基準 de286057b5f0e113023f7b898c67ede9c76b1e93；未修改產品程式、不進 Phase 2。
- 05-review.md 記錄四項 P2：F1 文字放大後工具列遮住面板；F2 起始 hidden／初始化中 hidden 後仍 start；F3 error 時 pause 無作用；F4 renderer 尺寸設定拋錯導致 init 拒絕但狀態仍 ready。
- 專案外替身重現腳本及系統 Chromium 的局部 HTML/CSS 檢查已執行，詳見報告的命令／exit code。不能當作 Node 22、完整 WebGL 或實機通過。
- CSS 指定色對對比為 13.78:1（文字／底）、3.71:1（邊框／底）、7.82:1（焦點／底）；完整對比與報讀器仍未驗證。
- npm ci 與五項專案檢查受 proxy:8080 阻塞，本次未執行；最新外部證據為 Actions run 37845590764 build／deploy success。
- S5 報告、證據與本次 STATE 更新僅本地，未 commit／push；完整 S5 為進行中。


## S5 正式工程驗證更新（2026-10-09）

- 使用者已逐項同意 Node 22、npm ci、production preview，並於驗證完成後同意本次程式修正 commit／push 到 main-uv12jr。
- 在 /tmp 安裝 Node v22.22.0（官方 SHA256 核對）、npm 10.9.4；npm ci exit 0，152 packages。package.json、package-lock.json、.nvmrc 及工具設定不變。
- 本地 F1–F4 已修正；typecheck、lint、format:check、test、build 均 exit 0，4 檔 38 項測試通過。
- 系統 Chromium 151.0.7922.173／playwright-core 1.57.0：production preview 22/22 既有檢查與 15/15 補充檢查通過；含真實軟體 WebGL context loss 的錯誤與安全路徑。
- Chrome 自動 favicon 404 已以空 data favicon 消除；正常路徑 console 無錯誤。build JS 539.37 kB（gzip 134.90 kB）的 >500 kB 警告保留；ESLint 停止支援提示只記錄，未升級。
- Preview 已停止（SIGTERM，exit 143）；停止後 curl 連線失敗 exit 7 為預期證據。
- 實機、跨瀏覽器、原生文字 200%、報讀器、效能與 heap／GPU 累積、專業內容審查仍未完成。完整 S5 未通過，不進 Phase 2。
- 本次程式、審查與修正文件一併提交；push 會觸發 Pages，發布結果以該提交的 GitHub Actions 紀錄為準。詳細命令與證據見 05-fix-log.md §5。


## S5 補充審查更新（2026-10-09）

- 基準 ab28b9a；本輪未改產品程式、未安裝、未啟動伺服器、未 commit／push。
- 正式網址讀到原始 HTML／`/src/main.ts`，Chromium 場景等待逾時 exit 1；F5 為公開發布阻擋。Vite 與 Jekyll 兩套流程 success，不等於線上程式可用。
- 本地 dist 使用 Playwright route（無 preview）10/10 補充檢查 exit 0：DPR=3 時 ratio=2、AX 名稱／休息動作、RAF 暫停、20 次重建、320px 文字間距與焦點命中。不能代替正式網站或螢幕報讀器驗收。
- 強制 GC 後監聽數固定 30、最大 RAF=1，但 JS heap 增長並有 21 個 detached CANVAS；尚未排除工具持有／context 延遲，資源無洩漏未通過。
- F6 的 frame／resize／safety renderer 例外三條路徑已重現：仍 running、onError 未呼叫。F7 的 dist 缺 three MIT 許可通知尚未修正。
- 傳遞授權盤點：175 lock entries／152 installed；145 根目錄有授權類檔案，另外兩項完整文字藏在 README；其他缺口與未安裝平台項目仍待補。
- 已新增 05-extended-review.md、05-device-review-checklist.md 與重現／量測證據。實機、專業審查與兒童使用前門檻仍未完成。


## Pages 修正驗證（2026-10-09）

- 使用者回覆「已改好了」，表示已將 Settings → Pages → Source 改為 GitHub Actions；工具沒有另讀管理設定值，實際結果以下述部署與線上檢查確認。
- 重跑既有 Vite workflow 的 deploy job 113895799734，API success；run 37952794274 第 2 次 build／deploy 均 success，仍為 commit ab28b9a，沒有建立新 commit 或 push。
- 正式 HTML 現在載入 /3D-Social-interactive-game/assets/index-C1phOaOP.js 與 index-qvAmfl4J.css；已不引用 /src/main.ts。curl exit 0；線上 JS 與本地 dist SHA256 完全相同。
- 公開網址 headless Chromium／SwiftShader：既有 browser-check 22/22、runtime 補充 15/15 均 exit 0，正常路徑 console 無錯誤，context loss／WebGL 不可用後的 DOM 安全控制通過。F5 發布阻擋已排除。
- 兩支 docs 瀏覽器腳本僅增加可選 PLAYWRIGHT_PROXY_SERVER，供遠端網址使用既有代理；未更動斷言、產品程式、套件或設定檔。
- F6 執行期 renderer 例外、F7 發布 MIT 通知、detached canvas 原因定位仍待處理；實機、原生文字縮放、報讀器、效能與專業審查仍未完成。完整 S5 尚未通過。


## S5 F6／F7 修正更新（2026-10-09）

- 執行期 renderer 例外現在停止 loop、釋放資源並轉入可讀 error；返回安全區繪製失敗由 DOM safety-rest 立即接管。
- public/THIRD_PARTY_NOTICES.txt 保留 three／Vite runtime helper 的完整核心 MIT 通知，已確認 build 複製到 dist。
- Node 22 五項最終 exit 0；4 檔 44 項單元測試通過。本地 dist 瀏覽器 22/22＋15/15 與 4/4 renderer 例外回歸 exit 0。無安裝、新設定或伺服器啟動。
- 修正與審查證據沿用先前 S5 commit／push 授權，一併同步到 main-uv12jr；發布狀態以該提交的 Actions 與公開網址實際檢查為準。
- 公開 ab28b9a 的額外 10/10 可及樹／DPR／文字間距／RAF 檢查 exit 0；仍觀察 21 個 detached CANVAS，原因未定位。這項不能當作資源驗收通過。
- 完整 S5 仍需資源持有鏈、實機／跨瀏覽器、原生 200% 文字、NVDA／VoiceOver、效能與專業審查；不進 Phase 2。


## S5 發布驗證與 F8 資源定位（2026-10-09）

- F6／F7 修正 commit d2b7c50 已推 main-uv12jr；Actions run 37956567817 build／deploy success。本次只觸發 Vite 流程，沒有新的 Jekyll 流程。
- 新公開版本的 22/22＋15/15 瀏覽器檢查 exit 0；JS SHA256 與本地 dist 相同，線上 THIRD_PARTY_NOTICES.txt 與 public 原檔 cmp exit 0。F5–F7 已完成修正與發布驗證。
- 另在公開版做 heap snapshot／A/B：DFG_LUT 模組共用貼圖的 21 個 dispose listener 持有 WebGL context／舊 canvas；僅在臨時診斷工作階段釋放該貼圖後，listeners 21→0、detached canvas 21→0、DOM nodes 147→126。
- F8 原因已定位，尚未正式修正；不得把 DevTools heap ID／_listeners 操作當產品修法，或未經逐項授權升級 three。完整 S5 仍受 F8 與外部驗收項目阻擋。
- 詳細重現、持有鏈與外部驗收表見 05-extended-review.md §8、05-device-review-checklist.md；本次沒有安排或聯絡實機／專業審查者。
