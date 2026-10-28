import { toLocalDateString } from './date';
import {
  FOCUS_SESSION_LIMIT,
  MIN_FOCUS_SESSION_SECONDS,
  MOOD_LOG_LIMIT,
  type AppDataV1,
  type FocusSession,
  type MoodEntry,
  type MoodId,
} from './types';

let idCounter = 0;

function createEntryId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

// 同 mood 连续选择不刷屏；超过上限从头裁。
export function appendMoodLog(
  log: readonly MoodEntry[],
  mood: MoodId,
  now: Date = new Date(),
): MoodEntry[] {
  const last = log[log.length - 1];
  if (last && last.mood === mood) {
    return [...log];
  }
  const entry: MoodEntry = {
    id: createEntryId('mood'),
    mood,
    at: now.toISOString(),
  };
  return [...log, entry].slice(-MOOD_LOG_LIMIT);
}

// 只有完整的 >=60 秒专注才记录；cap 500。
export function addFocusSession(
  sessions: readonly FocusSession[],
  durationSec: number,
  now: Date = new Date(),
): FocusSession[] {
  if (!Number.isFinite(durationSec) || durationSec < MIN_FOCUS_SESSION_SECONDS) {
    return [...sessions];
  }
  const entry: FocusSession = {
    id: createEntryId('focus'),
    durationSec: Math.round(durationSec),
    completedAt: now.toISOString(),
  };
  return [...sessions, entry].slice(-FOCUS_SESSION_LIMIT);
}

export interface FocusStats {
  count: number;
  seconds: number;
}

function localDateOf(iso: string): string {
  return toLocalDateString(new Date(iso));
}

export function getTodayFocusStats(
  sessions: readonly FocusSession[],
  now: Date = new Date(),
): FocusStats {
  const today = toLocalDateString(now);
  let count = 0;
  let seconds = 0;
  for (const session of sessions) {
    if (localDateOf(session.completedAt) !== today) {
      continue;
    }
    count += 1;
    seconds += session.durationSec;
  }
  return { count, seconds };
}

export function getTotalFocusStats(sessions: readonly FocusSession[]): FocusStats {
  let count = 0;
  let seconds = 0;
  for (const session of sessions) {
    count += 1;
    seconds += session.durationSec;
  }
  return { count, seconds };
}

export function formatMinutes(minutes: number): string {
  const safe = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return hours === 0 ? `${rest} 分钟` : `${hours} 小时 ${rest} 分钟`;
}

export interface ExportResult {
  filename: string;
  json: string;
}

export function exportData(data: AppDataV1, now: Date = new Date()): ExportResult {
  const payload: AppDataV1 = {
    schemaVersion: 1,
    tasks: data.tasks,
    mood: data.mood,
    moodLog: data.moodLog ?? [],
    focusSessions: data.focusSessions ?? [],
    moodNotes: data.moodNotes ?? [],
    customBackgrounds: data.customBackgrounds ?? {},
  };
  return {
    filename: `lumina-space-${toLocalDateString(now)}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}
