import { describe, expect, it } from 'vitest';
import {
  addTask,
  clearCompleted,
  countTasks,
  createTask,
  createTaskWithDetails,
  deleteTask,
  filterTasks,
  formatDueDate,
  isTask,
  isTaskOverdue,
  searchTasks,
  setDueDate,
  setPriority,
  sortTasks,
  toLocalDateString,
  toggleTask,
  updateTask,
  TASK_TITLE_MAX_LENGTH,
} from '../src/features/tasks/task';
import { normalizeTask } from '../src/lib/types';
import type { Task, TaskPriority } from '../src/lib/types';

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

describe('updateTask', () => {
  it('trim 标题、只改目标任务且不修改原数组', () => {
    const a = makeTask({ id: 'a' });
    const b = makeTask({ id: 'b' });
    const tasks = [a, b];

    const next = updateTask(tasks, 'a', { title: '  新标题  ' });

    expect(next[0].title).toBe('新标题');
    expect(next[1]).toBe(b);
    expect(a.title).toBe('示例任务');
    expect(next).not.toBe(tasks);
  });

  it('空标题回退原值', () => {
    const task = makeTask({ title: '原标题' });
    expect(updateTask([task], task.id, { title: '   ' })[0].title).toBe('原标题');
  });

  it('同时更新优先级与截止日期', () => {
    const task = makeTask();
    const next = updateTask([task], task.id, { priority: 3, dueDate: '2026-10-30' });

    expect(next[0].priority).toBe(3);
    expect(next[0].dueDate).toBe('2026-10-30');
  });

  it('非法优先级或日期被忽略', () => {
    const task = makeTask({ priority: 2, dueDate: '2026-10-28' });
    const next = updateTask([task], task.id, {
      priority: 4 as unknown as TaskPriority,
      dueDate: '2026-02-30',
    });

    expect(next[0].priority).toBe(2);
    expect(next[0].dueDate).toBe('2026-10-28');
  });

  it('priority null 清除优先级，dueDate null 清空截止', () => {
    const task = makeTask({ priority: 3, dueDate: '2026-10-28' });
    const next = updateTask([task], task.id, { priority: null, dueDate: null });

    expect(next[0].priority).toBeUndefined();
    expect(next[0].dueDate).toBeNull();
  });
});

describe('setPriority', () => {
  it('设置合法优先级', () => {
    const task = makeTask();
    expect(setPriority([task], task.id, 1)[0].priority).toBe(1);
  });

  it('传 null 清除优先级', () => {
    const task = makeTask({ priority: 3 });
    expect(setPriority([task], task.id, null)[0].priority).toBeUndefined();
  });
});

describe('setDueDate', () => {
  it('设置合法日期', () => {
    const task = makeTask();
    expect(setDueDate([task], task.id, '2026-10-28')[0].dueDate).toBe('2026-10-28');
  });

  it('非法日期忽略', () => {
    const task = makeTask();
    expect(setDueDate([task], task.id, '10/28')[0].dueDate).toBeUndefined();
  });

  it('传 null 清空日期', () => {
    const task = makeTask({ dueDate: '2026-10-28' });
    expect(setDueDate([task], task.id, null)[0].dueDate).toBeNull();
  });
});

describe('filterTasks', () => {
  const open = makeTask({ id: 'open' });
  const done = makeTask({ id: 'done', done: true, completedAt: '2026-10-23T00:00:00.000Z' });
  const tasks = [open, done];

  it('按 open / done / all 过滤', () => {
    expect(filterTasks(tasks, 'open').map((task) => task.id)).toEqual(['open']);
    expect(filterTasks(tasks, 'done').map((task) => task.id)).toEqual(['done']);
    expect(filterTasks(tasks, 'all').map((task) => task.id)).toEqual(['open', 'done']);
  });

  it('all 返回新数组，不修改原数组', () => {
    const next = filterTasks(tasks, 'all');
    expect(next).not.toBe(tasks);
    expect(tasks).toHaveLength(2);
  });
});

describe('searchTasks', () => {
  const math = makeTask({ id: 'math', title: 'Review Math' });
  const report = makeTask({ id: 'report', title: '写周报' });
  const tasks = [math, report];

  it('trim 且大小写不敏感', () => {
    expect(searchTasks(tasks, '  review ').map((task) => task.id)).toEqual(['math']);
  });

  it('空查询返回全部（新数组）', () => {
    const next = searchTasks(tasks, '   ');
    expect(next.map((task) => task.id)).toEqual(['math', 'report']);
    expect(next).not.toBe(tasks);
  });

  it('无匹配返回空数组', () => {
    expect(searchTasks(tasks, '不存在')).toEqual([]);
  });
});

describe('clearCompleted', () => {
  it('只删除已完成任务', () => {
    const open = makeTask({ id: 'open' });
    const done = makeTask({ id: 'done', done: true, completedAt: '2026-10-23T00:00:00.000Z' });

    expect(clearCompleted([open, done]).map((task) => task.id)).toEqual(['open']);
  });
});

describe('isTask / normalizeTask 可选字段', () => {
  it('接受缺 priority / dueDate 的旧任务', () => {
    expect(isTask(makeTask())).toBe(true);
  });

  it('接受合法 priority 与 dueDate', () => {
    expect(isTask({ ...makeTask(), priority: 3, dueDate: '2026-10-28' })).toBe(true);
    expect(isTask({ ...makeTask(), dueDate: null })).toBe(true);
  });

  it('非法 priority / dueDate 不影响核心有效性，由 normalizeTask 清理', () => {
    expect(isTask({ ...makeTask(), priority: 4 })).toBe(true);
    expect(isTask({ ...makeTask(), dueDate: '2026-02-30' })).toBe(true);

    const normalized = normalizeTask({ ...makeTask(), priority: 4, dueDate: '2026-02-30' });
    expect(normalized?.priority).toBeUndefined();
    expect(normalized?.dueDate).toBeNull();
  });

  it('核心字段坏时 normalizeTask 返回 null', () => {
    expect(normalizeTask({ ...makeTask(), id: '' })).toBeNull();
    expect(normalizeTask({ ...makeTask(), createdAt: 'not-a-date' })).toBeNull();
    expect(normalizeTask(null)).toBeNull();
  });
});

describe('日期辅助', () => {
  it('toLocalDateString 输出本地 YYYY-MM-DD', () => {
    expect(toLocalDateString(new Date(2026, 9, 28))).toBe('2026-10-28');
  });

  it('formatDueDate 输出 MM/DD', () => {
    expect(formatDueDate('2026-10-28')).toBe('10/28');
  });

  it('isTaskOverdue 只对过期且未完成的任务为 true', () => {
    const today = '2026-10-28';

    expect(isTaskOverdue(makeTask({ dueDate: '2026-10-27' }), today)).toBe(true);
    expect(isTaskOverdue(makeTask({ dueDate: '2026-10-27', done: true }), today)).toBe(false);
    expect(isTaskOverdue(makeTask({ dueDate: '2026-10-29' }), today)).toBe(false);
    expect(isTaskOverdue(makeTask({ dueDate: today }), today)).toBe(false);
    expect(isTaskOverdue(makeTask(), today)).toBe(false);
  });
});

describe('任务描述与截止时间', () => {
  it('createTaskWithDetails 保存描述、优先级、日期与时间', () => {
    const task = createTaskWithDetails(
      {
        title: '  复习  ',
        description: '  看笔记  ',
        priority: 3,
        dueDate: '2026-10-28',
        dueTime: '18:00',
      },
      NOW,
    );

    expect(task).toMatchObject({
      title: '复习',
      description: '看笔记',
      priority: 3,
      dueDate: '2026-10-28',
      dueTime: '18:00',
    });
  });

  it('createTaskWithDetails 空标题返回 null，无日期时忽略时间', () => {
    expect(createTaskWithDetails({ title: '   ' }, NOW)).toBeNull();

    const task = createTaskWithDetails({ title: '只写时间', dueTime: '18:00' }, NOW);
    expect(task?.dueTime).toBeUndefined();
  });

  it('updateTask 更新描述，空描述清除', () => {
    const task = makeTask({ description: '旧描述' });
    const withDescription = updateTask([task], task.id, { description: '  新描述  ' });
    expect(withDescription[0].description).toBe('新描述');

    const cleared = updateTask(withDescription, task.id, { description: '   ' });
    expect(cleared[0].description).toBeUndefined();
  });

  it('updateTask 设置日期与时间，清空日期时一并清时间', () => {
    const task = makeTask();
    const withDue = updateTask([task], task.id, {
      dueDate: '2026-10-28',
      dueTime: '18:00',
    });
    expect(withDue[0].dueDate).toBe('2026-10-28');
    expect(withDue[0].dueTime).toBe('18:00');

    const cleared = updateTask(withDue, task.id, { dueDate: null });
    expect(cleared[0].dueDate).toBeNull();
    expect(cleared[0].dueTime).toBeUndefined();
  });

  it('normalizeTask 清理非法描述/时间，保留合法值', () => {
    const valid = normalizeTask({
      ...makeTask(),
      description: '  说明  ',
      dueDate: '2026-10-28',
      dueTime: '18:00',
    });
    expect(valid?.description).toBe('说明');
    expect(valid?.dueTime).toBe('18:00');

    const invalid = normalizeTask({
      ...makeTask(),
      description: 123,
      dueDate: '2026-10-28',
      dueTime: '25:00',
    });
    expect(invalid?.description).toBeUndefined();
    expect(invalid?.dueTime).toBeUndefined();
  });
});
