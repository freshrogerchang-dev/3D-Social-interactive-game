import { Mesh, MeshStandardMaterial, PerspectiveCamera, Texture } from 'three';
import type { BufferGeometry, WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { FirstPersonController } from '../../src/input/FirstPersonController';
import { SeatedNPC } from '../../src/npc/SeatedNPC';
import { ParkScene } from '../../src/scene/ParkScene';

const position = (z: number) => ({ x: 0, y: 1.1, z });

describe('單一固定坐姿 NPC', () => {
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
    for (const child of npc.root.children) {
      if (!(child instanceof Mesh)) continue;
      meshes += 1;
      (child.geometry as BufferGeometry).addEventListener('dispose', () => {
        geometries += 1;
      });
    }
    for (const material of npc.materials)
      material.addEventListener('dispose', () => {
        materials += 1;
      });
    npc.dispose();
    npc.dispose();
    expect(geometries).toBe(meshes);
    expect(materials).toBe(5);
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
