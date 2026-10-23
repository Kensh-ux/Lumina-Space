import { describe, expect, it } from 'vitest';
import { DIAL_ANGLES, DIAL_RADIUS, getDialPosition } from '../src/features/mood/dialGeometry';

describe('dial geometry', () => {
  it('三个选项按 0°/45°/90° 排布', () => {
    expect(DIAL_ANGLES).toEqual([0, 45, 90]);
  });

  it('0° 在右侧、90° 在下方', () => {
    const first = getDialPosition(0);
    expect(first.left).toBeCloseTo(DIAL_RADIUS);
    expect(first.top).toBeCloseTo(0);

    const last = getDialPosition(2);
    expect(last.left).toBeCloseTo(0);
    expect(last.top).toBeCloseTo(DIAL_RADIUS);
  });

  it('45° 落在右下对角线', () => {
    const middle = getDialPosition(1);
    expect(middle.left).toBeCloseTo(DIAL_RADIUS * Math.SQRT1_2);
    expect(middle.top).toBeCloseTo(DIAL_RADIUS * Math.SQRT1_2);
    expect(middle.left).toBeCloseTo(middle.top);
  });
});
