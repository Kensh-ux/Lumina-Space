import { MOOD_IDS, type MoodId } from '../../lib/types';

export type { MoodId } from '../../lib/types';

export interface MoodMeta {
  id: MoodId;
  label: string;
  emoji: string;
  description: string;
}

export const MOODS: readonly MoodMeta[] = [
  { id: 'positive', label: '积极', emoji: '☀️', description: '明亮、温暖' },
  { id: 'neutral', label: '中性', emoji: '🌤️', description: '平稳、安静' },
  { id: 'negative', label: '消极', emoji: '🌧️', description: '低饱和、安静' },
] as const;

export const DEFAULT_MOOD: MoodId = 'neutral';

export function isMoodId(value: unknown): value is MoodId {
  return typeof value === 'string' && (MOOD_IDS as readonly string[]).includes(value);
}

export function getMoodMeta(id: MoodId): MoodMeta {
  const found = MOODS.find((m) => m.id === id);
  return found ?? MOODS[1];
}
