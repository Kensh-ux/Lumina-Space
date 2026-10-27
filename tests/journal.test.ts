import { describe, expect, it } from 'vitest';
import {
  clampMoodScore,
  createMoodNote,
  formatMoodNoteDate,
  formatMoodScore,
  isMoodNote,
  MOOD_EMOTIONS,
  MOOD_NOTE_CONTENT_MAX_LENGTH,
  MOOD_NOTE_EMOTION_MAX_LENGTH,
  MOOD_NOTE_SCORE_MAX,
  MOOD_NOTE_SCORE_MIN,
  parseMoodScore,
  sortMoodNotes,
} from '../src/features/journal/journal';
import type { MoodNote } from '../src/lib/types';

const NOW = new Date(2026, 9, 27, 20, 5);

function makeNote(overrides: Partial<MoodNote> = {}): MoodNote {
  return {
    id: 'note-1',
    emotion: '期待',
    content: '明天去图书馆',
    score: 10,
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

describe('MOOD_EMOTIONS', () => {
  it('内置 22 个词，顺序固定且不重复', () => {
    expect(MOOD_EMOTIONS).toHaveLength(22);
    expect(MOOD_EMOTIONS).toEqual([
      '期待',
      '喜悦',
      '自豪',
      '感动',
      '满足',
      '安心',
      '怀念',
      '焦虑',
      '害怕',
      '生气',
      '羡慕',
      '失落',
      '委屈',
      '孤独',
      '疲惫',
      '愧疚',
      '自卑',
      '迷茫',
      '压抑',
      '无聊',
      '纠结',
      '尴尬',
    ]);
    expect(new Set(MOOD_EMOTIONS).size).toBe(22);
  });
});

describe('createMoodNote', () => {
  it('trim 情绪与描述，生成 id / createdAt', () => {
    const note = createMoodNote({ emotion: '  喜悦  ', content: '  考完试  ', score: 12 }, NOW);

    expect(note).toMatchObject({
      emotion: '喜悦',
      content: '考完试',
      score: 12,
      createdAt: NOW.toISOString(),
    });
    expect(note?.id.length).toBeGreaterThan(0);
  });

  it('情绪或描述为空返回 null', () => {
    expect(createMoodNote({ emotion: '   ', content: '有事', score: 0 }, NOW)).toBeNull();
    expect(createMoodNote({ emotion: '喜悦', content: '   ', score: 0 }, NOW)).toBeNull();
  });

  it('分数钳制在 -724 ~ 597（含两端）', () => {
    expect(createMoodNote({ emotion: '喜悦', content: '事', score: -724 }, NOW)?.score).toBe(
      -724,
    );
    expect(createMoodNote({ emotion: '喜悦', content: '事', score: 597 }, NOW)?.score).toBe(597);
    expect(createMoodNote({ emotion: '喜悦', content: '事', score: 999 }, NOW)?.score).toBe(597);
    expect(createMoodNote({ emotion: '喜悦', content: '事', score: -999 }, NOW)?.score).toBe(-724);
    expect(createMoodNote({ emotion: '喜悦', content: '事', score: 12.6 }, NOW)?.score).toBe(13);
    expect(
      createMoodNote({ emotion: '喜悦', content: '事', score: Number.NaN }, NOW)?.score,
    ).toBe(0);
  });

  it('自定义情绪最多 16 字，描述最多 500 字', () => {
    const note = createMoodNote(
      {
        emotion: '情'.repeat(MOOD_NOTE_EMOTION_MAX_LENGTH + 5),
        content: '事'.repeat(MOOD_NOTE_CONTENT_MAX_LENGTH + 20),
        score: 0,
      },
      NOW,
    );

    expect(note?.emotion).toHaveLength(MOOD_NOTE_EMOTION_MAX_LENGTH);
    expect(note?.content).toHaveLength(MOOD_NOTE_CONTENT_MAX_LENGTH);
  });

  it('生成唯一 id', () => {
    const first = createMoodNote({ emotion: '喜悦', content: '一', score: 0 }, NOW);
    const second = createMoodNote({ emotion: '喜悦', content: '二', score: 0 }, NOW);
    expect(first?.id).not.toBe(second?.id);
  });
});

describe('sortMoodNotes', () => {
  it('最新的在最上面', () => {
    const older = makeNote({ id: 'older', createdAt: new Date(2026, 9, 26, 9).toISOString() });
    const newer = makeNote({ id: 'newer', createdAt: new Date(2026, 9, 27, 9).toISOString() });

    expect(sortMoodNotes([older, newer]).map((note) => note.id)).toEqual(['newer', 'older']);
  });

  it('createdAt 相同时保持原顺序，不修改原数组', () => {
    const first = makeNote({ id: 'first' });
    const second = makeNote({ id: 'second' });
    const notes = [first, second];

    const sorted = sortMoodNotes(notes);

    expect(sorted.map((note) => note.id)).toEqual(['first', 'second']);
    expect(sorted).not.toBe(notes);
    expect(notes.map((note) => note.id)).toEqual(['first', 'second']);
  });
});

describe('分数解析与展示', () => {
  it('parseMoodScore：空 / 非数字按 0，越界钳制', () => {
    expect(parseMoodScore('')).toBe(0);
    expect(parseMoodScore('   ')).toBe(0);
    expect(parseMoodScore('abc')).toBe(0);
    expect(parseMoodScore('12')).toBe(12);
    expect(parseMoodScore('-12')).toBe(-12);
    expect(parseMoodScore('999')).toBe(MOOD_NOTE_SCORE_MAX);
    expect(parseMoodScore('-999')).toBe(MOOD_NOTE_SCORE_MIN);
  });

  it('clampMoodScore：非有限值按 0，四舍五入', () => {
    expect(clampMoodScore(Number.NaN)).toBe(0);
    expect(clampMoodScore(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampMoodScore(12.4)).toBe(12);
    expect(clampMoodScore(12.6)).toBe(13);
  });

  it('formatMoodScore 带正负号', () => {
    expect(formatMoodScore(12)).toBe('+12');
    expect(formatMoodScore(0)).toBe('0');
    expect(formatMoodScore(-3)).toBe('-3');
  });
});

describe('formatMoodNoteDate', () => {
  it('输出本地 YYYY-MM-DD HH:mm', () => {
    expect(formatMoodNoteDate(NOW.toISOString())).toBe('2026-10-27 20:05');
  });

  it('非法日期返回空串', () => {
    expect(formatMoodNoteDate('not-a-date')).toBe('');
  });
});

describe('isMoodNote', () => {
  it('接受完整记录，拒绝缺字段 / 空描述', () => {
    expect(isMoodNote(makeNote())).toBe(true);
    expect(isMoodNote({ ...makeNote(), id: '' })).toBe(false);
    expect(isMoodNote({ ...makeNote(), emotion: '   ' })).toBe(false);
    expect(isMoodNote({ ...makeNote(), content: '   ' })).toBe(false);
    expect(isMoodNote({ ...makeNote(), score: '10' })).toBe(false);
    expect(isMoodNote({ ...makeNote(), createdAt: 'nope' })).toBe(false);
  });
});
