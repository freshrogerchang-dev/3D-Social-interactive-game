import { describe, expect, it } from 'vitest';
import { MAX_FRAME_DELTA, RenderLoop } from '../../src/core/RenderLoop';
import type { FrameInfo } from '../../src/core/RenderLoop';
import { FakeScheduler } from '../helpers';

function setup() {
  const scheduler = new FakeScheduler();
  const loop = new RenderLoop(scheduler);
  const frames: FrameInfo[] = [];
  const record = (frame: FrameInfo) => {
    frames.push(frame);
  };
  return { scheduler, loop, frames, record };
}

describe('RenderLoop', () => {
  it('重複 start 只保留一個 RAF', () => {
    const { scheduler, loop, record } = setup();
    loop.start(record);
    loop.start(record);
    loop.start(record);
    expect(scheduler.pendingCount).toBe(1);
    scheduler.tick(0);
    expect(scheduler.pendingCount).toBe(1);
  });

  it('第一幀 delta 為 0，之後以秒計並限制上限', () => {
    const { scheduler, loop, frames, record } = setup();
    loop.start(record);
    scheduler.tick(1000);
    scheduler.tick(1016);
    scheduler.tick(5000);
    expect(frames.map((frame) => frame.delta)).toEqual([0, 0.016, MAX_FRAME_DELTA]);
  });

  it('stop 後不再執行回呼，也不留下排程', () => {
    const { scheduler, loop, frames, record } = setup();
    loop.start(record);
    scheduler.tick(0);
    loop.stop();
    expect(scheduler.pendingCount).toBe(0);
    scheduler.tick(16);
    expect(frames).toHaveLength(1);
    expect(loop.running).toBe(false);
  });

  it('重新 start 後第一幀 delta 為 0，elapsed 不含停止期間', () => {
    const { scheduler, loop, frames, record } = setup();
    loop.start(record);
    scheduler.tick(0);
    scheduler.tick(20);
    loop.stop();
    loop.start(record);
    scheduler.tick(60_000);
    scheduler.tick(60_010);
    expect(frames.map((frame) => frame.delta)).toEqual([0, 0.02, 0, 0.01]);
    expect(loop.elapsed).toBeCloseTo(0.03);
  });

  it('時間倒退時 delta 不為負', () => {
    const { scheduler, loop, frames, record } = setup();
    loop.start(record);
    scheduler.tick(100);
    scheduler.tick(50);
    expect(frames[1]?.delta).toBe(0);
  });

  it('在回呼中 stop 不會再排下一幀', () => {
    const { scheduler, loop } = setup();
    loop.start(() => {
      loop.stop();
    });
    scheduler.tick(0);
    expect(scheduler.pendingCount).toBe(0);
  });
});
