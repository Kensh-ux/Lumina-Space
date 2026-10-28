import type { FocusSession } from '../../lib/types';
import { formatMinutes, getTodayFocusStats, getTotalFocusStats } from '../../lib/data';
import styles from './FocusStats.module.css';

interface FocusStatsProps {
  sessions: readonly FocusSession[];
  onClear: () => void;
}

export default function FocusStats({ sessions, onClear }: FocusStatsProps) {
  const today = getTodayFocusStats(sessions);
  const total = getTotalFocusStats(sessions);
  const todayMinutes = Math.floor(today.seconds / 60);
  const totalMinutes = Math.floor(total.seconds / 60);
  // 无数据时不隐藏按钮：用 aria-disabled + no-op 保持可聚焦，清空后焦点有处可回。
  const empty = sessions.length === 0;

  return (
    <section className={styles.stats} aria-label="专注统计">
      <h3 className={styles.title}>专注统计</h3>
      {empty ? (
        <p className={styles.empty}>完成一次番茄钟后，这里会出现统计。</p>
      ) : (
        <>
          <p className={styles.today}>
            今日 · 专注 {formatMinutes(todayMinutes)} · {today.count} 次
          </p>
          <p className={styles.total}>
            总计 {total.count} 次 · {formatMinutes(totalMinutes)}
          </p>
        </>
      )}
      <button
        type="button"
        className={styles.clearButton}
        aria-disabled={empty}
        onClick={() => {
          if (!empty) {
            onClear();
          }
        }}
      >
        清除专注数据
      </button>
    </section>
  );
}
