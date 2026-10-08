import './styles.css';
import { GameEngine } from './core/GameEngine';
import type { EngineState } from './core/GameEngine';
import { SafetyUI } from './ui/SafetyUI';
import type { SafetyView } from './ui/SafetyUI';

function requireById(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`index.html 缺少 #${id}`);
  return element;
}

const app = requireById('app');
const stage = requireById('stage');

const ui = new SafetyUI(app);
let engine: GameEngine | null = null;
let canvas: HTMLCanvasElement | null = null;
/** 引擎進入 paused 的原因，決定顯示「休息一下」或「已返回安全區」。 */
let pauseReason: 'paused' | 'safety' = 'paused';

function viewFor(state: EngineState): SafetyView | null {
  switch (state) {
    case 'new':
    case 'initializing':
    case 'ready':
      return 'loading';
    case 'running':
      return 'running';
    case 'paused':
      return pauseReason;
    case 'error':
      return 'error';
    case 'disposed':
      // 銷毀後的畫面由呼叫 teardown 的動作決定。
      return null;
  }
}

function syncView(): void {
  if (!engine) return;
  const view = viewFor(engine.state);
  if (view) ui.render(view);
}

function teardown(): void {
  engine?.dispose();
  engine = null;
  canvas?.remove();
  canvas = null;
}

async function startSession(): Promise<void> {
  // 重試或重新開始前先銷毀舊實例，避免重複的 canvas、監聽器或 RAF。
  teardown();
  pauseReason = 'paused';

  const nextCanvas = document.createElement('canvas');
  nextCanvas.className = 'scene-canvas';
  stage.append(nextCanvas);

  const current = new GameEngine({
    onStateChange: () => {
      if (engine === current) syncView();
    },
    onError: (reason, error) => {
      console.error(`[GameEngine] ${reason}`, error);
    },
  });
  engine = current;
  canvas = nextCanvas;
  ui.render('loading');

  const rect = stage.getBoundingClientRect();
  current.resize(rect.width, rect.height);

  const result = await current.init(nextCanvas);
  if (engine !== current || !result.ok) return;
  current.start();
}

/** 沒有可用的場景（準備中或無法顯示）時，由 DOM 休息畫面接管並取消初始化。 */
function takeOver(view: 'rest' | 'safety-rest'): void {
  teardown();
  ui.render(view);
}

function pause(): void {
  if (!engine) return;
  if (engine.state === 'initializing') {
    takeOver('rest');
    return;
  }
  pauseReason = 'paused';
  if (engine.pause()) syncView();
}

function returnToSafety(): void {
  if (!engine) return;
  if (engine.state === 'initializing' || engine.state === 'error') {
    takeOver('safety-rest');
    return;
  }
  pauseReason = 'safety';
  if (engine.returnToSafety()) syncView();
}

ui.attach({
  pause,
  safety: returnToSafety,
  resume: () => {
    if (engine?.resume()) syncView();
  },
  retry: () => void startSession(),
  restart: () => void startSession(),
  end: () => {
    // 「結束本次」只停止並釋放場景，不關閉視窗、不導向外部頁面。
    teardown();
    ui.render('ended');
  },
});

new ResizeObserver((entries) => {
  const entry = entries[0];
  if (entry) engine?.resize(entry.contentRect.width, entry.contentRect.height);
}).observe(stage);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' || engine?.state !== 'running') return;
  pauseReason = 'paused';
  engine.handleVisibilityChange(true);
});

window.addEventListener('pagehide', () => {
  if (engine?.state === 'running') pause();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && engine?.state === 'running') {
    event.preventDefault();
    pause();
  }
});

void startSession();
