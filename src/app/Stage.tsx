import type { MoodId, Task } from '../lib/types';
import { getMoodMeta } from '../features/mood/mood';
import type { TaskPatch } from '../features/tasks/task';
import TaskComposer from '../features/tasks/TaskComposer';
import TaskList from '../features/tasks/TaskList';
import styles from './Stage.module.css';

interface StageProps {
  mood: MoodId;
  tasks: readonly Task[];
  onAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, patch: TaskPatch) => void;
  onClearCompletedTasks: () => void;
}

const RAIN_DROPS = 12;

export default function Stage({
  mood,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onClearCompletedTasks,
}: StageProps) {
  const meta = getMoodMeta(mood);

  return (
    <section className={styles.stage} data-mood={mood} aria-label="主界面">
      <div className={styles.scene} aria-hidden="true">
        <div className={`${styles.layer} ${styles.layerPositive}`} />
        <div className={`${styles.layer} ${styles.layerNeutral}`} />
        <div className={`${styles.layer} ${styles.layerNegative}`} />
        <div className={styles.sun} />
        <div className={styles.cloudLayer}>
          <span className={`${styles.cloud} ${styles.cloudA}`} />
          <span className={`${styles.cloud} ${styles.cloudB}`} />
        </div>
        <div className={styles.rainLayer}>
          {Array.from({ length: RAIN_DROPS }, (_, index) => (
            <span key={`drop-${index}`} className={styles.rainDrop} />
          ))}
        </div>
      </div>

      <article className={styles.card}>
        <p className={styles.eyebrow}>当前情绪 · {meta.label}</p>
        <h2 className={styles.title}>今天想做什么？</h2>
        <p className={styles.text}>{meta.description}。先写下一件小事，再开始。</p>
        <TaskComposer onAdd={onAddTask} />
        <TaskList
          tasks={tasks}
          onToggle={onToggleTask}
          onDelete={onDeleteTask}
          onUpdate={onUpdateTask}
          onClearCompleted={onClearCompletedTasks}
          toolbar
        />
      </article>
    </section>
  );
}
