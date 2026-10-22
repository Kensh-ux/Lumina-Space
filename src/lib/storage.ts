import type { AppDataV1, MoodId } from './types';

const KEY = 'lumina:data';
const BACKUP_KEY = 'lumina:data:backup';
const SCHEMA_VERSION = 1;

// 只校验存储层的领域值；情绪元数据属于 features/mood，lib 不反向依赖它。
function isValidMoodId(value: unknown): value is MoodId {
  return value === 'positive' || value === 'neutral' || value === 'negative';
}

function isValidData(value: unknown): value is AppDataV1 {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== SCHEMA_VERSION) {
    return false;
  }
  if (!Array.isArray(data.tasks)) {
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

export function loadData(storage: Storage = localStorage): AppDataV1 {
  let raw: string | null = null;
  try {
    raw = storage.getItem(KEY);
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

export function saveData(data: AppDataV1, storage: Storage = localStorage): boolean {
  try {
    storage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearData(storage: Storage = localStorage): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // 删除失败时保持沉默，调用方不因存储异常崩溃。
  }
}
