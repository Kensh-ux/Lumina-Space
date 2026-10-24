export type MoodId = 'positive' | 'neutral' | 'negative';

export const MOOD_IDS: readonly MoodId[] = ['positive', 'neutral', 'negative'];

export const STORAGE_KEY = 'lumina:data';
export const THEME_KEY = 'lumina:theme';

export type TaskPriority = 1 | 2 | 3;

export const TASK_PRIORITIES: readonly TaskPriority[] = [1, 2, 3];

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export function isValidPriority(value: unknown): value is TaskPriority {
  return value === 1 || value === 2 || value === 3;
}

export function isValidDueDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

export function isTask(value: unknown): value is Task {
  return normalizeTask(value) !== null;
}

// 核心字段坏 → null（整包 invalid）；可选字段坏 → 清理后保留任务。
export function normalizeTask(value: unknown): Task | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const task = value as Record<string, unknown>;
  const coreValid =
    typeof task.id === 'string' &&
    task.id.length > 0 &&
    typeof task.title === 'string' &&
    task.title.trim().length > 0 &&
    typeof task.done === 'boolean' &&
    typeof task.createdAt === 'string' &&
    !Number.isNaN(Date.parse(task.createdAt)) &&
    (task.completedAt === null || typeof task.completedAt === 'string');
  if (!coreValid) {
    return null;
  }
  const normalized: Task = {
    id: task.id as string,
    title: task.title as string,
    done: task.done as boolean,
    createdAt: task.createdAt as string,
    completedAt: task.completedAt as string | null,
  };
  if (isValidPriority(task.priority)) {
    normalized.priority = task.priority;
  }
  if (task.dueDate === null) {
    normalized.dueDate = null;
  } else if (isValidDueDate(task.dueDate)) {
    normalized.dueDate = task.dueDate;
  } else if (task.dueDate !== undefined) {
    normalized.dueDate = null;
  }
  return normalized;
}

export interface AppDataV1 {
  schemaVersion: 1;
  tasks: Task[];
  mood: {
    current: MoodId;
    updatedAt: string;
  };
}
