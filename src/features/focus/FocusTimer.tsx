import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  clampMinutes,
  formatDuration,
  MAX_DURATION_MIN,
  MIN_DURATION_MIN,
  RECOMMENDED_MINUTES,
  type TimerStatus,
} from './timer';
import { useFocusTimer } from './useFocusTimer';
import { useAudio } from '../../lib/AudioProvider';
import FocusDoneToast from './FocusDoneToast';
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
  const { playClick, playDone } = useAudio();
  const inputId = useId();
  const currentMinutes = Math.round(state.durationSec / 60);
  const [minutesInput, setMinutesInput] = useState(String(currentMinutes));
  const [toastVisible, setToastVisible] = useState(false);
  const previousStatusRef = useRef(state.status);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setMinutesInput(String(currentMinutes));
  }, [currentMinutes]);

  const dismissToast = useCallback(() => setToastVisible(false), []);

  // 只在 running → done 的那次记录；重启后下一次 done 会再次记录。
  useEffect(() => {
    if (previousStatusRef.current === 'running' && state.status === 'done') {
      onCompleteRef.current?.(state.durationSec);
      playDone();
      setToastVisible(true);
    } else if (state.status !== 'done') {
      // 重新开始 / 重置 / 离开完成态：收起提示卡（卸载即清掉重复提醒定时器）。
      setToastVisible(false);
    }
    previousStatusRef.current = state.status;
  }, [state.status, state.durationSec, playDone]);

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
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              playClick();
              handleStart();
            }}
          >
            开始
          </button>
        ) : null}
        {state.status === 'running' ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              playClick();
              pauseTimer();
            }}
          >
            暂停
          </button>
        ) : null}
        {state.status === 'paused' ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              playClick();
              resumeTimer();
            }}
          >
            继续
          </button>
        ) : null}
        {state.status === 'done' ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              playClick();
              restartTimer();
            }}
          >
            再来一次
          </button>
        ) : null}
        {state.status !== 'idle' ? (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              playClick();
              resetTimer();
            }}
          >
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
              playClick();
              setMinutesInput(String(minutes));
              setMinutes(minutes);
            }}
          >
            {minutes}
          </button>
        ))}
      </div>
      {toastVisible ? <FocusDoneToast onDismiss={dismissToast} onChime={playDone} /> : null}
    </div>
  );
}
