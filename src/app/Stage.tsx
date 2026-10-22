import type { MoodId } from '../lib/types';
import { getMoodMeta } from '../features/mood/mood';
import styles from './Stage.module.css';

interface StageProps {
  mood: MoodId;
}

const RAIN_DROPS = 12;

export default function Stage({ mood }: StageProps) {
  const meta = getMoodMeta(mood);

  return (
    <section className={styles.stage} data-mood={mood} aria-label="主界面">
      <div className={styles.scene} aria-hidden="true">
        <div className={`${styles.layer} ${styles.layerPositive}`} />
        <div className={`${styles.layer} ${styles.layerNeutral}`} />
        <div className={`${styles.layer} ${styles.layerNegative}`} />
        <div className={styles.sun} />
        <div className={styles.cloudLayer}>
          <span className={`${styles.cloud} ${styles.cloudA}`} />
          <span className={`${styles.cloud} ${styles.cloudB}`} />
        </div>
        <div className={styles.rainLayer}>
          {Array.from({ length: RAIN_DROPS }, (_, index) => (
            <span key={`drop-${index}`} className={styles.rainDrop} />
          ))}
        </div>
      </div>

      <article className={styles.card}>
        <p className={styles.eyebrow}>当前情绪 · {meta.label}</p>
        <h2 className={styles.title}>今天想做什么？</h2>
        <p className={styles.text}>{meta.description}。先感受一下现在的界面，再决定下一步。</p>
        <p className={styles.placeholder}>任务模块将在下一张任务卡接入。</p>
      </article>
    </section>
  );
}
