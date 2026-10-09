# S5 雲端補充：依賴授權盤點與實際 DOM 對比

日期：2026-10-09。產品程式仍為 `34a9205`；本輪只新增審查工具、證據與文件。手機 iPhone 12／Chrome 的使用者回報另見 STATE.md；本輪沒有新增實機、報讀器或專業人員驗收。

## 1. 依賴授權

以 package-lock.json 全部 175 個套件路徑盤點（含 nested 與各平台 optional，不等於 175 個本機安裝套件）。本機已安裝 152 個；鎖檔 SHA256 `6fdecdd6e129d596405d56b7567a230153548666493fbdd9631e3d32672036e4`。所有條目皆有 license metadata；已安裝 package.json 的授權 metadata 與鎖檔沒有發現差異。

| 授權 metadata | 條目數 |
|---|---|
| MIT | 129 |
| Apache-2.0 | 17 |
| MPL-2.0 | 12 |
| ISC | 7 |
| BSD-2-Clause | 6 |
| BSD-3-Clause | 2 |
| BlueOak-1.0.0 | 1 |
| Python-2.0 | 1 |

唯一正式 runtime dependency 為 three 0.186.1（MIT）。其餘鎖檔條目標記 dev，包含建置、測試、型別依賴；dev 標記不能用來推定程式碼完全不會進入發布產物，例如 Vite modulepreload helper 已在 THIRD_PARTY_NOTICES.txt 保留 MIT 通知。lightningcss 與其 11 個平台套件為 MPL-2.0 建置依賴，不能把它們寫成 MIT，也不能把整個工具鏈稱為「全部 MIT」。

23 個未安裝條目只有鎖檔資料，未取得各自授權全文。本機 145 個項目有根目錄授權檔，esrecurse 與 imurmurhash 的完整許可文字在 README 內，亦保存該檔 hash；仍有 5 個項目未找到完整文字：@humanfs/types、@rolldown/binding-linux-x64-gnu、@rolldown/binding-linux-x64-musl、keyv、natural-compare。這與既有 05-extended-review.md §4 的缺口一致，本輪沒有冒稱補齊上游全文。

完整逐項清單與已取得授權檔 SHA256：[JSON](s5-audit-evidence/license-inventory.json)、[表格](s5-audit-evidence/license-inventory.md)。本輪完成鎖檔 metadata 盤點，尚未完成所有上游全文、套件內嵌程式碼、二進位組成及發布 bundle 的完整授權審查。沒有更動依賴、lockfile 或公開通知。

## 2. 瀏覽器 computed styles

Node 22.22.0，預裝 playwright-core 1.57.0、系統 Chromium／SwiftShader，390×844 CSS px，以 Playwright route 讀本地 production dist，不啟動伺服器、不連外。此尺寸不表示模擬或驗證 iPhone Safari／Chrome 的瀏覽器引擎。

涵蓋 running、paused、safety、ended，以及停用 WebGL 的 error、rest、safety-rest 共 7 個狀態。讀取可見按鈕、標題、面板文字的 computed styles，要求不透明背景、文字對比 ≥4.5:1；按鈕邊框對自身底色 ≥3:1、尺寸至少 64×64 CSS px。各狀態以實際 Tab 鍵確認一個按鈕的 :focus-visible、outline 至少 3 px，並計算焦點色對按鈕底色。

42/42 檢查通過，exit 0。文字最低 13.78:1、邊框對底色最低 3.71:1、焦點色對按鈕底色 7.82:1。詳細色值、尺寸與每項結果見 [contrast-result.json](s5-audit-evidence/contrast-result.json)。

限制：焦點框有 outline-offset，這裡的底色參考不是逐像素量測框外的 3D／遮罩合成背景；不能據此宣稱焦點所有相鄰背景對比通過。也沒有逐個按鈕／hover 色對、截圖像素、所有 viewport、原生文字 200% 或完整 WCAG 驗收。可及樹與 computed styles 都不能代替 NVDA／VoiceOver。

初次腳本 39/42、exit 1：在 ended／rest／safety-rest 的最後一個按鈕後按 Tab，焦點暫到頁面邊界；腳本誤把 body 的顏色當按鈕測量。修正為遇到非按鈕再按一次 Tab 回到首個按鈕後重跑，42/42。沒有修改產品或降低比值／尺寸門檻。

## 3. 重跑命令

```bash
export PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH
node docs/dev-flow/s5-license-inventory.mjs
PLAYWRIGHT_MODULE_DIR=/opt/codex/runtimes/cua/lib/node_modules CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node docs/dev-flow/s5-contrast-browser.mjs
```

兩支腳本最終均 exit 0。Chromium 在沙箱外執行；路徑是本次雲端既有工具，換環境請指向現有安裝位置。沒有安裝套件或新增設定檔。

完整 S5 仍待跨瀏覽器／平板、原生文字縮放、螢幕報讀器、真實 GPU 效能與專業審查，不進 Phase 2。使用者可依 05-device-review-checklist.md 測 iPhone Safari、橫直向與 VoiceOver；這些目前未驗證。

提交前 typecheck、lint、format:check、test（45 項）、build 全部 exit 0；既有 >500 kB 建置警告保留，git diff --check exit 0。
