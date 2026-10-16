import { PARK_SCENARIOS } from '../dialogue/ParkScenarios';
import { DialogueSession } from '../dialogue/Scenario';
import type { Expression, Gesture, Scenario } from '../dialogue/Scenario';
import { nodeVoice } from '../dialogue/VoiceLines';
import type { Speaker } from '../dialogue/VoiceLines';
import { annotatedText, decorateButton } from './GreetingPresentation';
import type { VoiceClip } from './VoicePlayer';

const SCENARIOS: Readonly<Record<string, Scenario<string>>> = PARK_SCENARIOS;

/** 對話用到的語音功能（VoicePlayer 或測試替身）。 */
export interface VoiceControl {
  readonly active: boolean;
  play(clips: readonly VoiceClip[]): void;
  stop(): void;
}
const NO_VOICE: VoiceControl = { active: false, play: () => undefined, stop: () => undefined };

/**
 * 公園人物對話（原本只有打招呼，現在依靠近的人物切換情境）。
 * 安全控制仍在外層，沒有計時器、語音辨識或自動前進。
 * 有預先產生的語音時，每一步自動唸一次人物台詞與旁白，「再聽一次」可以重播。
 */
export class GreetingUI {
  session: DialogueSession<string> | null = null;
  private running = false;
  private nearId: string | null = null;
  /** 正在對話的人物；對話中走開或靠近別人都不換對象。 */
  private talkingTo: string | null = null;
  private focusBeforeHelp: HTMLElement | null = null;
  private focusBeforePause: HTMLElement | null = null;
  constructor(
    private readonly panel: HTMLElement,
    private readonly launch: HTMLButtonElement,
    private readonly onActive: (active: boolean) => void,
    /** 進入節點時對方的動作與表情；null 代表結束對話，所有人回到平常的表情。 */
    private readonly onGesture: (
      gesture: Gesture | null,
      characterId: string | null,
      expression: Expression | null,
    ) => void = () => {},
    private readonly voice: VoiceControl = NO_VOICE,
  ) {
    for (const button of panel.querySelectorAll<HTMLButtonElement>('button[data-greeting]')) {
      decorateButton(
        button,
        button.textContent.trim(),
        button.dataset.greeting === 'help' ? 'help' : 'repeat',
      );
    }
    panel.addEventListener('focusin', (event) => {
      if (event.target instanceof HTMLElement) this.focusBeforePause = event.target;
    });
    launch.addEventListener('click', () => {
      const scenario = this.nearId === null ? undefined : SCENARIOS[this.nearId];
      if (!this.running || !scenario) return;
      this.talkingTo = this.nearId;
      this.session = new DialogueSession(scenario);
      this.session.start();
      this.panel.querySelector('#greeting-title')?.replaceChildren(annotatedText(scenario.title));
      this.playGesture();
      this.onActive(true);
      this.render(true);
      this.speak();
    });
    panel.addEventListener('click', (event) => {
      const session = this.session;
      if (!this.running || !session || !(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('button[data-greeting]');
      if (!button) return;
      const action = button.dataset.greeting;
      if (action === 'help') {
        this.focusBeforeHelp = button;
        session.helping = true;
        this.render(true);
      } else if (action === 'close-help') {
        session.helping = false;
        this.render();
        this.focusBeforeHelp?.focus();
      } else if (action === 'again') {
        this.speak();
        this.panel.querySelector<HTMLElement>('#greeting-copy')?.focus();
      } else if (action === 'choice' && session.choose(Number(button.dataset.choice))) {
        this.onActive(session.node !== null);
        this.playGesture();
        this.render(true);
        this.speak();
        if (!session.node) this.launch.focus();
      }
    });
  }

  /** 語音開關改變：更新「再看一次／再聽一次」。 */
  voiceChanged(): void {
    if (this.session?.node) this.render();
  }

  /** 引擎回報目前靠近的人物；對話中不切換對象。 */
  setNear(characterId: string | null): void {
    this.nearId = characterId;
    this.updateLaunch();
  }

  setRunning(running: boolean): void {
    const changed = running !== this.running;
    if (changed && !running && this.panel.contains(document.activeElement))
      this.focusBeforePause = document.activeElement as HTMLElement;
    this.running = running;
    if (!running) this.voice.stop();
    this.panel.hidden = !running || !this.session?.node;
    this.updateLaunch();
    if (changed && running && this.session?.node) {
      if (this.focusBeforePause?.isConnected) this.focusBeforePause.focus();
      else this.panel.querySelector<HTMLButtonElement>('button:not([hidden])')?.focus();
    }
  }

  clear(exited = false): void {
    if (exited) this.session?.exit();
    else this.session?.reset();
    this.focusBeforePause = null;
    this.focusBeforeHelp = null;
    this.onActive(false);
    this.onGesture(null, null, null);
    this.voice.stop();
    this.render();
  }

  /** 唸目前這一步：人物台詞（人物自己的聲音），再唸旁白提示。回到公園時停止。 */
  private speak(): void {
    const current = this.session?.current;
    if (!current || this.talkingTo === null) {
      this.voice.stop();
      return;
    }
    this.voice.play(nodeVoice(this.talkingTo as Speaker, current));
  }

  private playGesture(): void {
    const current = this.session?.current;
    // 回到公園（沒有節點）時表情也回到平常。
    this.onGesture(
      current?.gesture ?? null,
      this.talkingTo,
      current ? (current.expression ?? 'neutral') : null,
    );
  }

  private updateLaunch(): void {
    const scenario = this.nearId === null ? undefined : SCENARIOS[this.nearId];
    this.launch.hidden = !this.running || Boolean(this.session?.node);
    this.launch.disabled = !scenario;
    decorateButton(this.launch, scenario ? scenario.launchLabel : '靠近再說話', 'speech');
  }

  private render(focus = false): void {
    this.updateLaunch();
    const session = this.session;
    const copy = session?.current;
    this.panel.hidden = !this.running || !copy;
    if (!session || !copy || session.node === null) return;
    const content = this.panel.querySelector<HTMLElement>('#greeting-copy');
    const choices = this.panel.querySelector<HTMLElement>('#greeting-choices');
    const help = this.panel.querySelector<HTMLElement>('#greeting-help');
    if (!content || !choices || !help) throw new Error('缺少對話介面');
    content.replaceChildren();
    if (copy.line) {
      const line = document.createElement('p');
      line.className = 'npc-line';
      line.append(annotatedText(`${session.scenario.speaker}：${copy.line}`));
      content.append(line);
    }
    for (const text of copy.prompts) {
      const p = document.createElement('p');
      if (text.endsWith('？')) p.className = 'prompt-question';
      p.append(annotatedText(text));
      content.append(p);
    }
    // 幫助開關不重建選項，確保焦點能回到同一個按鈕。
    const nodeKey = `${session.scenario.id}:${session.node}`;
    if (choices.dataset.node !== nodeKey) {
      choices.replaceChildren();
      choices.dataset.node = nodeKey;
      copy.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'control';
        button.dataset.greeting = 'choice';
        button.dataset.choice = String(index);
        decorateButton(button, choice.label, choice.icon);
        choices.append(button);
      });
    }
    help.replaceChildren(annotatedText(copy.help.join(' ')));
    const again = this.panel.querySelector<HTMLButtonElement>('[data-greeting="again"]');
    const againLabel = this.voice.active ? '再聽一次' : '再看一次';
    if (again && again.getAttribute('aria-label') !== againLabel)
      decorateButton(again, againLabel, this.voice.active ? 'listen' : 'repeat');
    const helping = session.helping;
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
