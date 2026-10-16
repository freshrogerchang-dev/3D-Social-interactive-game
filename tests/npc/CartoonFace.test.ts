import { Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { CartoonFace } from '../../src/npc/CartoonFace';
import type { Expression } from '../../src/dialogue/Scenario';

const EXPRESSIONS: readonly Expression[] = [
  'neutral',
  'happy',
  'excited',
  'thinking',
  'surprised',
  'worried',
];

function face(): CartoonFace {
  const m = () => new MeshStandardMaterial();
  return new CartoonFace(new Vector3(0.175, 0.165, 0.16), {
    skin: m(),
    lid: m(),
    eyeWhite: m(),
    iris: m(),
    pupil: m(),
    highlight: m(),
    brow: m(),
    mouth: m(),
    blush: m(),
  });
}

/** 表情的可見狀態：嘴型權重、眼皮、眉毛、眼睛位置。 */
function snapshot(f: CartoonFace): number[] {
  const values: number[] = [];
  f.root.traverse((object) => {
    if (object instanceof Mesh && object.morphTargetInfluences)
      values.push(...object.morphTargetInfluences);
    if (object.name.startsWith('eyelid') || object.name === 'brow')
      values.push(object.rotation.x, object.rotation.z, object.position.y);
    if (object.name === 'iris-group') values.push(object.position.x, object.position.y);
  });
  return values.map((value) => Math.round(value * 1000) / 1000);
}

describe('卡通臉部表情', () => {
  it('六種表情看起來都不一樣', () => {
    const f = face();
    const seen = new Set<string>();
    for (const expression of EXPRESSIONS) {
      f.setExpression(expression, false);
      seen.add(snapshot(f).join(','));
    }
    expect(seen.size).toBe(EXPRESSIONS.length);
    f.dispose();
  });

  it('過渡柔和：一幀只走一部分，之後收斂；delta 0 不變；不動畫時立即切換', () => {
    const f = face();
    const mouth = f.root.getObjectByName('mouth');
    if (!(mouth instanceof Mesh) || !mouth.morphTargetInfluences) throw new Error('需要嘴型');
    const open = 1; // morph target 順序：grin、open、flat、wobble、smirk
    f.setExpression('surprised');
    expect(mouth.morphTargetInfluences[open]).toBe(0);
    f.update(0);
    expect(mouth.morphTargetInfluences[open]).toBe(0);
    f.update(0.05);
    const step = mouth.morphTargetInfluences[open] ?? 0;
    expect(step).toBeGreaterThan(0.1);
    expect(step).toBeLessThan(0.9);
    for (let i = 0; i < 40; i += 1) f.update(0.05);
    expect(mouth.morphTargetInfluences[open]).toBeCloseTo(1, 3);
    f.setExpression('neutral', false);
    expect(mouth.morphTargetInfluences[open]).toBe(0);
    expect(f.expression).toBe('neutral');
    f.dispose();
  });

  it('沒有呼叫 setExpression 時臉不會自己變（沒有自動眨眼或循環）', () => {
    const f = face();
    const before = snapshot(f).join(',');
    for (let i = 0; i < 200; i += 1) f.update(0.05);
    expect(snapshot(f).join(',')).toBe(before);
    f.dispose();
  });

  it('dispose 釋放幾何並離開父節點，可重複呼叫', () => {
    const f = face();
    const mouth = f.root.getObjectByName('mouth');
    if (!(mouth instanceof Mesh)) throw new Error('需要嘴巴');
    let disposed = 0;
    (mouth.geometry as BufferGeometry).addEventListener('dispose', () => (disposed += 1));
    f.dispose();
    f.dispose();
    expect(disposed).toBe(1);
    expect(f.root.children).toHaveLength(0);
  });
});

describe('卡通臉部閒置動態', () => {
  it('開啟後會眨眼（短暫閉眼再張開）與看旁邊；關閉後立刻張眼看前方', () => {
    const f = face();
    const lid = f.root.getObjectByName('eyelid-upper');
    const iris = f.root.getObjectByName('iris-group');
    if (!lid || !iris) throw new Error('需要眼皮與虹膜');
    const open = lid.rotation.x;
    f.setIdle(true);
    let closed = false;
    let glanced = false;
    for (let i = 0; i < 400; i += 1) {
      f.update(0.025);
      if (lid.rotation.x > open + 1) closed = true;
      if (Math.abs(iris.position.x) > 0.001) glanced = true;
    }
    expect(closed).toBe(true);
    expect(glanced).toBe(true);
    f.setIdle(false);
    expect(lid.rotation.x).toBeCloseTo(open, 6);
    expect(iris.position.x).toBe(0);
    f.dispose();
  });
});
