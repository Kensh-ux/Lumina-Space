import type { Task } from '../../lib/types';
import { formatDueDate, isTaskOverdue, TASK_PRIORITY_META } from './task';
import styles from './tasks.module.css';

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}

export default function TaskRow({ task, onToggle, onDelete, onEdit }: TaskRowProps) {
  const overdue = isTaskOverdue(task);
  const priorityLabel = task.priority
    ? TASK_PRIORITY_META.find((item) => item.value === task.priority)?.label
    : null;

  return (
    <li
      className={styles.item}
      data-done={task.done}
      data-overdue={overdue}
      data-priority={task.priority ?? ''}
    >
      <label className={styles.checkArea}>
        <input
          className={styles.checkbox}
          type="checkbox"
          checked={task.done}
          aria-label={`完成：${task.title}`}
          onChange={() => onToggle(task.id)}
        />
      </label>

      <div className={styles.body}>
        <button
          type="button"
          className={styles.cardTitle}
          title="编辑任务"
          onClick={onEdit}
        >
          {task.title}
        </button>
        {task.description ? <p className={styles.description}>{task.description}</p> : null}
        <div className={styles.metaRow}>
          {priorityLabel && task.priority ? (
            <span className={styles.priority} data-priority={task.priority}>
              <span className={styles.priorityDot} aria-hidden="true" />
              {priorityLabel}
            </span>
          ) : null}
          {task.dueDate ? (
            <span className={styles.due} data-overdue={overdue}>
              {formatDueDate(task.dueDate)}
              {task.dueTime ? ` ${task.dueTime}` : ''}
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.editButton}
          aria-label={`编辑：${task.title}`}
          onClick={onEdit}
        >
          ✎
        </button>
        <button
          type="button"
          className={styles.deleteButton}
          aria-label={`删除：${task.title}`}
          onClick={() => onDelete(task.id)}
        >
          ×
        </button>
      </div>
    </li>
  );
}
