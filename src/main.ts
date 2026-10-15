import './styles.css';
import { GreetingUI } from './ui/GreetingUI';
import { GameEngine } from './core/GameEngine';
import type { EngineState } from './core/GameEngine';
import { SafetyUI } from './ui/SafetyUI';
import type { SafetyView } from './ui/SafetyUI';

function requireById(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`index.html 缺少 #${id}`);
  return element;
}

/** 每次呼叫都重新讀取可見性，避免跨 await 沿用舊的型別縮窄。 */
function isPageHidden(): boolean {
  return document.visibilityState === 'hidden';
}

const app = requireById('app');
const stage = requireById('stage');

const ui = new SafetyUI(app);
let engine: GameEngine | null = null;
let canvas: HTMLCanvasElement | null = null;
/** 引擎進入 paused 的原因，決定顯示「休息一下」或「已返回安全區」。 */
const greetingPanel = document.getElementById('greeting-panel');
const greetingLaunch = document.getElementById('greeting-launch');
const greeting =
  greetingPanel && greetingLaunch instanceof HTMLButtonElement
    ? new GreetingUI(
        greetingPanel,
        greetingLaunch,
        (active) => engine?.setInteractionActive(active),
        (gesture, characterId) => {
          const enabled =
            document.querySelector<HTMLInputElement>('#npc-motion')?.checked === true &&
            !matchMedia('(prefers-reduced-motion: reduce)').matches;
          engine?.setNPCGesture(gesture, enabled, characterId ?? undefined);
        },
      )
    : null;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) engine?.setNPCGesture(null, false);
});
app.addEventListener('change', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.id === 'npc-motion')
    engine?.setNPCGesture(null, event.target.checked && !reducedMotion.matches);
});

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
  greeting?.setRunning(engine.state === 'running');
  const output = document.getElementById('performance-info');
  const checkbox = document.getElementById('performance-check');
  if (output && checkbox instanceof HTMLInputElement)
    output.hidden = engine.state !== 'running' || !checkbox.checked;
}

function applyEnvironmentDetail(): void {
  const select = document.getElementById('environment-detail');
  if (select && select instanceof HTMLSelectElement)
    engine?.setEnvironmentDetail(select.value === 'low' ? 'low' : 'standard');
  const checkbox = document.getElementById('performance-check');
  if (checkbox && checkbox instanceof HTMLInputElement) {
    engine?.setPerformanceMonitoring(checkbox.checked);
    const output = document.getElementById('performance-info');
    if (output) output.hidden = !checkbox.checked;
  }
}
app.addEventListener('change', (event) => {
  if (
    event.target instanceof Element &&
    ['environment-detail', 'performance-check'].includes(event.target.id)
  )
    applyEnvironmentDetail();
});

function teardown(): void {
  greeting?.clear();
  greeting?.setRunning(false);
  greeting?.setNear(null);
  engine?.dispose();
  engine = null;
  canvas?.remove();
  canvas = null;
}

async function startSession(): Promise<void> {
  // 重試或重新開始前先銷毀舊實例，避免重複的 canvas、監聽器或 RAF。
  teardown();
  pauseReason = 'paused';

  // 背景載入不建立場景；回到前景後由玩家明確重新開始。
  if (isPageHidden()) {
    ui.render('rest');
    return;
  }

  const nextCanvas = document.createElement('canvas');
  nextCanvas.className = 'scene-canvas';
  nextCanvas.tabIndex = 0;
  nextCanvas.setAttribute(
    'aria-label',
    '公園操作區。前方長椅有小安，左前方有小宇，右前方溜滑梯有小晴，最遠的門口有媽媽',
  );
  nextCanvas.setAttribute('aria-describedby', 'movement-help');
  stage.append(nextCanvas);

  const current = new GameEngine({
    loadEnvironmentTextures: true,
    onStateChange: () => {
      if (engine === current) syncView();
    },
    onNPCPresence: (nearId) => {
      if (engine === current) {
        ui.renderNPCPresence(nearId);
        greeting?.setNear(nearId);
      }
    },
    onPerformance: (fps) => {
      if (engine !== current) return;
      const output = document.getElementById('performance-info');
      if (output) output.textContent = `目前約 ${String(fps)} FPS`;
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

  try {
    const result = await current.init(nextCanvas);
    if (engine !== current || !result.ok) return;
    applyEnvironmentDetail();
    if (isPageHidden()) {
      takeOver('rest');
      return;
    }
    current.start();
  } catch (error: unknown) {
    // 保留協調層的最後一道錯誤邊界，避免 UI 留在準備中。
    if (engine !== current) return;
    teardown();
    ui.render('error');
    console.error('[GameEngine] unexpected-init-error', error);
  }
}

/** 沒有可用的場景（準備中或無法顯示）時，由 DOM 休息畫面接管並取消初始化。 */
function takeOver(view: 'rest' | 'safety-rest'): void {
  teardown();
  ui.render(view);
}

function pause(): void {
  if (!engine) {
    ui.render('rest');
    return;
  }
  if (engine.state === 'initializing' || engine.state === 'ready' || engine.state === 'error') {
    takeOver('rest');
    return;
  }
  pauseReason = 'paused';
  if (engine.pause()) syncView();
}

function returnToSafety(): void {
  greeting?.clear(true);
  if (!engine) {
    ui.render('safety-rest');
    return;
  }
  if (engine.state === 'initializing' || engine.state === 'ready' || engine.state === 'error') {
    takeOver('safety-rest');
    return;
  }
  pauseReason = 'safety';
  if (engine.returnToSafety()) syncView();
  else takeOver('safety-rest');
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
  if (isPageHidden()) pause();
});

window.addEventListener('pagehide', () => {
  pause();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    pause();
  }
});

void startSession();
