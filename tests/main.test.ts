import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineState, GameEngineOptions, InitResult } from '../src/core/GameEngine';
import type { SafetyActions, SafetyView } from '../src/ui/SafetyUI';

interface TestEngine {
  state: EngineState;
  starts: number;
  complete: (result: InitResult) => void;
  reject: (error: Error) => void;
}

const control = vi.hoisted(() => ({
  instances: [] as TestEngine[],
  actions: null as SafetyActions | null,
  views: [] as SafetyView[],
}));

vi.mock('../src/core/GameEngine', () => ({
  GameEngine: class implements TestEngine {
    state: EngineState = 'new';
    starts = 0;
    complete: (result: InitResult) => void = () => undefined;
    reject: (error: Error) => void = () => undefined;

    constructor(private readonly options: GameEngineOptions) {
      control.instances.push(this);
    }

    resize(): void {}

    init(): Promise<InitResult> {
      this.state = 'initializing';
      this.options.onStateChange?.(this.state);
      return new Promise((resolve, reject) => {
        this.reject = reject;
        this.complete = (result) => {
          if (this.state === 'disposed') {
            resolve({ ok: false, reason: 'disposed' });
            return;
          }
          this.state = result.ok ? 'ready' : 'error';
          this.options.onStateChange?.(this.state);
          resolve(result);
        };
      });
    }

    start(): void {
      this.starts += 1;
      this.state = 'running';
      this.options.onStateChange?.(this.state);
    }

    pause(): boolean {
      if (this.state !== 'running' && this.state !== 'paused') return false;
      this.state = 'paused';
      this.options.onStateChange?.(this.state);
      return true;
    }

    resume(): boolean {
      if (this.state !== 'paused') return false;
      this.start();
      return true;
    }

    dispose(): void {
      this.state = 'disposed';
    }
  },
}));

vi.mock('../src/ui/SafetyUI', () => ({
  SafetyUI: class {
    attach(actions: SafetyActions): void {
      control.actions = actions;
    }
    render(view: SafetyView): void {
      control.views.push(view);
    }
  },
}));

class TestDocument extends EventTarget {
  visibilityState = 'visible';
  readonly canvases = new Set<object>();

  getElementById(id: string): object {
    return id === 'stage'
      ? {
          append: (canvas: object) => this.canvases.add(canvas),
          getBoundingClientRect: () => ({ width: 800, height: 600 }),
        }
      : {};
  }

  createElement(): object {
    const canvas = { remove: () => this.canvases.delete(canvas) };
    return canvas;
  }
}

let testDocument: TestDocument;
let testWindow: EventTarget;

function currentEngine(): TestEngine {
  const engine = control.instances.at(-1);
  if (!engine) throw new Error('測試應已建立引擎');
  return engine;
}

function actions(): SafetyActions {
  if (!control.actions) throw new Error('測試應已掛上按鈕');
  return control.actions;
}

async function finishInit(result: InitResult = { ok: true }): Promise<TestEngine> {
  const engine = currentEngine();
  engine.complete(result);
  await Promise.resolve();
  return engine;
}

beforeEach(() => {
  vi.resetModules();
  control.instances.length = 0;
  control.views.length = 0;
  control.actions = null;
  testDocument = new TestDocument();
  testWindow = new EventTarget();
  vi.stubGlobal('document', testDocument);
  vi.stubGlobal('window', testWindow);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('main 的背景載入與安全控制', () => {
  it('正常前景初始化只啟動一個場景', async () => {
    await import('../src/main');
    const engine = await finishInit();
    expect(engine.starts).toBe(1);
    expect(testDocument.canvases.size).toBe(1);
    expect(control.views.at(-1)).toBe('running');
  });

  it('起始 hidden 不建立引擎，回前景要明確重新開始', async () => {
    testDocument.visibilityState = 'hidden';
    await import('../src/main');
    expect(control.instances).toHaveLength(0);
    expect(control.views.at(-1)).toBe('rest');
    testDocument.visibilityState = 'visible';
    testDocument.dispatchEvent(new Event('visibilitychange'));
    expect(control.instances).toHaveLength(0);
    actions().restart();
    const engine = await finishInit();
    expect(engine.starts).toBe(1);
  });

  it.each(['visibilitychange', 'pagehide'])(
    '初始化中 %s 取消場景，晚到結果不啟動',
    async (event) => {
      await import('../src/main');
      const engine = currentEngine();
      if (event === 'visibilitychange') {
        testDocument.visibilityState = 'hidden';
        testDocument.dispatchEvent(new Event(event));
      } else {
        testWindow.dispatchEvent(new Event(event));
      }
      await finishInit();
      expect(engine.starts).toBe(0);
      expect(engine.state).toBe('disposed');
      expect(testDocument.canvases.size).toBe(0);
      expect(control.views.at(-1)).toBe('rest');
      testDocument.visibilityState = 'visible';
      testDocument.dispatchEvent(new Event('visibilitychange'));
      expect(control.views.at(-1)).toBe('rest');
    },
  );

  it('init 完成時重新檢查 hidden，即使沒有收到切頁事件', async () => {
    await import('../src/main');
    testDocument.visibilityState = 'hidden';
    const engine = await finishInit();
    expect(engine.starts).toBe(0);
    expect(engine.state).toBe('disposed');
    expect(control.views.at(-1)).toBe('rest');
  });

  it('執行中切到背景會暫停，回前景不自動恢復', async () => {
    await import('../src/main');
    const engine = await finishInit();
    testDocument.visibilityState = 'hidden';
    testDocument.dispatchEvent(new Event('visibilitychange'));
    testDocument.visibilityState = 'visible';
    testDocument.dispatchEvent(new Event('visibilitychange'));
    expect(engine.starts).toBe(1);
    expect(engine.state).toBe('paused');
    expect(control.views.at(-1)).toBe('paused');
    actions().resume();
    expect(engine.starts).toBe(2);
  });

  it('init 失敗後暫停由 DOM 接管，並可重新開始', async () => {
    await import('../src/main');
    const engine = await finishInit({
      ok: false,
      reason: 'failed',
      error: new Error('WebGL 不可用'),
    });
    expect(control.views.at(-1)).toBe('error');
    actions().pause();
    expect(engine.state).toBe('disposed');
    expect(testDocument.canvases.size).toBe(0);
    expect(control.views.at(-1)).toBe('rest');
    actions().restart();
    expect(await finishInit()).not.toBe(engine);
    expect(control.views.at(-1)).toBe('running');
  });

  it('未預期的 init 拒絕也顯示錯誤，安全控制仍可用', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await import('../src/main');
    const engine = currentEngine();
    engine.reject(new Error('未預期的初始化問題'));
    await Promise.resolve();
    expect(engine.state).toBe('disposed');
    expect(control.views.at(-1)).toBe('error');
    expect(testDocument.canvases.size).toBe(0);
    expect(consoleError).toHaveBeenCalledOnce();
    actions().pause();
    expect(control.views.at(-1)).toBe('rest');
    actions().safety();
    expect(control.views.at(-1)).toBe('safety-rest');
  });
});
