import { describe, expect, it } from 'vitest';
import {
  clampSidebarWidth,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from '../src/app/useSidebar';

describe('clampSidebarWidth', () => {
  it('低于最小值时收敛到 240', () => {
    expect(clampSidebarWidth(120)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(-20)).toBe(SIDEBAR_MIN_WIDTH);
  });

  it('高于最大值时收敛到 420', () => {
    expect(clampSidebarWidth(600)).toBe(SIDEBAR_MAX_WIDTH);
    expect(clampSidebarWidth(421)).toBe(SIDEBAR_MAX_WIDTH);
  });

  it('非数字回退默认 300', () => {
    expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(clampSidebarWidth(Number.POSITIVE_INFINITY)).toBe(SIDEBAR_DEFAULT_WIDTH);
  });

  it('区间内取整保留', () => {
    expect(clampSidebarWidth(240)).toBe(240);
    expect(clampSidebarWidth(300.4)).toBe(300);
    expect(clampSidebarWidth(420)).toBe(420);
  });
});
