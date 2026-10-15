import { describe, expect, it } from 'vitest';
import {
  LINE_SCENARIO,
  PARK_SCENARIOS,
  PLAY_SCENARIO,
  SWIM_SCENARIO,
} from '../../src/dialogue/ParkScenarios';
import { DialogueSession } from '../../src/dialogue/Scenario';
import type { Scenario } from '../../src/dialogue/Scenario';
import { PHRASE_READINGS, readingsOf } from '../../src/ui/GreetingPresentation';

const SCENARIOS: readonly Scenario<string>[] = Object.values(PARK_SCENARIOS);

/** 字數以字形計算；英文單字（例如 Switch）視為一個詞。 */
const count = (value: string): number =>
  Array.from(new Intl.Segmenter('zh-TW').segment(value.replace(/[A-Za-z]+/g, 'A'))).length;

const nodeIds = (scenario: Scenario<string>): string[] => Object.keys(scenario.nodes);

describe('公園練習情境：路徑', () => {
  it.each(SCENARIOS.map((s) => [s.id, s] as const))(
    '%s：全部節點可達、每個節點都能回公園',
    (_, scenario) => {
      const visited = new Set<string>();
      const visit = (id: string): void => {
        if (visited.has(id)) return;
        visited.add(id);
        const node = scenario.nodes[id];
        expect(node, id).toBeDefined();
        for (const choice of node?.choices ?? [])
          if (choice.target !== 'park') visit(choice.target);
      };
      visit(scenario.start);
      expect([...visited].sort()).toEqual(nodeIds(scenario).sort());
      for (const id of visited) {
        const seen = new Set<string>();
        const reachesPark = (node: string): boolean => {
          if (seen.has(node)) return false;
          seen.add(node);
          return (scenario.nodes[node]?.choices ?? []).some(
            (c) => c.target === 'park' || reachesPark(c.target),
          );
        };
        expect(reachesPark(id), id).toBe(true);
      }
    },
  );

  it('每個情境都有完成與先不參與兩種結果，且只能在明確節點取得', () => {
    for (const scenario of SCENARIOS) {
      const outcomes = Object.values(scenario.nodes).map((node) => node.outcome);
      expect(outcomes, scenario.id).toContain('finished');
      expect(outcomes, scenario.id).toContain('skipped');
      expect(scenario.nodes[scenario.start]?.outcome, scenario.id).toBeUndefined();
    }
  });

  it('說的與動作的選項得到完全相同的回應與後續', () => {
    const pairs = [
      [PLAY_SCENARIO.nodes['asked-spoken'], PLAY_SCENARIO.nodes['asked-gesture']],
      [PLAY_SCENARIO.nodes['declined-spoken'], PLAY_SCENARIO.nodes['declined-gesture']],
      [LINE_SCENARIO.nodes['cut-spoken'], LINE_SCENARIO.nodes['cut-gesture']],
      [SWIM_SCENARIO.nodes['said-no'], SWIM_SCENARIO.nodes['shook-head']],
    ] as const;
    for (const [spoken, gesture] of pairs) {
      expect(gesture.line).toBe(spoken.line);
      expect(gesture.choices).toEqual(spoken.choices);
      expect(gesture.help).toEqual(spoken.help);
      expect(gesture.gesture).toBe(spoken.gesture);
    }
    // 同一節點裡「說好」與「點頭」前往同一步。
    for (const scenario of SCENARIOS)
      for (const node of Object.values(scenario.nodes)) {
        const say = node.choices.find((c) => c.label === '說好');
        const nod = node.choices.find((c) => c.label === '點頭');
        if (say && nod) expect(nod.target).toBe(say.target);
      }
  });
});

describe('公園練習情境：文字與注音', () => {
  it('文字長度、禁用詞與選項數符合 03 規則', () => {
    for (const scenario of SCENARIOS)
      for (const [id, node] of Object.entries(scenario.nodes)) {
        const where = `${scenario.id}:${id}`;
        expect(count(node.line), where).toBeLessThanOrEqual(10);
        for (const line of [...node.prompts, ...node.help])
          expect(count(line), `${where} ${line}`).toBeLessThanOrEqual(12);
        for (const c of node.choices)
          expect(count(c.label), `${where} ${c.label}`).toBeLessThanOrEqual(4);
        expect(node.choices.length, where).toBeGreaterThan(0);
        expect(node.choices.length, where).toBeLessThanOrEqual(4);
        expect(node.prompts.length + (node.line ? 1 : 0), where).toBeLessThanOrEqual(3);
        expect(JSON.stringify(node), where).not.toMatch(
          /失敗|錯誤|可惜|再努力|很棒|答對|乖|眼神|看著我|倒數|秒|timeout/,
        );
      }
  });

  it('所有畫面文字的漢字都有人工注音（詞語優先）', () => {
    const texts = SCENARIOS.flatMap((scenario) => [
      scenario.title,
      scenario.launchLabel,
      ...Object.values(scenario.nodes).flatMap((node) => [
        `${scenario.speaker}：${node.line}`,
        ...node.prompts,
        ...node.help,
        ...node.choices.map((choice) => choice.label),
      ]),
    ]);
    texts.push('靠近再說話');
    for (const text of texts) {
      const readings = readingsOf(text);
      Array.from(text).forEach((character, index) => {
        if (/\p{Script=Han}/u.test(character))
          expect(readings[index], `${character}（${text}）`).toBeTruthy();
      });
    }
  });

  it('疊字詞的後字讀輕聲，單字讀音不受影響', () => {
    expect(readingsOf('媽媽')).toEqual(['ㄇㄚ', '˙ㄇㄚ']);
    expect(readingsOf('謝謝你')).toEqual(['ㄒㄧㄝˋ', '˙ㄒㄧㄝ', 'ㄋㄧˇ']);
    expect(readingsOf('聽媽媽說')).toEqual(['ㄊㄧㄥ', 'ㄇㄚ', '˙ㄇㄚ', 'ㄕㄨㄛ']);
    expect(readingsOf('Switch')).toEqual([null, null, null, null, null, null]);
    for (const [word, readings] of Object.entries(PHRASE_READINGS))
      expect(readings).toHaveLength(Array.from(word).length);
  });
});

describe('公園練習情境：對話狀態', () => {
  it('任何節點求助都保留原節點，返回安全區記為 exited', () => {
    for (const scenario of SCENARIOS)
      for (const id of nodeIds(scenario)) {
        const session = new DialogueSession(scenario);
        session.node = id;
        session.helping = true;
        expect(session.choose(0)).toBe(false);
        expect(session.node).toBe(id);
        session.helping = false;
        session.exit();
        expect(session.node).toBeNull();
        expect(session.outcome).toBe('exited');
      }
  });

  it('一起玩：完成後「換個回答」開始新的一輪，不沿用上一輪結果', () => {
    const session = new DialogueSession(PLAY_SCENARIO);
    const pick = (label: string): void => {
      const index = session.current?.choices.findIndex((c) => c.label === label) ?? -1;
      expect(session.choose(index), label).toBe(true);
    };
    session.start();
    pick('問一起玩');
    pick('點頭');
    pick('踢球');
    expect(session.outcome).toBe('finished');
    pick('換個回答');
    expect(session.node).toBe('decline');
    expect(session.outcome).toBeNull();
    pick('用手指球');
    pick('說我難過');
    expect(session.outcome).toBeNull();
    pick('結束練習');
    expect(session.outcome).toBe('finished');
    pick('回公園');
    expect(session.node).toBeNull();
  });

  it('游泳課：說不想去、休息後同意，或先不說；沒有逼迫的單一路線', () => {
    const session = new DialogueSession(SWIM_SCENARIO);
    const pick = (label: string): void => {
      const index = session.current?.choices.findIndex((c) => c.label === label) ?? -1;
      expect(session.choose(index), label).toBe(true);
    };
    session.start();
    pick('搖頭');
    pick('點頭');
    pick('聽媽媽說');
    pick('還是不想');
    pick('先不說');
    pick('好');
    expect(session.outcome).toBe('skipped');
    session.start();
    expect(session.outcome).toBeNull();
    pick('說不想去');
    pick('說對');
    pick('聽媽媽說');
    pick('想先休息');
    pick('說我好了');
    expect(session.node).toBe('agree');
    expect(session.outcome).toBe('finished');
  });

  it('排隊：插隊時四種做法都可以選，結果都能輪到自己', () => {
    const cut = LINE_SCENARIO.nodes.cut;
    expect(cut.choices).toHaveLength(4);
    for (const choice of cut.choices) {
      const session = new DialogueSession(LINE_SCENARIO);
      session.node = 'cut';
      session.choose(cut.choices.indexOf(choice));
      session.choose(0);
      expect(session.node, choice.label).toBe('cut-end');
      expect(session.outcome).toBe('finished');
    }
  });
});
