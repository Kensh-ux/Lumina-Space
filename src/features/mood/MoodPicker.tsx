import { MOODS, type MoodId } from './mood';
import styles from './MoodPicker.module.css';

interface MoodPickerProps {
  current: MoodId;
  onChange: (mood: MoodId) => void;
}

export default function MoodPicker({ current, onChange }: MoodPickerProps) {
  return (
    <div className={styles.picker} role="group" aria-label="选择当前情绪">
      {MOODS.map((mood) => (
        <button
          key={mood.id}
          type="button"
          className={styles.button}
          aria-pressed={current === mood.id}
          onClick={() => onChange(mood.id)}
        >
          <span className={styles.emoji} aria-hidden="true">
            {mood.emoji}
          </span>
          <span className={styles.label}>{mood.label}</span>
        </button>
      ))}
    </div>
  );
}
