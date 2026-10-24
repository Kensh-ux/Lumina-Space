import { useCallback, useRef, useState } from 'react';
import type { Task } from '../../lib/types';
import TaskFilters from './TaskFilters';
import TaskRow from './TaskRow';
import {
  countTasks,
  filterTasks,
  searchTasks,
  sortTasks,
  toLocalDateString,
  type TaskFilter,
  type TaskPatch,
} from './task';
import styles from './tasks.module.css';

interface TaskListProps {
  tasks: readonly Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: TaskPatch) => void;
  compact?: boolean;
  showSummary?: boolean;
  toolbar?: boolean;
  onClearCompleted?: () => void;
}

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onUpdate,
  compact = false,
  showSummary = true,
  toolbar = false,
  onClearCompleted,
}: TaskListProps) {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const titleRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const counts = countTasks(tasks);
  const visibleTasks = sortTasks(filterTasks(searchTasks(tasks, query), filter));
  const today = toLocalDateString();

  const finishEditing = useCallback((focusId?: string) => {
    setEditingId(null);
    if (focusId) {
      requestAnimationFrame(() => {
        titleRefs.current[focusId]?.focus();
      });
    }
  }, []);

  const handleUpdate = useCallback(
    (id: string, patch: TaskPatch) => {
      onUpdate(id, patch);
      finishEditing(id);
    },
    [onUpdate, finishEditing],
  );

  const handleCancelEdit = useCallback(() => {
    if (editingId) {
      finishEditing(editingId);
    }
  }, [editingId, finishEditing]);

  const listClass = compact ? `${styles.listBlock} ${styles.listBlockCompact}` : styles.listBlock;

  return (
    <div className={listClass}>
      {toolbar ? (
        <TaskFilters
          filter={filter}
          query={query}
          counts={counts}
          visible={visibleTasks.length}
          onFilterChange={setFilter}
          onQueryChange={setQuery}
          onClearCompleted={() => {
            onClearCompleted?.();
            setEditingId(null);
          }}
        />
      ) : null}

      {showSummary && !toolbar ? (
        <p className={styles.summary} aria-live="polite">
          {counts.total} 件待办 · {counts.done} 件完成
        </p>
      ) : null}

      {counts.total === 0 ? (
        <p className={styles.empty}>今天还没有待办。先写一件最小的。</p>
      ) : visibleTasks.length === 0 ? (
        <p className={styles.empty}>没有匹配的任务</p>
      ) : (
        <ul className={styles.list}>
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              editing={editingId === task.id}
              today={today}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdate={handleUpdate}
              onStartEdit={setEditingId}
              onCancelEdit={handleCancelEdit}
              titleButtonRef={(element) => {
                titleRefs.current[task.id] = element;
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
