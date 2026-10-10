# 左下半透明方向圓盤

2026-10-10，基準 main-uv12jr／7f1a2dd。使用者要求操作前進後退左右轉改為左下半透明小圓盤，範圍只調整操作介面，不進 Phase 4。

## 修改

192×192px 圓盤由五個 64×64px 真實按鈕組成：上箭頭前進一步、下箭頭後退一步、左右曲箭頭轉向、中央方塊停止。沿用原控制器一步約 0.6m、轉向 15°，不新增長按、RAF、排程或套件。左右平移與原有設定保留於「設定」，可及名稱為「操作與設定」。

底色透明度圓盤 35%／按鈕 65%，圖示與焦點不套整體 opacity，不用背景模糊。安全按鈕保持最高層。圓盤依 safe-area inset 位於左下，NPC 文字移到上方；短畫面隱藏重複角色提示，可及 canvas 名稱仍保留。設定展開時收起圓盤讓出捲動面板，收合後恢復。

控制器擁有圓盤 click listener，setEnabled 統一隱藏／顯示，dispose 移除 listener 並清空 DOM 參照。暫停、錯誤、結束及返回安全區流程沿用既有機制。沒有改動禁止手勢縮放設定。

## 檢查

Node 22.22.0／npm 10.9.4、playwright-core 1.57.0、Chromium 151.0.7922.173／SwiftShader。正式檢查各 exit 0：

- npm run typecheck／lint／format:check／test／build；6 檔 57 項測試通過。證據 pad-evidence/checks-final.txt。
- node docs/dev-flow/pad-browser.mjs：13/13、exit 0。真正 production dist 路由，未暴露相機；含點按移動／轉向／停止、暫停隱藏／恢復、設定開合、320×360／390×844 五個按鈕中心命中、大字設定、結束重開與例外檢查。證據 pad-evidence/browser/result.json、phone-pad.png。
- node docs/dev-flow/s5-local-dist-runner.mjs docs/dev-flow/s5-runtime-browser.mjs http://s5.local/ docs/dev-flow/pad-evidence/safety：15/15、exit 0。含 WebGL 不可用、context lost、鍵盤／觸控安全流程及短畫面放大文字。

第一輪圓盤 12/13：重開後設定仍展開，圓盤按設計收起；測試錯誤預期它可見。改為先收合設定再查，最後 13/13，產品不為該測試改行為。

JS 558.91kB／gzip 140.63kB；>500kB 警告保留。git diff --check exit 0。原 phase2／phase3 操作腳本假設前進按鈕在展開設定內，現在操作版面改變，應使用 pad-browser.mjs；歷史證據保留。

實機 iPhone 圓盤、原生 200% 文字、報讀器、真實 GPU 效能仍待驗證；工程檢查不延用為實機通過。未啟動伺服器、無新套件／設定。

資源檢查 node docs/dev-flow/s5-extended-browser.mjs http://s5.local/ docs/dev-flow/pad-evidence/resources --local --expect-released：11/11、exit 0。20 次重建後 detached CANVAS=0，結束時 canvas／pending RAF=0；第 5–20 次 listener 未持續增加。Headless 系統切頁未產生 hidden，保留未驗證。完整證據 resources/browser-result.json。
