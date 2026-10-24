import type { FocusSession, Task } from '../lib/types';
import { countTasks, type TaskDraft, type TaskPatch } from '../features/tasks/task';
import TaskList from '../features/tasks/TaskList';
import FocusTimer from '../features/focus/FocusTimer';
import FocusStats from '../features/focus/FocusStats';
import styles from './Sidebar.module.css';

interface TodayPanelProps {
  tasks: readonly Task[];
  onCreateTask: (draft: TaskDraft) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, patch: TaskPatch) => void;
}

export function TodayPanel({
  tasks,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
}: TodayPanelProps) {
  const counts = countTasks(tasks);

  return (
    <>
      <p className={styles.counts}>
        未完成 {counts.open} · 完成 {counts.done}
      </p>
      <TaskList
        tasks={tasks}
        onToggle={onToggleTask}
        onDelete={onDeleteTask}
        onUpdate={onUpdateTask}
        onCreateTask={onCreateTask}
        compact
        showCreate
      />
    </>
  );
}

interface FocusPanelProps {
  sessions: readonly FocusSession[];
  onComplete: (durationSec: number) => void;
}

export function FocusPanel({ sessions, onComplete }: FocusPanelProps) {
  return (
    <>
      <FocusTimer onComplete={onComplete} />
      <FocusStats sessions={sessions} />
    </>
  );
}
