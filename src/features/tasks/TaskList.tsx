import type { Task } from '../../lib/types';
import { sortTasks } from './task';
import styles from './tasks.module.css';

interface TaskListProps {
  tasks: readonly Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
  const sorted = sortTasks(tasks);
  const total = sorted.length;
  const done = sorted.filter((task) => task.done).length;

  return (
    <div className={styles.listBlock}>
      <p className={styles.summary} aria-live="polite">
        {total} 件待办 · {done} 件完成
      </p>
      {total === 0 ? (
        <p className={styles.empty}>今天还没有待办。先写一件最小的。</p>
      ) : (
        <ul className={styles.list}>
          {sorted.map((task) => {
            const checkboxId = `task-${task.id}`;
            return (
              <li key={task.id} className={styles.item} data-done={task.done}>
                <label className={styles.checkArea} htmlFor={checkboxId}>
                  <input
                    id={checkboxId}
                    className={styles.checkbox}
                    type="checkbox"
                    checked={task.done}
                    onChange={() => onToggle(task.id)}
                  />
                  <span className={styles.title}>{task.title}</span>
                </label>
                <button
                  type="button"
                  className={styles.deleteButton}
                  aria-label={`删除：${task.title}`}
                  onClick={() => onDelete(task.id)}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
