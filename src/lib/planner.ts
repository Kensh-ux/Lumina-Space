import { toLocalDateString } from './date';
import type { Task } from './types';

export interface PlannerDay {
  date: string;
  label: string;
  dateLabel: string;
  isToday: boolean;
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 从本地“今天”开始连续 count 天；不用周一到周日。
export function getNextDays(now: Date = new Date(), count = 7): PlannerDay[] {
  const days: PlannerDay[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    days.push({
      date: toLocalDateString(date),
      label: offset === 0 ? '今天' : offset === 1 ? '明天' : WEEKDAY_LABELS[date.getDay()],
      dateLabel: `${month}/${day}`,
      isToday: offset === 0,
    });
  }
  return days;
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
