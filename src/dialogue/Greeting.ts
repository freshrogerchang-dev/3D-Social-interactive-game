export type NodeId = 'greet' | 'spoken' | 'nod' | 'repair' | 'not-now' | 'finished' | 'skipped';
export type Outcome = 'finished' | 'skipped' | 'exited';
interface Choice {
  readonly label: string;
  readonly target: NodeId | 'park';
}
interface Copy {
  readonly line: string;
  readonly prompts: readonly string[];
  readonly choices: readonly Choice[];
  readonly help: readonly string[];
}
const followup: readonly Choice[] = [
  { label: '結束招呼', target: 'finished' },
  { label: '再練一次', target: 'greet' },
  { label: '換個方式', target: 'repair' },
];
export const GREETING: Readonly<Record<NodeId, Copy>> = {
  greet: {
    line: '你好。',
    prompts: ['你想怎麼回應？'],
    choices: [
      { label: '說你好', target: 'spoken' },
      { label: '點頭', target: 'nod' },
      { label: '先不參與', target: 'not-now' },
    ],
    help: ['說你好或點頭都可以。', '也可以先不參與。'],
  },
  spoken: {
    line: '你好。我在這裡休息。',
    prompts: ['你說了「你好」。', '小安回應了你。'],
    choices: followup,
    help: ['可以結束或再練一次。', '也可以換個方式。'],
  },
  nod: {
    line: '你好。我在這裡休息。',
    prompts: ['你點頭打招呼。', '小安回應了你。'],
    choices: followup,
    help: ['可以結束或再練一次。', '也可以換個方式。'],
  },
  repair: {
    line: '',
    prompts: ['可以回到開始，重新選。'],
    choices: [
      { label: '回到開始', target: 'greet' },
      { label: '結束招呼', target: 'finished' },
    ],
    help: ['按「回到開始」重新選。'],
  },
  'not-now': {
    line: '好。我會在這裡。',
    prompts: ['你選了先不參與。'],
    choices: [{ label: '好', target: 'skipped' }],
    help: ['按「好」回到公園。'],
  },
  finished: {
    line: '',
    prompts: ['這次打招呼結束了。'],
    choices: [
      { label: '再練一次', target: 'greet' },
      { label: '回公園', target: 'park' },
    ],
    help: ['可以再練或回公園。'],
  },
  skipped: {
    line: '',
    prompts: ['你回到公園。'],
    choices: [{ label: '回公園', target: 'park' }],
    help: ['小安還在長椅上。'],
  },
};

/** 只有明確選擇改變節點；最近一次結果僅留在記憶體，不累計。 */
export class Greeting {
  node: NodeId | null = null;
  outcome: Outcome | null = null;
  helping = false;
  start(): void {
    this.node = 'greet';
    this.outcome = null;
    this.helping = false;
  }
  choose(index: number): boolean {
    if (!this.node || this.helping) return false;
    const choice = GREETING[this.node].choices[index];
    if (!choice) return false;
    if (choice.target === 'park') this.node = null;
    else {
      this.node = choice.target;
      if (this.node === 'greet') this.outcome = null;
      if (this.node === 'finished') this.outcome = 'finished';
      if (this.node === 'skipped') this.outcome = 'skipped';
    }
    return true;
  }
  exit(): void {
    if (this.node) this.outcome = 'exited';
    this.node = null;
    this.helping = false;
  }
  reset(): void {
    this.node = null;
    this.outcome = null;
    this.helping = false;
  }
}
