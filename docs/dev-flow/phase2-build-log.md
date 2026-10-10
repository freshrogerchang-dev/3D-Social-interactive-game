# Phase 2：第一人稱移動

日期：2026-10-10。使用者明確回覆「Phase 2」，授權從 Phase 0＋1 骨架接續移動。基準 `090650e`／main-uv12jr。這是路線圖 Phase 2，不是 Dev-Flow S2，也不是完整可玩 MVP；S5 外部審查仍未完成。

## 操作與實作

- 桌面先點或用 Tab 聚焦「公園操作區」，WASD／方向鍵移動，滑鼠拖曳看向。不使用 pointer lock，不攔截 UI 聚焦的方向鍵或 Ctrl／Meta／Alt 快捷鍵。
- 手機／滑鼠點地面設定前往位置，天空不設目標；拖曳只看向，超過 8px 的拖曳不轉成點地面。多指、pointercancel、lostpointercapture、失焦清空輸入。
- 「操作與設定」提供往前／後／左／右一步、向左／右看與停止移動七個至少 64px 的真實 DOM 按鈕。一次點按走約 0.6m，無須長按或雙指同時操作。設定展開後可上下捲動。
- 預設 1m/s，速度可調 0.6–1.8m/s，轉向靈敏度 0.001–0.005 rad/px，FOV 50–75°／預設 60°。設定只存在本頁 DOM／引擎，不寫 localStorage 或傳送資料；「重新開始」沿用本頁滑桿值。速度取代原始路線圖示例的 3m/s，以 03 §9.2 慢速、低刺激優先，尚待實機與專業審查。
- 水平位置限制 x／z 各 ±8m，地面有低飽和邊界線，碰邊界不穿越。視線高度固定 1.1m，不做 head bob、搖晃、模糊、陰影或自動轉向；點目標時只平移。垂直看向限制 ±45°，每幀轉向限制 0.08rad。
- 移動採與 delta 相關的平滑加減速；斜向正規化，不加速。單幀沿用最多 0.05s，不因停頓補跑；目標附近減速並在 0.08m 內停止。
- FirstPersonController 由 GameEngine 擁有，更新接在現有唯一 RAF。暫停／context lost 關閉輸入並清目標／速度；恢復第一幀 delta=0，不沿用舊輸入。安全區重設位置及朝向後保持暫停。結束、初始化或繪製錯誤時解除控制器 DOM／document／window listeners。
- 相機現在可互動，移除 stage 的 aria-hidden，canvas 可聚焦、有可及名稱與操作說明。實際 NVDA／VoiceOver 尚未完成；不再沿用「3D 是純裝飾」的 S5 結論。
- 保留禁止遊戲手勢縮放的 CSS；FOV 是操作設定中的明確調整，不是雙指拉近拉遠。移除 Chromium 原生點按反白的漸退，鍵盤 :focus-visible 保留。

未新增 NPC、任務、對話、注音、語音、外部素材、資料收集、設定檔或套件；package.json／lockfile／Node pin 不變。

## 最終驗證

工具：Node 22.22.0，既有 playwright-core 1.57.0，系統 Chromium 151.0.7922.173／SwiftShader，Chromium 在沙箱外執行。瀏覽器以 route 讀本地檔，不啟動伺服器。

| 檢查 | 結果 | 證據 |
|---|---|---|
| typecheck／lint／format:check／test／build | 各 exit 0；5 檔 52 項單元通過 | phase2-evidence/five-checks.txt |
| 移動原始碼整合 | 19/19、exit 0 | phase2-evidence/integration.json |
| production dist 操作與畫面 | 7/7、exit 0 | phase2-evidence/production/result.json |
| 既有安全流程 | 22/22、exit 0 | phase2-evidence/safety-22.txt |
| 背景／context lost／短畫面 | 15/15、exit 0 | phase2-evidence/safety-15.txt |
| 重建／RAF／可及名稱 | 11/11、exit 0 | phase2-evidence/resources/browser-result.json |

19 項整合檢查對測試路由即時轉譯 TS，僅在該路由暴露 camera／controller 以讀位置；正式程式沒有探針。另以真正 production dist 7 項確認點地面後畫面改變、暫停與恢復保持穩定、停止按鈕有效、七個導覽按鈕尺寸、320×360／root 32px 的操作可達及無例外。兩者不能混稱為 26 項 production 相機位置驗證。

20 次結束／重建後，強制 GC 的 detached CANVAS=0，DOM nodes 在 5／10／15／20 次都是 193，listeners 每次 30；每次結束 canvas=0、pending RAF=0、最大同時 RAF=1。這項在最後一次僅改點按 CSS 前執行，之後僅修改 CSS 的原生點按反白，資源所有權與控制器程式未再更動；不代表真實 GPU／長時間所有資源完全無洩漏。

單元新增移動距離、30／60／120Hz、固定高度、無自動轉向、邊界、NaN 目標、暫停／恢復清輸入、安全姿態、重複 dispose、斜向等速、UI 鍵盤與 Ctrl 快捷鍵、取消事件及解除 listeners。引擎／main 的原 45 項生命週期測試保留；canvas 替身補足 ownerDocument 與可及屬性方法。

Build：JS 553.59kB、gzip 138.90kB，>500kB 既有警告保留。git diff --check exit 0。

## 過程問題與修正

- 第一版 lint 8 項錯誤：不必要的 optional chain／null fallback，以及 void arrow 表達式。改為實際 DOM 契約，補齊測試替身；沒有關閉 lint 規則。
- typecheck 替身轉型及 Ctrl 測試參數錯誤：使用 unknown 明確標示局部 canvas 邊界，補上 event.ctrlKey；最終五項重跑全部通過。
- 整合腳本曾把已展開的 details 再收合，導致等待隱藏按鈕逾時 exit 1；改為先看 open 狀態。多指改用 CDP 真實觸控點，避免人工 PointerEvent 沒有有效 capture。
- 三個 SwiftShader 瀏覽器並行時，500ms 等待只有少數模擬幀，出現 17/19、exit 1。改用實際位置進度作等待並分開跑，保留距離／速度門檻；最終 19/19。
- production 畫面比較曾 5/7、exit 1。差異圖定位到剛點按的按鈕（暫停 x66–186/y12–76、停止 x24–148/y631–695），為原生點按反白，非相機位移。等待繪製仍可重現；移除漸退後最終 7/7。初次失敗截圖與差異在 phase2-evidence/native-tap-feedback，未改低圖像相等門檻。

## 重跑

```bash
export PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH
export PLAYWRIGHT_MODULE_DIR=/opt/codex/runtimes/cua/lib/node_modules
export CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
node docs/dev-flow/phase2-browser.mjs
node docs/dev-flow/phase2-production-browser.mjs
node docs/dev-flow/s5-local-dist-runner.mjs docs/dev-flow/s4-screenshots/browser-check.mjs http://s5.local/ /tmp/phase2-safety-22
node docs/dev-flow/s5-local-dist-runner.mjs docs/dev-flow/s5-runtime-browser.mjs http://s5.local/ /tmp/phase2-safety-15
node docs/dev-flow/s5-extended-browser.mjs http://s5.local/ /tmp/phase2-resources --local --expect-released
```

## 待驗證與下一步

使用者在 iPhone 12 Chrome／Safari 的舊骨架安全操作、防縮放與放大文字均回報正常；放大方式與比例未取得，不當作原生 200% 證據。旁白因使用者表示操作卡頓而暫緩，非已通過。

這些回報均早於 Phase 2，不能延用為新移動版本通過。新版需在 iPhone 確認點地面、拖曳、邊界、操作按鈕／設定、暫停與返回安全區、App 切換、禁止手勢縮放與操作區捲動。真實 GPU／FPS、平板／Firefox／其他 Safari、文字原生 200%、報讀器及專業內容審查仍未完成。Phase 3 NPC 需使用者另行指定，不自動開始。
