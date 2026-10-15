# 人物改為模擬市民式寫實人物（MakeHuman CC0）建置紀錄（2026-10-15）

分支 `main-uv12jr`，基準 `7775df7`（公園多人物對話）。由 Claude Code 雲端工作階段執行。

## 1. 使用者要求

「重新檢視人物，我想做成像『模擬市民』一樣的人物」。

解讀：寫實比例、自然的臉、有衣服和髮型、會做自然動作的人物。**不使用 EA《模擬市民》的任何素材或角色**；人物是從開放授權資料產生的原創角色，只參考「寫實但柔和」的整體風格。

## 2. 素材來源與授權

- 這個雲端環境的網路只能連到 GitHub 與 npm registry；Poly Haven、Quaternius、Kenney、Sketchfab、Mixamo 等模型網站都連不到（HTTP 000）。
- 改用 **MakeHuman**（https://github.com/makehumancommunity/makehuman，commit `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`）。`LICENSE.ASSETS.md` 寫明資產為 **CC0 1.0**；使用其中的基礎網格、體型參數（macrodetails、臉部、胸部 targets）、骨架與權重、low-poly 眼睛模型與眼睛貼圖。
- MakeHuman 的衣服、頭髮素材庫（makehuman-assets）需要 Git LFS 或登入，無法取得；所以衣服、頭髮、眉毛、嘴唇由本專案的程式產生。
- 模型與授權紀錄：`public/assets/characters/`（4 個 GLB、`manifest.json` 含來源 commit 與 SHA-256、`CC0-1.0.txt`）；`public/THIRD_PARTY_NOTICES.txt` 已加入說明。

## 3. 產生工具 `tools/characters/build_characters.py`

只用 Python 3 與 numpy（離線執行，不在 App 中執行）：

1. 套用 MakeHuman 的年齡、性別、體型、亞洲人種參數（照 MakeHuman `apps/human.py` 的年齡權重公式）。小孩另加微笑嘴角、較大眼睛、較圓臉頰、較稚嫩臉型；媽媽加微笑與較小胸部參數。
2. 骨架簡化為 36 根（脊椎、頸、頭、手臂、腿），手指、腳趾、臉部骨頭的權重併到最近的上層骨頭。
3. 衣服、頭髮是疊在完整皮膚外的殼：以高度與沿手臂的位置分區（上衣到臀部、短袖到上臂中段、褲子到腳踝、鞋子），邊緣沿邊界平滑；衣服底下看不到的身體先抹平（小孩 Taubin 平滑、成人軀幹另做圓柱方向的模糊），再以鄰近幾圈平均的法線計算光影，避免胸點、肚臍透出。
4. 頭髮由頭頂區域產生（短髮、鮑伯、齊肩三種），排除耳朵；頭皮染成髮色。眉毛、嘴唇、淡腮紅用頂點顏色。
5. 輸出 glTF 2.0（.glb）：權重與骨頭索引以 byte 儲存。四個檔案合計約 6.5 MB。

| 人物 | 設定 | 身高 | 檔案 |
|---|---|---|---|
| 小安 | 男孩 7 歲，短髮，湖水綠上衣、藍褲 | 1.12 m | 1.70 MB |
| 小宇 | 男孩 8 歲，短髮，黃色上衣、藍褲 | 1.20 m | 1.70 MB |
| 小晴 | 女孩 7 歲，鮑伯頭，粉色上衣、綠褲 | 1.05 m | 1.70 MB |
| 媽媽 | 成人女性 36 歲，齊肩短髮，綠色上衣、深色長裙 | 1.54 m | 1.67 MB |

可重現：以專案內的工具重新產生，四個檔案的 SHA-256 與 manifest 完全相同。

## 4. 遊戲端

- `src/npc/HumanModel.ts`（新增）：骨頭查詢（GLTFLoader 會把 `shoulder01.L` 改名為 `shoulder01L`，以綁定姿勢的模型座標判斷左右）與模型資源釋放。
- `src/npc/SeatedNPC.ts`：`attachModel()` 換上模型、隱藏自製人形（長椅、球保留）；擺出姿勢：手臂放下、小安坐在長椅、小宇雙手拿球；揮手與點頭改由骨頭驅動，時間與原本相同，暫停不更新、結束或停用動作時回到靜止姿勢。釋放人物時一併釋放模型。
- `src/scene/ParkScene.ts`：非阻塞載入四個模型；載入前或失敗時保留原本的自製人形；場景已釋放才載到的模型直接釋放。模型材質沿用飽和度上限（≤ 0.6）與每場景自有的 PBR LUT。

## 5. 驗證

環境：Node v22.22.0、npm 10.9.4；依賴與鎖檔不變。Chromium 141 headless＋SwiftShader（軟體 WebGL）。

| 檢查 | 結果 |
|---|---|
| `npm run typecheck`／`lint`／`format:check`／`test`／`build` | 全部 exit 0；11 檔 95 項測試（新增 6 項模型測試） |
| 公園多人物對話 `park-dialogues-browser.mjs` | 36/36，exit 0 |
| 打招呼互動 `phase4-browser.mjs` | 24/24，exit 0 |
| 安全控制 `s5-runtime-browser.mjs` | 15/15，exit 0 |
| S4 安全 `browser-check.mjs` | 22/22，exit 0 |
| 資源與可及性 `s5-extended-browser.mjs` | 10/10，exit 0（20 次重建後 canvas 與 RAF 為零、監聽數不增加；分頁切換一項如往常標未驗證） |

新增的模型單元測試：左右骨頭判斷、換上模型時隱藏自製身體並保留長椅與球、不能重複換或釋放後換、骨架不完整時不換、揮手與點頭驅動骨頭並回到靜止姿勢、釋放人物時模型資源只釋放一次。

證據：`characters-evidence/`（遊戲內各人物截圖、揮手畫面、四人並排、瀏覽器檢查結果）。

## 6. 已知限制與待確認

- **外觀接受度待使用者評估**：這是寫實比例的原創人物，不是《模擬市民》的模型。衣服是貼身殼、頭髮沒有髮絲細節、臉部沒有皮膚貼圖。
- 媽媽胸前仍有很淡的光影痕跡；坐姿與拿球姿勢是靜態擺放。
- 寫實人臉的「恐怖谷」風險（03 §9.5）需要專業評估。
- 載入量增加約 6.5 MB（公園材質原本約 8.4 MB）；iPhone 實際載入時間與 FPS 未量測。模型載入前會先顯示原本的自製人形。
- 實機（iPhone Safari／Chrome）、VoiceOver 未驗證。

## 7. 下一步

使用者確認外觀後再決定：調整衣服顏色、髮型或表情；或處理效能（例如減面）。
