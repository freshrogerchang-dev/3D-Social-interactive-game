import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import type { Camera, Scene } from 'three';
import type { Expression } from '../dialogue/Scenario';
import { FirstPersonController } from '../input/FirstPersonController';
import { NEIGHBORHOOD_BOUNDS, PLACES } from '../scene/Neighborhood';
import type { Place, WorldSnapshot } from '../scene/Neighborhood';
import { Vector3, Quaternion } from 'three';
import { ParkScene } from '../scene/ParkScene';
import { RenderLoop } from './RenderLoop';
import type { FrameCallback, FrameScheduler } from './RenderLoop';
import { DEFAULT_SETTINGS } from './settings';
import type { EngineSettings } from './settings';

export type EngineState =
  'new' | 'initializing' | 'ready' | 'running' | 'paused' | 'error' | 'disposed';

/** 引擎實際用到的 renderer 能力；測試以替身實作。 */
export interface RendererLike {
  setPixelRatio(ratio: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  render(scene: Scene, camera: Camera): void;
  dispose(): void;
}

export type RendererFactory = (canvas: HTMLCanvasElement) => RendererLike | Promise<RendererLike>;

export type InitResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'failed'; readonly error: unknown }
  | { readonly ok: false; readonly reason: 'disposed' };

export type ErrorReason = 'init-failed' | 'context-lost' | 'render-failed';

export interface GameEngineOptions {
  readonly rendererFactory?: RendererFactory;
  readonly loadEnvironmentTextures?: boolean;
  readonly scheduler?: FrameScheduler;
  readonly settings?: EngineSettings;
  readonly getDevicePixelRatio?: () => number;
  readonly onStateChange?: (state: EngineState) => void;
  /** 目前靠近的人物 id；沒有靠近任何人時為 null。 */
  readonly onNPCPresence?: (nearId: string | null) => void;
  readonly onWorldFrame?: (snapshot: WorldSnapshot) => void;
  readonly onPerformance?: (fps: number) => void;
  readonly onError?: (reason: ErrorReason, error: unknown) => void;
}

/** 正式環境的 renderer：WebGL2（three r163 起不支援 WebGL1），寫實管線用 sRGB 輸出與色調映射（Q6）。 */
export const createWebGLRenderer: RendererFactory = (canvas) => {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  return renderer;
};

/**
 * 生命週期：new → initializing → ready → running ⇄ paused；任何狀態都可 dispose。
 * 不使用計時器；暫停時停止 RAF，恢復後第一幀 delta=0。
 */
export class GameEngine {
  private currentState: EngineState = 'new';
  private initPromise: Promise<InitResult> | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: RendererLike | null = null;
  private park: ParkScene | null = null;
  private movement: FirstPersonController | null = null;
  /** undefined：尚未計算；null：沒有靠近任何人。 */
  private npcNear: string | null | undefined = undefined;
  private monitoring = false;
  private interacting = false;
  private mapOpen = false;
  private worldHelping = false;
  private worldPlace: Place | null = null;
  private worldNode: string | null = null;
  private nearPlace: Place | null = null;
  private savedPosition: Vector3 | null = null;
  private savedRotation: Quaternion | null = null;
  private monitorStart = 0;
  private monitorFrames = 0;
  private readonly loop: RenderLoop;
  private readonly rendererFactory: RendererFactory;
  private readonly settings: EngineSettings;
  private readonly getDevicePixelRatio: () => number;
  private width = 0;
  private height = 0;

  constructor(private readonly options: GameEngineOptions = {}) {
    this.loop = new RenderLoop(options.scheduler);
    this.rendererFactory = options.rendererFactory ?? createWebGLRenderer;
    this.settings = options.settings ?? DEFAULT_SETTINGS;
    this.getDevicePixelRatio = options.getDevicePixelRatio ?? (() => globalThis.devicePixelRatio);
  }

  get state(): EngineState {
    return this.currentState;
  }

  /** 累計模擬秒數，不含暫停期間。 */
  get elapsed(): number {
    return this.loop.elapsed;
  }

  /** 初始化中重複呼叫會共用同一個 Promise；只有 new 狀態能開始初始化。 */
  init(canvas: HTMLCanvasElement): Promise<InitResult> {
    if (this.currentState === 'initializing' && this.initPromise) return this.initPromise;
    if (this.currentState !== 'new') {
      return Promise.reject(new Error(`GameEngine.init() 不能在 ${this.currentState} 狀態呼叫`));
    }
    this.initPromise = this.runInit(canvas);
    return this.initPromise;
  }

  /** ready → running。其他狀態不動作，回傳是否已在執行。 */
  start(): boolean {
    if (this.currentState === 'running') return true;
    if (this.currentState !== 'ready') return false;
    this.runLoop();
    return true;
  }

  pause(): boolean {
    if (this.currentState === 'paused') return true;
    if (this.currentState !== 'running') return false;
    this.loop.stop();
    this.movement?.setEnabled(false);
    this.setState('paused');
    return true;
  }

  /** 只允許 paused → running；第一幀 delta=0。 */
  resume(): boolean {
    if (this.currentState === 'running') return true;
    if (this.currentState !== 'paused') return false;
    this.runLoop();
    return true;
  }

  /** 分頁隱藏時暫停；回到前景不自動恢復，等玩家按「繼續」。 */
  handleVisibilityChange(hidden: boolean): void {
    if (hidden) this.pause();
  }

  /**
   * running／paused：相機回到安全姿態，畫一次靜態畫面後保持 paused。
   * 其他狀態回傳 false，由 UI 以 DOM 休息畫面接管。
   */
  returnToSafety(): boolean {
    if (this.currentState !== 'running' && this.currentState !== 'paused') return false;
    this.loop.stop();
    try {
      this.movement?.setEnabled(false);
      for (const character of this.park?.characters ?? []) {
        character.playGesture(null);
        character.setExpression('neutral', false);
      }
      this.finishWorldPractice();
      this.park?.neighborhood.reset();
      this.park?.resetToSafety();
      this.movement?.syncCamera();
      this.updateNPCPresence();
      if (this.park) {
        this.nearPlace = this.park.neighborhood.nearest(
          this.park.camera.position,
          this.nearPlace?.id,
        );
        if (this.worldNode === 'road-walk')
          this.park.neighborhood.follow(
            this.park.camera.position,
            (this.savedPosition?.x ?? 0) < 22,
          );
        const snapshot = this.getWorldSnapshot();
        if (snapshot) this.options.onWorldFrame?.(snapshot);
      }
      this.renderOnce();
      this.setState('paused');
      return true;
    } catch (error: unknown) {
      this.handleRenderError(error);
      return false;
    }
  }

  resize(width: number, height: number): void {
    this.width = Math.floor(width);
    this.height = Math.floor(height);
    try {
      this.applySize();
    } catch (error: unknown) {
      this.handleRenderError(error);
    }
  }

  setInteractionActive(active: boolean): void {
    this.interacting = active;
    this.syncMovement();
  }

  private syncMovement(): void {
    const walking = this.worldNode === 'road-walk' || this.worldNode === 'toilet-find';
    this.movement?.setEnabled(
      this.currentState === 'running' &&
        !this.mapOpen &&
        !this.worldHelping &&
        (!this.interacting || walking),
    );
  }
  setWorldHelping(helping: boolean): void {
    this.worldHelping = helping;
    this.syncMovement();
  }
  setMapOpen(open: boolean): void {
    this.mapOpen = open;
    this.syncMovement();
  }
  beginWorldPractice(place: Place): boolean {
    if (
      this.currentState !== 'running' ||
      !this.park ||
      this.interacting ||
      this.park.neighborhood.distanceTo(place, this.park.camera.position) > 2.6
    )
      return false;
    this.worldPlace = place;
    this.savedPosition = this.park.camera.position.clone();
    this.savedRotation = this.park.camera.quaternion.clone();
    return true;
  }
  setWorldNode(node: string | null): void {
    if (!this.park || !this.worldPlace) return;
    if (node === null) {
      this.finishWorldPractice();
      return;
    }
    if (this.worldNode === 'dining-eat' && node !== 'dining-eat') this.restorePose();
    if (node === 'dining-eat' && this.worldNode !== node) {
      this.park.camera.position.set(28.4, 1.05, -4.5);
      this.park.camera.lookAt(30, 0.1, -5.5);
      this.movement?.syncCamera();
    }
    if (node === 'road-start') {
      if (this.worldNode === 'road-end') {
        this.savedPosition = this.park.camera.position.clone();
        this.savedRotation = this.park.camera.quaternion.clone();
      }
      this.park.neighborhood.crossingOpen = false;
      this.park.neighborhood.companion.root.position.set(
        (this.savedPosition?.x ?? 0) >= 22 ? 25.4 : 18.6,
        0,
        -5.7,
      );
    }
    this.worldNode = node;
    if (node === 'road-walk') this.park.neighborhood.crossingOpen = true;
    this.park.neighborhood.applyNode(node);
    this.syncMovement();
  }
  canAdvanceWorld(target: string): boolean {
    if (!this.park || !this.worldPlace) return true;
    if (target === 'road-end' && this.worldNode === 'road-walk')
      return this.savedPosition && this.savedPosition.x >= 22
        ? this.park.camera.position.x <= 19.2
        : this.park.camera.position.x >= 24.8;
    if (target === 'toilet-ready' && this.worldNode === 'toilet-find') {
      const toilet = PLACES.find((p) => p.id === 'toilet');
      return Boolean(
        toilet &&
        Math.hypot(this.park.camera.position.x - toilet.x, this.park.camera.position.z - toilet.z) <
          2.2,
      );
    }
    return true;
  }
  getWorldSnapshot(): WorldSnapshot | null {
    if (!this.park) return null;
    const camera = this.park.camera;
    const direction = new Vector3();
    camera.getWorldDirection(direction);
    return {
      x: camera.position.x,
      z: camera.position.z,
      heading: Math.atan2(-direction.x, -direction.z),
      place: this.nearPlace,
      travelReady: this.canAdvanceWorld(
        this.worldNode === 'road-walk' ? 'road-end' : 'toilet-ready',
      ),
    };
  }
  private restorePose(): void {
    if (this.park && this.savedPosition && this.savedRotation) {
      this.park.camera.position.copy(this.savedPosition);
      this.park.camera.quaternion.copy(this.savedRotation);
      this.movement?.syncCamera();
    }
  }
  private finishWorldPractice(): void {
    if (this.worldNode === 'dining-eat') this.restorePose();
    if (this.worldNode === 'road-end' && this.park) this.park.neighborhood.crossingOpen = false;
    this.worldHelping = false;
    this.worldPlace = null;
    this.worldNode = null;
    this.savedPosition = null;
    this.savedRotation = null;
    this.park?.neighborhood.applyNode(null);
    this.syncMovement();
  }

  /** 指定人物做一次動作；沒有指定時為小安。null 會停止所有人物的動作。 */
  setNPCGesture(gesture: 'wave' | 'nod' | null, motionEnabled = true, characterId?: string): void {
    for (const character of this.park?.everyone ?? []) {
      character.setMotionEnabled(motionEnabled);
      if (gesture === null) character.playGesture(null);
    }
    if (gesture === null) return;
    const id = characterId ?? this.park?.npc.id;
    this.park?.characters.find((character) => character.id === id)?.playGesture(gesture);
  }

  /** 指定人物換表情；沒有指定時為小安。null 讓所有人物回到平常的表情。 */
  setNPCExpression(expression: Expression | null, characterId?: string, animate = true): void {
    const characters = this.park?.characters ?? [];
    if (expression === null) {
      for (const character of characters) character.setExpression('neutral', animate);
      return;
    }
    const id = characterId ?? this.park?.npc.id;
    characters.find((character) => character.id === id)?.setExpression(expression, animate);
  }

  setPerformanceMonitoring(enabled: boolean): void {
    this.monitoring = enabled;
    this.monitorStart = performance.now();
    this.monitorFrames = 0;
  }

  setEnvironmentDetail(level: 'low' | 'standard'): void {
    this.park?.environment.setDetailLevel(level);
  }

  private applySize(): void {
    if (!this.renderer || !this.park || this.width <= 0 || this.height <= 0) return;
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(this.width, this.height, false);
    this.park.resize(this.width, this.height);
    // 不在執行中時只重畫一次靜態畫面，不更新模擬。
    if (this.currentState === 'ready' || this.currentState === 'paused') this.renderOnce();
  }

  /** 可重複呼叫；disposed 後此實例不能重新啟動。 */
  dispose(): void {
    if (this.currentState === 'disposed') return;
    this.loop.stop();
    this.canvas?.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas = null;
    this.releaseResources();
    this.setState('disposed');
  }

  private async runInit(canvas: HTMLCanvasElement): Promise<InitResult> {
    this.setState('initializing');
    let park: ParkScene | null = null;
    let renderer: RendererLike | null = null;
    try {
      park = new ParkScene(this.options.loadEnvironmentTextures ?? false);
      renderer = await this.rendererFactory(canvas);

      // 初始化期間被 dispose：晚到的資源直接釋放，不能再啟動。
      if (this.isDisposed()) {
        park.dispose();
        renderer.dispose();
        return { ok: false, reason: 'disposed' };
      }

      this.park = park;
      this.renderer = renderer;
      // 將所有權交給引擎，catch 不再透過區域變數重複釋放。
      park = null;
      renderer = null;
      this.canvas = canvas;
      this.movement = new FirstPersonController(
        this.park.camera,
        [
          ...this.park.characters.map((character) => character.obstacle),
          ...this.park.obstacles,
          ...this.park.neighborhood.obstacles,
        ],
        (x, z) => this.park?.neighborhood.canWalk(x, z) ?? false,
        NEIGHBORHOOD_BOUNDS,
      );
      this.movement.attach(canvas);
      canvas.addEventListener('webglcontextlost', this.handleContextLost);
      this.setState('ready');
      // 初始化例外由 runInit 捕獲，與執行期 resize 的錯誤邊界分開。
      this.applySize();
      return this.isDisposed() ? { ok: false, reason: 'disposed' } : { ok: true };
    } catch (error: unknown) {
      park?.dispose();
      renderer?.dispose();
      this.loop.stop();
      this.canvas?.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvas = null;
      this.releaseResources();
      if (this.isDisposed()) return { ok: false, reason: 'disposed' };
      this.setState('error');
      this.options.onError?.('init-failed', error);
      return { ok: false, reason: 'failed', error };
    }
  }

  private runLoop(): void {
    this.monitorStart = performance.now();
    this.monitorFrames = 0;
    this.setState('running');
    this.syncMovement();
    this.loop.start(this.frame);
  }

  // 移動與繪製共用唯一 RAF；暫停時兩者皆停止。
  private readonly frame: FrameCallback = ({ delta }) => {
    try {
      this.movement?.update(delta);
      for (const character of this.park?.everyone ?? []) character.update(delta);
      this.updateNPCPresence();
      if (this.park) {
        this.nearPlace = this.park.neighborhood.nearest(
          this.park.camera.position,
          this.nearPlace?.id,
        );
        if (this.worldNode === 'road-walk')
          this.park.neighborhood.follow(
            this.park.camera.position,
            (this.savedPosition?.x ?? 0) < 22,
          );
        const snapshot = this.getWorldSnapshot();
        if (snapshot) this.options.onWorldFrame?.(snapshot);
      }
      this.renderOnce();
      if (this.monitoring) {
        this.monitorFrames += 1;
        const elapsed = performance.now() - this.monitorStart;
        if (elapsed >= 1000) {
          this.options.onPerformance?.(Math.round((this.monitorFrames * 1000) / elapsed));
          this.monitorStart = performance.now();
          this.monitorFrames = 0;
        }
      }
    } catch (error: unknown) {
      this.handleRenderError(error);
    }
  };

  /** 取最近且在靠近範圍內的人物；目前靠近的人物用較寬的離開門檻，避免邊界反覆切換。 */
  private updateNPCPresence(): void {
    if (!this.park) return;
    const position = this.park.camera.position;
    let nearest: string | null = null;
    let nearestDistance = Infinity;
    for (const character of this.park.characters) {
      if (!character.isNear(position, character.id === this.npcNear)) continue;
      const distance = character.distanceTo(position);
      if (distance < nearestDistance) {
        nearest = character.id;
        nearestDistance = distance;
      }
    }
    if (nearest === this.npcNear) return;
    this.npcNear = nearest;
    this.options.onNPCPresence?.(nearest);
  }

  private handleRenderError(error: unknown): void {
    if (this.currentState === 'disposed' || this.currentState === 'error') return;
    this.loop.stop();
    this.canvas?.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas = null;
    this.releaseResources();
    this.setState('error');
    this.options.onError?.('render-failed', error);
  }

  private renderOnce(): void {
    if (!this.renderer || !this.park || this.width <= 0 || this.height <= 0) return;
    this.renderer.render(this.park.scene, this.park.camera);
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    if (this.currentState === 'disposed' || this.currentState === 'error') return;
    this.loop.stop();
    this.movement?.setEnabled(false);
    this.setState('error');
    this.options.onError?.('context-lost', event);
  };

  private releaseResources(): void {
    this.npcNear = undefined;
    this.worldHelping = false;
    this.worldPlace = null;
    this.worldNode = null;
    this.nearPlace = null;
    this.savedPosition = null;
    this.savedRotation = null;
    this.movement?.dispose();
    this.movement = null;
    this.park?.dispose();
    this.renderer?.dispose();
    this.park = null;
    this.renderer = null;
  }

  private pixelRatio(): number {
    const ratio = this.getDevicePixelRatio();
    return Math.min(Number.isFinite(ratio) && ratio > 0 ? ratio : 1, this.settings.maxPixelRatio);
  }

  private isDisposed(): boolean {
    return this.currentState === 'disposed';
  }

  private setState(state: EngineState): void {
    if (this.currentState === state) return;
    this.currentState = state;
    this.options.onStateChange?.(state);
  }
}
