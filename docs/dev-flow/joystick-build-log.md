# 同心圓全方向搖桿

2026-10-11，基準 main-uv12jr／34c46d4。使用者澄清圓盤指同心圓，按任意位置都往該方向移動；上一版五個方向按鈕不符合意圖。本輪改為全方向虛擬搖桿，不進 Phase 4。

## 操作

左下 192px 外圈、128px 內圈、64px 中央旋鈕，底色半透明，不用模糊／動畫。按住或拖向圓盤任何角度，依鏡頭水平座標移動（前後、左右平移及斜向）；旋鈕位移最多 56px。12px 中心停止區，回中心立即清速度。方向向量正規化，沿用設定移動速度，斜向不加速、不旋轉鏡頭。轉向仍用場景拖曳，或設定內「向左看／向右看」。

放開即停止並回中心。Pointer capture 讓拖出圓盤仍可操作，放開／pointercancel／lostpointercapture／失焦／多指／暫停／展開設定都清輸入，不沿用舊方向。控制器的既有單一 RAF 處理持續移動；新事件由控制器持有並在 dispose 解除。原七個 64px 單次操作按鈕全部回到設定，無須長按／精準手勢的替代路徑保留。

## 工程驗證

Node 22.22.0／npm 10.9.4，既有 playwright-core 1.57.0、Chromium 151.0.7922.173／SwiftShader；本地以 route 讀檔，不開伺服器。命令與結果：

- npm run typecheck／lint／format:check／test／build：各 exit 0、6 檔 57 項單元通過。joystick-evidence/checks-final.txt。
- node docs/dev-flow/joystick-browser.mjs：18/18、exit 0。原始碼路由即時轉譯並僅在測試路由暴露 camera／controller；測八方向位置、等速、中心停止、圓外 capture、放開及取消、暫停恢復與七個替代按鈕。模擬 update 步進不代表實機 FPS。joystick-evidence/integration.json。
- node docs/dev-flow/joystick-production-browser.mjs：10/10、exit 0。真正 production dist，無相機探針；CDP touchStart／touchMove／touchEnd 操作斜向、圓外拖曳、放開、多指、按住時暫停恢復、320×360／390×844 圓面命中及替代操作。joystick-evidence/production/result.json。

畫面已查看 phone-joystick.png，符合半透明同心圓。JS 560.72kB／gzip 141.01kB，既有 >500kB 警告保留。git diff --check exit 0。

暫存 Node 22 隨工作階段清掉；從官方恢復原版本，SHA256 9aa8e9d2298ab68c600bd6fb86a6c13bce11a4eca1ba9b39d79fa021755d7c37。初次 lint 兩個 numeric template literal 錯誤，改明確 String 轉換，未停用規則。原始失敗紀錄 checks.txt、正式通過 checks-final.txt。

實機 iPhone 觸控、報讀器、原生文字 200%、真實 GPU／效能仍未驗證。瀏覽器觸控與 SwiftShader 證據不等於 iPhone 通過。無新套件、版本或設定變更。

資源檢查 node docs/dev-flow/s5-extended-browser.mjs http://s5.local/ docs/dev-flow/joystick-evidence/resources --local --expect-released：11/11、exit 0。20 次重建 detached CANVAS=0，結束時 canvas／pending RAF=0，listener 第 5–20 次不持續增加。Headless 切頁未產生 hidden，保留未驗證。證據 resources/browser-result.json。
