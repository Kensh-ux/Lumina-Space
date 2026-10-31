import { roomUrl } from '../../lib/mode';
import styles from './ModeSwitch.module.css';

interface ModeSwitchProps {
  onPlayClick?: () => void;
}

/**
 * 设置里的「转换模式」。
 * 当前模式不是按钮，3D 入口是真实链接，保证键盘、中键和新标签行为正常。
 */
export default function ModeSwitch({ onPlayClick }: ModeSwitchProps) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>转换模式</h3>
      <div className={styles.row} role="group" aria-label="选择模式">
        <div className={styles.current} aria-current="true">
          <span className={styles.badge}>当前</span>
          <strong className={styles.title}>简易模式</strong>
          <span className={styles.desc}>Canvas 场景，轻量，任何设备都能跑。</span>
        </div>
        <a className={styles.link} href={roomUrl()} onClick={onPlayClick}>
          <span className={styles.badge}>切换</span>
          <strong className={styles.title}>窗畔 3D</strong>
          <span className={styles.desc}>可走入的房间与 18 种窗外光景。</span>
        </a>
      </div>
      <p className={styles.note}>
        两种模式共用任务、情绪记录与专注历史；切换会刷新页面，进行中的计时不会带过去。
      </p>
    </section>
  );
}