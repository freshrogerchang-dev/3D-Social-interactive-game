# S5 F8：PBR LUT 資源擁有權修正

日期：2026-10-09。基準 `2a098dd152f82cba8992999927a587f714121f1a`，仍在 main-uv12jr／Phase 0＋1。使用者要求繼續 S5，沿用本工作階段 S5 修正與 commit／push 授權；未安裝、升級或新增設定檔、未啟動伺服器，不進 Phase 2。

## 1. 問題與修法

05-extended-review.md §8 已定位 three 0.186.1 的共用 DFG_LUT：每個 renderer 對原貼圖的 dispose listener 會持有 WebGL context／舊 canvas，20 次重建後仍有 21 個 detached canvas。

ParkScene 現在以公開 MeshStandardMaterial.onBeforeCompile hook 提供 dfgLUT uniform 的 value 存取器。renderer 指派原始 DFG 貼圖時，場景以公開 Texture.clone 建立自有 GPU 貼圖；同一場景三個材質共用這一份副本，相同 source UUID 不再反覆 clone。CPU Source／查找資料可共用，GPU 資源與 dispose listener 屬於該場景的副本，未上傳或處理共用原貼圖的 listener。

場景 dispose 釋放自有 geometry／material、LUT 副本及其參照，保留冪等性。另一個仍存活的場景有自己的副本，不受到釋放影響。沒有操作 _listeners、heap ID、three 內部 import，亦未改 node_modules。

這是對 exact three 0.186.1 的相容性修正，依賴其 PBR dfgLUT uniform 名稱。升級 three，或未來新增模型／PBR 材質與其他 onBeforeCompile hook 時，須重新核對此生命週期橋接與雙 context／像素回歸，不能直接宣稱所有 future material 已受覆蓋。目前只處理既有三個公園材質。

## 2. 驗證

Node 22.22.0／npm 10.9.4：typecheck、lint、format:check、test、build 全部最終 exit 0；Vitest 4 檔 45 項。新增單元驗證貼圖副本獨立、相同 source 不重建、共享原貼圖不被 dispose、另一場景可獨立釋放。原 44 項回歸保留。

| 瀏覽器腳本／條件 | exit code | 結果 |
|---|---|---|
| browser-check.mjs，經 s5-local-dist-runner.mjs 讀本地 dist | 0 | 22/22 |
| s5-runtime-browser.mjs，同一 dist | 0 | 15/15：context loss／WebGL 不可用安全控制 |
| s5-extended-browser.mjs --local --expect-released | 0 | 11/11；新增 GC 後 detached CANVAS=0 的硬斷言，不降低原 10 項 |
| s5-render-errors-browser.mjs | 0 | 4/4：render／resize／paused resize／safety 例外仍能停止與重建 |
| s5-owned-lut-browser.mjs | 0 | 3/3：baseline/fixed PBR PNG 位元組相同；一邊釋放不影響另一 context；全部釋放後 detached canvas=0 |
| node --check 新增／修改 docs 腳本 | 0 | 語法通過 |
| git diff --check | 0 | 無空白錯誤 |

實際為預裝 playwright-core 1.57.0／系統 Chromium 151.0.7922.173＋SwiftShader，不是實機 GPU。全程以 Playwright route 提供本地檔案，沒有啟動 preview。

### 20 次重建

在每次「結束」狀態，0／5／10／15／20 次執行 HeapProfiler.collectGarbage、Runtime.getHeapUsage、Memory.getDOMCounters；第 20 次 DOM.getDetachedDomNodes 的 canvas 數為 0。沒有額外呼叫共用 DFG_LUT.dispose 或改動 DevTools 物件。

| 重建次數 | GC 後 used JS heap（bytes） | DOM nodes | listeners |
|---|---|---|---|
| 0 | 3,293,116 | 123 | 30 |
| 5 | 3,691,312 | 126 | 30 |
| 10 | 4,078,668 | 126 | 30 |
| 15 | 4,110,204 | 126 | 30 |
| 20 | 4,144,212 | 126 | 30 |

這些數據排除本輪已定位的累積持有鏈；heap 仍有暖機／工具快取變化，不以數值非零或小幅變化判為洩漏，也不宣稱整個 GPU driver、所有瀏覽器或長時間工作負載完全無洩漏。

### 雙 context 與 PBR 外觀

用公開 WebGLRenderer.info.memory 讀兩個 renderer：各自 geometry=3、texture=1；釋放左側後左側均為 0，右側仍 geometry=3、texture=1。右側再次繪製的 PNG 與釋放前完全相同。最後釋放右側並清除測試 harness 參照，兩者 textures=0、detached canvas=0。

對照原 2a098dd 的 ParkScene 與修正版本：相同 320×240、相機、光線、antialias、sRGB／ACES，渲染 PNG 逐位元組相同。對照用 preserveDrawingBuffer 只供測試擷取；產品 renderer 設定不變。證明此靜態骨架畫面沒有因 LUT ownership 改變，不能推廣到尚未存在的模型／材質。

## 3. 曾遇到的檢查問題

- 初次 lint exit 1：getter/setter 的 this alias 不符合專案規則。改為 Object.defineProperty 配合 arrow accessor，沒有關掉規則；重新建置並重跑五項與最終瀏覽器驗證。
- 雙 context 腳本初次 exit 1：TypeScript 模組相對路徑錯誤，改為標準 require('typescript')，沒有安裝。
- 下一次雙 context 檢查 exit 1：PNG 與 texture counts 已通過，但 test harness 的 window.test 陣列仍刻意持有 disposed renderer，導致兩個 detached canvas。stats 讀完後先清空 harness 陣列，再做 GC；3/3 通過。產品程式沒有因這個測試持有問題而改動。
- 前置局部版本之後有程式改動，最終 dist 已另重跑 22＋15＋11＋4，沒有沿用前置版本的成功結果冒充最終驗證。

## 4. 證據與重跑

- [五項輸出](s5-lut-evidence/five-checks.txt)
- [22 項](s5-lut-evidence/browser-22-result.txt)、[15 項](s5-lut-evidence/runtime-15-result.txt)
- [11 項資源／可及性](s5-lut-evidence/local-result.txt)、[memory／detached DOM 原始結果](s5-lut-evidence/local/browser-result.json)
- [4 項例外接管](s5-lut-evidence/render-errors-result.txt)
- [雙 context 與像素對照](s5-lut-evidence/multiple-contexts/result.json)、[原版 PNG](s5-lut-evidence/multiple-contexts/baseline.png)、[修正版 PNG](s5-lut-evidence/multiple-contexts/fixed.png)

```bash
# 同 Node 22 PATH，使用預裝 Playwright 模組與系統 Chromium；Chromium 在沙箱外執行。
PLAYWRIGHT_MODULE_DIR=/opt/codex/runtimes/cua/lib/node_modules CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node docs/dev-flow/s5-extended-browser.mjs https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ docs/dev-flow/s5-lut-evidence/local --local --expect-released
node docs/dev-flow/s5-owned-lut-browser.mjs docs/dev-flow/s5-lut-evidence/multiple-contexts
```

F8 已在本地正式修正，發布後需對公開網址重跑 --expect-released，不能只看 Actions success。build JS 540.29 kB、gzip 135.10 kB，已知 >500 kB 警告仍保留。依賴、lockfile、Node pin 與工具設定不變。

完整 S5 仍待成人實機、跨瀏覽器、真實系統切頁、原生文字 200%、NVDA／VoiceOver、實機效能及專業審查。已詢問使用者可用實機，尚未收到型號／版本或實測結果；不能標成通過。操作表見 05-device-review-checklist.md。
