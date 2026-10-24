import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Task, TaskPriority } from '../../lib/types';
import { TASK_DESCRIPTION_MAX_LENGTH, TASK_TITLE_MAX_LENGTH, type TaskDraft } from './task';
import styles from './TaskEditor.module.css';

const PRIORITY_OPTIONS: readonly { value: TaskPriority; label: string }[] = [
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' },
];

interface TaskEditorProps {
  mode: 'create' | 'edit';
  task?: Task;
  onSubmit: (draft: TaskDraft) => void;
  onCancel: () => void;
}

export default function TaskEditor({ mode, task, onSubmit, onCancel }: TaskEditorProps) {
  const headingId = useId();
  const errorId = `${headingId}-error`;
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState(String(task?.priority ?? 2));
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  // 捕获阶段先处理 Esc，避免侧栏/移动 sheet 的 document 监听同时收起。
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onCancel]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim().length === 0) {
      setError('请输入任务标题');
      titleRef.current?.focus();
      return;
    }
    onSubmit({
      title,
      description,
      priority: Number(priority) as TaskPriority,
      dueDate: dueDate || null,
      dueTime: dueDate && dueTime ? dueTime : null,
    });
  };

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <header className={styles.header}>
            <h2 id={headingId} className={styles.heading}>
              {mode === 'create' ? '新建任务' : '编辑任务'}
            </h2>
          </header>

          <div className={styles.body}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${headingId}-title`}>
                标题 <span className={styles.required}>*</span>
              </label>
              <input
                id={`${headingId}-title`}
                ref={titleRef}
                className={styles.titleInput}
                value={title}
                maxLength={TASK_TITLE_MAX_LENGTH}
                placeholder="例如：复习高数"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (error && event.target.value.trim().length > 0) {
                    setError('');
                  }
                }}
              />
              {error ? (
                <p id={errorId} className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${headingId}-description`}>
                描述
              </label>
              <textarea
                id={`${headingId}-description`}
                className={styles.textarea}
                rows={4}
                value={description}
                maxLength={TASK_DESCRIPTION_MAX_LENGTH}
                placeholder="补充说明、资料、步骤……"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className={styles.dateRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${headingId}-due-date`}>
                  截止日期
                </label>
                <input
                  id={`${headingId}-due-date`}
                  className={styles.input}
                  type="date"
                  value={dueDate}
                  onChange={(event) => {
                    setDueDate(event.target.value);
                    if (event.target.value === '') {
                      setDueTime('');
                    }
                  }}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${headingId}-due-time`}>
                  截止时间
                </label>
                <input
                  id={`${headingId}-due-time`}
                  className={styles.input}
                  type="time"
                  value={dueTime}
                  disabled={!dueDate}
                  onChange={(event) => setDueTime(event.target.value)}
                />
              </div>
            </div>

            <fieldset className={styles.priorityField}>
              <legend className={styles.label}>优先级</legend>
              <div className={styles.priorityGroup}>
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={styles.priorityButton}
                    data-priority={option.value}
                    aria-pressed={priority === String(option.value)}
                    onClick={() => setPriority(String(option.value))}
                  >
                    <span className={styles.priorityDot} aria-hidden="true" />
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <footer className={styles.footer}>
            <button type="button" className={styles.cancelButton} onClick={onCancel}>
              取消
            </button>
            <button type="submit" className={styles.saveButton}>
              {mode === 'create' ? '保存任务' : '保存修改'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
