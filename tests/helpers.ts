import type { RendererLike } from '../src/core/GameEngine';
import type { FrameScheduler } from '../src/core/RenderLoop';

/** 手動推進的 RAF 替身：tick(time) 執行目前排隊的回呼。 */
export class FakeScheduler implements FrameScheduler {
  private nextId = 1;
  private readonly pending = new Map<number, (timeMs: number) => void>();
  requestCount = 0;

  get pendingCount(): number {
    return this.pending.size;
  }

  request(callback: (timeMs: number) => void): number {
    const id = this.nextId++;
    this.requestCount += 1;
    this.pending.set(id, callback);
    return id;
  }

  cancel(id: number): void {
    this.pending.delete(id);
  }

  tick(timeMs: number): void {
    const callbacks = [...this.pending.values()];
    this.pending.clear();
    for (const callback of callbacks) callback(timeMs);
  }
}

export class FakeRenderer implements RendererLike {
  renderCount = 0;
  disposeCount = 0;
  size: [number, number] = [0, 0];
  pixelRatio = 0;

  setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
  }

  setSize(width: number, height: number): void {
    this.size = [width, height];
  }

  render(): void {
    this.renderCount += 1;
  }

  dispose(): void {
    this.disposeCount += 1;
  }
}

/** 只需要事件能力的 canvas 替身；node 環境沒有真實 canvas。 */
export function fakeCanvas(): HTMLCanvasElement {
  return new EventTarget() as HTMLCanvasElement;
}
