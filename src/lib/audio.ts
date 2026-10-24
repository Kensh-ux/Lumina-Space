export const SOUND_KEY = 'lumina:sound';

export type SoundCue = 'hover' | 'click' | 'open' | 'close';

function resolveStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSoundMuted(storage: Storage | null = resolveStorage()): boolean {
  if (!storage) {
    return false;
  }
  try {
    return storage.getItem(SOUND_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeSoundMuted(
  muted: boolean,
  storage: Storage | null = resolveStorage(),
): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(SOUND_KEY, String(muted));
    return true;
  } catch {
    return false;
  }
}

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const legacy = (window as Window & { webkitAudioContext?: AudioContextConstructor })
    .webkitAudioContext;
  return window.AudioContext ?? legacy ?? null;
}

export interface SoundEngine {
  unlock: () => void;
  play: (cue: SoundCue) => void;
  startWhiteNoise: () => void;
  stopWhiteNoise: () => void;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
}

// Web Audio 全部代码生成：无外部音频、无依赖；引擎本身不碰 React。
export function createSoundEngine(): SoundEngine {
  let audio: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBufferSourceNode | null = null;
  let noiseGain: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let unlocked = false;
  let muted = false;

  const ensureContext = (): AudioContext | null => {
    const Constructor = getAudioContextConstructor();
    if (!Constructor) {
      return null;
    }
    if (!audio || audio.state === 'closed') {
      audio = new Constructor();
      master = audio.createGain();
      master.gain.value = 0.5;
      master.connect(audio.destination);
      noiseBuffer = null;
    }
    return audio;
  };

  const resume = (): AudioContext | null => {
    const context = ensureContext();
    if (context && context.state === 'suspended') {
      void context.resume();
    }
    return context;
  };

  const getNoiseBuffer = (context: AudioContext): AudioBuffer => {
    if (noiseBuffer) {
      return noiseBuffer;
    }
    const length = Math.max(1, Math.floor(context.sampleRate * 2));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    noiseBuffer = buffer;
    return buffer;
  };

  const canPlay = (): AudioContext | null => {
    if (muted || !unlocked) {
      return null;
    }
    return resume();
  };

  const playTone = (
    frequency: number,
    type: OscillatorType,
    duration: number,
    peak: number,
  ): void => {
    const context = canPlay();
    if (!context || !master) {
      return;
    }
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  };

  const playWhoosh = (opening: boolean): void => {
    const context = canPlay();
    if (!context || !master) {
      return;
    }
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = getNoiseBuffer(context);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(opening ? 380 : 1200, now);
    filter.frequency.exponentialRampToValueAtTime(opening ? 1400 : 280, now + 0.28);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(now);
    source.stop(now + 0.32);
  };

  const startWhiteNoise = (): void => {
    if (muted) {
      return;
    }
    const context = resume();
    if (!context || !master) {
      return;
    }
    unlocked = true;
    if (noise) {
      return;
    }
    const source = context.createBufferSource();
    source.buffer = getNoiseBuffer(context);
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;
    const gain = context.createGain();
    gain.gain.value = 0.018;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start();
    noise = source;
    noiseGain = gain;
  };

  const stopWhiteNoise = (): void => {
    if (noise) {
      try {
        noise.stop();
      } catch {
        // 已停止时忽略。
      }
      noise.disconnect();
      noise = null;
    }
    if (noiseGain) {
      noiseGain.disconnect();
      noiseGain = null;
    }
  };

  return {
    unlock: () => {
      if (resume()) {
        unlocked = true;
      }
    },
    play: (cue) => {
      if (cue === 'hover') {
        playTone(640, 'sine', 0.05, 0.018);
      } else if (cue === 'click') {
        playTone(190, 'triangle', 0.04, 0.025);
      } else {
        playWhoosh(cue === 'open');
      }
    },
    startWhiteNoise,
    stopWhiteNoise,
    setMuted: (next) => {
      muted = next;
      if (next) {
        stopWhiteNoise();
      }
    },
    dispose: () => {
      stopWhiteNoise();
      if (audio && audio.state !== 'closed') {
        void audio.close();
      }
      audio = null;
      master = null;
      noiseBuffer = null;
      unlocked = false;
    },
  };
}
