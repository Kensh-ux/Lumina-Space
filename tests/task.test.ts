import { describe, expect, it } from 'vitest';
import {
  addTask,
  countTasks,
  createTask,
  deleteTask,
  isTask,
  sortTasks,
  toggleTask,
  TASK_TITLE_MAX_LENGTH,
} from '../src/features/tasks/task';
import type { Task } from '../src/lib/types';

const NOW = new Date('2026-10-23T08:00:00.000Z');

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-fixed',
    title: '示例任务',
    done: false,
    createdAt: '2026-10-23T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

describe('createTask', () => {
  it('会 trim 标题', () => {
    expect(createTask('  复习高数  ', NOW)?.title).toBe('复习高数');
  });

  it('空标题返回 null', () => {
    expect(createTask('', NOW)).toBeNull();
    expect(createTask('   ', NOW)).toBeNull();
  });

  it('把标题截断到 120 字', () => {
    const task = createTask('x'.repeat(TASK_TITLE_MAX_LENGTH + 10), NOW);
    expect(task?.title).toHaveLength(TASK_TITLE_MAX_LENGTH);
  });

  it('生成唯一 id', () => {
    const first = createTask('第一件', NOW);
    const second = createTask('第二件', NOW);
    expect(first?.id).not.toBe(second?.id);
  });

  it('初始状态正确', () => {
    const task = createTask('写实验报告', NOW);
    expect(task).toMatchObject({
      title: '写实验报告',
      done: false,
      completedAt: null,
      createdAt: NOW.toISOString(),
    });
  });
});

describe('addTask', () => {
  it('追加任务且不修改原数组', () => {
    const tasks = [makeTask()];
    const next = addTask(tasks, '新任务', NOW);

    expect(next).toHaveLength(2);
    expect(tasks).toHaveLength(1);
    expect(next[1].title).toBe('新任务');
    expect(next).not.toBe(tasks);
  });

  it('空标题被忽略', () => {
    const tasks = [makeTask()];
    const next = addTask(tasks, '   ', NOW);

    expect(next).toHaveLength(1);
    expect(next[0]).toBe(tasks[0]);
  });
});

describe('toggleTask', () => {
  it('完成时写入 completedAt', () => {
    const next = toggleTask([makeTask({ id: 'a' })], 'a', NOW);

    expect(next[0].done).toBe(true);
    expect(next[0].completedAt).toBe(NOW.toISOString());
  });

  it('取消完成时清空 completedAt', () => {
    const task = makeTask({ id: 'a', done: true, completedAt: '2026-10-22T00:00:00.000Z' });
    const next = toggleTask([task], 'a', NOW);

    expect(next[0].done).toBe(false);
    expect(next[0].completedAt).toBeNull();
  });

  it('只改目标任务', () => {
    const a = makeTask({ id: 'a' });
    const b = makeTask({ id: 'b' });
    const next = toggleTask([a, b], 'a', NOW);

    expect(next[1]).toBe(b);
  });
});

describe('deleteTask', () => {
  it('只删除目标任务', () => {
    const a = makeTask({ id: 'a' });
    const b = makeTask({ id: 'b' });
    const next = deleteTask([a, b], 'a');

    expect(next.map((task) => task.id)).toEqual(['b']);
  });
});

describe('sortTasks', () => {
  it('未完成排在已完成前面', () => {
    const done = makeTask({ id: 'done', done: true, createdAt: '2026-10-23T03:00:00.000Z' });
    const undone = makeTask({ id: 'undone', createdAt: '2026-10-23T01:00:00.000Z' });

    expect(sortTasks([done, undone]).map((task) => task.id)).toEqual(['undone', 'done']);
  });

  it('同组内按创建时间降序', () => {
    const older = makeTask({ id: 'older', createdAt: '2026-10-22T00:00:00.000Z' });
    const newer = makeTask({ id: 'newer', createdAt: '2026-10-23T00:00:00.000Z' });

    expect(sortTasks([older, newer]).map((task) => task.id)).toEqual(['newer', 'older']);
  });

  it('不修改原数组', () => {
    const older = makeTask({ id: 'older', createdAt: '2026-10-22T00:00:00.000Z' });
    const newer = makeTask({ id: 'newer', createdAt: '2026-10-23T00:00:00.000Z' });
    const tasks = [older, newer];

    const sorted = sortTasks(tasks);

    expect(sorted).not.toBe(tasks);
    expect(tasks.map((task) => task.id)).toEqual(['older', 'newer']);
  });
});

describe('isTask', () => {
  it('接受合法任务', () => {
    expect(isTask(makeTask())).toBe(true);
  });

  it('拒绝字段缺失或类型错误', () => {
    expect(isTask(null)).toBe(false);
    expect(isTask({})).toBe(false);
    expect(isTask({ ...makeTask(), done: 'yes' })).toBe(false);
    expect(isTask({ ...makeTask(), completedAt: undefined })).toBe(false);
  });

  it('拒绝空白标题', () => {
    expect(isTask({ ...makeTask(), title: '   ' })).toBe(false);
  });

  it('拒绝非法 createdAt', () => {
    expect(isTask({ ...makeTask(), createdAt: 'not-a-date' })).toBe(false);
  });
});

describe('countTasks', () => {
  it('统计总数、完成与未完成', () => {
    const counts = countTasks([
      makeTask({ id: 'a' }),
      makeTask({ id: 'b', done: true }),
      makeTask({ id: 'c', done: true }),
    ]);

    expect(counts).toEqual({ total: 3, done: 2, open: 1 });
  });

  it('空数组返回全 0', () => {
    expect(countTasks([])).toEqual({ total: 0, done: 0, open: 0 });
  });
});
