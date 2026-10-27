import type { Task } from '../../lib/types';
import { useAudio } from '../../lib/AudioProvider';
import { formatDueDate, isTaskOverdue, TASK_PRIORITY_META } from './task';
import styles from './tasks.module.css';

interface TaskRowProps {
  task: Task;
  onRequestToggle: (task: Task) => void;
  onRequestDelete: (task: Task) => void;
  onEdit: () => void;
}

export default function TaskRow({
  task,
  onRequestToggle,
  onRequestDelete,
  onEdit,
}: TaskRowProps) {
  const overdue = isTaskOverdue(task);
  const { playHover, playClick } = useAudio();
  const priorityLabel = task.priority
    ? TASK_PRIORITY_META.find((item) => item.value === task.priority)?.label
    : null;

  return (
    <li
      className={styles.item}
      data-done={task.done}
      data-overdue={overdue}
      data-priority={task.priority ?? ''}
      onPointerEnter={playHover}
    >
      <label className={styles.checkArea}>
        <input
          className={styles.checkbox}
          type="checkbox"
          checked={task.done}
          aria-label={`${task.done ? '取消完成' : '完成'}：${task.title}`}
          onChange={() => {
            playClick();
            onRequestToggle(task);
          }}
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
          onClick={() => {
            playClick();
            onRequestDelete(task);
          }}
        >
          ×
        </button>
      </div>
    </li>
  );
}
