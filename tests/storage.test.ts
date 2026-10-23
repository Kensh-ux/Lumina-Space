import { beforeEach, describe, expect, it } from 'vitest';
import { clearData, createDefaultData, loadData, saveData } from '../src/lib/storage';

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
  it('删除 lumina:data 与主题镜像键，不动其他键', () => {
    storage.setItem(KEY, JSON.stringify(createDefaultData()));
    storage.setItem(THEME_KEY, 'negative');
    storage.setItem('lumina:other', 'keep-me');
    storage.setItem('unrelated', 'keep-me-too');

    clearData(storage);

    expect(storage.getItem(KEY)).toBeNull();
    expect(storage.getItem(THEME_KEY)).toBeNull();
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
