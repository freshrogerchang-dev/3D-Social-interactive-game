/** 排程器介面：瀏覽器用 requestAnimationFrame，測試注入替身。 */
export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(id: number): void;
}

export interface FrameInfo {
  /** 本幀經過的模擬秒數；啟動或恢復後的第一幀一定是 0。 */
  readonly delta: number;
  /** 累計模擬秒數，不含停止（暫停）期間。 */
  readonly elapsed: number;
}

export type FrameCallback = (frame: FrameInfo) => void;

/** 長時間失焦或卡頓後不補跑：單幀最多前進這麼多秒。 */
export const MAX_FRAME_DELTA = 0.05;

export const browserScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => {
    cancelAnimationFrame(id);
  },
};

/**
 * 單一 RAF 迴圈。重複 start 不會多開 RAF；stop 後時間基準清除，
 * 下次 start 的第一幀 delta 為 0，elapsed 不包含停止期間。
 */
export class RenderLoop {
  private rafId: number | null = null;
  private lastTimeMs: number | null = null;
  private elapsedSeconds = 0;
  private frame: FrameCallback | null = null;

  constructor(
    private readonly scheduler: FrameScheduler = browserScheduler,
    private readonly maxDelta: number = MAX_FRAME_DELTA,
  ) {}

  get running(): boolean {
    return this.rafId !== null;
  }

  get elapsed(): number {
    return this.elapsedSeconds;
  }

  start(frame: FrameCallback): void {
    this.frame = frame;
    if (this.rafId !== null) return;
    this.lastTimeMs = null;
    this.rafId = this.scheduler.request(this.tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      this.scheduler.cancel(this.rafId);
      this.rafId = null;
    }
    this.lastTimeMs = null;
    this.frame = null;
  }

  private readonly tick = (timeMs: number): void => {
    const frame = this.frame;
    if (this.rafId === null || frame === null) return;

    const delta =
      this.lastTimeMs === null
        ? 0
        : Math.min(Math.max((timeMs - this.lastTimeMs) / 1000, 0), this.maxDelta);
    this.lastTimeMs = timeMs;
    this.elapsedSeconds += delta;

    // 先排下一幀，回呼中呼叫 stop() 時會一併取消。
    this.rafId = this.scheduler.request(this.tick);
    frame({ delta, elapsed: this.elapsedSeconds });
  };
}
