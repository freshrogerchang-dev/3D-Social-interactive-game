/** 對話資料模型：所有情境共用同一套節點與轉移規則（03 §3.1 不變條件）。 */
export type Outcome = 'finished' | 'skipped' | 'exited';
export type Gesture = 'wave' | 'nod';
/** 對方的臉部表情；表示對方自己的感受，不評價孩子的選擇。 */
export type Expression = 'neutral' | 'happy' | 'excited' | 'thinking' | 'surprised' | 'worried';
export type ChoiceIcon = 'speech' | 'nod' | 'park' | 'repeat' | 'exit' | 'done' | 'pause';

export interface DialogueChoice<Id extends string> {
  readonly label: string;
  readonly target: Id | 'park';
  readonly icon: ChoiceIcon;
}

export interface DialogueNode<Id extends string> {
  /** 對方說的話；空字串代表這一步只有旁白提示。 */
  readonly line: string;
  readonly prompts: readonly string[];
  readonly choices: readonly DialogueChoice<Id>[];
  readonly help: readonly string[];
  /** 進入節點時對方做一次的動作；不自動循環。 */
  readonly gesture?: Gesture;
  /** 進入節點時對方的表情；省略為平常的微笑。 */
  readonly expression?: Expression;
  /** 明確結束或先不參與的節點；返回安全區一律記為 exited。 */
  readonly outcome?: 'finished' | 'skipped';
}

export interface Scenario<Id extends string> {
  readonly id: string;
  /** 對話框標題。 */
  readonly title: string;
  /** 台詞前的說話者名稱。 */
  readonly speaker: string;
  /** 靠近後出現的開始按鈕文字。 */
  readonly launchLabel: string;
  readonly start: Id;
  readonly nodes: Readonly<Record<Id, DialogueNode<Id>>>;
}

/** 只有明確選擇改變節點；最近一次結果僅留在記憶體，不累計。 */
export class DialogueSession<Id extends string> {
  node: Id | null = null;
  outcome: Outcome | null = null;
  helping = false;

  constructor(readonly scenario: Scenario<Id>) {}

  get current(): DialogueNode<Id> | null {
    return this.node === null ? null : this.scenario.nodes[this.node];
  }

  start(): void {
    this.node = this.scenario.start;
    this.outcome = null;
    this.helping = false;
  }

  choose(index: number): boolean {
    const current = this.current;
    if (!current || this.helping) return false;
    const choice = current.choices[index];
    if (!choice) return false;
    if (choice.target === 'park') {
      this.node = null;
      return true;
    }
    const next = this.scenario.nodes[choice.target];
    // 從結束節點進入新的一輪（例如「換個回答」）時，不沿用上一輪結果。
    if (choice.target === this.scenario.start || (current.outcome && !next.outcome))
      this.outcome = null;
    this.node = choice.target;
    if (next.outcome) this.outcome = next.outcome;
    return true;
  }

  exit(): void {
    if (this.node !== null) this.outcome = 'exited';
    this.node = null;
    this.helping = false;
  }

  reset(): void {
    this.node = null;
    this.outcome = null;
    this.helping = false;
  }
}
