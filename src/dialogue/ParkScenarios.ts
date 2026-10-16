import { GREETING_SCENARIO } from './Greeting';
import type { DialogueChoice, Scenario } from './Scenario';

/*
 * 公園練習情境 v0.1：全部是「待專業審查草案」，不宣稱療效（03 §5）。
 * 規則：對方不先開口、口語與動作選項完全對等、沒有計時或評價語、
 * 「先不參與」與返回安全區都不算失敗，每條路都能回公園。
 */

type PlayNode =
  | 'see'
  | 'watch'
  | 'asked-spoken'
  | 'asked-gesture'
  | 'want-now'
  | 'waiting'
  | 'played'
  | 'decline'
  | 'declined-spoken'
  | 'declined-gesture'
  | 'cope-later'
  | 'cope-other'
  | 'cope-feel'
  | 'decline-end'
  | 'not-now'
  | 'skipped';

const askChoices: readonly DialogueChoice<PlayNode>[] = [
  { label: '問一起玩', target: 'asked-spoken', icon: 'speech' },
  { label: '用手指球', target: 'asked-gesture', icon: 'nod' },
  { label: '先看一下', target: 'watch', icon: 'pause' },
  { label: '先不參與', target: 'not-now', icon: 'exit' },
];
const waitChoices: readonly DialogueChoice<PlayNode>[] = [
  { label: '說好', target: 'waiting', icon: 'speech' },
  { label: '點頭', target: 'waiting', icon: 'nod' },
  { label: '現在就玩', target: 'want-now', icon: 'speech' },
];
const copeChoices: readonly DialogueChoice<PlayNode>[] = [
  { label: '說好', target: 'cope-later', icon: 'speech' },
  { label: '點頭', target: 'cope-later', icon: 'nod' },
  { label: '去玩別的', target: 'cope-other', icon: 'park' },
  { label: '說我難過', target: 'cope-feel', icon: 'speech' },
];
const playEnd: readonly DialogueChoice<PlayNode>[] = [
  { label: '再練一次', target: 'see', icon: 'repeat' },
  { label: '回公園', target: 'park', icon: 'park' },
];

/** 小宇：請問可不可以一起玩；包含「等一下」與「現在不行」兩種回答。 */
export const PLAY_SCENARIO: Scenario<PlayNode> = {
  id: 'play',
  title: '一起玩',
  speaker: '小宇',
  launchLabel: '跟小宇說話',
  start: 'see',
  nodes: {
    see: {
      line: '',
      expression: 'excited',
      prompts: ['小宇在玩球。', '你想怎麼開始？'],
      choices: askChoices,
      help: ['可以用說的或用手指。', '也可以先看一下。'],
    },
    watch: {
      line: '',
      prompts: ['你在旁邊看小宇玩。', '想好了再選。'],
      choices: askChoices.filter((choice) => choice.target !== 'watch'),
      help: ['看一下再決定也可以。'],
    },
    'asked-spoken': {
      line: '可以。等我踢完這球。',
      expression: 'happy',
      prompts: ['你說：「可以一起玩嗎？」'],
      choices: waitChoices,
      help: ['說好或點頭都可以。', '也可以說現在就想玩。'],
      gesture: 'nod',
    },
    'asked-gesture': {
      line: '可以。等我踢完這球。',
      expression: 'happy',
      prompts: ['你用手指了球。'],
      choices: waitChoices,
      help: ['說好或點頭都可以。', '也可以說現在就想玩。'],
      gesture: 'nod',
    },
    'want-now': {
      line: '我踢完就換你。',
      expression: 'thinking',
      prompts: ['等一下就輪到你。'],
      choices: waitChoices.filter((choice) => choice.target === 'waiting'),
      help: ['說好或點頭都可以。'],
    },
    waiting: {
      line: '好了，換你踢。',
      expression: 'excited',
      prompts: ['小宇把球傳給你。'],
      choices: [{ label: '踢球', target: 'played', icon: 'done' }],
      help: ['按「踢球」把球踢回去。'],
    },
    played: {
      line: '',
      expression: 'excited',
      prompts: ['你跟小宇一起玩球。'],
      choices: [
        { label: '再練一次', target: 'see', icon: 'repeat' },
        { label: '換個回答', target: 'decline', icon: 'repeat' },
        { label: '回公園', target: 'park', icon: 'park' },
      ],
      help: ['換個回答會練習被拒絕。'],
      outcome: 'finished',
    },
    decline: {
      line: '',
      prompts: ['這次小宇會說不行。', '你想怎麼開始？'],
      choices: [
        { label: '問一起玩', target: 'declined-spoken', icon: 'speech' },
        { label: '用手指球', target: 'declined-gesture', icon: 'nod' },
        { label: '先不參與', target: 'not-now', icon: 'exit' },
      ],
      help: ['可以用說的或用手指。'],
    },
    'declined-spoken': {
      line: '現在不行，在比賽。',
      expression: 'worried',
      prompts: ['你說：「可以一起玩嗎？」'],
      choices: copeChoices,
      help: ['被拒絕時有很多做法。', '每一個都可以選。'],
    },
    'declined-gesture': {
      line: '現在不行，在比賽。',
      expression: 'worried',
      prompts: ['你用手指了球。'],
      choices: copeChoices,
      help: ['被拒絕時有很多做法。', '每一個都可以選。'],
    },
    'cope-later': {
      line: '謝謝。等一下再來。',
      expression: 'happy',
      prompts: ['你可以等一下再問。'],
      choices: [{ label: '結束練習', target: 'decline-end', icon: 'done' }],
      help: ['按「結束練習」。'],
    },
    'cope-other': {
      line: '',
      prompts: ['你先去玩別的。', '等一下可以再問。'],
      choices: [{ label: '結束練習', target: 'decline-end', icon: 'done' }],
      help: ['按「結束練習」。'],
    },
    'cope-feel': {
      line: '',
      prompts: ['難過是可以的。', '可以去做別的事。'],
      choices: [{ label: '結束練習', target: 'decline-end', icon: 'done' }],
      help: ['按「結束練習」。'],
    },
    'decline-end': {
      line: '',
      prompts: ['這次練習結束了。'],
      choices: playEnd,
      help: ['可以再練或回公園。'],
      outcome: 'finished',
    },
    'not-now': {
      line: '',
      prompts: ['你選了先不參與。'],
      choices: [{ label: '好', target: 'skipped', icon: 'done' }],
      help: ['按「好」回到公園。'],
    },
    skipped: {
      line: '',
      prompts: ['你回到公園。'],
      choices: [{ label: '回公園', target: 'park', icon: 'park' }],
      help: ['小宇還在玩球。'],
      outcome: 'skipped',
    },
  },
};

type LineNode =
  | 'arrive'
  | 'asked'
  | 'in-line'
  | 'her-turn'
  | 'slid'
  | 'cut'
  | 'cut-spoken'
  | 'cut-gesture'
  | 'cut-adult'
  | 'cut-let'
  | 'cut-end'
  | 'not-now'
  | 'skipped';

const slideDown: readonly DialogueChoice<LineNode>[] = [
  { label: '溜下去', target: 'cut-end', icon: 'done' },
];

/** 小晴：溜滑梯輪流排隊；可選擇練習有人插隊時的做法。 */
export const LINE_SCENARIO: Scenario<LineNode> = {
  id: 'line',
  title: '排隊',
  speaker: '小晴',
  launchLabel: '去排隊',
  start: 'arrive',
  nodes: {
    arrive: {
      line: '',
      prompts: ['小晴在排溜滑梯。', '你想怎麼做？'],
      choices: [
        { label: '排在後面', target: 'in-line', icon: 'nod' },
        { label: '問排隊嗎', target: 'asked', icon: 'speech' },
        { label: '先不參與', target: 'not-now', icon: 'exit' },
      ],
      help: ['可以直接排，也可以先問。'],
    },
    asked: {
      line: '對，我在排隊。',
      expression: 'happy',
      prompts: ['你問：「這是排隊嗎？」'],
      choices: [{ label: '排在後面', target: 'in-line', icon: 'nod' }],
      help: ['按「排在後面」。'],
      gesture: 'nod',
    },
    'in-line': {
      line: '我先溜，再換你。',
      expression: 'happy',
      prompts: ['你排在小晴後面。'],
      choices: [
        { label: '說好', target: 'her-turn', icon: 'speech' },
        { label: '點頭', target: 'her-turn', icon: 'nod' },
      ],
      help: ['說好或點頭都可以。'],
    },
    'her-turn': {
      line: '',
      expression: 'excited',
      prompts: ['小晴溜下去了。', '現在輪到你。'],
      choices: [{ label: '溜下去', target: 'slid', icon: 'done' }],
      help: ['按「溜下去」。'],
    },
    slid: {
      line: '',
      expression: 'happy',
      prompts: ['你溜下去了。', '溜完可以再排一次。'],
      choices: [
        { label: '再練一次', target: 'arrive', icon: 'repeat' },
        { label: '有人插隊', target: 'cut', icon: 'repeat' },
        { label: '回公園', target: 'park', icon: 'park' },
      ],
      help: ['練習有人插隊怎麼做。'],
      outcome: 'finished',
    },
    cut: {
      line: '',
      expression: 'surprised',
      prompts: ['有人站到你前面。', '你想怎麼做？'],
      choices: [
        { label: '說請排隊', target: 'cut-spoken', icon: 'speech' },
        { label: '指向後面', target: 'cut-gesture', icon: 'nod' },
        { label: '找大人', target: 'cut-adult', icon: 'exit' },
        { label: '讓他先溜', target: 'cut-let', icon: 'done' },
      ],
      help: ['這四種做法都可以選。'],
    },
    'cut-spoken': {
      line: '',
      prompts: ['你說：「請排後面。」', '他走到後面排隊了。'],
      choices: slideDown,
      help: ['按「溜下去」。'],
    },
    'cut-gesture': {
      line: '',
      prompts: ['你用手指後面。', '他走到後面排隊了。'],
      choices: slideDown,
      help: ['按「溜下去」。'],
    },
    'cut-adult': {
      line: '',
      prompts: ['你去找大人幫忙。', '大人請他排後面。'],
      choices: slideDown,
      help: ['按「溜下去」。'],
    },
    'cut-let': {
      line: '',
      prompts: ['你讓他先溜。', '等一下就輪到你。'],
      choices: slideDown,
      help: ['按「溜下去」。'],
    },
    'cut-end': {
      line: '',
      expression: 'happy',
      prompts: ['輪到你，你溜下去了。'],
      choices: [
        { label: '再練一次', target: 'arrive', icon: 'repeat' },
        { label: '回公園', target: 'park', icon: 'park' },
      ],
      help: ['可以再練或回公園。'],
      outcome: 'finished',
    },
    'not-now': {
      line: '',
      prompts: ['你選了先不參與。'],
      choices: [{ label: '好', target: 'skipped', icon: 'done' }],
      help: ['按「好」回到公園。'],
    },
    skipped: {
      line: '',
      prompts: ['你回到公園。'],
      choices: [{ label: '回公園', target: 'park', icon: 'park' }],
      help: ['小晴還在排隊。'],
      outcome: 'skipped',
    },
  },
};

type SwimNode =
  | 'plan'
  | 'said-no'
  | 'shook-head'
  | 'said-home'
  | 'heard'
  | 'offer'
  | 'still-no'
  | 'rest'
  | 'agree'
  | 'not-now'
  | 'skipped';

const confirmChoices: readonly DialogueChoice<SwimNode>[] = [
  { label: '說對', target: 'heard', icon: 'speech' },
  { label: '點頭', target: 'heard', icon: 'nod' },
];

/** 媽媽：放學後不想去游泳課；練習說出想法，與「先游泳，再玩 Switch」的約定。 */
export const SWIM_SCENARIO: Scenario<SwimNode> = {
  id: 'swim',
  title: '游泳課',
  speaker: '媽媽',
  launchLabel: '跟媽媽說話',
  start: 'plan',
  nodes: {
    plan: {
      line: '我們等一下去游泳。',
      expression: 'happy',
      prompts: ['你想回家玩玩具。', '你想怎麼說？'],
      choices: [
        { label: '說不想去', target: 'said-no', icon: 'speech' },
        { label: '搖頭', target: 'shook-head', icon: 'nod' },
        { label: '說想回家', target: 'said-home', icon: 'speech' },
        { label: '先不說', target: 'not-now', icon: 'exit' },
      ],
      help: ['說出來或搖頭都可以。', '也可以先不說。'],
    },
    'said-no': {
      line: '你今天不想去游泳。',
      expression: 'thinking',
      prompts: ['你說：「我不想去。」'],
      choices: confirmChoices,
      help: ['說對或點頭都可以。'],
    },
    'shook-head': {
      line: '你今天不想去游泳。',
      expression: 'thinking',
      prompts: ['你搖頭。'],
      choices: confirmChoices,
      help: ['說對或點頭都可以。'],
    },
    'said-home': {
      line: '你想回家玩玩具。',
      expression: 'thinking',
      prompts: ['你說：「我想回家玩。」'],
      choices: confirmChoices,
      help: ['說對或點頭都可以。'],
    },
    heard: {
      line: '謝謝你告訴我。',
      expression: 'happy',
      prompts: ['媽媽想到辦法了。'],
      choices: [{ label: '聽媽媽說', target: 'offer', icon: 'speech' }],
      help: ['按「聽媽媽說」。'],
      gesture: 'nod',
    },
    offer: {
      line: '先游泳，再玩Switch。',
      expression: 'excited',
      prompts: ['游完回家可以玩Switch。'],
      choices: [
        { label: '說好', target: 'agree', icon: 'speech' },
        { label: '點頭', target: 'agree', icon: 'nod' },
        { label: '還是不想', target: 'still-no', icon: 'speech' },
        { label: '想先休息', target: 'rest', icon: 'pause' },
      ],
      help: ['說好或點頭都可以。', '也可以說還是不想。'],
    },
    'still-no': {
      line: '你還是不想去。',
      expression: 'thinking',
      prompts: ['可以說你需要什麼。'],
      choices: [
        { label: '想先休息', target: 'rest', icon: 'pause' },
        { label: '說好', target: 'agree', icon: 'speech' },
        { label: '點頭', target: 'agree', icon: 'nod' },
        { label: '先不說', target: 'not-now', icon: 'exit' },
      ],
      help: ['說出需要什麼也可以。'],
    },
    rest: {
      line: '好，我們先坐一下。',
      expression: 'happy',
      prompts: ['休息好了再出發。'],
      choices: [
        { label: '說我好了', target: 'agree', icon: 'speech' },
        { label: '點頭', target: 'agree', icon: 'nod' },
      ],
      help: ['休息好了再按。'],
    },
    agree: {
      line: '好，我們出發吧。',
      expression: 'happy',
      prompts: ['先游泳，再玩Switch。'],
      choices: [
        { label: '再練一次', target: 'plan', icon: 'repeat' },
        { label: '回公園', target: 'park', icon: 'park' },
      ],
      help: ['可以再練或回公園。'],
      gesture: 'nod',
      outcome: 'finished',
    },
    'not-now': {
      line: '好，想說再跟我說。',
      expression: 'happy',
      prompts: ['你選了先不說。'],
      choices: [{ label: '好', target: 'skipped', icon: 'done' }],
      help: ['按「好」回到公園。'],
    },
    skipped: {
      line: '',
      prompts: ['你回到公園。'],
      choices: [{ label: '回公園', target: 'park', icon: 'park' }],
      help: ['媽媽還在門口。'],
      outcome: 'skipped',
    },
  },
};

/** 公園中每位人物對應的情境；`id` 與 ParkScene 的人物 id 相同。 */
export const PARK_SCENARIOS = {
  xiaoan: GREETING_SCENARIO,
  xiaoyu: PLAY_SCENARIO,
  xiaoqing: LINE_SCENARIO,
  mom: SWIM_SCENARIO,
} as const;

export type CharacterId = keyof typeof PARK_SCENARIOS;
