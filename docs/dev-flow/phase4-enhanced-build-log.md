# Phase 4 補充：注音、選項圖示與人物動作

日期：2026-10-11。本機 Windows；repo 位於 `C:/Users/fresh/projects/3D-Social-interactive-game`，分支 `main-uv12jr`。使用者選定「補完 Phase 4：注音、選項圖示、人物動作，語音另做」。本次不 commit／push／發布，不進 Phase 5。

## 完成內容

- 對話標題、啟動按鈕、所有台詞／提示／選項／幫助採逐字 ruby 人工注音，讀音表在 `src/ui/GreetingPresentation.ts`。長椅的「長」、重新的「重」、輕聲「了／麼」依本情境標註；採字典讀音，不作自動注音或語流變調。原安全控制、移動設定及其餘介面不在此注音切片內。
- 每個選項提供自製 SVG 圖示，中文標籤保留；圖示與 rt 對報讀器隱藏，按鈕 aria-label 保持原中文。這只驗證 DOM 名稱，不代表 VoiceOver 實機通過。
- 開始招呼時小安抬手一次；「說你好／點頭」兩種回應後，小安均以同一單次點頭回應。不操作玩家頭部、鏡頭或玩家身體，也不要求眼神接觸。角色仍是工程人形。
- 動作 1.6 秒內完成並回中立；沿用引擎單一 RAF、模擬 delta，不建立新排程。暫停凍結、恢復首幀 delta=0；返回安全區／退出／重練重設姿態。銷毀清除 pivot 引用並釋放原有幾何／材質。
- 原設定中新增「人物動作」開關；系統 prefers-reduced-motion 優先。取消開關或系統切為減少動態立即重設；重新開啟不自動重播，等待下一次明確互動。
- 對話卡改放底部，最高 42dvh，保留人物與公園視野；長內容可在卡片內捲動，頂部安全按鈕獨立可操作。

## 驗證

Node 22.21.0、npm 10.9.4；本機 Chrome 154.0.8037.99、bundled Playwright 1.62.1，使用 SwiftShader。五項命令 `npm run typecheck`、`npm run lint`、`npm run format:check`、`npm test`、`npm run build` 各 exit 0。8 檔 70 項單元通過，包含注音覆蓋／多音字、動作回中立／取消／dispose、RAF 暫停與恢復零 delta。建置 JS 586.14kB／gzip 149.72kB，既有 >500kB 警告保留。

正式 dist 回歸：`phase4-browser.mjs` 23/23、exit 0；`s5-local-dist-runner.mjs` 搭配 `s5-runtime-browser.mjs` 15/15、exit 0。涵蓋兩種回應對等、求助焦點、暫停恢復、退出重建、注音／圖示 DOM 名稱、設定開關、系統減少動態媒體訊號、320×360／844×390 操作與 WebGL 安全控制。媒體訊號檢查與單元測試並用，不把媒體訊號檢查宣稱為真實人物動畫外觀驗收。

重跑（PowerShell）：

```powershell
$env:PLAYWRIGHT_MODULE_DIR='C:/Users/fresh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$env:CHROMIUM_EXECUTABLE_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
node docs/dev-flow/phase4-browser.mjs docs/dev-flow/phase4-enhanced-evidence/browser
node docs/dev-flow/s5-local-dist-runner.mjs docs/dev-flow/s5-runtime-browser.mjs http://s5.local/ docs/dev-flow/phase4-enhanced-evidence/safety
```

證據保存在 `phase4-enhanced-evidence/`，互動結果 JSON 與手機尺寸截圖、WebGL／放大文字截圖均為本機結果，沒有公開部署。

## 發現與修正

初次 lint 指出 textContent 不必要 optional chain；已修正。初次 main 測試替身欠缺 DOM／matchMedia 能力；最終只增加必要的 matchMedia 替身，原 9 項生命週期測試保留且通過。Windows core.autocrlf checkout 的 22 個檔案造成 Prettier 換行警告；正規化 LF，未修改依賴／設定內容，Git diff 不含這些純換行差異。

初次瀏覽器在 dist 尚未完成時執行，page.goto 失敗；最終改為 build 成功後跑正式 dist。注音曾延伸到安全按鈕，導致 320×360、32px root 文字時工具列高 284px，面板按鈕無法完整到達；將此延伸撤回，安全控制保留原佈局，15 項安全回歸全通過。原中央對話卡遮住人物，改為底部捲動卡；手機截圖已人工檢視。

## 待辦與停止點

語音另做；未呼叫 Gemini、未新增金鑰／套件／設定檔。Q3 完整語音版、iPhone 新版注音與動作、VoiceOver、真實 GPU 效能、專業內容與注音審查仍未完成。完整 S5 未通過，Phase 5 未開始。

本機預覽 `npm run dev -- --host 127.0.0.1`。下一步先在 iPhone 檢查注音可讀性、兩種回應、人物動作關閉、幫助後暫停恢復、返回安全區；如要製作語音，另行指定 Phase 4 語音切片。
