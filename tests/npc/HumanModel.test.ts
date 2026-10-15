import { Bone, BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { HumanRig, disposeModel } from '../../src/npc/HumanModel';
import { ParkCharacter } from '../../src/npc/SeatedNPC';

/** 與 build_characters.py 輸出相同命名（GLTFLoader 移除「.」後）的最小骨架。 */
function fakeModel() {
  const root = new Group();
  const bone = (name: string, x: number, y: number, parent: Group | Bone): Bone => {
    const b = new Bone();
    b.name = name;
    b.position.set(x, y, 0);
    parent.add(b);
    return b;
  };
  const hips = bone('root', 0, 0.6, root);
  const neck = bone('neck02', 0, 0.35, hips);
  bone('head', 0, 0.1, neck);
  for (const [suffix, x] of [
    ['L', 0.15],
    ['R', -0.15],
  ] as const) {
    const shoulder = bone(`shoulder01${suffix}`, x, 0.3, hips);
    const elbow = bone(`lowerarm01${suffix}`, x * 0.5, -0.25, shoulder);
    bone(`wrist${suffix}`, 0, -0.22, elbow);
    const thigh = bone(`upperleg01${suffix}`, x * 0.5, -0.05, hips);
    bone(`lowerleg01${suffix}`, 0, -0.3, thigh);
  }
  const geometry = new BoxGeometry();
  const material = new MeshStandardMaterial();
  root.add(new Mesh(geometry, material));
  return { root, geometry, material, neck };
}

describe('MakeHuman 人物模型', () => {
  it('HumanRig 依綁定姿勢的模型座標分左右', () => {
    const { root } = fakeModel();
    const rig = new HumanRig(root);
    expect(rig.bone('shoulder01', 1)?.name).toBe('shoulder01L');
    expect(rig.bone('shoulder01', -1)?.name).toBe('shoulder01R');
    expect(rig.bone('neck02')?.name).toBe('neck02');
  });

  it('坐姿人物換上模型：隱藏自製身體、保留長椅；不能重複換或釋放後換', () => {
    const character = new ParkCharacter();
    const { root } = fakeModel();
    expect(character.attachModel(root)).toBe(true);
    expect(character.hasModel).toBe(true);
    expect(character.root.getObjectByName('bench-seat')?.visible).toBe(true);
    expect(character.root.getObjectByName('head')?.visible).toBe(true); // 模型內的骨頭
    const hidden = character.root.children.filter((child) => !child.visible).map((c) => c.name);
    expect(hidden).toContain('head-pivot');
    expect(hidden).not.toContain('park-friend-model');
    expect(character.attachModel(fakeModel().root)).toBe(false);
    character.dispose();
    expect(new ParkCharacter().attachModel(fakeModel().root)).toBe(true);
    const disposed = new ParkCharacter();
    disposed.dispose();
    expect(disposed.attachModel(fakeModel().root)).toBe(false);
  });

  it('拿球的站姿人物保留球；骨架不完整時不換', () => {
    const character = new ParkCharacter({ id: 'xiaoyu', pose: 'standing', prop: 'ball' });
    expect(character.attachModel(new Group())).toBe(false);
    expect(character.hasModel).toBe(false);
    expect(character.attachModel(fakeModel().root)).toBe(true);
    expect(character.root.getObjectByName('ball')?.visible).toBe(true);
    character.dispose();
  });

  it('揮手與點頭驅動骨頭，結束、停用動作或返回時回到靜止姿勢', () => {
    const character = new ParkCharacter({ id: 'test', pose: 'standing' });
    const { root, neck } = fakeModel();
    character.attachModel(root);
    const rig = new HumanRig(root);
    const shoulder = rig.bone('shoulder01', -1);
    if (!shoulder) throw new Error('需要 -x 側肩膀');
    const rest = shoulder.quaternion.clone();
    const neckRest = neck.quaternion.clone();
    character.playGesture('wave');
    for (let i = 0; i < 20; i += 1) character.update(0.05);
    expect(shoulder.quaternion.angleTo(rest)).toBeGreaterThan(1);
    for (let i = 0; i < 60; i += 1) character.update(0.05);
    expect(shoulder.quaternion.angleTo(rest)).toBeLessThan(1e-6);
    character.playGesture('nod');
    for (let i = 0; i < 16; i += 1) character.update(0.05);
    expect(neck.quaternion.angleTo(neckRest)).toBeGreaterThan(0.1);
    character.setMotionEnabled(false);
    expect(neck.quaternion.angleTo(neckRest)).toBeLessThan(1e-6);
    character.setMotionEnabled(true);
    character.playGesture('wave');
    character.update(0.05);
    character.playGesture(null);
    expect(shoulder.quaternion.equals(rest)).toBe(true);
    character.dispose();
  });

  it('釋放人物時一併釋放模型資源，且只釋放一次', () => {
    const character = new ParkCharacter();
    const { root, geometry, material } = fakeModel();
    let geometryDisposed = 0;
    let materialDisposed = 0;
    geometry.addEventListener('dispose', () => (geometryDisposed += 1));
    material.addEventListener('dispose', () => (materialDisposed += 1));
    character.attachModel(root);
    character.dispose();
    character.dispose();
    expect(geometryDisposed).toBe(1);
    expect(materialDisposed).toBe(1);
    expect(root.parent).toBeNull();
  });

  it('disposeModel 釋放未掛上的模型', () => {
    const { root, geometry } = fakeModel();
    let disposed = 0;
    geometry.addEventListener('dispose', () => (disposed += 1));
    const parent = new Group();
    parent.add(root);
    disposeModel(root);
    expect(disposed).toBe(1);
    expect(parent.children).toHaveLength(0);
  });
});
