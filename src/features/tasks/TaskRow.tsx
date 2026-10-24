import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent as ReactFocusEvent } from 'react';
import type { Task, TaskPriority } from '../../lib/types';
import {
  formatDueDate,
  isTaskOverdue,
  TASK_PRIORITY_META,
  TASK_TITLE_MAX_LENGTH,
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

interface TaskEditRowProps {
  task: Task;
  onSave: (patch: TaskPatch) => void;
  onCancel: () => void;
}

function TaskEditRow({ task, onSave, onCancel }: TaskEditRowProps) {
  const titleId = useId();
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState(task.priority ? String(task.priority) : '');
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  const save = () => {
    const parsedPriority = priority === '' ? null : (Number(priority) as TaskPriority);
    onSave({
      title,
      priority: parsedPriority,
      dueDate: dueDate === '' ? null : dueDate,
    });
  };

  const handleBlur = (event: ReactFocusEvent<HTMLFormElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) {
      return;
    }
    save();
  };

  return (
    <li className={styles.itemEditing}>
      <form
        className={styles.editForm}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
      >
        <label className={styles.visuallyHidden} htmlFor={titleId}>
          编辑标题
        </label>
        <input
          id={titleId}
          ref={titleRef}
          className={styles.editTitle}
          value={title}
          maxLength={TASK_TITLE_MAX_LENGTH}
          onChange={(event) => setTitle(event.target.value)}
        />
        <select
          className={styles.editSelect}
          aria-label="优先级"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        >
          <option value="">未设置</option>
          {TASK_PRIORITY_META.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          className={styles.editDate}
          type="date"
          aria-label="截止日期"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
        <button type="submit" className={styles.saveButton}>
          保存
        </button>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          取消
        </button>
      </form>
    </li>
  );
}
