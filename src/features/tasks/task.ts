import { isValidDueDate, isValidPriority } from '../../lib/types';
import type { Task, TaskPriority } from '../../lib/types';
import { toLocalDateString } from '../../lib/date';

export { isTask } from '../../lib/types';
export { toLocalDateString };

export const TASK_TITLE_MAX_LENGTH = 120;

export const TASK_PRIORITY_META: readonly { value: TaskPriority; label: string }[] = [
  { value: 3, label: '高' },
  { value: 2, label: '中' },
  { value: 1, label: '低' },
];

export type TaskFilter = 'all' | 'open' | 'done';

export interface TaskPatch {
  title?: string;
  priority?: TaskPriority | null;
  dueDate?: string | null;
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

// 纯函数：返回 null 表示标题无效，不抛错。
export function createTask(title: string, now: Date = new Date()): Task | null {
  const trimmed = normalizeTitle(title);
  if (trimmed.length === 0) {
    return null;
  }
  return {
    id: createTaskId(),
    title: trimmed,
    done: false,
    createdAt: now.toISOString(),
    completedAt: null,
  };
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

// 只改 title / priority / dueDate；空标题保持原值，非法值忽略。
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
      } else if (isValidDueDate(patch.dueDate)) {
        next.dueDate = patch.dueDate;
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

// 未完成在前；同组内按创建时间降序（新的在上面）。
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function formatDueDate(dueDate: string): string {
  const [, month, day] = dueDate.split('-');
  return `${month}/${day}`;
}

export function isTaskOverdue(task: Task, today: string = toLocalDateString()): boolean {
  return Boolean(task.dueDate) && !task.done && (task.dueDate as string) < today;
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
