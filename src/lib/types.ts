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
  description?: string;
  dueTime?: string | null;
}

export const TASK_DESCRIPTION_MAX_LENGTH = 500;

export interface MoodEntry {
  id: string;
  mood: MoodId;
  at: string;
}

export interface FocusSession {
  id: string;
  durationSec: number;
  completedAt: string;
}

export const MOOD_LOG_LIMIT = 365;
export const FOCUS_SESSION_LIMIT = 500;
export const MIN_FOCUS_SESSION_SECONDS = 60;

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

export function isValidDueTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
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
  if (typeof task.description === 'string') {
    const description = task.description.trim().slice(0, TASK_DESCRIPTION_MAX_LENGTH);
    if (description.length > 0) {
      normalized.description = description;
    }
  }
  if (normalized.dueDate && isValidDueTime(task.dueTime)) {
    normalized.dueTime = task.dueTime;
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
  moodLog?: MoodEntry[];
  focusSessions?: FocusSession[];
}
