import type { DialogueChoice, DialogueNode } from './Scenario';

/** 表達需要、身體界線與計畫改變：待專業審查草案，不要求實際碰觸或播放刺激聲。 */
export type SupportNode =
  | 'sensory-start'
  | 'sensory-quiet'
  | 'sensory-leave'
  | 'sensory-aid'
  | 'sensory-check'
  | 'sensory-rest'
  | 'sensory-end'
  | 'boundary-start'
  | 'boundary-say'
  | 'boundary-wave'
  | 'boundary-persist'
  | 'boundary-help'
  | 'boundary-end'
  | 'change-start'
  | 'change-rain'
  | 'change-repair'
  | 'change-sold'
  | 'change-feeling'
  | 'change-options'
  | 'change-rest'
  | 'change-help'
  | 'change-alternate'
  | 'change-end';
type Target = SupportNode | 'menu-extra' | 'skipped';
const choice = (
  label: string,
  target: Target | 'park',
  icon: DialogueChoice<Target>['icon'] = 'speech',
): DialogueChoice<Target> => ({ label, target, icon });
const skip = choice('先不參與', 'skipped', 'exit');
type Copy = [
  line: string,
  prompts: readonly string[],
  choices: readonly DialogueChoice<Target>[],
  help: readonly string[],
];
const make = (
  setting: NonNullable<DialogueNode<Target>['setting']>,
  ...[line, prompts, choices, help]: Copy
): DialogueNode<Target> => ({ setting, line, prompts, choices, help, expression: 'neutral' });
const sensory = (...copy: Copy) => make('sensory', ...copy);
const boundary = (...copy: Copy) => make('boundary', ...copy);
const change = (...copy: Copy) => make('changes', ...copy);
const end = (start: SupportNode): readonly DialogueChoice<Target>[] => [
  choice('再練一次', start, 'repeat'),
  choice('換個情境', 'menu-extra', 'repeat'),
  choice('回公園', 'park', 'park'),
];
const changeChoices: readonly DialogueChoice<Target>[] = [
  choice('說失望', 'change-feeling'),
  choice('問下一步', 'change-options'),
  choice('先休息', 'change-rest', 'pause'),
];
const boundaryChoices: readonly DialogueChoice<Target>[] = [
  choice('結束練習', 'boundary-end', 'done'),
  choice('如果沒停', 'boundary-persist'),
];

export const SUPPORT_NODES: Readonly<Record<SupportNode, DialogueNode<Target>>> = {
  'sensory-start': sensory(
    '',
    ['這裡聲音大、人很多。', '你現在需要什麼？'],
    [
      choice('說太吵', 'sensory-quiet'),
      choice('用手指', 'sensory-quiet', 'nod'),
      choice('想離開', 'sensory-leave'),
      skip,
    ],
    ['可以說或指給照顧者看。', '不必等到很難受才求助。'],
  ),
  'sensory-quiet': sensory(
    '我陪你找安靜處。',
    ['你可以選舒服的方法。'],
    [
      choice('安靜休息', 'sensory-rest', 'pause'),
      choice('熟悉輔具', 'sensory-aid'),
      choice('請人陪', 'sensory-rest'),
      skip,
    ],
    ['可以先離開吵雜的地方。', '不用勉強自己適應。'],
  ),
  'sensory-leave': sensory(
    '我陪你一起離開。',
    ['先到安全、安靜的位置。'],
    [choice('先休息', 'sensory-rest', 'pause'), choice('結束練習', 'sensory-end', 'done')],
    ['由熟悉的照顧者陪同。', '不用獨自穿過人群。'],
  ),
  'sensory-aid': sensory(
    '選你平常舒服的輔具。',
    ['可以用熟悉的耳罩。'],
    [choice('試看看', 'sensory-check'), choice('先不用', 'sensory-rest')],
    ['使用自己熟悉的輔具。', '不想用也可以說。'],
  ),
  'sensory-check': sensory(
    '現在感覺怎麼樣？',
    [],
    [
      choice('舒服一些', 'sensory-rest'),
      choice('還不舒服', 'sensory-leave'),
      choice('不用了', 'sensory-leave'),
    ],
    ['還不舒服可以換個方法。', '不要求戴著繼續忍耐。'],
  ),
  'sensory-rest': sensory(
    '可以先不回去。',
    ['不用等到很難受才求助。'],
    [choice('結束練習', 'sensory-end', 'done'), choice('還要幫忙', 'sensory-leave'), skip],
    ['想休息多久都可以。', '回不回去可以再討論。'],
  ),
  'sensory-end': {
    ...sensory('', ['你表達了自己的需要。'], end('sensory-start'), ['說的、手指或離開都可以。']),
    outcome: 'finished',
  },
  'boundary-start': boundary(
    '',
    ['你不想被親友抱或親。', '你想怎麼回應？'],
    [
      choice('說不要', 'boundary-say'),
      choice('揮手代替', 'boundary-wave', 'nod'),
      choice('請人幫忙', 'boundary-help'),
      skip,
    ],
    ['即使是熟人也能拒絕。', '不需要真的抱抱或親親。'],
  ),
  'boundary-say': boundary(
    '你的身體由你決定。',
    ['你說了「我不想」。', '對方停下，保持距離。'],
    boundaryChoices,
    ['拒絕不必說出理由。', '不用為拒絕道歉。'],
  ),
  'boundary-wave': boundary(
    '揮手也可以。',
    ['你揮手，沒有抱抱或親親。', '對方接受你的選擇。'],
    boundaryChoices,
    ['不碰觸也能打招呼。', '不想揮手也可以拒絕。'],
  ),
  'boundary-persist': boundary(
    '',
    ['你不想被碰，對方還靠近。', '你現在想怎麼做？'],
    [
      choice('說停下', 'boundary-help'),
      choice('找媽媽', 'boundary-help'),
      choice('先離開', 'boundary-help', 'exit'),
    ],
    ['不用自己說服對方。', '可以離開並找照顧者幫忙。'],
  ),
  'boundary-help': boundary(
    '我會陪你拉開距離。',
    ['你告訴熟悉的照顧者。', '照顧者協助到安全位置。'],
    [
      choice('結束練習', 'boundary-end', 'done'),
      choice('再選一次', 'boundary-start', 'repeat'),
      skip,
    ],
    ['對方沒停下不是你的責任。', '先保護自己，再請人幫忙。'],
  ),
  'boundary-end': {
    ...boundary('', ['你表達了自己的界線。'], end('boundary-start'), [
      '每次都可以重新決定。',
      '對方應尊重你的選擇。',
    ]),
    outcome: 'finished',
  },
  'change-start': change(
    '',
    ['原本的計畫改變了。', '你想練習哪種情況？'],
    [
      choice('下雨了', 'change-rain'),
      choice('遊具維修', 'change-repair'),
      choice('餐點賣完', 'change-sold'),
      skip,
    ],
    ['可以失望、詢問或先休息。', '不必馬上變得開心。'],
  ),
  'change-rain': change(
    '今天先不去公園。',
    ['你原本想去公園玩。', '現在外面下雨了。'],
    changeChoices,
    ['可以說期待落空的感覺。', '也可以請人幫忙想辦法。'],
  ),
  'change-repair': change(
    '遊具維修，先不玩。',
    ['你想玩的遊具有圍欄。', '照顧者陪你停在外面。'],
    changeChoices,
    ['不進入圍起來的地方。', '你可以說出失望。'],
  ),
  'change-sold': change(
    '這個餐點賣完了。',
    ['你想吃的餐點沒有了。'],
    [...changeChoices, choice('先不買', 'change-end')],
    ['可以換別的，也可以不買。', '不強迫接受替代餐點。'],
  ),
  'change-feeling': change(
    '失望也可以說出來。',
    ['不必馬上變得開心。'],
    [choice('看看選擇', 'change-options'), choice('先休息', 'change-rest', 'pause'), skip],
    ['感受不需要被改正。', '也可以用手指或請人陪。'],
  ),
  'change-options': change(
    '你想怎麼安排？',
    ['可以選，也可以先不選。'],
    [
      choice('換個活動', 'change-alternate'),
      choice('先不決定', 'change-rest', 'pause'),
      choice('請幫幫我', 'change-help'),
      skip,
    ],
    ['選別的活動不是必須的。', '可以請照顧者一起討論。'],
  ),
  'change-rest': change(
    '不用現在決定。',
    ['先休息，想說時再說。'],
    [choice('結束練習', 'change-end', 'done'), choice('看看選擇', 'change-options'), skip],
    ['不倒數、不催促。', '不必用微笑表示接受。'],
  ),
  'change-help': change(
    '我們一起想想。',
    [],
    [
      choice('先休息', 'change-rest', 'pause'),
      choice('看看選擇', 'change-options'),
      choice('結束練習', 'change-end', 'done'),
    ],
    ['可以說出還需要什麼。', '不想繼續也可以結束。'],
  ),
  'change-alternate': change(
    '需要時還能再調整。',
    ['你選擇另一個活動。', '也可以繼續說出感受。'],
    [choice('結束練習', 'change-end', 'done'), choice('再想想', 'change-options', 'repeat')],
    ['沒有要求你立刻開心。'],
  ),
  'change-end': {
    ...change('', ['你選擇了現在的做法。'], end('change-start'), ['改選、休息或不買都可以。']),
    outcome: 'finished',
  },
};
