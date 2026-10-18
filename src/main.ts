import './styles.css';
import { NeighborhoodUI } from './ui/NeighborhoodUI';
import { decorateButton } from './ui/GreetingPresentation';
import { GreetingUI } from './ui/GreetingUI';
import { GameEngine } from './core/GameEngine';
import type { EngineState } from './core/GameEngine';
import { SafetyUI } from './ui/SafetyUI';
import { VoicePlayer, browserSpeech } from './ui/VoicePlayer';
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
// 語音：有預先產生的靜態音檔就播音檔，其餘用裝置內建語音；不呼叫雲端語音 API。
const voice = new VoicePlayer(import.meta.env.BASE_URL, () => new Audio(), browserSpeech());
if (typeof fetch === 'function')
  void voice.load(async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}assets/voice/manifest.json`);
    return response.ok ? ((await response.json()) as unknown) : null;
  });
let neighborhoodUI: NeighborhoodUI | null = null;
const greetingPanel = document.getElementById('greeting-panel');
const greetingLaunch = document.getElementById('greeting-launch');
const greeting =
  greetingPanel && greetingLaunch instanceof HTMLButtonElement
    ? new GreetingUI(
        greetingPanel,
        greetingLaunch,
        (active) => engine?.setInteractionActive(active),
        (gesture, characterId, expression) => {
          const enabled = motionAllowed();
          engine?.setNPCGesture(gesture, enabled, characterId ?? undefined);
          // 表情和動作開關無關，一律顯示；停用動作時直接切換、不做過渡。
          engine?.setNPCExpression(expression, characterId ?? undefined, enabled);
        },
        voice,
        {
          begin: (place) => engine?.beginWorldPractice(place) ?? false,
          node: (node) => {
            engine?.setWorldNode(node);
            if (node === 'toilet-find') neighborhoodUI?.setGoal('toilet');
          },
          canAdvance: (target) => engine?.canAdvanceWorld(target) ?? false,
          help: (helping) => engine?.setWorldHelping(helping),
          map: () => neighborhoodUI?.toggle(),
        },
      )
    : null;

/** 「人物動作」開著、而且系統沒有要求減少動態時，人物才有動作與閒置動態。 */
function motionAllowed(): boolean {
  const checkbox = document.getElementById('npc-motion') as HTMLInputElement | null;
  return checkbox?.checked === true && !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
  engine?.setNPCGesture(null, motionAllowed());
});
app.addEventListener('change', (event) => {
  if (event.target instanceof HTMLInputElement && event.target.id === 'npc-motion')
    engine?.setNPCGesture(null, motionAllowed());
  if (event.target instanceof HTMLInputElement && event.target.id === 'voice-enabled') {
    voice.setEnabled(event.target.checked);
    greeting?.voiceChanged();
  }
});

const practiceLaunch = document.getElementById('practice-launch');
const mapRoot = document.getElementById('district-map');
if (practiceLaunch && practiceLaunch instanceof HTMLButtonElement && mapRoot) {
  decorateButton(practiceLaunch, '街區地圖', 'park');
  neighborhoodUI = new NeighborhoodUI(mapRoot, practiceLaunch, (open) => engine?.setMapOpen(open));
}

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
  neighborhoodUI?.setRunning(engine.state === 'running');
  const practice = document.getElementById('practice-launch');
  if (practice) practice.hidden = engine.state !== 'running';
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
  greeting?.setPlace(null);
  neighborhoodUI?.setRunning(false);
  const practice = document.getElementById('practice-launch');
  if (practice) practice.hidden = true;
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
    onWorldFrame: (snapshot) => {
      if (engine !== current) return;
      greeting?.setPlace(snapshot.place);
      greeting?.updateTravel();
      neighborhoodUI?.update(snapshot);
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
    current.setNPCGesture(null, motionAllowed());
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
