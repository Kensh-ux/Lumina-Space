import { useCallback, useEffect, useState } from 'react';
import type { AppDataV1, FocusSession, MoodEntry, MoodId, Task } from '../lib/types';
import { clearData, createDefaultData, loadData, saveData } from '../lib/storage';
import {
  addFocusSession,
  appendMoodLog,
  exportData as buildExportData,
  type ExportResult,
} from '../lib/data';
import {
  addTask as addTaskToTasks,
  clearCompleted as clearCompletedFromTasks,
  deleteTask as deleteTaskFromTasks,
  toggleTask as toggleTaskInTasks,
  updateTask as updateTaskInTasks,
  type TaskPatch,
} from '../features/tasks/task';
import { isMoodId } from '../features/mood/mood';

export interface UseAppDataResult {
  mood: MoodId;
  tasks: Task[];
  moodLog: MoodEntry[];
  focusSessions: FocusSession[];
  setMood: (next: MoodId) => void;
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, patch: TaskPatch) => void;
  clearCompletedTasks: () => void;
  recordFocusSession: (durationSec: number) => void;
  exportData: () => ExportResult;
  clearAppData: () => void;
  storageError: boolean;
}

// 仅开发/截图使用：?theme=positive 只改显示的主题，不写入存储，生产构建不生效。
function readPreviewMood(): MoodId | null {
  if (!import.meta.env.DEV) {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get('theme');
  return isMoodId(value) ? value : null;
}

export function useAppData(): UseAppDataResult {
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
    setData((prev) => {
      const changed = prev.mood.current !== next;
      return {
        ...prev,
        mood: {
          current: next,
          updatedAt: new Date().toISOString(),
        },
        moodLog: changed ? appendMoodLog(prev.moodLog ?? [], next) : prev.moodLog,
      };
    });
  }, []);

  const addTask = useCallback((title: string) => {
    setData((prev) => ({ ...prev, tasks: addTaskToTasks(prev.tasks, title) }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setData((prev) => ({ ...prev, tasks: toggleTaskInTasks(prev.tasks, id) }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setData((prev) => ({ ...prev, tasks: deleteTaskFromTasks(prev.tasks, id) }));
  }, []);

  const updateTask = useCallback((id: string, patch: TaskPatch) => {
    setData((prev) => ({ ...prev, tasks: updateTaskInTasks(prev.tasks, id, patch) }));
  }, []);

  const clearCompletedTasks = useCallback(() => {
    setData((prev) => ({ ...prev, tasks: clearCompletedFromTasks(prev.tasks) }));
  }, []);

  const recordFocusSession = useCallback((durationSec: number) => {
    setData((prev) => ({
      ...prev,
      focusSessions: addFocusSession(prev.focusSessions ?? [], durationSec),
    }));
  }, []);

  const exportData = useCallback(() => buildExportData(data), [data]);

  // 真正清掉 lumina:data / lumina:theme，再以默认数据重新起一份（不会把旧数据写回）。
  const clearAppData = useCallback(() => {
    clearData();
    setPreview(null);
    setData(createDefaultData());
  }, []);

  return {
    mood,
    tasks: data.tasks,
    moodLog: data.moodLog ?? [],
    focusSessions: data.focusSessions ?? [],
    setMood,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    clearCompletedTasks,
    recordFocusSession,
    exportData,
    clearAppData,
    storageError,
  };
}
