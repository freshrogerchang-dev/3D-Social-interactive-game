# Social-interactive-game — Dev-Flow State

最後更新：2026-10-18（原公園連續延伸街區與六個生活地點）

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
| S5 驗證 | 進行中：F1–F8 修正及工程回歸完成，完整驗收未完成 | 最新工程證據見 05-lut-fix-log.md：五項檢查、45 項單元、本地 22＋15＋11＋4／雙 context 3 項與公開 11＋15 項；手機暫停／返回正常為使用者部分實測回報，已確認 iPhone 12／Chrome，版本待補；完整實機及專業審查仍待完成 |

## 功能實作狀態（路線圖 Phase 0–10）

Phase 0（設定）與 Phase 1（引擎骨架）已建立並通過自動化檢查（04）；Phase 2 第一人稱移動已實作並通過工程驗證（phase2-build-log.md），收到新版手機部分正常回報；Phase 3 已擴充為七位可對話卡通人物與背景小朋友，保留個人空間阻擋（最新情境見 park-more-scenarios-build-log.md），新版實機待驗證；Phase 4 已擴充為公園七位人物情境、注音、卡通表情及裝置內建語音；生活練習已接入原公園東側的連續 3D 街區，六個地點需步行靠近再開始；地圖只指引，不傳送。新版實機與專業審查待完成。Phase 5–10 未開始：5 情緒調節、6 無障礙、7 資源效能、8 進度資料、9 內容、10 測試打磨。

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
| 2026-10-15 | 對話擴充 | 使用者已決定：先在公園內加三個練習（請問可不可以一起玩、輪流排隊、放學不想去游泳課），不做場景切換；檢查通過後同意 commit／push | 使用者回答 | 對話＋新 3D 場景；全部一次做 |
| 2026-10-15 | 人物 | 使用者要求人物「像模擬市民一樣」；改用 MakeHuman CC0 資料產生原創寫實人物（不使用 EA 素材），保留自製人形作為載入前與失敗時的備援 | 使用者要求；雲端只能連 GitHub／npm，MakeHuman 資產為 CC0 | 繼續手工幾何；其他模型網站（連不到） |
| 2026-10-16 | 人物 | 使用者決定：人物不用擬真，改成臉部表情豐富的卡通人物。人物改為程式產生的卡通造型，表情依對話節點切換；移除 MakeHuman 模型與產生工具。**變更 Q6**：人物不再走寫實路線（公園環境維持原本的貼圖與細節） | 使用者回答 | 繼續寫實／模擬市民風格（未發布） |
| 2026-10-16 | 語音 | 使用者選擇改用裝置內建語音（Web Speech API，zh-TW，以音高區分說話者）。**變更 Q5**：Gemini 預先生成音檔改為可選，有音檔時優先播放 | 使用者回答；雲端沒有金鑰，開源 TTS 模型下載點被擋 | 等金鑰產生 Gemini 音檔；開源離線 TTS 模型 |
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
3. Q5 已決定：採用 Gemini TTS 預先生成音檔。前提是只有使用者自己使用；條款（不得用於可能被未滿 18 歲者使用的服務）的解讀由使用者負責。若日後分享或發布，須重新檢查或改用其他語音來源。2026-10-16 起預設改用裝置內建語音（見決策表），Gemini 音檔為可選。
3a. Q6 已決定：高度寫實（2026-10-16 起人物改為卡通，見決策表；環境仍是寫實貼圖）。效能預算（平板 60 FPS 目標、素材首載 50 MB 上限）只是起點，未經實機量測；寫實素材授權、KTX2／Draco loader 版本待 Phase 7 核對；寫實程度對刺激負荷的影響待專業審查（03 §9.5）。
4. 原始範例未經編譯或 runtime 驗證；存在型別、套件名稱、計時器與生命週期問題，不能直接複製即宣稱可用。
5. 專業內容審查未開始、未完成（03 §5 審查紀錄為「未完成」）；兒童使用評估未開始，前置門檻 G1–G9 全未滿足（03 §6）。
6. 工具鏈整合已在 S4 驗證（Linux 雲端、Node 22.22.0）；Windows 本機（Node 22.21.0）沒有跑過 S4 的檢查。桌面與平板實機、FPS 仍未驗證。
7. 頂層套件的 exact 版本、engines、peer 依賴與授權已在 S4 核對，鎖檔已產生；傳遞依賴已完成 175 個鎖檔條目之授權 metadata 盤點（05-cloud-audit.md）；23 個未安裝條目授權全文與 5 個本機尚未找到完整授權文字的條目仍待查核，不能稱完整授權審查通過。
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

2026-10-16：使用者把人物從 Q6「高度寫實」改為「臉部表情豐富的卡通人物」（見上表）；公園環境不受影響。此前：無既有已確認產品決策遭推翻。S2 更正 S1 把 idb 授權誤列為 MIT：官方為 ISC；詳細查證寫入 S2 文件，S1 原檔保留。兩份原始文件與 S1 文件於 S2 前後 SHA256 相同。S3 沒有推翻任何已確認決策；S3 前後兩份原始文件、01、02 的 SHA256 不變，只新增 03 並更新本檔。

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

1. 用 iPhone 從原公園往東走到街區，透過「街區地圖」找路口／餐館／廁所／休息角／親友見面處／公告牌，確認靠近啟動、實際步行過街、用餐接找廁所，以及求助／暫停恢復／安全區和橫向捲動。詳見 neighborhood-build-log.md。
2. 生活情境、人工注音、插圖及語音仍待專業審查／實際試聽；先收集新增街區的操作與效能回報，再決定是否細化外觀或其他指定內容。不自動進 Phase 5。
3. 完整 S5 的 VoiceOver、跨瀏覽器、原生文字縮放與量化實機效能仍待完成，不能沿用雲端瀏覽器結果當作實機通過。

Q1–Q6 已確認或決定；專業審查與兒童使用評估未完成。不宣稱療效或已核准兒童使用。

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


## S5 F8 正式修正（2026-10-09）

- 以公開 onBeforeCompile／Texture.clone 讓 ParkScene 上傳自有 PBR LUT；場景三個材質共用一份副本，dispose 只釋放自己的副本，不改共用原貼圖或 three 私有 listener。
- Node 22 五項 exit 0，4 檔 45 項單元測試通過；最終 dist 瀏覽器 22＋15＋11＋4 與雙 context／像素 3 項全部 exit 0。
- 20 次重建強制 GC 後 detached canvas=0；第 5–20 次 DOM nodes 維持 126、listeners=30。另一 context 的 texture 與畫面不受釋放影響，原版／修正版 PBR PNG 相同。
- 依賴／lockfile／設定不變，無安裝或伺服器啟動；沿用 S5 commit／push 授權保存修正與證據。公開版結果以後續線上 --expect-released 驗證為準。
- F8 本地已排除，不能宣稱跨裝置或長時間 GPU 完全無洩漏。完整 S5 外部驗收仍未完成；已詢問可用實機，尚未取得實際測試結果。
- 完整修正、命令／exit code、失敗更正與證據見 05-lut-fix-log.md。不進 Phase 2。


## S5 F8 公開驗證（2026-10-09）

- 修正 34a9205 已發布，Actions run 37998969689 build／deploy success；公開 JS 與本地五項通過版 SHA256 相同。
- 對正式網址實跑資源／可及性 11/11 與 WebGL 安全 15/15，均 exit 0；20 次重建後 GC 的 detached canvas=0、DOM nodes 5–20 次維持 126、listeners=30，沒有追加 DevTools.dispose。
- F8 在現有骨架與 headless Chromium／SwiftShader 條件下排除；45 項單元與本地 22＋15＋11＋4／雙 context 3 項證據仍有效，詳見 05-lut-fix-log.md §2–5。
- 最新實機操作表以程式基準 34a9205 為準，後續此筆只更新文件與保存線上證據。工作階段已詢問可用實機，尚未取得裝置與測試結果。
- 真實 GPU、跨瀏覽器、真實系統切頁、原生文字 200%、報讀器、實機效能、專業審查仍未完成；完整 S5 未通過，不進 Phase 2。


## S5 手機使用者回報（2026-10-09）

- 使用者原文：「我用手機測試過，暫停返回都正常」。記為部分實機操作回報，非 Codex 執行結果；沒有命令或 exit code。
- 使用者補充「iPhone 12 chrome 可正常跑」：裝置為 iPhone 12、瀏覽器為 Chrome，正常執行為使用者回報。iOS／Chrome 版本、測試日期、網址與載入 commit 尚未取得；「返回」是否為「返回安全區」按鈕待確認，不能推定為瀏覽器返回鍵或已完成全部安全路徑。
- 使用者針對後續三項操作回覆「都正常」：暫停後按繼續、結束本次後重新開始、切換 App 再回來保持暫停，均記為 iPhone 12／Chrome 的使用者實測正常。未確認重建 20 次、背景載入、橫直向、文字縮放、報讀器或效能；不擴大判定範圍。詳細欄位見 05-device-review-checklist.md。
- 此筆只更新文件；完整 S5 仍未通過，不自動進 Phase 2。


## S5 雲端授權與 DOM 對比補查（2026-10-09）

- 05-cloud-audit.md：175 個鎖檔條目皆有授權 metadata，已安裝 152 個，沒有發現本機 package.json 授權差異；23 個未安裝與 5 個尚未找到完整授權文字的條目保留全文查核限制。建置依賴包含 MPL-2.0／BlueOak／Python 等，不能稱所有依賴皆 MIT。
- 本地 production Chromium／SwiftShader 的 7 個畫面 computed styles、按鈕尺寸與每個畫面一個鍵盤焦點檢查 42/42、exit 0。文字對比最低 13.78:1；焦點框外合成背景、hover／全按鈕、原生 200% 與報讀器仍未驗證。
- 本輪只增加文件與審查腳本，產品程式不變；完整 S5 外部驗收未完成，不進 Phase 2。


## Safari 使用者回報與手勢限制（2026-10-10）

- 使用者針對 Safari 的暫停／繼續、返回安全區／繼續、結束／重新開始、橫直向切換回覆「都正常」。沿用先前裝置 iPhone 12；iOS／Safari 版本及實際載入 commit 未取得，為使用者回報，非 Codex 實機驗證。
- 使用者要求固定畫面、禁止拉近拉遠。現有 3D 相機沒有縮放控制；在 .app 加 touch-action: pan-y、.stage 加 touch-action: none，限制遊戲雙指縮放並保留面板上下捲動。未設定 user-scalable=no，瀏覽器文字設定及桌面快捷鍵縮放可保留。
- 五項檢查 exit 0，45 項單元測試通過。Chromium 觸控繼續、短畫面 32px 文字的垂直捲動、結束／重新開始通過；雙指正向對照也無法放大，因此診斷腳本 exit 1，不宣稱防縮放已驗證。詳見 05-gesture-fix.md。
- 使用者在要求重新整理後以 Safari／Chrome 測雙指縮放的提示下回覆「都ok 下一步」；記為 iPhone 12 新版手勢正常的使用者回報，非 Codex 實機驗證。發布提交 19ad0d1 的 Actions run 38007594541 已 success；實際手機載入 SHA／瀏覽器版本未確認。完整 S5 未通過，不進 Phase 2。


## Phase 2 第一人稱移動（2026-10-10）

- 使用者明確回覆「Phase 2」。桌面 WASD／方向鍵、拖曳看向；觸控點地面前往；七個導覽按鈕及速度／靈敏度／視野設定已實作。±8m 邊界、固定視線高度、不自動轉向；暫停、失焦、多指與取消清輸入，返回安全區後保持暫停。
- 沿用唯一 RAF，控制器由引擎釋放。五項 exit 0、52 項單元、19 項 source 整合、7 項 production 操作、22＋15 項安全回歸、11 項資源檢查通過；20 次重建 detached canvas=0。
- stage 已從裝飾背景改為可聚焦操作區，舊可及性結論須重新確認。使用者舊版文字放大回報正常，但比例未取得；旁白測試因操作卡頓暫緩，不標通過。
- 實作、命令、版本、exit code 與過程失敗／修正見 phase2-build-log.md。新版移動／拖曳／手勢仍待 iPhone 12 Safari／Chrome 複測，軟體 WebGL 不代表效能或實機通過。
- 本階段沒有新增 NPC、對話、語音、儲存、套件或設定檔；完整 S5 外部驗收未完成，Phase 3 未開始。

- Phase 2 程式提交 cda68af62e3316e98b50144c3f9623eb95c0d534 已發布；Actions run 38014680940 success。公開網址 production 操作檢查 7/7、exit 0（Chromium／SwiftShader，無 route 或相機探針），結果見 phase2-evidence/published/result.json；iPhone 新版移動仍待使用者驗證。


## Phase 2 手機回報與 Phase 3 接續（2026-10-10）

- 使用者對新版點地面、拖曳看向、移動中暫停、返回安全區複測回覆「都正常 請繼續」。沿用先前 iPhone 12／Chrome 情境記為使用者部分回報；本次未重新指定瀏覽器、版本、載入 SHA，不推定 Safari 或完整設定／效能均通過。
- 接續 Phase 3：只有一位固定坐在長椅上的小安；不巡邏、不追逐、不看向玩家、不自動開口。靠近／離開僅更新 DOM 距離文字，沒有自動對話。長椅周圍 1.2m 個人空間阻擋；遇阻取消目標，可先側移再繞過。
- 角色是自有幾何的簡化工程人形，不是 Q6 最終寫實模型；素材選擇、授權與專業外觀審查待完成。無新增套件或設定檔，未進 Phase 4。
- 五項檢查各 exit 0，6 檔 57 項單元測試通過；NPC 原始碼整合 14/14、production 操作 7/7。詳見 phase3-build-log.md 與 phase3-evidence；軟體 WebGL 不代表實機效能。
- 下一步：新版 NPC 手機複測與寫實素材評估；對話需另行指定 Phase 4。S5 完整外部驗收仍未通過。

- Phase 3 產品提交 0feb8b2202e8bcca3759b21f34e1ad665bd6f1ea 已發布；Actions run 38066101193 的 build／deploy success。公開 production 7/7、exit 0，已確認新版 NPC 文字及 assets 檔名；結果見 phase3-evidence/published。這仍是雲端 Chromium／SwiftShader，不代表 NPC 手機實測。


## 左下半透明方向圓盤（2026-10-10）

- 使用者要求前進後退與左右轉向改為左下小圓盤、半透明。已加入 192px 圓盤：上／下點按走一步、左／右轉向 15°、中央停止，五個真實按鈕各至少 64px；左右平移與速度／靈敏度／FOV 留在設定。沒有長按、額外 RAF 或計時器。
- 半透明僅套底色，不降低圖示及焦點透明度。圓盤遵守安全區 inset，暫停／錯誤／結束時隱藏，展開設定時讓出面板；設定收合後恢復。安全按鈕保持最上層，手機禁止手勢縮放規則保留。
- 五項檢查各 exit 0、57 單元測試通過。圓盤 production 專項結果見 pad-evidence/browser/result.json；實機圓盤待使用者複測。詳細紀錄 pad-build-log.md。不進 Phase 4。

- 圓盤產品提交 30ed816 已發布；Actions run 38067215460 build／deploy success。公開圓盤 13/13、exit 0，已確認新版 assets；證據 pad-evidence/published。iPhone 圓盤實測尚未取得。


## 同心圓全方向搖桿（2026-10-11）

- 使用者澄清要同心圓，整圓面任意角度都能移動，而非五個方向按鈕。左下半透明外圈 192px、內圈 128px、旋鈕 64px；按住／拖曳即依鏡頭水平座標全方向移動，含左右平移及斜向，不自動轉鏡頭。拖曳場景或設定按鈕仍可轉向。
- 全方向固定設定速度，斜向正規化不加速；中心 12px 停止區。放開、取消、capture 遺失、失焦、多指及暫停立即清除方向／速度，旋鈕回中心；設定展開亦清輸入，沒有新的 RAF／計時器。
- 原七個至少 64px 的單次移動／轉向／停止按鈕全部放回設定，提供不用長按或精準拖曳的替代。安全控制保留。無新套件或設定檔，不進 Phase 4。
- Node 22.22.0 五項檢查各 exit 0、57 項單元通過；原始碼八方向整合 18/18、真正 production 觸控 10/10。證據 joystick-evidence；詳細紀錄 joystick-build-log.md。實機 iPhone 搖桿尚待回報。

- 同心圓搖桿提交 463ede0 已發布，Actions run 38103017974 success；公開觸控 10/10、exit 0，新版 JS／CSS 已確認。證據 joystick-evidence/published；手機同心圓新版實測待使用者回報。


## 公園環境擬真第一版（2026-10-11）

- 使用者同意先改善公園環境及手機效能檢查。新增實拍草地、步道、木紋長椅、12 株靜止樹木及靜態接觸陰影；小安維持工程人形，不進 Phase 4。
- 素材 10 張 1k JPG／8.36 MB，來源 Poly Haven CC0，作者、來源、雜湊與修改見 public/assets/park/manifest.json；完整授權隨網站提供。完整樹木候選模型 46–958 MB，沒有下載，改為共享幾何與 instance 葉片。
- 設定「較少葉片」降低 7800 至 3000；可選 FPS 本機顯示，收合設定仍能移動查看。不蒐集、不傳送、不儲存。素材非阻塞載入，缺檔保留底色，晚到不修改已結束場景；維持單一 RAF、安全控制與同心圓搖桿。
- 五項檢查各 exit 0、59 項單元通過；公園原始碼 9/9、production 觸控 10/10、缺檔／晚到 6/6、WebGL 安全 15/15。詳見 park-build-log.md 與 park-evidence。雲端 SwiftShader 不當作 iPhone 效能驗收。
- 下一步在 iPhone 12 比較標準／較少葉片的 FPS、卡頓與載入；完整 S5、報讀器、其他實機、專業審查仍未完成。

- 公園 20 次重建資源檢查 11/11、exit 0；結束 canvas／pending RAF=0、detached CANVAS=0、listener 第 5–20 次未持續增加。最後僅視覺與 FPS 顯示位置調整後另跑五項與整合／production；詳見 park-build-log.md。

- 公園產品提交 5b481e4 已發布；Actions run 38111095597 success。公開檢查 12/12、exit 0，十張素材 HTTP 200、觸控安全操作及 FPS 與搖桿共用可達。證據 park-evidence/published；iPhone 12 實際 FPS／載入／卡頓待使用者回報。


## 2026-10-11 Phase 4：打招呼文字工程版

- 使用者回報 iPhone 12 Chrome 公園擬真版「都很順暢」；記錄為主觀實機觀察，未取得 FPS 值，未完成全部 S5。
- 使用者明確指定 Phase 4。新增靠近後手動打招呼、「說你好／點頭／先不參與」、中性回饋、再練一次、換個方式、幫助／再看一次與回公園。
- 互動停住移動，暫停／恢復保留節點及幫助焦點；返回安全區退出、重新開始清除。只記憶體中的最近結果，沒有資料累計／儲存／傳送。
- Node 22.22.0、npm 10.9.4：五項檢查各 exit 0，7 檔 65 測試通過。build 581.59kB／gzip147.81kB，chunk 大小警告保留。
- 文字工程版，未製作語音、注音、選項圖示與角色揮手／點頭動畫；完整 Q3、實機、旁白及專業審查待驗證。不進 Phase 5。

- 正式 dist 對話檢查 18/18 exit 0；WebGL 不可用／context lost 安全回歸 15/15 exit 0。證據 phase4-evidence；完整紀錄 phase4-build-log.md。新版互動待 iPhone 實測。

- 產品提交 0047752ab819e7db63400cd32cb01e7d3766a230；Actions run 38125486147 build／deploy success。公開 Pages 對話檢查 18/18 exit 0，證據 phase4-evidence/published。網站 https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ 。使用者尚未實測新版對話。


## 2026-10-11 本機 Phase 4 補充

- 使用者選定注音、選項圖示、人物動作，語音另做。對話人工 ruby 注音、自製 SVG、單次抬手與兩種回應等同點頭已實作；底部可捲動卡保留人物視野。
- 動作使用單一 RAF，暫停凍結、恢復首幀零 delta；退出與安全區清除，設定開關與系統減少動態可停用。無新套件、設定檔、API、金鑰或儲存。
- Windows Node 22.21.0 五項檢查各 exit 0、70 項單元、Chrome／SwiftShader 正式 dist 23 項互動與 15 項安全回歸均通過。初次失敗與修正見 phase4-enhanced-build-log.md；證據 phase4-enhanced-evidence。
- 本機尚未 commit／push／發布，公開網站仍是先前 Phase 4 文字版。語音另做；新版 iPhone、VoiceOver、專業內容及注音審查未驗證，完整 S5 未通過。Phase 5 未開始。
- 下一步：本機新版實機複測；若要語音，另行指定 Phase 4 語音切片。


## 2026-10-11 小安人物精緻化

- 使用者要求和藹可愛人物。小安改為圓潤、自製 3D 造型，新增眼睛、小微笑、腮紅、短髮、耳朵與服裝／手鞋細節。人物的風格依本次指示調整，公園環境方向不變。
- 五官與頭髮隨原 head pivot 點頭；保留抬手、減少動態、暫停／安全區、1.2m 個人空間與唯一 RAF。無新增套件、設定檔、圖片或外部素材。
- 五項工程檢查各 exit 0，70 單元、23 正式 dist 互動、15 安全回歸通過；手機／桌面截圖已人工檢視。63 meshes／9632 triangles 含長椅，不代表整個公園效能。詳見 npc-friendly-build-log.md、npc-friendly-evidence。
- 尚未 commit／push／發布；新版 iPhone、Safari、VoiceOver、真實 GPU 效能與專業外觀審查未完成。語音另做、Phase 5 未開始、完整 S5 未通過。
- 下一步：本機人物外觀與 iPhone 複測，後續語音需另行指定。


## 2026-10-11 每字右側直排注音

- 依使用者指示，對話與打招呼按鈕的注音由上方改到每個漢字右側，符號直排、聲調在旁、輕聲置頂；一字一組不拆開，保留中文名稱與捲動。
- 五項檢查各 exit 0，70 單元、24 正式 dist 互動／排版、15 安全回歸通過。手機尺寸截圖已人工檢視；詳見 zhuyin-right-build-log.md 與 zhuyin-right-evidence。
- 本機未發布，新版 iPhone／Safari／VoiceOver 未實測；語音另做、Phase 5 未開始、完整 S5 未通過。下一步本機與手機排版複測。

## 2026-10-11 暫時發布 GitHub Pages

- 使用者授權暫時發布。產品提交 a97c2f2b6e3b6d1b4135cb6f29d66ef0ab7d5422 已推送 main-uv12jr；沿用原 Pages workflow，未更改發布設定。
- Actions 38149508753 completed/success：https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/runs/38149508753 。公開 HTML、JS index-DTYWLPM1.js、CSS index-DMPMRFGz.css 均 HTTP 200。
- 公開網址 https://freshrogerchang-dev.github.io/3D-Social-interactive-game/?v=a97c2f2 已用 Chrome 154／SwiftShader 驗證 24/24 互動排版與 15/15 安全回歸，無未處理 pageerror。公開手機尺寸截圖已人工檢視，右側注音與新人物均可見；證據 pages-release-evidence。
- 歷史段落所述未發布狀態已由本次發布更新。本段與公開驗證證據保留本機，產品提交已完成發布。
- 語音另做；iPhone／Safari／VoiceOver 實機尚未驗證，完整 S5 未通過，Phase 5 未開始。下一步為 iPhone 重新整理與使用者實機複測。
## 2026-10-12 人物自然比例與細節
- 本機完成平滑臉型、自然手指／手腕／坐姿、連續褲管與袖口／衣襬／鞋帶細節，保留和藹風格。
- 五項工程檢查、70 單元、24/24 正式 dist 互動排版、15/15 安全回歸完成；手機／桌面與動作畫面已檢視。詳見 npc-natural-build-log.md、npc-natural-evidence。
- 使用者授權跑完先推送，準備提交 main-uv12jr 並沿用 Pages workflow。
- 語音另做，Phase 5 未開始；iPhone／Safari／VoiceOver 與真實 GPU 效能尚未驗證。

- 發布完成：產品提交 af50a54 已推送，Pages Actions 38183337447 success；公開資源 HTTP 200，線上 24/24 互動排版通過。發布後證據與收尾紀錄保留本機。下一步：使用者 iPhone 複測人物外觀與動作。

## 2026-10-12 人偶感回饋與角色重做
- 使用者指出前版像人偶／紙紮人。已查閱四款市售社交／生活模擬遊戲官方資料，檢視 MySims、Tomodachi Life 官方人物圖；取捨詳見 npc-cozy-design-log.md。
- 自製表面臉部貼圖、暖色皮膚、清楚柔和微笑、完整髮型與連續袖子／手臂，保留互動及安全規則。
- 五項檢查、71 單元、24/24 正式 dist 互動排版、15/15 安全回歸已完成，手機／桌面／動作畫面已檢視。沿用使用者檢查完推送授權準備發布 main-uv12jr。
- 外觀舒服與否尚待使用者評估；iPhone／Safari 實機與專業評估未完成，語音另做、Phase 5 未開始。

- 發布完成：36fc84c 已推送，公開 HTML／JS／CSS HTTP 200 且與本機 Pages base 資源一致；公開人物、打招呼與點頭擷取 exit 0／pageerror=[]，畫面已檢視。Actions API 限流，未以 API 驗證 run 結論；發布後紀錄及 npc-cozy-public-evidence 留本機。下一步使用者實機外觀評估。

## 2026-10-12 圓潤造型與舉手揮動
- 使用者指定參考 Disney Dreamlight Valley 柔和風格，「圓環一些」按圓潤解讀並告知；原創臉頰、上衣、肩身、鞋子更圓潤，眼睛更柔和。
- 肩肘腕分段：0.65 秒抬起、1.5 秒兩次左右擺動、0.65 秒放下，掌心朝前，保留單 RAF 與暫停／退出重設。
- 五項工程、71 單元、24/24 互動排版、15/15 安全回歸完成，揮手畫面已檢視。詳見 npc-rounded-wave-build-log.md；準備沿用使用者授權更新 Pages。
- 外觀接受度、iPhone／Safari／VoiceOver、實際 GPU 與專業評估未完成；語音另做、Phase 5 未開始。

## 2026-10-15 公園多人物對話（一起玩、排隊、游泳課）

- 使用者指定：在公園內新增「請問可不可以一起玩」「輪流排隊」「放學不想去游泳課（媽媽說游完回家可以玩 Switch）」，不做場景切換；檢查通過後同意 commit／push。由 Claude Code 雲端工作階段執行，基準 a645a08。
- 對話改為通用情境模型（節點 id 有型別檢查）；小安打招呼內容與路徑不變。新增小宇（左前 45°、拿球）、小晴（右前 45°、溜滑梯排隊）、媽媽（最遠的公園入口）；彼此距離大於靠近範圍，引擎回報最近的人物，動作只給正在對話的人。人物朝向固定，不追蹤玩家。
- 三個情境都遵守：對方不先開口、說的與動作選項完全對等、幫助保留原節點、無計時與評價語、先不參與與返回安全區都不算失敗、每條路都能回公園。新增 97 字人工注音與「媽媽」「謝謝」疊字輕聲。
- Node 22.22.0：五項檢查各 exit 0，10 檔 89 項單元測試通過；新對話瀏覽器 36/36、打招呼回歸 24/24、安全控制 15/15、S4 安全 22/22，均 exit 0（Chromium 141 headless／SwiftShader）。依賴與設定檔不變。
- 全部對話是待專業審查草案；注音、站姿人物外觀（手臂沿用坐姿）、iPhone 實機、語音、VoiceOver 仍未驗證。詳見 park-dialogues-build-log.md 與 park-dialogues-evidence。

## 2026-10-15 人物改為模擬市民式寫實人物（MakeHuman CC0）

- 使用者要求「做成像模擬市民一樣的人物」。以 MakeHuman（CC0，commit a8bc2d5）的基礎網格、體型參數、骨架、權重與眼睛，用新工具 tools/characters/build_characters.py 產生小安、小宇、小晴、媽媽四個 GLB（合計約 6.5 MB），衣服、頭髮、眉毛、嘴唇由程式產生；不使用《模擬市民》素材。
- 遊戲非阻塞載入模型，載入前或失敗時保留原本的自製人形；姿勢（手臂放下、小安坐長椅、小宇拿球）與揮手、點頭改由骨頭驅動，暫停、返回安全區與停用動作規則不變。
- 五項檢查 exit 0、95 項單元測試；瀏覽器 36/36、24/24、15/15、22/22、10/10（含 20 次重建資源）均 exit 0。工具可重現：重新產生的 SHA-256 與 manifest 相同。
- 外觀接受度、恐怖谷風險的專業評估、iPhone 載入時間與 FPS 未驗證。詳見 characters-makehuman-build-log.md 與 characters-evidence。使用者已同意 commit／push 到 main-uv12jr。

## 2026-10-15 人物臉部調整（眼睛大一點、好看一點）

- 使用者要求「眼睛大一點 好看一點」。只改人物產生工具與四個 GLB，遊戲程式不變。
- 眼睛：小孩眼睛放大參數 0.8 → 1.5、眼皮張開 +0.3；媽媽 0.4 → 1.15、張開 +0.4。眼睛貼圖改由工具產生（乾淨眼白、深棕虹膜、略大瞳孔，不再偏紅、沒有血絲）。
- 眉毛：原本用頂點顏色，額頭網格太粗所以呈鋸齒或看不見；改成貼在皮膚上的細眉毛帶（眉頭粗、眉尾細，顏色比頭髮略淡）。嘴唇改為柔和漸層。
- 頭髮：前緣厚度漸薄（不再像帽簷），髮際線不再出現深色三角形，瀏海略低。
- 模型每個約 1.1 MB（原 1.7 MB，合計約 4.5 MB）。五項檢查 exit 0、95 項測試；前後對照見 characters-evidence/face-before-after.png。詳見 characters-makehuman-build-log.md §8。尚未 commit／push，需使用者同意。

## 2026-10-15 公園場景細節

- 使用者要求「把場景弄好看一點 更多細節」。新增 `src/scene/ParkDetails.ts`：外圍樹籬與灌木、花圃、靜止的鞦韆與沙坑、第二張長椅、野餐桌、路燈（不發光）、垃圾桶、石頭、遠景樹與建築輪廓、漸層天空與靜止的雲、草地色塊與小草。全部靜態，無新套件、無外部素材。
- 會擋路的設施都在可走範圍外，碰撞與走向人物的路線不變；顏色 HSL S ≤ 0.6；「環境細節：低」同時減少草叢。
- 五項檢查 exit 0、98 項測試；瀏覽器對話 36/36、打招呼 24/24 exit 0。需要 preview 的 S4／S5 瀏覽器檢查未執行（未驗證）。iPhone 效能未量測。詳見 scene-details-build-log.md。尚未 commit／push，需使用者同意。

## 2026-10-16 人物改為表情豐富的卡通人物

- 使用者：「人物不用擬真，改成臉部表情豐富的卡通人物即可」。前一輪「模擬市民風格」寫實人物（髮片頭髮、寬鬆衣服）沒有發布，直接改為卡通人物。
- 新增 `src/npc/CartoonFace.ts`：眼白、虹膜、高光、上下眼皮、眉毛、嘴型（morph target）、腮紅；六種表情（平常、開心、興奮、思考、驚訝、擔心），約 0.3 秒柔和過渡，停用動作時直接切換；沒有自動眨眼或循環動作。
- `src/npc/SeatedNPC.ts` 重寫為程式產生的卡通人物：大頭、圓臉、圓潤四肢；髮型（短髮、刺刺頭、鮑伯頭、媽媽馬尾）、短褲／短裙／長裙；坐姿、拿球、揮手、點頭沿用。
- 對話節點加上 `expression`：表情表示對方自己的感受；先不參與、結束與回到公園的節點只用平和或開心的臉（有測試）。
- 移除 MakeHuman 模型（約 6.6 MB）、`HumanModel.ts`、`FriendlyFaceTexture.ts`、`tools/characters/` 與授權說明中的 MakeHuman 段落。詳見 cartoon-characters-build-log.md。尚未 commit／push，需使用者同意。

## 2026-10-16 公園的動態感

- 使用者要求 NPC 有動態感、溜滑梯有小朋友排隊、有人吹泡泡。人物加上閒置動態（呼吸、看四周、眨眼、看旁邊、手臂微擺、小安晃腿、小宇拋接球）；新增三位不能對話的背景小朋友（溜滑梯平台上、扶梯子，都排在小晴前面；步道旁吹泡泡）與慢慢飄的泡泡。
- **設計變更**：原本「沒有自動循環動作」（S3 建議）改為有閒置動態，但全部受「人物動作」開關與系統「減少動態」控制，關閉即靜止；啟動時就套用設定。詳見 park-life-build-log.md。
- 五項檢查 exit 0、108 項測試。尚未 commit／push，需使用者同意。

## 2026-10-16 搖桿轉身、置中對話、語音

- 搖桿改為「往上前進、往下後退、往左右轉身」（使用者選）；圓盤加 ▲▼↺↻ 提示。不再能橫著走。
- 對話時畫面蓋一層半透明暮色，卡片從畫面一半開始（上方看得到說話的人和表情），選項是一排大按鈕；選完回到公園才收起。
- 語音：對話自動唸（人物台詞＋旁白）、「再聽一次」、設定「語音」開關。使用者選用**裝置內建語音**（zh-TW，以音高區分說話者）；Gemini 離線產生工具 `tools/voice/generate-voice.mjs`（70 句）保留為可選，音檔尚未產生。實際聲音未在實機聽過（未驗證）。詳見 controls-dialogue-voice-build-log.md。
- 五項檢查 exit 0、119 項測試；瀏覽器 park-dialogues 36/36、phase4 24/24、voice 11/11。尚未 commit／push（使用者選擇全部做完再一起推）。

## 2026-10-16 新增三個公園情境、半透明對話卡片

- 使用者要求更多公園腳本、對話時清楚顯示問題與選項、後面半透明，完成後推送（已同意 commit／push）。
- 出發點後方新增三位可對話人物：小芸「借泡泡」（借到要還、練習對方不借）、阿公「東西掉了」（說的、用手指或撿起來還；走遠時找大人）、小哲「關心朋友」（問一問、陪著或找大人）。原本吹泡泡的背景小朋友改為小芸。全部是待專業審查草案。
- 對話卡片背景半透明（62%），選項按鈕 82%；以「？」結尾的問題加粗放大。
- 五項檢查 exit 0、128 項測試（Node v22.22.0、Vitest 5.0.3）；瀏覽器 park-dialogues 53/53（含三位新人物、問題加粗、卡片半透明）、phase4 24/24、voice 11/11。iPhone 實機未驗證。詳見 park-more-scenarios-build-log.md。


## 2026-10-17 生活練習第一版

- 使用者明確要求實作三個生活情境。基準 e5ce2a5，保留 Claude 已新增的七位公園人物、卡通表情、注音、裝置語音與搖桿設定。
- 公園新增「生活練習」入口，主動選過馬路、外出吃飯或上廁所；以原創靜態 SVG 示意與互動卡呈現，未新增可自由行走的完整 3D 馬路／餐廳／廁所。
- 過馬路先停在人行道、與熟悉照顧者牽手、確認行人綠燈與車輛停讓；不想牽手可表達不適並求助，不直接放行。吃飯可說想活動／太吵／東西掉了／想鑽桌下，提供安全位置和照顧者協助，並能接到廁所。尿濕後提供換衣、清潔與隱私協助，不羞辱或要求憋尿。
- 全程保留幫助、暫停與返回安全區；互動停住移動，退出清除情境。新台詞沿用媽媽與旁白的裝置語音，取消播報不阻擋操作；沒有呼叫 API 或生成音檔。僅目前 session 記憶體狀態，不累計、儲存或傳送。
- Node 22.22.0／npm10.9.4，npm ci 與五項工程檢查各 exit0，14檔135項測試通過；build668.36kB／gzip174.87kB，既有chunk警告保留。詳見 life-practice-build-log.md 與 life-practice-evidence。
- 所有新內容、注音、語音實際效果及手機操作待驗證／專業審查，不宣稱完整 S5 通過，不進 Phase 5。

- 生活情境正式 dist 瀏覽器 31/31、exit0（Chromium／SwiftShader），涵蓋三種手機尺寸、語音取消、幫助焦點、暫停恢復、跳過、返回安全區與情境中 WebGL context lost。證據 life-practice-evidence/local。不是 iPhone 實機結果。

- 既有打招呼24/24、語音11/11、安全控制15/15回歸各exit0，見 life-practice-evidence/regression。語音為替身驗證，實際試聽待完成。

- 最後入口排版檢查抓到短畫面FPS遮擋生活按鈕，已改放左上空位。僅此CSS調整後重跑五項工程各exit0及最終整合10/10、exit0（四張SVG HTTP200、三情境安全退出、兩種短畫面FPS入口命中），見 life-practice-evidence/final-integration。前述31／24／11／15項在此FPS位置調整前執行，流程及資源所有權未改。

- 發布提交23ec04609c4d309e27df409e36e34a489b7def0d，Actions run39034810793 build／deploy success。公開網站生活練習整合10/10、exit0，四張SVG HTTP200、三情境可開啟及安全退出，短畫面FPS不擋入口；證據 life-practice-evidence/published。新版iPhone／實際語音及專業審查仍未驗證。


## 2026-10-17 生活練習第二批

- 使用者明確回覆「請繼續」，按上輪推薦加入太吵人多、身體界線、計畫改變三個情境。原三個情境保留於首頁，按更多情境進第二頁；每頁最多四個選項，可上一頁或透過安全區退出，各情境仍有先不參與。
- 太吵時能說或用手指、休息／請人陪／熟悉輔具，仍不舒服可離開；拒絕抱親與揮手同樣被尊重，對方未停時可求助並離開，不責怪孩子；下雨、維修、餐點賣完均能失望、休息或不決定，餐點可先不買。
- 新增三張原創SVG、人工注音及既有語音清單句子，不播放刺激聲、不做實際碰觸動畫、不用對方情緒施壓。未修改引擎／RAF／設定／套件，沒有API呼叫、語音生成或資料蒐集。
- Node22.22.0／npm10.9.4，五項工程檢查各exit0，14檔139項測試通過。build675.81kB／gzip177.18kB；詳見support-practice-build-log.md及support-practice-evidence。
- 所有新內容、注音、真實語音與iPhone操作仍待驗證／專業審查；不宣稱完整S5通過，不進下一路線圖階段。

- 新情境本機瀏覽器27/27、原三情境整合10/10，各exit0；含幫助／暫停焦點、跳過後恢復操作、安全區退出、短畫面命中與所有插圖載入。證據support-practice-evidence/local、old-life；手機實測仍待完成。

- 第二批產品提交101d54466f92add5926f711b0fa791ebb3a0aaa9已推送，Actions run39037867760 build／deploy success；公開網站已有新選單，公開互動檢查另記結果。沒有開PR、推main或進其他路線圖階段。

- 第二批公開Pages互動27/27、exit0，三張新SVG HTTP200、短畫面安全控制與選項命中、跳過／安全區退出、語音取消與幫助焦點均通過；證據support-practice-evidence/published。使用者可從「生活練習→更多情境」進入。真實iPhone／語音試聽、VoiceOver及專業審查仍待完成。


## 2026-10-17–18 原公園延伸街區

- 使用者要求新對話延續公園、放同一張地圖，參考 GTA 的空間探索方式。保留原公園七位人物與背景活動；從東側步道接路口、餐館、公共廁所、休息角、親友見面處、公告牌。只借鑑連續步行與靠近啟動的概念，未使用其他遊戲素材。
- 所有設施加入原 ParkScene，沿用同一相機、canvas 與 RAF；街區地圖只設定目的地並顯示位置。結束互動留在當地，「返回安全區」才回原公園；換情境改開地圖，不遠端啟動其他地點。
- 路口與對岸均可開始同行，先牽手／確認號誌及停讓，再開放斑馬線步行，抵達對面才開放確認。同行人物沿同一 RAF 移動，並非骨架牽手動畫。車輛靜止，不模擬道路實際風險。
- 餐館有真實桌椅及牆面碰撞，明確選擇用餐後移到座位；說想上廁所會回站立位置，沿同一人行道走到入口才可確認。廁所只做外觀與入口，不呈現如廁過程。靜態公告、休息長椅與親友人物接原六種對話草案。
- 步行中保留搖桿、單次移動、幫助、暫停、安全控制；求助／開地圖會停住輸入，暫停不補跑。共用幾何及 InstancedMesh，資源由街區擁有並可重複清理；沒有新增套件、後端、追蹤、音效或語音 API。
- Node22.22.0／npm10.9.4，五項工程檢查各 exit0，15檔145項測試。JS692.03kB／gzip183.76kB，既有 chunk 警告保留；瀏覽器與發布證據續記於 neighborhood-build-log.md。
- 新街區 iPhone 操作、FPS／記憶體、語音試聽、Safari／VoiceOver與專業審查仍未驗證；不宣稱完整 S5 通過，不進下一路線圖階段。

- 最終本機街區23/23、原打招呼24/24、安全控制15/15各exit0。最後地圖補注音與安全列捲動留白後，重跑五項工程各exit0、145單元，並以最終Pages產物跑地圖8/8、exit0；完整路線23與24／15是在這次DOM細節前執行，未冒稱完整重跑。證據及命令見neighborhood-build-log.md與neighborhood-evidence。準備沿用授權更新main-uv12jr／Pages。

- 街區產品提交53782ebdb6e959f781390411f5a02a5a9c6bd890已推送。Actions run39083600902的build／deploy均success（https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/runs/39083600902）。公開Pages檢查10/10、exit0，JS／CSS HTTP200且逐位元符合本機Pages建置；六目的地、注音、兩種短畫面所有地圖按鈕命中、只指引不傳送、暫停與安全區皆通過，無pageerror。見neighborhood-evidence/published與deployment.json。後續僅補紀錄，不改應用程式；新版iPhone實機與專業審查仍待完成。


## 2026-10-22 Zephyr 小女生聲音設定

- 使用者已選定較明顯調整版：語速 85%、升高 2.5 半音。2026-10-22 使用者回覆「都核准」，核准既定依賴安裝、檢查與本次 commit／push；遊戲修改存新分支，不觸發發布。
- main 試聽流程已同步提交 840d8d77c53b70fbbe29ae08618565f70426d55b：Zephyr 生成後自動離線後製；第一句 A 保存原音並以聲線／模型／台詞／版本核對後重用，不消耗新 API 額度。main 的工作流程僅手動執行。
- 遊戲生成器的小晴、小芸使用 Zephyr 與同一後製設定，成人、男孩及其他覆寫聲線不套用；不調整 VoicePlayer，避免重複升調。每檔保存 render 設定，舊設定不誤判為已更新；新增 --speaker／--limit 支援小量生成。
- Node 22.22.0、npm 10.9.4；npm ci exit 0（鎖檔版本不變）。typecheck、lint、format:check、test、build 五項各 exit 0，15 檔 145 項測試通過。JS 692.03 kB／gzip 183.76 kB，既有 chunk 警告保留。
- 小晴 --dry-run --speaker=xiaoqing --limit=1 exit 0，範圍 2 句、最多 1 句，選用 Zephyr；沒有呼叫 Gemini。兩端濾鏡輸出與使用者選定 WAV 逐位元相同，原生角色範圍檢查通過。
- 遊戲修改保存於 codex/zephyr-younger-profile，不推 main-uv12jr、不觸發 Pages；完整角色語音未生成，線上遊戲仍使用既有語音。新版 iPhone／實際完整台詞試聽未驗證，不宣稱完整 S5 通過。
- 詳見 zephyr-younger-voice-build-log.md。下一步為小量生成實際角色台詞與試聽，遊戲發布另行確認。


## 2026-10-22 每日語音 routine

- 使用者確認小男孩為 Sadaltager B 溫和慢速、+2.5 半音，並在了解免費／付費 Tier 區別後明確核准 Tier 1 預付金鑰每天最多 5 句、接受小額扣款。小女生維持 Zephyr 設定，成人／旁白維持既有聲線。
- 清單 226 句、8 位說話者，涵蓋公園與生活／支持情境，補齊街區文字變體。main 排程每天 UTC09:23（台灣17:23）；專用 codex/daily-game-voice 保存進度與音檔，不發布網站。
- 每次 HTTP 前先保存當日預留計數，太平洋日期重設；失敗也計入 5 次。原音與編碼分開，重跑／後製不重複花費；完成後停止 API。服務權限／帳務錯誤暫停，單一來源三次失敗轉人工。
- 五項工程檢查最終各 exit0，147 項單元、11 項 Python 預算／接續測試、原生本機 Git checkpoint 與 FFmpeg 三種角色編碼檢查通過。尚未實際呼叫 Gemini，本機真實進度 0/226；首次遠端排程與金鑰寫入權限仍待觀察。
- 詳見 daily-voice-routine-build-log.md 與 tools/voice/README.md。全新音檔實際試聽、手機與發布仍未驗證；完成全部語音後再確認網站發布。
