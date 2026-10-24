import type { MoodId, Task } from '../lib/types';
import { countTasks } from '../features/tasks/task';
import TaskComposer from '../features/tasks/TaskComposer';
import TaskList from '../features/tasks/TaskList';
import { getMoodMeta } from '../features/mood/mood';
import styles from './Sidebar.module.css';

interface TodayPanelProps {
  tasks: readonly Task[];
  onAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

export function TodayPanel({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
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
        compact
        showSummary={false}
      />
      <TaskComposer onAdd={onAddTask} />
    </>
  );
}

export function MoodPanel({ mood }: { mood: MoodId }) {
  const meta = getMoodMeta(mood);

  return (
    <div className={styles.moodPanel}>
      <p className={styles.moodCurrent}>
        <span aria-hidden="true">{meta.emoji}</span>
        <span>{meta.label}</span>
      </p>
      <p className={styles.moodNote}>{meta.description}。情绪记录会在 009 接入。</p>
    </div>
  );
}
