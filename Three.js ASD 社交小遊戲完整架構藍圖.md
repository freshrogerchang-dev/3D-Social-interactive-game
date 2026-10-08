# Three.js 第一人稱街坊社交小遊戲 — 完整架構藍圖

> 為情緒障礙與 ASD（自閉症譜系）兒童設計的沉浸式社交情境學習工具

---

## 目錄

1. [專案定位與安全邊界](#1-專案定位與安全邊界)
2. [目標使用者與無障礙原則](#2-目標使用者與無障礙原則)
3. [核心遊戲循環](#3-核心遊戲循環)
4. [Three.js 模組化架構](#4-threejs-模組化架構)
5. [3D 場景系統與內容管線](#5-3d-場景系統與內容管線)
6. [效能優化策略](#6-效能優化策略)
7. [低刺激感官視覺與柔和色彩規範](#7-低刺激感官視覺與柔和色彩規範)
8. [NPC 及同儕互動腳本與對話樹設計](#8-npc-及同儕互動腳本與對話樹設計)
9. [情緒調節回饋機制](#9-情緒調節回饋機制)
10. [前端程式碼實作框架](#10-前端程式碼實作框架)
11. [資料模型與進度系統](#11-資料模型與進度系統)
12. [隱私、倫理與臨床注意事項](#12-隱私倫理與臨床注意事項)
13. [測試與驗收清單](#13-測試與驗收清單)

---

## 1. 專案定位與安全邊界

### 1.1 產品定位

本系統為**社交情境練習與社會情緒學習（SEL）輔助工具**，非醫療診斷或治療工具。核心目標：

- 在安全、可預測的虛擬街坊環境中練習社交情境
- 培養情緒辨識、情緒調節、社交互動能力
- 提供低壓力、可重複、可調整強度的練習場域
- 支持照護者／臨床工作者觀察與配置

### 1.2 安全邊界 — 禁止事項

| 類別 | 禁止行為 | 原因 |
|------|---------|------|
| 懲罰機制 | 不設懲罰迴圈、負向計分語言 | 避免焦慮與挫折循環 |
| 驚嚇元素 | 禁跳嚇（jump scare）、突發巨響 | 感官超載風險 |
| 時間壓力 | 不強制計時回應 | 減少社交焦慮 |
| 公開比較 | 無排行榜、無公開展示 | 避免社交壓力與羞恥感 |
| 強制留滯 | 隨時可暫停／退出 | 自主控制感 |
| 不可預測行為 | NPC 不突然靠近或包圍 | 可預測性需求 |

### 1.3 安全設計要素

- **永遠可見的退出按鈕**：畫面固定位置，一鍵回到安全區
- **無失敗設計**：所有互動都是「練習」而非「考試」
- **修復腳本**：每個社交情境都提供修復／重試路徑
- **照護者控制台**：可調整所有參數，密碼保護

---

## 2. 目標使用者與無障礙原則

### 2.1 使用者輪廓

| 使用者類型 | 特徵 | 設計重點 |
|-----------|------|---------|
| ASD 兒童 | 感官敏感、社交溝通差異、重複行為需求 | 可預測性、低刺激、視覺支持 |
| 情緒障礙兒童 | 情緒調節困難、挫折耐受度低 | 漸進式挑戰、正向回饋、修復機會 |
| 照護者 | 需觀察與配置 | 儀表板、資料匯出 |
| 臨床工作者 | 需評估進展 | 進度報告、情境自訂 |

### 2.2 無障礙核心原則

```
可預測性 (Predictability)
  → 固定 NPC 行程、可預期互動流程、視覺化排程

可調整性 (Adaptability)
  → 刺激強度、文字速度、NPC 距離、音量、對話複雜度

可控感 (Agency)
  → 隨時暫停、選擇參與、可退出、可重試

低負荷 (Low Cognitive Load)
  → 一次一個任務、視覺提示、簡潔介面

感官友善 (Sensory Friendly)
  → 柔和色彩、低對比、無閃爍、可關閉動畫
```

### 2.3 個人化設定層

```typescript
interface AccessibilitySettings {
  // 感官控制
  sensoryIntensity: 'minimal' | 'low' | 'normal';   // 整體刺激強度
  colorSaturation: number;        // 0.3–0.7，預設 0.5
  brightness: number;             // 0.6–0.9，預設 0.75
  motionBlur: boolean;            // 預設 false
  screenShake: boolean;            // 預設 false
  particleEffects: boolean;       // 預設 false
  
  // 動態控制
  reducedMotion: boolean;         // 降低動畫速度
  cameraBob: boolean;             // 關閉鏡頭晃動
  transitionSpeed: 'slow' | 'normal'; // 場景切換速度
  movementSpeed: number;          // 0.3–1.0x
  
  // 音訊控制
  masterVolume: number;           // 0–1
  ambientVolume: number;          // 0–0.3
  sfxVolume: number;              // 0–0.5
  musicVolume: number;            // 0–0.3
  audioCompression: boolean;      // 壓縮動態範圍
  
  // 對話控制
  textSpeed: 'instant' | 'slow' | 'normal';
  dialogueComplexity: 'simple' | 'standard';
  showEmotionIcons: boolean;     // 情緒圖示
  showToneTags: boolean;         // 語氣標籤
  showConsequencePreview: boolean; // 預覽選項後果
  allowReplay: boolean;          // 可重播對話
  autoAdvance: boolean;          // 自動推進（需手動開啟）
  
  // 社交控制
  npcProximity: number;          // NPC 互動距離（公尺）
  maxNpcCount: number;           // 同時可見 NPC 數
  interactionPrompts: boolean;   // 顯示互動提示
  safeZoneVisible: boolean;      // 安全区可見標示
  
  // 視覺支持
  fontSize: 'small' | 'medium' | 'large';
  highContrastText: boolean;
  visualSchedule: boolean;        // 視覺排程
  emotionCards: boolean;          // 情緒卡片支持
}
```

---

## 3. 核心遊戲循環

### 3.1 主循環設計

```
┌─────────────────────────────────────────────────────────────────┐
│                    核心遊戲循環                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│   │  探索     │───→│  觀察    │───→│  選擇    │───→│ NPC 回饋  │  │
│   │ Explore  │    │ Observe  │    │ Choose   │    │ Feedback  │  │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│         ↑                                           │           │
│         │              ┌──────────┐                 │           │
│         │              │  情緒調節  │←────────────────┘           │
│         │              │ Regulate │                             │
│         │              └──────────┘                              │
│         │                  │                                    │
│         │              ┌──────────┐                              │
│         └──────────────│  反思     │                              │
│                        │ Reflect  │                              │
│                        └──────────┘                              │
│                              │                                    │
│                        ┌──────────┐                              │
│                        │  正向回饋  │                              │
│                        │ Reward   │                              │
│                        └──────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 循環階段說明

| 階段 | 描述 | 設計要點 |
|------|------|---------|
| 探索 | 玩家在街坊中自由移動 | 無時間限制、可隨時暫停 |
| 觀察 | NPC 表現社交情境，玩家旁觀 | NPC 行為可預測、有視覺提示 |
| 選擇 | 從 2-4 個回應選項中選擇 | 無時間壓力、可預覽後果 |
| NPC 回饋 | NPC 依選擇做出回應 | 正向為主、可修復 |
| 情緒調節 | 玩家自評情緒、選擇調節策略 | 自我報告、非推測 |
| 反思 | 簡短反思引導問題 | 選配、可跳過 |
| 正向回饋 | 具體、行為導向的鼓勵 | 非分數制、無比較 |

---

## 4. Three.js 模組化架構

### 4.1 專案目錄結構

```
src/
├── core/                          # 核心引擎
│   ├── GameEngine.ts              # 主引擎，管理生命週期
│   ├── RenderLoop.ts              # 渲染迴圈與 RAF 管理
│   ├── TimeManager.ts             # 時間管理（含慢速模式）
│   ├── StateMachine.ts            # 全域狀態機
│   └── EventBus.ts                # 事件匯流排
│
├── scene/                         # 場景管理
│   ├── SceneManager.ts            # 場景切換、載入
│   ├── NeighborhoodScene.ts       # 街坊主場景
│   ├── SafeZone.ts                # 安全區域
│   ├── InteractionHotspot.ts     # 互動熱點
│   ├── SensoryLayer.ts            # 感官圖層（動態降刺激）
│   └── EnvironmentManager.ts      # 環境光照、天氣、時間
│
├── player/                        # 玩家控制
│   ├── PlayerController.ts        # 第一人稱控制器
│   ├── FirstPersonCamera.ts       # 相機管理（防暈眩）
│   ├── MovementSystem.ts          # 移動系統（平滑加速減速）
│   ├── InteractionRaycaster.ts    # 互動射線偵測
│   └── PlayerState.ts             # 玩家狀態
│
├── npc/                           # NPC 系統
│   ├── NPCManager.ts              # NPC 生命週期管理
│   ├── NPCController.ts           # 單一 NPC 行為控制
│   ├── NPCBehavior.ts             # 行為腳本（可預測排程）
│   ├── NPCAnimation.ts            # 動畫管理
│   ├── ProximitySystem.ts         # 接近度與個人空間
│   └── NPCFactory.ts              # NPC 工廠
│
├── dialogue/                      # 對話系統
│   ├── DialogueManager.ts         # 對話流程管理
│   ├── DialogueTree.ts            # 對話樹資料結構
│   ├── DialogueUI.ts              # 對話介面
│   ├── DialogueParser.ts          # 對話腳本解析
│   └── DialogueTypes.ts           # 型別定義
│
├── emotion/                       # 情緒系統
│   ├── EmotionManager.ts          # 情緒狀態管理
│   ├── EmotionRegulator.ts        # 情緒調節策略
│   ├── EmotionReport.ts           # 自我報告介面
│   ├── EmotionReflection.ts      # 反思引導
│   └── EmotionTypes.ts            # 情緒型別
│
├── ui/                            # 使用者介面
│   ├── UIManager.ts               # UI 生命週期
│   ├── HUDOverlay.ts              # 抬頭顯示
│   ├── DialogueBox.ts             # 對話框
│   ├── SettingsPanel.ts           # 設定面板
│   ├── EmotionSlider.ts           # 情緒滑桿
│   ├── VisualSchedule.ts         # 視覺排程
│   └── PauseMenu.ts               # 暫停選單
│
├── accessibility/                 # 無障礙系統
│   ├── AccessibilityManager.ts    # 無障礙設定管理
│   ├── SettingsStore.ts          # 設定持久化
│   ├── SensoryAdjuster.ts        # 感官調整器
│   ├── MotionReducer.ts          # 動態降低
│   └── CueEnhancer.ts            # 提示增強器
│
├── data/                          # 資料層
│   ├── ProgressTracker.ts        # 進度追蹤
│   ├── LocalStorage.ts           # 本地儲存
│   ├── DataManager.ts           # 資料管理
│   └── DataTypes.ts              # 資料型別
│
├── systems/                       # 子系統
│   ├── AssetManager.ts           # 資源載入
│   ├── AudioManager.ts           # 音訊管理
│   ├── ParticleSystem.ts         # 粒子系統（可關閉）
│   ├── LightingSystem.ts        # 光照系統
│   └── PerformanceMonitor.ts    # 效能監控
│
├── shaders/                       # 著色器
│   ├── softLighting.glsl         # 柔和光照
│   ├── colorDesaturation.glsl    # 色彩降飽和
│   └── outlineShader.glsl        # 物件輪廓（互動提示）
│
├── config/                        # 設定
│   ├── game.config.ts            # 遊戲全域設定
│   ├── npc.config.ts             # NPC 設定
│   ├── scene.config.ts           # 場景設定
│   └── accessibility.defaults.ts  # 無障礙預設值
│
└── main.ts                        # 進入點
```

### 4.2 核心架構圖

```
┌──────────────────────────────────────────────────────┐
│                    main.ts (進入點)                     │
├──────────────────────────────────────────────────────┤
│                    GameEngine                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ RenderLoop   │  │ EventBus      │  │ StateMachine│  │
│  └──────┬───────┘  └───────┬──────┘  └──────┬──────┘  │
│         │                  │                 │        │
│  ┌──────┴──────────────────┴─────────────────┴──────┐  │
│  │              模組管理層 (Module Layer)              │  │
│  ├────────┬────────┬────────┬────────┬────────┬────┤  │
│  │ Scene  │ Player │  NPC   │Dialogue│ Emotion│ UI │  │
│  │ Mgr    │ Ctrl   │  Mgr   │  Mgr   │  Mgr   │Mgr │  │
│  └────┬───┴────┬──┴────┬───┴────┬──┴────┬──┴────┘  │
│       │        │       │        │       │           │
│  ┌────┴────────┴───────┴────────┴───────┴──────┐    │
│  │           基礎服務層 (Service Layer)            │    │
│  ├──────────┬──────────┬──────────┬─────────────┤   │
│  │ Asset Mgr│ Audio Mgr│Settings  │ Performance │   │
│  │          │          │ Store    │  Monitor    │   │
│  └──────────┴──────────┴──────────┴─────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 4.3 模組間通訊

採用**事件驅動架構**，模組間透過 EventBus 通訊，降低耦合：

```typescript
// EventBus 事件定義
interface GameEvents {
  // 場景事件
  'scene:loaded': { sceneId: string };
  'scene:transition': { from: string; to: string };
  'scene:safeZoneEnter': { zoneId: string };
  
  // 玩家事件
  'player:move': { position: Vector3; velocity: Vector3 };
  'player:interact': { targetId: string; type: string };
  'player:pause': void;
  'player:resume': void;
  
  // NPC 事件
  'npc:approach': { npcId: string; distance: number };
  'npc:interact': { npcId: string; dialogueId: string };
  'npc:dialogueStart': { npcId: string; treeId: string };
  'npc:dialogueEnd': { npcId: string; outcome: string };
  
  // 情緒事件
  'emotion:report': { level: number; category: string };
  'emotion:regulate': { strategy: string };
  'emotion:calm': { previousLevel: number; currentLevel: number };
  
  // 對話事件
  'dialogue:choice': { nodeId: string; choiceId: string };
  'dialogue:complete': { treeId: string; path: string[] };
  
  // 無障礙事件
  'accessibility:change': { key: string; value: any };
  'accessibility:sensoryReduce': { level: string };
  
  // 效能事件
  'performance:fpsDrop': { fps: number; threshold: number };
  'performance:qualityDowngrade': { reason: string };
}
```

### 4.4 核心類別介面

```typescript
// === GameEngine.ts ===
class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private sceneManager: SceneManager;
  private playerController: PlayerController;
  private npcManager: NPCManager;
  private dialogueManager: DialogueManager;
  private emotionManager: EmotionManager;
  private uiManager: UIManager;
  private accessibilityManager: AccessibilityManager;
  private eventBus: EventBus<GameEvents>;
  private renderLoop: RenderLoop;
  
  async init(config: GameConfig): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}

// === RenderLoop.ts ===
class RenderLoop {
  private clock: THREE.Clock;
  private isRunning: boolean;
  private timeScale: number;  // 0.5–1.0，支援慢速模式
  
  start(callback: (delta: number, elapsed: number) => void): void;
  stop(): void;
  setTimeScale(scale: number): void;
}

// === SceneManager.ts ===
class SceneManager {
  private currentScene: BaseScene | null;
  private scenes: Map<string, BaseScene>;
  private transitionManager: SceneTransition;
  
  async loadScene(sceneId: string): Promise<void>;
  async transitionTo(sceneId: string, options: TransitionOptions): Promise<void>;
  getCurrentScene(): BaseScene | null;
}

// === BaseScene.ts ===
abstract class BaseScene {
  protected scene: THREE.Scene;
  protected camera: THREE.PerspectiveCamera;
  protected environment: EnvironmentManager;
  protected hotspots: InteractionHotspot[];
  
  abstract load(): Promise<void>;
  abstract unload(): Promise<void>;
  abstract update(delta: number): void;
}
```

---

## 5. 3D 場景系統與內容管線

### 5.1 場景設計原則

```
街坊環境 (Neighborhood)
├── 安全區 (Safe Zone) — 起點與休息處
│   ├── 庭院花園 — 自然元素、平靜氛圍
│   └── 室內空間 — 可控制環境
│
├── 社交場景 (Social Scenarios)
│   ├── 社區公園 — 日常問候練習
│   ├── 街角商店 — 購物互動
│   ├── 學校入口 — 同儕相遇
│   ├── 社區中心 — 團體活動
│   └── 鄰居門口 — 拜訪情境
│
└── 過渡空間 (Transition Spaces)
    ├── 步道 — 平靜過渡
    └── 長椅區 — 可隨時休息
```

### 5.2 場景資料結構

```typescript
interface SceneConfig {
  id: string;
  name: string;                    // 多語系 key
  description: string;             // 場景描述（照護者可讀）
  environment: {
    skybox: string;               // 天空盒 ID
    lighting: LightingConfig;     // 光照設定
    ambientSound: string;          // 環境音 ID
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    weather: 'clear' | 'cloudy';   // 無極端天氣
  };
  npcs: NPCSpawnConfig[];          // NPC 生成設定
  hotspots: HotspotConfig[];      // 互動熱點
  safeZone: SafeZoneConfig;       // 安全区域
  sensoryProfile: SensoryProfile; // 感官設定檔
  difficulty: 'introductory' | 'guided' | 'independent';
}

interface LightingConfig {
  ambient: { color: string; intensity: number };  // 柔和環境光
  directional: { color: string; intensity: number; position: Vector3 };
  hemispheric: { skyColor: string; groundColor: string; intensity: number };
  shadows: boolean;               // 預設 false（效能與感官）
  fog: { color: string; near: number; far: number };  // 柔和霧效
}

interface SensoryProfile {
  maxPolyCount: number;           // 該場景最大多邊形數
  maxNpcVisible: number;          // 同時可見 NPC 數
  particleDensity: 'none' | 'minimal' | 'low';
  audioLayers: string[];          // 啟用的音訊圖層
  motionLevel: 'static' | 'minimal' | 'low';  // 動態元素量
}
```

### 5.3 安全區設計

安全區是玩家永遠可以返回的平靜空間：

```typescript
class SafeZone {
  private calmElements: CalmElement[];   // 平靜元素（植物、水景等）
  private breathingGuide: BreathingGuide; // 呼吸引導
  private emotionCheck: EmotionCheckIn;   // 情緒檢查點
  
  enter(): void {
    // 1. 降低保和度環境刺激
    // 2. 播放平靜環境音
    // 3. 顯示「你在這裡很安全」訊息
    // 4. 提供情緒調節工具
    // 5. 顯示視覺排程（下一步可做什麼）
  }
  
  provideBreathingExercise(): void;    // 呼吸練習
  provideEmotionCheckIn(): void;       // 情緒自評
  showVisualSchedule(): void;          // 視覺排程
  offerBreak(): void;                  // 休息選項
}
```

### 5.4 互動熱點系統

```typescript
class InteractionHotspot {
  position: Vector3;
  radius: number;                  // 互動範圍
  type: 'dialogue' | 'activity' | 'observation' | 'rest';
  
  // 視覺提示（低刺激）
  highlightMesh: THREE.Mesh;       // 柔和光暈，非閃爍
  promptText: string;             // 互動提示文字
  promptIcon: string;              // 圖示 ID
  
  // 可選預覽
  previewDescription: string;     // 預覽互動內容
  
  onEnter(): void;               // 進入範圍
  onExit(): void;                // 離開範圍
  onInteract(): void;            // 執行互動
}
```

---

## 6. 效能優化策略

### 6.1 效能預算

| 平台 | 目標 FPS | 畫質 | 多邊形預算 | Draw Call | 貼圖記憶 |
|------|---------|------|-----------|-----------|---------|
| 桌面（高效） | 60 FPS | 高 | 150K/場景 | <200 | <256MB |
| 桌面（一般） | 60 FPS | 中 | 80K/場景 | <150 | <128MB |
| 平板（高效） | 60 FPS | 中 | 60K/場景 | <100 | <128MB |
| 平板（入門） | 30 FPS | 低 | 30K/場景 | <60 | <64MB |

### 6.2 優化策略矩陣

```
┌─────────────────────────────────────────────────────────────┐
│                    效能優化策略                                  │
├───────────────┬─────────────────────────────────────────────┤
│  幾何體優化     │ • LOD（Level of Detail）多層級               │
│               │ • InstancedMesh 重複物件                     │
│               │ • 合併靜態網格（BufferGeometryUtils.merge）    │
│               │ • 簡化碰撞體（Box/Sphere 取代 Mesh）            │
│               │ • 多邊形預算控制                               │
├───────────────┼─────────────────────────────────────────────┤
│  材質/貼圖優化  │ • 貼圖壓縮（Basis Universal / KTX2）           │
│               │ • 貼圖尺寸上限：1024x1024（環境）/512x512（道具）│
│               │ • 材質共用池                                   │
│               │ • 程式化貼圖替代部分彩現貼圖                      │
│               │ • Mipmap 鏈                                   │
├───────────────┼─────────────────────────────────────────────┤
│  光照優化       │ • 烘焙光照貼圖（Baked Lightmaps）              │
│               │ • 預計算環境光（PMREM）                         │
│               │ • 限制動態光源數 ≤2                             │
│               │ • 陰影預設關閉，可選開啟                         │
│               │ • 霧效遮蔽遠處（減少渲染距離）                     │
├───────────────┼─────────────────────────────────────────────┤
│  渲染優化       │ • Frustum Culling（視錐剔除）                │
│               │ • Occlusion Culling（遮擋剔除，可選）           │
│               │ • 批次渲染（Batching）                          │
│               │ • 延遲渲染（Deferred）可選                      │
│               │ • Pixel Ratio 限制 ≤2                          │
│               │ • 抗鋸齒：MSAA 2x 或 FXAA                       │
├───────────────┼─────────────────────────────────────────────┤
│  資源管理       │ • 場景資源串流載入（分批）                     │
│               │ • 資源池（Object Pool）                         │
│               │ • 記憶體預算監控                                │
│               │ • 紋理快取 LRU 淘汰                             │
│               │ • 3D 模型 Draco 壓縮                           │
├───────────────┼─────────────────────────────────────────────┤
│  動態降級       │ • FPS 監控 + 自動畫質降級                     │
│               │ • 多邊形動態 LOD 切換                          │
│               │ • 貼圖解析度動態調整                             │
│               │ • 關閉非必要效果                                │
│               │ • NPC 數量動態削減                              │
└───────────────┴─────────────────────────────────────────────┘
```

### 6.3 動態效能管理器

```typescript
class PerformanceMonitor {
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private qualityLevel: number = 3;  // 1-5，5 最高
  private downgradeThreshold: number = 0.8;  // FPS 降至目標 80% 時觸發
  private upgradeThreshold: number = 0.95;  // FPS 達目標 95% 持續 5 秒升級
  
  update(delta: number, fps: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();
    
    const avgFps = this.getAverageFps();
    const targetFps = this.getTargetFps();
    
    if (avgFps < targetFps * this.downgradeThreshold) {
      this.downgradeQuality();
    } else if (avgFps > targetFps * this.upgradeThreshold) {
      this.considerUpgrade();
    }
  }
  
  private downgradeQuality(): void {
    // 降級優先順序：
    // 1. 關閉陰影
    // 2. 降低貼圖解析度
    // 3. 增加 LOD 距離（更早切換低模）
    // 4. 關閉粒子效果
    // 5. 降低渲染距離
    // 6. 僅在必要時削減 NPC 數量
  }
}
```

### 6.4 載入策略

```typescript
class AssetManager {
  private loadingManager: THREE.LoadingManager;
  private gltfLoader: GLTFLoader;
  private textureLoader: TextureLoader;
  private audioLoader: AudioLoader;
  private cache: Map<string, any>;
  
  // 分批載入策略
  async loadScene(sceneId: string, onProgress: (p: number) => void): Promise<void> {
    // Phase 1: 核心資源（場景骨架 + 第一個 NPC）
    await this.loadCriticalAssets(sceneId);
    
    // Phase 2: 次要資源（其他 NPC、裝飾物）
    this.loadSecondaryAssets(sceneId);  // 非阻塞
    
    // Phase 3: 預載下一場景
    this.preloadNextScene(sceneId);  // 非阻塞，低優先
  }
  
  // Draco 壓縮模型
  private setupLoaders(): void {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    this.gltfLoader.setDRACOLoader(dracoLoader);
    
    // KTX2 貼圖
    const ktx2Loader = new KTX2Loader();
    this.gltfLoader.setKTX2Loader(ktx2Loader);
  }
}
```

---

## 7. 低刺激感官視覺與柔和色彩規範

### 7.1 色彩系統

#### 核心色盤 — 低飽和柔和色系

```
┌────────────────────────────────────────────────────────────────┐
│                    色彩規範                                      │
├────────────────┬───────────────────────────────────────────────┤
│                │  HSL 範圍                                       │
│  飽和度 (S)     │  環境色：S 0.15–0.35                            │
│                │  互動色：S 0.30–0.45                            │
│                │  UI 文字：S 0.40–0.55                           │
│                │  禁止：S > 0.60                                  │
├────────────────┼───────────────────────────────────────────────┤
│                │  環境色：L 0.55–0.75                            │
│  亮度 (L)       │  互動色：L 0.50–0.65                            │
│                │  背景：L 0.65–0.80                              │
│                │  文字：L 0.25–0.35（深色文字 on 淺色背景）       │
├────────────────┼───────────────────────────────────────────────┤
│                │  相鄰色相差 ≥15°                                │
│  色相 (H)       │  互補色避免高飽和度                              │
│                │  同色系漸層優先                                  │
│                │  限制同場景色相數 ≤5                             │
└────────────────┴───────────────────────────────────────────────┘
```

#### 推薦色值

```typescript
const ASDColorPalette = {
  // 背景 — 柔和自然色
  sky:        { h: 210, s: 0.20, l: 0.72, hex: '#A8C4D4' },
  ground:     { h: 90,  s: 0.15, l: 0.65, hex: '#A5B89A' },
  building:   { h: 35,  s: 0.18, l: 0.70, hex: '#C4B49A' },
  foliage:    { h: 120, s: 0.20, l: 0.55, hex: '#7A9E7A' },
  
  // 互動提示 — 溫和暖色
  highlight:  { h: 45,  s: 0.40, l: 0.60, hex: '#C4A86A' },  // 柔和金色
  safeZone:   { h: 160, s: 0.25, l: 0.65, hex: '#7AB8A8' },  // 柔和青綠
  dialogue:   { h: 210, s: 0.25, l: 0.60, hex: '#7A9EC4' },  // 柔和藍
  
  // UI — 低對比柔和色
  uiBg:       { h: 40,  s: 0.10, l: 0.88, hex: '#E8E0D0' },
  uiText:     { h: 210, s: 0.15, l: 0.25, hex: '#3A4550' },
  uiAccent:   { h: 200, s: 0.30, l: 0.50, hex: '#5A8AAA' },
  uiSuccess:  { h: 140, s: 0.25, l: 0.50, hex: '#5A8A6A' },
  uiWarning:  { h: 40,  s: 0.35, l: 0.55, hex: '#B8995A' },
  
  // 情緒色 — 柔和版本
  emotion: {
    calm:    { h: 200, s: 0.20, l: 0.60, hex: '#7AAAB8' },
    happy:   { h: 50,  s: 0.35, l: 0.60, hex: '#B8AA6A' },
    sad:     { h: 220, s: 0.20, l: 0.55, hex: '#6A7AAA' },
    anxious: { h: 30,  s: 0.25, l: 0.58, hex: '#AA926A' },
    angry:   { h: 10,  s: 0.25, l: 0.55, hex: '#AA7A6A' },
    neutral: { h: 40,  s: 0.10, l: 0.60, hex: '#9A9080' },
  }
};
```

### 7.2 視覺規範

#### 禁止視覺元素

| 禁止項 | 原因 | 替代方案 |
|-------|------|---------|
| 高飽和色（S>0.6） | 視覺刺激過強 | 降飽和至 0.3-0.45 |
| 閃爍動畫（>3Hz） | 癲癇風險、感官超載 | 靜態或極慢漸變（≤1Hz） |
| 高對比閃光 | 視覺疲勞 | 柔和漸層過渡 |
| 紋理摩爾紋 | 視覺不適 | 簡化紋理或使用純色 |
| 鏡頭晃動（head bob） | 暈眩、前庭刺激 | 平滑移動、可關閉 |
| 動態模糊（motion blur） | 暈眩、感知混亂 | 關閉，使用清晰邊緣 |
| 深度景深（DoF）過強 | 聚焦困難 | 輕微或關閉 |
| 螢幕震動 | 驚嚇、焦慮 | 關閉 |
| 粒子大量噴發 | 視覺超載 | 極少量或關閉 |

#### 視覺提示規範

```typescript
interface VisualCueSpec {
  // 互動提示 — 柔和光暈
  interactionHighlight: {
    type: 'glow';                    // 光暈類型
    color: string;                   // 柔和金色
    intensity: number;               // 0.3–0.5，低強度
    pulseSpeed: number;              // ≤1Hz，極慢脈動
    pulse: boolean;                  // 是否脈動（可關閉）
  };
  
  // 方向指示 — 柔和箭頭
  directionIndicator: {
    type: 'arrow';                   // 箭頭類型
    color: string;                   // 柔和色
    opacity: number;                 // 0.4–0.6
    animation: 'none' | 'gentle-bob'; // 無動畫或輕柔浮動
  };
  
  // NPC 情緒指示 — 圖示
  emotionIndicator: {
    type: 'icon';                    // 圖示類型
    position: 'above-head';          // NPC 頭頂
    size: number;                    // 適中，不過大
    background: string;              // 柔和背景圓
    showName: boolean;               // 是否顯示 NPC 名稱
  };
  
  // 安全区標示
  safeZoneMarker: {
    type: 'aura';                    // 柔和光環
    color: string;                   // 柔和青綠
    intensity: number;               // 0.2–0.3
  };
}
```

### 7.3 光照規範

```typescript
interface LightingSpec {
  // 環境光 — 柔和均勻
  ambientLight: {
    color: '#E8E0D0';               // 暖白色
    intensity: 0.6;                 // 較高環境光，減少陰影對比
  };
  
  // 主光源 — 模擬自然日光
  mainLight: {
    color: '#FFF4E0';               // 暖日光色
    intensity: 0.5;                 // 中等強度
    shadows: false;                 // 預設關閉
  };
  
  // 半球光 — 平滑天空與地面過渡
  hemiLight: {
    skyColor: '#A8C4D4';
    groundColor: '#A5B89A';
    intensity: 0.4;
  };
  
  // 霧效 — 柔化遠景，減少視覺負擔
  fog: {
    color: '#C8D0C4';
    near: 20;                       // 近距離開始
    far: 80;                        // 遠距離完全遮蔽
  };
  
  // 後處理
  postProcessing: {
    toneMapping: 'ACESFilmic';      // 電影色調映射（柔和）
    toneMappingExposure: 1.0;
    bloom: { enabled: false };       // 關閉泛光
    vignette: { enabled: false };    // 關閉暗角
    colorGrading: 'soft';           // 柔和色彩分級
  };
}
```

### 7.4 音訊規範

```typescript
interface AudioSpec {
  // 環境音 — 低音量、自然音
  ambient: {
    nature: string[];               // 鳥鳴、風聲、流水
    volume: 0.15;                   // 極低音量
    loop: true;
    crossfade: 2.0;                 // 2 秒交叉淡入淡出
  };
  
  // 音效 — 限制種類與音量
  sfx: {
    maxConcurrent: 3;               // 同時最多 3 個音效
    volume: 0.3;
    compression: true;              // 動態範圍壓縮
    lowpass: 8000;                  // 低通濾波，去除高頻刺耳音
  };
  
  // 背景音樂 — 可選、極輕柔
  music: {
    enabled: false;                 // 預設關閉
    volume: 0.1;
    type: 'ambient-pad';            // 環境墊音
    tempo: 'slow';                  // 慢速
  };
  
  // 禁止音訊
  forbidden: [
    'sudden-loud',                   // 突發巨響
    'high-frequency-sharp',          // 高頻尖銳音
    'dissonant',                     // 不和諧音
    'alarm-sounds',                  // 警報聲
    'crowd-noise',                   // 嘈雜人群
  ];
}
```

---

## 8. NPC 及同儕互動腳本與對話樹設計

### 8.1 NPC 設計原則

```
NPC 行為設計準則
├── 可預測性
│   ├── 固定行程排程（可查看）
│   ├── 行為模式一致
│   └── 移動路徑可預期
├── 個人空間
│   ├── 保持互動距離（可調）
│   ├── 不主動靠近玩家
│   ├── 不包圍玩家
│   └── 有「等待」動畫（非站立不動）
├── 溝通支持
│   ├── 語速適中
│   ├── 可重播對話
│   ├── 情緒圖示可見
│   ├── 語氣標籤可選
│   └── 選項後果預覽可選
├── 互動邀請
│   ├── 柔和提示（非彈窗）
│   ├── 可選擇不互動
│   └── 離開後可回來
└── 修復腳本
    ├── 每個情境有修復路徑
    ├── NPC 不生氣、不指責
    └── 提供「再試一次」選項
```

### 8.2 NPC 資料結構

```typescript
interface NPCConfig {
  id: string;
  name: string;                     // 顯示名稱
  displayName: string;              // i18n key
  
  // 外觀
  appearance: {
    modelId: string;               // 3D 模型 ID
    paletteId: string;              // 色彩設定（柔和色系）
    scale: number;                 // 1.0，不誇張比例
  };
  
  // 行為
  behavior: {
    schedule: NPCSchedule;          // 日程排程
    movementPattern: 'static' | 'patrol' | 'wander-limited';
    patrolPath: Vector3[];         // 巡邏路徑（可預期）
    idleAnimation: string;         // 待機動畫
    interactionDistance: number;    // 互動距離（預設 3m）
    proximityStopDistance: number;  // 接近停止距離（預設 4m）
  };
  
  // 社交設定
  social: {
    personality: 'friendly' | 'neutral' | 'shy' | 'helpful';
    speechSpeed: 'slow' | 'normal';
    usesGesture: boolean;           // 是否使用手勢
    gestureIntensity: 'minimal' | 'low' | 'normal';
    emotionExpression: 'clear' | 'subtle';  // 情緒表達清晰度
  };
  
  // 對話樹引用
  dialogueTrees: string[];         // 對話樹 ID 列表
  
  // 安全設定
  safety: {
    neverApproachPlayer: boolean;   // 永不主動靠近
    maxInteractionTime: number;     // 最大互動時間（秒），避免疲勞
    cooldownAfterInteraction: number; // 互動後冷卻時間
  };
}

interface NPCSchedule {
  // 可預測的日程排程
  segments: {
    startTime: string;              // 如 "09:00"
    activity: string;               // 活動描述
    location: Vector3;             // 位置
    duration: number;              // 持續時間（秒）
  }[];
  visualSchedule: boolean;         // 是否顯示視覺排程
}
```

### 8.3 對話樹系統

```typescript
// === 對話樹資料結構 ===
interface DialogueTree {
  id: string;
  npcId: string;
  title: string;                    // 情境標題
  description: string;              // 情境描述（照護者可讀）
  
  // 情境設定
  context: {
    location: string;               // 場景位置
    socialGoal: string;             // 社交目標
    difficulty: 'introductory' | 'guided' | 'independent';
    emotionFocus: string[];         // 練習情緒類型
  };
  
  // 根節點
  rootNodeId: string;
  
  // 所有節點
  nodes: Record<string, DialogueNode>;
  
  // 後設資料
  metadata: {
    estimatedDuration: number;      // 預估時間（分鐘）
    requiresHelp: boolean;          // 是否需要照護者在場
    tags: string[];                 // 標籤（問候、分享、輪流等）
  };
}

// === 對話節點 ===
interface DialogueNode {
  id: string;
  
  // NPC 台詞
  npcLine: {
    text: string;                   // NPC 說的話（i18n key）
    audioId: string;                // 語音 ID（可選）
    emotion: EmotionType;            // NPC 當前情緒
    gesture: string;                // 手勢動畫 ID（可選）
    expression: string;              // 表情動畫 ID
  };
  
  // 玩家回應選項
  choices?: DialogueChoice[];
  
  // 或自動過渡（無選擇）
  nextNodeId?: string;
  
  // 情境支持
  supports?: {
    emotionIcon: boolean;           // 顯示情緒圖示
    toneTag: string;               // 語氣標籤（如「友善地」）
    consequencePreview?: string;    // 選項後果預覽
    helpHint?: string;              // 幫助提示
  };
  
  // 結束條件
  isEndNode?: boolean;
  endType?: 'positive' | 'neutral' | 'repair';
  
  // 修復路徑
  repairNodeId?: string;            // 失敗時跳轉的修復節點
}

// === 對話選項 ===
interface DialogueChoice {
  id: string;
  text: string;                     // 選項文字（i18n key）
  
  // 後果
  outcome: {
    nextNodeId: string;             // 下一個節點
    npcReaction: string;           // NPC 反應描述
    emotionChange?: {               // NPC 情緒變化
      from: EmotionType;
      to: EmotionType;
    };
    socialFeedback: string;        // 社交回饋（如「朋友覺得被重視」）
  };
  
  // 預覽（可選，設定控制）
  previewConsequence?: string;      // 後果預覽文字
  previewEmotion?: EmotionType;     // 預覽 NPC 可能情緒
  
  // 支持標籤
  tags: string[];                  // 如 ['polite', 'sharing']
  
  // 修復支援
  isRepairOption?: boolean;        // 是否為修復選項
}

type EmotionType = 'calm' | 'happy' | 'sad' | 'anxious' | 'angry' | 'neutral' | 'confused' | 'proud';
```

### 8.4 對話樹範例 — 社區公園問候情境

```yaml
dialogueTree:
  id: "park_greeting_01"
  npcId: "npc_boy_ming"
  title: "公園裡的問候"
  description: "在公園遇到鄰居小明，練習打招呼"
  context:
    location: "community_park"
    socialGoal: "練習主動打招呼"
    difficulty: "introductory"
    emotionFocus: ["calm", "happy"]
  metadata:
    estimatedDuration: 3
    requiresHelp: false
    tags: ["greeting", "eye_contact", "social_initiation"]

  rootNodeId: "node_01"

  nodes:
    node_01:
      npcLine:
        text: "嗨！你也來公園玩啊？"
        emotion: happy
        gesture: wave
        expression: smile
      supports:
        emotionIcon: true
        toneTag: "友善地"
      choices:
        - id: "choice_01a"
          text: "對啊，你好！"
          outcome:
            nextNodeId: "node_02"
            npcReaction: "小明笑著點頭"
            socialFeedback: "你友善地回應了打招呼"
          tags: ["polite", "reciprocal"]
          previewConsequence: "小明會覺得被重視"
          previewEmotion: happy

        - id: "choice_01b"
          text: "...（安靜地點頭）"
          outcome:
            nextNodeId: "node_03"
            npcReaction: "小明稍微停頓，但保持微笑"
            socialFeedback: "你用點頭回應了，這也是一種打招呼方式"
          tags: ["minimal_response"]
          previewConsequence: "小明會理解你比較安靜"
          previewEmotion: neutral

        - id: "choice_01c"
          text: "我需要幫助"
          outcome:
            nextNodeId: "node_help"
          tags: ["help_request"]

    node_02:
      npcLine:
        text: "太好了！你要一起玩嗎？"
        emotion: happy
        gesture: point_to_play_area
      choices:
        - id: "choice_02a"
          text: "好啊！"
          outcome:
            nextNodeId: "node_end_positive"
            socialFeedback: "你成功開始了一段社交互動"
          tags: ["acceptance", "play"]

        - id: "choice_02b"
          text: "我先在旁邊看看"
          outcome:
            nextNodeId: "node_end_neutral"
            socialFeedback: "選擇先觀察也是可以的"
          tags: ["observation"]

    node_03:
      npcLine:
        text: "沒關係，你慢慢來。我會在這裡玩。"
        emotion: calm
        expression: gentle_smile
      isEndNode: true
      endType: positive
      supports:
        emotionIcon: true
        toneTag: "溫和地"

    node_help:
      npcLine:
        text: "（系統提示：你可以選擇一個你覺得舒服的方式打招呼）"
      isEndNode: true
      endType: neutral

    node_end_positive:
      npcLine:
        text: "太棒了！我們走吧！"
        emotion: happy
      isEndNode: true
      endType: positive

    node_end_neutral:
      npcLine:
        text: "好的，隨時可以過來找我。"
        emotion: calm
      isEndNode: true
      endType: neutral

    # 修復節點 — 如果玩家選了不太合適的回應
    node_repair:
      npcLine:
        text: "沒關係，我們可以再試一次。你想要怎麼打招呼？"
        emotion: calm
        expression: encouraging
      isEndNode: true
      endType: repair
```

### 8.5 對話樹設計準則

```
對話樹設計準則
├── 選項數量
│   ├── 入門級：2 個選項
│   ├── 引導級：3 個選項
│   └── 獨立級：3-4 個選項
├── 選項類型（每個節點至少包含）
│   ├── 主動社交回應
│   ├── 最低限度回應（點頭、微笑等）
│   └── 請求幫助選項
├── 修復機制
│   ├── 每個「不太理想」的回應都有修復路徑
│   ├── NPC 不生氣、不指責
│   ├── 修復後可重試
│   └── 修復也是一種學習
├── 情緒可見性
│   ├── NPC 情緒圖示清晰
│   ├── 語氣標籤輔助理解
│   └── 玩家可選擇預覽後果
├── 無時間壓力
│   ├── 不設計時選項
│   ├── 可隨時暫停
│   └── 可重播 NPC 台詞
└── 正向結尾
    ├── 所有路徑都有正向結尾
    ├── 即使是「修復」路徑也是正向的
    └── 回饋具體且行為導向
```

### 8.6 NPC 行為腳本範例

```typescript
// NPC 行為腳本 — 可預測的日常模式
class NPCBehavior {
  private schedule: NPCSchedule;
  private currentState: NPCState;
  private player: PlayerController;
  private proximitySystem: ProximitySystem;
  
  update(delta: number): void {
    // 1. 檢查是否在互動中
    if (this.currentState === 'interacting') {
      return;  // 互動中不執行其他行為
    }
    
    // 2. 檢查玩家距離
    const distance = this.getDistanceToPlayer();
    if (distance < this.config.safety.proximityStopDistance) {
      // 如果玩家太近，NPC 停止移動（不後退、不逃跑）
      this.stopMoving();
      this.facePlayer();  // 面向玩家，但不主動靠近
      return;
    }
    
    // 3. 執行排程行為
    this.executeSchedule(delta);
    
    // 4. 檢查是否可以互動
    if (distance < this.config.behavior.interactionDistance) {
      this.showInteractionPrompt();
    } else {
      this.hideInteractionPrompt();
    }
  }
  
  // 永不主動靠近玩家
  private shouldApproachPlayer(): boolean {
    return false;  // NPC 永不主動靠近
  }
  
  // 互動開始
  onInteractionStart(dialogueTreeId: string): void {
    this.currentState = 'interacting';
    this.stopMoving();
    this.facePlayer();
    this.playIdleAnimation();
    
    // 設定互動超時（避免疲勞）
    this.interactionTimeout = setTimeout(() => {
      this.offerBreak();
    }, this.config.safety.maxInteractionTime * 1000);
  }
  
  // 互動結束
  onInteractionEnd(): void {
    this.currentState = 'idle';
    this.resumeSchedule();
    
    // 互動後冷卻
    setTimeout(() => {
      this.canInteract = true;
    }, this.config.safety.cooldownAfterInteraction * 1000);
  }
  
  // 提供休息
  private offerBreak(): void {
    // 顯示「需要休息一下嗎？」提示
    // 不強制結束，提供選擇
  }
}
```

---

## 9. 情緒調節回饋機制

### 9.1 設計原則

```
情緒調節迴圈設計準則
├── 自我報告優先
│   ├── 使用情緒滑桿/卡片自我評估
│   ├── 不從生物特徵推測情緒（除非明確同意）
│   └── 不使用攝影機進行情緒辨識
├── 迴圈結構
│   ├── 偵測/詢問 → 提供策略 → 練習 → 強化 → 恢復
│   └── 非線性，可隨時進入/退出
├── 策略庫
│   ├── 呼吸練習（4-7-8 呼吸法、方塊呼吸）
│   ├── 感官接地（5-4-3-2-1 技巧）
│   ├── 正向自我對話
│   ├── 安全空間想像
│   └── 身體掃描
├── 非侵入性
│   ├── 不在未詢問時彈出
│   ├── 可設定自動觸發間隔（預設關閉）
│   └── 可完全關閉
└── 正向強化
    ├── 具體、行為導向的鼓勵
    ├── 非分數制
    ├── 無比較
    └── 進步可視化（個人進步曲線，非排名）
```

### 9.2 情緒調節迴圈

```
┌──────────────────────────────────────────────────────────────┐
│              情緒調節迴圈 (Emotion Regulation Loop)               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────────┐     觸發條件：                                │
│   │  1. 情緒檢查  │     • 定期（可設定）                          │
│   │  Check-In    │     • 互動前後                                │
│   └──────┬──────┘     • 玩家主動                               │
│          │                                                    │
│          ▼                                                    │
│   ┌─────────────┐                                            │
│   │  2. 情緒自評  │  使用滑桿/卡片：                              │
│   │  Self-Report │  「你現在感覺怎麼樣？」                        │
│   └──────┬──────┘  平靜 ←──────→ 緊張                         │
│          │                                                    │
│          ▼                                                    │
│   ┌─────────────┐                                            │
│   │  3. 策略選擇  │  依情緒強度提供：                             │
│   │  Strategy    │  • 低：繼續                                  │
│   │  Selection   │  • 中：建議調節                              │
│   └──────┬──────┘  • 高：強烈建議調節                           │
│          │                                                    │
│          ▼                                                    │
│   ┌─────────────┐                                            │
│   │  4. 練習     │  引導練習：                                  │
│   │  Practice    │  • 呼吸動畫 + 語音引導                        │
│   └──────┬──────┘  • 視覺化輔助                                 │
│          │                                                    │
│          ▼                                                    │
│   ┌─────────────┐                                            │
│   │  5. 再評估    │  「現在你感覺怎麼樣？」                        │
│   │  Re-assess   │                                            │
│   └──────┬──────┘                                            │
│          │                                                    │
│          ▼                                                    │
│   ┌─────────────┐                                            │
│   │  6. 正向強化  │  具體鼓勵：                                  │
│   │  Reinforce   │  「你用了呼吸練習，這是很棒的選擇」              │
│   └──────┬──────┘                                            │
│          │                                                    │
│          ▼                                                    │
│   ┌─────────────┐                                            │
│   │  7. 恢復遊戲  │  回到街坊探索                                │
│   │  Resume      │                                            │
│   └─────────────┘                                            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 情緒系統架構

```typescript
// === EmotionManager.ts ===
class EmotionManager {
  private currentEmotion: PlayerEmotion;
  private emotionHistory: EmotionLog[];
  private regulationStrategies: RegulationStrategy[];
  private checkInInterval: number | null;
  
  // 情緒檢查
  async promptCheckIn(trigger: CheckInTrigger): Promise<PlayerEmotion> {
    // 顯示情緒滑桿/卡片
    // 不強制回應（可選擇「跳過」）
    const emotion = await this.uiManager.showEmotionSlider();
    this.recordEmotion(emotion, trigger);
    return emotion;
  }
  
  // 情緒調節
  async offerRegulation(emotion: PlayerEmotion): Promise<void> {
    if (emotion.intensity < REGULATION_THRESHOLD) {
      return;  // 情緒平穩，不需要調節
    }
    
    // 柔和提示，非強制
    const accepted = await this.uiManager.showRegulationPrompt();
    if (!accepted) {
      this.respectChoice();  // 尊重玩家不調節的選擇
      return;
    }
    
    // 提供策略選擇
    const strategy = await this.uiManager.showStrategyOptions(
      this.getRecommendedStrategies(emotion)
    );
    
    // 引導練習
    await this.guidePractice(strategy);
    
    // 再評估
    const newEmotion = await this.promptCheckIn('post_regulation');
    
    // 正向強化
    this.providePositiveFeedback(strategy, emotion, newEmotion);
    
    // 記錄
    this.recordRegulationSession(strategy, emotion, newEmotion);
  }
  
  // 呼吸練習引導
  async guideBreathingExercise(technique: BreathingTechnique): Promise<void> {
    // 視覺化：擴張/收縮圓圈
    // 語音引導：緩慢、平穩的語調
    // 可選文字提示
    // 無計時壓力
  }
}

// === 情緒資料結構 ===
interface PlayerEmotion {
  category: EmotionType;
  intensity: number;                // 0-10，0 最平靜
  timestamp: Date;
  trigger: CheckInTrigger;
}

interface EmotionLog {
  emotion: PlayerEmotion;
  regulationUsed?: string;
  emotionAfter?: PlayerEmotion;
  sessionContext: string;          // 當時場景
}

type CheckInTrigger = 
  | 'scheduled'      // 定期
  | 'pre_interaction' // 互動前
  | 'post_interaction' // 互動後
  | 'player_initiated' // 玩家主動
  | 'safe_zone'     // 安全区內
  | 'post_regulation'; // 調節後

// === 調節策略 ===
interface RegulationStrategy {
  id: string;
  name: string;                     // i18n key
  description: string;              // i18n key
  type: 'breathing' | 'grounding' | 'self_talk' | 'visualization' | 'body_scan';
  duration: number;                // 預估持續時間（秒）
  visualAid: string;               // 視覺輔助 ID
  audioGuide: string;              // 語音引導 ID（可選）
  difficulty: 'easy' | 'moderate';
  suitableFor: EmotionType[];       // 適用情緒類型
}
```

### 9.4 呼吸練習視覺化

```typescript
class BreathingGuide {
  private circle: THREE.Mesh;       // 擴張/收縮圓圈
  private phase: 'inhale' | 'hold' | 'exhale';
  private technique: BreathingTechnique;
  
  // 4-7-8 呼吸法
  start_4_7_8(): void {
    this.technique = {
      phases: [
        { type: 'inhale', duration: 4, label: '吸氣' },
        { type: 'hold', duration: 7, label: '停住' },
        { type: 'exhale', duration: 8, label: '吐氣' },
      ],
      cycles: 4,                    // 4 個循環
    };
    this.startGuide();
  }
  
  // 方塊呼吸法
  startBox(): void {
    this.technique = {
      phases: [
        { type: 'inhale', duration: 4, label: '吸氣' },
        { type: 'hold', duration: 4, label: '停住' },
        { type: 'exhale', duration: 4, label: '吐氣' },
        { type: 'hold', duration: 4, label: '停住' },
      ],
      cycles: 4,
    };
    this.startGuide();
  }
  
  // 視覺化
  private animateCircle(phase: string, duration: number): void {
    // 極慢、平滑的擴張/收縮動畫
    // 顏色：柔和青綠色
    // 無閃爍
    // 文字提示同步顯示
    // 可選語音同步引導
  }
}
```

---

## 10. 前端程式碼實作框架

### 10.1 技術棧

```
技術棧
├── 核心框架
│   ├── Three.js r160+（3D 渲染）
│   ├── TypeScript 5.x（型別安全）
│   ├── Vite 5.x（建構工具）
│   └── HTML5 + WebGL2
├── 狀態管理
│   ├── 自定義輕量狀態管理（EventBus + Store）
│   └── 或選用 Zustand（如需更複雜狀態）
├── UI 層
│   ├── HTML/CSS Overlay（HUD、對話框）
│   ├── DOM 元素與 Three.js Canvas 分層
│   └── CSS Variables 主題化
├── 資源
│   ├── GLTF + Draco（3D 模型）
│   ├── KTX2（貼圖壓縮）
│   ├── Web Audio API（音訊）
│   └── 本地 IndexedDB / LocalStorage（進度）
├── i18n
│   ├── JSON 語言檔
│   └── 支援 zh-TW 繁體中文
└── 品質
    ├── ESLint + Prettier
    ├── Vitest（單元測試）
    └── Playwright（E2E 測試，可選）
```

### 10.2 進入點與初始化

```typescript
// === main.ts ===
import { GameEngine } from './core/GameEngine';
import { GameConfig } from './config/game.config';
import { AccessibilityManager } from './accessibility/AccessibilityManager';

async function main() {
  // 1. 載入無障礙設定（優先）
  const accessibility = new AccessibilityManager();
  await accessibility.init();
  const settings = accessibility.getSettings();
  
  // 2. 初始化遊戲引擎
  const engine = new GameEngine();
  await engine.init({
    canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
    accessibility: settings,
    sceneId: 'safe_zone',  // 從安全區開始
    quality: detectQuality(),
  });
  
  // 3. 載入 UI 層
  engine.initUI();
  
  // 4. 啟動
  engine.start();
  
  // 5. 顯示歡迎訊息
  engine.showWelcome();
}

function detectQuality(): QualityLevel {
  // 偵測裝置能力
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return 'low';
  
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
  
  const memory = (navigator as any).deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  
  if (memory >= 8 && cores >= 8) return 'high';
  if (memory >= 4 && cores >= 4) return 'medium';
  return 'low';
}

main().catch(console.error);
```

### 10.3 GameEngine 實作

```typescript
// === core/GameEngine.ts ===
import * as THREE from 'three';
import { RenderLoop } from './RenderLoop';
import { EventBus, GameEvents } from './EventBus';
import { SceneManager } from '../scene/SceneManager';
import { PlayerController } from '../player/PlayerController';
import { NPCManager } from '../npc/NPCManager';
import { DialogueManager } from '../dialogue/DialogueManager';
import { EmotionManager } from '../emotion/EmotionManager';
import { UIManager } from '../ui/UIManager';
import { AccessibilityManager } from '../accessibility/AccessibilityManager';
import { AssetManager } from '../systems/AssetManager';
import { AudioManager } from '../systems/AudioManager';
import { PerformanceMonitor } from '../systems/PerformanceMonitor';

interface GameConfig {
  canvas: HTMLCanvasElement;
  accessibility: AccessibilitySettings;
  sceneId: string;
  quality: QualityLevel;
}

export class GameEngine {
  // Three.js 核心
  private renderer!: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  
  // 模組
  private eventBus: EventBus<GameEvents>;
  private renderLoop: RenderLoop;
  private sceneManager: SceneManager;
  private playerController: PlayerController;
  private npcManager: NPCManager;
  private dialogueManager: DialogueManager;
  private emotionManager: EmotionManager;
  private uiManager: UIManager;
  private accessibilityManager: AccessibilityManager;
  private assetManager: AssetManager;
  private audioManager: AudioManager;
  private performanceMonitor: PerformanceMonitor;
  
  // 狀態
  private isPaused: boolean = false;
  private isInitialized: boolean = false;

  async init(config: GameConfig): Promise<void> {
    // === 渲染器 ===
    this.renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: config.quality !== 'low',
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    
    // 套用無障礙設定
    const settings = config.accessibility;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = settings.brightness;
    this.renderer.shadowMap.enabled = false;  // 預設關閉
    
    // === 事件匯流排 ===
    this.eventBus = new EventBus<GameEvents>();
    
    // === 基礎服務 ===
    this.assetManager = new AssetManager(this.eventBus);
    this.audioManager = new AudioManager(settings, this.eventBus);
    this.performanceMonitor = new PerformanceMonitor(config.quality);
    
    // === 模組 ===
    this.uiManager = new UIManager(this.eventBus, settings);
    this.sceneManager = new SceneManager(
      this.renderer, this.eventBus, this.assetManager, settings
    );
    this.playerController = new PlayerController(
      this.renderer.domElement, this.eventBus, settings
    );
    this.npcManager = new NPCManager(this.eventBus, this.assetManager, settings);
    this.dialogueManager = new DialogueManager(this.eventBus, this.uiManager);
    this.emotionManager = new EmotionManager(this.eventBus, this.uiManager);
    this.accessibilityManager = new AccessibilityManager();
    this.accessibilityManager.load();
    
    // === 渲染迴圈 ===
    this.renderLoop = new RenderLoop();
    if (settings.reducedMotion) {
      this.renderLoop.setTimeScale(0.5);
    }
    
    // === 載入初始場景 ===
    await this.sceneManager.loadScene(config.sceneId);
    
    // === 事件監聽 ===
    this.setupEventListeners();
    
    this.isInitialized = true;
  }
  
  start(): void {
    if (!this.isInitialized) throw new Error('Engine not initialized');
    this.renderLoop.start((delta, elapsed) => {
      if (this.isPaused) return;
      
      this.sceneManager.update(delta);
      this.playerController.update(delta);
      this.npcManager.update(delta);
      this.dialogueManager.update(delta);
      this.emotionManager.update(delta);
      
      this.performanceMonitor.update(delta);
      this.renderer.render(
        this.sceneManager.getCurrentScene()!.scene,
        this.sceneManager.getCurrentScene()!.camera
      );
    });
  }
  
  pause(): void {
    this.isPaused = true;
    this.eventBus.emit('player:pause', undefined);
    this.audioManager.pauseAll();
  }
  
  resume(): void {
    this.isPaused = false;
    this.eventBus.emit('player:resume', undefined);
    this.audioManager.resumeAll();
  }
  
  private setupEventListeners(): void {
    // FPS 降級
    this.eventBus.on('performance:fpsDrop', (data) => {
      this.downgradeQuality(data.reason);
    });
    
    // 情緒調節觸發
    this.eventBus.on('emotion:report', (data) => {
      this.emotionManager.offerRegulation(data);
    });
    
    // 無障礙設定變更
    this.eventBus.on('accessibility:change', (data) => {
      this.applyAccessibilityChange(data.key, data.value);
    });
  }
  
  private applyAccessibilityChange(key: string, value: any): void {
    switch (key) {
      case 'brightness':
        this.renderer.toneMappingExposure = value;
        break;
      case 'masterVolume':
        this.audioManager.setMasterVolume(value);
        break;
      case 'reducedMotion':
        this.renderLoop.setTimeScale(value ? 0.5 : 1.0);
        break;
      // ... 其他設定
    }
  }
  
  dispose(): void {
    this.renderLoop.stop();
    this.sceneManager.dispose();
    this.playerController.dispose();
    this.npcManager.dispose();
    this.dialogueManager.dispose();
    this.emotionManager.dispose();
    this.uiManager.dispose();
    this.renderer.dispose();
    this.eventBus.clear();
  }
}
```

### 10.4 第一人稱控制器（防暈眩）

```typescript
// === player/FirstPersonCamera.ts ===
import * as THREE from 'three';

export class FirstPersonCamera {
  private camera: THREE.PerspectiveCamera;
  private yaw: number = 0;
  private pitch: number = 0;
  
  // 防暈眩設定
  private fov: number = 70;          // 限制 FOV
  private moveSpeed: number = 3.0;  // 較慢速度
  private acceleration: number = 5.0; // 平滑加速
  private deceleration: number = 8.0; // 平滑減速
  private sensitivity: number = 0.002; // 較低靈敏度
  private pitchLimit: number = 0.4;  // 限制俯仰角度
  private headBobEnabled: boolean = false; // 預設關閉
  private headBobAmount: number = 0;
  
  private velocity: THREE.Vector3;
  private targetVelocity: THREE.Vector3;
  private isLocked: boolean = false;
  
  init(camera: THREE.PerspectiveCamera, settings: AccessibilitySettings): void {
    this.camera = camera;
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    
    // 套用無障礙設定
    this.moveSpeed = settings.movementSpeed * 3.0;
    this.headBobEnabled = settings.cameraBob;
    this.sensitivity = settings.reducedMotion ? 0.001 : 0.002;
  }
  
  update(delta: number, input: InputState): void {
    if (this.isLocked) return;
    
    // === 旋轉（平滑） ===
    this.yaw -= input.mouseDeltaX * this.sensitivity;
    this.pitch -= input.mouseDeltaY * this.sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -this.pitchLimit, this.pitchLimit);
    
    // 平滑旋轉插值
    const targetEuler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.slerp(
      new THREE.Quaternion().setFromEuler(targetEuler),
      0.15  // 平滑因子
    );
    
    // === 移動（平滑加速/減速） ===
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    this.targetVelocity.set(0, 0, 0);
    if (input.forward) this.targetVelocity.add(forward);
    if (input.backward) this.targetVelocity.sub(forward);
    if (input.right) this.targetVelocity.sub(right);
    if (input.left) this.targetVelocity.add(right);
    
    this.targetVelocity.multiplyScalar(this.moveSpeed);
    
    // 平滑加速/減速
    const accel = this.targetVelocity.length() > 0 ? this.acceleration : this.deceleration;
    this.velocity.lerp(this.targetVelocity, accel * delta);
    
    // 應用移動
    this.camera.position.addScaledVector(this.velocity, delta);
    
    // 頭部晃動（可關閉）
    if (this.headBobEnabled && this.velocity.length() > 0.1) {
      this.headBobAmount += delta * 8;
      const bob = Math.sin(this.headBobAmount) * 0.02;  // 極小幅度
      this.camera.position.y = this.baseHeight + bob;
    }
  }
  
  // 暫停時停止移動
  lock(): void {
    this.isLocked = true;
    this.targetVelocity.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
  }
  
  unlock(): void {
    this.isLocked = false;
  }
}

// === player/MovementSystem.ts ===
export class MovementSystem {
  private camera: FirstPersonCamera;
  private inputState: InputState;
  private isPointerLocked: boolean = false;
  private touchControls: TouchControls | null = null;
  
  constructor(canvas: HTMLCanvasElement, camera: FirstPersonCamera) {
    this.camera = camera;
    this.inputState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      mouseDeltaX: 0,
      mouseDeltaY: 0,
    };
    
    this.setupKeyboardControls(canvas);
    this.setupMouseControls(canvas);
    this.setupTouchControls(canvas);
  }
  
  private setupMouseControls(canvas: HTMLCanvasElement): void {
    // 可選 pointer lock（不強制）
    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked && !this.touchControls?.isActive) {
        canvas.requestPointerLock?.();
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.inputState.mouseDeltaX = e.movementX;
        this.inputState.mouseDeltaY = e.movementY;
      }
    });
  }
  
  private setupTouchControls(canvas: HTMLCanvasElement): void {
    // 觸控控制（平板支援）
    // 左半邊：移動虛擬搖桿
    // 右半邊：視角控制
    this.touchControls = new TouchControls(canvas);
    this.touchControls.onMove((dx, dy) => {
      this.inputState.mouseDeltaX = dx;
      this.inputState.mouseDeltaY = dy;
    });
  }
}
```

### 10.5 對話管理器實作

```typescript
// === dialogue/DialogueManager.ts ===
export class DialogueManager {
  private eventBus: EventBus<GameEvents>;
  private currentTree: DialogueTree | null = null;
  private currentNode: DialogueNode | null = null;
  private nodeHistory: string[] = [];
  private isActive: boolean = false;
  private dialogueUI: DialogueUI;
  
  // 開始對話
  startDialogue(treeId: string, npcId: string): void {
    this.currentTree = this.loadDialogueTree(treeId);
    if (!this.currentTree) return;
    
    this.isActive = true;
    this.currentNode = this.currentTree.nodes[this.currentTree.rootNodeId];
    this.nodeHistory = [];
    
    this.eventBus.emit('npc:dialogueStart', { npcId, treeId });
    this.showCurrentNode();
  }
  
  private showCurrentNode(): void {
    if (!this.currentNode) return;
    
    // 顯示 NPC 台詞
    this.dialogueUI.showNPCLine({
      text: this.currentNode.npcLine.text,
      emotion: this.currentNode.npcLine.emotion,
      gesture: this.currentNode.npcLine.gesture,
      toneTag: this.currentNode.supports?.toneTag,
      emotionIcon: this.currentNode.supports?.emotionIcon ?? true,
    });
    
    // 顯示選項
    if (this.currentNode.choices && this.currentNode.choices.length > 0) {
      this.dialogueUI.showChoices(
        this.currentNode.choices.map(c => ({
          id: c.id,
          text: c.text,
          previewConsequence: c.previewConsequence,
          previewEmotion: c.previewEmotion,
        }))
      );
    }
    
    // 可重播按鈕
    this.dialogueUI.enableReplay();
    
    // 幫助按鈕
    this.dialogueUI.enableHelp();
  }
  
  // 處理選擇
  onChoiceSelected(choiceId: string): void {
    if (!this.currentNode?.choices) return;
    
    const choice = this.currentNode.choices.find(c => c.id === choiceId);
    if (!choice) return;
    
    // 記錄路徑
    this.nodeHistory.push(this.currentNode.id);
    
    // 發出事件
    this.eventBus.emit('dialogue:choice', {
      nodeId: this.currentNode.id,
      choiceId: choice.id,
    });
    
    // 處理結果
    const outcome = choice.outcome;
    
    // 顯示 NPC 反應
    this.dialogueUI.showNPCReaction(outcome.npcReaction, outcome.emotionChange);
    
    // 顯示社交回饋
    this.dialogueUI.showSocialFeedback(outcome.socialFeedback);
    
    // 切換到下一節點
    setTimeout(() => {
      if (this.currentTree!.nodes[outcome.nextNodeId]) {
        this.currentNode = this.currentTree!.nodes[outcome.nextNodeId];
        this.showCurrentNode();
      }
    }, this.getTransitionDelay());
  }
  
  // 結束對話
  endDialogue(): void {
    if (!this.currentTree) return;
    
    this.eventBus.emit('dialogue:complete', {
      treeId: this.currentTree.id,
      path: this.nodeHistory,
    });
    
    this.isActive = false;
    this.currentTree = null;
    this.currentNode = null;
    this.dialogueUI.hide();
  }
  
  // 重播當前台詞
  replayCurrentLine(): void {
    this.showCurrentNode();
  }
  
  // 請求幫助
  requestHelp(): void {
    this.dialogueUI.showHelpHint(
      this.currentNode?.supports?.helpHint || 
      '你可以選擇一個你覺得舒服的回應方式'
    );
  }
  
  // 退出對話（隨時可退出）
  exitDialogue(): void {
    this.endDialogue();
    this.eventBus.emit('npc:dialogueEnd', {
      npcId: '',
      outcome: 'player_exited',
    });
  }
}
```

### 10.6 UI 層實作

```typescript
// === ui/UIManager.ts ===
export class UIManager {
  private root: HTMLElement;
  private overlay: HTMLElement;
  private dialogueBox: DialogueBox;
  private hud: HUDOverlay;
  private settingsPanel: SettingsPanel;
  private emotionSlider: EmotionSlider;
  private pauseMenu: PauseMenu;
  private eventBus: EventBus<GameEvents>;
  private settings: AccessibilitySettings;
  
  constructor(eventBus: EventBus<GameEvents>, settings: AccessibilitySettings) {
    this.eventBus = eventBus;
    this.settings = settings;
    this.root = document.getElementById('ui-root')!;
    this.overlay = this.createOverlay();
    
    this.dialogueBox = new DialogueBox(this.overlay, settings);
    this.hud = new HUDOverlay(this.overlay, settings);
    this.settingsPanel = new SettingsPanel(this.overlay, settings);
    this.emotionSlider = new EmotionSlider(this.overlay, settings);
    this.pauseMenu = new PauseMenu(this.overlay, settings);
    
    this.setupListeners();
  }
  
  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = 'ui-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 10;
      font-family: var(--font-family, 'Noto Sans TC', sans-serif);
    `;
    this.root.appendChild(overlay);
    return overlay;
  }
}

// === ui/DialogueBox.ts ===
export class DialogueBox {
  private element: HTMLElement;
  private npcName: HTMLElement;
  private npcText: HTMLElement;
  private choicesContainer: HTMLElement;
  private emotionIcon: HTMLElement;
  private toneTag: HTMLElement;
  private replayButton: HTMLElement;
  private helpButton: HTMLElement;
  private exitButton: HTMLElement;
  
  constructor(parent: HTMLElement, settings: AccessibilitySettings) {
    this.element = this.createElement(settings);
    parent.appendChild(this.element);
    this.bindElements();
  }
  
  private createElement(settings: AccessibilitySettings): HTMLElement {
    const box = document.createElement('div');
    box.className = 'dialogue-box';
    box.style.cssText = `
      position: absolute;
      bottom: 5%;
      left: 50%;
      transform: translateX(-50%);
      width: min(90%, 600px);
      background: var(--ui-bg, #E8E0D0);
      color: var(--ui-text, #3A4550);
      border-radius: 16px;
      padding: 20px 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      pointer-events: auto;
      display: none;
      font-size: ${this.getFontSize(settings.fontSize)};
      line-height: 1.6;
    `;
    return box;
  }
  
  showNPCLine(data: NPCLineData): void {
    this.element.style.display = 'block';
    this.npcName.textContent = data.npcName;
    this.npcText.textContent = data.text;
    
    // 情緒圖示
    if (data.emotionIcon) {
      this.emotionIcon.textContent = this.getEmotionIcon(data.emotion);
      this.emotionIcon.style.display = 'inline';
    } else {
      this.emotionIcon.style.display = 'none';
    }
    
    // 語氣標籤
    if (data.toneTag) {
      this.toneTag.textContent = `（${data.toneTag}）`;
      this.toneTag.style.display = 'inline';
    } else {
      this.toneTag.style.display = 'none';
    }
    
    // 文字速度控制
    if (settings.textSpeed === 'slow') {
      this.typeTextSlowly(data.text);
    }
  }
  
  showChoices(choices: ChoiceData[]): void {
    this.choicesContainer.innerHTML = '';
    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-choice';
      btn.style.cssText = `
        display: block;
        width: 100%;
        margin: 8px 0;
        padding: 12px 16px;
        background: var(--ui-bg-alt, #F0E8D8);
        color: var(--ui-text, #3A4550);
        border: 2px solid var(--ui-accent, #5A8AAA);
        border-radius: 12px;
        cursor: pointer;
        font-size: inherit;
        text-align: left;
        transition: background 0.3s ease;
      `;
      btn.textContent = choice.text;
      
      // 後果預覽（可選）
      if (choice.previewConsequence && this.settings.showConsequencePreview) {
        const preview = document.createElement('div');
        preview.style.cssText = 'font-size: 0.85em; opacity: 0.7; margin-top: 4px;';
        preview.textContent = `→ ${choice.previewConsequence}`;
        btn.appendChild(preview);
      }
      
      btn.addEventListener('click', () => {
        this.onChoiceSelected?.(choice.id);
      });
      
      this.choicesContainer.appendChild(btn);
    });
  }
}
```

### 10.7 CSS 主題變數

```css
/* === styles/theme.css === */
:root {
  /* 字型 */
  --font-family: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  
  /* 背景色 */
  --ui-bg: #E8E0D0;
  --ui-bg-alt: #F0E8D8;
  --ui-bg-dark: #D8D0C0;
  
  /* 文字色 */
  --ui-text: #3A4550;
  --ui-text-light: #5A6570;
  --ui-text-inverse: #E8E0D0;
  
  /* 互動色 */
  --ui-accent: #5A8AAA;
  --ui-accent-hover: #4A7A9A;
  --ui-success: #5A8A6A;
  --ui-warning: #B8995A;
  
  /* 情緒色 */
  --emotion-calm: #7AAAB8;
  --emotion-happy: #B8AA6A;
  --emotion-sad: #6A7AAA;
  --emotion-anxious: #AA926A;
  --emotion-angry: #AA7A6A;
  --emotion-neutral: #9A9080;
  
  /* 尺寸 */
  --border-radius: 12px;
  --border-radius-lg: 16px;
  --spacing-unit: 8px;
  
  /* 動畫 */
  --transition-speed: 0.3s;
  --transition-ease: cubic-bezier(0.4, 0, 0.2, 1);
}

/* 字型大小 */
[data-font-size="small"] { font-size: 14px; }
[data-font-size="medium"] { font-size: 16px; }
[data-font-size="large"] { font-size: 18px; }

/* 高對比文字 */
[data-high-contrast="true"] {
  --ui-text: #1A2530;
  --ui-bg: #F0E8D8;
}

/* 互動元素 */
.dialogue-choice {
  border: 2px solid var(--ui-accent);
  border-radius: var(--border-radius);
  padding: 12px 16px;
  background: var(--ui-bg-alt);
  color: var(--ui-text);
  cursor: pointer;
  transition: background var(--transition-speed) var(--transition-ease);
  font-family: var(--font-family);
  font-size: inherit;
  text-align: left;
}

.dialogue-choice:hover {
  background: var(--ui-bg-dark);
}

.dialogue-choice:focus {
  outline: 3px solid var(--ui-accent);
  outline-offset: 2px;
}

/* 永遠可見的退出按鈕 */
.exit-button {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--ui-bg-alt);
  border: 2px solid var(--ui-accent);
  color: var(--ui-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

/* 情緒滑桿 */
.emotion-slider {
  position: fixed;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  width: min(90%, 400px);
}
```

---

## 11. 資料模型與進度系統

### 11.1 進度追蹤

```typescript
interface PlayerProgress {
  // 完成的情境
  completedScenarios: {
    scenarioId: string;
    completionDate: Date;
    dialoguePath: string[];
    emotionBefore: PlayerEmotion;
    emotionAfter: PlayerEmotion;
    regulationUsed?: string;
    duration: number;
  }[];
  
  // 技能進展（非分數，而是「練習次數」與「完成度」）
  skillProgress: {
    skillId: string;                // 如 "greeting", "sharing"
    practiceCount: number;
    completedScenarios: number;
    lastPracticed: Date;
  }[];
  
  // 情緒調節使用記錄
  regulationHistory: {
    strategy: string;
    emotionBefore: number;          // 強度 0-10
    emotionAfter: number;
    date: Date;
  }[];
  
  // 個人進步曲線
  progressCurve: {
    date: Date;
    overallComfort: number;        // 整體舒適度自評
  }[];
}
```

### 11.2 本地儲存策略

```typescript
class LocalStorage {
  private dbName: string = 'asd_social_game';
  private version: number = 1;
  
  // 使用 IndexedDB
  async save<T>(key: string, data: T): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(['store'], 'readwrite');
    tx.objectStore('store').put(data, key);
    await tx.done;
  }
  
  async load<T>(key: string): Promise<T | null> {
    const db = await this.openDB();
    const tx = db.transaction(['store'], 'readonly');
    return tx.objectStore('store').get(key);
  }
  
  // 資料匯出（給照護者）
  async exportProgress(): Promise<string> {
    const progress = await this.load<PlayerProgress>('progress');
    const settings = await this.load<AccessibilitySettings>('settings');
    
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      progress,
      settings,
      version: this.version,
    }, null, 2);
  }
}
```

---

## 12. 隱私、倫理與臨床注意事項

### 12.1 隱私原則

```
隱私保護原則
├── 資料最小化
│   ├── 僅儲存必要的進度資料
│   ├── 不收集生物特徵資料（除非明確同意且有必要）
│   ├── 不使用攝影機進行情緒辨識
│   └── 不收集位置資訊
├── 本地優先
│   ├── 所有進度資料儲存在本地（IndexedDB）
│   ├── 遠端分析需明確同意
│   └── 遠端資料匿名化
├── 照護者控制
│   ├── 進度資料可匯出
│   ├── 可設定密碼保護設定
│   └── 可完全清除資料
└── 透明性
    ├── 清楚說明收集哪些資料
    ├── 說明資料如何使用
    └── 不與第三方分享
```

### 12.2 倫理與臨床注意事項

```
倫理與臨床注意事項
├── 非醫療工具聲明
│   ├── 本系統非醫療診斷或治療工具
│   ├── 不聲稱治療效果
│   ├── 不替代專業評估或介入
│   └── 建議在照護者或專業人員陪同下使用
├── 使用建議
│   ├── 單次使用時間建議 15-30 分鐘
│   ├── 注意觀察兒童反應
│   ├── 如出現不適應立即停止
│   └── 定期與專業人員討論進展
├── 內容審查
│   ├── 所有社交情境由專業人員審核
│   ├── 情緒調節策略使用循證方法
│   ├── NPC 行為符合社會適當性
│   └── 對話內容經兒童發展專業審核
├── 安全機制
│   ├── 兒童無法存取照護者設定（密碼保護）
│   ├── 無外部連結或廣告
│   ├── 無社交功能（不與其他玩家互動）
│   └── 無應用內購買
└── 多元文化考量
    ├── NPC 設計多元但避免刻板印象
    ├── 社交情境符合本地文化
    ├── 對話內容適齡
    └── 尊重不同溝通方式
```

---

## 13. 測試與驗收清單

### 13.1 功能測試清單

| 類別 | 測試項目 | 驗收標準 |
|------|---------|---------|
| 場景載入 | 場景正確載入 | <3秒，無閃爍 |
| 場景切換 | 場景平滑過渡 | 無黑屏，淡入淡出 |
| 玩家移動 | 平滑移動 | 無突停、無抖動 |
| 相機控制 | 視角平滑 | 無暈眩感 |
| 互動 | 互動熱點正確觸發 | 距離正確，提示出現 |
| NPC 行為 | NPC 行為可預測 | 排程正確，不主動靠近 |
| 對話 | 對話樹正確運行 | 選項正確，路徑正確 |
| 對話重播 | 可重播當前台詞 | 正確重播 |
| 情緒檢查 | 情緒滑桿可用 | 可選擇、可跳過 |
| 呼吸練習 | 呼吸引導正確 | 動畫同步、節奏正確 |
| 設定面板 | 所有設定可調 | 即時生效 |
| 暫停 | 暫停功能正常 | 遊戲停止、UI 顯示 |
| 退出 | 隨時可退出 | 一鍵返回安全區 |
| 進度儲存 | 進度正確儲存 | 重啟後恢復 |
| 資料匯出 | 匯出功能正常 | JSON 格式正確 |

### 13.2 無障礙測試清單

| 測試項目 | 驗收標準 |
|---------|---------|
| 降飽和模式 | 色彩飽和度降低，不影響辨識 |
| 降低動態 | 動畫速度降低或停止 |
| 關閉頭部晃動 | 移動時無垂直晃動 |
| 關閉動態模糊 | 畫面清晰無模糊 |
| 字型大小 | 三種大小正確顯示 |
| 高對比文字 | 文字對比度提高 |
| 情緒圖示 | 圖示正確顯示 |
| 語氣標籤 | 標籤正確顯示 |
| 後果預覽 | 預覽正確顯示 |
| 視覺排程 | 排程正確顯示 |
| NPC 距離 | 互動距離可調 |
| NPC 數量 | 可見數量受限 |
| 音量控制 | 各音軌獨立控制 |
| 觸控支援 | 平板觸控可用 |

### 13.3 效能測試

| 平台 | FPS 目標 | 載入時間 | 記憶體 |
|------|---------|---------|--------|
| 桌面高效 | 60 FPS | <3秒 | <512MB |
| 桌面一般 | 60 FPS | <5秒 | <256MB |
| 平板高效 | 60 FPS | <5秒 | <256MB |
| 平板入門 | 30 FPS | <8秒 | <128MB |

### 13.4 安全測試

| 測試項目 | 驗收標準 |
|---------|---------|
| 無跳嚇元素 | 確認無突發驚嚇 |
| 無計時壓力 | 確認無強制計時 |
| 無懲罰機制 | 確認無負向計分 |
| 無排行榜 | 確認無比較功能 |
| 退出按鈕可見 | 所有畫面可見 |
| 設定密碼保護 | 兒童無法修改 |
| 無外部連結 | 確認無外連 |
| 無廣告 | 確認無廣告 |

---

## 附錄 A：第三方套件建議

| 套件 | 用途 | 版本 |
|------|------|------|
| three | 3D 渲染 | ^0.160 |
| typescript | 型別系統 | ^5.3 |
| vite | 建構工具 | ^5.0 |
| gltf-pipeline | GLTF 優化 | ^4.0 |
| draco3dgltf | Draco 壓縮 | ^1.5 |
| howler.js | 音訊播放 | ^2.2 |
| i18next | 國際化 | ^23.0 |
| idb | IndexedDB 封裝 | ^8.0 |
| stats.js | 效能監控（開發） | ^0.17 |

---

## 附錄 B：開發里程碑建議

| 階段 | 內容 | 預估時間 |
|------|------|---------|
| Phase 0 | 專案設定、建構工具、基礎框架 | 1 週 |
| Phase 1 | Three.js 渲染器、場景管理、基礎場景 | 2 週 |
| Phase 2 | 第一人稱控制器、移動系統 | 1 週 |
| Phase 3 | NPC 系統、行為腳本 | 2 週 |
| Phase 4 | 對話系統、對話樹、UI | 2 週 |
| Phase 5 | 情緒調節系統、呼吸練習 | 1 週 |
| Phase 6 | 無障礙系統、設定面板 | 1 週 |
| Phase 7 | 資源管理、效能優化 | 2 週 |
| Phase 8 | 進度系統、資料管理 | 1 週 |
| Phase 9 | 場景內容製作、NPC 腳本 | 3 週 |
| Phase 10 | 測試、優化、打磨 | 2 週 |
| **合計** | | **約 18 週** |

---

*本藍圖為架構設計文件，實際開發時應配合兒童發展專業人員、特殊教育工作者及臨床心理師的意見進行調整。所有社交情境與情緒調節策略應經專業審核後實施。*
