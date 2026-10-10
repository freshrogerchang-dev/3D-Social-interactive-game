import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { fakeCanvas } from '../helpers';
import { FirstPersonController, PARK_LIMIT } from '../../src/input/FirstPersonController';

function setup() {
  const camera = new PerspectiveCamera(60, 1, 0.1, 500);
  camera.position.set(0, 1.1, 3.5);
  const controller = new FirstPersonController(camera);
  controller.setEnabled(true);
  return { camera, controller };
}
function walk(controller: FirstPersonController, seconds: number, hz = 60) {
  for (let i = 0; i < seconds * hz; i += 1) controller.update(1 / hz);
}

describe('第一人稱移動的物理與生命週期', () => {
  it('點地面目標慢速接近，固定高度，不自動轉向，不越過目標', () => {
    const { camera, controller } = setup();
    const orientation = camera.quaternion.clone();
    controller.moveTo(1, 0);
    controller.update(0);
    expect(camera.position.toArray()).toEqual([0, 1.1, 3.5]);
    controller.update(0.05);
    expect(camera.position.distanceTo({ x: 0, y: 1.1, z: 3.5 })).toBeLessThan(0.05);
    walk(controller, 8);
    expect(Math.hypot(camera.position.x - 1, camera.position.z)).toBeLessThan(0.09);
    expect(camera.position.y).toBe(1.1);
    expect(camera.quaternion.angleTo(orientation)).toBeLessThan(1e-6);
  });

  it('30／60／120Hz 的移動距離接近，不依賴固定幀速率', () => {
    const positions = [30, 60, 120].map((hz) => {
      const { camera, controller } = setup();
      controller.moveTo(0, -8);
      walk(controller, 2, hz);
      return camera.position.z;
    });
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(0.04);
  });

  it('超出範圍的目標限制於封閉邊界，沒有 NaN 或穿越', () => {
    const { camera, controller } = setup();
    controller.moveTo(100, -100);
    walk(controller, 30);
    expect(Math.abs(camera.position.x)).toBeLessThanOrEqual(PARK_LIMIT);
    expect(Math.abs(camera.position.z)).toBeLessThanOrEqual(PARK_LIMIT);
    expect(camera.position.x).toBeGreaterThan(7.8);
    controller.moveTo(NaN, Infinity);
    walk(controller, 1);
    expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
  });

  it('暫停、失焦清輸入與恢復不沿用前往目標或速度', () => {
    const { camera, controller } = setup();
    controller.moveTo(0, -8);
    walk(controller, 1);
    controller.setEnabled(false);
    const paused = camera.position.clone();
    walk(controller, 4);
    controller.setEnabled(true);
    walk(controller, 1);
    expect(camera.position.equals(paused)).toBe(true);
    controller.moveTo(4, 0);
    walk(controller, 1);
    controller.clearInput();
    const cleared = camera.position.clone();
    walk(controller, 1);
    expect(camera.position.equals(cleared)).toBe(true);
  });

  it('重設安全姿態後不帶入舊目標，dispose 可重複且不再接受輸入', () => {
    const { camera, controller } = setup();
    controller.moveTo(7, -7);
    walk(controller, 1);
    camera.position.set(0, 1.1, 3.5);
    controller.syncCamera();
    walk(controller, 1);
    expect(camera.position.toArray()).toEqual([0, 1.1, 3.5]);
    controller.dispose();
    controller.dispose();
    controller.setEnabled(true);
    controller.moveTo(7, -7);
    walk(controller, 1);
    expect(camera.position.toArray()).toEqual([0, 1.1, 3.5]);
  });
});

describe('鍵盤操作邊界', () => {
  function keyboardSetup() {
    const { camera, controller } = setup();
    const canvas = fakeCanvas();
    Object.defineProperty(canvas.ownerDocument, 'activeElement', { value: canvas, writable: true });
    controller.attach(canvas);
    const key = (value: string, ctrlKey = false) => {
      const event = Object.assign(new Event('keydown', { cancelable: true }), {
        key: value,
        ctrlKey,
      });
      canvas.ownerDocument.dispatchEvent(event);
      return event;
    };
    return { camera, controller, canvas, key };
  }
  it('斜向與直向速度一致', () => {
    const straight = keyboardSetup();
    straight.key('w');
    walk(straight.controller, 1);
    const diagonal = keyboardSetup();
    diagonal.key('w');
    diagonal.key('d');
    walk(diagonal.controller, 1);
    const distance = (camera: PerspectiveCamera) =>
      Math.hypot(camera.position.x, camera.position.z - 3.5);
    expect(distance(straight.camera)).toBeCloseTo(distance(diagonal.camera), 6);
    straight.controller.dispose();
    diagonal.controller.dispose();
  });
  it('UI 聚焦不攔方向鍵，取消事件停止剩餘輸入，dispose 解除鍵盤綁定', () => {
    const { camera, controller, canvas, key } = keyboardSetup();
    expect(key('w', true).defaultPrevented).toBe(false);
    expect(key('ArrowUp').defaultPrevented).toBe(true);
    walk(controller, 1);
    canvas.dispatchEvent(new Event('pointercancel'));
    const stopped = camera.position.clone();
    walk(controller, 1);
    expect(camera.position.equals(stopped)).toBe(true);
    Object.defineProperty(canvas.ownerDocument, 'activeElement', { value: null });
    expect(key('ArrowDown').defaultPrevented).toBe(false);
    controller.dispose();
    expect(key('w').defaultPrevented).toBe(false);
  });
});
