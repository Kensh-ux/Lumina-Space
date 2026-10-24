import { useEffect } from 'react';
import type { FocusSession } from '../../lib/types';
import { formatMinutes, getTodayFocusStats, getWeekFocusStats } from '../../lib/data';
import { useAudio } from '../../lib/AudioProvider';
import styles from './FocusStats.module.css';

interface FocusStatsProps {
  sessions: readonly FocusSession[];
}

export default function FocusStats({ sessions }: FocusStatsProps) {
  const today = getTodayFocusStats(sessions);
  const week = getWeekFocusStats(sessions);
  const todayMinutes = Math.floor(today.seconds / 60);
  const weekMinutes = Math.floor(week.seconds / 60);
  const { muted, whiteNoiseOn, toggleWhiteNoise, stopWhiteNoise, playClick } = useAudio();

  useEffect(() => {
    return () => stopWhiteNoise();
  }, [stopWhiteNoise]);

  return (
    <section className={styles.stats} aria-label="专注统计">
      <h3 className={styles.title}>专注统计</h3>
      {sessions.length === 0 ? (
        <p className={styles.empty}>完成一次番茄钟后，这里会出现统计。</p>
      ) : (
        <>
          <p className={styles.today}>
            今日 · 专注 {formatMinutes(todayMinutes)} · {today.count} 次
          </p>
          <p className={styles.week}>
            本周 {week.count} 次 · {formatMinutes(weekMinutes)}
          </p>
        </>
      )}

      <div className={styles.sound}>
        <button
          type="button"
          className={styles.soundButton}
          aria-pressed={whiteNoiseOn}
          disabled={muted}
          onClick={() => {
            playClick();
            toggleWhiteNoise();
          }}
        >
          <span aria-hidden="true">{whiteNoiseOn ? '🔊' : '🔈'}</span>
          白噪音 {whiteNoiseOn ? '开' : '关'}
        </button>
        <p className={styles.soundHint}>
          {muted ? '声音已关闭；到设置里开启后可用白噪音。' : '低音量循环，切换面板会自动停止。'}
        </p>
      </div>
    </section>
  );
}
