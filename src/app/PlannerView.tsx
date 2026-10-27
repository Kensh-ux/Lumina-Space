import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Task } from '../lib/types';
import type { TaskDraft, TaskPatch } from '../features/tasks/task';
import { formatMonthTitle, getPlannerDays, getPlannerStartDate, tasksForDate } from '../lib/planner';
import ConfirmDialog from '../features/tasks/ConfirmDialog';
import { getConfirmSpec, toggleConfirmKind, type ConfirmKind } from '../features/tasks/confirm';
import TaskEditor from '../features/tasks/TaskEditor';
import { useAudio } from '../lib/AudioProvider';
import PlannerDayColumn from './PlannerDayColumn';
import styles from './PlannerView.module.css';

interface PlannerViewProps {
  tasks: readonly Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, patch: TaskPatch) => void;
  onCreateTask: (draft: TaskDraft) => void;
}

type EditorState = { mode: 'create'; date: string } | { mode: 'edit'; task: Task } | null;
type PendingConfirm = { kind: ConfirmKind; task: Task } | null;

export default function PlannerView({
  tasks,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onCreateTask,
}: PlannerViewProps) {
  const [startDate, setStartDate] = useState(getPlannerStartDate);
  const [editor, setEditor] = useState<EditorState>(null);
  const [pending, setPending] = useState<PendingConfirm>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => formatMonthTitle(startDate));
  const triggerRef = useRef<HTMLElement | null>(null);
  const daysRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { playOpen, playClose } = useAudio();
  const today = getPlannerStartDate();
  const days = useMemo(() => getPlannerDays(startDate), [startDate]);
  const unscheduled = tasks.filter((task) => !task.dueDate).length;
  const confirmSpec = pending ? getConfirmSpec(pending.kind, pending.task.title) : null;

  useEffect(() => {
    if (daysRef.current) {
      daysRef.current.scrollLeft = 0;
    }
    setVisibleMonth(formatMonthTitle(startDate));
  }, [startDate]);

  // 视口最左侧那一列决定标题月份；跨月滚动时同步更新。
  const updateVisibleMonth = () => {
    const container = daysRef.current;
    const first = container?.firstElementChild as HTMLElement | null;
    if (!container || !first) {
      return;
    }
    const base = first.offsetLeft;
    const left = container.scrollLeft + 1;
    for (const child of Array.from(container.children) as HTMLElement[]) {
      if (child.offsetLeft - base + child.offsetWidth > left) {
        const date = child.dataset.date;
        if (date) {
          setVisibleMonth(formatMonthTitle(date));
        }
        return;
      }
    }
  };

  const openEditor = (next: EditorState, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    playOpen();
    setEditor(next);
  };

  const closeEditor = () => {
    playClose();
    setEditor(null);
    requestAnimationFrame(() => {
      const trigger = triggerRef.current;
      if (trigger && trigger.isConnected) {
        trigger.focus();
      }
    });
  };

  const handleSave = (draft: TaskDraft) => {
    if (editor?.mode === 'edit') {
      onUpdateTask(editor.task.id, draft);
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
      onDeleteTask(pending.task.id);
    } else {
      onToggleTask(pending.task.id);
    }
    setPending(null);
  };

  return (
    <section className={styles.planner} aria-label="任务规划">
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{visibleMonth}</h2>
          <p className={styles.subtitle}>
            从所选的起始日期开始，按截止日期自动分列 · 左右滑动查看更多天
          </p>
        </div>
        <div className={styles.controls}>
          <label className={styles.dateLabel}>
            <span className={styles.dateLabelText}>起始日期</span>
            <input
              ref={dateInputRef}
              type="date"
              className={styles.dateInput}
              value={startDate}
              onChange={(event) => {
                const value = event.target.value;
                if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                  setStartDate(value);
                }
              }}
            />
          </label>
          {startDate !== today ? (
            <button
              type="button"
              className={styles.todayButton}
              onClick={() => setStartDate(today)}
            >
              回到今天
            </button>
          ) : null}
          <p className={styles.unscheduled}>
            {unscheduled > 0 ? `未排期 ${unscheduled} 件` : '按天安排任务'}
          </p>
        </div>
      </header>

      <div ref={daysRef} className={styles.days} onScroll={updateVisibleMonth}>
        {days.map((day) => (
          <PlannerDayColumn
            key={day.date}
            day={day}
            tasks={tasksForDate(tasks, day.date)}
            onRequestToggle={requestToggle}
            onRequestDelete={requestDelete}
            onEdit={(task, trigger) => openEditor({ mode: 'edit', task }, trigger)}
            onCreate={(date, trigger) => openEditor({ mode: 'create', date }, trigger)}
          />
        ))}
      </div>

      {editor ? (
        <TaskEditor
          mode={editor.mode}
          task={editor.mode === 'edit' ? editor.task : undefined}
          initialDueDate={editor.mode === 'create' ? editor.date : undefined}
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
          fallbackFocusRef={dateInputRef}
        />
      ) : null}
    </section>
  );
}
