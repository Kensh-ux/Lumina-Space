import { useCallback, useRef, useState } from 'react';
import type { Task } from '../../lib/types';
import TaskEditor from './TaskEditor';
import TaskFilters from './TaskFilters';
import TaskRow from './TaskRow';
import {
  countTasks,
  filterTasks,
  searchTasks,
  sortTasks,
  type TaskDraft,
  type TaskFilter,
  type TaskPatch,
} from './task';
import styles from './tasks.module.css';

interface TaskListProps {
  tasks: readonly Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: TaskPatch) => void;
  onCreateTask: (draft: TaskDraft) => void;
  compact?: boolean;
  toolbar?: boolean;
  showCreate?: boolean;
  onClearCompleted?: () => void;
}

type EditorState = { mode: 'create' } | { mode: 'edit'; task: Task } | null;

export default function TaskList({
  tasks,
  onToggle,
  onDelete,
  onUpdate,
  onCreateTask,
  compact = false,
  toolbar = false,
  showCreate = false,
  onClearCompleted,
}: TaskListProps) {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<EditorState>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const counts = countTasks(tasks);
  const visibleTasks = sortTasks(filterTasks(searchTasks(tasks, query), filter));

  const openEditor = useCallback((next: EditorState) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setEditor(next);
  }, []);

  const closeEditor = useCallback(() => {
    setEditor(null);
    requestAnimationFrame(() => {
      const trigger = triggerRef.current;
      if (trigger && trigger.isConnected) {
        trigger.focus();
      } else {
        createButtonRef.current?.focus();
      }
    });
  }, []);

  const handleSave = (draft: TaskDraft) => {
    if (editor?.mode === 'edit') {
      onUpdate(editor.task.id, draft);
    } else {
      onCreateTask(draft);
    }
    closeEditor();
  };

  const listClass = compact ? `${styles.listBlock} ${styles.listBlockCompact}` : styles.listBlock;

  return (
    <div className={listClass}>
      {showCreate ? (
        <button
          ref={createButtonRef}
          type="button"
          className={styles.newTaskButton}
          onClick={() => openEditor({ mode: 'create' })}
        >
          ＋ 新建任务
        </button>
      ) : null}

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
            setEditor(null);
          }}
        />
      ) : null}

      {counts.total === 0 ? (
        <p className={styles.empty}>今天还没有任务。先写一件最小的。</p>
      ) : visibleTasks.length === 0 ? (
        <p className={styles.empty}>没有匹配的任务</p>
      ) : (
        <ul className={styles.list}>
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={() => openEditor({ mode: 'edit', task })}
            />
          ))}
        </ul>
      )}

      {editor ? (
        <TaskEditor
          mode={editor.mode}
          task={editor.mode === 'edit' ? editor.task : undefined}
          onSubmit={handleSave}
          onCancel={closeEditor}
        />
      ) : null}
    </div>
  );
}
