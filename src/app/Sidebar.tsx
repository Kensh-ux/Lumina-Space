import { useCallback, useEffect, useRef, useState } from 'react';
import type { MoodId, Task } from '../lib/types';
import { closeOverlay, getActiveOverlay, openOverlay, subscribeOverlay } from '../lib/overlay';
import SettingsPanel from '../features/settings/SettingsPanel';
import {
  FocusPanel,
  PANELS,
  SidebarHeader,
  SidebarRail,
  TodayPanel,
  type PanelId,
} from './SidebarPanels';
import styles from './Sidebar.module.css';

export type { PanelId } from './SidebarPanels';

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
  const openPanelRef = useRef<PanelId | null>(openPanel);
  openPanelRef.current = openPanel;
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const railRefs = useRef<Record<PanelId, HTMLButtonElement | null>>({
    today: null,
    focus: null,
    settings: null,
  });
  const previousPanelRef = useRef<PanelId | null>(initialPanel ?? null);
  const suppressRestoreFocusRef = useRef(false);
  const didMountRef = useRef(false);

  const setPanelSafe = useCallback((next: PanelId | null) => {
    setOpenPanel(next);
    if (next) {
      openOverlay('sidebar');
    } else {
      closeOverlay('sidebar');
    }
  }, []);
  const closePanel = useCallback(() => setPanelSafe(null), [setPanelSafe]);

  // 打开时焦点进抽屉，关闭时回到对应 rail 按钮；首帧 ?panel 预览与被动关闭不抢焦点。
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      previousPanelRef.current = openPanel;
      return;
    }
    if (openPanel) {
      closeButtonRef.current?.focus();
    } else if (previousPanelRef.current) {
      if (suppressRestoreFocusRef.current) {
        suppressRestoreFocusRef.current = false;
      } else {
        const previous = previousPanelRef.current;
        const frame = requestAnimationFrame(() => {
          railRefs.current[previous]?.focus();
        });
        previousPanelRef.current = openPanel;
        return () => cancelAnimationFrame(frame);
      }
    }
    previousPanelRef.current = openPanel;
  }, [openPanel]);

  // 另一个浮层打开时自动收起，不抢焦点（null 表示只是自己关闭）。
  useEffect(() => {
    return subscribeOverlay((activeId) => {
      if (activeId !== null && activeId !== 'sidebar' && openPanelRef.current) {
        suppressRestoreFocusRef.current = true;
        setOpenPanel(null);
      }
    });
  }, []);

  // ?panel= 预览也登记到 overlay；卸载时释放。
  useEffect(() => {
    if (initialPanel) {
      openOverlay('sidebar');
    }
    return () => {
      if (getActiveOverlay() === 'sidebar') {
        closeOverlay('sidebar');
      }
    };
  }, [initialPanel]);

  // 只有当前活跃浮层响应 Esc。
  useEffect(() => {
    if (!openPanel) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || getActiveOverlay() !== 'sidebar') {
        return;
      }
      event.preventDefault();
      closePanel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openPanel, closePanel]);

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

  return (
    <aside ref={sidebarRef} className={styles.sidebar} aria-label="快捷功能">
      {activeMeta ? (
        <section
          id={`sidebar-panel-${activeMeta.id}`}
          className={styles.drawer}
          aria-labelledby={`sidebar-title-${activeMeta.id}`}
        >
          <SidebarHeader
            title={activeMeta.title}
            titleId={`sidebar-title-${activeMeta.id}`}
            closeButtonRef={closeButtonRef}
            onClose={closePanel}
          />

          <div className={styles.drawerBody}>
            {activeMeta.id === 'today' ? (
              <TodayPanel
                tasks={tasks}
                onAddTask={onAddTask}
                onToggleTask={onToggleTask}
                onDeleteTask={onDeleteTask}
              />
            ) : null}
            {activeMeta.id === 'focus' ? <FocusPanel /> : null}
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

      <SidebarRail
        openPanel={openPanel}
        railRefs={railRefs}
        onSelect={(panel) => setPanelSafe(openPanel === panel ? null : panel)}
      />
    </aside>
  );
}
