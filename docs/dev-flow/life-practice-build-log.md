# 生活練習第一版：過馬路、外出吃飯、上廁所

日期：2026-10-17；分支 main-uv12jr；基準 e5ce2a552a0d029fdd5d6f945138e546025c65fd。使用者要求接續 Claude 的公園情境，並明確要求實作上輪提出的三個生活情境。沿用先前安裝、commit／push 與 Pages 更新授權；不進 Phase 5。

## 實作範圍

保留 Claude 新增的七位可對話人物、背景小朋友、卡通表情、注音、裝置語音與搖桿設定。新增公園右側「生活練習」按鈕，進入獨立情境選單；不需要走到特定人物。三個情境以原創靜態 SVG 示意與互動卡呈現，並非新增可自由行走的 3D 馬路、餐廳或廁所。

- **過馬路**：先在人行道，與熟悉的照顧者一起；牽手後仍要確認行人綠燈及車輛停讓。車還在動則留下等候。不想牽手時可說不舒服／求助，先停下安排安全方式，不自動走入車道。靜態紅／綠號誌圖隨文字步驟切換，沒有倒數、車禍、追逐或喇叭驚嚇。
- **外出吃飯**：可選繼續吃、想動一動、不舒服、先不參與；噪音、掉物、想鑽桌下均提供照顧者協助，找安全／安靜位置，不把活動或感官需求視為不聽話。可直接接到上廁所流程。坐著、活動或休息後都可中性結束，不以服從換取分數。
- **上廁所**：想尿尿、不確定、害怕聲音／陌生環境、找不到廁所或需要衣物協助，都能表達及求助。不要求憋尿或實際身體操作。尿濕路徑提供換衣、清潔與隱私協助，不責備、不羞辱、不要求道歉。

每步有幫助與全域暫停／返回安全區；幫助保留節點與焦點，暫停保留原節點及幫助，返回安全區退出，重新開始清除舊情境。互動期間清除移動輸入，關閉後才恢復圓盤；回公園焦點回到「生活練習」。退出／跳過不算 finished，記錄只在當前 session 記憶體，不累計／儲存／傳送。

沿用媽媽與旁白的裝置內建語音；新台詞已列入離線語音清單工具，但未呼叫 API、未生成音檔。語音無須唸完就能繼續點選；切節點、暫停或退出會取消舊播報。注音是人工工程草稿，仍待逐字／多音字與專業審查。

生活卡使用不透明底色，獨立捲動，觸控目標至少 64px；既有公園半透明對話未改。插圖由本次以 SVG 路徑繪製，沒有下載第三方圖片或模型；不新增套件、設定檔、API、資料收集、RAF 或遊戲計時器。

## 環境與工程驗證

新工作區先 clone 指定分支；受限沙箱連不到既有 proxy，經正常的沙箱外執行取得倉庫與 npm registry，未更改代理、CA 或網路政策。

- Node 22.22.0 官方 tarball 與官方 SHASUMS256.txt 比對相符：9aa8e9d2298ab68c600bd6fb86a6c13bce11a4eca1ba9b39d79fa021755d7c37；npm 10.9.4。
- `npm ci` exit 0，沿用 package-lock.json，沒有升級套件。npm 顯示既有 ESLint 版本 deprecated 訊息，本次不更動工具版本。
- `npm run typecheck`、`npm run lint`、`npm run format:check`、`npm run test`、`npm run build` 各 exit 0。14 檔、135 項測試通過。完整命令與輸出見 life-practice-evidence/five-checks.txt。
- 新增正式測試：所有節點可達且能退出、求助保留節點、跳過／退出不算完成、換情境不沿用上輪結果、短句／四選項／禁用詞／注音、新台詞進語音清單，以及過馬路安全前提、用餐需求與廁所支持路徑。
- build JS 668.36kB（gzip174.87kB），大於500kB的既有警告仍在；不宣稱已完成效能驗收。

## 瀏覽器驗證方式

使用預裝 Playwright-core 1.57.0、Chromium 154.0.8037.57 與 SwiftShader；直接以 route 提供正式 dist，不啟動伺服器、不注入引擎或相機探針。生活驗證腳本也支援 LIFE_URL 公開網站，沿用 HTTPS_PROXY。

```bash
export PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH
export PLAYWRIGHT_MODULE_DIR=/opt/codex/cua_node/lib/node_modules
export CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
node docs/dev-flow/life-practice-browser.mjs /tmp/life-evidence
```

語音在瀏覽器檢查中使用不結束的播報替身，驗證仍可立即操作、取消播報；不代表真實裝置語音音質或 VoiceOver 通過。

## 限制與實機複測

情境內容、注音與插圖都是待專業審查草案。不是實際路況辨識工具，也不以遊戲選項判斷孩子在真實馬路／餐廳／廁所的能力。完整 S5、iPhone／Safari、語音實際試聽及專業審查仍未完成。

手機重新整理後，按「生活練習」：試過馬路的「不想牽手」和「車還在動」；用餐的「不舒服→想鑽桌下→想安靜」；廁所的「已尿濕了→請幫幫我」。再試幫助→暫停→繼續、返回安全區及橫向捲動。

生活情境正式 dist：31/31、exit 0，見 life-practice-evidence/local/result.json；三種畫面尺寸 390×844、320×360、844×390，並實際觸發 WEBGL_lose_context。情境截圖已檢視。

既有功能回歸：`phase4-browser.mjs` 24/24、`voice-browser.mjs` 11/11、`s5-local-dist-runner.mjs s5-runtime-browser.mjs` 15/15，均 exit0。輸出見 life-practice-evidence/regression，語音仍為替身驗證，不代表實際試聽。

補充排版檢查初次8/10：確實發現320×360與844×390在開啟FPS後，數字覆蓋生活入口。產品CSS已把短畫面FPS移到左上方（安全列下、圓盤上），未放寬命中檢查。原31項生活流程與24＋11＋15回歸在這個僅FPS位置調整前執行；最終版本另重跑五項工程與整合／入口命中檢查。

最終版本 `life-practice-smoke.mjs /tmp/life-smoke-final`：10/10、exit0，三情境及四張SVG均HTTP200，三情境安全退出後恢復圓盤；320×360與844×390開啟FPS後生活入口仍可命中。修正後短畫面截圖已檢視，證據 life-practice-evidence/final-integration。最終五項工程檢查亦全部exit0（14檔135測試），輸出已覆寫為最終版本。

## 公開發布

產品提交 23ec04609c4d309e27df409e36e34a489b7def0d 已推送到 main-uv12jr。GitHub Actions [run 39034810793](https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/runs/39034810793) build／deploy 均 success。

公開 https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ 已提供新的生活入口、JS index-Bh0_8fOZ.js 與 CSS index-DHKMIfRY.css。設定 LIFE_URL 為此網址，執行 `node docs/dev-flow/life-practice-smoke.mjs /tmp/life-published`：10/10、exit0；三情境可開啟及安全退出、四張SVG HTTP200、兩種短畫面開FPS後入口可命中、pageerror=[]。證據 life-practice-evidence/published，截圖已檢視。

以上是雲端 Chromium／SwiftShader，不代表 iPhone、VoiceOver、語音試聽或專業審查通過。最後文件提交也會觸發原有 Pages 流程，產品內容相同。
