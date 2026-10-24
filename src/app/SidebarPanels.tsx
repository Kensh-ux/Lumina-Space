import type { FocusSession, MoodEntry, MoodId, Task } from '../lib/types';
import { countTasks, type TaskPatch } from '../features/tasks/task';
import TaskComposer from '../features/tasks/TaskComposer';
import TaskList from '../features/tasks/TaskList';
import FocusTimer from '../features/focus/FocusTimer';
import FocusStats from '../features/focus/FocusStats';
import MoodHistory from '../features/mood/MoodHistory';
import styles from './Sidebar.module.css';

interface TodayPanelProps {
  tasks: readonly Task[];
  onAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, patch: TaskPatch) => void;
}

export function TodayPanel({
  tasks,
  onAddTask,
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
        compact
        showSummary={false}
      />
      <TaskComposer onAdd={onAddTask} />
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

export function MoodPanel({ mood, log }: { mood: MoodId; log: readonly MoodEntry[] }) {
  return <MoodHistory mood={mood} log={log} />;
}
