import { useCallback, useEffect, useRef, useState } from 'react';
import type { MoodId, Task } from '../lib/types';
import { countTasks } from '../features/tasks/task';
import TaskComposer from '../features/tasks/TaskComposer';
import TaskList from '../features/tasks/TaskList';
import SettingsPanel from '../features/settings/SettingsPanel';
import styles from './Sidebar.module.css';

export type PanelId = 'today' | 'focus' | 'settings';

interface PanelMeta {
  id: PanelId;
  label: string;
  icon: string;
  title: string;
}

const PANELS: readonly PanelMeta[] = [
  { id: 'today', label: '今日', icon: '📋', title: '今日' },
  { id: 'focus', label: '专注', icon: '⏳', title: '专注' },
  { id: 'settings', label: '设置', icon: '⚙️', title: '设置' },
];

interface SidebarProps {
  initialPanel?: PanelId | null;
  mood: MoodId;
  tasks: readonly Task[];
  setMood: (mood: MoodId) => void;
  onAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onClearData: () => void;
  storageError: boolean;
}

export default function Sidebar({
  initialPanel = null,
  mood,
  tasks,
  setMood,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onClearData,
  storageError,
}: SidebarProps) {
  const [openPanel, setOpenPanel] = useState<PanelId | null>(initialPanel ?? null);
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const railRefs = useRef<Record<PanelId, HTMLButtonElement | null>>({
    today: null,
    focus: null,
    settings: null,
  });
  const previousPanelRef = useRef<PanelId | null>(initialPanel ?? null);
  const didMountRef = useRef(false);

  const closePanel = useCallback(() => setOpenPanel(null), []);

  // 打开时焦点进抽屉，关闭时回到对应 rail 按钮；首帧的 ?panel 预览不抢焦点。
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      previousPanelRef.current = openPanel;
      return;
    }
    if (openPanel) {
      closeButtonRef.current?.focus();
    } else if (previousPanelRef.current) {
      const previous = previousPanelRef.current;
      // 等外部 click 的默认焦点行为结束后再回焦，避免被 body 抢走。
      const frame = requestAnimationFrame(() => {
        railRefs.current[previous]?.focus();
      });
      previousPanelRef.current = openPanel;
      return () => cancelAnimationFrame(frame);
    }
    previousPanelRef.current = openPanel;
  }, [openPanel]);

  // Esc 关闭；若 MoodDial 已处理（defaultPrevented）则让给它。
  useEffect(() => {
    if (!openPanel) {
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
  }, [openPanel, closePanel]);

  // 点击抽屉外部关闭。
  useEffect(() => {
    if (!openPanel) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (sidebarRef.current?.contains(event.target as Node)) {
        return;
      }
      closePanel();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openPanel, closePanel]);

  const activeMeta = PANELS.find((panel) => panel.id === openPanel) ?? null;
  const counts = countTasks(tasks);

  return (
    <aside ref={sidebarRef} className={styles.sidebar} aria-label="快捷功能">
      {activeMeta ? (
        <section
          id={`sidebar-panel-${activeMeta.id}`}
          className={styles.drawer}
          aria-labelledby={`sidebar-title-${activeMeta.id}`}
        >
          <header className={styles.drawerHeader}>
            <h2 id={`sidebar-title-${activeMeta.id}`} className={styles.drawerTitle}>
              {activeMeta.title}
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              className={styles.closeButton}
              aria-label="关闭侧边栏"
              onClick={closePanel}
            >
              ×
            </button>
          </header>

          <div className={styles.drawerBody}>
            {activeMeta.id === 'today' ? (
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
            ) : null}

            {activeMeta.id === 'focus' ? (
              <div className={styles.placeholder}>
                <p className={styles.placeholderText}>番茄钟会在下一张任务卡接入。</p>
                <button type="button" className={styles.placeholderButton} disabled>
                  开始专注
                </button>
              </div>
            ) : null}

            {activeMeta.id === 'settings' ? (
              <SettingsPanel
                mood={mood}
                onChangeMood={setMood}
                storageError={storageError}
                onClearData={onClearData}
              />
            ) : null}
          </div>
        </section>
      ) : null}

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
              onClick={() => setOpenPanel((current) => (current === panel.id ? null : panel.id))}
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
    </aside>
  );
}
