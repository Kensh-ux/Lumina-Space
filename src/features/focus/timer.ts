export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

export interface TimerState {
  durationSec: number;
  remainingSec: number;
  status: TimerStatus;
  endAt: number | null;
}

export const MIN_DURATION_MIN = 1;
export const FOCUS_MAX_MINUTES = 486;
export const MAX_DURATION_MIN = FOCUS_MAX_MINUTES;
export const DEFAULT_DURATION_MIN = 25;
export const RECOMMENDED_MINUTES = [15, 30, 60, 120] as const;

export function clampMinutes(minutes: number): number {
  const safe = Number.isFinite(minutes) ? Math.round(minutes) : MIN_DURATION_MIN;
  return Math.min(MAX_DURATION_MIN, Math.max(MIN_DURATION_MIN, safe));
}

export function createTimer(minutes: number = DEFAULT_DURATION_MIN): TimerState {
  const durationSec = clampMinutes(minutes) * 60;
  return {
    durationSec,
    remainingSec: durationSec,
    status: 'idle',
    endAt: null,
  };
}

// 仅 idle 能改时长；running / paused / done 原样返回。
export function setDuration(state: TimerState, minutes: number): TimerState {
  if (state.status !== 'idle') {
    return state;
  }
  const durationSec = clampMinutes(minutes) * 60;
  return { ...state, durationSec, remainingSec: durationSec };
}

export function start(state: TimerState, now: number = Date.now()): TimerState {
  if ((state.status !== 'idle' && state.status !== 'paused') || state.remainingSec <= 0) {
    return state;
  }
  return {
    ...state,
    status: 'running',
    endAt: now + state.remainingSec * 1000,
  };
}

// 暂停时用 endAt - now 反算剩余，不累加 interval；若已到 0，直接按完成处理。
export function pause(state: TimerState, now: number = Date.now()): TimerState {
  if (state.status !== 'running' || state.endAt === null) {
    return state;
  }
  const remainingSec = Math.max(0, Math.ceil((state.endAt - now) / 1000));
  if (remainingSec <= 0) {
    return { ...state, status: 'done', remainingSec: 0, endAt: null };
  }
  return { ...state, status: 'paused', remainingSec, endAt: null };
}

export function resume(state: TimerState, now: number = Date.now()): TimerState {
  return start(state, now);
}

export function tick(state: TimerState, now: number = Date.now()): TimerState {
  if (state.status !== 'running' || state.endAt === null) {
    return state;
  }
  const remainingSec = Math.max(0, Math.ceil((state.endAt - now) / 1000));
  if (remainingSec <= 0) {
    return { ...state, status: 'done', remainingSec: 0, endAt: null };
  }
  if (remainingSec === state.remainingSec) {
    return state;
  }
  return { ...state, remainingSec };
}

export function reset(state: TimerState): TimerState {
  return {
    ...state,
    status: 'idle',
    remainingSec: state.durationSec,
    endAt: null,
  };
}

export function formatDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
