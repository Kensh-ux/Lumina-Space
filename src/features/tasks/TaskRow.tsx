import type { Task } from '../../lib/types';
import TaskEditRow from './TaskEditRow';
import {
  formatDueDate,
  isTaskOverdue,
  TASK_PRIORITY_META,
  type TaskPatch,
} from './task';
import styles from './tasks.module.css';

interface TaskRowProps {
  task: Task;
  editing: boolean;
  today: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: TaskPatch) => void;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  titleButtonRef?: (element: HTMLButtonElement | null) => void;
}

export default function TaskRow({
  task,
  editing,
  today,
  onToggle,
  onDelete,
  onUpdate,
  onStartEdit,
  onCancelEdit,
  titleButtonRef,
}: TaskRowProps) {
  if (editing) {
    return (
      <TaskEditRow
        task={task}
        onSave={(patch) => onUpdate(task.id, patch)}
        onCancel={onCancelEdit}
      />
    );
  }

  const overdue = isTaskOverdue(task, today);
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
      <button
        ref={titleButtonRef}
        type="button"
        className={styles.titleButton}
        title="点击编辑标题"
        onClick={() => onStartEdit(task.id)}
      >
        {task.title}
      </button>
      <span className={styles.meta}>
        {priorityLabel && task.priority ? (
          <span className={styles.priority} data-priority={task.priority}>
            <span className={styles.priorityDot} aria-hidden="true" />
            {priorityLabel}
          </span>
        ) : null}
        {task.dueDate ? (
          <span className={styles.due} data-overdue={overdue}>
            {formatDueDate(task.dueDate)}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        className={styles.editButton}
        aria-label={`编辑：${task.title}`}
        onClick={() => onStartEdit(task.id)}
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
    </li>
  );
}
