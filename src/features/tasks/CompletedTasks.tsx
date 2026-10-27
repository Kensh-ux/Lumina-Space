import { useRef, useState } from 'react';
import type { Task } from '../../lib/types';
import ConfirmDialog from './ConfirmDialog';
import { getConfirmSpec, type ConfirmKind } from './confirm';
import {
  countTasks,
  formatCompletedDate,
  sortCompletedTasks,
  TASK_PRIORITY_META,
} from './task';
import styles from './CompletedTasks.module.css';

interface CompletedTasksProps {
  tasks: readonly Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

type PendingConfirm = { kind: ConfirmKind; task: Task } | null;

export default function CompletedTasks({ tasks, onToggle, onDelete }: CompletedTasksProps) {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<PendingConfirm>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const counts = countTasks(tasks);
  const completed = sortCompletedTasks(tasks);
  const confirmSpec = pending ? getConfirmSpec(pending.kind, pending.task.title) : null;

  const handleConfirm = () => {
    if (!pending) {
      return;
    }
    if (pending.kind === 'delete') {
      onDelete(pending.task.id);
    } else {
      onToggle(pending.task.id);
    }
    setPending(null);
  };

  return (
    <section className={styles.card} aria-label="任务统计">
      <h3 className={styles.title}>任务统计</h3>
      <p className={styles.summary}>
        未完成 {counts.open} · 已完成 {counts.done}
      </p>
      <button
        ref={toggleButtonRef}
        type="button"
        className={styles.toggleButton}
        aria-expanded={expanded}
        disabled={counts.done === 0}
        onClick={() => setExpanded((previous) => !previous)}
      >
        已完成 {counts.done} 个任务
      </button>

      {expanded && completed.length > 0 ? (
        <ul className={styles.list}>
          {completed.map((task) => {
            const priorityLabel = task.priority
              ? TASK_PRIORITY_META.find((item) => item.value === task.priority)?.label
              : null;
            return (
              <li key={task.id} className={styles.item}>
                <label className={styles.checkArea}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked
                    aria-label={`取消完成：${task.title}`}
                    onChange={() => setPending({ kind: 'uncomplete', task })}
                  />
                </label>
                <div className={styles.body}>
                  <p className={styles.itemTitle}>{task.title}</p>
                  <p className={styles.meta}>
                    <span>{formatCompletedDate(task)} 完成</span>
                    {priorityLabel && task.priority ? (
                      <span className={styles.priority} data-priority={task.priority}>
                        <span className={styles.priorityDot} aria-hidden="true" />
                        {priorityLabel}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.deleteButton}
                  aria-label={`删除：${task.title}`}
                  onClick={() => setPending({ kind: 'delete', task })}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {pending && confirmSpec ? (
        <ConfirmDialog
          title={confirmSpec.title}
          message={confirmSpec.message}
          confirmLabel={confirmSpec.confirmLabel}
          danger={confirmSpec.danger}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
          fallbackFocusRef={toggleButtonRef}
        />
      ) : null}
    </section>
  );
}
