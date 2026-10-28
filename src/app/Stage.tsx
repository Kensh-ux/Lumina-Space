import { useRef, useState } from 'react';
import type { FocusSession, MoodId, Task } from '../lib/types';
import { getMoodMeta } from '../features/mood/mood';
import { countTasks } from '../features/tasks/task';
import { getTodayFocusStats } from '../lib/data';
import { formatHeroDate, formatTodaySummary, getGreeting } from '../lib/greeting';
import ConfirmDialog from '../lib/ConfirmDialog';
import MoodScene from './MoodScene';
import styles from './Stage.module.css';

interface StageProps {
  mood: MoodId;
  tasks: readonly Task[];
  focusSessions: readonly FocusSession[];
  /** 当前情绪的 data URL；有值时用它替换 Canvas / CSS 场景。 */
  background?: string;
  orbOpen?: boolean;
}

export default function Stage({
  mood,
  tasks,
  focusSessions,
  background,
  orbOpen = false,
}: StageProps) {
  const meta = getMoodMeta(mood);
  const counts = countTasks(tasks);
  const focusMinutes = Math.floor(getTodayFocusStats(focusSessions).seconds / 60);
  const stageRef = useRef<HTMLElement>(null);
  const [heroHidden, setHeroHidden] = useState(false);
  const [confirmingHide, setConfirmingHide] = useState(false);
  // 只在「有自定义背景」时才需要隐藏欢迎语；背景被清除后欢迎语重新出现，
  // 内存里的隐藏状态仍保留，下次再有背景时继续生效（不写 localStorage）。
  const heroVisible = !background || !heroHidden;

  return (
    <section
      ref={stageRef}
      className={styles.stage}
      data-mood={mood}
      data-orb-open={orbOpen}
      tabIndex={-1}
      aria-label="主界面"
    >
      <div className={styles.scene} aria-hidden="true">
        {background ? (
          <>
            <div
              className={styles.customImage}
              style={{ backgroundImage: `url(${background})` }}
            />
            <div className={styles.customShade} />
          </>
        ) : (
          <>
            <div className={`${styles.layer} ${styles.layerPositive}`} />
            <div className={`${styles.layer} ${styles.layerNeutral}`} />
            <div className={`${styles.layer} ${styles.layerNegative}`} />
            <div className={styles.aurora} />
            <MoodScene mood={mood} />
          </>
        )}
      </div>

      {heroVisible ? (
        <div className={styles.hero} data-on-image={background ? 'true' : undefined}>
          {background ? (
            <button
              type="button"
              className={styles.hideHeroButton}
              aria-label="隐藏欢迎语"
              onClick={() => setConfirmingHide(true)}
            >
              ×
            </button>
          ) : null}
          <h2 className={styles.greeting}>{getGreeting()}</h2>
          <p className={styles.date}>{formatHeroDate()}</p>
          <p className={styles.mood}>
            {meta.label} · {meta.description}
          </p>
          <p className={styles.summary}>
            {formatTodaySummary(counts.open, counts.done, focusMinutes)}
          </p>
        </div>
      ) : null}

      {confirmingHide ? (
        <ConfirmDialog
          title="是否确认隐藏？"
          message="刷新界面可恢复。"
          confirmLabel="隐藏"
          onConfirm={() => {
            setConfirmingHide(false);
            setHeroHidden(true);
          }}
          onCancel={() => setConfirmingHide(false)}
          // 确认后 × 随欢迎语一起移除，焦点退到主界面容器。
          fallbackFocusRef={stageRef}
        />
      ) : null}
    </section>
  );
}
