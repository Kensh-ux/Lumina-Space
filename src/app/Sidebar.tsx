import { useEffect } from 'react';
import type { FocusSession, MoodId, Task } from '../lib/types';
import type { ExportResult } from '../lib/data';
import type { TaskDraft, TaskPatch } from '../features/tasks/task';
import SettingsPanel from '../features/settings/SettingsPanel';
import { useAudio } from '../lib/AudioProvider';
import SidebarResizeHandle from './SidebarResizeHandle';
import { FocusPanel, PlannerPanel, TodayPanel } from './SidebarPanels';
import { useSidebarPanels, type SidebarPanelId } from './useSidebarPanels';
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, type SidebarLayout } from './useSidebar';
import styles from './Sidebar.module.css';

export type { SidebarPanelId } from './useSidebarPanels';

interface ModuleMeta {
  id: SidebarPanelId;
  label: string;
  icon: string;
}

const MODULES: readonly ModuleMeta[] = [
  { id: 'today', label: '今日', icon: '📋' },
  { id: 'planner', label: '规划师', icon: '🗓️' },
  { id: 'focus', label: '专注', icon: '⏳' },
  { id: 'settings', label: '设置', icon: '⚙️' },
];

interface SidebarProps {
  layout: SidebarLayout;
  mood: MoodId;
  tasks: readonly Task[];
  focusSessions: readonly FocusSession[];
  setMood: (mood: MoodId) => void;
  onCreateTask: (draft: TaskDraft) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, patch: TaskPatch) => void;
  onRecordFocusSession: (durationSec: number) => void;
  onExportData: () => ExportResult;
  onClearData: () => void;
  storageError: boolean;
  onPanelChange?: (panel: SidebarPanelId) => void;
  initialPanel?: SidebarPanelId | null;
}

export default function Sidebar({
  layout,
  mood,
  tasks,
  focusSessions,
  setMood,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onRecordFocusSession,
  onExportData,
  onClearData,
  storageError,
  onPanelChange,
  initialPanel = null,
}: SidebarProps) {
  const { activePanel, sheetOpen, isMobile, sheetCloseRef, navRefs, setSheetOpen, handleSelect } =
    useSidebarPanels(initialPanel, layout, onPanelChange);
  const activeLabel = MODULES.find((module) => module.id === activePanel)?.label ?? '今日';
  const { playHover, playClick, playOpen, playClose, stopWhiteNoise } = useAudio();

  // 收起桌面侧栏或关闭移动 sheet 时，白噪音不能继续在后台响。
  useEffect(() => {
    if ((isMobile && !sheetOpen) || (!isMobile && !layout.expanded)) {
      stopWhiteNoise();
    }
  }, [isMobile, sheetOpen, layout.expanded, stopWhiteNoise]);

  return (
    <aside
      className={styles.sidebar}
      data-expanded={!isMobile && layout.expanded}
      data-mobile={isMobile}
      data-sheet-open={sheetOpen}
      data-dragging={layout.dragging}
      aria-label="侧栏"
    >
      <header className={styles.sidebarHeader}>
        <p className={styles.brand}>Lumina-Space</p>
        <button
          type="button"
          className={styles.toggleButton}
          aria-label={layout.expanded ? '收起侧栏' : '展开侧栏'}
          aria-expanded={layout.expanded}
          onPointerEnter={playHover}
          onClick={() => {
            if (layout.expanded) {
              playClose();
            } else {
              playOpen();
            }
            layout.toggle();
          }}
        >
          <span aria-hidden="true">{layout.expanded ? '«' : '☰'}</span>
        </button>
      </header>
      <nav className={styles.moduleNav} aria-label="侧栏模块">
        {MODULES.map((module) => (
          <button
            key={module.id}
            ref={(element) => {
              navRefs.current[module.id] = element;
            }}
            type="button"
            className={styles.moduleButton}
            aria-current={activePanel === module.id ? 'page' : undefined}
            aria-label={module.label}
            title={module.label}
            onPointerEnter={playHover}
            onClick={() => {
              if (module.id !== activePanel) {
                playOpen();
              } else {
                playClick();
              }
              handleSelect(module.id);
            }}
          >
            <span className={styles.moduleIcon} aria-hidden="true">
              {module.icon}
            </span>
            <span className={styles.moduleLabel}>{module.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.panelContent}>
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>{activeLabel}</span>
          <button
            ref={sheetCloseRef}
            type="button"
            className={styles.sheetClose}
            aria-label="关闭侧栏面板"
            onClick={() => {
              playClose();
              setSheetOpen(false);
            }}
          >
            ×
          </button>
        </div>

        {activePanel === 'today' ? (
          <TodayPanel
            tasks={tasks}
            onCreateTask={onCreateTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onUpdateTask={onUpdateTask}
          />
        ) : null}
        {activePanel === 'planner' ? <PlannerPanel /> : null}
        {activePanel === 'focus' ? (
          <FocusPanel sessions={focusSessions} onComplete={onRecordFocusSession} />
        ) : null}
        {activePanel === 'settings' ? (
          <>
            <SettingsPanel
              mood={mood}
              onChangeMood={setMood}
              storageError={storageError}
              counts={{
                tasks: tasks.length,
                focusSessions: focusSessions.length,
              }}
              onExportData={onExportData}
              onClearData={onClearData}
            />
            <section className={styles.widthControl}>
              <h3 className={styles.widthTitle}>侧栏宽度</h3>
              <p className={styles.widthNote}>拖动右侧边缘调整，或双击边缘复位。</p>
              <button type="button" className={styles.widthReset} onClick={layout.resetWidth}>
                重置侧栏宽度（300px）
              </button>
            </section>
          </>
        ) : null}
      </div>

      {!isMobile && layout.expanded ? (
        <SidebarResizeHandle
          width={layout.width}
          minWidth={SIDEBAR_MIN_WIDTH}
          maxWidth={SIDEBAR_MAX_WIDTH}
          onWidthChange={layout.setWidth}
          onDraggingChange={layout.setDragging}
          onReset={layout.resetWidth}
        />
      ) : null}
    </aside>
  );
}
