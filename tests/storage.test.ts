import { beforeEach, describe, expect, it } from 'vitest';
import { clearData, createDefaultData, loadData, saveData } from '../src/lib/storage';
import { MAX_BACKGROUND_DATA_URL_LENGTH } from '../src/lib/customBackground';

const KEY = 'lumina:data';
const BACKUP_KEY = 'lumina:data:backup';
const THEME_KEY = 'lumina:theme';

class MemoryStorage implements Storage {
  private items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    const value = this.items.get(key);
    return value === undefined ? null : value;
  }

  key(index: number): string | null {
    return Array.from(this.items.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

class QuotaStorage extends MemoryStorage {
  override setItem(_key: string, _value: string): void {
    throw new Error('quota exceeded');
  }
}

class BlockedStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('storage blocked');
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

describe('loadData', () => {
  it('空存储返回默认值（中性、空任务）', () => {
    const data = loadData(storage);
    expect(data.schemaVersion).toBe(1);
    expect(data.tasks).toEqual([]);
    expect(data.mood.current).toBe('neutral');
    expect(typeof data.mood.updatedAt).toBe('string');
  });

  it('saveData 之后 loadData 往返一致', () => {
    const data = createDefaultData();
    data.mood.current = 'positive';
    data.tasks.push({
      id: 'task-1',
      title: '写测试',
      done: false,
      createdAt: '2026-10-21T00:00:00.000Z',
      completedAt: null,
    });

    expect(saveData(data, storage)).toBe(true);
    expect(loadData(storage)).toEqual(data);
  });

  it('非法 JSON 返回默认值，并把原始字符串放进备份键', () => {
    storage.setItem(KEY, '{not-json');

    const data = loadData(storage);

    expect(data.mood.current).toBe('neutral');
    expect(storage.getItem(BACKUP_KEY)).toBe('{not-json');
  });

  it('schemaVersion 不匹配时返回默认值并备份', () => {
    const raw = JSON.stringify({
      schemaVersion: 2,
      tasks: [],
      mood: { current: 'neutral', updatedAt: '2026-10-21T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.schemaVersion).toBe(1);
    expect(storage.getItem(BACKUP_KEY)).toBe(raw);
  });

  it('tasks 不是数组时返回默认值', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: 'oops',
        mood: { current: 'neutral', updatedAt: '2026-10-21T00:00:00.000Z' },
      }),
    );

    expect(loadData(storage).tasks).toEqual([]);
  });

  it('合法任务数组被读取', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [
        {
          id: 'task-1',
          title: '复习高数',
          done: false,
          createdAt: '2026-10-23T00:00:00.000Z',
          completedAt: null,
        },
      ],
      mood: { current: 'positive', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].title).toBe('复习高数');
    expect(data.mood.current).toBe('positive');
  });

  it('旧任务缺 priority / dueDate 时正常读取，不备份不重置', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [
        {
          id: 'task-legacy',
          title: '旧任务',
          done: false,
          createdAt: '2026-10-23T00:00:00.000Z',
          completedAt: null,
        },
      ],
      mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].priority).toBeUndefined();
    expect(data.tasks[0].dueDate).toBeUndefined();
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('合法 priority / dueDate 往返保留', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [
        {
          id: 'task-enhanced',
          title: '带优先级与截止',
          done: false,
          createdAt: '2026-10-23T00:00:00.000Z',
          completedAt: null,
          priority: 3,
          dueDate: '2026-10-30',
        },
      ],
      mood: { current: 'positive', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.tasks[0].priority).toBe(3);
    expect(data.tasks[0].dueDate).toBe('2026-10-30');
  });

  it('合法 description / dueTime 往返保留', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [
          {
            id: 'task-details',
            title: '带描述与时间',
            done: false,
            createdAt: '2026-10-23T00:00:00.000Z',
            completedAt: null,
            description: '  补充说明  ',
            dueDate: '2026-10-30',
            dueTime: '18:00',
          },
        ],
        mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
      }),
    );

    const data = loadData(storage);

    expect(data.tasks[0].description).toBe('补充说明');
    expect(data.tasks[0].dueTime).toBe('18:00');
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('非法 description / dueTime 被清理但任务保留', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [
          {
            id: 'task-bad-details',
            title: '坏描述与时间',
            done: false,
            createdAt: '2026-10-23T00:00:00.000Z',
            completedAt: null,
            description: 42,
            dueDate: '2026-10-30',
            dueTime: '25:00',
          },
        ],
        mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
      }),
    );

    const data = loadData(storage);

    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].description).toBeUndefined();
    expect(data.tasks[0].dueTime).toBeUndefined();
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('priority 非法时 normalize 为 undefined，保留任务与 mood，不备份', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [
        {
          id: 'task-bad-priority',
          title: '坏优先级',
          done: false,
          createdAt: '2026-10-23T00:00:00.000Z',
          completedAt: null,
          priority: 9,
        },
      ],
      mood: { current: 'negative', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].title).toBe('坏优先级');
    expect(data.tasks[0].priority).toBeUndefined();
    expect(data.mood.current).toBe('negative');
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('dueDate 非法时 normalize 为 null，保留任务，不备份', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [
        {
          id: 'task-bad-date',
          title: '坏日期',
          done: false,
          createdAt: '2026-10-23T00:00:00.000Z',
          completedAt: null,
          dueDate: '2026-02-30',
        },
      ],
      mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].dueDate).toBeNull();
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('一条坏 priority + 一条好任务 + negative mood 时全部保留，坏字段被清', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [
        {
          id: 'task-bad-priority',
          title: '坏优先级',
          done: false,
          createdAt: '2026-10-23T00:00:00.000Z',
          completedAt: null,
          priority: 9,
        },
        {
          id: 'task-good',
          title: '好任务',
          done: false,
          createdAt: '2026-10-23T01:00:00.000Z',
          completedAt: null,
          priority: 2,
          dueDate: '2026-10-28',
        },
      ],
      mood: { current: 'negative', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.tasks.map((task) => task.id)).toEqual(['task-bad-priority', 'task-good']);
    expect(data.tasks[0].priority).toBeUndefined();
    expect(data.tasks[1].priority).toBe(2);
    expect(data.tasks[1].dueDate).toBe('2026-10-28');
    expect(data.mood.current).toBe('negative');
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
    expect(storage.getItem(KEY)).toBe(raw);
  });

  it('旧数据缺 moodLog / focusSessions 时读取为空数组，不备份', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [],
      mood: { current: 'negative', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.moodLog).toEqual([]);
    expect(data.focusSessions).toEqual([]);
    expect(data.mood.current).toBe('negative');
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('旧数据缺 moodNotes 时读取为空数组，不备份', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [],
      mood: { current: 'negative', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.moodNotes).toEqual([]);
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
    expect(storage.getItem(KEY)).toBe(raw);
  });

  it('保留合法的 moodNotes，trim 并钳制分数', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [],
        mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
        moodNotes: [
          {
            id: 'note-1',
            emotion: '  期待  ',
            content: '  明天去图书馆  ',
            score: 999,
            createdAt: '2026-10-23T08:00:00.000Z',
          },
          {
            id: 'note-2',
            emotion: '焦虑',
            content: '考试',
            score: -999,
            createdAt: '2026-10-24T08:00:00.000Z',
          },
        ],
      }),
    );

    const data = loadData(storage);

    expect(data.moodNotes).toEqual([
      {
        id: 'note-1',
        emotion: '期待',
        content: '明天去图书馆',
        score: 597,
        createdAt: '2026-10-23T08:00:00.000Z',
      },
      {
        id: 'note-2',
        emotion: '焦虑',
        content: '考试',
        score: -724,
        createdAt: '2026-10-24T08:00:00.000Z',
      },
    ]);
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('坏 moodNotes 条目逐条丢弃，好条目保留，不备份', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [],
      mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
      moodNotes: [
        {
          id: 'good',
          emotion: '喜悦',
          content: '好记录',
          score: 1,
          createdAt: '2026-10-23T08:00:00.000Z',
        },
        { id: '', emotion: '喜悦', content: '坏 id', score: 1, createdAt: '2026-10-23T08:00:00.000Z' },
        { id: 'bad-emotion', emotion: '  ', content: '空情绪', score: 1, createdAt: '2026-10-23T08:00:00.000Z' },
        { id: 'bad-content', emotion: '喜悦', content: '  ', score: 1, createdAt: '2026-10-23T08:00:00.000Z' },
        { id: 'bad-score', emotion: '喜悦', content: '坏分数', score: 'x', createdAt: '2026-10-23T08:00:00.000Z' },
        { id: 'bad-date', emotion: '喜悦', content: '坏日期', score: 1, createdAt: 'nope' },
        'not-an-object',
      ],
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.moodNotes?.map((note) => note.id)).toEqual(['good']);
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
    expect(storage.getItem(KEY)).toBe(raw);
  });

  it('moodNotes 超过 500 条时只保留最新的 500 条', () => {
    const notes = Array.from({ length: 505 }, (_, index) => ({
      id: `note-${index}`,
      emotion: '期待',
      content: `记录 ${index}`,
      score: index,
      createdAt: new Date(2026, 9, 1, 0, index).toISOString(),
    }));
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [],
        mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
        moodNotes: notes,
      }),
    );

    const data = loadData(storage);

    expect(data.moodNotes).toHaveLength(500);
    expect(data.moodNotes?.[0].id).toBe('note-5');
    expect(data.moodNotes?.[499].id).toBe('note-504');
  });

  it('moodNotes.updatedAt 往返保留，非法值丢弃且记录保留', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [],
        mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
        moodNotes: [
          {
            id: 'with-updated',
            emotion: '喜悦',
            content: '编辑过',
            score: 1,
            createdAt: '2026-10-23T08:00:00.000Z',
            updatedAt: '2026-10-24T09:30:00.000Z',
          },
          {
            id: 'bad-updated',
            emotion: '焦虑',
            content: '坏编辑时间',
            score: 1,
            createdAt: '2026-10-23T08:00:00.000Z',
            updatedAt: 'not-a-date',
          },
        ],
      }),
    );

    const data = loadData(storage);

    expect(data.moodNotes?.[0].updatedAt).toBe('2026-10-24T09:30:00.000Z');
    expect(data.moodNotes?.[1].id).toBe('bad-updated');
    expect(data.moodNotes?.[1].updatedAt).toBeUndefined();
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('旧数据缺 customBackgrounds 时读取为 {}，不备份', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [],
      mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.customBackgrounds).toEqual({});
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
    expect(storage.getItem(KEY)).toBe(raw);
  });

  it('保留合法 customBackgrounds，非法 / 超长逐场景丢弃', () => {
    const tooLong = `data:image/jpeg;base64,${'A'.repeat(MAX_BACKGROUND_DATA_URL_LENGTH)}`;
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [],
        mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
        customBackgrounds: {
          positive: 'data:image/jpeg;base64,AAAA',
          neutral: 'https://example.com/not-a-data-url.jpg',
          negative: tooLong,
        },
      }),
    );

    const data = loadData(storage);

    expect(data.customBackgrounds).toEqual({ positive: 'data:image/jpeg;base64,AAAA' });
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('保留合法的 moodLog / focusSessions 条目', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [],
        mood: { current: 'positive', updatedAt: '2026-10-23T00:00:00.000Z' },
        moodLog: [{ id: 'm1', mood: 'positive', at: '2026-10-23T08:00:00.000Z' }],
        focusSessions: [
          { id: 'f1', durationSec: 1500, completedAt: '2026-10-23T09:00:00.000Z' },
        ],
      }),
    );

    const data = loadData(storage);

    expect(data.moodLog).toEqual([
      { id: 'm1', mood: 'positive', at: '2026-10-23T08:00:00.000Z' },
    ]);
    expect(data.focusSessions).toEqual([
      { id: 'f1', durationSec: 1500, completedAt: '2026-10-23T09:00:00.000Z' },
    ]);
  });

  it('坏 moodLog / focusSessions 条目被过滤，好条目保留，不备份', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [],
      mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
      moodLog: [
        { id: 'm-good', mood: 'positive', at: '2026-10-23T08:00:00.000Z' },
        { id: 'm-bad-mood', mood: 'happy', at: '2026-10-23T08:10:00.000Z' },
        { id: 'm-bad-date', mood: 'negative', at: 'not-a-date' },
      ],
      focusSessions: [
        { id: 'f-good', durationSec: 60, completedAt: '2026-10-23T09:00:00.000Z' },
        { id: 'f-too-short', durationSec: 30, completedAt: '2026-10-23T09:10:00.000Z' },
        { id: 'f-bad-date', durationSec: 60, completedAt: 'nope' },
      ],
    });
    storage.setItem(KEY, raw);

    const data = loadData(storage);

    expect(data.moodLog).toEqual([
      { id: 'm-good', mood: 'positive', at: '2026-10-23T08:00:00.000Z' },
    ]);
    expect(data.focusSessions).toEqual([
      { id: 'f-good', durationSec: 60, completedAt: '2026-10-23T09:00:00.000Z' },
    ]);
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
    expect(storage.getItem(KEY)).toBe(raw);
  });

  it('任务字段非法时返回默认值并备份', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [{ id: 'task-1', title: 'x', done: false, createdAt: '2026-10-23T00:00:00.000Z' }],
      mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    expect(loadData(storage).tasks).toEqual([]);
    expect(storage.getItem(BACKUP_KEY)).toBe(raw);
  });

  it('旧数据 tasks 为空数组时正常读取', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [],
        mood: { current: 'negative', updatedAt: '2026-10-21T00:00:00.000Z' },
      }),
    );

    const data = loadData(storage);

    expect(data.tasks).toEqual([]);
    expect(data.mood.current).toBe('negative');
  });

  it('schemaVersion=1 但缺 tasks 的旧数据迁移为空数组并保留情绪', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        mood: { current: 'negative', updatedAt: '2026-10-21T00:00:00.000Z' },
      }),
    );

    const data = loadData(storage);

    expect(data.tasks).toEqual([]);
    expect(data.mood.current).toBe('negative');
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('任务 id 重复时返回默认值并备份', () => {
    const task = {
      id: 'dup-id',
      title: '第一件',
      done: false,
      createdAt: '2026-10-23T00:00:00.000Z',
      completedAt: null,
    };
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [task, { ...task, title: '第二件' }],
      mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    expect(loadData(storage).tasks).toEqual([]);
    expect(storage.getItem(BACKUP_KEY)).toBe(raw);
  });

  it('任务 createdAt 非法日期时返回默认值并备份', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [
        {
          id: 'task-1',
          title: '复习高数',
          done: false,
          createdAt: 'not-a-date',
          completedAt: null,
        },
      ],
      mood: { current: 'neutral', updatedAt: '2026-10-23T00:00:00.000Z' },
    });
    storage.setItem(KEY, raw);

    expect(loadData(storage).tasks).toEqual([]);
    expect(storage.getItem(BACKUP_KEY)).toBe(raw);
  });

  it('mood.current 非法时返回默认值', () => {
    storage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [],
        mood: { current: 'happy', updatedAt: '2026-10-21T00:00:00.000Z' },
      }),
    );

    expect(loadData(storage).mood.current).toBe('neutral');
  });

  it('读取抛异常时返回默认值，不崩溃', () => {
    expect(loadData(new BlockedStorage()).mood.current).toBe('neutral');
  });
});

describe('saveData', () => {
  it('setItem 抛异常时返回 false，不抛出', () => {
    expect(() => saveData(createDefaultData(), new QuotaStorage())).not.toThrow();
    expect(saveData(createDefaultData(), new QuotaStorage())).toBe(false);
  });

  it('同步写入主题镜像键，供首帧脚本读取', () => {
    const data = createDefaultData();
    data.mood.current = 'positive';

    expect(saveData(data, storage)).toBe(true);
    expect(storage.getItem(THEME_KEY)).toBe('positive');
  });
});

describe('clearData', () => {
  it('删除 lumina:data、主题镜像键与备份键，不动其他键', () => {
    storage.setItem(KEY, JSON.stringify(createDefaultData()));
    storage.setItem(BACKUP_KEY, '{broken');
    storage.setItem(THEME_KEY, 'negative');
    storage.setItem('lumina:other', 'keep-me');
    storage.setItem('unrelated', 'keep-me-too');

    clearData(storage);

    expect(storage.getItem(KEY)).toBeNull();
    expect(storage.getItem(THEME_KEY)).toBeNull();
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
    expect(storage.getItem('lumina:other')).toBe('keep-me');
    expect(storage.getItem('unrelated')).toBe('keep-me-too');
  });
});

describe('存储不可用（禁用站点数据）', () => {
  it('读取 window.localStorage 抛 SecurityError 时降级为无存储', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get(): Storage {
        throw new DOMException('storage disabled', 'SecurityError');
      },
    });

    try {
      expect(() => loadData()).not.toThrow();
      expect(loadData().mood.current).toBe('neutral');
      expect(saveData(createDefaultData())).toBe(false);
      expect(() => clearData()).not.toThrow();
    } finally {
      if (original) {
        Object.defineProperty(window, 'localStorage', original);
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
    }
  });
});
