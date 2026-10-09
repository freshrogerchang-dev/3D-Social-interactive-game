import { Mesh, MeshStandardMaterial, Texture } from 'three';
import type { WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three';
import { describe, expect, it } from 'vitest';
import { ParkScene } from '../../src/scene/ParkScene';

describe('ParkScene', () => {
  it('PBR 共用 LUT 轉成各場景自有貼圖，釋放不影響另一場景或原貼圖', () => {
    const source = new Texture();
    const first = new ParkScene();
    const second = new ParkScene();
    const compile = (park: ParkScene) => {
      const ground = park.scene.getObjectByName('ground');
      if (!(ground instanceof Mesh) || !(ground.material instanceof MeshStandardMaterial))
        throw new Error('測試需要 PBR 地面');
      // 只提供此公開 hook 使用的 uniforms 邊界；renderer 在此不參與編譯。
      const uniforms: Record<string, { value: unknown }> = { dfgLUT: { value: null } };
      ground.material.onBeforeCompile(
        { uniforms } as WebGLProgramParametersWithUniforms,
        {} as WebGLRenderer,
      );
      const slot = uniforms['dfgLUT'];
      if (!slot) throw new Error('測試需要 DFG uniform');
      slot.value = source;
      const owned = slot.value;
      if (!(owned instanceof Texture)) throw new Error('uniform 應提供自有 Texture');
      slot.value = source;
      expect(slot.value).toBe(owned);
      return owned;
    };
    const firstTexture = compile(first);
    const secondTexture = compile(second);
    expect(firstTexture).not.toBe(source);
    expect(secondTexture).not.toBe(firstTexture);
    expect(firstTexture.source).toBe(source.source);
    let sourceDisposals = 0;
    let firstDisposals = 0;
    let secondDisposals = 0;
    source.addEventListener('dispose', () => {
      sourceDisposals += 1;
    });
    firstTexture.addEventListener('dispose', () => {
      firstDisposals += 1;
    });
    secondTexture.addEventListener('dispose', () => {
      secondDisposals += 1;
    });
    first.dispose();
    first.dispose();
    expect(firstDisposals).toBe(1);
    expect(secondDisposals).toBe(0);
    expect(sourceDisposals).toBe(0);
    second.dispose();
    expect(secondDisposals).toBe(1);
    expect(sourceDisposals).toBe(0);
    source.dispose();
  });

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
