import { describe, expect, it } from 'vitest';
import { LIFE_SCENARIO } from '../../src/dialogue/LifeScenarios';
import { DialogueSession } from '../../src/dialogue/Scenario';
import { readingsOf } from '../../src/ui/GreetingPresentation';
import { voiceFile, voiceLines } from '../../src/dialogue/VoiceLines';

const nodes = LIFE_SCENARIO.nodes;
type Id = keyof typeof nodes;
const count = (text: string) => Array.from(new Intl.Segmenter('zh-TW').segment(text)).length;
function travel(labels: readonly string[]) {
  const session = new DialogueSession(LIFE_SCENARIO);
  session.start();
  for (const label of labels) {
    const index = session.current?.choices.findIndex((c) => c.label === label) ?? -1;
    expect(index, `${session.node ?? '無節點'}: ${label}`).toBeGreaterThanOrEqual(0);
    expect(session.choose(index)).toBe(true);
  }
  return session;
}

describe('生活練習：內容契約', () => {
  it('每個節點可達、可回公園且有求助；沒有隱藏或計時轉移', () => {
    const visited = new Set<Id>();
    const visit = (id: Id) => {
      if (visited.has(id)) return;
      visited.add(id);
      for (const c of nodes[id].choices)
        if (c.target !== 'park') {
          expect(nodes[c.target]).toBeDefined();
          visit(c.target);
        }
    };
    visit(LIFE_SCENARIO.start);
    expect([...visited].sort()).toEqual(Object.keys(nodes).sort());
    for (const id of visited) {
      const seen = new Set<Id>();
      const reachesPark = (current: Id): boolean => {
        if (seen.has(current)) return false;
        seen.add(current);
        return nodes[current].choices.some((c) => c.target === 'park' || reachesPark(c.target));
      };
      expect(reachesPark(id), id).toBe(true);
      expect(nodes[id].help.length).toBeGreaterThan(0);
      const session = new DialogueSession(LIFE_SCENARIO);
      session.node = id;
      session.helping = true;
      expect(session.choose(0)).toBe(false);
      expect(session.node).toBe(id);
      session.exit();
      expect(session.outcome).toBe('exited');
      expect(session.node).toBeNull();
    }
  });
  it('短句、四選項上限、中性用詞及全漢字注音', () => {
    for (const [id, node] of Object.entries(nodes)) {
      expect(count(node.line), id).toBeLessThanOrEqual(10);
      for (const line of [...node.prompts, ...node.help])
        expect(count(line), `${id}: ${line}`).toBeLessThanOrEqual(12);
      expect(node.choices.length).toBeGreaterThan(0);
      expect(node.choices.length).toBeLessThanOrEqual(4);
      expect(node.prompts.length + (node.line ? 1 : 0)).toBeLessThanOrEqual(3);
      for (const c of node.choices) expect(count(c.label), c.label).toBeLessThanOrEqual(4);
      expect(JSON.stringify(node)).not.toMatch(
        /失敗|錯誤|可惜|再努力|很棒|答對|乖|眼神|看著我|timeout/,
      );
      for (const text of [
        node.line,
        ...node.prompts,
        ...node.help,
        ...node.choices.map((c) => c.label),
      ]) {
        const readings = readingsOf(text);
        Array.from(text).forEach((ch, i) => {
          if (/\p{Script=Han}/u.test(ch)) expect(readings[i], `${ch}: ${text}`).toBeTruthy();
        });
      }
    }
  });
  it('新台詞進入語音清單，沿用媽媽與旁白，不新增資料蒐集', () => {
    const files = new Set(voiceLines().map((line) => line.file));
    for (const node of Object.values(nodes)) {
      if (node.line) expect(files.has(voiceFile('mom', node.line))).toBe(true);
      for (const prompt of node.prompts)
        expect(files.has(voiceFile('narrator', prompt))).toBe(true);
    }
  });
});

describe('生活練習：具體安全路徑', () => {
  it('過馬路須牽手、行人綠燈與車停讓；拒絕牽手不會直接走上馬路', () => {
    const session = travel(['過馬路', '牽手', '看看號誌', '車還在動']);
    expect(session.node).toBe('road-traffic');
    expect(session.outcome).toBeNull();
    session.choose(0);
    session.choose(0);
    expect(session.node).toBe('road-cross');
    session.choose(0);
    expect(session.node).toBe('road-walk');
    session.choose(0);
    expect(session.outcome).toBe('finished');
    expect(travel(['過馬路', '不想牽手', '說不舒服']).node).toBe('road-support');
    const incoming = Object.entries(nodes).filter(([, node]) =>
      node.choices.some((c) => c.target === 'road-cross'),
    );
    expect(incoming.map(([id]) => id)).toEqual(['road-check']);
    expect(nodes['road-support'].choices.some((c) => c.target === 'road-cross')).toBe(false);
    expect(travel(['過馬路', '先等等']).outcome).toBeNull();
  });
  it('吃飯時活動、噪音、桌下、掉物均有照顧者協助，可接到廁所', () => {
    for (const path of [
      ['外出吃飯', '想動一動', '結束練習'],
      ['外出吃飯', '不舒服', '這裡太吵', '出去休息', '結束練習'],
      ['外出吃飯', '不舒服', '東西掉了', '回座位', '結束練習'],
      ['外出吃飯', '不舒服', '想鑽桌下', '想安靜', '出去休息', '結束練習'],
    ])
      expect(travel(path).outcome).toBe('finished');
    expect(travel(['外出吃飯', '不舒服', '想上廁所']).node).toBe('toilet-ask');
  });
  it('不確定、害怕及尿濕都可求助，沒有憋尿或羞辱的路徑', () => {
    expect(travel(['上廁所', '不太確定', '一起看看', '到廁所了', '結束練習']).outcome).toBe(
      'finished',
    );
    expect(travel(['上廁所', '廁所可怕', '沖水太吵', '請幫幫我']).node).toBe('toilet-help');
    for (const label of ['請幫幫我', '想人陪']) {
      const session = travel(['上廁所', '已尿濕了', label]);
      expect(session.node).toBe('toilet-change');
      session.choose(0);
      expect(session.outcome).toBe('finished');
    }
    expect(nodes['toilet-wet'].line).toBe('我們去換乾淨衣服。');
    expect(JSON.stringify(nodes)).not.toMatch(/再忍|丟臉|羞羞|尿褲子|忍到|處罰/);
  });
  it('跳過、退出及換情境不累計也不沿用上輪完成結果', () => {
    const s = travel(['外出吃飯', '繼續吃', '結束練習', '換個情境']);
    expect(s.outcome).toBeNull();
    s.choose(3);
    expect(s.node).toBe('menu-extra');
    s.choose(0);
    s.choose(3);
    expect(s.outcome).toBe('skipped');
    s.exit();
    expect(s.outcome).toBe('exited');
  });
});

describe('新生活情境：自主選擇與保護界線', () => {
  const more = ['更多情境'];
  it('兩頁選單都能返回，原三情境與新三情境均可達', () => {
    expect(travel([...more, '上一頁']).node).toBe('menu');
    for (const label of ['太吵人多', '身體界線', '計畫改變'])
      expect(travel([...more, label, '先不參與']).outcome).toBe('skipped');
  });
  it('太吵時說的與手指對等；不必接受輔具或返回人群', () => {
    expect(nodes['sensory-start'].choices[0]?.target).toBe(
      nodes['sensory-start'].choices[1]?.target,
    );
    for (const path of [
      ['太吵人多', '想離開', '結束練習'],
      ['太吵人多', '說太吵', '熟悉輔具', '先不用', '結束練習'],
      ['太吵人多', '用手指', '熟悉輔具', '試看看', '還不舒服', '結束練習'],
    ])
      expect(travel([...more, ...path]).outcome).toBe('finished');
    expect(nodes['sensory-rest'].line).toBe('可以先不回去。');
  });
  it('拒絕與揮手都被尊重，對方未停下可離開求助，不責怪孩子', () => {
    for (const way of ['說不要', '揮手代替']) {
      expect(travel([...more, '身體界線', way, '結束練習']).outcome).toBe('finished');
      for (const help of ['說停下', '找媽媽', '先離開'])
        expect(travel([...more, '身體界線', way, '如果沒停', help]).node).toBe('boundary-help');
    }
    expect(nodes['boundary-help'].help).toContain('對方沒停下不是你的責任。');
    for (const [id, node] of Object.entries(nodes))
      if (id.startsWith('boundary-')) {
        expect(node.expression).toBe('neutral');
        expect(node.gesture).toBeUndefined();
        expect(JSON.stringify(node)).not.toMatch(/讓.*難過|應該.*抱|一定要.*親/);
      }
  });
  it('計畫改變的三種情況都容許失望、休息、不決定；餐點可不買', () => {
    for (const situation of ['下雨了', '遊具維修', '餐點賣完']) {
      expect(travel([...more, '計畫改變', situation, '說失望', '先休息', '結束練習']).outcome).toBe(
        'finished',
      );
      expect(travel([...more, '計畫改變', situation, '問下一步', '先不決定']).node).toBe(
        'change-rest',
      );
    }
    expect(travel([...more, '計畫改變', '餐點賣完', '先不買']).outcome).toBe('finished');
    expect(nodes['change-feeling'].prompts).toContain('不必馬上變得開心。');
    for (const [id, node] of Object.entries(nodes))
      if (id.startsWith('change-')) expect(node.expression).toBe('neutral');
  });
});
