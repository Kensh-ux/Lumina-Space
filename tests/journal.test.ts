import { describe, expect, it } from 'vitest';
import {
  arrangeMoodNotes,
  buildMoodNoteDeleteMessage,
  clampMoodScore,
  createMoodNote,
  deleteMoodNote,
  filterMoodNotes,
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
  updateMoodNote,
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

describe('updateMoodNote', () => {
  it('只改目标记录，保留 id 与 createdAt，并 trim / 钳制', () => {
    const note = makeNote({
      id: 'target',
      emotion: '期待',
      content: '旧描述',
      score: 10,
      createdAt: '2026-10-12T08:00:00.000Z',
    });
    const other = makeNote({ id: 'other', content: '别的' });

    const firstEdit = new Date(2026, 9, 27, 20, 30);
    const next = updateMoodNote(
      [note, other],
      'target',
      {
        emotion: '  喜悦  ',
        content: '  新描述  ',
        score: 999,
      },
      firstEdit,
    );

    expect(next[0]).toEqual({
      id: 'target',
      emotion: '喜悦',
      content: '新描述',
      score: 597,
      createdAt: '2026-10-12T08:00:00.000Z',
      updatedAt: firstEdit.toISOString(),
    });
    expect(next[1]).toBe(other);
    expect(note.emotion).toBe('期待');
    expect(note.content).toBe('旧描述');
  });

  it('空情绪 / 空描述忽略，返回原数组副本', () => {
    const notes = [makeNote()];

    const next = updateMoodNote(notes, 'note-1', { emotion: '   ', content: '有事', score: 0 });

    expect(next).toEqual(notes);
    expect(next).not.toBe(notes);
  });

  it('未知 id 原样保留', () => {
    const notes = [makeNote()];

    expect(
      updateMoodNote(notes, 'missing', { emotion: '喜悦', content: '事', score: 0 }),
    ).toEqual(notes);
  });

  it('首次编辑写入 updatedAt，保留原 id / createdAt', () => {
    const original = makeNote({ id: 'first', createdAt: '2026-10-01T08:00:00.000Z' });

    const next = updateMoodNote(
      [original],
      'first',
      { emotion: '喜悦', content: '改好了', score: 5 },
      new Date(2026, 9, 27, 21, 0),
    );

    expect(next[0].id).toBe('first');
    expect(next[0].createdAt).toBe('2026-10-01T08:00:00.000Z');
    expect(next[0].updatedAt).toBe(new Date(2026, 9, 27, 21, 0).toISOString());
    expect(original.updatedAt).toBeUndefined();
  });

  it('再次编辑更新时间，createdAt 仍不变', () => {
    const firstEdit = new Date(2026, 9, 27, 20, 0);
    const secondEdit = new Date(2026, 9, 28, 9, 15);
    const first = updateMoodNote(
      [makeNote({ createdAt: '2026-10-01T08:00:00.000Z' })],
      'note-1',
      { emotion: '期待', content: '第一次编辑', score: 1 },
      firstEdit,
    );

    const second = updateMoodNote(
      first,
      'note-1',
      { emotion: '期待', content: '第二次编辑', score: 2 },
      secondEdit,
    );

    expect(second[0].updatedAt).toBe(secondEdit.toISOString());
    expect(second[0].createdAt).toBe('2026-10-01T08:00:00.000Z');
  });

  it('输入无效时不写 updatedAt', () => {
    const original = makeNote();
    const next = updateMoodNote(
      [original],
      'note-1',
      { emotion: '  ', content: '无效', score: 0 },
      new Date(2026, 9, 27, 22, 0),
    );

    expect(next[0].updatedAt).toBeUndefined();
  });
});

describe('deleteMoodNote', () => {
  it('只删除目标记录，不修改原数组', () => {
    const keep = makeNote({ id: 'keep' });
    const remove = makeNote({ id: 'remove' });
    const notes = [keep, remove];

    const next = deleteMoodNote(notes, 'remove');

    expect(next.map((note) => note.id)).toEqual(['keep']);
    expect(next).not.toBe(notes);
    expect(notes).toHaveLength(2);
  });
});

describe('filterMoodNotes', () => {
  const notes = [
    makeNote({ id: 'english', emotion: 'Happy', content: 'Review Math' }),
    makeNote({ id: 'chinese', emotion: '焦虑', content: '明天考试' }),
  ];

  it('空查询返回全部（新数组）', () => {
    const next = filterMoodNotes(notes, '   ');

    expect(next).toHaveLength(2);
    expect(next).not.toBe(notes);
  });

  it('trim 且大小写不敏感，情绪与描述都能命中', () => {
    expect(filterMoodNotes(notes, '  happy ').map((note) => note.id)).toEqual(['english']);
    expect(filterMoodNotes(notes, ' REVIEW ').map((note) => note.id)).toEqual(['english']);
    expect(filterMoodNotes(notes, '考试').map((note) => note.id)).toEqual(['chinese']);
  });

  it('无匹配返回空数组', () => {
    expect(filterMoodNotes(notes, '不存在')).toEqual([]);
  });
});

describe('arrangeMoodNotes', () => {
  const earlier = makeNote({
    id: '12-am',
    createdAt: new Date(2026, 9, 12, 9).toISOString(),
  });
  const later = makeNote({
    id: '12-pm',
    createdAt: new Date(2026, 9, 12, 21).toISOString(),
  });
  const nextDay = makeNote({
    id: '13',
    createdAt: new Date(2026, 9, 13, 9).toISOString(),
  });
  const prevDay = makeNote({
    id: '11',
    createdAt: new Date(2026, 9, 11, 9).toISOString(),
  });
  const notes = [earlier, later, nextDay, prevDay];

  it('无置顶时按最新在前', () => {
    expect(arrangeMoodNotes(notes).map((note) => note.id)).toEqual([
      '13',
      '12-pm',
      '12-am',
      '11',
    ]);
    expect(arrangeMoodNotes(notes, '').map((note) => note.id)).toEqual([
      '13',
      '12-pm',
      '12-am',
      '11',
    ]);
  });

  it('置顶日整体提前，同一天仍最新在前，其余保持相对顺序', () => {
    expect(arrangeMoodNotes(notes, '2026-10-12').map((note) => note.id)).toEqual([
      '12-pm',
      '12-am',
      '13',
      '11',
    ]);
  });

  it('置顶日没有记录时顺序完全不变', () => {
    expect(arrangeMoodNotes(notes, '2026-10-10').map((note) => note.id)).toEqual([
      '13',
      '12-pm',
      '12-am',
      '11',
    ]);
  });

  it('按本地日期置顶：UTC 日期与本地日期不同时命中正确的一天', () => {
    // 上海本地 2026-10-13 01:30，而 UTC 日期仍是 10-12。
    const afterMidnightLocal = makeNote({
      id: 'local-13',
      createdAt: '2026-10-12T17:30:00.000Z',
    });
    // 上海本地 2026-10-14 01:30，而 UTC 日期是 10-13。
    const nextLocalDay = makeNote({
      id: 'local-14',
      createdAt: '2026-10-13T17:30:00.000Z',
    });
    const pair = [afterMidnightLocal, nextLocalDay];

    // 普通排序按 createdAt：local-14 更新，排前面。
    expect(arrangeMoodNotes(pair).map((note) => note.id)).toEqual(['local-14', 'local-13']);
    // 置顶本地 10-13：local-13 必须被分到 pinned 组并排到最前（误用 UTC 日期会失败）。
    expect(arrangeMoodNotes(pair, '2026-10-13').map((note) => note.id)).toEqual([
      'local-13',
      'local-14',
    ]);
  });

  it('不修改原数组', () => {
    const ids = notes.map((note) => note.id);

    arrangeMoodNotes(notes, '2026-10-12');

    expect(notes.map((note) => note.id)).toEqual(ids);
  });
});

describe('buildMoodNoteDeleteMessage', () => {
  it('短内容不加省略号', () => {
    const note = makeNote({ emotion: '喜悦', content: '考完试' });

    expect(buildMoodNoteDeleteMessage(note)).toBe('「喜悦 · 考完试」删除后无法恢复。');
  });

  it('超过 20 字截断并加省略号', () => {
    const note = makeNote({ emotion: '焦虑', content: '一'.repeat(21) });

    expect(buildMoodNoteDeleteMessage(note)).toBe(
      `「焦虑 · ${'一'.repeat(20)}…」删除后无法恢复。`,
    );
  });

  it('正好 20 字不加省略号', () => {
    const note = makeNote({ emotion: '焦虑', content: '一'.repeat(20) });

    expect(buildMoodNoteDeleteMessage(note)).toBe(
      `「焦虑 · ${'一'.repeat(20)}」删除后无法恢复。`,
    );
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
