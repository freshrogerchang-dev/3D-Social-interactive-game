# Phase 3：固定坐姿 NPC 工程版

日期：2026-10-10，基準 main-uv12jr／967126b。使用者對 Phase 2 手機複測回覆「都正常 請繼續」，接續 NPC 工程版本。完整 S5、專業內容及外觀審查仍未完成，不自動進 Phase 4。

## 範圍與契約

依 03 §3.1 的設計不變條件，只建立固定坐在長椅上的「小安」。原始路線圖的三位 NPC、巡邏、面向玩家、計時與互動冷卻不適用。角色不追人、不轉頭、不要求眼神接觸、不自動開口；沒有新增 RAF、動畫或排程。

SeatedNPC 擁有 22 個幾何部件及 5 個材質，包含長椅和坐姿人形。顏色 HSL 飽和度 ≤0.3，無外部素材、套件或設定變更。這是簡化工程人形，不是 Q6 的最終寫實模型；寫實素材選定、授權及專業外觀審查仍待完成。

小安固定在 (0,0,-2)。水平距離 ≤2.8m 顯示「小安坐在這裡。」，離開至 >3.2m 回到「小安在長椅上。」；不偵測鏡頭朝向，不開對話，沒有 aria-live 自動播報。暫停時提示隱藏；展開操作設定時讓出短畫面空間，canvas 的可及名稱仍含角色位置。

1.2m 半徑個人空間阻擋玩家穿越長椅及人形。遇阻立即清除目標和速度；不提供自動繞路，可先側移再繞過。既有低速移動、單指導覽、暫停／返回及結束／重新開始保留。

ParkScene 納入 NPC 的釋放責任；全部 NPC PBR 材質也套用既有場景自有 DFG LUT，避免新增材質重新保留共用貼圖的 context listener。dispose 可重複呼叫，逐一釋放自有幾何及材質，不釋放 three 共用來源貼圖。

## 最終工程驗證

Node 22.22.0／npm 10.9.4；既有 playwright-core 1.57.0／Chromium 151.0.7922.173／SwiftShader。瀏覽器以 route 讀本地檔，不啟動伺服器。所有下列命令 exit 0：

| 命令 | 結果與證據 |
|---|---|
| npm run typecheck、lint、format:check、test、build | 五項各 exit 0；6 檔 57 項單元通過；phase3-evidence/five-checks.txt |
| node docs/dev-flow/phase3-browser.mjs | 14/14；phase3-evidence/integration.json |
| node docs/dev-flow/phase2-production-browser.mjs docs/dev-flow/phase3-evidence/production | 7/7；production/result.json |
| node docs/dev-flow/s5-local-dist-runner.mjs docs/dev-flow/s4-screenshots/browser-check.mjs http://s5.local/ docs/dev-flow/phase3-evidence/safety-22 | 22/22；safety-22 截圖 |
| node docs/dev-flow/s5-local-dist-runner.mjs docs/dev-flow/s5-runtime-browser.mjs http://s5.local/ docs/dev-flow/phase3-evidence/safety-15 | 15/15；safety-15 截圖 |
| node docs/dev-flow/s5-extended-browser.mjs http://s5.local/ docs/dev-flow/phase3-evidence/resources --local --expect-released | 11/11；資源及可及名稱結果見 resources/browser-result.json |

NPC 原始碼整合僅在測試路由即時轉譯時暴露相機及 NPC，正式產品無探針。碰撞檢查使用公開 controller.update 的模擬步進，不是 GPU FPS 測試；另外 7 項使用真正 production dist 的操作與畫面比較。模型畫面已人工查看 phone-npc.png。

Build JS 558.68kB／gzip 140.59kB，既有 >500kB 警告保留。git diff --check exit 0。

## 過程問題及修正

- 工作階段的 /tmp Node 22 已消失，初次檢查實際落到 Node 24.19.0；這些不標成 Node 22 通過。從官方下載並驗證 SHA256 9aa8e9d2298ab68c600bd6fb86a6c13bce11a4eca1ba9b39d79fa021755d7c37，恢復 /tmp/node-v22.22.0-linux-x64，正式五項加版本斷言後重跑。
- 繞過測試最初斜線穿過阻擋區，56/57；改為先側移、再走到長椅旁，沒有放寬碰撞門檻。
- dispose 測試的 Mesh 泛型 geometry 引出 unsafe lint；在測試局部明確縮窄 BufferGeometry，保留規則。最終 57/57。

## 未驗證與下一步

Phase 2 手機四項操作正常屬使用者回報，未重新確認瀏覽器版本／載入 SHA，不能延用為 NPC 實機通過。新版本需測靠近、側移繞過、離開不被追逐、暫停／返回、結束／重新開始。真實 GPU、原生文字 200%、報讀器、跨瀏覽器、FPS、長時間資源與專業審查仍未完成。暫緩旁白不等於報讀器通過。下一階段對話需另行指定。

20 次重建後 detached CANVAS=0，結束時 canvas 與 pending RAF=0，最大同時 RAF=1；第 5–20 次強制 GC 後 listener 未持續增加。Headless 切頁沒有產生 hidden，標為未驗證，不算真實系統切頁通過。
