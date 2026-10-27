import { useEffect, useId, useRef } from 'react';
import { MOOD_EMOTIONS, MOOD_NOTE_EMOTION_MAX_LENGTH } from './journal';
import styles from './MoodNoteEditor.module.css';

interface EmotionPickerProps {
  emotion: string | null;
  custom: string;
  onSelect: (emotion: string) => void;
  onCustomChange: (value: string) => void;
}

// 左侧「自己写」输入框 + 右侧可上下滑动的 22 个内置词块。
export default function EmotionPicker({
  emotion,
  custom,
  onSelect,
  onCustomChange,
}: EmotionPickerProps) {
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const customInputId = useId();

  useEffect(() => {
    firstOptionRef.current?.focus();
  }, []);

  return (
    <div className={styles.field}>
      <span className={styles.label}>
        情绪 <span className={styles.required}>*</span>
      </span>
      <div className={styles.emotionRow}>
        <div className={styles.customField}>
          <label className={styles.customLabel} htmlFor={customInputId}>
            自己写
          </label>
          <input
            id={customInputId}
            className={styles.customInput}
            value={custom}
            maxLength={MOOD_NOTE_EMOTION_MAX_LENGTH}
            placeholder="例如：释然"
            onChange={(event) => onCustomChange(event.target.value)}
          />
          <p className={styles.hint}>
            {emotion ? `已选：${emotion}` : '内置词或自己写，最多 16 字'}
          </p>
        </div>
        <div className={styles.emotionScroll} role="group" aria-label="选择情绪">
          {MOOD_EMOTIONS.map((word, index) => (
            <button
              key={word}
              ref={index === 0 ? firstOptionRef : undefined}
              type="button"
              className={styles.emotionButton}
              aria-pressed={emotion === word && custom.trim().length === 0}
              onClick={() => onSelect(word)}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
