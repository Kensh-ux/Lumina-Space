import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task } from '../lib/types';
import { countTasks, type TaskDraft, type TaskPatch } from '../features/tasks/task';
import TaskList from '../features/tasks/TaskList';
import { useAudio } from '../lib/AudioProvider';
import { formatHeroDate } from '../lib/greeting';
import styles from './TodayOrb.module.css';

interface TodayOrbProps {
  tasks: readonly Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, patch: TaskPatch) => void;
  onCreateTask: (draft: TaskDraft) => void;
  onClearCompletedTasks: () => void;
  onOpenChange?: (open: boolean) => void;
}

export default function TodayOrb({
  tasks,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onCreateTask,
  onClearCompletedTasks,
  onOpenChange,
}: TodayOrbProps) {
  const [open, setOpen] = useState(false);
  const orbRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const { playHover, playOpen, playClose } = useAudio();
  const counts = countTasks(tasks);

  const closePanel = useCallback(
    (restoreFocus = true) => {
      playClose();
      setOpen(false);
      onOpenChange?.(false);
      if (restoreFocus) {
        requestAnimationFrame(() => orbRef.current?.focus());
      }
    },
    [playClose, onOpenChange],
  );

  const handleClose = useCallback(() => closePanel(), [closePanel]);

  const openPanel = useCallback(() => {
    playOpen();
    setOpen(true);
    onOpenChange?.(true);
    requestAnimationFrame(() => closeRef.current?.focus());
  }, [playOpen, onOpenChange]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      closePanel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closePanel]);

  // 捕获阶段处理面板外点击：MoodDial（z 更高）也能先关面板再打开自己；编辑器内点击忽略。
  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (panelRef.current?.contains(target) || orbRef.current?.contains(target)) {
        return;
      }
      closePanel(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open, closePanel]);

  return (
    <>
      <div className={styles.orbAnchor} data-open={open}>
        <button
          ref={orbRef}
          type="button"
          className={styles.orb}
          data-open={open}
          aria-expanded={open}
          aria-controls={open ? 'today-orb-panel' : undefined}
          aria-label={open ? '关闭今日任务' : `今日任务，${counts.open} 件待办`}
          onPointerEnter={playHover}
          onClick={() => (open ? closePanel() : openPanel())}
        >
          <span className={styles.orbGlow} aria-hidden="true" />
          <span className={styles.orbCount}>{counts.open}</span>
          <span className={styles.orbLabel}>今日</span>
        </button>
      </div>

      {open ? (
        <>
          <div className={styles.backdrop} aria-hidden="true" />
          <section
            ref={panelRef}
            id="today-orb-panel"
            className={styles.panel}
            role="dialog"
            aria-label="今日任务"
          >
            <header className={styles.panelHeader}>
              <div className={styles.panelHeading}>
                <h2 className={styles.panelTitle}>今日</h2>
                <p className={styles.panelDate}>{formatHeroDate()}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className={styles.closeButton}
                aria-label="关闭今日任务"
                onClick={handleClose}
              >
                ×
              </button>
            </header>
            <div className={styles.panelBody}>
              <TaskList
                tasks={tasks}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                onUpdate={onUpdateTask}
                onCreateTask={onCreateTask}
                onClearCompleted={onClearCompletedTasks}
                toolbar
                showCreate
              />
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
