import { describe, expect, it } from 'vitest';
import {
  formatMonthTitle,
  getPlannerDays,
  getPlannerStartDate,
  PLANNER_DAYS,
  tasksForDate,
} from '../src/lib/planner';
import type { Task } from '../src/lib/types';

const NOW = new Date(2026, 9, 25, 12);

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task',
    title: '示例',
    done: false,
    createdAt: '2026-10-24T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

describe('getPlannerStartDate', () => {
  it('返回本地今天', () => {
    expect(getPlannerStartDate(NOW)).toBe('2026-10-25');
  });
});

describe('getPlannerDays', () => {
  it('从起始日起连续 365 天', () => {
    const days = getPlannerDays('2026-10-25', PLANNER_DAYS, NOW);

    expect(days).toHaveLength(365);
    expect(days[0]).toMatchObject({
      date: '2026-10-25',
      label: '今天',
      dateLabel: '10/25',
      isToday: true,
    });
    expect(days[1]).toMatchObject({ date: '2026-10-26', label: '明天' });
    expect(days[364].date).toBe('2027-10-24');
    expect(days[364].isToday).toBe(false);
  });

  it('起始日为昨天时，标签按真实今天计算', () => {
    const days = getPlannerDays('2026-10-24', 5, NOW);

    expect(days.map((day) => day.label)).toEqual(['昨天', '今天', '明天', '周二', '周三']);
    expect(days.map((day) => day.isToday)).toEqual([false, true, false, false, false]);
  });

  it('起始日为未来日期时，第一列不强行叫今天', () => {
    const days = getPlannerDays('2026-10-28', 3, NOW);

    expect(days.map((day) => day.label)).toEqual(['周三', '周四', '周五']);
    expect(days.every((day) => !day.isToday)).toBe(true);
  });

  it('跨月跨年仍连续', () => {
    const days = getPlannerDays('2026-12-30', 7, NOW);

    expect(days.map((day) => day.date)).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
      '2027-01-04',
      '2027-01-05',
    ]);
    expect(days[2].label).toBe('周五');
    expect(days[4].label).toBe('周日');
  });

  it('起始日为周日照常生成', () => {
    const days = getPlannerDays('2026-10-25', 7, NOW);

    expect(days[0].dateLabel).toBe('10/25');
    expect(days[6].label).toBe('周六');
  });

  it('起始日也可以是 Date', () => {
    const days = getPlannerDays(NOW, 2, NOW);

    expect(days.map((day) => day.date)).toEqual(['2026-10-25', '2026-10-26']);
  });
});

describe('formatMonthTitle', () => {
  it('中文逗号、月份不补零', () => {
    expect(formatMonthTitle('2026-10-25')).toBe('2026年，10月');
    expect(formatMonthTitle('2027-01-01')).toBe('2027年，1月');
    expect(formatMonthTitle('2026-12-31')).toBe('2026年，12月');
  });

  it('非法日期返回空串', () => {
    expect(formatMonthTitle('')).toBe('');
    expect(formatMonthTitle('2026/10/25')).toBe('');
  });
});

describe('tasksForDate', () => {
  it('只取当天任务，未完成在前、有时间按时间排序', () => {
    const tasks = [
      makeTask({ id: 'done', dueDate: '2026-10-25', done: true }),
      makeTask({ id: 'late', dueDate: '2026-10-25', dueTime: '18:00' }),
      makeTask({ id: 'early', dueDate: '2026-10-25', dueTime: '09:00' }),
      makeTask({ id: 'other', dueDate: '2026-10-26' }),
      makeTask({ id: 'none' }),
    ];

    expect(tasksForDate(tasks, '2026-10-25').map((task) => task.id)).toEqual([
      'early',
      'late',
      'done',
    ]);
  });

  it('无时间时按创建时间降序', () => {
    const tasks = [
      makeTask({ id: 'older', dueDate: '2026-10-25', createdAt: '2026-10-20T00:00:00.000Z' }),
      makeTask({ id: 'newer', dueDate: '2026-10-25', createdAt: '2026-10-22T00:00:00.000Z' }),
    ];

    expect(tasksForDate(tasks, '2026-10-25').map((task) => task.id)).toEqual([
      'newer',
      'older',
    ]);
  });
});