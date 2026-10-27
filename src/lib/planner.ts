import { toLocalDateString } from './date';
import type { Task } from './types';

export const PLANNER_DAYS = 365;

export interface PlannerDay {
  date: string;
  label: string;
  dateLabel: string;
  isToday: boolean;
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) {
    return startOfDay(value);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return startOfDay(new Date());
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? startOfDay(new Date()) : date;
}

function dayIndex(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS,
  );
}

function dayLabel(offset: number, date: Date): string {
  if (offset === 0) {
    return '今天';
  }
  if (offset === 1) {
    return '明天';
  }
  if (offset === -1) {
    return '昨天';
  }
  return WEEKDAY_LABELS[date.getDay()];
}

export function getPlannerStartDate(now: Date = new Date()): string {
  return toLocalDateString(now);
}

// 从所选起始日起连续 count 天；标签相对「真正的今天」计算，第一列不强行叫今天。
export function getPlannerDays(
  startDate: string | Date = new Date(),
  count = PLANNER_DAYS,
  now: Date = new Date(),
): PlannerDay[] {
  const start = parseLocalDate(startDate);
  const today = dayIndex(now);
  const days: PlannerDay[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    days.push({
      date: toLocalDateString(date),
      label: dayLabel(dayIndex(date) - today, date),
      dateLabel: `${month}/${day}`,
      isToday: dayIndex(date) === today,
    });
  }
  return days;
}

// 标题格式：2026年，10月（中文逗号；月份不补零）。
export function formatMonthTitle(date: string): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!match) {
    return '';
  }
  return `${match[1]}年，${Number(match[2])}月`;
}

export function tasksForDate(tasks: readonly Task[], date: string): Task[] {
  return tasks
    .filter((task) => task.dueDate === date)
    .sort((a, b) => {
      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }
      if (a.dueTime && b.dueTime && a.dueTime !== b.dueTime) {
        return a.dueTime.localeCompare(b.dueTime);
      }
      if (a.dueTime && !b.dueTime) {
        return -1;
      }
      if (!a.dueTime && b.dueTime) {
        return 1;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}
