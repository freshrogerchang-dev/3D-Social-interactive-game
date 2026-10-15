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

  it('站姿人物腿伸直、頭比坐姿高；預設仍是長椅上的小安', () => {
    const seated = new ParkCharacter();
    const standing = new ParkCharacter({ id: 'test', pose: 'standing', prop: 'ball' });
    const headY = (character: ParkCharacter): number => {
      character.root.updateMatrixWorld(true);
      return new Box3().setFromObject(character.root.getObjectByName('head') ?? character.root).max
        .y;
    };
    expect(headY(standing)).toBeGreaterThan(headY(seated) + 0.15);
    expect(seated.root.getObjectByName('bench-seat')).toBeInstanceOf(Mesh);
    expect(standing.root.getObjectByName('bench-seat')).toBeUndefined();
    expect(standing.root.getObjectByName('ball')).toBeInstanceOf(Mesh);
    expect(seated.root.name).toBe('park-friend');
    expect(standing.root.name).toBe('park-friend-test');
    seated.dispose();
    standing.dispose();
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
    expect(disposeCharacter).toHaveBeenCalledTimes(park.characters.length);
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

  it('動作只給正在對話的人物；null 會停止所有人物的動作', async () => {
    const play = vi.spyOn(ParkCharacter.prototype, 'playGesture');
    const { engine } = await running();
    const park = (engine as unknown as { park: ParkScene }).park;
    play.mockClear();
    engine.setNPCGesture('nod', true, 'mom');
    expect(play.mock.contexts).toEqual([park.characters.find((c) => c.id === 'mom')]);
    play.mockClear();
    engine.setNPCGesture(null);
    expect(play).toHaveBeenCalledTimes(park.characters.length);
    play.mockRestore();
    engine.dispose();
  });
});
