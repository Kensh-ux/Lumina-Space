import { useState } from 'react';
import type { CSSProperties } from 'react';
import MoodDial from '../features/mood/MoodDial';
import Sidebar, { type SidebarPanelId } from './Sidebar';
import Stage from './Stage';
import TodayOrb from './TodayOrb';
import { useAppData } from './useAppData';
import { SIDEBAR_COLLAPSED_WIDTH, useSidebar } from './useSidebar';
import styles from './App.module.css';

// 仅开发/截图使用：?panel=today|focus|settings 打开对应侧栏模块。
function readDevParam(name: string): string | null {
  if (!import.meta.env.DEV) {
    return null;
  }
  return new URLSearchParams(window.location.search).get(name);
}

function readInitialPanel(): SidebarPanelId | null {
  const value = readDevParam('panel');
  return value === 'today' || value === 'focus' || value === 'settings' ? value : null;
}

// 仅开发/截图使用：?sidebar=collapsed 让侧栏默认收起。
function readInitialSidebarExpanded(): boolean {
  return readDevParam('sidebar') !== 'collapsed';
}

// 仅开发/截图使用：?dial=open 让情绪圆盘默认展开。
function readDialOpen(): boolean {
  return readDevParam('dial') === 'open';
}

function App() {
  const {
    mood,
    tasks,
    focusSessions,
    setMood,
    createTask,
    toggleTask,
    deleteTask,
    updateTask,
    clearCompletedTasks,
    recordFocusSession,
    exportData,
    clearAppData,
    storageError,
  } = useAppData();
  const sidebar = useSidebar(readInitialSidebarExpanded());
  const [initialPanel] = useState<SidebarPanelId | null>(readInitialPanel);
  const [dialOpen] = useState(readDialOpen);
  const [orbOpen, setOrbOpen] = useState(false);
  const sidebarWidth = sidebar.expanded ? sidebar.width : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <div
      className={styles.app}
      data-mood={mood}
      data-dragging={sidebar.dragging}
      data-orb-open={orbOpen}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
    >
      <Sidebar
        layout={sidebar}
        mood={mood}
        tasks={tasks}
        focusSessions={focusSessions}
        setMood={setMood}
        onCreateTask={createTask}
        onToggleTask={toggleTask}
        onDeleteTask={deleteTask}
        onUpdateTask={updateTask}
        onRecordFocusSession={recordFocusSession}
        onExportData={exportData}
        onClearData={clearAppData}
        storageError={storageError}
        initialPanel={initialPanel}
      />

      <main className={styles.main}>
        <Stage mood={mood} tasks={tasks} focusSessions={focusSessions} orbOpen={orbOpen} />

        <header className={styles.topbar}>
          <p className={styles.wordmark}>Lumina-Space</p>
          <h1 className={styles.headline}>今天感觉怎么样？</h1>
        </header>

        <MoodDial current={mood} onChange={setMood} defaultOpen={dialOpen} />

        <TodayOrb
          tasks={tasks}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
          onUpdateTask={updateTask}
          onCreateTask={createTask}
          onClearCompletedTasks={clearCompletedTasks}
          onOpenChange={setOrbOpen}
        />
      </main>

      {storageError ? (
        <p className={styles.status} role="status">
          本地存储不可用，本次改动不会被记住。
        </p>
      ) : null}
    </div>
  );
}

export default App;
