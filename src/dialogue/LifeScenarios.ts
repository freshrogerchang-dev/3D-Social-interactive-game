import type { DialogueChoice, DialogueNode, Scenario } from './Scenario';

/** 生活練習 v0.1，待專業審查；都是示意情境，不要求孩子實際執行身體動作。 */
type LifeNode =
  | 'menu'
  | 'skipped'
  | 'road-start'
  | 'road-hold'
  | 'road-check'
  | 'road-traffic'
  | 'road-touch'
  | 'road-support'
  | 'road-wait'
  | 'road-cross'
  | 'road-end'
  | 'dining-start'
  | 'dining-eat'
  | 'dining-needs'
  | 'dining-move'
  | 'dining-noise'
  | 'dining-dropped'
  | 'dining-under'
  | 'dining-end'
  | 'toilet-start'
  | 'toilet-ask'
  | 'toilet-unsure'
  | 'toilet-find'
  | 'toilet-help'
  | 'toilet-scared'
  | 'toilet-quiet'
  | 'toilet-ready'
  | 'toilet-wet'
  | 'toilet-change'
  | 'toilet-rest'
  | 'toilet-end';
const choice = (
  label: string,
  target: LifeNode | 'park',
  icon: DialogueChoice<LifeNode>['icon'] = 'speech',
): DialogueChoice<LifeNode> => ({ label, target, icon });
const skip = choice('先不參與', 'skipped', 'exit');
const endChoices: readonly DialogueChoice<LifeNode>[] = [
  choice('換個情境', 'menu', 'repeat'),
  choice('回公園', 'park', 'park'),
];
const node = (
  setting: 'crossing' | 'dining' | 'toilet',
  line: string,
  prompts: readonly string[],
  choices: readonly DialogueChoice<LifeNode>[],
  help: readonly string[],
): DialogueNode<LifeNode> => ({ setting, line, prompts, choices, help, expression: 'neutral' });
const road = (...args: Parameters<typeof node> extends [unknown, ...infer Rest] ? Rest : never) =>
  node('crossing', ...args);
const dining = (...args: Parameters<typeof node> extends [unknown, ...infer Rest] ? Rest : never) =>
  node('dining', ...args);
const toilet = (...args: Parameters<typeof node> extends [unknown, ...infer Rest] ? Rest : never) =>
  node('toilet', ...args);

export const LIFE_SCENARIO: Scenario<LifeNode> = {
  id: 'life',
  title: '生活練習',
  speaker: '媽媽',
  launchLabel: '生活練習',
  start: 'menu',
  nodes: {
    menu: {
      line: '',
      prompts: ['和熟悉的照顧者一起練習。', '你想選哪個情境？'],
      choices: [
        choice('過馬路', 'road-start'),
        choice('外出吃飯', 'dining-start'),
        choice('上廁所', 'toilet-start'),
        skip,
      ],
      help: ['這裡是練習示意。', '可以求助或隨時退出。'],
    },
    skipped: {
      line: '',
      prompts: ['你選了先不參與。'],
      choices: endChoices,
      help: ['可以回公園或換個情境。'],
      outcome: 'skipped',
    },
    'road-start': road(
      '',
      ['你和媽媽在人行道。', '前面是馬路。', '你想怎麼做？'],
      [
        choice('牽手', 'road-hold', 'nod'),
        choice('不想牽手', 'road-touch'),
        choice('先等等', 'road-wait', 'pause'),
        skip,
      ],
      ['先留在人行道。', '與熟悉的照顧者一起。'],
    ),
    'road-hold': road(
      '先等行人綠燈。',
      ['你牽著媽媽的手。', '牽手後也要確認路況。'],
      [choice('看看號誌', 'road-check'), choice('先等等', 'road-wait', 'pause')],
      ['不是牽手就能直接走。'],
    ),
    'road-check': road(
      '',
      ['現在行人綠燈亮了。', '還要確認車輛停讓。', '你看到什麼？'],
      [
        choice('車停讓了', 'road-cross'),
        choice('車還在動', 'road-traffic'),
        choice('請幫幫我', 'road-traffic'),
      ],
      ['綠燈也要確認車輛。', '不確定就和媽媽一起等。'],
    ),
    'road-traffic': road(
      '我們先不走。',
      ['留在人行道等車停讓。'],
      [choice('再確認', 'road-check', 'repeat'), choice('先等等', 'road-wait', 'pause'), skip],
      ['不追車、不搶著走。', '請照顧者一起確認。'],
    ),
    'road-touch': road(
      '先留在人行道。',
      ['你可以說哪裡不舒服。'],
      [
        choice('說不舒服', 'road-support'),
        choice('請幫幫我', 'road-support'),
        choice('先等等', 'road-wait', 'pause'),
      ],
      ['不用忍著不舒服。', '先停下，請照顧者協助。'],
    ),
    'road-support': road(
      '我陪你想辦法。',
      ['安排好安全方式再過。', '現在先留在人行道。'],
      [choice('先等等', 'road-wait', 'pause'), choice('換個情境', 'menu', 'repeat'), skip],
      ['照顧者安排安全方式。', '不獨自穿越馬路。'],
    ),
    'road-wait': road(
      '好，我們先等。',
      ['你們留在人行道。'],
      [choice('重新選擇', 'road-start', 'repeat'), choice('換個情境', 'menu', 'repeat'), skip],
      ['想休息多久都可以。', '沒有倒數或催促。'],
    ),
    'road-cross': road(
      '我們一起走斑馬線。',
      ['行人綠燈，車輛已停讓。', '你牽著媽媽一起走。'],
      [choice('到了對面', 'road-end', 'done')],
      ['只與熟悉的照顧者同行。', '這是示意，不是即時路況。'],
    ),
    'road-end': {
      ...road(
        '',
        ['你們一起走到對面。'],
        [choice('再練一次', 'road-start', 'repeat'), ...endChoices],
        ['過馬路仍需照顧者協助。'],
      ),
      outcome: 'finished',
    },
    'dining-start': dining(
      '',
      ['你和媽媽在外面吃飯。', '你現在需要什麼？'],
      [
        choice('繼續吃', 'dining-eat'),
        choice('想動一動', 'dining-move'),
        choice('不舒服', 'dining-needs'),
        skip,
      ],
      ['想活動或不舒服都能說。'],
    ),
    'dining-eat': dining(
      '我們坐在位置吃。',
      ['想離開可以告訴媽媽。'],
      [
        choice('想動一動', 'dining-move'),
        choice('想上廁所', 'toilet-ask'),
        choice('結束練習', 'dining-end', 'done'),
      ],
      ['吃東西時留在用餐位置。', '需要離開可以請人陪。'],
    ),
    'dining-needs': dining(
      '你需要什麼幫忙？',
      ['可以說，也可以指給媽媽。'],
      [
        choice('這裡太吵', 'dining-noise'),
        choice('東西掉了', 'dining-dropped'),
        choice('想鑽桌下', 'dining-under'),
        choice('想上廁所', 'toilet-ask'),
      ],
      ['不舒服時可以請人幫忙。'],
    ),
    'dining-move': dining(
      '我陪你去旁邊活動。',
      ['避開熱食和走道。', '休息好了再決定。'],
      [
        choice('回座位', 'dining-eat'),
        choice('想上廁所', 'toilet-ask'),
        choice('結束練習', 'dining-end', 'done'),
      ],
      ['和照顧者一起找安全位置。', '不在用餐走道跑動。'],
    ),
    'dining-noise': dining(
      '我們找安靜的地方。',
      ['可以換位置或出去休息。'],
      [choice('換位置', 'dining-eat'), choice('出去休息', 'dining-move', 'pause'), skip],
      ['太吵可以說，不用勉強。'],
    ),
    'dining-dropped': dining(
      '我幫你撿。',
      ['先留在位置，請大人幫忙。'],
      [choice('回座位', 'dining-eat'), choice('還要幫忙', 'dining-needs')],
      ['不必自己鑽進桌子下面。'],
    ),
    'dining-under': dining(
      '我們找安全的地方。',
      ['桌邊有人走動、端熱食。', '想安靜或活動都能說。'],
      [
        choice('想安靜', 'dining-noise'),
        choice('想動一動', 'dining-move'),
        choice('請幫幫我', 'dining-needs'),
      ],
      ['請照顧者陪你離開桌下。', '一起找適合休息的位置。'],
    ),
    'dining-end': {
      ...dining(
        '',
        ['你說出了現在的需要。'],
        [choice('再練一次', 'dining-start', 'repeat'), ...endChoices],
        ['吃飯、活動或休息都能說。'],
      ),
      outcome: 'finished',
    },
    'toilet-start': toilet(
      '想尿尿可以現在說。',
      ['玩到一半也能去廁所。', '你現在需要什麼？'],
      [
        choice('想尿尿', 'toilet-ask'),
        choice('不太確定', 'toilet-unsure'),
        choice('廁所可怕', 'toilet-scared'),
        choice('已尿濕了', 'toilet-wet'),
      ],
      ['不必等遊戲或吃飯結束。', '不確定也能請照顧者幫忙。'],
    ),
    'toilet-ask': toilet(
      '好，我陪你找廁所。',
      ['不必等遊戲結束。'],
      [choice('找標誌', 'toilet-find'), choice('請幫幫我', 'toilet-help'), skip],
      ['可以現在告訴熟悉的大人。'],
    ),
    'toilet-unsure': toilet(
      '不確定也可以說。',
      ['可以請媽媽陪你去看看。'],
      [choice('一起看看', 'toilet-find'), choice('請幫幫我', 'toilet-help'), skip],
      ['不需要等到很急才求助。'],
    ),
    'toilet-find': toilet(
      '我們一起找廁所。',
      ['找不到就問工作人員。'],
      [choice('到廁所了', 'toilet-ready'), choice('找不到', 'toilet-help')],
      ['由熟悉的照顧者陪同。'],
    ),
    'toilet-help': toilet(
      '我會陪你一起處理。',
      ['可以幫忙找位置或衣物。'],
      [choice('一起去', 'toilet-find'), choice('想先休息', 'toilet-rest', 'pause'), skip],
      ['找不到或衣物難弄都能說。'],
    ),
    'toilet-scared': toilet(
      '我陪你，你怕什麼？',
      ['可以說，也可以用手指。'],
      [
        choice('沖水太吵', 'toilet-quiet'),
        choice('想人陪', 'toilet-help'),
        choice('不想說', 'toilet-rest', 'pause'),
      ],
      ['怕聲音或陌生環境都能說。'],
    ),
    'toilet-quiet': toilet(
      '我們先避開聲音。',
      ['請照顧者協助找安靜位置。'],
      [choice('請幫幫我', 'toilet-help'), choice('一起看看', 'toilet-find'), skip],
      ['不強迫靠近害怕的聲音。'],
    ),
    'toilet-ready': toilet(
      '需要幫忙就告訴我。',
      ['你可以先去上廁所。', '這裡不需要真的操作。'],
      [choice('結束練習', 'toilet-end', 'done'), choice('衣物幫忙', 'toilet-help')],
      ['需要隱私可以告訴媽媽。'],
    ),
    'toilet-wet': toilet(
      '我們去換乾淨衣服。',
      ['尿濕了也可以請人幫忙。'],
      [
        choice('請幫幫我', 'toilet-change'),
        choice('想人陪', 'toilet-change'),
        choice('先休息', 'toilet-rest', 'pause'),
      ],
      ['不責備，也不需要道歉。', '由熟悉的照顧者協助。'],
    ),
    'toilet-change': toilet(
      '我陪你換衣和清潔。',
      ['找有隱私的地方處理。'],
      [choice('結束練習', 'toilet-end', 'done'), choice('還要幫忙', 'toilet-help')],
      ['換衣或清潔都能請人幫忙。'],
    ),
    'toilet-rest': toilet(
      '我會陪你。',
      ['你可以休息或再說需要。'],
      [choice('請幫幫我', 'toilet-help'), choice('結束練習', 'toilet-end', 'done'), skip],
      ['可以停下，不催促不責備。'],
    ),
    'toilet-end': {
      ...toilet(
        '',
        ['這次練習結束了。'],
        [choice('再練一次', 'toilet-start', 'repeat'), ...endChoices],
        ['有感覺或不確定都能求助。'],
      ),
      outcome: 'finished',
    },
  },
};
