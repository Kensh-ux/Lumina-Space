import {
  clampMoodScore,
  MOOD_NOTE_CONTENT_MAX_LENGTH,
  MOOD_NOTE_EMOTION_MAX_LENGTH,
  normalizeMoodNote,
} from '../../lib/types';
import type { MoodNote } from '../../lib/types';

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

// 情绪 / 描述为空返回 null；自定义情绪最多 16 字，描述最多 500 字，好感值钳在 -724~597。
export function createMoodNote(input: MoodNoteInput, now: Date = new Date()): MoodNote | null {
  const emotion = sliceChars(input.emotion.trim(), MOOD_NOTE_EMOTION_MAX_LENGTH);
  const content = sliceChars(input.content.trim(), MOOD_NOTE_CONTENT_MAX_LENGTH);
  if (emotion.length === 0 || content.length === 0) {
    return null;
  }
  return {
    id: createNoteId(),
    emotion,
    content,
    score: clampMoodScore(input.score),
    createdAt: now.toISOString(),
  };
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
