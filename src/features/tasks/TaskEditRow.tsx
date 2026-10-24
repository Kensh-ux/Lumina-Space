import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent as ReactFocusEvent } from 'react';
import type { Task, TaskPriority } from '../../lib/types';
import { TASK_PRIORITY_META, TASK_TITLE_MAX_LENGTH, type TaskPatch } from './task';
import styles from './tasks.module.css';

interface TaskEditRowProps {
  task: Task;
  onSave: (patch: TaskPatch) => void;
  onCancel: () => void;
}

export default function TaskEditRow({ task, onSave, onCancel }: TaskEditRowProps) {
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
            event.stopPropagation();
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
