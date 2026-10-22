import { useCallback, useEffect, useState } from 'react';
import type { AppDataV1, MoodId } from '../../lib/types';
import { loadData, saveData } from '../../lib/storage';
import { isMoodId } from './mood';

export interface UseMoodResult {
  mood: MoodId;
  setMood: (next: MoodId) => void;
  storageError: boolean;
}

// 仅开发/截图使用：?theme=positive 只改 data-theme，不写入存储，生产构建不生效。
function readPreviewMood(): MoodId | null {
  if (!import.meta.env.DEV) {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get('theme');
  return isMoodId(value) ? value : null;
}

export function useMood(): UseMoodResult {
  const [data, setData] = useState<AppDataV1>(() => loadData());
  const [preview, setPreview] = useState<MoodId | null>(readPreviewMood);
  const [storageError, setStorageError] = useState(false);

  const mood = preview ?? data.mood.current;

  useEffect(() => {
    document.documentElement.dataset.theme = mood;
  }, [mood]);

  useEffect(() => {
    if (preview) {
      return;
    }
    setStorageError(!saveData(data));
  }, [data, preview]);

  const setMood = useCallback((next: MoodId) => {
    setPreview(null);
    setData((prev) => ({
      ...prev,
      mood: {
        current: next,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  return { mood, setMood, storageError };
}
