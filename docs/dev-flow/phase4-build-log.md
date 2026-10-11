# Phase 4 打招呼互動 — 文字工程版

日期：2026-10-11。使用者明確指定 Phase 4，沿用前述 commit／push 授權；不進 Phase 5。所有文案及圖示仍待專業審查，不宣稱完整可玩 MVP 或完整 S5 通過。

## 行為

- 小安仍固定坐著。距離沿用 Phase 3 的 2.8m／3.2m 遲滯判斷；遠處按鈕顯示「靠近再招呼」並停用。靠近不自動開口，只有按「打招呼」才開始。
- 第一節點：「說你好」「點頭」「先不參與」。說你好／點頭只代表選擇，不使用麥克風、語音辨識或攝影機。兩者的小安台詞及後續選項完全相同。
- 台詞一次完整顯示、不逐字、不自動前進；再看一次保留原節點並聚焦文字。幫助是同節點覆蓋內容，關閉焦點回到原幫助按鈕。
- 結束招呼、再練一次、換個方式／回到開始、先不參與／回公園全部可達；結果 finished／skipped／exited 僅存在目前互動的記憶體，不累計、不儲存、不傳送。
- 對話開啟停止移動、清除所有輸入並隱藏圓盤／移動設定；暫停保留原節點、幫助與焦點。恢復仍鎖住移動。關閉對話才重新啟用，無殘留方向。
- 返回安全區退出互動並沿用既有引擎安全姿態；結束／重新開始會清掉舊互動。WebGL 出錯仍由 DOM 安全介面接管。
- 新增按鈕沿用至少 64px 目標；面板獨立捲動，保留頂部常駐安全按鈕。
- 縮短草案文字，NPC 台詞 ≤10 字、提示／幫助每句 ≤12 字、互動選項標籤 ≤4 字。未修改歷史草案，實作用內容測試固定限制。

## 範圍限制

這一版只有文字與標題靜態對話圖示。點頭及揮手沒有角色動畫，各選項圖示、人工注音、預生成語音、音檔 manifest／試聽均未製作；不以瀏覽器內建語音替代原定離線音檔。沒有新套件、新設定檔、API／金鑰或伺服器。不是 Q3 完整驗收版。語音製作與實際 API 呼叫需另階段處理。

## 驗證

Node 22.22.0、npm 10.9.4。五項命令 `npm run typecheck`、`npm run lint`、`npm run format:check`、`npm run test`、`npm run build` 各 exit 0，7 個檔案 65 項單元測試通過。build 581.59 kB，gzip 147.81 kB；既有 >500kB 警告仍在。

新增正式內容測試：轉移目標存在／所有節點可達／所有節點可回公園、每節點求助保留且可退出、退出與跳過不算 finished、兩種回應對等、文字長度與禁用詞、修復與重新練習。引擎測試驗證對話鎖在暫停恢復後仍有效。

瀏覽器用既有 playwright-core 1.57.0 + Chromium 151.0.7922.173 + SwiftShader，直接以路由服務正式 dist，不啟動伺服器、不注入引擎或相機探針。重跑方式：

```bash
PLAYWRIGHT_MODULE_DIR=/opt/codex/runtimes/cua/lib/node_modules \
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
node docs/dev-flow/phase4-browser.mjs /tmp/phase4-evidence
```

初次 17/18：實際抓到幫助畫面暫停後焦點未恢復；產品已加入面板 focusin 記錄，不放寬檢查。修正後 18/18 exit 0，見 phase4-evidence/browser/result.json。另跑 `s5-local-dist-runner.mjs s5-runtime-browser.mjs http://s5.local/ /tmp/phase4-safety`：15/15 exit 0，涵蓋真實 WEBGL_lose_context extension、不可用 WebGL、三種输入與放大文字／短畫面。

實機 Phase 4、旁白、其他瀏覽器、專業審查均未驗證。使用者本輪之前回報 iPhone 12 Chrome 公園、移動／轉向「都很順暢」；僅為使用者觀察，沒有 FPS 數值，不能延伸為新版對話已通過。

## iPhone 12 手動複測

重新整理公開網站；走近小安後按「打招呼」。依序試：

1. 說你好 → 換個方式 → 回到開始 → 點頭：比較相同小安回應及選項。
2. 幫助 → 暫停 → 繼續 → 關閉幫助：應回到原節點。
3. 再練一次 → 先不參與 → 好 → 回公園：圓盤應恢復，沒有評價語。
4. 任何節點按返回安全區 → 繼續：不應重新顯示舊對話。
5. 轉橫向，捲動面板：頂部暫停／返回安全區仍可按。

「說你好」是選擇按鈕，不需要對手機說話；本版沒有聲音或麥克風。

## 公開發布證據

產品提交 `0047752ab819e7db63400cd32cb01e7d3766a230` 已推到 main-uv12jr；GitHub Actions run [38125486147](https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/runs/38125486147) 的 build／deploy success。使用既有代理存取實際 Pages：

```bash
PHASE4_URL=https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ \
PLAYWRIGHT_MODULE_DIR=/opt/codex/runtimes/cua/lib/node_modules \
CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
node docs/dev-flow/phase4-browser.mjs /tmp/phase4-published
```

18/18 exit 0，見 phase4-evidence/published/result.json 與手機尺寸截圖。沒有對公開程式注入探針。這是雲端 Chromium 軟體 WebGL，不代表 iPhone／旁白／專業內容審查通過。後續文件提交也會觸發既有 workflow，但沒有修改產品內容。
