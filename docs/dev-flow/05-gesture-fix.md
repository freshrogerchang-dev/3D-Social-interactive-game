# S5 手機手勢縮放限制

2026-10-10。使用者回報 iPhone Safari 四項操作與橫直向正常，並要求「畫面可以固定嗎？禁止拉進拉遠」。這是既有骨架的操作調整，未開發 Phase 2。

## 修改

3D 相機本來固定，無 OrbitControls、觸控 zoom 或滾輪控制。拉近拉遠推測為頁面手勢縮放，未取得使用者手勢錄影確認。src/styles.css 的 .app 設 touch-action: pan-y，.stage 設 touch-action: none；後代按鈕原本為 manipulation，與祖先手勢規則交集後不能啟用 pinch-zoom。休息面板保留垂直捲動；不加全域 touchmove preventDefault，也不設 maximum-scale／user-scalable=no。瀏覽器文字大小、桌面快捷鍵縮放及系統放大功能不在此限制範圍。

## 驗證與限制

Node 22.22.0，typecheck、lint、format:check、test（45 項）、build 全部 exit 0；已知 JS >500 kB 警告保留。

預裝 playwright-core 1.57.0、Chromium 151.0.7922.173／SwiftShader，以本地 dist route、不啟動伺服器。s5-gesture-browser.mjs 的觸控繼續、320×360／root font 32px 的面板垂直捲動、結束後重新開始均通過。root font 模擬不是原生文字 200% 實測。

雙指診斷整體 exit 1（6/7）：解除 CSS 限制的對照頁也未放大。曾嘗試 Input.synthesizePinchGesture、設定 maxTouchPoints=2、改為兩指 dispatchTouchEvent 序列，對照仍無效。因此修正版 scale=1 只能記為觀察，不能當作防縮放成功的證據；沒有降低測試門檻。保留失敗對照及完整診斷結果，方便其他環境查核。

```bash
PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH PLAYWRIGHT_MODULE_DIR=/opt/codex/runtimes/cua/lib/node_modules CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node docs/dev-flow/s5-gesture-browser.mjs
```

[原始結果](s5-gesture-evidence/result.json)。換環境請指向既有 Playwright／Chromium 路徑。

需使用者在更新後的 iPhone Safari 與 Chrome 確認：場景、按鈕與休息面板上的雙指拉近拉遠不改變畫面比例；短畫面面板仍可上下捲動，所有安全按鈕可按。iOS 若有忽略或覆寫 CSS 的瀏覽器行為，需依實機結果修正，不能承諾禁止所有系統放大方式。使用者本次「都正常」針對修改前的四項測試，不當作新版手勢驗收。
