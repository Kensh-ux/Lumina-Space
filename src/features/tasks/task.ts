import type { Task } from '../../lib/types';

export { isTask } from '../../lib/types';

export const TASK_TITLE_MAX_LENGTH = 120;

let idCounter = 0;

function createTaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `task-${Date.now()}-${idCounter}`;
}

// 纯函数：返回 null 表示标题无效，不抛错。
export function createTask(title: string, now: Date = new Date()): Task | null {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return {
    id: createTaskId(),
    title: Array.from(trimmed).slice(0, TASK_TITLE_MAX_LENGTH).join(''),
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

// 未完成在前；同组内按创建时间降序（新的在上面）。
export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}
