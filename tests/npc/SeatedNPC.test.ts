import { Mesh, MeshStandardMaterial, PerspectiveCamera, Texture, Vector3 } from 'three';
import type { BufferGeometry, WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { FirstPersonController } from '../../src/input/FirstPersonController';
import { SeatedNPC } from '../../src/npc/SeatedNPC';
import { ParkScene } from '../../src/scene/ParkScene';

const position = (z: number) => ({ x: 0, y: 1.1, z });

describe('卡通人物（長椅上的小安）', () => {
  it('表情在動作與停用動作切換後保留，重複 dispose 只釋放一次臉部資源', () => {
    const npc = new SeatedNPC();
    const mouth = npc.root.getObjectByName('mouth');
    if (!(mouth instanceof Mesh)) throw new Error('需要嘴巴');
    let disposed = 0;
    (mouth.geometry as BufferGeometry).addEventListener('dispose', () => {
      disposed += 1;
    });
    npc.setExpression('surprised');
    npc.playGesture('wave');
    for (let i = 0; i < 40; i++) npc.update(0.05);
    npc.setMotionEnabled(false);
    expect(npc.expression).toBe('surprised');
    npc.dispose();
    npc.dispose();
    expect(disposed).toBe(1);
    npc.setExpression('happy');
    expect(npc.expression).toBe('surprised');
  });

  it('單次點頭結束回中立，零 delta 不更新，停用動作立即重設', () => {
    const npc = new SeatedNPC();
    const pivot = npc.root.getObjectByName('head-pivot');
    if (!pivot) throw new Error('missing head pivot');
    npc.playGesture('nod');
    for (let i = 0; i < 16; i++) npc.update(0.05);
    expect(pivot.rotation.x).toBeCloseTo(0.16);
    npc.update(0);
    expect(pivot.rotation.x).toBeCloseTo(0.16);
    npc.setMotionEnabled(false);
    expect(pivot.rotation.x).toBe(0);
    npc.playGesture('nod');
    npc.update(0.05);
    expect(pivot.rotation.x).toBe(0);
    npc.setMotionEnabled(true);
    npc.playGesture('nod');
    for (let i = 0; i < 40; i++) npc.update(0.05);
    expect(pivot.rotation.x).toBe(0);
    npc.dispose();
  });
  it('揮手時手舉到頭旁並擺動；不移動角色、長椅或鏡頭；結束、退出會回到原姿勢', () => {
    const npc = new SeatedNPC();
    const pivot = npc.root.getObjectByName('arm-pivot');
    const hand = pivot?.getObjectByName('hand');
    const head = npc.root.getObjectByName('head');
    if (!pivot || !hand || !head) throw new Error('missing wave parts');
    const rest = pivot.rotation.clone();
    const restHand = hand.getWorldPosition(new Vector3());
    npc.playGesture('wave');
    for (let i = 0; i < 16; i++) npc.update(0.05);
    expect(hand.getWorldPosition(new Vector3()).y).toBeGreaterThan(
      head.getWorldPosition(new Vector3()).y,
    );
    const first = hand.getWorldPosition(new Vector3());
    for (let i = 0; i < 6; i++) npc.update(0.05);
    expect(first.distanceTo(hand.getWorldPosition(new Vector3()))).toBeGreaterThan(0.005);
    for (let i = 0; i < 60; i++) npc.update(0.05);
    expect(pivot.rotation.equals(rest)).toBe(true);
    expect(hand.getWorldPosition(new Vector3()).distanceTo(restHand)).toBeLessThan(1e-9);
    expect(npc.root.position.toArray()).toEqual([0, 0, -2]);
    expect(npc.root.getObjectByName('bench-seat')?.rotation.z).toBe(0);
    npc.playGesture('wave');
    npc.update(0.05);
    npc.playGesture(null);
    expect(pivot.rotation.equals(rest)).toBe(true);
    npc.dispose();
    npc.playGesture('wave');
    npc.update(0.05);
    expect(pivot.rotation.equals(rest)).toBe(true);
  });

  it('坐姿、長椅與位置固定，接近判斷不改位置或朝向，也不依賴視線高度', () => {
    const npc = new SeatedNPC();
    expect(npc.root.getObjectByName('bench-seat')).toBeInstanceOf(Mesh);
    expect(npc.root.getObjectByName('head')).toBeInstanceOf(Mesh);
    const original = npc.root.matrix.clone();
    expect(npc.distanceTo(position(3.5))).toBe(5.5);
    for (let i = 0; i < 100; i += 1) npc.isNear({ x: i / 100, y: 100, z: -1 }, false);
    expect(npc.root.position.toArray()).toEqual([0, 0, -2]);
    expect(npc.root.rotation.toArray()).toEqual([0, 0, 0, 'XYZ']);
    expect(npc.root.matrix.equals(original)).toBe(true);
    npc.dispose();
  });

  it('距離提示有接近／離開門檻，不因微小距離反覆切換', () => {
    const npc = new SeatedNPC();
    expect(npc.isNear(position(0.7), false)).toBe(true);
    expect(npc.isNear(position(0.9), false)).toBe(false);
    expect(npc.isNear(position(0.9), true)).toBe(true);
    expect(npc.isNear(position(1.3), true)).toBe(false);
    npc.dispose();
  });

  it('點地面前往會在 NPC 個人空間外停止，不穿過角色與長椅', () => {
    const npc = new SeatedNPC();
    const camera = new PerspectiveCamera();
    camera.position.set(0, 1.1, 3.5);
    const controller = new FirstPersonController(camera, [npc.obstacle]);
    controller.setEnabled(true);
    controller.moveTo(0, -7);
    for (let i = 0; i < 1200; i += 1) controller.update(1 / 60);
    expect(npc.distanceTo(camera.position)).toBeGreaterThanOrEqual(npc.obstacle.radius);
    expect(camera.position.z).toBeGreaterThan(-0.81);
    const stopped = camera.position.clone();
    for (let i = 0; i < 60; i += 1) controller.update(1 / 60);
    expect(camera.position.equals(stopped)).toBe(true);
    controller.moveTo(3, camera.position.z);
    for (let i = 0; i < 600; i += 1) controller.update(1 / 60);
    expect(camera.position.x).toBeGreaterThan(2.8);
    controller.moveTo(3, -2);
    for (let i = 0; i < 300; i += 1) controller.update(1 / 60);
    expect(camera.position.z).toBeLessThan(-1.8);
    controller.dispose();
    npc.dispose();
  });

  it('geometry／material 各釋放一次，不留場景參照', () => {
    const npc = new SeatedNPC();
    let geometries = 0;
    let materials = 0;
    let meshes = 0;
    npc.root.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      meshes += 1;
      (child.geometry as BufferGeometry).addEventListener('dispose', () => {
        geometries += 1;
      });
    });
    for (const material of npc.materials)
      material.addEventListener('dispose', () => {
        materials += 1;
      });
    npc.dispose();
    npc.dispose();
    expect(geometries).toBe(meshes);
    expect(materials).toBe(npc.materials.length);
    expect(npc.root.children).toHaveLength(0);
    expect(npc.root.parent).toBeNull();
  });

  it('角色與地面 PBR 使用同一場景自有 LUT，不掛在共用 source 上', () => {
    const park = new ParkScene();
    const source = new Texture();
    let first: Texture | null = null;
    for (const material of park.npc.materials) {
      expect(material).toBeInstanceOf(MeshStandardMaterial);
      const uniforms: Record<string, { value: unknown }> = { dfgLUT: { value: null } };
      material.onBeforeCompile(
        { uniforms } as WebGLProgramParametersWithUniforms,
        {} as WebGLRenderer,
      );
      const slot = uniforms['dfgLUT'];
      if (!slot) throw new Error('測試需要 dfgLUT');
      slot.value = source;
      const owned = slot.value;
      expect(owned).toBeInstanceOf(Texture);
      expect(owned).not.toBe(source);
      if (!(owned instanceof Texture)) throw new Error('測試需要 Texture');
      if (first === null) first = owned;
      expect(owned).toBe(first);
    }
    let disposed = 0;
    source.addEventListener('dispose', () => {
      disposed += 1;
    });
    park.dispose();
    expect(disposed).toBe(0);
    source.dispose();
  });
});
