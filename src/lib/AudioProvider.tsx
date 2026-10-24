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
import {
  createSoundEngine,
  readSoundMuted,
  writeSoundMuted,
  type SoundCue,
} from './audio';

interface AudioContextValue {
  muted: boolean;
  toggleMuted: () => void;
  whiteNoiseOn: boolean;
  toggleWhiteNoise: () => void;
  stopWhiteNoise: () => void;
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
  const [whiteNoiseOn, setWhiteNoiseOn] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    engine.setMuted(muted);
    writeSoundMuted(muted);
  }, [engine, muted]);

  useEffect(() => {
    const unlock = () => engine.unlock();
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      engine.stopWhiteNoise();
      engine.dispose();
    };
  }, [engine]);

  const toggleMuted = useCallback(() => {
    setMuted((previous) => {
      const next = !previous;
      if (next) {
        engine.stopWhiteNoise();
        setWhiteNoiseOn(false);
      }
      return next;
    });
  }, [engine]);

  const toggleWhiteNoise = useCallback(() => {
    if (mutedRef.current) {
      return;
    }
    setWhiteNoiseOn((previous) => {
      if (previous) {
        engine.stopWhiteNoise();
      } else {
        engine.startWhiteNoise();
      }
      return !previous;
    });
  }, [engine]);

  const stopWhiteNoise = useCallback(() => {
    engine.stopWhiteNoise();
    setWhiteNoiseOn(false);
  }, [engine]);

  const play = useCallback((cue: SoundCue) => engine.play(cue), [engine]);

  const value = useMemo<AudioContextValue>(
    () => ({
      muted,
      toggleMuted,
      whiteNoiseOn,
      toggleWhiteNoise,
      stopWhiteNoise,
      playHover: () => play('hover'),
      playClick: () => play('click'),
      playOpen: () => play('open'),
      playClose: () => play('close'),
    }),
    [muted, toggleMuted, whiteNoiseOn, toggleWhiteNoise, stopWhiteNoise, play],
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
