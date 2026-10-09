import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../../src/core/GameEngine';
import type { EngineState, GameEngineOptions, RendererLike } from '../../src/core/GameEngine';
import { FakeRenderer, FakeScheduler, fakeCanvas } from '../helpers';
import { ParkScene } from '../../src/scene/ParkScene';

afterEach(() => {
  vi.restoreAllMocks();
});

function setup(overrides: Partial<GameEngineOptions> = {}) {
  const scheduler = new FakeScheduler();
  const renderer = new FakeRenderer();
  const states: EngineState[] = [];
  const errors: string[] = [];
  const engine = new GameEngine({
    scheduler,
    rendererFactory: () => renderer,
    getDevicePixelRatio: () => 3,
    onStateChange: (state) => states.push(state),
    onError: (reason) => errors.push(reason),
    ...overrides,
  });
  engine.resize(800, 600);
  return { scheduler, renderer, states, errors, engine, canvas: fakeCanvas() };
}

async function runningEngine() {
  const context = setup();
  await context.engine.init(context.canvas);
  context.engine.start();
  return context;
}

describe('GameEngine 生命週期', () => {
  it('依序經過 initializing → ready → running', async () => {
    const { engine, states, canvas, renderer } = setup();
    const result = await engine.init(canvas);
    expect(result).toEqual({ ok: true });
    expect(engine.start()).toBe(true);
    expect(states).toEqual(['initializing', 'ready', 'running']);
    // pixelRatio 上限 2；尺寸在 init 前設定，初始化後套用。
    expect(renderer.pixelRatio).toBe(2);
    expect(renderer.size).toEqual([800, 600]);
  });

  it('init 完成前不能 start', () => {
    const { engine } = setup();
    expect(engine.start()).toBe(false);
    expect(engine.state).toBe('new');
  });

  it('初始化中重複呼叫 init 共用同一個 Promise', async () => {
    const { engine, canvas } = setup();
    const first = engine.init(canvas);
    expect(engine.init(canvas)).toBe(first);
    await first;
  });

  it('重複 start／resume 只有一個 RAF', async () => {
    const { engine, scheduler } = await runningEngine();
    engine.start();
    engine.resume();
    expect(scheduler.pendingCount).toBe(1);
    engine.pause();
    engine.resume();
    engine.resume();
    expect(scheduler.pendingCount).toBe(1);
  });

  it('暫停時不更新也不繪製', async () => {
    const { engine, scheduler, renderer } = await runningEngine();
    scheduler.tick(0);
    scheduler.tick(16);
    expect(engine.pause()).toBe(true);
    const rendersAtPause = renderer.renderCount;
    const elapsedAtPause = engine.elapsed;
    scheduler.tick(32);
    scheduler.tick(48);
    expect(renderer.renderCount).toBe(rendersAtPause);
    expect(engine.elapsed).toBe(elapsedAtPause);
    expect(scheduler.pendingCount).toBe(0);
  });

  it('恢復後第一幀 delta 為 0，elapsed 不含暫停期間', async () => {
    const { engine, scheduler } = await runningEngine();
    scheduler.tick(0);
    scheduler.tick(16);
    engine.pause();
    engine.resume();
    scheduler.tick(90_000);
    expect(engine.elapsed).toBeCloseTo(0.016);
    scheduler.tick(90_010);
    expect(engine.elapsed).toBeCloseTo(0.026);
  });

  it('分頁隱藏時暫停，回到前景不自動恢復', async () => {
    const { engine, scheduler } = await runningEngine();
    engine.handleVisibilityChange(true);
    expect(engine.state).toBe('paused');
    engine.handleVisibilityChange(false);
    expect(engine.state).toBe('paused');
    expect(scheduler.pendingCount).toBe(0);
  });

  it('returnToSafety 重設相機、畫一次並保持暫停', async () => {
    const { engine, renderer, scheduler } = await runningEngine();
    const before = renderer.renderCount;
    expect(engine.returnToSafety()).toBe(true);
    expect(engine.state).toBe('paused');
    expect(renderer.renderCount).toBe(before + 1);
    expect(scheduler.pendingCount).toBe(0);
    // 已暫停時也可以返回安全區。
    expect(engine.returnToSafety()).toBe(true);
    expect(engine.state).toBe('paused');
  });

  it('尚未初始化或出錯時 returnToSafety 交給 DOM 處理', () => {
    const { engine } = setup();
    expect(engine.returnToSafety()).toBe(false);
  });

  it('暫停中 resize 只重畫一次，不重新啟動迴圈', async () => {
    const { engine, renderer, scheduler } = await runningEngine();
    engine.pause();
    const before = renderer.renderCount;
    engine.resize(1024, 768);
    expect(renderer.size).toEqual([1024, 768]);
    expect(renderer.renderCount).toBe(before + 1);
    expect(scheduler.pendingCount).toBe(0);
    engine.resize(0, 0);
    expect(renderer.renderCount).toBe(before + 1);
  });
});

describe('GameEngine 釋放與錯誤', () => {
  it.each(['frame', 'setPixelRatio', 'setSize', 'paused-render', 'safety'] as const)(
    '執行期 %s 拋錯會停止 RAF、釋放資源並進入 error',
    async (phase) => {
      const { engine, renderer, scheduler, canvas, errors } = await runningEngine();
      const disposePark = vi.spyOn(ParkScene.prototype, 'dispose');
      const method = phase === 'setPixelRatio' || phase === 'setSize' ? phase : 'render';
      vi.spyOn(renderer, method).mockImplementation(() => {
        throw new Error('執行期 renderer 例外');
      });

      if (phase === 'frame')
        expect(() => {
          scheduler.tick(16);
        }).not.toThrow();
      else if (phase === 'safety') expect(engine.returnToSafety()).toBe(false);
      else {
        if (phase === 'paused-render') engine.pause();
        expect(() => {
          engine.resize(320, 568);
        }).not.toThrow();
      }

      expect(engine.state).toBe('error');
      expect(errors).toEqual(['render-failed']);
      expect(scheduler.pendingCount).toBe(0);
      expect(renderer.disposeCount).toBe(1);
      expect(disposePark).toHaveBeenCalledTimes(1);
      expect(engine.resume()).toBe(false);
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      scheduler.tick(32);
      engine.dispose();
      expect(errors).toEqual(['render-failed']);
      expect(renderer.disposeCount).toBe(1);
      expect(disposePark).toHaveBeenCalledTimes(1);

      const retry = await runningEngine();
      expect(retry.engine.state).toBe('running');
      retry.engine.dispose();
    },
  );

  it.each(['setPixelRatio', 'setSize', 'render'] as const)(
    '初始化的 %s 拋錯時顯示失敗結果並釋放部分資源',
    async (method) => {
      const failure = new Error(`${method} 無法完成`);
      const { engine, renderer, canvas, errors, scheduler } = setup();
      const disposePark = vi.spyOn(ParkScene.prototype, 'dispose');
      vi.spyOn(renderer, method).mockImplementation(() => {
        throw failure;
      });

      await expect(engine.init(canvas)).resolves.toEqual({
        ok: false,
        reason: 'failed',
        error: failure,
      });
      expect(engine.state).toBe('error');
      expect(errors).toEqual(['init-failed']);
      expect(renderer.disposeCount).toBe(1);
      expect(disposePark).toHaveBeenCalledTimes(1);
      expect(scheduler.pendingCount).toBe(0);
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      expect(errors).toEqual(['init-failed']);
      engine.dispose();
      expect(renderer.disposeCount).toBe(1);
      expect(disposePark).toHaveBeenCalledTimes(1);
    },
  );

  it('ready 回呼中 dispose 不會讓 init 回傳成功', async () => {
    const renderer = new FakeRenderer();
    const engine = new GameEngine({
      rendererFactory: () => renderer,
      onStateChange: (state) => {
        if (state === 'ready') engine.dispose();
      },
    });
    await expect(engine.init(fakeCanvas())).resolves.toEqual({
      ok: false,
      reason: 'disposed',
    });
    expect(renderer.disposeCount).toBe(1);
    expect(engine.state).toBe('disposed');
  });

  it('dispose 可重複呼叫，資源只釋放一次，之後不能重啟', async () => {
    const { engine, renderer, scheduler, states } = await runningEngine();
    engine.dispose();
    engine.dispose();
    expect(renderer.disposeCount).toBe(1);
    expect(scheduler.pendingCount).toBe(0);
    expect(states.filter((state) => state === 'disposed')).toHaveLength(1);
    expect(engine.start()).toBe(false);
    expect(engine.resume()).toBe(false);
    expect(engine.returnToSafety()).toBe(false);
  });

  it('非 new 狀態呼叫 init 會被拒絕（包含 dispose 之後）', async () => {
    const { engine, canvas } = await runningEngine();
    await expect(engine.init(canvas)).rejects.toThrow('running');
    engine.dispose();
    await expect(engine.init(canvas)).rejects.toThrow('disposed');
  });

  it('dispose 後 context lost 事件不再有作用（監聽器已移除）', async () => {
    const { engine, canvas, errors } = await runningEngine();
    engine.dispose();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(errors).toEqual([]);
    expect(engine.state).toBe('disposed');
  });

  it('context lost 時停止迴圈並進入 error', async () => {
    const { engine, canvas, errors, scheduler } = await runningEngine();
    const event = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(engine.state).toBe('error');
    expect(errors).toEqual(['context-lost']);
    expect(scheduler.pendingCount).toBe(0);
    expect(engine.resume()).toBe(false);
  });

  it('renderer 建立失敗時進入 error，新的實例可以重試', async () => {
    const failure = new Error('WebGL2 不可用');
    const { engine, canvas, errors } = setup({
      rendererFactory: () => {
        throw failure;
      },
    });
    const result = await engine.init(canvas);
    expect(result).toEqual({ ok: false, reason: 'failed', error: failure });
    expect(engine.state).toBe('error');
    expect(errors).toEqual(['init-failed']);
    expect(engine.start()).toBe(false);
    engine.dispose();

    const retry = setup();
    await expect(retry.engine.init(retry.canvas)).resolves.toEqual({ ok: true });
    expect(retry.engine.start()).toBe(true);
  });

  it('初始化期間 dispose：晚到的 renderer 被釋放，且不會啟動', async () => {
    const renderer = new FakeRenderer();
    let resolveRenderer: (value: RendererLike) => void = () => undefined;
    const { engine, canvas, scheduler } = setup({
      rendererFactory: () =>
        new Promise<RendererLike>((resolve) => {
          resolveRenderer = resolve;
        }),
    });
    const pending = engine.init(canvas);
    expect(engine.state).toBe('initializing');
    engine.dispose();
    resolveRenderer(renderer);
    await expect(pending).resolves.toEqual({ ok: false, reason: 'disposed' });
    expect(renderer.disposeCount).toBe(1);
    expect(engine.state).toBe('disposed');
    expect(engine.start()).toBe(false);
    expect(scheduler.requestCount).toBe(0);
  });
});
