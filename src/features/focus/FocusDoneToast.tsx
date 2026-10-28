import { useCallback, useEffect, useRef } from 'react';
import { DONE_CUE_MAX_PLAYS, DONE_CUE_REPEAT_INTERVAL_MS } from '../../lib/audio';
import styles from './focus.module.css';

interface FocusDoneToastProps {
  onDismiss: () => void;
  /** 重复提醒音；首次已在完成时由 FocusTimer 播放。 */
  onChime: () => void;
}

// 完成提示：一直保留到点「知道了」；未关闭时每 3 秒再响一次，最多 10 次（含首次）。
export default function FocusDoneToast({ onDismiss, onChime }: FocusDoneToastProps) {
  const chimeRef = useRef(onChime);
  const timerRef = useRef<number | null>(null);
  chimeRef.current = onChime;

  const stopRepeating = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let played = 1;
    timerRef.current = window.setInterval(() => {
      played += 1;
      chimeRef.current();
      if (played >= DONE_CUE_MAX_PLAYS) {
        stopRepeating();
      }
    }, DONE_CUE_REPEAT_INTERVAL_MS);
    return stopRepeating;
  }, [stopRepeating]);

  const handleDismiss = () => {
    stopRepeating();
    onDismiss();
  };

  return (
    <div className={styles.toast} role="status">
      <p className={styles.toastText}>专注完成！休息一下吧。</p>
      <button type="button" className={styles.toastButton} onClick={handleDismiss}>
        知道了
      </button>
    </div>
  );
}
