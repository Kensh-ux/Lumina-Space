import { describe, expect, it } from 'vitest';
import {
  addFocusSession,
  appendMoodLog,
  exportData,
  formatMinutes,
  getTodayFocusStats,
  getTotalFocusStats,
} from '../src/lib/data';
import type { AppDataV1, FocusSession, MoodEntry, MoodNote } from '../src/lib/types';

const NOW = new Date(2026, 9, 24, 15, 30);

function moodEntry(mood: MoodEntry['mood'], at: Date, id = `mood-${at.getTime()}`): MoodEntry {
  return { id, mood, at: at.toISOString() };
}

function focusSession(durationSec: number, at: Date, id = `focus-${at.getTime()}`): FocusSession {
  return { id, durationSec, completedAt: at.toISOString() };
}

function moodNote(content: string, at: Date): MoodNote {
  return {
    id: `note-${at.getTime()}`,
    emotion: '期待',
    content,
    score: 12,
    createdAt: at.toISOString(),
  };
}

function at(year: number, month: number, day: number, hour = 10): Date {
  return new Date(year, month - 1, day, hour);
}

describe('appendMoodLog', () => {
  it('不同 mood 追加一条，不修改原数组', () => {
    const log = [moodEntry('neutral', at(2026, 10, 23))];
    const next = appendMoodLog(log, 'positive', NOW);

    expect(next).toHaveLength(2);
    expect(next[1].mood).toBe('positive');
    expect(next[1].at).toBe(NOW.toISOString());
    expect(next[1].id.length).toBeGreaterThan(0);
    expect(log).toHaveLength(1);
  });

  it('与上一条相同 mood 不重复追加', () => {
    const log = [moodEntry('positive', at(2026, 10, 23))];
    const next = appendMoodLog(log, 'positive', NOW);

    expect(next).toHaveLength(1);
    expect(next[0]).toBe(log[0]);
  });

  it('超过 365 条时从头部裁剪', () => {
    const log = Array.from({ length: 365 }, (_, index) =>
      moodEntry(index % 2 === 0 ? 'positive' : 'negative', new Date(NOW.getTime() - (365 - index) * 60_000)),
    );
    expect(log[log.length - 1].mood).toBe('positive');

    const next = appendMoodLog(log, 'neutral', NOW);

    expect(next).toHaveLength(365);
    expect(next[0]).toBe(log[1]);
    expect(next[next.length - 1].mood).toBe('neutral');
  });
});

describe('addFocusSession', () => {
  it('>=60 秒记录，向上取整到秒', () => {
    const sessions = addFocusSession([], 90, NOW);

    expect(sessions).toHaveLength(1);
    expect(sessions[0].durationSec).toBe(90);
    expect(sessions[0].completedAt).toBe(NOW.toISOString());
    expect(sessions[0].id.length).toBeGreaterThan(0);
  });

  it('<60 秒忽略', () => {
    expect(addFocusSession([], 59, NOW)).toHaveLength(0);
    expect(addFocusSession([], 0, NOW)).toHaveLength(0);
  });

  it('超过 500 条时从头部裁剪', () => {
    const sessions = Array.from({ length: 500 }, (_, index) =>
      focusSession(60, new Date(NOW.getTime() - (500 - index) * 60_000)),
    );

    const next = addFocusSession(sessions, 60, NOW);

    expect(next).toHaveLength(500);
    expect(next[0]).toBe(sessions[1]);
    expect(next[next.length - 1].completedAt).toBe(NOW.toISOString());
  });
});

describe('专注统计', () => {
  it('getTodayFocusStats 只统计本地今天', () => {
    const sessions = [
      focusSession(60, at(2026, 10, 24, 9)),
      focusSession(120, at(2026, 10, 24, 14)),
      focusSession(300, at(2026, 10, 23, 23)),
    ];

    expect(getTodayFocusStats(sessions, NOW)).toEqual({ count: 2, seconds: 180 });
  });

  it('getTotalFocusStats 累计全部专注记录，不受日期限制', () => {
    const sessions = [
      focusSession(60, at(2026, 10, 19, 8)),
      focusSession(120, at(2026, 10, 24, 9)),
      focusSession(300, at(2025, 1, 1, 23)),
    ];

    expect(getTotalFocusStats(sessions)).toEqual({ count: 3, seconds: 480 });
  });

  it('空数组返回 0', () => {
    expect(getTodayFocusStats([], NOW)).toEqual({ count: 0, seconds: 0 });
    expect(getTotalFocusStats([])).toEqual({ count: 0, seconds: 0 });
  });
});

describe('formatMinutes', () => {
  it('0 / 1 / 59 / 60 / 61 / 125', () => {
    expect(formatMinutes(0)).toBe('0 分钟');
    expect(formatMinutes(1)).toBe('1 分钟');
    expect(formatMinutes(59)).toBe('59 分钟');
    expect(formatMinutes(60)).toBe('1 小时 0 分钟');
    expect(formatMinutes(61)).toBe('1 小时 1 分钟');
    expect(formatMinutes(125)).toBe('2 小时 5 分钟');
  });
});

describe('exportData', () => {
  it('返回可 parse 的 JSON 与日期文件名，包含新增字段', () => {
    const data: AppDataV1 = {
      schemaVersion: 1,
      tasks: [],
      mood: { current: 'negative', updatedAt: NOW.toISOString() },
      moodLog: [moodEntry('negative', NOW)],
      focusSessions: [focusSession(60, NOW)],
      moodNotes: [{ ...moodNote('记一笔', NOW), updatedAt: NOW.toISOString() }],
      customBackgrounds: { positive: 'data:image/jpeg;base64,AAAA' },
    };

    const { filename, json } = exportData(data, NOW);
    const parsed = JSON.parse(json);

    expect(filename).toBe('lumina-space-2026-10-24.json');
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.mood.current).toBe('negative');
    expect(parsed.moodLog).toHaveLength(1);
    expect(parsed.focusSessions).toHaveLength(1);
    expect(parsed.moodNotes).toHaveLength(1);
    expect(parsed.moodNotes[0].content).toBe('记一笔');
    expect(parsed.moodNotes[0].updatedAt).toBe(NOW.toISOString());
    expect(parsed.customBackgrounds).toEqual({ positive: 'data:image/jpeg;base64,AAAA' });
    expect(parsed.backup).toBeUndefined();
  });

  it('缺少 moodLog / focusSessions / moodNotes 时导出空数组', () => {
    const data: AppDataV1 = {
      schemaVersion: 1,
      tasks: [],
      mood: { current: 'neutral', updatedAt: NOW.toISOString() },
    };

    const parsed = JSON.parse(exportData(data, NOW).json);

    expect(parsed.moodLog).toEqual([]);
    expect(parsed.focusSessions).toEqual([]);
    expect(parsed.moodNotes).toEqual([]);
    expect(parsed.customBackgrounds).toEqual({});
  });
});
