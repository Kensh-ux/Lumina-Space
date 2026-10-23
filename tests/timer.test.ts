import { describe, expect, it } from 'vitest';
import {
  createTimer,
  formatDuration,
  pause,
  reset,
  resume,
  setDuration,
  start,
  tick,
} from '../src/features/focus/timer';

const NOW = 1_700_000_000_000;

describe('focus timer', () => {
  it('createTimer 默认 25 分钟且为 idle', () => {
    expect(createTimer()).toEqual({
      durationSec: 1500,
      remainingSec: 1500,
      status: 'idle',
      endAt: null,
    });
  });

  it('setDuration clamp 到 1–180 分钟', () => {
    const idle = createTimer();
    expect(setDuration(idle, 0).durationSec).toBe(60);
    expect(setDuration(idle, 181).durationSec).toBe(180 * 60);
    expect(setDuration(idle, 180).durationSec).toBe(180 * 60);
    expect(setDuration(idle, 1).remainingSec).toBe(60);
  });

  it('setDuration 只在 idle 生效', () => {
    const running = start(createTimer(), NOW);
    expect(setDuration(running, 45)).toBe(running);
  });

  it('start 设置 running 与 endAt', () => {
    const running = start(createTimer(5), NOW);
    expect(running.status).toBe('running');
    expect(running.endAt).toBe(NOW + 300 * 1000);
  });

  it('pause 用 endAt-now 向上取整并清空 endAt', () => {
    const running = start(createTimer(1), NOW);
    const paused = pause(running, NOW + 15_400);

    expect(paused.status).toBe('paused');
    expect(paused.remainingSec).toBe(45);
    expect(paused.endAt).toBeNull();
  });

  it('pause 恰好到 0 时直接 done', () => {
    const running = start(createTimer(1), NOW);
    const done = pause(running, NOW + 60_000);

    expect(done.status).toBe('done');
    expect(done.remainingSec).toBe(0);
    expect(done.endAt).toBeNull();
  });

  it('resume 用剩余时间重算 endAt', () => {
    const running = start(createTimer(1), NOW);
    const paused = pause(running, NOW + 20_000);
    const resumed = resume(paused, NOW + 30_000);

    expect(resumed.status).toBe('running');
    expect(resumed.endAt).toBe(NOW + 30_000 + 40_000);
  });

  it('tick 用 endAt 重算剩余，非 running 时原样返回', () => {
    const running = start(createTimer(1), NOW);
    const firstTick = tick(running, NOW + 10_000);
    expect(firstTick.remainingSec).toBe(50);
    expect(tick(firstTick, NOW + 10_200)).toBe(firstTick);

    const paused = pause(running, NOW + 10_000);
    expect(tick(paused, NOW + 60_000)).toBe(paused);
  });

  it('tick 到 0 转为 done', () => {
    const running = start(createTimer(1), NOW);
    const done = tick(running, NOW + 60_000);

    expect(done.status).toBe('done');
    expect(done.remainingSec).toBe(0);
    expect(done.endAt).toBeNull();
  });

  it('reset 回到 idle 并恢复原始时长', () => {
    const running = start(createTimer(3), NOW);
    expect(reset(running)).toEqual({
      durationSec: 180,
      remainingSec: 180,
      status: 'idle',
      endAt: null,
    });
  });

  it('formatDuration 补零输出 mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(1500)).toBe('25:00');
  });
});
