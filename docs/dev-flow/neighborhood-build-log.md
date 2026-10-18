# 原公園連續延伸街區

日期：2026-10-17–18（台灣）。基準 b2789c8，分支 main-uv12jr。

## 範圍與設計

使用者要求新生活對話延續原公園，同一張可走的地圖，不獨立開場景。原七位公園對話、人物設定與背景活動保留；公園東側步道連接街區人行道，斑馬線對面有餐館、公共廁所、親友見面處與公告牌，公園側設休息角。

只參考開放世界的連續空間、地圖導航、靠近地點互動概念，沒有使用 GTA 素材。這是小街區工程原型，不是大型開放世界或交通模擬。

- 同一 ParkScene／相機／canvas／RAF；Neighborhood 擁有新增模型及資源，ParkScene 統一安排材質環境與人物更新。
- 地圖選地點只指引，須自己走近。沒有傳送或遠端選單啟動；結束留在當地，安全區回到原公園。
- 路口先停、牽手、確認號誌及停讓，才開放斑馬線；真的抵達對岸才開放下一步。兩岸均可開始；車輛靜止，同行人物只做位置跟隨，不是骨架手掌接觸動畫。
- 餐館有桌、椅、櫃檯、牆與碰撞；主動選擇用餐才坐下，離開該節點恢復站立。餐館想上廁所後，沿街區找入口，抵達才開放確認。廁所只呈現外觀與門，不呈現私密如廁。
- 休息角、見面處、公告牌承接感官需求、身體界線及計畫改變。維修、雲、賣完標示是靜態示意，不增加閃爍、雨聲或背景音。
- 世界互動卡保留眼前3D場景，步行節點縮小卡片，搖桿及單次移動可用。幫助、地圖、暫停都停止輸入；恢復不補跑。安全控制仍是獨立DOM。
- 共用幾何、分材質 InstancedMesh、明確釋放資源。未新增套件或設定檔、未啟動伺服器，無API／追蹤／持久化。

## 工程驗證

Node v22.22.0、npm10.9.4（重啟後 /workspace/shared/node-v22.22.0-linux-x64/bin），沿用既有 node_modules，未安裝套件。

| 命令 | exit | 結果 |
|---|---|---|
| npm run typecheck | 0 | strict TypeScript |
| npm run lint | 0 | ESLint |
| npm run format:check | 0 | Prettier |
| npm run test | 0 | 15檔145項 |
| npm run build | 0 | JS692.03kB／gzip183.76kB；CSS11.05kB／gzip2.86kB |

既有 >500kB chunk 警告仍在，不宣稱效能通過。新增6項街區測試涵蓋步道與設施可達、牆桌及道路阻擋、兩岸辨識、到達確認、座位姿態恢復、幫助／地圖／暫停輸入鎖定、安全區重設與資源只釋放一次。

## 瀏覽器與發布

原完整路線曾於前一工作階段得到21/21、exit0；新增短畫面步行檢查及視角／提示調整後的重跑遭環境重啟中斷，未將中斷結果列為通過。重啟後以相同 Node22.22.0 再跑五項工程，各exit0；最終本機結果如下；發布另補。

瀏覽器使用預裝 Playwright-core1.57.0、Chromium154.0.8037.57／SwiftShader。最終本機路線與回歸使用deviceScaleFactor=0.5，CSS viewport維持390×844，另測320×360及844×390；目的是減少軟體渲染負擔，不是iPhone實機或效能證據。低環境細節、減少動態、語音關閉；真實語音試聽仍未驗證。

重現方式（從repo根目錄，先完成build）：

```sh
export PLAYWRIGHT_MODULE_DIR=/opt/codex/cua_node/lib/node_modules
export CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
WORLD_DPR=0.5 node docs/dev-flow/neighborhood-browser.mjs /tmp/neighborhood-check
node docs/dev-flow/neighborhood-evidence/scaled-runner.mjs docs/dev-flow/phase4-browser.mjs /tmp/neighborhood-greeting
node docs/dev-flow/neighborhood-evidence/scaled-runner.mjs docs/dev-flow/s5-local-dist-runner.mjs docs/dev-flow/s5-runtime-browser.mjs http://neighborhood.local/ /tmp/neighborhood-safety
```

全程用Playwright route提供正式dist，未啟動伺服器。路線檢查只用可見按鈕／鍵盤與地圖位置點，不注入相機或引擎；語音關閉與移動速度皆經設定介面調整。舊生活練習／support瀏覽器腳本針對已替換的全域選單，本次不當作新版入口檢查；由neighborhood-browser承接六地點實際步行。

Pages子路徑建置（exit0）：`vite build --base=/3D-Social-interactive-game/ --outDir /tmp/neighborhood-pages`。JS692.14kB／gzip183.78kB，既有chunk警告及輸出在repo外不自動清空的提示皆保留；未加emptyOutDir。公開資源將與這份建置逐位元比對。

## 尚未驗證

新版 iPhone／Safari／VoiceOver、真實GPU效能、記憶體／FPS／載入時間、語音實際試聽、注音及所有情境的專業審查仍待完成。既有手機正常回報不外推為新增街區已驗證。不宣稱療效、兒童使用核准或完整 S5 通過。


## 最終本機結果（2026-10-18）

- 完整街區路線23/23、exit0：從原公園實際沿東側步道走到路口；受控過街到對面、餐館坐下、說想上廁所後沿人行道走到入口、見面處、公告牌、由另一岸再過街、休息角及安全退出。保存同一canvas元素並確認未替換，地圖選點不傳送、步行未到達不能確認；幫助／暫停與短畫面檢查通過。見 neighborhood-evidence/local/result.json、world.log 及三張實際畫面。
- 原打招呼回歸24/24、exit0，見greeting/result.json；WebGL真實context loss／DOM安全控制／放大文字與重建回歸15/15、exit0，見safety.log與截圖。這些檢查不是實機VoiceOver、原生文字縮放或量化效能驗收。
- 最後只補地圖標題、說明、目的地與指引注音（含「見面處」處讀ㄔㄨˋ），加上捲動時預留安全列；沒有改步行、引擎、對話流程或模型。lint抓到HTMLElement.textContent不需要額外空值判斷，已刪除。其後五項工程檢查重新各exit0、145單元，並對最終Pages產物另跑地圖8/8、exit0（DPR1）：390×844、320×360、844×390，所有地圖按鈕≥64px且可捲動命中、注音與報讀名稱、原場景、安全控制均通過。見map-final/result.json與截圖。
- 最後工程／建置原始輸出見checks.json、neighborhood-*.log與pages-build.log。前述完整路線／24／15於最後地圖注音與捲動留白前執行，不寫成在最後DOM版本重跑完整路線；最終地圖差異由8項檢查驗證。
- 原生活／support示意圖保留作舊版資產與歷史測試參考，主要入口已改為街區地圖；新的世界互動不展示獨立SVG情境卡。

已沿用使用者commit／push與Pages發布授權，推送main-uv12jr；沒有開PR或推main。


## 公開發布結果（2026-10-18）

- 產品提交：53782ebdb6e959f781390411f5a02a5a9c6bd890。
- GitHub Actions：https://github.com/freshrogerchang-dev/3D-Social-interactive-game/actions/runs/39083600902 ，build、deploy均success；GET jobs API已核對，摘要見deployment.json。
- 網址：https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ 。
- 實際公開網站10/10、exit0：HTTP200且同一個canvas、JS／CSS逐位元符合本機Pages base產物、六個地點、人工注音與乾淨的報讀名稱、320×360和844×390所有地圖按鈕≥64px且可捲動命中、選目的地不傳送／不另開對話、暫停／安全區，pageerror=[]。見published/result.json、published.log與公開截圖。公開檢查DPR1，並非iPhone實機。

命令（Pages預期產物先建置於/tmp/neighborhood-pages）：

```sh
node docs/dev-flow/neighborhood-public-browser.mjs https://freshrogerchang-dev.github.io/3D-Social-interactive-game/ /tmp/neighborhood-public /tmp/neighborhood-pages
```

本次公開結果之後僅提交文件及證據；應用程式與建置來源不變。後續文件push會依原workflow再次發布相同產品內容。下一步是新版iPhone操作／效能回報及內容專業審查，不自動開始下一階段。
