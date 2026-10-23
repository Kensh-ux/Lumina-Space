import { isTask, MOOD_IDS, STORAGE_KEY, THEME_KEY } from './types';
import type { AppDataV1, MoodId } from './types';

const BACKUP_KEY = `${STORAGE_KEY}:backup`;
const SCHEMA_VERSION = 1;

// 浏览器禁用站点数据时，读取 window.localStorage 本身就会抛 SecurityError。
// 所有入口先经过这里，拿不到就降级为「无存储」而不是崩在初始化。
function resolveStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidMoodId(value: unknown): value is MoodId {
  return typeof value === 'string' && (MOOD_IDS as readonly string[]).includes(value);
}

function isValidData(value: unknown): value is AppDataV1 {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== SCHEMA_VERSION) {
    return false;
  }
  if (!Array.isArray(data.tasks) || !data.tasks.every((task) => isTask(task))) {
    return false;
  }
  if (typeof data.mood !== 'object' || data.mood === null) {
    return false;
  }
  const mood = data.mood as Record<string, unknown>;
  return isValidMoodId(mood.current) && typeof mood.updatedAt === 'string';
}

function backupRaw(storage: Storage, raw: string): void {
  try {
    storage.setItem(BACKUP_KEY, raw);
  } catch {
    // 备份失败不影响主流程，静默忽略。
  }
}

export function createDefaultData(): AppDataV1 {
  return {
    schemaVersion: 1,
    tasks: [],
    mood: {
      current: 'neutral',
      updatedAt: new Date().toISOString(),
    },
  };
}

export function loadData(storage: Storage | null = resolveStorage()): AppDataV1 {
  if (!storage) {
    return createDefaultData();
  }
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return createDefaultData();
  }
  if (raw === null) {
    return createDefaultData();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValidData(parsed)) {
      return parsed;
    }
  } catch {
    // 解析失败走备份 + 默认值。
  }
  backupRaw(storage, raw);
  return createDefaultData();
}

export function saveData(data: AppDataV1, storage: Storage | null = resolveStorage()): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    // 首帧脚本只读这个镜像键，避免刷新时先闪一下默认主题。
    storage.setItem(THEME_KEY, data.mood.current);
    return true;
  } catch {
    return false;
  }
}

export function clearData(storage: Storage | null = resolveStorage()): void {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(THEME_KEY);
  } catch {
    // 删除失败时保持沉默，调用方不因存储异常崩溃。
  }
}
