import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import type { Camera, Scene } from 'three';
import { FirstPersonController } from '../input/FirstPersonController';
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
  readonly scheduler?: FrameScheduler;
  readonly settings?: EngineSettings;
  readonly getDevicePixelRatio?: () => number;
  readonly onStateChange?: (state: EngineState) => void;
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
      this.park?.resetToSafety();
      this.movement?.syncCamera();
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
      park = new ParkScene();
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
      this.movement = new FirstPersonController(this.park.camera);
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
    this.movement?.setEnabled(true);
    this.setState('running');
    this.loop.start(this.frame);
  }

  // 移動與繪製共用唯一 RAF；暫停時兩者皆停止。
  private readonly frame: FrameCallback = ({ delta }) => {
    try {
      this.movement?.update(delta);
      this.renderOnce();
    } catch (error: unknown) {
      this.handleRenderError(error);
    }
  };

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
