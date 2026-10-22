export type MoodId = 'positive' | 'neutral' | 'negative';

export const MOOD_IDS: readonly MoodId[] = ['positive', 'neutral', 'negative'];

export const STORAGE_KEY = 'lumina:data';
export const THEME_KEY = 'lumina:theme';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface AppDataV1 {
  schemaVersion: 1;
  tasks: Task[];
  mood: {
    current: MoodId;
    updatedAt: string;
  };
}
