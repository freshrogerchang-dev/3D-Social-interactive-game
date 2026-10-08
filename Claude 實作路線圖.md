# Claude 實作路線圖 — Three.js ASD 社交小遊戲

> 本文件為可貼給 Claude（或任何 AI 編碼助手）的實作提示與開發計畫。
> 請依階段順序執行，每階段完成後進行驗收測試再進入下一階段。

---

## 角色設定

```
你是資深 Three.js + TypeScript 前端工程師，具有無障礙遊戲開發與特殊教育科技經驗。
你的任務是實作一套為情緒障礙與 ASD 兒童設計的第一人稱街坊社交小遊戲。

核心原則：
1. 安全第一 — 不傷害使用者身心
2. 可預測性 — 所有行為可預期
3. 可調整性 — 每項感官參數可配置
4. 無失敗設計 — 所有互動都是練習
5. 效能穩定 — 60 FPS 桌面 / 30 FPS 平板
6. 程式碼品質 — 型別安全、模組化、可測試
```

---

## 全域約束（Do Not 選項）

```
## 禁止事項 (Do NOT)

### 視覺/感官
- 禁止使用飽和度 > 0.6 的顏色
- 禁止使用閃爍動畫（頻率 > 1Hz）
- 禁止使用螢幕震動（screen shake）
- 禁止使用動態模糊（motion blur）
- 禁止使用強烈泛光（bloom）
- 禁止使用暗角（vignette）
- 禁止使用跳嚇（jump scare）
- 禁止使用高頻尖銳音效
- 禁止使用突發巨響
- 禁止使用嘈雜人群音效

### 遊戲機制
- 禁止設計懲罰迴圈
- 禁止使用負向計分語言（如「失敗」「錯誤」）
- 禁止設計計時回應（強制限時選擇）
- 禁止設計排行榜或公開比較
- 禁止讓 NPC 主動靠近玩家
- 禁止讓 NPC 包圍玩家
- 禁止設計無法退出的情境
- 禁止設計無修復路徑的社交失敗

### 技術
- 禁止使用 any 型別（除非與第三方函式庫互動）
- 禁止在 update 迴圈中建立新物件（GC 壓力）
- 禁止在每幀載入資源
- 禁止使用 eval 或 Function 建構子
- 禁止在未初始化時呼叫 Three.js API
- 禁止忘記 dispose 資源

### 隱私
- 禁止收集生物特徵資料
- 禁止使用攝影機進行情緒辨識
- 禁止收集位置資訊
- 禁止與第三方分享資料
- 禁止加入外部連結或廣告
```

---

## 必要資料夾結構

```
project/
├── src/
│   ├── core/
│   │   ├── GameEngine.ts
│   │   ├── RenderLoop.ts
│   │   ├── TimeManager.ts
│   │   ├── StateMachine.ts
│   │   └── EventBus.ts
│   ├── scene/
│   │   ├── SceneManager.ts
│   │   ├── NeighborhoodScene.ts
│   │   ├── SafeZone.ts
│   │   ├── InteractionHotspot.ts
│   │   ├── SensoryLayer.ts
│   │   └── EnvironmentManager.ts
│   ├── player/
│   │   ├── PlayerController.ts
│   │   ├── FirstPersonCamera.ts
│   │   ├── MovementSystem.ts
│   │   ├── InteractionRaycaster.ts
│   │   └── PlayerState.ts
│   ├── npc/
│   │   ├── NPCManager.ts
│   │   ├── NPCController.ts
│   │   ├── NPCBehavior.ts
│   │   ├── NPCAnimation.ts
│   │   ├── ProximitySystem.ts
│   │   └── NPCFactory.ts
│   ├── dialogue/
│   │   ├── DialogueManager.ts
│   │   ├── DialogueTree.ts
│   │   ├── DialogueUI.ts
│   │   ├── DialogueParser.ts
│   │   └── DialogueTypes.ts
│   ├── emotion/
│   │   ├── EmotionManager.ts
│   │   ├── EmotionRegulator.ts
│   │   ├── EmotionReport.ts
│   │   ├── EmotionReflection.ts
│   │   ├── BreathingGuide.ts
│   │   └── EmotionTypes.ts
│   ├── ui/
│   │   ├── UIManager.ts
│   │   ├── HUDOverlay.ts
│   │   ├── DialogueBox.ts
│   │   ├── SettingsPanel.ts
│   │   ├── EmotionSlider.ts
│   │   ├── VisualSchedule.ts
│   │   └── PauseMenu.ts
│   ├── accessibility/
│   │   ├── AccessibilityManager.ts
│   │   ├── SettingsStore.ts
│   │   ├── SensoryAdjuster.ts
│   │   ├── MotionReducer.ts
│   │   └── CueEnhancer.ts
│   ├── data/
│   │   ├── ProgressTracker.ts
│   │   ├── LocalStorage.ts
│   │   ├── DataManager.ts
│   │   └── DataTypes.ts
│   ├── systems/
│   │   ├── AssetManager.ts
│   │   ├── AudioManager.ts
│   │   ├── ParticleSystem.ts
│   │   ├── LightingSystem.ts
│   │   └── PerformanceMonitor.ts
│   ├── shaders/
│   │   ├── softLighting.glsl
│   │   ├── colorDesaturation.glsl
│   │   └── outlineShader.glsl
│   ├── config/
│   │   ├── game.config.ts
│   │   ├── npc.config.ts
│   │   ├── scene.config.ts
│   │   └── accessibility.defaults.ts
│   └── main.ts
├── public/
│   ├── assets/
│   │   ├── models/
│   │   ├── textures/
│   │   ├── audio/
│   │   └── dialogue/
│   ├── draco/
│   └── styles/
│       └── theme.css
├── tests/
│   ├── core/
│   ├── scene/
│   ├── player/
│   ├── npc/
│   ├── dialogue/
│   ├── emotion/
│   └── accessibility/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## Phase 0：專案設定

### 任務

- [ ] 初始化 Vite + TypeScript 專案
- [ ] 安裝 Three.js 及相關套件
- [ ] 設定 ESLint + Prettier
- [ ] 建立 `src/main.ts` 進入點
- [ ] 建立 HTML 模板（含 canvas 和 UI overlay）
- [ ] 建立 CSS 主題檔（`theme.css`）
- [ ] 設定 `tsconfig.json`（strict mode）
- [ ] 建立 `index.html` 基礎結構

### 驗收標準

```bash
npm run dev  # 啟動開發伺服器
npm run build  # 建構成功
npm run lint  # 無錯誤
```

### index.html 模板

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>街坊社交小遊戲</title>
  <link rel="stylesheet" href="/styles/theme.css">
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <div id="ui-root"></div>
  <button class="exit-button" id="exit-button" aria-label="返回安全區">
    返回安全區
  </button>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

---

## Phase 1：核心引擎與渲染迴圈

### 任務

- [ ] 實作 `EventBus.ts` — 泛型事件匯流排
- [ ] 實作 `RenderLoop.ts` — requestAnimationFrame 管理，支援 timeScale
- [ ] 實作 `GameEngine.ts` — 主引擎，管理生命週期
- [ ] 實作 `SceneManager.ts` — 場景載入/卸載/切換
- [ ] 實作 `BaseScene.ts` — 場景抽象基類
- [ ] 建立 `NeighborhoodScene.ts` — 場景骨架（空場景 + 相機 + 光照）
- [ ] 設定 WebGLRenderer（ACESToneMapping、SRGBColorSpace、pixelRatio ≤2）
- [ ] 設定基礎光照（環境光 + 半球光 + 霧效）

### 介面契約

```typescript
// EventBus
interface IEventBus<TEvents extends Record<string, any>> {
  on<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): void;
  off<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): void;
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void;
  clear(): void;
}

// RenderLoop
interface IRenderLoop {
  start(callback: (delta: number, elapsed: number) => void): void;
  stop(): void;
  setTimeScale(scale: number): void;
}

// SceneManager
interface ISceneManager {
  loadScene(sceneId: string): Promise<void>;
  transitionTo(sceneId: string, options?: TransitionOptions): Promise<void>;
  getCurrentScene(): BaseScene | null;
  dispose(): void;
}

// BaseScene
abstract class BaseScene {
  abstract load(): Promise<void>;
  abstract unload(): Promise<void>;
  abstract update(delta: number): void;
  get scene(): THREE.Scene;
  get camera(): THREE.PerspectiveCamera;
}
```

### 驗收標準

- 開發伺服器啟動後顯示一個有光照的空場景
- 瀏覽器控制台無錯誤
- FPS ≥ 60（桌面）
- ESC 鍵可暫停渲染迴圈
- 視窗調整大小時正確更新相機和渲染器

---

## Phase 2：第一人稱控制器

### 任務

- [ ] 實作 `FirstPersonCamera.ts`
  - FOV 限制為 70
  - 平滑旋轉（slerp 插值，因子 0.15）
  - 俯仰角限制 ±0.4 弧度
  - 頭部晃動預設關閉（可設定）
- [ ] 實作 `MovementSystem.ts`
  - 鍵盤控制（WASD / 方向鍵）
  - 平滑加速/減速（lerp）
  - 移動速度可調（預設 3.0 m/s）
- [ ] 實作滑鼠視角控制（可選 pointer lock）
- [ ] 實作觸控控制（虛擬搖桿 + 視角拖曳）
- [ ] 實作 `PlayerController.ts` — 統一管理相機與移動
- [ ] 實作碰撞偵測（簡化 AABB）

### 關鍵實作要求

```typescript
// FirstPersonCamera — 防暈眩設計
class FirstPersonCamera {
  private fov = 70;
  private moveSpeed = 3.0;
  private acceleration = 5.0;
  private deceleration = 8.0;
  private sensitivity = 0.002;
  private pitchLimit = 0.4;
  private headBobEnabled = false;
  
  // 必須實作平滑旋轉
  update(delta: number, input: InputState): void {
    // 使用 quaternion.slerp 進行平滑旋轉
    // 使用 Vector3.lerp 進行平滑移動
    // 不可使用瞬間旋轉或瞬間停止
  }
}
```

### 驗收標準

- WASD 移動平滑，無突停
- 滑鼠視角平滑，無抖動
- 無頭部晃動（除非設定開啟）
- 碰撞偵測正常運作
- 觸控控制在平板上可用

---

## Phase 3：NPC 系統

### 任務

- [ ] 實作 `NPCManager.ts` — NPC 生命週期管理
- [ ] 實作 `NPCController.ts` — 單一 NPC 控制
- [ ] 實作 `NPCBehavior.ts` — 行為腳本
  - 可預測排程系統
  - 巡邏路徑
  - 待機動畫
- [ ] 實作 `ProximitySystem.ts` — 接近度管理
  - 玩家距離計算
  - NPC 在玩家接近時停止移動
  - NPC 永不主動靠近玩家
- [ ] 實作 `NPCAnimation.ts` — 動畫管理
- [ ] 實作 `NPCFactory.ts` — NPC 工廠
- [ ] 建立至少 3 個 NPC（不同性格）

### 關鍵行為規則

```typescript
// NPC 行為安全規則
class NPCBehavior {
  // 規則1：NPC 永不主動靠近玩家
  private shouldApproachPlayer(): boolean {
    return false;
  }
  
  // 規則2：玩家接近時 NPC 停止移動（不逃跑、不後退）
  private onPlayerNear(distance: number): void {
    if (distance < this.proximityStopDistance) {
      this.stopMoving();
      this.facePlayer();  // 面向玩家但不移動
    }
  }
  
  // 規則3：互動有冷卻時間
  private cooldownAfterInteraction: number = 5.0;
  
  // 規則4：互動有最大時間限制
  private maxInteractionTime: number = 180;  // 3 分鐘
}
```

### 驗收標準

- NPC 按排程行動
- NPC 不主動靠近玩家
- 玩家接近時 NPC 停止移動並面向玩家
- NPC 動畫流暢
- 同時最多顯示的 NPC 數量受限（設定控制）

---

## Phase 4：對話系統

### 任務

- [ ] 定義 `DialogueTypes.ts` — 所有對話相關型別
- [ ] 實作 `DialogueTree.ts` — 對話樹資料結構
- [ ] 實作 `DialogueParser.ts` — JSON 對話腳本解析
- [ ] 實作 `DialogueManager.ts` — 對話流程管理
  - 開始/結束對話
  - 節點切換
  - 選項處理
  - 路徑記錄
- [ ] 實作 `DialogueUI.ts` — 對話介面
  - NPC 台詞顯示
  - 玩家選項按鈕
  - 情緒圖示
  - 語氣標籤
  - 後果預覽（可選）
  - 重播按鈕
  - 幫助按鈕
  - 退出按鈕

### 對話樹 JSON 格式

```json
{
  "id": "park_greeting_01",
  "npcId": "npc_boy_ming",
  "title": "公園裡的問候",
  "rootNodeId": "node_01",
  "nodes": {
    "node_01": {
      "npcLine": {
        "text": "dialogue.park_greeting.ming.line_01",
        "emotion": "happy",
        "gesture": "wave"
      },
      "supports": {
        "emotionIcon": true,
        "toneTag": "友善地"
      },
      "choices": [
        {
          "id": "choice_01a",
          "text": "dialogue.park_greeting.player.choice_01a",
          "outcome": {
            "nextNodeId": "node_02",
            "npcReaction": "小明笑著點頭",
            "socialFeedback": "你友善地回應了打招呼"
          },
          "previewConsequence": "小明會覺得被重視",
          "previewEmotion": "happy",
          "tags": ["polite", "reciprocal"]
        },
        {
          "id": "choice_01c",
          "text": "dialogue.park_greeting.player.choice_help",
          "outcome": {
            "nextNodeId": "node_help"
          },
          "tags": ["help_request"]
        }
      ]
    }
  }
}
```

### 驗收標準

- 對話樹正確載入
- 選項點擊後正確切換節點
- 情緒圖示正確顯示
- 語氣標籤正確顯示
- 可重播 NPC 台詞
- 可隨時退出對話
- 每個對話樹至少有 2 個選項 + 1 個幫助選項
- 每個對話樹有修復路徑
- 所有結尾都是正向的

---

## Phase 5：情緒調節系統

### 任務

- [ ] 實作 `EmotionTypes.ts` — 情緒型別定義
- [ ] 實作 `EmotionManager.ts` — 情緒狀態管理
  - 情緒檢查點（定期/互動前後/玩家主動）
  - 情緒記錄
- [ ] 實作 `EmotionRegulator.ts` — 調節策略管理
- [ ] 實作 `BreathingGuide.ts` — 呼吸練習視覺化
  - 4-7-8 呼吸法
  - 方塊呼吸法
  - 擴張/收縮圓圈動畫（極慢、平滑）
  - 可選語音引導
- [ ] 實作 `EmotionReport.ts` — 自我報告介面
  - 情緒滑桿（0-10）
  - 情緒卡片選擇
  - 可跳過
- [ ] 實作 `EmotionReflection.ts` — 反思引導

### 關鍵介面

```typescript
interface BreathingTechnique {
  phases: { type: 'inhale' | 'hold' | 'exhale'; duration: number; label: string }[];
  cycles: number;
}

// 呼吸練習視覺化要求：
// - 圓圈擴張/收縮速度極慢且平滑
// - 顏色：柔和青綠色 (#7AB8A8)
// - 無閃爍
// - 文字提示同步顯示
// - 可選語音同步引導
// - 玩家可隨時停止
```

### 驗收標準

- 情緒滑桿可使用且可跳過
- 呼吸練習視覺化正確（圓圈平滑擴張/收縮）
- 呼吸節奏正確（4-7-8 / 方塊）
- 正向回饋具體且行為導向
- 玩家可隨時停止呼吸練習
- 情緒調節後有再評估步驟

---

## Phase 6：無障礙系統

### 任務

- [ ] 實作 `AccessibilityManager.ts` — 設定管理
- [ ] 實作 `SettingsStore.ts` — 持久化（IndexedDB）
- [ ] 實作 `SensoryAdjuster.ts` — 感官調整
  - 即時調整渲染器飽和度/亮度
  - 即時調整動畫速度
- [ ] 實作 `MotionReducer.ts` — 動態降低
- [ ] 實作 `CueEnhancer.ts` — 提示增強
- [ ] 實作 `SettingsPanel.ts` — 設定介面
  - 密碼保護（照護者模式）
  - 所有設定可調
  - 即時生效

### 設定清單

```typescript
interface AccessibilitySettings {
  // 感官
  sensoryIntensity: 'minimal' | 'low' | 'normal';
  colorSaturation: number;     // 0.3-0.7
  brightness: number;          // 0.6-0.9
  motionBlur: boolean;
  screenShake: boolean;
  particleEffects: boolean;
  
  // 動態
  reducedMotion: boolean;
  cameraBob: boolean;
  transitionSpeed: 'slow' | 'normal';
  movementSpeed: number;       // 0.3-1.0
  
  // 音訊
  masterVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  musicVolume: number;
  audioCompression: boolean;
  
  // 對話
  textSpeed: 'instant' | 'slow' | 'normal';
  dialogueComplexity: 'simple' | 'standard';
  showEmotionIcons: boolean;
  showToneTags: boolean;
  showConsequencePreview: boolean;
  allowReplay: boolean;
  autoAdvance: boolean;
  
  // 社交
  npcProximity: number;
  maxNpcCount: number;
  interactionPrompts: boolean;
  safeZoneVisible: boolean;
  
  // 視覺支持
  fontSize: 'small' | 'medium' | 'large';
  highContrastText: boolean;
  visualSchedule: boolean;
  emotionCards: boolean;
}
```

### 驗收標準

- 所有設定可在面板中調整
- 設定變更即時生效
- 設定持久化（重啟後恢復）
- 照護者設定有密碼保護
- 兒童無法修改照護者設定

---

## Phase 7：資源管理與效能優化

### 任務

- [ ] 實作 `AssetManager.ts`
  - GLTF + Draco 載入
  - KTX2 貼圖載入
  - 分批載入策略
  - 資源快取
- [ ] 實作 `AudioManager.ts`
  - Howler.js 整合
  - 音量控制
  - 動態範圍壓縮
  - 低通濾波
- [ ] 實作 `PerformanceMonitor.ts`
  - FPS 監控
  - 自動畫質降級
  - 記憶體監控
- [ ] 實作 LOD 系統
- [ ] 實作 InstancedMesh（重複物件）
- [ ] 實作靜態網格合併
- [ ] 實作視錐剔除
- [ ] 設定貼圖壓縮
- [ ] 設定烘焙光照

### 效能預算

```
桌面高效：60 FPS | 150K poly | <200 draw calls | <256MB VRAM
桌面一般：60 FPS | 80K poly  | <150 draw calls | <128MB VRAM
平板高效：60 FPS | 60K poly  | <100 draw calls | <128MB VRAM
平板入門：30 FPS | 30K poly  | <60 draw calls  | <64MB VRAM
```

### 驗收標準

- 場景載入 < 3 秒（桌面）/ < 8 秒（平板入門）
- FPS 穩定在目標值
- FPS 下降時自動降級畫質
- 記憶體使用在預算內
- 無記憶體洩漏（長時間運行）

---

## Phase 8：進度系統與資料管理

### 任務

- [ ] 實作 `DataTypes.ts` — 資料型別
- [ ] 實作 `LocalStorage.ts` — IndexedDB 封裝
- [ ] 實作 `ProgressTracker.ts` — 進度追蹤
  - 完成情境記錄
  - 技能練習次數
  - 情緒調節使用記錄
  - 個人進步曲線
- [ ] 實作資料匯出功能（JSON）
- [ ] 實作資料清除功能

### 驗收標準

- 進度正確儲存
- 重啟後進度恢復
- 資料匯出為 JSON 格式
- 資料清除功能正常
- 無敏感資料外洩

---

## Phase 9：場景內容製作

### 任務

- [ ] 建立安全區場景（庭院花園）
  - 自然元素（植物、水景）
  - 平靜環境音
  - 呼吸練習空間
  - 情緒檢查點
- [ ] 建立社區公園場景
  - 長椅、步道、植物
  - 互動熱點
  - NPC 生成點
- [ ] 建立街角商店場景
  - 店內環境
  - 店員 NPC
  - 購物互動對話樹
- [ ] 建立學校入口場景
  - 校門口環境
  - 同儕 NPC
  - 問候對話樹
- [ ] 建立至少 5 個對話樹
  - 公園問候
  - 商店購物
  - 學校相遇
  - 社區中心活動
  - 鄰居拜訪

### 內容品質要求

- 所有色彩符合柔和色盤（飽和度 ≤ 0.45）
- 無閃爍或高頻動畫
- NPC 模型簡潔、不誇張
- 對話內容適齡
- 每個對話樹有修復路徑
- 每個對話樹所有結尾都是正向的

### 驗收標準

- 每個場景載入正確
- NPC 正確生成
- 對話樹完整可玩
- 所有路徑有正向結尾
- 場景符合感官規範

---

## Phase 10：測試、優化與打磨

### 任務

- [ ] 撰寫單元測試（核心模組）
- [ ] 撰寫整合測試（模組間互動）
- [ ] 撰寫 E2E 測試（完整流程）
- [ ] 效能分析與優化
- [ ] 無障礙測試
- [ ] 安全測試
- [ ] 跨平台測試（桌面 + 平板）
- [ ] 跨瀏覽器測試（Chrome, Firefox, Safari）
- [ ] 錯誤處理與邊界情況
- [ ] 載入畫面與進度條
- [ ] 錯誤頁面與恢復機制

### 測試清單

```
功能測試：
[ ] 場景載入 (< 3秒桌面)
[ ] 場景切換 (無黑屏)
[ ] 玩家移動 (平滑)
[ ] 相機控制 (無暈眩)
[ ] 互動熱點 (正確觸發)
[ ] NPC 行為 (可預測)
[ ] 對話流程 (正確)
[ ] 對話重播 (正確)
[ ] 情緒檢查 (可用)
[ ] 呼吸練習 (正確)
[ ] 設定面板 (即時生效)
[ ] 暫停功能 (正常)
[ ] 退出按鈕 (隨時可見)
[ ] 進度儲存 (正確)
[ ] 資料匯出 (正確)

無障礙測試：
[ ] 降飽和模式
[ ] 降低動態
[ ] 關閉頭部晃動
[ ] 關閉動態模糊
[ ] 字型大小切換
[ ] 高對比文字
[ ] 情緒圖示
[ ] 語氣標籤
[ ] 後果預覽
[ ] 視覺排程
[ ] NPC 距離調整
[ ] NPC 數量限制
[ ] 音量控制
[ ] 觸控支援

效能測試：
[ ] 桌面 60 FPS
[ ] 平板 30-60 FPS
[ ] 無記憶體洩漏
[ ] 自動降級正常

安全測試：
[ ] 無跳嚇元素
[ ] 無計時壓力
[ ] 無懲罰機制
[ ] 無排行榜
[ ] 退出按鈕可見
[ ] 設定密碼保護
[ ] 無外部連結
[ ] 無廣告
```

### 驗收標準

- 所有測試項目通過
- 無致命錯誤
- 無嚴重效能問題
- 無安全問題
- 跨平台相容

---

## 元件介面契約總覽

```typescript
// === 核心介面 ===
interface IGameEngine {
  init(config: GameConfig): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}

interface ISceneManager {
  loadScene(sceneId: string): Promise<void>;
  transitionTo(sceneId: string, options?: TransitionOptions): Promise<void>;
  getCurrentScene(): BaseScene | null;
}

interface IPlayerController {
  update(delta: number): void;
  lock(): void;
  unlock(): void;
  getPosition(): THREE.Vector3;
}

interface INPCManager {
  spawnNPC(config: NPCConfig): NPCController;
  update(delta: number): void;
  getNPC(id: string): NPCController | null;
  getNearbyNPCs(position: THREE.Vector3, radius: number): NPCController[];
}

interface IDialogueManager {
  startDialogue(treeId: string, npcId: string): void;
  onChoiceSelected(choiceId: string): void;
  endDialogue(): void;
  replayCurrentLine(): void;
  requestHelp(): void;
  exitDialogue(): void;
}

interface IEmotionManager {
  promptCheckIn(trigger: CheckInTrigger): Promise<PlayerEmotion>;
  offerRegulation(emotion: PlayerEmotion): Promise<void>;
  guideBreathingExercise(technique: BreathingTechnique): Promise<void>;
}

interface IAccessibilityManager {
  load(): Promise<void>;
  save(): Promise<void>;
  getSettings(): AccessibilitySettings;
  updateSetting(key: string, value: any): void;
  isCaregiverMode(): boolean;
  enterCaregiverMode(password: string): boolean;
}

interface IUIManager {
  showNPCLine(data: NPCLineData): void;
  showChoices(choices: ChoiceData[]): void;
  showEmotionSlider(): Promise<PlayerEmotion>;
  showRegulationPrompt(): Promise<boolean>;
  showStrategyOptions(strategies: RegulationStrategy[]): Promise<RegulationStrategy>;
}

interface IPerformanceMonitor {
  update(delta: number): void;
  getAverageFps(): number;
  isHealthy(): boolean;
}
```

---

## 建構指令

```bash
# 安裝依賴
npm install three @types/three
npm install -D typescript vite
npm install -D eslint prettier
npm install -D vitest
npm install howler @types/howler
npm install i18next
npm install idb
npm install three-gltf-pipeline

# 開發
npm run dev

# 建構
npm run build

# 測試
npm run test
npm run test:e2e

# Lint
npm run lint
npm run format
```

---

## 色彩快速參考

```
背景色（環境）：
  天空：#A8C4D4 (HSL: 210, 20%, 72%)
  地面：#A5B89A (HSL: 90, 15%, 65%)
  建築：#C4B49A (HSL: 35, 18%, 70%)
  植物：#7A9E7A (HSL: 120, 20%, 55%)

互動色：
  高亮：#C4A86A (HSL: 45, 40%, 60%) — 柔和金色
  安全：#7AB8A8 (HSL: 160, 25%, 65%) — 柔和青綠
  對話：#7A9EC4 (HSL: 210, 25%, 60%) — 柔和藍

UI 色：
  背景：#E8E0D0 (HSL: 40, 10%, 88%)
  文字：#3A4550 (HSL: 210, 15%, 25%)
  強調：#5A8AAA (HSL: 200, 30%, 50%)

情緒色：
  平靜：#7AAAB8  快樂：#B8AA6A  難過：#6A7AAA
  焦慮：#AA926A  生氣：#AA7A6A  中性：#9A9080

規則：飽和度 (S) 不超過 0.60
```

---

## 最終交付清單

```
交付物：
[ ] 完整原始碼（TypeScript + Three.js）
[ ] 可運行的建構版本（npm run build）
[ ] 至少 5 個可玩社交場景
[ ] 至少 5 個對話樹（含修復路徑）
[ ] 完整無障礙設定面板
[ ] 情緒調節系統（含 2 種呼吸練習）
[ ] 進度追蹤與資料匯出
[ ] 單元測試覆蓋核心模組
[ ] E2E 測試覆蓋主要流程
[ ] 跨平台測試報告
[ ] 照護者使用手冊
[ ] 技術文件（架構圖、API 文件）
```

---

*本路線圖應配合 `threejs_asd_social_game_blueprint.md` 架構藍圖一起使用。所有社交情境與情緒調節策略應經兒童發展專業人員、特殊教育工作者及臨床心理師審核後實施。本系統非醫療診斷或治療工具。*
