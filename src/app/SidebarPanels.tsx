import type { RefObject } from 'react';
import type { Task } from '../lib/types';
import { countTasks } from '../features/tasks/task';
import TaskComposer from '../features/tasks/TaskComposer';
import TaskList from '../features/tasks/TaskList';
import styles from './Sidebar.module.css';

export type PanelId = 'today' | 'focus' | 'settings';

export interface PanelMeta {
  id: PanelId;
  label: string;
  icon: string;
  title: string;
}

export const PANELS: readonly PanelMeta[] = [
  { id: 'today', label: '今日', icon: '📋', title: '今日' },
  { id: 'focus', label: '专注', icon: '⏳', title: '专注' },
  { id: 'settings', label: '设置', icon: '⚙️', title: '设置' },
];

interface SidebarHeaderProps {
  title: string;
  titleId: string;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export function SidebarHeader({ title, titleId, closeButtonRef, onClose }: SidebarHeaderProps) {
  return (
    <header className={styles.drawerHeader}>
      <h2 id={titleId} className={styles.drawerTitle}>
        {title}
      </h2>
      <button
        ref={closeButtonRef}
        type="button"
        className={styles.closeButton}
        aria-label="关闭侧边栏"
        onClick={onClose}
      >
        ×
      </button>
    </header>
  );
}

interface TodayPanelProps {
  tasks: readonly Task[];
  onAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

export function TodayPanel({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: TodayPanelProps) {
  const counts = countTasks(tasks);

  return (
    <>
      <p className={styles.counts}>
        未完成 {counts.open} · 完成 {counts.done}
      </p>
      <TaskList
        tasks={tasks}
        onToggle={onToggleTask}
        onDelete={onDeleteTask}
        compact
        showSummary={false}
      />
      <TaskComposer onAdd={onAddTask} />
    </>
  );
}

export function FocusPanel() {
  return (
    <div className={styles.placeholder}>
      <p className={styles.placeholderText}>番茄钟会在下一张任务卡接入。</p>
      <button type="button" className={styles.placeholderButton} disabled>
        开始专注
      </button>
    </div>
  );
}

interface SidebarRailProps {
  openPanel: PanelId | null;
  railRefs: RefObject<Record<PanelId, HTMLButtonElement | null>>;
  onSelect: (panel: PanelId) => void;
}

export function SidebarRail({ openPanel, railRefs, onSelect }: SidebarRailProps) {
  return (
    <nav className={styles.rail} aria-label="功能入口">
      {PANELS.map((panel) => {
        const expanded = openPanel === panel.id;
        return (
          <button
            key={panel.id}
            ref={(element) => {
              railRefs.current[panel.id] = element;
            }}
            type="button"
            className={styles.railButton}
            aria-expanded={expanded}
            aria-controls={expanded ? `sidebar-panel-${panel.id}` : undefined}
            aria-label={panel.label}
            onClick={() => onSelect(panel.id)}
          >
            <span className={styles.icon} aria-hidden="true">
              {panel.icon}
            </span>
            <span className={styles.label} aria-hidden="true">
              {panel.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
