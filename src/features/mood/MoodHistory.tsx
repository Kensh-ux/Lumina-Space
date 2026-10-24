import type { MoodEntry, MoodId } from '../../lib/types';
import { getRecentMoodDays } from '../../lib/data';
import { toLocalDateString } from '../../lib/date';
import { getMoodMeta } from './mood';
import styles from './MoodHistory.module.css';

interface MoodHistoryProps {
  mood: MoodId;
  log: readonly MoodEntry[];
}

export default function MoodHistory({ mood, log }: MoodHistoryProps) {
  const today = toLocalDateString();
  const currentMeta = getMoodMeta(mood);
  const days = getRecentMoodDays(log);

  return (
    <section className={styles.history} aria-label="情绪记录">
      <p className={styles.current}>
        <span aria-hidden="true">{currentMeta.emoji}</span>
        <span>今日情绪 · {currentMeta.label}</span>
      </p>

      {log.length === 0 ? (
        <p className={styles.empty}>还没有记录；切换一次情绪就会记下。</p>
      ) : (
        <ul className={styles.days} aria-label="最近 7 天情绪">
          {days.map((day) => {
            const meta = day.mood ? getMoodMeta(day.mood) : null;
            const label = meta ? `${day.date} ${meta.label}` : `${day.date} 无记录`;
            return (
              <li
                key={day.date}
                className={styles.day}
                data-today={day.date === today}
                data-mood={day.mood ?? 'none'}
              >
                <span className={styles.dot} role="img" aria-label={label} title={label}>
                  {meta ? meta.emoji : '·'}
                </span>
                <span className={styles.label} aria-hidden="true">
                  {day.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
