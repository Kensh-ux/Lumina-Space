import { describe, expect, it } from 'vitest';
import { formatHeroDate, formatTodaySummary, getGreeting } from '../src/lib/greeting';

describe('主界面问候', () => {
  it('按本地时间返回早上好 / 下午好 / 晚上好', () => {
    expect(getGreeting(new Date(2026, 9, 24, 8, 0))).toBe('早上好');
    expect(getGreeting(new Date(2026, 9, 24, 12, 0))).toBe('下午好');
    expect(getGreeting(new Date(2026, 9, 24, 18, 0))).toBe('晚上好');
    expect(getGreeting(new Date(2026, 9, 24, 23, 30))).toBe('晚上好');
  });

  it('日期包含年月日与星期', () => {
    expect(formatHeroDate(new Date(2026, 9, 24))).toBe('2026年10月24日 周六');
    expect(formatHeroDate(new Date(2026, 9, 25))).toBe('2026年10月25日 周日');
  });

  it('今日概况使用中性计数文案', () => {
    expect(formatTodaySummary(3, 1, 25)).toBe('3 件待办 · 已完成 1 · 专注 25 分钟');
    expect(formatTodaySummary(0, 0, 0)).toBe('0 件待办 · 已完成 0 · 专注 0 分钟');
  });
});
