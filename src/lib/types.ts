export type MoodId = 'positive' | 'neutral' | 'negative';

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
