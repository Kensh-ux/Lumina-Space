import type { FocusSession, MoodId, Task } from '../lib/types';
import { getMoodMeta } from '../features/mood/mood';
import { countTasks } from '../features/tasks/task';
import { getTodayFocusStats } from '../lib/data';
import { formatHeroDate, formatTodaySummary, getGreeting } from '../lib/greeting';
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

  return (
    <section
      className={styles.stage}
      data-mood={mood}
      data-orb-open={orbOpen}
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

      <div className={styles.hero} data-on-image={background ? 'true' : undefined}>
        <h2 className={styles.greeting}>{getGreeting()}</h2>
        <p className={styles.date}>{formatHeroDate()}</p>
        <p className={styles.mood}>
          {meta.label} · {meta.description}
        </p>
        <p className={styles.summary}>
          {formatTodaySummary(counts.open, counts.done, focusMinutes)}
        </p>
      </div>
    </section>
  );
}
