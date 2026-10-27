import { useCallback, useRef, useState } from 'react';
import type { Task } from '../../lib/types';
import { useAudio } from '../../lib/AudioProvider';
import ConfirmDialog from '../../lib/ConfirmDialog';
import { getConfirmSpec, toggleConfirmKind, type ConfirmKind } from './confirm';
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
type PendingConfirm = { kind: ConfirmKind; task: Task } | null;

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
  const [filter, setFilter] = useState<TaskFilter>('open');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<EditorState>(null);
  const [pending, setPending] = useState<PendingConfirm>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const counts = countTasks(tasks);
  const visibleTasks = sortTasks(filterTasks(searchTasks(tasks, query), filter));
  const { playOpen, playClose } = useAudio();

  const openEditor = useCallback(
    (next: EditorState) => {
      triggerRef.current = document.activeElement as HTMLElement | null;
      playOpen();
      setEditor(next);
    },
    [playOpen],
  );

  const closeEditor = useCallback(() => {
    playClose();
    setEditor(null);
    requestAnimationFrame(() => {
      const trigger = triggerRef.current;
      if (trigger && trigger.isConnected) {
        trigger.focus();
      } else {
        createButtonRef.current?.focus();
      }
    });
  }, [playClose]);

  const handleSave = (draft: TaskDraft) => {
    if (editor?.mode === 'edit') {
      onUpdate(editor.task.id, draft);
    } else {
      onCreateTask(draft);
    }
    closeEditor();
  };

  const requestToggle = useCallback((task: Task) => {
    setPending({ kind: toggleConfirmKind(task.done), task });
  }, []);

  const requestDelete = useCallback((task: Task) => {
    setPending({ kind: 'delete', task });
  }, []);

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

  const emptyText =
    query.trim().length > 0
      ? '没有匹配的任务'
      : filter === 'open'
        ? '当前没有未完成任务'
        : filter === 'done'
          ? '还没有已完成任务'
          : '没有匹配的任务';
  const listClass = compact ? `${styles.listBlock} ${styles.listBlockCompact}` : styles.listBlock;
  const confirmSpec = pending ? getConfirmSpec(pending.kind, pending.task.title) : null;

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
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onRequestToggle={requestToggle}
              onRequestDelete={requestDelete}
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

      {pending && confirmSpec ? (
        <ConfirmDialog
          title={confirmSpec.title}
          message={confirmSpec.message}
          confirmLabel={confirmSpec.confirmLabel}
          danger={confirmSpec.danger}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
          fallbackFocusRef={createButtonRef}
        />
      ) : null}
    </div>
  );
}
