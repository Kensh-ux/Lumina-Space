import {
  clampMoodScore,
  formatMoodScore,
  MOOD_NOTE_SCORE_MAX,
  MOOD_NOTE_SCORE_MIN,
  parseMoodScore,
} from './journal';
import styles from './MoodNoteEditor.module.css';

interface MoodScoreFieldProps {
  inputId: string;
  scoreText: string;
  onChange: (scoreText: string) => void;
}

// 滑块 + 数字输入组合：越界钳制、非数字按 0，两者共用同一份 scoreText。
export default function MoodScoreField({ inputId, scoreText, onChange }: MoodScoreFieldProps) {
  const score = parseMoodScore(scoreText);

  const handleText = (raw: string) => {
    if (raw.trim().length === 0) {
      onChange(raw);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      onChange('0');
      return;
    }
    const clamped = clampMoodScore(parsed);
    onChange(clamped === parsed ? raw : String(clamped));
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        事件好感值 · {formatMoodScore(score)}
      </label>
      <div className={styles.scoreRow}>
        <input
          id={`${inputId}-range`}
          className={styles.range}
          type="range"
          min={MOOD_NOTE_SCORE_MIN}
          max={MOOD_NOTE_SCORE_MAX}
          step={1}
          value={score}
          aria-label="事件好感值滑块"
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          id={inputId}
          className={styles.scoreInput}
          type="number"
          min={MOOD_NOTE_SCORE_MIN}
          max={MOOD_NOTE_SCORE_MAX}
          step={1}
          value={scoreText}
          onChange={(event) => handleText(event.target.value)}
          onBlur={() => onChange(String(parseMoodScore(scoreText)))}
        />
      </div>
      <p className={styles.hint}>
        范围 {MOOD_NOTE_SCORE_MIN} ~ {MOOD_NOTE_SCORE_MAX}，超出会自动钳制。
      </p>
    </div>
  );
}
