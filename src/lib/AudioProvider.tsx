import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { MoodId } from './types';
import {
  createSoundEngine,
  readSoundMuted,
  readWhiteNoiseEnabled,
  writeSoundMuted,
  writeWhiteNoiseEnabled,
  type NoiseState,
  type NoiseStatus,
  type SoundCue,
} from './audio';

declare global {
  interface Window {
    __luminaAudio?: {
      getState: () => NoiseState;
      debug: () => Record<string, unknown>;
    };
  }
}

interface AudioContextValue {
  muted: boolean;
  toggleMuted: () => void;
  whiteNoiseEnabled: boolean;
  toggleWhiteNoise: () => void;
  /** 背景音乐状态：已关闭 / 加载中 / 加载较慢 / 播放中。 */
  noiseStatus: NoiseStatus;
  syncMood: (mood: MoodId) => void;
  playHover: () => void;
  playClick: () => void;
  playOpen: () => void;
  playClose: () => void;
  playDone: () => void;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<ReturnType<typeof createSoundEngine> | null>(null);
  if (!engineRef.current) {
    engineRef.current = createSoundEngine();
  }
  const engine = engineRef.current;
  const [muted, setMuted] = useState(readSoundMuted);
  const [whiteNoiseEnabled, setWhiteNoiseEnabled] = useState(readWhiteNoiseEnabled);
  const [noiseStatus, setNoiseStatus] = useState<NoiseStatus>('off');
  const mutedRef = useRef(muted);
  const enabledRef = useRef(whiteNoiseEnabled);
  const moodRef = useRef<MoodId>('neutral');
  mutedRef.current = muted;
  enabledRef.current = whiteNoiseEnabled;

  // 状态迁移（加载中 → 播放中）由 audio 元素事件驱动，UI 每 500 ms 取一次快照；
  // 只在真的变了才 setState，避免淡化期间反复重渲染。
  useEffect(() => {
    const sync = () => {
      const next = engine.getNoiseState().status;
      setNoiseStatus((previous) => (previous === next ? previous : next));
    };
    sync();
    const timer = window.setInterval(sync, 500);
    return () => {
      window.clearInterval(timer);
    };
  }, [engine]);

  useEffect(() => {
    engine.setMuted(muted);
    writeSoundMuted(muted);
    if (!muted && enabledRef.current) {
      engine.startWhiteNoise(moodRef.current);
    }
  }, [engine, muted]);

  useEffect(() => {
    // 每次手势都告知引擎：既解锁提示音，也让「曾被自动播放策略拦下」的
    // 声景补放。不用一次性解锁标志——静音状态下切换开关不会产生新的手势，
    // 一次性标志会让声景再也起不来。
    const handleGesture = () => {
      engine.applyGesture();
      if (enabledRef.current && !mutedRef.current) {
        engine.startWhiteNoise(moodRef.current);
      }
    };
    window.addEventListener('pointerdown', handleGesture, { capture: true });
    window.addEventListener('keydown', handleGesture, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', handleGesture, true);
      window.removeEventListener('keydown', handleGesture, true);
      // 只停止播放，不销毁引擎。
      // StrictMode 在开发下会立刻跑一次 cleanup；把 useRef 里那个单例引擎
      // 一起丢掉，之后的所有播放调用就会落空，表现为「开了背景音乐却没有声音」。
      engine.stopWhiteNoise(0);
    };
  }, [engine]);

  // 仅开发/截图使用：让 CDP 能读取声景内部状态（含淡化调度），便于运行时诊断。
  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    window.__luminaAudio = {
      getState: engine.getNoiseState,
      debug: engine.__debug,
    };
    return () => {
      delete window.__luminaAudio;
    };
  }, [engine]);

  const toggleMuted = useCallback(() => {
    setMuted((previous) => !previous);
  }, []);

  const toggleWhiteNoise = useCallback(() => {
    setWhiteNoiseEnabled((previous) => {
      const next = !previous;
      enabledRef.current = next;
      writeWhiteNoiseEnabled(next);
      if (next) {
        engine.startWhiteNoise(moodRef.current);
      } else {
        engine.stopWhiteNoise();
      }
      return next;
    });
  }, [engine]);

  const syncMood = useCallback(
    (mood: MoodId) => {
      moodRef.current = mood;
      // 双保险：开关关闭或静音时，先把引擎的开关标记压成关，再只更新情绪记账。
      // 与手势路径同款守卫；引擎内部同样认 enabled / muted，这是第二道锁。
      if (!enabledRef.current || mutedRef.current) {
        engine.setEnabled(false);
      }
      engine.setMood(mood);
    },
    [engine],
  );

  const play = useCallback((cue: SoundCue) => engine.play(cue), [engine]);

  const value = useMemo<AudioContextValue>(
    () => ({
      muted,
      toggleMuted,
      whiteNoiseEnabled,
      toggleWhiteNoise,
      noiseStatus,
      syncMood,
      playHover: () => play('hover'),
      playClick: () => play('click'),
      playOpen: () => play('open'),
      playClose: () => play('close'),
      playDone: () => play('done'),
    }),
    [muted, toggleMuted, whiteNoiseEnabled, toggleWhiteNoise, noiseStatus, syncMood, play],
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio(): AudioContextValue {
  const value = useContext(AudioCtx);
  if (!value) {
    throw new Error('useAudio must be used inside AudioProvider');
  }
  return value;
}
