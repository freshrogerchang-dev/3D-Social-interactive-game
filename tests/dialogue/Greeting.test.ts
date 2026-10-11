import { describe, expect, it } from 'vitest';
import { GREETING, Greeting } from '../../src/dialogue/Greeting';
import type { NodeId } from '../../src/dialogue/Greeting';

const count = (value: string): number =>
  Array.from(new Intl.Segmenter('zh-TW').segment(value)).length;

describe('打招呼內容與路徑', () => {
  it('全部節點可達且能返回公園，沒有懸空引用或死路', () => {
    const visited = new Set<NodeId>();
    const visit = (id: NodeId) => {
      if (visited.has(id)) return;
      visited.add(id);
      for (const c of GREETING[id].choices)
        if (c.target !== 'park') {
          expect(GREETING[c.target]).toBeDefined();
          visit(c.target);
        }
    };
    visit('greet');
    expect([...visited].sort()).toEqual(Object.keys(GREETING).sort());
    for (const id of visited) {
      const seen = new Set<NodeId>();
      const reachesPark = (node: NodeId): boolean => {
        if (seen.has(node)) return false;
        seen.add(node);
        return GREETING[node].choices.some((c) => c.target === 'park' || reachesPark(c.target));
      };
      expect(reachesPark(id), id).toBe(true);
    }
  });
  it('點頭與說你好台詞、後續選擇及幫助完全相同', () => {
    expect(GREETING.nod.line).toBe(GREETING.spoken.line);
    expect(GREETING.nod.choices).toEqual(GREETING.spoken.choices);
    expect(GREETING.nod.help).toEqual(GREETING.spoken.help);
  });
  it('每個節點符合文字長度、禁用詞與手動轉移規則', () => {
    for (const copy of Object.values(GREETING)) {
      expect(count(copy.line)).toBeLessThanOrEqual(10);
      for (const line of [...copy.prompts, ...copy.help])
        expect(count(line)).toBeLessThanOrEqual(12);
      for (const c of copy.choices) expect(count(c.label)).toBeLessThanOrEqual(4);
      expect(JSON.stringify(copy)).not.toMatch(/失敗|錯誤|可惜|再努力|很棒|答對|眼神|倒數|timeout/);
    }
  });
  it('所有節點都可保留原節點求助並退出，退出不算完成', () => {
    for (const id of Object.keys(GREETING) as NodeId[]) {
      const s = new Greeting();
      s.node = id;
      s.helping = true;
      expect(s.choose(0)).toBe(false);
      expect(s.node).toBe(id);
      s.helping = false;
      expect(s.node).toBe(id);
      s.exit();
      expect(s.node).toBeNull();
      expect(s.outcome).toBe('exited');
    }
  });
  it('先不參與只會 skipped，明確結束才 finished；重選不累計', () => {
    const s = new Greeting();
    s.start();
    s.choose(2);
    s.choose(0);
    expect(s.outcome).toBe('skipped');
    s.choose(0);
    expect(s.node).toBeNull();
    for (const index of [0, 1]) {
      s.start();
      s.choose(index);
      expect(s.outcome).toBeNull();
      s.choose(2);
      expect(s.node).toBe('repair');
      s.choose(0);
      expect(s.node).toBe('greet');
      s.choose(index);
      s.choose(0);
      expect(s.outcome).toBe('finished');
      s.choose(0);
      expect(s.outcome).toBeNull();
    }
    expect(s.choose(99)).toBe(false);
    s.reset();
    expect(s.outcome).toBeNull();
  });
});
