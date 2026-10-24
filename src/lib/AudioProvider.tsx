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
  type SoundCue,
} from './audio';

declare global {
  interface Window {
    __luminaAudio?: { getState: () => NoiseState };
  }
}

interface AudioContextValue {
  muted: boolean;
  toggleMuted: () => void;
  whiteNoiseEnabled: boolean;
  toggleWhiteNoise: () => void;
  syncMood: (mood: MoodId) => void;
  playHover: () => void;
  playClick: () => void;
  playOpen: () => void;
  playClose: () => void;
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
  const mutedRef = useRef(muted);
  const enabledRef = useRef(whiteNoiseEnabled);
  const moodRef = useRef<MoodId>('neutral');
  const unlockedRef = useRef(false);
  mutedRef.current = muted;
  enabledRef.current = whiteNoiseEnabled;

  useEffect(() => {
    engine.setMuted(muted);
    writeSoundMuted(muted);
    if (!muted && enabledRef.current && unlockedRef.current) {
      engine.startWhiteNoise(moodRef.current);
    }
  }, [engine, muted]);

  useEffect(() => {
    const handleUnlock = () => {
      engine.unlock();
      unlockedRef.current = true;
      if (enabledRef.current && !mutedRef.current) {
        engine.startWhiteNoise(moodRef.current);
      }
    };
    window.addEventListener('pointerdown', handleUnlock, { once: true, capture: true });
    window.addEventListener('keydown', handleUnlock, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', handleUnlock, true);
      window.removeEventListener('keydown', handleUnlock, true);
      engine.stopWhiteNoise();
      engine.dispose();
    };
  }, [engine]);

  // 仅开发/截图使用：让 CDP 能读取当前声景 chain 的 filter/frequency/gain。
  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    window.__luminaAudio = { getState: engine.getNoiseState };
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
        if (unlockedRef.current && !mutedRef.current) {
          engine.startWhiteNoise(moodRef.current);
        }
      } else {
        engine.stopWhiteNoise();
      }
      return next;
    });
  }, [engine]);

  const syncMood = useCallback(
    (mood: MoodId) => {
      moodRef.current = mood;
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
      syncMood,
      playHover: () => play('hover'),
      playClick: () => play('click'),
      playOpen: () => play('open'),
      playClose: () => play('close'),
    }),
    [muted, toggleMuted, whiteNoiseEnabled, toggleWhiteNoise, syncMood, play],
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
