export type SafetyAction = 'pause' | 'safety' | 'resume' | 'retry' | 'restart' | 'end';

export type SafetyActions = Readonly<Record<SafetyAction, () => void>>;

/**
 * loading：準備中；running：場景執行中；paused／safety：引擎暫停中；
 * rest／safety-rest：沒有可用場景時由 DOM 接管；error：無法顯示場景；ended：本次結束。
 */
export type SafetyView =
  'loading' | 'running' | 'paused' | 'safety' | 'rest' | 'safety-rest' | 'error' | 'ended';

type PanelAction = Extract<SafetyAction, 'resume' | 'retry' | 'restart' | 'end'>;

interface ViewCopy {
  readonly title: string;
  readonly text: string;
  readonly actions: readonly PanelAction[];
}

// 文案是工程原型的暫定版本，尚待專業審查（03 §5）；避免「失敗」「錯誤」等評價語。
const VIEW_COPY: Readonly<Record<Exclude<SafetyView, 'loading' | 'running'>, ViewCopy>> = {
  paused: {
    title: '休息一下',
    text: '畫面停住了。準備好再按「繼續」。',
    actions: ['resume', 'end'],
  },
  safety: {
    title: '已返回安全區',
    text: '你在安全區。想回公園時按「繼續」。',
    actions: ['resume', 'end'],
  },
  rest: {
    title: '休息一下',
    text: '想開始時按「重新開始」。',
    actions: ['restart'],
  },
  'safety-rest': {
    title: '已返回安全區',
    text: '你在安全區。想開始時按「重新開始」。',
    actions: ['restart'],
  },
  error: {
    title: '目前無法顯示場景',
    text: '可以重試，或結束本次練習。',
    actions: ['retry', 'end'],
  },
  ended: {
    title: '本次練習結束了',
    text: '想再來時按「重新開始」。',
    actions: ['restart'],
  },
};

const PANEL_ACTIONS: readonly PanelAction[] = ['resume', 'retry', 'restart', 'end'];

function isSafetyAction(value: string | undefined): value is SafetyAction {
  return (
    value === 'pause' ||
    value === 'safety' ||
    value === 'resume' ||
    value === 'retry' ||
    value === 'restart' ||
    value === 'end'
  );
}

function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
  type: new () => T,
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`找不到必要的介面元素：${selector}`);
  return element;
}

/** 真實 DOM 按鈕的安全介面；不受 RAF 控制，引擎暫停或出錯時仍可操作。 */
export class SafetyUI {
  private readonly overlay: HTMLElement;
  private readonly title: HTMLElement;
  private readonly text: HTMLElement;
  private readonly status: HTMLElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly panelButtons: Readonly<Record<PanelAction, HTMLButtonElement>>;
  private actions: SafetyActions | null = null;
  private view: SafetyView | null = null;

  constructor(private readonly root: HTMLElement) {
    this.overlay = requireElement(root, '#overlay', HTMLElement);
    this.title = requireElement(root, '#overlay-title', HTMLElement);
    this.text = requireElement(root, '#overlay-text', HTMLElement);
    this.status = requireElement(root, '#status', HTMLElement);
    this.pauseButton = requireElement(root, '[data-action="pause"]', HTMLButtonElement);
    requireElement(root, '[data-action="safety"]', HTMLButtonElement);
    this.panelButtons = {
      resume: requireElement(this.overlay, '[data-action="resume"]', HTMLButtonElement),
      retry: requireElement(this.overlay, '[data-action="retry"]', HTMLButtonElement),
      restart: requireElement(this.overlay, '[data-action="restart"]', HTMLButtonElement),
      end: requireElement(this.overlay, '[data-action="end"]', HTMLButtonElement),
    };
  }

  attach(actions: SafetyActions): void {
    if (this.actions === null) this.root.addEventListener('click', this.handleClick);
    this.actions = actions;
  }

  render(view: SafetyView): void {
    if (this.view === view) return;
    const overlayWasOpen = !this.overlay.hidden;
    this.view = view;

    if (view === 'loading' || view === 'running') {
      const focusWasInOverlay = this.overlay.contains(document.activeElement);
      this.overlay.hidden = true;
      this.status.textContent = view === 'loading' ? '正在準備公園…' : '';
      if (overlayWasOpen && focusWasInOverlay) this.pauseButton.focus();
      return;
    }

    const copy = VIEW_COPY[view];
    this.title.textContent = copy.title;
    this.text.textContent = copy.text;
    for (const action of PANEL_ACTIONS) {
      this.panelButtons[action].hidden = !copy.actions.includes(action);
    }
    this.overlay.hidden = false;
    this.status.textContent = '';

    const firstAction = copy.actions[0];
    if (firstAction !== undefined) this.panelButtons[firstAction].focus();
  }

  dispose(): void {
    this.root.removeEventListener('click', this.handleClick);
    this.actions = null;
  }

  private readonly handleClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-action]');
    const action = button?.dataset.action;
    if (!isSafetyAction(action)) return;
    this.actions?.[action]();
  };
}
