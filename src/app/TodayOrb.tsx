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
}

export default function TodayOrb({
  tasks,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onCreateTask,
  onClearCompletedTasks,
}: TodayOrbProps) {
  const [open, setOpen] = useState(false);
  const orbRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { playHover, playOpen, playClose } = useAudio();
  const counts = countTasks(tasks);

  const closePanel = useCallback(() => {
    playClose();
    setOpen(false);
    requestAnimationFrame(() => orbRef.current?.focus());
  }, [playClose]);

  const openPanel = useCallback(() => {
    playOpen();
    setOpen(true);
    requestAnimationFrame(() => closeRef.current?.focus());
  }, [playOpen]);

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
          <div
            className={styles.backdrop}
            aria-hidden="true"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                closePanel();
              }
            }}
          />
          <section
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
                onClick={closePanel}
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
