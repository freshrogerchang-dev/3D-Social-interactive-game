# 公園環境擬真第一版

日期：2026-10-11，基準 main-uv12jr／47e34d2。使用者同意先做公園環境擬真與手機效能檢查；本輪改善場景，不進 Phase 4 對話，也不更換小安工程人形。

## 場景與素材

新增實拍草地與混凝土步道材質、交叉步道及低矮邊緣、木條與扶手長椅、12 株樹木及靜態接觸陰影。樹幹與分枝共享幾何，葉片使用 instancing；樹木在 ±8m 玩家區域外，不加新穿越障礙。保留地面點按平面、NPC 個人空間與安全姿態。

10 張 1024×1024 JPG 合計 8,362,436 bytes（8.36 MB 十進位），來源 Poly Haven CC0 1.0：

| 素材 | 作者 | 用途 |
|---|---|---|
| Grass Ground | Charlotte Baglioni | 草地色彩／法線 |
| Concrete Pavement | Charlotte Baglioni | 步道色彩／法線 |
| Wood Planks | Amal Kumar | 長椅木紋／法線 |
| Bark Willow | Dario Barresi／Dimitrios Savva | 樹幹色彩／法線 |
| Tree Small 02 的 leaves_diff／leaves_alpha | Rico Cilliers | 葉片色彩及裁切；只用左側 UV，沒有下載或使用原模型 |

原始下載 MD5 與 API metadata 核對，另外記錄 SHA256、下載 URL、作者與修改於 public/assets/park/manifest.json。完整 CC0 文字與來源隨網站提供，THIRD_PARTY_NOTICES.txt 已更新。執行時只載入本網站素材，無第三方請求或遙測。

候選完整樹木模型即使貼圖 1k，總量仍約 46–958 MB，超出本輪手機預算；沒有下載這些模型。改用本專案幾何配合 CC0 葉片／樹皮，優先控制下載與批次。這是擬真第一版，不宣稱照片級公園或最終寫實人物。

光照維持 PBR／sRGB／ACES，提升柔和日光亮度。表面材質 shader 在 map 與 vertex color 後限制 HSL 飽和度 ≤0.6；不是畫面後製。沒有風吹、粒子、模糊、鏡頭晃動或即時 shadow map。接觸陰影是自有 64×64 程式貼圖與靜止平面；遠景霧為材質距離混色，不使用景深模糊。

## 效能與載入

- 標準 7,800 片葉片，設定「較少葉片」改為 3,000，保留全部樹的位置與人物，不自動變更畫質。此選項是工程預設，非已經專業審查的感官設定。
- 可選開啟 FPS 數字，收合設定後仍能看數字並操作搖桿；只用引擎原有 RAF、performance.now 的真實時間，不用被 0.05s 上限截斷的模擬 delta。暫停停止取樣／隱藏，恢復重設基準。沒有蒐集、儲存或傳送數字。
- 十張素材非阻塞載入；安全 UI 與場景不等網路。缺檔移除對應貼圖並保留底色，晚到 callback 不修改已 dispose 的環境。所有 geometry、material、texture、instance buffer 均有所有者且重複 dispose 安全。
- 所有新 PBR 材質套用既有場景自有 DFG LUT，避免回到共享貼圖 context listener 的問題。沒有新套件、版本或設定檔；BASE_URL 使用 Vite 的 Pages 子路徑。

壓縮 JPG 大小不是 GPU 記憶體。10 張 1k 貼圖若全部 RGBA＋完整 mipmap，僅理論像素約 53.3 MiB，另有 DFG LUT／幾何／framebuffer 等；不是實測 VRAM。瀏覽器沒有可靠完整 VRAM 指標，本輪標未直接驗證。

## 驗證

Node 22.22.0／npm 10.9.4；playwright-core 1.57.0／Chromium 151.0.7922.173／SwiftShader。以 route 讀本地檔，不啟動伺服器。

- npm run typecheck、lint、format:check、test、build：各 exit 0；6 檔 59 項單元通過。新增 FPS 真實時間／暫停取樣測試，以及 instance buffer 釋放與葉片數切換。證據 park-evidence/five-checks.txt。
- node docs/dev-flow/park-browser.mjs：9/9、exit 0；原始碼路由即時轉譯，只有測試路由暴露 park／renderer。十張素材載入、批次與三角形、品質切換、FPS 開關、暫停畫面、結束及重建。證據 integration/integration.json。
- node docs/dev-flow/park-production-browser.mjs：10/10、exit 0；真正 dist、無相機探針。CDP 觸控搖桿、放開／多指／暫停恢復、短畫面命中與替代操作。手機／桌面截圖已查看。證據 production/result.json。
- node docs/dev-flow/park-fallback-browser.mjs：6/6、exit 0；十張素材 404 與十張延遲至結束後才回傳，均可安全退出、不重新建立場景或拋未處理例外。證據 fallback/result.json。
- node docs/dev-flow/s5-local-dist-runner.mjs docs/dev-flow/s5-runtime-browser.mjs http://s5.local/ docs/dev-flow/park-evidence/safety：15/15、exit 0；WebGL／context lost 安全流程、短畫面放大文字。

工程快照不是手機效能驗收：初始可見場景約 44 批次、22,396 三角形；renderer.info 只列該幀指標。SwiftShader 的 FPS 數字只驗證顯示功能，不代表 iPhone；未做標準 10s 暖機後 60s×3 次的實機測量。先前顏色微調前的缺檔／安全／資源證據若引用，會明列與本次只改 surface 飽和度／UI 位置的差異。

## 過程修正

- 加入設定 change listener 後，舊 main 的測試根元素只是空物件，9 項測試失敗。補上 EventTarget 與新增 DOM id 的 null 替身；沒有把實際 DOM 契約改成 optional，也沒有停用測試。最後 59 項通過。
- 初版樹木偏暗，調整葉片材質 tint 與日光。沒有使用曝光閃動、動畫或動態效果。
- 材質圖已載入不等於 GPU 上傳完成；資源快照改成等待 renderer.info 有貼圖，再讀該幀計數。

## 手機下一步

請 iPhone 12 開公開頁面、重新整理，待材質出現後在設定開啟 FPS、收合設定。先暖機約 10 秒，在固定位置看約 60 秒並移動／轉向，記錄大致 FPS 範圍與是否卡頓；再比較「較少葉片」。如果要正式驗收，兩種畫質各依 01 §8 做 60s×3 次，記 OS／Chrome 版本、電源／溫度與載入版本。

實機 FPS、冷／暖快取載入時間、真實 GPU、原生文字 200%、報讀器、跨瀏覽器、專業內容及外觀審查仍未完成。完整 S5 尚未通過；工程公園不等於兒童使用核准。下一步依手機結果決定畫質／素材調整，再由使用者指定是否進對話。

資源檢查 node docs/dev-flow/s5-extended-browser.mjs http://s5.local/ docs/dev-flow/park-evidence/resources --local --expect-released：11/11、exit 0。20 次重建後 detached CANVAS=0，結束時 canvas／pending RAF=0，最大同時 RAF=1；第 5–20 次 listener 未持續增加。Headless 切頁未產生 hidden，不算系統切頁通過。此檢查在最後僅改表面降飽和位置、邊界色及 FPS DOM 位置前開始，完整資源所有權／載入／dispose／事件程式之後未變，最後五項與公園整合／production 重跑。

最後版本 GPU 上傳後快照：44 批次、22,396 三角形、12 個 renderer texture、44 個 geometry。Build JS 576.40kB／gzip 145.82kB；>500kB 既有警告保留。最後公園 9/9 與 production 10/10 已重跑，exit 0。
