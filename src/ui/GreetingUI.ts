import type { Place } from '../scene/Neighborhood';
import type { LifeNode } from '../dialogue/LifeScenarios';
import { LIFE_SCENARIO } from '../dialogue/LifeScenarios';
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
  private place: Place | null = null;
  private inWorld = false;
  private returnFocus: HTMLElement | null = null;
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
    private readonly world?: {
      begin: (place: Place) => boolean;
      node: (node: string | null) => void;
      canAdvance: (target: string) => boolean;
      help: (helping: boolean) => void;
      map: () => void;
    },
  ) {
    for (const button of panel.querySelectorAll<HTMLButtonElement>('button[data-greeting]')) {
      decorateButton(
        button,
        button.textContent.trim(),
        button.dataset.greeting === 'help'
          ? 'help'
          : button.dataset.greeting === 'map'
            ? 'park'
            : 'repeat',
      );
    }
    panel.addEventListener('focusin', (event) => {
      if (event.target instanceof HTMLElement) this.focusBeforePause = event.target;
    });
    launch.addEventListener('click', () => {
      if (this.place) {
        if (!this.world?.begin(this.place)) return;
        this.openPractice(this.launch, this.place.start, true);
        return;
      }
      this.inWorld = false;
      const scenario = this.nearId === null ? undefined : SCENARIOS[this.nearId];
      if (!this.running || !scenario) return;
      this.returnFocus = this.launch;
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
        if (this.inWorld) this.world?.help(true);
        this.render(true);
      } else if (action === 'close-help') {
        session.helping = false;
        if (this.inWorld) this.world?.help(false);
        this.render();
        this.focusBeforeHelp?.focus();
      } else if (action === 'map') {
        this.world?.map();
      } else if (action === 'again') {
        this.speak();
        this.panel.querySelector<HTMLElement>('#greeting-copy')?.focus();
      } else if (action === 'choice') {
        const target = session.current?.choices[Number(button.dataset.choice)]?.target;
        if (!target || (this.inWorld && this.world && !this.world.canAdvance(target))) return;
        if (!session.choose(Number(button.dataset.choice))) return;
        if (this.inWorld && (target === 'menu' || target === 'menu-extra')) {
          session.node = null;
          this.onActive(false);
          this.world?.node(null);
          this.inWorld = false;
          this.render();
          this.world?.map();
          return;
        }
        if (this.inWorld) this.world?.node(session.node);
        this.onActive(session.node !== null);
        if (!session.node) this.inWorld = false;
        this.playGesture();
        this.render(true);
        this.speak();
        if (!session.node) this.returnFocus?.focus();
      }
    });
  }

  /** 生活情境由地點入口明確開啟，不能覆蓋進行中的對話。 */
  openPractice(
    trigger: HTMLElement,
    start: LifeNode = LIFE_SCENARIO.start,
    inWorld = false,
  ): boolean {
    if (!this.running || this.session?.node) return false;
    this.returnFocus = trigger;
    this.talkingTo = 'mom';
    this.inWorld = inWorld;
    this.session = new DialogueSession(LIFE_SCENARIO);
    this.session.start();
    this.session.node = start;
    if (inWorld) this.world?.node(start);
    this.panel
      .querySelector('#greeting-title')
      ?.replaceChildren(annotatedText(LIFE_SCENARIO.title));
    this.onActive(true);
    this.render(true);
    this.speak();
    return true;
  }

  setPlace(place: Place | null): void {
    if (this.place?.id === place?.id) return;
    this.place = place;
    this.updateLaunch();
  }
  updateTravel(): void {
    if (!this.inWorld) return;
    for (const button of this.panel.querySelectorAll<HTMLButtonElement>(
      '#greeting-choices button',
    )) {
      const target = this.session?.current?.choices[Number(button.dataset.choice)]?.target;
      button.disabled = Boolean(target && this.world && !this.world.canAdvance(target));
    }
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
    this.world?.node(null);
    this.inWorld = false;
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
    this.voice.play(
      nodeVoice(this.talkingTo as Speaker, {
        ...current,
        prompts: current.prompts.map((text) =>
          this.inWorld && text === '你回到公園。' ? '你留在這裡。' : text,
        ),
      }),
    );
  }

  private playGesture(): void {
    const current = this.session?.current;
    // 回到公園（沒有節點）時表情也回到平常。
    if (this.session?.scenario.id === 'life') {
      this.onGesture(null, null, null);
      return;
    }
    this.onGesture(
      current?.gesture ?? null,
      this.talkingTo,
      current ? (current.expression ?? 'neutral') : null,
    );
  }

  private updateLaunch(): void {
    const scenario = this.nearId === null ? undefined : SCENARIOS[this.nearId];
    this.launch.hidden = !this.running || Boolean(this.session?.node);
    this.launch.disabled = !scenario && !this.place;
    decorateButton(
      this.launch,
      this.place ? this.place.label : scenario ? scenario.launchLabel : '靠近再說話',
      'speech',
    );
  }

  private render(focus = false): void {
    this.updateLaunch();
    const session = this.session;
    const copy = session?.current;
    this.panel.hidden = !this.running || !copy;
    const life = session?.scenario.id === 'life' && copy;
    if (this.inWorld && copy) {
      this.panel.dataset.world = 'true';
      this.panel.dataset.travel = String(
        !session.helping && (session.node === 'road-walk' || session.node === 'toilet-find'),
      );
    } else {
      delete this.panel.dataset.world;
      delete this.panel.dataset.travel;
    }
    if (life) this.panel.dataset.practice = copy.setting ?? 'menu';
    else delete this.panel.dataset.practice;
    const picture = this.panel.querySelector<HTMLImageElement>('#practice-picture');
    if (picture) {
      picture.hidden = this.inWorld || !life || !copy.setting;
      if (life && copy.setting) {
        const green = ['road-check', 'road-traffic', 'road-cross', 'road-end'].includes(
          session.node ?? '',
        );
        const illustration = copy.setting === 'crossing' && green ? 'crossing-green' : copy.setting;
        picture.src = `${import.meta.env.BASE_URL}assets/practice/${illustration}.svg`;
        picture.alt = {
          crossing: '與熟悉的照顧者在人行道等候，前方有號誌與斑馬線',
          dining: '照顧者陪孩子坐在用餐位置，走道保持淨空',
          toilet: '照顧者陪孩子找有隱私的廁所，旁邊備有乾淨衣物',
          sensory: '照顧者陪孩子在安靜位置休息，旁邊放著可選用的耳罩',
          boundary: '兩人保持距離，用揮手代替碰觸，照顧者在旁協助',
          changes: '下雨時公園暫停活動，照顧者陪孩子討論其他選擇',
        }[copy.setting];
      }
    }
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
    const walkTitle = this.panel.querySelector<HTMLElement>('#world-walk-title');
    if (walkTitle) {
      walkTitle.hidden =
        !this.inWorld ||
        (session.node !== 'road-walk' && session.node !== 'toilet-find') ||
        session.helping;
      walkTitle.textContent = session.node === 'road-walk' ? '牽手同行' : '前往廁所';
    }
    for (const original of copy.prompts) {
      const text = this.inWorld && original === '你回到公園。' ? '你留在這裡。' : original;
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
        decorateButton(
          button,
          this.inWorld && choice.target === 'park' ? '繼續探索' : choice.label,
          choice.icon,
        );
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
    this.updateTravel();
    if (focus)
      this.panel
        .querySelector<HTMLButtonElement>(
          helping ? '[data-greeting="close-help"]' : '#greeting-choices button',
        )
        ?.focus();
  }
}
