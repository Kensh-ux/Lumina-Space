import type { MoodId } from './types';

export const SOUND_KEY = 'lumina:sound';
export const NOISE_KEY = 'lumina:noise';

export type SoundCue = 'hover' | 'click' | 'open' | 'close';

/** 交叉淡化时长（ms）：切情绪时旧声景淡出、新声景淡入。 */
export const NOISE_CROSSFADE_MS = 600;

/**
 * 外部音频托管。三段循环音频由维护者上传到 GitHub Releases（tag `audio-v1.2`），
 * 仓库本身不存二进制。均为**无缝环形循环**：结尾与开头逐样本连续，loop 时不会有咔哒。
 */
const AUDIO_BASE = 'https://github.com/Kensh-ux/Lumina-Space/releases/download/audio-v1.2';

export interface NoiseProfile {
  /** 对应情绪的真实录音（鸟鸣 / 黄昏 Lofi / 雨声）循环文件。 */
  src: string;
  /** 该声景的目标音量 0..1。相对响度刻意不同，见下方注释。 */
  volume: number;
  /** 一句话说明，用于设置面板与测试。 */
  label: string;
}

export interface NoiseState {
  mood: MoodId;
  playing: boolean;
  muted: boolean;
  /** 当前实际生效的音量（0 表示已淡出/未播放）。 */
  volume: number;
  /** 当前正在播放的音频地址。 */
  src: string;
}

// 三种情绪的声景配置。
// 相对响度刻意不同：雨声最靠前（消极情绪下它承担主要安抚作用），
// 黄昏最退后（素材本身最安静），鸟鸣居中。
// 三段源音频都已做响度归一（−21.5 / −23.0 / −20.0 LUFS），
// 这里的 volume 是在归一之上做的最终微调，保证切换时不炸耳也不消失。
export const NOISE_PROFILES: Record<MoodId, NoiseProfile> = {
  positive: {
    src: `${AUDIO_BASE}/bird-forest.mp3`,
    volume: 0.6,
    label: '林间鸟鸣',
  },
  neutral: {
    src: `${AUDIO_BASE}/dusk-twilight.mp3`,
    volume: 0.5,
    label: '蓝调东京夜驶',
  },
  negative: {
    src: `${AUDIO_BASE}/rain-calm.mp3`,
    volume: 0.75,
    label: '平静雨声',
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

export interface SoundEngine {
  /** 用户手势：解锁提示音，并补放曾被自动播放策略拦下的声景。 */
  applyGesture: () => void;
  play: (cue: SoundCue) => void;
  startWhiteNoise: (mood: MoodId) => void;
  stopWhiteNoise: (fadeSeconds?: number) => void;
  setMood: (mood: MoodId) => void;
  setMuted: (muted: boolean) => void;
  getNoiseState: () => NoiseState;
  /** 仅开发期诊断用。 */
  __debug: () => Record<string, unknown>;
  dispose: () => void;
}

type AudioConstructor = new (src?: string) => HTMLAudioElement;

function getAudioConstructor(): AudioConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.Audio ?? null;
}

// 每曲一条淡化状态。刻意保持极简：没有链、没有多通道调度，
// 一个轮询定时器推进所有条目，跑完就停。
interface Fade {
  from: number;
  to: number;
  start: number;
  /** 淡到 0 后是否暂停该播放器。 */
  pauseWhenDone: boolean;
}

const FADE_END_EPSILON = 0.004;

// 声景引擎：真实录音 + 轮询式交叉淡化，不依赖 Web Audio。
// 界面提示音（hover/click/open/close）仍用轻量 Web Audio 合成，与录音互不干扰。
// 引擎本身不碰 React。
export function createSoundEngine(): SoundEngine {
  // 按曲缓存播放器：切回上一个情绪时保留播放位置，不会从头重放。
  const players = new Map<string, HTMLAudioElement>();
  let currentMood: MoodId = 'neutral';
  let muted = false;
  let disposed = false;
  /** 播放曾被自动播放策略拦下，等下一次用户手势补放。 */
  let pendingWake = false;
  /** 最近一次 play() 失败原因，仅诊断用。 */
  let lastPlayError = '';

  const now = (): number =>
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  // ---- 淡化调度（单定时器 + 每曲一条状态） ----
  const fades = new Map<HTMLAudioElement, Fade>();
  let pollTimer = 0;

  const stopPoll = (): void => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = 0;
    }
  };

  const startPoll = (): void => {
    if (disposed || pollTimer) {
      return;
    }
    pollTimer = setInterval(poll, 30) as unknown as number;
  };

  function poll(): void {
    if (disposed) {
      stopPoll();
      fades.clear();
      return;
    }
    const t = now();
    const done: HTMLAudioElement[] = [];
    for (const [audio, fade] of fades) {
      const raw = NOISE_CROSSFADE_MS <= 0 ? 1 : (t - fade.start) / NOISE_CROSSFADE_MS;
      const progress = Math.min(1, Math.max(0, raw));
      const value = fade.from + (fade.to - fade.from) * progress;
      try {
        audio.volume = Math.min(1, Math.max(0, value));
      } catch {
        // 音量写入失败：忽略
      }
      if (progress >= 1) {
        done.push(audio);
        if (fade.pauseWhenDone) {
          try {
            audio.pause();
          } catch {
            // 已暂停：忽略
          }
        }
      }
    }
    for (const audio of done) {
      fades.delete(audio);
    }
    if (fades.size === 0) {
      stopPoll();
    }
  }

  /** 把某个播放器的音量平滑推到 next；0 则推完暂停。 */
  const fadeTo = (audio: HTMLAudioElement, next: number, fadeSeconds: number): void => {
    if (fadeSeconds <= 0) {
      fades.delete(audio);
      try {
        audio.volume = Math.min(1, Math.max(0, next));
        if (next <= 0) {
          audio.pause();
        }
      } catch {
        // 忽略
      }
      return;
    }
    const from = audio.volume;
    fades.set(audio, { from, to: next, start: now(), pauseWhenDone: next <= 0 });
    startPoll();
  };

  /** 当前正在播放（有 fade 或以音量 > 0 在响）的播放器。 */
  const activePlayer = (): HTMLAudioElement | null => {
    const profile = getNoiseProfile(currentMood);
    return players.get(profile.src) ?? null;
  };

  const ensurePlayer = (src: string): HTMLAudioElement | null => {
    const cached = players.get(src);
    if (cached) {
      return cached;
    }
    const Constructor = getAudioConstructor();
    if (!Constructor) {
      return null;
    }
    const audio = new Constructor(src);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    players.set(src, audio);
    return audio;
  };

  /** 播放当前情绪的声景（若已静音则不动）。 */
  const playCurrent = (): void => {
    if (muted) {
      return;
    }
    // 若曾被 dispose（例如开发期 StrictMode 的 cleanup），这里自动复活，
    // 避免引擎进入「永远放不出声」的死状态。
    if (disposed) {
      disposed = false;
    }
    const profile = getNoiseProfile(currentMood);
    const audio = ensurePlayer(profile.src);
    if (!audio) {
      return;
    }
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise
        .then(() => {
          // 成功才算解除待唤醒
          pendingWake = false;
          lastPlayError = '';
        })
        .catch((error: unknown) => {
          // 被自动播放策略拦下、或音频加载失败：保持待唤醒，
          // 等后续任意用户手势重试，直到真正播放成功。
          // 否则会永久停在「开着却没声音」。
          pendingWake = true;
          lastPlayError = error instanceof Error ? error.message : String(error);
        });
    } else {
      pendingWake = false;
    }
    fadeTo(audio, profile.volume, NOISE_CROSSFADE_MS / 1000);
  };

  const stopWhiteNoise = (fadeSeconds = NOISE_CROSSFADE_MS / 1000): void => {
    for (const audio of players.values()) {
      fadeTo(audio, 0, fadeSeconds);
    }
  };

  // ---- 界面提示音（合成） ----
  let cueContext: AudioContext | null = null;
  let cueMaster: GainNode | null = null;
  let cueNoise: AudioBuffer | null = null;

  const getAudioContextConstructor = (): (typeof AudioContext) | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    const legacy = (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
    return window.AudioContext ?? legacy ?? null;
  };

  const ensureCueContext = (): AudioContext | null => {
    const Constructor = getAudioContextConstructor();
    if (!Constructor) {
      return null;
    }
    if (!cueContext || cueContext.state === 'closed') {
      cueContext = new Constructor();
      cueMaster = cueContext.createGain();
      cueMaster.gain.value = 0.5;
      cueMaster.connect(cueContext.destination);
      cueNoise = null;
    }
    if (cueContext.state === 'suspended') {
      void cueContext.resume();
    }
    return cueContext;
  };

  const canCue = (): AudioContext | null => {
    if (muted || disposed) {
      return null;
    }
    return ensureCueContext();
  };

  const getCueNoise = (context: AudioContext): AudioBuffer => {
    if (cueNoise) {
      return cueNoise;
    }
    const length = Math.floor(context.sampleRate * 0.5);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    cueNoise = buffer;
    return buffer;
  };

  const playTone = (
    frequency: number,
    type: OscillatorType,
    duration: number,
    peak: number,
  ): void => {
    const context = canCue();
    if (!context || !cueMaster) {
      return;
    }
    const at = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain);
    gain.connect(cueMaster);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(at);
    oscillator.stop(at + duration + 0.01);
  };

  const playWhoosh = (opening: boolean): void => {
    const context = canCue();
    if (!context || !cueMaster) {
      return;
    }
    const at = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = getCueNoise(context);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(opening ? 380 : 1200, at);
    filter.frequency.exponentialRampToValueAtTime(opening ? 1400 : 280, at + 0.28);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.025, at + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(cueMaster);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(at);
    source.stop(at + 0.32);
  };

  const playCue = (cue: SoundCue): void => {
    if (cue === 'hover') {
      playTone(640, 'sine', 0.05, 0.02);
    } else if (cue === 'click') {
      playTone(190, 'triangle', 0.04, 0.028);
    } else {
      playWhoosh(cue === 'open');
    }
  };

  return {
    applyGesture: () => {
      ensureCueContext();
      // 只要"想放但没放成"，每次手势都重试（不消耗 flag），直到成功为止。
      if (pendingWake) {
        playCurrent();
      }
    },
    play: (cue) => {
      playCue(cue);
    },
    startWhiteNoise: (mood) => {
      // 诊断标记：确认浏览器加载的是本版实现（v1.2-simple-fade）
      (globalThis as Record<string, unknown>).__luminaEngineTag = 'v1.2-simple-fade';
      currentMood = mood;
      playCurrent();
    },
    stopWhiteNoise,
    setMood: (mood) => {
      if (currentMood === mood) {
        return;
      }
      currentMood = mood;
      if (muted || disposed) {
        return;
      }
      // 旧曲淡出、新曲淡入，两者叠成一次交叉淡化
      for (const audio of players.values()) {
        fadeTo(audio, 0, NOISE_CROSSFADE_MS / 1000);
      }
      playCurrent();
    },
    setMuted: (next) => {
      muted = next;
      if (next) {
        pendingWake = false;
        stopWhiteNoise();
      }
    },
    getNoiseState: () => {
      const audio = activePlayer();
      const volume = audio ? audio.volume : 0;
      return {
        mood: currentMood,
        playing: Boolean(audio) && !audio?.paused && volume > FADE_END_EPSILON,
        muted,
        volume: Number(volume.toFixed(4)),
        src: audio?.src ?? '',
      };
    },
    __debug: () => ({
      fades: fades.size,
      fadesDetail: Array.from(fades.values()).map((fade) => ({
        from: Number(fade.from.toFixed(3)),
        to: Number(fade.to.toFixed(3)),
        elapsedMs: Math.round(now() - fade.start),
      })),
      pollRunning: pollTimer !== 0,
      players: Array.from(players.values()).map((audio) => ({
        src: (audio.src || '').split('/').pop(),
        volume: Number(audio.volume.toFixed(3)),
        paused: audio.paused,
      })),
      pendingWake,
      lastPlayError,
      muted,
      currentMood,
    }),
    dispose: () => {
      disposed = true;
      stopPoll();
      fades.clear();
      for (const audio of players.values()) {
        try {
          audio.pause();
          audio.src = '';
        } catch {
          // 忽略
        }
      }
      players.clear();
      if (cueContext && cueContext.state !== 'closed') {
        void cueContext.close();
      }
      cueContext = null;
      cueMaster = null;
      cueNoise = null;
    },
  };
}