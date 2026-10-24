import { describe, expect, it } from 'vitest';
import { getNextDays, tasksForDate } from '../src/lib/planner';
import type { Task } from '../src/lib/types';

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

describe('getNextDays', () => {
  it('从今天起连续 7 天，包含今天/明天/周X 与 MM/DD', () => {
    const days = getNextDays(new Date(2026, 9, 25, 12));

    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ date: '2026-10-25', label: '今天', dateLabel: '10/25' });
    expect(days[1]).toMatchObject({ date: '2026-10-26', label: '明天', dateLabel: '10/26' });
    expect(days[2].label).toBe('周二');
    expect(days[6].date).toBe('2026-10-31');
    expect(days[6].label).toBe('周六');
  });

  it('跨月跨年仍连续', () => {
    const days = getNextDays(new Date(2026, 11, 30, 9));

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

  it('周日作为起始日也正常', () => {
    const days = getNextDays(new Date(2026, 9, 25, 8));

    expect(days[0].label).toBe('今天');
    expect(days[1].label).toBe('明天');
    expect(days[6].label).toBe('周六');
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
});
