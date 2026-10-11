import { GREETING, Greeting } from '../dialogue/Greeting';

/** DOM 對話；安全控制仍在外層，沒有計時器、語音辨識或自動前進。 */
export class GreetingUI {
  readonly session = new Greeting();
  private running = false;
  private near = false;
  private focusBeforeHelp: HTMLElement | null = null;
  private focusBeforePause: HTMLElement | null = null;
  constructor(
    private readonly panel: HTMLElement,
    private readonly launch: HTMLButtonElement,
    private readonly onActive: (active: boolean) => void,
  ) {
    panel.addEventListener('focusin', (event) => {
      if (event.target instanceof HTMLElement) this.focusBeforePause = event.target;
    });
    launch.addEventListener('click', () => {
      if (!this.running || !this.near) return;
      this.session.start();
      this.onActive(true);
      this.render(true);
    });
    panel.addEventListener('click', (event) => {
      if (!this.running || !(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('button[data-greeting]');
      if (!button) return;
      const action = button.dataset.greeting;
      if (action === 'help') {
        this.focusBeforeHelp = button;
        this.session.helping = true;
        this.render(true);
      } else if (action === 'close-help') {
        this.session.helping = false;
        this.render();
        this.focusBeforeHelp?.focus();
      } else if (action === 'again') {
        this.panel.querySelector<HTMLElement>('#greeting-copy')?.focus();
      } else if (action === 'choice' && this.session.choose(Number(button.dataset.choice))) {
        this.onActive(this.session.node !== null);
        this.render(true);
        if (!this.session.node) this.launch.focus();
      }
    });
  }
  setNear(near: boolean): void {
    this.near = near;
    this.updateLaunch();
  }
  setRunning(running: boolean): void {
    const changed = running !== this.running;
    if (changed && !running && this.panel.contains(document.activeElement))
      this.focusBeforePause = document.activeElement as HTMLElement;
    this.running = running;
    this.panel.hidden = !running || this.session.node === null;
    this.updateLaunch();
    if (changed && running && this.session.node) {
      if (this.focusBeforePause?.isConnected) this.focusBeforePause.focus();
      else this.panel.querySelector<HTMLButtonElement>('button:not([hidden])')?.focus();
    }
  }
  clear(exited = false): void {
    if (exited) this.session.exit();
    else this.session.reset();
    this.focusBeforePause = null;
    this.focusBeforeHelp = null;
    this.onActive(false);
    this.render();
  }
  private updateLaunch(): void {
    this.launch.hidden = !this.running || this.session.node !== null;
    this.launch.disabled = !this.near;
    this.launch.textContent = this.near ? '打招呼' : '靠近再招呼';
  }
  private render(focus = false): void {
    this.updateLaunch();
    this.panel.hidden = !this.running || this.session.node === null;
    if (!this.session.node) return;
    const copy = GREETING[this.session.node];
    const content = this.panel.querySelector<HTMLElement>('#greeting-copy');
    const choices = this.panel.querySelector<HTMLElement>('#greeting-choices');
    const help = this.panel.querySelector<HTMLElement>('#greeting-help');
    if (!content || !choices || !help) throw new Error('缺少打招呼介面');
    content.replaceChildren();
    if (copy.line) {
      const line = document.createElement('p');
      line.textContent = `小安：${copy.line}`;
      content.append(line);
    }
    for (const text of copy.prompts) {
      const p = document.createElement('p');
      p.textContent = text;
      content.append(p);
    }
    // 幫助開關不重建選項，確保焦點能回到同一個按鈕。
    if (choices.dataset.node !== this.session.node) {
      choices.replaceChildren();
      choices.dataset.node = this.session.node;
      copy.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'control';
        button.dataset.greeting = 'choice';
        button.dataset.choice = String(index);
        button.textContent = choice.label;
        choices.append(button);
      });
    }
    help.textContent = copy.help.join(' ');
    const helping = this.session.helping;
    for (const id of ['greeting-copy', 'greeting-choices', 'greeting-tools']) {
      const el = this.panel.querySelector<HTMLElement>(`#${id}`);
      if (el) el.hidden = helping;
    }
    const helpPanel = this.panel.querySelector<HTMLElement>('#greeting-help-panel');
    if (helpPanel) helpPanel.hidden = !helping;
    if (focus)
      this.panel
        .querySelector<HTMLButtonElement>(
          helping ? '[data-greeting="close-help"]' : '#greeting-choices button',
        )
        ?.focus();
  }
}
