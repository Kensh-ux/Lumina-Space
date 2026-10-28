import { useEffect } from 'react';
import styles from './focus.module.css';

const TOAST_DURATION_MS = 6000;

interface FocusDoneToastProps {
  onDismiss: () => void;
}

// 右下角完成提示：6 秒自动消失，也可以点「知道了」立即关闭。
export default function FocusDoneToast({ onDismiss }: FocusDoneToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={styles.toast} role="status">
      <p className={styles.toastText}>专注完成！休息一下吧。</p>
      <button type="button" className={styles.toastButton} onClick={onDismiss}>
        知道了
      </button>
    </div>
  );
}