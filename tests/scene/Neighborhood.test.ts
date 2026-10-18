import { PerspectiveCamera, Vector3, InstancedMesh, MeshStandardMaterial, Mesh } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Neighborhood, PLACES, NEIGHBORHOOD_BOUNDS } from '../../src/scene/Neighborhood';
import { FirstPersonController, blocks } from '../../src/input/FirstPersonController';
import { GameEngine } from '../../src/core/GameEngine';
import { ParkScene } from '../../src/scene/ParkScene';
import { FakeRenderer, FakeScheduler, fakeCanvas } from '../helpers';

function travel(controller: FirstPersonController, x: number, z: number): void {
  controller.moveTo(x, z);
  for (let i = 0; i < 1200; i++) controller.update(0.05);
}
describe('同一地圖的街區與碰撞', () => {
  it('六地點各有實際位置，步道穿過原樹籬開口；只准由斑馬線穿越馬路', () => {
    const town = new Neighborhood();
    expect(PLACES).toHaveLength(6);
    expect(town.canWalk(13, -4.5)).toBe(true);
    expect(town.canWalk(13, 2)).toBe(false);
    expect(town.canWalk(22, -4.5)).toBe(false);
    town.crossingOpen = true;
    expect(town.canWalk(22, -4.5)).toBe(true);
    expect(town.canWalk(22, 0)).toBe(false);
    for (const p of PLACES) {
      expect(town.canWalk(p.x, p.z), p.id).toBe(true);
      expect(
        town.obstacles.some((o) => blocks(o, p.x, p.z)),
        p.id,
      ).toBe(false);
    }
    town.dispose();
  });
  it('實際控制器可連續走過步道、餐館、廁所、休息角與其他地點，不能穿桌／牆／未開放馬路', () => {
    const town = new Neighborhood();
    const camera = new PerspectiveCamera();
    camera.position.set(6, 1.1, -4.5);
    const controller = new FirstPersonController(
      camera,
      town.obstacles,
      (x, z) => town.canWalk(x, z),
      NEIGHBORHOOD_BOUNDS,
    );
    controller.setEnabled(true);
    travel(controller, 18, -4.5);
    expect(camera.position.x).toBeCloseTo(18, 0);
    travel(controller, 26, -4.5);
    expect(camera.position.x).toBeLessThanOrEqual(20);
    town.crossingOpen = true;
    travel(controller, 26, -4.5);
    expect(camera.position.x).toBeGreaterThan(25);
    travel(controller, 28, -5.5);
    expect(camera.position.distanceTo(new Vector3(28, 1.1, -5.5))).toBeLessThan(0.1);
    travel(controller, 30, -5.5);
    expect(camera.position.x).toBeLessThan(28.83);
    travel(controller, 26, -5.5);
    travel(controller, 26, 3.5);
    expect(camera.position.z).toBeCloseTo(3.5, 0);
    travel(controller, 29, 3.5);
    expect(camera.position.x).toBeLessThan(27.83);
    travel(controller, 26, 3.5);
    travel(controller, 26, 9);
    travel(controller, 28, 9);
    expect(camera.position.x).toBeCloseTo(28, 0);
    travel(controller, 26, 9);
    travel(controller, 26, -10);
    expect(camera.position.z).toBeCloseTo(-10, 0);
    travel(controller, 26, -4.5);
    travel(controller, 18, -4.5);
    travel(controller, 18, 6);
    expect(camera.position.z).toBeCloseTo(6, 0);
    controller.dispose();
    town.dispose();
  });
  it('路口兩側都可開始，燈號、廁所門、公告狀態由選擇改變且可重設', () => {
    const town = new Neighborhood();
    expect(town.nearest({ x: 25.5, z: -4.5 })?.id).toBe('crossing');
    town.applyNode('road-check');
    expect(
      (
        town.root.getObjectByName('pedestrian-green') as Mesh<
          import('three').BufferGeometry,
          MeshStandardMaterial
        >
      ).material.color.getHSL({ h: 0, s: 0, l: 0 }).l,
    ).toBeGreaterThan(0.5);
    town.applyNode('toilet-ready');
    expect(town.root.getObjectByName('restroom-door')?.rotation.y).toBeCloseTo(Math.PI / 2);
    town.applyNode('change-sold');
    expect(town.root.getObjectByName('sold-out-sign')?.visible).toBe(true);
    town.applyNode('change-rain');
    expect(town.root.getObjectByName('plan-rain-cloud')?.visible).toBe(true);
    town.applyNode('change-repair');
    expect(town.root.getObjectByName('plan-repair-barrier')?.visible).toBe(true);
    town.crossingOpen = true;
    town.reset();
    expect(town.crossingOpen).toBe(false);
    expect(town.root.getObjectByName('restroom-door')?.rotation.y).toBe(0);
    town.dispose();
  });
  it('所有新增instance、幾何、材質與人物均只釋放一次', () => {
    const town = new Neighborhood();
    let buffers = 0;
    const count = town.root.children.filter((o) => o instanceof InstancedMesh).length;
    for (const mesh of town.root.children)
      if (mesh instanceof InstancedMesh) mesh.addEventListener('dispose', () => buffers++);
    const m = town.materials.map((material) => vi.spyOn(material, 'dispose'));
    const resident = town.residents.map((p) => vi.spyOn(p, 'dispose'));
    town.dispose();
    town.dispose();
    expect(buffers).toBe(count);
    for (const spy of [...m, ...resident]) expect(spy).toHaveBeenCalledTimes(1);
    expect(town.root.children).toHaveLength(0);
  });
});

describe('世界互動與引擎安全狀態', () => {
  async function setup() {
    const scheduler = new FakeScheduler();
    const engine = new GameEngine({ scheduler, rendererFactory: () => new FakeRenderer() });
    engine.resize(390, 844);
    await engine.init(fakeCanvas());
    engine.start();
    const park = (engine as unknown as { park: ParkScene }).park;
    return { engine, park, scheduler };
  }
  it('不在附近不能遠端開始；過馬路與找廁所必須真的到達才可確認', async () => {
    const { engine, park, scheduler } = await setup();
    const place = PLACES[0];
    expect(engine.beginWorldPractice(place)).toBe(false);
    park.camera.position.set(18, 1.1, -4.5);
    expect(engine.beginWorldPractice(place)).toBe(true);
    engine.setInteractionActive(true);
    engine.setWorldNode('road-cross');
    engine.setWorldNode('road-walk');
    expect(park.neighborhood.crossingOpen).toBe(true);
    expect(engine.canAdvanceWorld('road-end')).toBe(false);
    park.camera.position.x = 25;
    scheduler.tick(0);
    expect(engine.canAdvanceWorld('road-end')).toBe(true);
    engine.setWorldNode('road-end');
    engine.setWorldNode('road-start');
    expect(park.neighborhood.crossingOpen).toBe(false);
    expect(park.neighborhood.companion.root.position.x).toBe(25.4);
    engine.setWorldNode('road-walk');
    expect(engine.canAdvanceWorld('road-end')).toBe(false);
    park.camera.position.x = 18;
    expect(engine.canAdvanceWorld('road-end')).toBe(true);
    engine.setWorldNode('road-end');
    engine.setWorldNode(null);
    engine.setInteractionActive(false);
    expect(park.neighborhood.crossingOpen).toBe(false);
    park.camera.position.x = 25.5;
    expect(engine.beginWorldPractice(place)).toBe(true);
    engine.setInteractionActive(true);
    engine.setWorldNode('road-walk');
    expect(engine.canAdvanceWorld('road-end')).toBe(false);
    park.camera.position.x = 18;
    expect(engine.canAdvanceWorld('road-end')).toBe(true);
    engine.setWorldNode(null);
    engine.setInteractionActive(false);
    park.camera.position.set(28, 1.1, -5.5);
    expect(engine.beginWorldPractice(PLACES[1])).toBe(true);
    engine.setInteractionActive(true);
    engine.setWorldNode('toilet-find');
    expect(engine.canAdvanceWorld('toilet-ready')).toBe(false);
    park.camera.position.set(26.8, 1.1, 3.5);
    expect(engine.canAdvanceWorld('toilet-ready')).toBe(true);
    engine.dispose();
  });
  it('明確選用餐後才坐下，離座／安全區恢復原高度；行走中幫助／地圖／暫停皆停止輸入', async () => {
    const enabled = vi.spyOn(FirstPersonController.prototype, 'setEnabled');
    const { engine, park } = await setup();
    park.camera.position.set(28, 1.1, -5.5);
    const before = park.camera.position.clone();
    expect(engine.beginWorldPractice(PLACES[1])).toBe(true);
    engine.setInteractionActive(true);
    engine.setWorldNode('dining-eat');
    expect(park.camera.position.y).toBe(1.05);
    engine.setWorldNode('dining-move');
    expect(park.camera.position.equals(before)).toBe(true);
    engine.setWorldNode('toilet-find');
    expect(enabled).toHaveBeenLastCalledWith(true);
    engine.setWorldHelping(true);
    expect(enabled).toHaveBeenLastCalledWith(false);
    engine.pause();
    engine.resume();
    expect(enabled).toHaveBeenLastCalledWith(false);
    engine.setWorldHelping(false);
    engine.setMapOpen(true);
    expect(enabled).toHaveBeenLastCalledWith(false);
    engine.setMapOpen(false);
    expect(enabled).toHaveBeenLastCalledWith(true);
    engine.returnToSafety();
    expect(park.camera.position.y).toBe(1.1);
    expect(park.neighborhood.crossingOpen).toBe(false);
    engine.dispose();
    enabled.mockRestore();
  });
});
