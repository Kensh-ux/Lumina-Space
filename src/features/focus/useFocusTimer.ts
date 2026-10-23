import { useCallback, useEffect, useState } from 'react';
import {
  createTimer,
  DEFAULT_DURATION_MIN,
  pause,
  reset,
  resume,
  setDuration,
  start,
  tick,
  type TimerState,
} from './timer';

export interface UseFocusTimerResult {
  state: TimerState;
  setMinutes: (minutes: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  restartTimer: () => void;
}

export function useFocusTimer(initialMinutes: number = DEFAULT_DURATION_MIN): UseFocusTimerResult {
  const [state, setState] = useState<TimerState>(() => createTimer(initialMinutes));

  useEffect(() => {
    if (state.status !== 'running') {
      return;
    }
    // 250ms 只为让秒数切换及时；每次都用 tick 里的 endAt - now 重算，不累加。
    const intervalId = window.setInterval(() => {
      setState((prev) => tick(prev, Date.now()));
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [state.status]);

  const setMinutes = useCallback((minutes: number) => {
    setState((prev) => setDuration(prev, minutes));
  }, []);

  const startTimer = useCallback(() => {
    setState((prev) => start(prev, Date.now()));
  }, []);

  const pauseTimer = useCallback(() => {
    setState((prev) => pause(prev, Date.now()));
  }, []);

  const resumeTimer = useCallback(() => {
    setState((prev) => resume(prev, Date.now()));
  }, []);

  const resetTimer = useCallback(() => {
    setState((prev) => reset(prev));
  }, []);

  const restartTimer = useCallback(() => {
    setState((prev) => start(reset(prev), Date.now()));
  }, []);

  return { state, setMinutes, startTimer, pauseTimer, resumeTimer, resetTimer, restartTimer };
}
