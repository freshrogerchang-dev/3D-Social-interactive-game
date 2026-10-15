import { DialogueSession } from './Scenario';
import type { DialogueChoice, Scenario } from './Scenario';

export type { Outcome } from './Scenario';
export type NodeId = 'greet' | 'spoken' | 'nod' | 'repair' | 'not-now' | 'finished' | 'skipped';

const followup: readonly DialogueChoice<NodeId>[] = [
  { label: '結束招呼', target: 'finished', icon: 'done' },
  { label: '再練一次', target: 'greet', icon: 'repeat' },
  { label: '換個方式', target: 'repair', icon: 'repeat' },
];

/** 小安：公園長椅打招呼（v0.1 待專業審查草案，03 §3）。 */
export const GREETING_SCENARIO: Scenario<NodeId> = {
  id: 'greeting',
  title: '打招呼',
  speaker: '小安',
  launchLabel: '打招呼',
  start: 'greet',
  nodes: {
    greet: {
      line: '你好。',
      prompts: ['你想怎麼回應？'],
      choices: [
        { label: '說你好', target: 'spoken', icon: 'speech' },
        { label: '點頭', target: 'nod', icon: 'nod' },
        { label: '先不參與', target: 'not-now', icon: 'exit' },
      ],
      help: ['說你好或點頭都可以。', '也可以先不參與。'],
      gesture: 'wave',
    },
    spoken: {
      line: '你好。我在這裡休息。',
      prompts: ['你說了「你好」。', '小安回應了你。'],
      choices: followup,
      help: ['可以結束或再練一次。', '也可以換個方式。'],
      gesture: 'nod',
    },
    nod: {
      line: '你好。我在這裡休息。',
      prompts: ['你點頭打招呼。', '小安回應了你。'],
      choices: followup,
      help: ['可以結束或再練一次。', '也可以換個方式。'],
      gesture: 'nod',
    },
    repair: {
      line: '',
      prompts: ['可以回到開始，重新選。'],
      choices: [
        { label: '回到開始', target: 'greet', icon: 'repeat' },
        { label: '結束招呼', target: 'finished', icon: 'done' },
      ],
      help: ['按「回到開始」重新選。'],
    },
    'not-now': {
      line: '好。我會在這裡。',
      prompts: ['你選了先不參與。'],
      choices: [{ label: '好', target: 'skipped', icon: 'done' }],
      help: ['按「好」回到公園。'],
    },
    finished: {
      line: '',
      prompts: ['這次打招呼結束了。'],
      choices: [
        { label: '再練一次', target: 'greet', icon: 'repeat' },
        { label: '回公園', target: 'park', icon: 'park' },
      ],
      help: ['可以再練或回公園。'],
      outcome: 'finished',
    },
    skipped: {
      line: '',
      prompts: ['你回到公園。'],
      choices: [{ label: '回公園', target: 'park', icon: 'park' }],
      help: ['小安還在長椅上。'],
      outcome: 'skipped',
    },
  },
};

export const GREETING = GREETING_SCENARIO.nodes;

export class Greeting extends DialogueSession<NodeId> {
  constructor() {
    super(GREETING_SCENARIO);
  }
}
