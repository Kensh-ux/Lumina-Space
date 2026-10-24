import { useEffect, useId, useRef, useState } from 'react';
import {
  clampMinutes,
  formatDuration,
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
  RECOMMENDED_MINUTES,
  type TimerStatus,
} from './timer';
import { useFocusTimer } from './useFocusTimer';
import styles from './focus.module.css';

const STATUS_LABELS: Record<TimerStatus, string> = {
  idle: '准备好了',
  running: '专注中',
  paused: '已暂停',
  done: '完成',
};

export default function FocusTimer({
  onComplete,
}: {
  onComplete?: (durationSec: number) => void;
}) {
  const { state, setMinutes, startTimer, pauseTimer, resumeTimer, resetTimer, restartTimer } =
    useFocusTimer();
  const inputId = useId();
  const currentMinutes = Math.round(state.durationSec / 60);
  const [minutesInput, setMinutesInput] = useState(String(currentMinutes));
  const previousStatusRef = useRef(state.status);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setMinutesInput(String(currentMinutes));
  }, [currentMinutes]);

  // 只在 running → done 的那次记录；重启后下一次 done 会再次记录。
  useEffect(() => {
    if (previousStatusRef.current !== 'done' && state.status === 'done') {
      onCompleteRef.current?.(state.durationSec);
    }
    previousStatusRef.current = state.status;
  }, [state.status, state.durationSec]);

  const commitMinutes = (): number => {
    const parsed = Number.parseInt(minutesInput, 10);
    const clamped = clampMinutes(Number.isFinite(parsed) ? parsed : currentMinutes);
    setMinutes(clamped);
    setMinutesInput(String(clamped));
    return clamped;
  };

  const handleStart = () => {
    if (state.status === 'done') {
      restartTimer();
      return;
    }
    if (state.status === 'idle') {
      commitMinutes();
    }
    startTimer();
  };

  return (
    <div className={styles.timer} data-status={state.status}>
      <p className={styles.time} role="timer" aria-live="off">
        {formatDuration(state.remainingSec)}
      </p>
      <p className={styles.status} role="status">
        {STATUS_LABELS[state.status]}
      </p>

      <div className={styles.controls}>
        {state.status === 'idle' ? (
          <button type="button" className={styles.primary} onClick={handleStart}>
            开始
          </button>
        ) : null}
        {state.status === 'running' ? (
          <button type="button" className={styles.primary} onClick={pauseTimer}>
            暂停
          </button>
        ) : null}
        {state.status === 'paused' ? (
          <button type="button" className={styles.primary} onClick={resumeTimer}>
            继续
          </button>
        ) : null}
        {state.status === 'done' ? (
          <button type="button" className={styles.primary} onClick={restartTimer}>
            再来一次
          </button>
        ) : null}
        {state.status !== 'idle' ? (
          <button type="button" className={styles.secondary} onClick={resetTimer}>
            重置
          </button>
        ) : null}
      </div>

      <div className={styles.duration}>
        <label className={styles.durationLabel} htmlFor={inputId}>
          自定义
        </label>
        <input
          id={inputId}
          className={styles.minutesInput}
          type="number"
          inputMode="numeric"
          min={MIN_DURATION_MIN}
          max={MAX_DURATION_MIN}
          value={minutesInput}
          disabled={state.status !== 'idle'}
          onChange={(event) => setMinutesInput(event.target.value)}
          onBlur={() => {
            commitMinutes();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitMinutes();
            }
          }}
        />
        <span className={styles.durationUnit}>分钟</span>
      </div>

      <div className={styles.presets} role="group" aria-label="常用专注时长">
        <span className={styles.presetsLabel}>常用</span>
        {RECOMMENDED_MINUTES.map((minutes) => (
          <button
            key={minutes}
            type="button"
            className={styles.presetButton}
            aria-pressed={currentMinutes === minutes}
            disabled={state.status !== 'idle'}
            onClick={() => {
              setMinutesInput(String(minutes));
              setMinutes(minutes);
            }}
          >
            {minutes}
          </button>
        ))}
      </div>
    </div>
  );
}
