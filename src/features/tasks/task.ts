import {
  isValidDueDate,
  isValidDueTime,
  isValidPriority,
  TASK_DESCRIPTION_MAX_LENGTH,
} from '../../lib/types';
import type { Task, TaskPriority } from '../../lib/types';
import { toLocalDateString } from '../../lib/date';

export { isTask } from '../../lib/types';
export { TASK_DESCRIPTION_MAX_LENGTH, toLocalDateString };

export const TASK_TITLE_MAX_LENGTH = 120;

export const TASK_PRIORITY_META: readonly { value: TaskPriority; label: string }[] = [
  { value: 3, label: '高' },
  { value: 2, label: '中' },
  { value: 1, label: '低' },
];

export type TaskFilter = 'all' | 'open' | 'done';

export interface TaskPatch {
  title?: string;
  description?: string;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  dueTime?: string | null;
}

export interface TaskDraft {
  title: string;
  description?: string;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  dueTime?: string | null;
}

let idCounter = 0;

function createTaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `task-${Date.now()}-${idCounter}`;
}

function normalizeTitle(title: string): string {
  return Array.from(title.trim()).slice(0, TASK_TITLE_MAX_LENGTH).join('');
}

function normalizeDescription(description: string): string {
  return Array.from(description.trim()).slice(0, TASK_DESCRIPTION_MAX_LENGTH).join('');
}

// 新建/编辑共用的字段校验；返回 null 表示标题无效。
export function createTaskWithDetails(draft: TaskDraft, now: Date = new Date()): Task | null {
  const title = normalizeTitle(draft.title);
  if (title.length === 0) {
    return null;
  }
  const task: Task = {
    id: createTaskId(),
    title,
    done: false,
    createdAt: now.toISOString(),
    completedAt: null,
  };
  const description = normalizeDescription(draft.description ?? '');
  if (description.length > 0) {
    task.description = description;
  }
  if (draft.priority !== null && draft.priority !== undefined && isValidPriority(draft.priority)) {
    task.priority = draft.priority;
  }
  if (draft.dueDate && isValidDueDate(draft.dueDate)) {
    task.dueDate = draft.dueDate;
    if (draft.dueTime && isValidDueTime(draft.dueTime)) {
      task.dueTime = draft.dueTime;
    }
  }
  return task;
}

// 纯函数：返回 null 表示标题无效，不抛错。
export function createTask(title: string, now: Date = new Date()): Task | null {
  return createTaskWithDetails({ title }, now);
}

export function addTask(tasks: readonly Task[], title: string, now: Date = new Date()): Task[] {
  const task = createTask(title, now);
  if (!task) {
    return tasks.slice();
  }
  return [...tasks, task];
}

export function toggleTask(tasks: readonly Task[], id: string, now: Date = new Date()): Task[] {
  return tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }
    const done = !task.done;
    return {
      ...task,
      done,
      completedAt: done ? now.toISOString() : null,
    };
  });
}

export function deleteTask(tasks: readonly Task[], id: string): Task[] {
  return tasks.filter((task) => task.id !== id);
}

export function clearCompleted(tasks: readonly Task[]): Task[] {
  return tasks.filter((task) => !task.done);
}

// 只改 title / description / priority / dueDate / dueTime；空标题保持原值，非法值忽略。
export function updateTask(tasks: readonly Task[], id: string, patch: TaskPatch): Task[] {
  return tasks.map((task) => {
    if (task.id !== id) {
      return task;
    }
    const next: Task = { ...task };
    if (patch.title !== undefined) {
      const title = normalizeTitle(patch.title);
      if (title.length > 0) {
        next.title = title;
      }
    }
    if ('description' in patch) {
      const description = normalizeDescription(patch.description ?? '');
      if (description.length > 0) {
        next.description = description;
      } else {
        delete next.description;
      }
    }
    if ('priority' in patch) {
      if (patch.priority === null || patch.priority === undefined) {
        delete next.priority;
      } else if (isValidPriority(patch.priority)) {
        next.priority = patch.priority;
      }
    }
    if ('dueDate' in patch) {
      if (patch.dueDate === null || patch.dueDate === undefined) {
        next.dueDate = null;
        delete next.dueTime;
      } else if (isValidDueDate(patch.dueDate)) {
        next.dueDate = patch.dueDate;
      }
    }
    if ('dueTime' in patch) {
      if (
        patch.dueTime === null ||
        patch.dueTime === undefined ||
        !next.dueDate ||
        !isValidDueTime(patch.dueTime)
      ) {
        delete next.dueTime;
      } else {
        next.dueTime = patch.dueTime;
      }
    }
    return next;
  });
}

export function setPriority(
  tasks: readonly Task[],
  id: string,
  priority: TaskPriority | null,
): Task[] {
  return updateTask(tasks, id, { priority });
}

export function setDueDate(tasks: readonly Task[], id: string, dueDate: string | null): Task[] {
  return updateTask(tasks, id, { dueDate });
}

export function filterTasks(tasks: readonly Task[], filter: TaskFilter): Task[] {
  if (filter === 'open') {
    return tasks.filter((task) => !task.done);
  }
  if (filter === 'done') {
    return tasks.filter((task) => task.done);
  }
  return [...tasks];
}

export function searchTasks(tasks: readonly Task[], query: string): Task[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length === 0) {
    return [...tasks];
  }
  return tasks.filter((task) => task.title.toLocaleLowerCase().includes(needle));
}

// 未完成在前；未完成按「优先级 60% + 距今天数 40%」打分降序，
// 同分看截止日期（近的在前，无日期最后），仍相同保持原顺序；已完成按创建时间降序。
const DAY_MS = 86_400_000;
const PRIORITY_SCORE: Record<TaskPriority, number> = { 1: 0, 2: 0.5, 3: 1 };

function dayNumber(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }
  return Math.floor(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS,
  );
}

function todayNumber(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
}

function taskScore(task: Task, today: number): number {
  const priority = PRIORITY_SCORE[task.priority ?? 2];
  let dateScore = 0;
  if (task.dueDate) {
    const day = dayNumber(task.dueDate);
    if (day !== null) {
      const offset = day - today;
      dateScore = offset <= 0 ? 1 : Math.max(0, 1 - offset / 30);
    }
  }
  return 0.6 * priority + 0.4 * dateScore;
}

export function sortTasks(tasks: readonly Task[], now: Date = new Date()): Task[] {
  const today = todayNumber(now);
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }
    if (a.done) {
      return b.createdAt.localeCompare(a.createdAt);
    }
    const scoreDiff = taskScore(b, today) - taskScore(a, today);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    const aDueDate = a.dueDate ?? '';
    const bDueDate = b.dueDate ?? '';
    if (aDueDate !== bDueDate) {
      if (!aDueDate) {
        return 1;
      }
      if (!bDueDate) {
        return -1;
      }
      // 按截止日期升序：过期任务自然排在前（任务卡口径），不是按「距今绝对距离」。
      return aDueDate.localeCompare(bDueDate);
    }
    return 0;
  });
}

// 已完成任务按完成时间倒序（最新完成的在前）；旧任务没有 completedAt 时退回创建时间。
export function sortCompletedTasks(tasks: readonly Task[]): Task[] {
  return tasks
    .filter((task) => task.done)
    .sort((a, b) => {
      const aTime = a.completedAt ?? a.createdAt;
      const bTime = b.completedAt ?? b.createdAt;
      if (aTime !== bTime) {
        return bTime.localeCompare(aTime);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function formatCompletedDate(task: Task): string {
  const value = task.completedAt ?? task.createdAt;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

export function formatDueDate(dueDate: string): string {
  const [, month, day] = dueDate.split('-');
  return `${month}/${day}`;
}

export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  if (!task.dueDate || task.done) {
    return false;
  }
  const today = toLocalDateString(now);
  if (task.dueDate > today) {
    return false;
  }
  if (task.dueDate < today) {
    return true;
  }
  if (!task.dueTime) {
    return false;
  }
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return task.dueTime < currentTime;
}

export interface TaskCounts {
  total: number;
  done: number;
  open: number;
}

export function countTasks(tasks: readonly Task[]): TaskCounts {
  let done = 0;
  for (const task of tasks) {
    if (task.done) {
      done += 1;
    }
  }
  return { total: tasks.length, done, open: tasks.length - done };
}
