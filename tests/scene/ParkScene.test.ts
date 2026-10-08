import { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { ParkScene } from '../../src/scene/ParkScene';

describe('ParkScene', () => {
  it('包含地面與安全標記', () => {
    const park = new ParkScene();
    expect(park.scene.getObjectByName('ground')).toBeInstanceOf(Mesh);
    expect(park.scene.getObjectByName('safety-marker')).toBeInstanceOf(Mesh);
    park.dispose();
  });

  it('resetToSafety 把相機放回固定的安全姿態', () => {
    const park = new ParkScene();
    const position = park.camera.position.clone();
    const quaternion = park.camera.quaternion.clone();
    park.camera.position.set(10, 5, -8);
    park.camera.rotation.set(0.4, 1.2, 0);
    park.resetToSafety();
    expect(park.camera.position.equals(position)).toBe(true);
    expect(park.camera.quaternion.angleTo(quaternion)).toBeLessThan(1e-6);
    park.dispose();
  });

  it('dispose 釋放每個 geometry 與 material 各一次，可重複呼叫', () => {
    const park = new ParkScene();
    const meshes: Mesh[] = [];
    park.scene.traverse((object) => {
      if (object instanceof Mesh) meshes.push(object as Mesh);
    });
    expect(meshes.length).toBeGreaterThan(0);

    let disposeEvents = 0;
    for (const mesh of meshes) {
      mesh.geometry.addEventListener('dispose', () => (disposeEvents += 1));
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        material.addEventListener('dispose', () => (disposeEvents += 1));
      }
    }
    park.dispose();
    park.dispose();
    expect(disposeEvents).toBe(meshes.length * 2);
    expect(park.scene.children).toHaveLength(0);
  });

  it('零尺寸 resize 不改變相機比例', () => {
    const park = new ParkScene();
    park.resize(800, 400);
    park.resize(0, 0);
    expect(park.camera.aspect).toBe(2);
    park.dispose();
  });
});
