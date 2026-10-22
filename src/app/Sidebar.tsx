import { useEffect, useState } from 'react';
import styles from './Sidebar.module.css';

export type PanelId = 'today' | 'focus' | 'settings';

interface PanelMeta {
  id: PanelId;
  label: string;
  icon: string;
  kicker: string;
  title: string;
  body: string;
}

const PANELS: readonly PanelMeta[] = [
  {
    id: 'today',
    label: '今日',
    icon: '📋',
    kicker: '今日',
    title: '今日任务',
    body: '任务清单会在下一张任务卡接入，这里先保留位置。',
  },
  {
    id: 'focus',
    label: '专注',
    icon: '⏳',
    kicker: '专注',
    title: '专注计时',
    body: '番茄钟与专注记录属于后续版本，这里先保留位置。',
  },
  {
    id: 'settings',
    label: '设置',
    icon: '⚙️',
    kicker: '设置',
    title: '偏好设置',
    body: '主题、数据与隐私选项会在后续版本接入。',
  },
];

interface SidebarProps {
  initialPanel?: PanelId | null;
}

export default function Sidebar({ initialPanel = null }: SidebarProps) {
  const [openPanel, setOpenPanel] = useState<PanelId | null>(initialPanel);

  useEffect(() => {
    if (!openPanel) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPanel(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openPanel]);

  return (
    <aside className={styles.sidebar} aria-label="快捷功能">
      {PANELS.map((panel) => (
        <section
          key={panel.id}
          id={`panel-${panel.id}`}
          className={styles.panel}
          hidden={openPanel !== panel.id}
          aria-labelledby={`panel-title-${panel.id}`}
        >
          <p className={styles.panelKicker}>{panel.kicker}</p>
          <h2 id={`panel-title-${panel.id}`} className={styles.panelTitle}>
            {panel.title}
          </h2>
          <p className={styles.panelBody}>{panel.body}</p>
          <p className={styles.panelNote}>占位面板 · 功能未接入</p>
        </section>
      ))}

      <nav className={styles.rail} aria-label="功能入口">
        {PANELS.map((panel) => {
          const expanded = openPanel === panel.id;
          return (
            <button
              key={panel.id}
              type="button"
              className={styles.railButton}
              aria-expanded={expanded}
              aria-controls={`panel-${panel.id}`}
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
