import {
  clampMoodScore,
  MOOD_NOTE_CONTENT_MAX_LENGTH,
  MOOD_NOTE_EMOTION_MAX_LENGTH,
  normalizeMoodNote,
} from '../../lib/types';
import type { MoodNote } from '../../lib/types';
import { toLocalDateString } from '../../lib/date';

export {
  clampMoodScore,
  MOOD_NOTE_CONTENT_MAX_LENGTH,
  MOOD_NOTE_EMOTION_MAX_LENGTH,
  MOOD_NOTE_LIMIT,
  MOOD_NOTE_SCORE_MAX,
  MOOD_NOTE_SCORE_MIN,
} from '../../lib/types';

// 顺序固定：界面直接照这个顺序渲染，测试也按它断言。
export const MOOD_EMOTIONS: readonly string[] = [
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
];

export interface MoodNoteInput {
  emotion: string;
  content: string;
  score: number;
}

let idCounter = 0;

function createNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `mood-note-${Date.now()}-${idCounter}`;
}

function sliceChars(value: string, max: number): string {
  return Array.from(value).slice(0, max).join('');
}

// 创建 / 编辑共用的字段校验：trim、截断、分数钳制；空情绪或空描述返回 null。
function normalizeInput(input: MoodNoteInput): MoodNoteInput | null {
  const emotion = sliceChars(input.emotion.trim(), MOOD_NOTE_EMOTION_MAX_LENGTH);
  const content = sliceChars(input.content.trim(), MOOD_NOTE_CONTENT_MAX_LENGTH);
  if (emotion.length === 0 || content.length === 0) {
    return null;
  }
  return { emotion, content, score: clampMoodScore(input.score) };
}

// 情绪 / 描述为空返回 null；自定义情绪最多 16 字，描述最多 500 字，好感值钳在 -724~597。
export function createMoodNote(input: MoodNoteInput, now: Date = new Date()): MoodNote | null {
  const normalized = normalizeInput(input);
  if (!normalized) {
    return null;
  }
  return {
    id: createNoteId(),
    ...normalized,
    createdAt: now.toISOString(),
  };
}

// 只改 emotion / content / score，保留原 id 与 createdAt；输入无效时返回原数组副本。
export function updateMoodNote(
  notes: readonly MoodNote[],
  id: string,
  input: MoodNoteInput,
): MoodNote[] {
  const normalized = normalizeInput(input);
  if (!normalized) {
    return [...notes];
  }
  return notes.map((note) => (note.id === id ? { ...note, ...normalized } : note));
}

export function deleteMoodNote(notes: readonly MoodNote[], id: string): MoodNote[] {
  return notes.filter((note) => note.id !== id);
}

// 情绪词 + 描述的子串匹配；trim 且大小写不敏感。空查询返回原数组副本。
export function filterMoodNotes(notes: readonly MoodNote[], query: string): MoodNote[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length === 0) {
    return [...notes];
  }
  return notes.filter(
    (note) =>
      note.emotion.toLocaleLowerCase().includes(needle) ||
      note.content.toLocaleLowerCase().includes(needle),
  );
}

// 指定日期置顶：该天记录整体提前（同天仍最新在前），其余保持普通排序的相对顺序。
// 无置顶日期 / 该天没有记录时，顺序与普通排序完全一致。
export function arrangeMoodNotes(
  notes: readonly MoodNote[],
  pinnedDate: string | null = null,
): MoodNote[] {
  const sorted = sortMoodNotes(notes);
  const target = pinnedDate?.trim() ?? '';
  if (target.length === 0) {
    return sorted;
  }
  const pinned: MoodNote[] = [];
  const rest: MoodNote[] = [];
  for (const note of sorted) {
    if (toLocalDateString(new Date(note.createdAt)) === target) {
      pinned.push(note);
    } else {
      rest.push(note);
    }
  }
  return [...pinned, ...rest];
}

const DELETE_PREVIEW_LENGTH = 20;

// 删除确认正文：情绪 · 描述前 20 字；短内容不加省略号。
export function buildMoodNoteDeleteMessage(note: MoodNote): string {
  const chars = Array.from(note.content);
  const preview = chars.slice(0, DELETE_PREVIEW_LENGTH).join('');
  const ellipsis = chars.length > DELETE_PREVIEW_LENGTH ? '…' : '';
  return `「${note.emotion} · ${preview}${ellipsis}」删除后无法恢复。`;
}

// 最新的在最上面；createdAt 相同时保持原数组顺序。
export function sortMoodNotes(notes: readonly MoodNote[]): MoodNote[] {
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function isMoodNote(value: unknown): value is MoodNote {
  return normalizeMoodNote(value) !== null;
}

// 单个数字的输入钳制：空串 / 非数字按 0，小数四舍五入。
export function parseMoodScore(input: string): number {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return 0;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? clampMoodScore(value) : 0;
}

export function formatMoodScore(score: number): string {
  const safe = clampMoodScore(score);
  return safe > 0 ? `+${safe}` : String(safe);
}

export function formatMoodNoteDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
}
