# 小安人物精緻化：和藹可愛造型

日期：2026-10-11；本機 Windows，分支 main-uv12jr。使用者要求「下一步幫我精緻化人物，用和藹可愛的人物」。延續 S4 外觀切片，不進 Phase 5；本次沒有 commit／push／發布。

## 完成

小安改成柔和的自製 3D 角色：圓潤臉型、棕色眼睛與靜態高光、小鼻子、小微笑、淡腮紅、耳朵、棕色短髮及柔和髮束。服裝採薄荷色上衣、米白領口、葉片小裝飾、藍灰長褲與圓潤白鞋；手掌及拇指增加細節。

五官、耳朵與頭髮共用原 head pivot；手與拇指共用原 arm pivot。保留既有抬手、點頭、動作關閉、系統減少動態、單一 RAF、暫停／恢復／安全區重設；不增加自動眨眼、視線追蹤、巡邏或聲音。個人空間半徑與接近判斷保持原設定。

本次人物外觀依使用者要求採圓潤、親切的風格，並非照片級人物素材；這不把公園環境的寫實方向改為卡通。全為現有 Three.js 幾何與 PBR 材質，沒有外部人物素材、圖片下載、新套件或設定檔。木椅材質仍位於原 materials[4]，既有貼圖與 LUT 所有權契約保留。材質數增加為 9，原釋放測試改為檢查全部材質皆各釋放一次。

人物連同長椅的靜態盤點：63 meshes、9632 三角形、9 材質；以 Node strip-types 直接建立模型並遍歷幾何取得，exit 0。這不是整個公園的 draw calls，也不是 iPhone FPS。

## 驗證

Node 22.21.0、npm 10.9.4。`npm run typecheck`、`npm run lint`、`npm run format:check`、`npm test`、`npm run build` 各 exit 0；8 檔 70 項單元測試通過。正式 dist JS 588.97kB／gzip150.46kB，既有 >500kB 警告仍存在。

本機 Chrome 154.0.8037.99、Playwright 1.62.1、SwiftShader：

- phase4-browser.mjs：23/23、exit 0。兩種回應、求助、暫停、返回安全區、重建、注音／圖示、短畫面選項與安全按鈕可操作。
- s5-runtime-browser.mjs（local-dist runner）：15/15、exit 0。包含 context loss、不可用 WebGL、640×360／320×568／320×360 的 32px root 文字面板操作。
- npc-friendly-preview.mjs：exit 0，pageerror=[]。保存手機正面、打招呼、點頭與桌面截圖；已人工檢視正面與動作畫面，確認五官保持完整、人物在對話卡上方可見。

證據在 npc-friendly-evidence/。重跑 PowerShell：

```powershell
$env:PLAYWRIGHT_MODULE_DIR='C:/Users/fresh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$env:CHROMIUM_EXECUTABLE_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
node docs/dev-flow/npc-friendly-preview.mjs
node docs/dev-flow/phase4-browser.mjs docs/dev-flow/npc-friendly-evidence/dialogue
node docs/dev-flow/s5-local-dist-runner.mjs docs/dev-flow/s5-runtime-browser.mjs http://s5.local/ docs/dev-flow/npc-friendly-evidence/safety
```

## 外觀迭代與待驗證

初版截圖後再精修髮束、膚色、腮紅、臀膝連接與鞋底，減少原工程幾何的生硬輪廓；最終版重新跑五項與瀏覽器回歸。這些截圖是本機 Chrome 軟體 WebGL，不代表 iPhone／Safari／VoiceOver／真實 GPU 已通過。人物是否符合使用者的「和藹可愛」偏好與專業內容審查仍需確認。

本機預覽 http://127.0.0.1:5173/。公開 GitHub Pages 尚未更新。下一步先檢視小安外觀及新版 iPhone 操作；語音仍另做，完整 S5 未完成。
