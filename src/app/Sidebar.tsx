import type { MoodId, Task } from '../lib/types';
import FocusTimer from '../features/focus/FocusTimer';
import SettingsPanel from '../features/settings/SettingsPanel';
import SidebarResizeHandle from './SidebarResizeHandle';
import { MoodPanel, TodayPanel } from './SidebarPanels';
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
  { id: 'focus', label: '专注', icon: '⏳' },
  { id: 'mood', label: '情绪', icon: '🌤️' },
  { id: 'settings', label: '设置', icon: '⚙️' },
];

interface SidebarProps {
  layout: SidebarLayout;
  mood: MoodId;
  tasks: readonly Task[];
  setMood: (mood: MoodId) => void;
  onAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onClearData: () => void;
  storageError: boolean;
  initialPanel?: SidebarPanelId | null;
}

export default function Sidebar({
  layout,
  mood,
  tasks,
  setMood,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onClearData,
  storageError,
  initialPanel = null,
}: SidebarProps) {
  const { activePanel, sheetOpen, isMobile, sheetCloseRef, navRefs, setSheetOpen, handleSelect } =
    useSidebarPanels(initialPanel, layout);
  const activeLabel = MODULES.find((module) => module.id === activePanel)?.label ?? '今日';

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
          onClick={layout.toggle}
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
            onClick={() => handleSelect(module.id)}
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
            onClick={() => setSheetOpen(false)}
          >
            ×
          </button>
        </div>

        {activePanel === 'today' ? (
          <TodayPanel
            tasks={tasks}
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
          />
        ) : null}
        {activePanel === 'focus' ? <FocusTimer /> : null}
        {activePanel === 'mood' ? <MoodPanel mood={mood} /> : null}
        {activePanel === 'settings' ? (
          <>
            <SettingsPanel
              mood={mood}
              onChangeMood={setMood}
              storageError={storageError}
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
