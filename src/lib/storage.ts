import {
  FOCUS_SESSION_LIMIT,
  MIN_FOCUS_SESSION_SECONDS,
  MOOD_LOG_LIMIT,
  MOOD_NOTE_LIMIT,
  MOOD_IDS,
  normalizeMoodNote,
  normalizeTask,
  STORAGE_KEY,
  THEME_KEY,
} from './types';
import type { AppDataV1, FocusSession, MoodEntry, MoodId, MoodNote, Task } from './types';
import { normalizeCustomBackgrounds } from './customBackground';

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

// 旧数据缺字段 / 字段类型不对 → []；坏条目逐条丢弃，不触发整包 backup。
function normalizeMoodLog(value: unknown): MoodEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: MoodEntry[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== 'string' || entry.id.length === 0) {
      continue;
    }
    if (!isValidMoodId(entry.mood)) {
      continue;
    }
    if (typeof entry.at !== 'string' || Number.isNaN(Date.parse(entry.at))) {
      continue;
    }
    entries.push({ id: entry.id, mood: entry.mood, at: entry.at });
  }
  return entries.slice(-MOOD_LOG_LIMIT);
}

function normalizeFocusSessions(value: unknown): FocusSession[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const sessions: FocusSession[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const session = item as Record<string, unknown>;
    if (typeof session.id !== 'string' || session.id.length === 0) {
      continue;
    }
    if (
      typeof session.durationSec !== 'number' ||
      !Number.isFinite(session.durationSec) ||
      session.durationSec < MIN_FOCUS_SESSION_SECONDS
    ) {
      continue;
    }
    if (
      typeof session.completedAt !== 'string' ||
      Number.isNaN(Date.parse(session.completedAt))
    ) {
      continue;
    }
    sessions.push({
      id: session.id,
      durationSec: Math.round(session.durationSec),
      completedAt: session.completedAt,
    });
  }
  return sessions.slice(-FOCUS_SESSION_LIMIT);
}

// 旧数据缺 moodNotes / 字段不对 → []；坏条目逐条丢弃，保留好条目。
function normalizeMoodNotes(value: unknown): MoodNote[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const notes: MoodNote[] = [];
  for (const item of value) {
    const note = normalizeMoodNote(item);
    if (note) {
      notes.push(note);
    }
  }
  return notes.slice(-MOOD_NOTE_LIMIT);
}

// 核心字段坏 → null（走 backup+默认）；可选字段坏 → normalize 后保留 mood 与其它任务。
function normalizeData(value: unknown): AppDataV1 | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.tasks)) {
    return null;
  }
  const tasks = data.tasks.map((task) => normalizeTask(task));
  if (tasks.some((task) => task === null)) {
    return null;
  }
  const normalizedTasks = tasks as Task[];
  if (new Set(normalizedTasks.map((task) => task.id)).size !== normalizedTasks.length) {
    return null;
  }
  if (typeof data.mood !== 'object' || data.mood === null) {
    return null;
  }
  const mood = data.mood as Record<string, unknown>;
  if (!isValidMoodId(mood.current) || typeof mood.updatedAt !== 'string') {
    return null;
  }
  return {
    schemaVersion: 1,
    tasks: normalizedTasks,
    mood: {
      current: mood.current,
      updatedAt: mood.updatedAt,
    },
    moodLog: normalizeMoodLog(data.moodLog),
    focusSessions: normalizeFocusSessions(data.focusSessions),
    moodNotes: normalizeMoodNotes(data.moodNotes),
    customBackgrounds: normalizeCustomBackgrounds(data.customBackgrounds),
  };
}

// v0.1/v0.2 写下的数据还没有 tasks 字段：迁移为空数组并保留情绪，不走 backup/默认值。
function migrateMissingTasks(value: unknown): AppDataV1 | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== SCHEMA_VERSION || data.tasks !== undefined) {
    return null;
  }
  if (typeof data.mood !== 'object' || data.mood === null) {
    return null;
  }
  const mood = data.mood as Record<string, unknown>;
  if (!isValidMoodId(mood.current) || typeof mood.updatedAt !== 'string') {
    return null;
  }
  return {
    schemaVersion: 1,
    tasks: [],
    mood: {
      current: mood.current,
      updatedAt: mood.updatedAt,
    },
    moodLog: [],
    focusSessions: [],
    moodNotes: [],
    customBackgrounds: {},
  };
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
    moodLog: [],
    focusSessions: [],
    moodNotes: [],
    customBackgrounds: {},
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
    const normalized = normalizeData(parsed);
    if (normalized) {
      return normalized;
    }
    const migrated = migrateMissingTasks(parsed);
    if (migrated) {
      return migrated;
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
    storage.removeItem(BACKUP_KEY);
  } catch {
    // 删除失败时保持沉默，调用方不因存储异常崩溃。
  }
}
