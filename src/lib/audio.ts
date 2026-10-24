import type { MoodId } from './types';

export const SOUND_KEY = 'lumina:sound';
export const NOISE_KEY = 'lumina:noise';

export type SoundCue = 'hover' | 'click' | 'open' | 'close';
export type NoiseColor = 'white' | 'pink' | 'brown';

export interface NoiseProfile {
  noiseColor: NoiseColor;
  filterType: BiquadFilterType;
  frequency: number;
  q: number;
  gain: number;
  padFrequencies?: readonly number[];
  modulation?: { rate: number; depth: number };
}

export interface NoiseState {
  mood: MoodId;
  playing: boolean;
  muted: boolean;
  contextState: AudioContextState | 'none';
  filterType: BiquadFilterType;
  frequency: number;
  gain: number;
}

// 三种情绪的声景配置；参数保持低音量，避免喧宾夺主。
export const NOISE_PROFILES: Record<MoodId, NoiseProfile> = {
  positive: {
    noiseColor: 'pink',
    filterType: 'bandpass',
    frequency: 720,
    q: 0.9,
    gain: 0.024,
    padFrequencies: [110, 164.81, 220],
  },
  neutral: {
    noiseColor: 'brown',
    filterType: 'lowpass',
    frequency: 520,
    q: 0.7,
    gain: 0.022,
  },
  negative: {
    noiseColor: 'white',
    filterType: 'highpass',
    frequency: 980,
    q: 0.45,
    gain: 0.016,
    modulation: { rate: 0.07, depth: 320 },
  },
};

export function getNoiseProfile(mood: MoodId): NoiseProfile {
  return NOISE_PROFILES[mood];
}

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

function readFlag(key: string, storage: Storage | null): boolean {
  if (!storage) {
    return false;
  }
  try {
    return storage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean, storage: Storage | null): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function readSoundMuted(storage: Storage | null = resolveStorage()): boolean {
  return readFlag(SOUND_KEY, storage);
}

export function writeSoundMuted(
  muted: boolean,
  storage: Storage | null = resolveStorage(),
): boolean {
  return writeFlag(SOUND_KEY, muted, storage);
}

export function readWhiteNoiseEnabled(storage: Storage | null = resolveStorage()): boolean {
  return readFlag(NOISE_KEY, storage);
}

export function writeWhiteNoiseEnabled(
  enabled: boolean,
  storage: Storage | null = resolveStorage(),
): boolean {
  return writeFlag(NOISE_KEY, enabled, storage);
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

interface NoiseChain {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  padOscillators: OscillatorNode[];
  padGain: GainNode | null;
  lfo: OscillatorNode | null;
  lfoGain: GainNode | null;
  profile: NoiseProfile;
}

export interface SoundEngine {
  unlock: () => void;
  play: (cue: SoundCue) => void;
  startWhiteNoise: (mood: MoodId) => void;
  stopWhiteNoise: (fadeSeconds?: number) => void;
  setMood: (mood: MoodId) => void;
  setMuted: (muted: boolean) => void;
  getNoiseState: () => NoiseState;
  dispose: () => void;
}

// Web Audio 全部代码生成：无外部音频、无依赖；引擎本身不碰 React。
export function createSoundEngine(): SoundEngine {
  let audio: AudioContext | null = null;
  let master: GainNode | null = null;
  let noiseBuffers: Partial<Record<NoiseColor, AudioBuffer>> = {};
  let activeChain: NoiseChain | null = null;
  let activeMood: MoodId = 'neutral';
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
      noiseBuffers = {};
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

  const getNoiseBuffer = (context: AudioContext, color: NoiseColor): AudioBuffer => {
    const cached = noiseBuffers[color];
    if (cached) {
      return cached;
    }
    const length = Math.floor(context.sampleRate * 4);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      if (color === 'white') {
        data[index] = white;
      } else if (color === 'brown') {
        brown = (brown + 0.02 * white) / 1.02;
        data[index] = Math.max(-1, Math.min(1, brown * 3.5));
      } else {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[index] = Math.max(
          -1,
          Math.min(1, (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11),
        );
        b6 = white * 0.115926;
      }
    }
    noiseBuffers[color] = buffer;
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
    source.buffer = getNoiseBuffer(context, 'white');
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

  const createNoiseChain = (
    context: AudioContext,
    mood: MoodId,
    fadeSeconds: number,
  ): NoiseChain | null => {
    if (!master) {
      return null;
    }
    const profile = getNoiseProfile(mood);
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = getNoiseBuffer(context, profile.noiseColor);
    source.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = profile.filterType;
    filter.frequency.value = profile.frequency;
    filter.Q.value = profile.q;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(profile.gain, now + fadeSeconds);

    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    if (profile.modulation) {
      lfo = context.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = profile.modulation.rate;
      lfoGain = context.createGain();
      lfoGain.gain.value = profile.modulation.depth;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(now);
    }

    let padGain: GainNode | null = null;
    const padOscillators: OscillatorNode[] = [];
    if (profile.padFrequencies?.length) {
      const padBus = context.createGain();
      padBus.gain.value = 0.012;
      padBus.connect(gain);
      padGain = padBus;
      profile.padFrequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        const oscillatorGain = context.createGain();
        oscillatorGain.gain.value = 0.3 / (index + 1);
        oscillator.connect(oscillatorGain);
        oscillatorGain.connect(padBus);
        oscillator.start(now);
        padOscillators.push(oscillator);
      });
    }

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);

    const chain: NoiseChain = {
      source,
      filter,
      gain,
      padOscillators,
      padGain,
      lfo,
      lfoGain,
      profile,
    };
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      padGain?.disconnect();
      lfoGain?.disconnect();
      padOscillators.forEach((oscillator) => oscillator.disconnect());
      lfo?.disconnect();
    };
    return chain;
  };

  const fadeOutChain = (chain: NoiseChain, fadeSeconds: number): void => {
    if (!audio) {
      return;
    }
    const now = audio.currentTime;
    const stopAt = now + fadeSeconds + 0.05;
    chain.gain.gain.cancelScheduledValues(now);
    chain.gain.gain.setValueAtTime(Math.max(chain.gain.gain.value, 0.0001), now);
    chain.gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
    try {
      chain.source.stop(stopAt);
    } catch {
      // 已停止时忽略。
    }
    chain.padOscillators.forEach((oscillator) => {
      try {
        oscillator.stop(stopAt);
      } catch {
        // 已停止时忽略。
      }
    });
    try {
      chain.lfo?.stop(stopAt);
    } catch {
      // 已停止时忽略。
    }
  };

  const stopWhiteNoise = (fadeSeconds = 0.25): void => {
    if (activeChain) {
      fadeOutChain(activeChain, fadeSeconds);
      activeChain = null;
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
    startWhiteNoise: (mood) => {
      activeMood = mood;
      if (muted) {
        return;
      }
      const context = resume();
      if (!context || !master) {
        return;
      }
      unlocked = true;
      if (activeChain) {
        if (activeChain.profile === getNoiseProfile(mood)) {
          return;
        }
        fadeOutChain(activeChain, 0.6);
      }
      activeChain = createNoiseChain(context, mood, 0.6);
    },
    stopWhiteNoise,
    setMood: (mood) => {
      const previous = activeMood;
      activeMood = mood;
      if (!activeChain || muted || !unlocked || previous === mood) {
        return;
      }
      const context = audio;
      if (!context) {
        return;
      }
      fadeOutChain(activeChain, 0.6);
      activeChain = createNoiseChain(context, mood, 0.6);
    },
    setMuted: (next) => {
      muted = next;
      if (next) {
        stopWhiteNoise(0.15);
      }
    },
    getNoiseState: () => {
      const profile = activeChain?.profile ?? getNoiseProfile(activeMood);
      return {
        mood: activeMood,
        playing: Boolean(activeChain),
        muted,
        contextState: audio?.state ?? 'none',
        filterType: profile.filterType,
        frequency: profile.frequency,
        gain: profile.gain,
      };
    },
    dispose: () => {
      stopWhiteNoise(0.01);
      if (audio && audio.state !== 'closed') {
        void audio.close();
      }
      audio = null;
      master = null;
      noiseBuffers = {};
      activeChain = null;
      unlocked = false;
    },
  };
}
