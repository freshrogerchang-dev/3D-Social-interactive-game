# 人物改為表情豐富的卡通人物 建置紀錄（2026-10-16）

分支 `main-uv12jr`，基準 `1d3f113`。由 Claude Code 雲端工作階段執行。

## 1. 使用者要求

「人物不用擬真，改成臉部表情豐富的卡通人物即可」。

前一輪的「模擬市民風格」寫實人物（髮片頭髮、寬鬆衣服，仍用 MakeHuman 資料）沒有 commit、沒有發布，這次直接改為卡通人物。這是對 Q6「高度寫實」在人物部分的變更，已記在 STATE.md 決策表；公園環境的貼圖與細節不變。

## 2. 做法

全部在遊戲裡用 Three.js 幾何產生，沒有外部模型、貼圖或新套件。

### 卡通臉 `src/npc/CartoonFace.ts`

- 五官：眼白（深色細外框）、大虹膜、瞳孔、兩個高光；上下眼皮（皮膚色半球，旋轉決定張開程度與笑眼）；眉毛；鼻子；腮紅；嘴巴。
- 嘴巴是上下兩條曲線之間的帶狀網格；六種嘴型頂點數相同，用 morph target 平順過渡（微笑、咧嘴笑、張嘴、平嘴、波浪嘴、歪嘴）。
- 六種表情：

| 表情 | 樣子 |
|---|---|
| 平常（neutral） | 小微笑，眼睛放鬆 |
| 開心（happy） | 咧嘴笑、笑眼、腮紅較明顯 |
| 興奮（excited） | 眼睛睜大、眉毛上揚、張嘴笑 |
| 思考（thinking） | 眼睛看向上方一側、一邊眉毛抬高、歪嘴 |
| 驚訝（surprised） | 眼睛最大、眉毛高、O 型嘴 |
| 擔心（worried） | 眉頭上揚、波浪嘴 |

- 過渡：每幀以指數趨近，約 0.3 秒；delta 0（剛恢復）不變；停用動作或「減少動態」時直接切換。只有呼叫 `setExpression` 才會變，沒有自動眨眼或循環動作。

### 卡通人物 `src/npc/SeatedNPC.ts`（`ParkCharacter`）

- 小孩比例：頭大（約身高的三成）、四肢圓潤；媽媽是大人比例。
- 髮型：小安短髮、小宇刺刺頭（圓頭錐形）、小晴鮑伯頭加髮夾、媽媽往後梳加馬尾。
- 衣服：泡泡袖上衣、衣領；小安、小宇短褲，小晴短裙，媽媽長裙；小孩白襪。
- 姿勢與動作沿用：小安坐長椅（腳懸空）、小宇抱球；揮手（-x 側手臂）、點頭（頭部軸點）的時間與停用規則不變。
- 介面不變：`root`、`obstacle`、`materials`（全部 MeshStandardMaterial，沿用場景的飽和度上限與自有 LUT）、`playGesture`、`update`、`isNear`、`dispose`；新增 `setExpression`、`expression`、`benchMaterial`。

### 對話接上表情

- `DialogueNode` 新增 `expression`；四個情境共 29 個節點標上表情。
- 原則：表情表示**對方自己的感受**，不是評價孩子的選擇。被拒絕練習時小宇是「擔心」（不好意思）；孩子說不想游泳時媽媽是「思考」（在聽、在想辦法）；**先不參與、結束與回到公園的節點只用平常或開心的臉**（有單元測試檢查）。
- `GreetingUI` 把節點的表情傳給 `main.ts` → `GameEngine.setNPCExpression`；離開對話或返回安全區時所有人回到平常的表情。

### 移除

MakeHuman 人物模型與授權檔（`public/assets/characters/`，約 6.6 MB）、`tools/characters/`、`src/npc/HumanModel.ts`、`src/npc/FriendlyFaceTexture.ts` 與其測試、場景的模型載入程式，以及 `THIRD_PARTY_NOTICES.txt` 的 MakeHuman 段落。網站載入量少約 6.6 MB。

## 3. 驗證

環境：Node v22.22.0、npm 10.9.4；依賴與鎖檔不變。Chromium 141 headless＋SwiftShader。

| 檢查 | 結果 |
|---|---|
| `npm run typecheck`／`lint`／`format:check`／`test`／`build` | 全部 exit 0；12 檔 103 項測試 |
| `park-dialogues-browser.mjs`／`phase4-browser.mjs` | 36/36、24/24，exit 0（眼睛縮小前）；縮小後重跑對話檢查 36/36，exit 0 |
| 新增單元測試 | `tests/npc/CartoonFace.test.ts`（六種表情都不同、過渡柔和且收斂、不會自己變、釋放）；情境表情規則；引擎只給對話中的人物換表情、null 與返回安全區回到平常；坐姿與站姿位置、大人比例；揮手與點頭改寫 |

證據：`cartoon-evidence/expressions.jpg`（四位人物各六種表情）、`cartoon-evidence/in-game.jpg`（遊戲內，眼睛縮小後）。

## 4. 使用者回饋：眼睛小一點

把眼睛大小從頭部寬度的 0.31 倍改為 0.24 倍（約原本的 77%），兩眼稍微靠近；六種表情仍然可以分辨。前後對照與四位人物表情圖已更新（`cartoon-evidence/expressions.jpg`）。五項檢查 exit 0、103 項測試。

## 5. 限制

- 表情與造型是工程原型，尚未經專業審查；表情對 5–8 歲兒童的辨識度與刺激負荷需要評估。
- iPhone 實機 FPS 與畫面未驗證。
- 需要 preview 的 S4／S5 瀏覽器檢查本次未執行（未驗證）。
