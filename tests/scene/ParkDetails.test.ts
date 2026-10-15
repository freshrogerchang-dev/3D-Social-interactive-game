import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';
import { PARK_LIMIT } from '../../src/input/FirstPersonController';
import { ParkScene } from '../../src/scene/ParkScene';

/** 可以留在可走範圍內的貼地細節（不擋路、不需要碰撞）。 */
const GROUND_LEVEL = new Set(['park-grass-tufts', 'park-grass-patches', 'park-sky']);

function details(park: ParkScene): InstancedMesh[] {
  const meshes: InstancedMesh[] = [];
  park.environment.details.root.traverse((object) => {
    if (object instanceof InstancedMesh) meshes.push(object as InstancedMesh);
  });
  return meshes;
}

describe('公園細節', () => {
  it('會擋路的設施都在可走範圍外，不影響走向人物的路線', () => {
    const park = new ParkScene();
    const matrix = new Matrix4();
    const position = new Vector3();
    for (const mesh of details(park)) {
      if (GROUND_LEVEL.has(mesh.name)) continue;
      for (let i = 0; i < mesh.count; i += 1) {
        mesh.getMatrixAt(i, matrix);
        position.setFromMatrixPosition(matrix);
        const inside = Math.abs(position.x) < PARK_LIMIT && Math.abs(position.z) < PARK_LIMIT;
        expect(inside, `${mesh.name} #${String(i)}`).toBe(false);
      }
    }
    park.dispose();
  });

  it('材質與 instance 顏色維持低飽和（HSL S ≤ 0.6）', () => {
    const park = new ParkScene();
    const hsl = { h: 0, s: 0, l: 0 };
    const color = new Color();
    for (const material of park.environment.details.materials) {
      if (material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial)
        expect(material.color.getHSL(hsl).s).toBeLessThanOrEqual(0.6);
    }
    for (const mesh of details(park)) {
      if (!mesh.instanceColor) continue;
      for (let i = 0; i < mesh.count; i += 1) {
        mesh.getColorAt(i, color);
        expect(color.getHSL(hsl).s, mesh.name).toBeLessThanOrEqual(0.6);
      }
    }
    park.dispose();
  });

  it('低細節減少草叢；釋放時 instance 只釋放一次', () => {
    const park = new ParkScene();
    const tufts = park.environment.details.root.getObjectByName('park-grass-tufts');
    if (!(tufts instanceof InstancedMesh)) throw new Error('需要草叢 instance');
    expect(tufts.count).toBe(1600);
    park.environment.setDetailLevel('low');
    expect(tufts.count).toBe(600);
    park.environment.setDetailLevel('standard');
    expect(tufts.count).toBe(1600);
    let disposed = 0;
    const meshes = details(park);
    for (const mesh of meshes)
      mesh.addEventListener('dispose', () => {
        disposed += 1;
      });
    park.dispose();
    park.dispose();
    expect(disposed).toBe(meshes.length);
    expect(park.environment.details.root.children).toHaveLength(0);
  });
});
