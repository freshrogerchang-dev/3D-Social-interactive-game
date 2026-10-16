import { Box3, Mesh } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../../src/core/GameEngine';
import { PARK_SCENARIOS } from '../../src/dialogue/ParkScenarios';
import { PARK_LIMIT } from '../../src/input/FirstPersonController';
import { ParkCharacter } from '../../src/npc/SeatedNPC';
import { ParkScene } from '../../src/scene/ParkScene';
import { FakeRenderer, FakeScheduler, fakeCanvas } from '../helpers';

describe('公園人物配置', () => {
  it('四位人物各對應一個情境，彼此距離大於靠近範圍，靠近範圍都走得到', () => {
    const park = new ParkScene();
    const ids = park.characters.map((character) => character.id);
    expect(ids.sort()).toEqual(Object.keys(PARK_SCENARIOS).sort());
    for (const a of park.characters) {
      // 人物可以略在步行邊界外（例如入口的媽媽），但靠近範圍必須走得到。
      const walkX = Math.max(-PARK_LIMIT, Math.min(PARK_LIMIT, a.obstacle.x));
      const walkZ = Math.max(-PARK_LIMIT, Math.min(PARK_LIMIT, a.obstacle.z));
      const reach = Math.hypot(a.obstacle.x - walkX, a.obstacle.z - walkZ) + a.obstacle.radius;
      expect(reach, a.id).toBeLessThan(2.8);
      for (const b of park.characters)
        if (a !== b)
          expect(
            Math.hypot(a.obstacle.x - b.obstacle.x, a.obstacle.z - b.obstacle.z),
          ).toBeGreaterThan(6.4);
    }
    // 出發點不在任何人的靠近範圍內，不會一開場就出現對話按鈕。
    for (const character of park.characters)
      expect(character.isNear(park.camera.position, false), character.id).toBe(false);
    park.dispose();
  });

  it('站姿人物腳踩地面；坐姿人物坐在長椅上；預設仍是長椅上的小安', () => {
    const seated = new ParkCharacter();
    const standing = new ParkCharacter({ id: 'test', pose: 'standing', prop: 'ball' });
    const box = (character: ParkCharacter, name: string): Box3 => {
      character.root.updateMatrixWorld(true);
      const box = new Box3();
      character.root.traverse((object) => {
        if (object.name === name) box.union(new Box3().setFromObject(object));
      });
      return box;
    };
    expect(box(standing, 'shoe').min.y).toBeGreaterThanOrEqual(-0.01);
    expect(box(standing, 'shoe').min.y).toBeLessThan(0.03);
    // 坐姿：臀部在座面（0.45 m）上方，鞋子懸空。
    expect(box(seated, 'hips').min.y).toBeGreaterThan(0.4);
    expect(box(seated, 'shoe').min.y).toBeGreaterThan(0.1);
    expect(seated.root.getObjectByName('bench-seat')).toBeInstanceOf(Mesh);
    expect(standing.root.getObjectByName('bench-seat')).toBeUndefined();
    expect(standing.root.getObjectByName('ball')).toBeInstanceOf(Mesh);
    expect(seated.root.name).toBe('park-friend');
    expect(standing.root.name).toBe('park-friend-test');
    seated.dispose();
    standing.dispose();
  });

  it('大人比例：媽媽比小孩高，頭佔身高的比例較小', () => {
    const kid = new ParkCharacter({ pose: 'standing' });
    const adult = new ParkCharacter({ pose: 'standing', look: { adult: true } });
    const measure = (character: ParkCharacter) => {
      character.root.updateMatrixWorld(true);
      const all = new Box3().setFromObject(character.root);
      const head = new Box3().setFromObject(
        character.root.getObjectByName('head') ?? character.root,
      );
      return { height: all.max.y, head: head.max.y - head.min.y };
    };
    const k = measure(kid);
    const a = measure(adult);
    expect(a.height).toBeGreaterThan(k.height + 0.3);
    expect(a.head / a.height).toBeLessThan(k.head / k.height);
    kid.dispose();
    adult.dispose();
  });

  it('背景小朋友不能對話、不搶靠近提示；有個人空間，且不在出發點附近', () => {
    const park = new ParkScene();
    const ids = park.extras.map((kid) => kid.id);
    expect(ids).toEqual(['slide-top', 'slide-ladder', 'bubbles']);
    for (const kid of park.extras) {
      expect(Object.keys(PARK_SCENARIOS)).not.toContain(kid.id);
      expect(park.obstacles).toContain(kid.obstacle);
      expect(kid.distanceTo(park.camera.position)).toBeGreaterThan(5);
    }
    // 溜滑梯的兩位排在小晴前面（更靠近梯子），玩家仍是排在小晴後面。
    const xiaoqing = park.characters.find((c) => c.id === 'xiaoqing');
    for (const id of ['slide-top', 'slide-ladder'])
      expect(park.extras.find((k) => k.id === id)?.obstacle.z).toBeLessThan(
        xiaoqing?.obstacle.z ?? 0,
      );
    park.dispose();
  });

  it('dispose 釋放所有人物與設施，可重複呼叫', () => {
    const park = new ParkScene();
    const disposeCharacter = vi.spyOn(ParkCharacter.prototype, 'dispose');
    let geometries = 0;
    park.scene.traverse((object) => {
      if (object instanceof Mesh && object.name.startsWith('slide-'))
        (object as Mesh).geometry.addEventListener('dispose', () => (geometries += 1));
    });
    park.dispose();
    park.dispose();
    expect(disposeCharacter).toHaveBeenCalledTimes(park.everyone.length);
    expect(geometries).toBeGreaterThan(0);
    disposeCharacter.mockRestore();
  });
});

describe('引擎與多位人物', () => {
  async function running() {
    const scheduler = new FakeScheduler();
    const presence: (string | null)[] = [];
    const engine = new GameEngine({
      scheduler,
      rendererFactory: () => new FakeRenderer(),
      onNPCPresence: (id) => presence.push(id),
    });
    engine.resize(800, 600);
    await engine.init(fakeCanvas());
    engine.start();
    return { engine, scheduler, presence };
  }

  it('只回報最近且在範圍內的人物，離開後回報 null', async () => {
    const { engine, scheduler, presence } = await running();
    const park = (engine as unknown as { park: ParkScene }).park;
    scheduler.tick(0);
    expect(presence).toEqual([null]);
    for (const [id, x, z] of [
      ['xiaoyu', -4.5, -3],
      ['xiaoqing', 4.5, -3],
      ['mom', -1.2, -6.2],
      ['xiaoan', 0, 0],
    ] as const) {
      park.camera.position.set(x, 1.1, z);
      scheduler.tick(presence.length * 16);
      expect(presence.at(-1)).toBe(id);
    }
    park.camera.position.set(-3, 1.1, -6);
    scheduler.tick(1000);
    expect(presence.at(-1)).toBeNull();
    engine.dispose();
  });

  it('表情只給正在對話的人物；null 與返回安全區讓所有人回到平常的表情', async () => {
    const { engine } = await running();
    const park = (engine as unknown as { park: ParkScene }).park;
    const mom = park.characters.find((c) => c.id === 'mom');
    engine.setNPCExpression('thinking', 'mom', false);
    expect(mom?.expression).toBe('thinking');
    expect(park.characters.filter((c) => c.expression !== 'neutral')).toEqual([mom]);
    engine.setNPCExpression(null);
    expect(park.characters.every((c) => c.expression === 'neutral')).toBe(true);
    engine.setNPCExpression('happy');
    expect(park.npc.expression).toBe('happy');
    engine.returnToSafety();
    expect(park.npc.expression).toBe('neutral');
    engine.dispose();
  });

  it('動作只給正在對話的人物；null 會停止所有人物的動作', async () => {
    const play = vi.spyOn(ParkCharacter.prototype, 'playGesture');
    const { engine } = await running();
    const park = (engine as unknown as { park: ParkScene }).park;
    play.mockClear();
    engine.setNPCGesture('nod', true, 'mom');
    expect(play.mock.contexts).toEqual([park.characters.find((c) => c.id === 'mom')]);
    play.mockClear();
    engine.setNPCGesture(null);
    expect(play).toHaveBeenCalledTimes(park.everyone.length);
    play.mockRestore();
    engine.dispose();
  });
});
