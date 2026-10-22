import { useState } from 'react';
import MoodPicker from '../features/mood/MoodPicker';
import { useMood } from '../features/mood/useMood';
import Sidebar, { type PanelId } from './Sidebar';
import Stage from './Stage';
import styles from './App.module.css';

// 仅开发/截图使用：?panel=today 打开对应侧边栏面板，生产构建不生效。
function readInitialPanel(): PanelId | null {
  if (!import.meta.env.DEV) {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get('panel');
  return value === 'today' || value === 'focus' || value === 'settings' ? value : null;
}

function App() {
  const { mood, setMood, storageError } = useMood();
  const [initialPanel] = useState<PanelId | null>(readInitialPanel);

  return (
    <div className={styles.app} data-mood={mood}>
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <p className={styles.wordmark}>Lumina-Space</p>
          <h1 className={styles.headline}>今天感觉怎么样？</h1>
          <MoodPicker current={mood} onChange={setMood} />
        </div>
      </header>

      <main className={styles.main}>
        <Stage mood={mood} />
      </main>

      <Sidebar initialPanel={initialPanel} />

      {storageError ? (
        <p className={styles.status} role="status">
          本地存储不可用，本次选择不会被记住。
        </p>
      ) : null}
    </div>
  );
}

export default App;
