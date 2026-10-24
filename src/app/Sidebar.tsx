import { useCallback, useEffect, useRef, useState } from 'react';
import type { MoodId, Task } from '../lib/types';
import { closeOverlay, getActiveOverlay, openOverlay, subscribeOverlay } from '../lib/overlay';
import FocusTimer from '../features/focus/FocusTimer';
import SettingsPanel from '../features/settings/SettingsPanel';
import SidebarResizeHandle from './SidebarResizeHandle';
import { MoodPanel, TodayPanel } from './SidebarPanels';
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  type SidebarLayout,
} from './useSidebar';
import styles from './Sidebar.module.css';

export type SidebarPanelId = 'today' | 'focus' | 'mood' | 'settings';

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
  const [activePanel, setActivePanel] = useState<SidebarPanelId>(initialPanel ?? 'today');
  const [sheetOpen, setSheetOpen] = useState(Boolean(initialPanel));
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1119px)').matches,
  );
  const sheetOpenRef = useRef(sheetOpen);
  sheetOpenRef.current = sheetOpen;
  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  const navRefs = useRef<Record<SidebarPanelId, HTMLButtonElement | null>>({
    today: null,
    focus: null,
    mood: null,
    settings: null,
  });
  const firstSheetEffectRef = useRef(true);
  const previousSheetRef = useRef(sheetOpen);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1119px)');
    const handleChange = () => setIsMobile(query.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // 只有移动端 sheet 参与 overlay 协调；桌面侧栏是布局的一部分。
  useEffect(() => {
    if (!isMobile || !sheetOpen) {
      if (getActiveOverlay() === 'sidebar') {
        closeOverlay('sidebar');
      }
      return;
    }
    openOverlay('sidebar');
    return () => {
      if (getActiveOverlay() === 'sidebar') {
        closeOverlay('sidebar');
      }
    };
  }, [isMobile, sheetOpen]);

  // 打开圆盘等其它浮层时，sheet 自动收起。
  useEffect(() => {
    return subscribeOverlay((activeId) => {
      if (activeId !== null && activeId !== 'sidebar' && sheetOpenRef.current) {
        setSheetOpen(false);
      }
    });
  }, []);

  // sheet 打开时焦点到关闭按钮，关闭时回对应导航项；首帧预览不抢焦点。
  useEffect(() => {
    if (firstSheetEffectRef.current) {
      firstSheetEffectRef.current = false;
      previousSheetRef.current = sheetOpen;
      return;
    }
    if (isMobile && sheetOpen) {
      sheetCloseRef.current?.focus();
    } else if (isMobile && previousSheetRef.current) {
      navRefs.current[activePanel]?.focus();
    }
    previousSheetRef.current = sheetOpen;
  }, [isMobile, sheetOpen, activePanel]);

  // Esc：圆盘优先；否则移动端收 sheet、桌面收起侧栏。
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || getActiveOverlay() === 'mood-dial') {
        return;
      }
      if (isMobile && sheetOpen) {
        event.preventDefault();
        setSheetOpen(false);
        return;
      }
      if (!isMobile && layout.expanded) {
        event.preventDefault();
        layout.collapse();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, sheetOpen, layout.expanded, layout.collapse]);

  const handleSelect = useCallback(
    (id: SidebarPanelId) => {
      setActivePanel(id);
      if (isMobile) {
        setSheetOpen((previous) => !(previous && activePanel === id));
        return;
      }
      if (!layout.expanded) {
        layout.expand();
      }
    },
    [isMobile, activePanel, layout],
  );

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
