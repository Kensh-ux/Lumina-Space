import type { MoodId } from './types';

export const SOUND_KEY = 'lumina:sound';
export const NOISE_KEY = 'lumina:noise';

export type SoundCue = 'hover' | 'click' | 'open' | 'close';

/** 交叉淡化时长（ms）：切情绪时旧声景淡出、新声景淡入。 */
export const NOISE_CROSSFADE_MS = 600;

/**
 * 加载等待上限（ms）：超过后**不放弃**（网络恢复仍要能播），只把对外状态标成「加载较慢」。
 * GitHub 链路实测约 42 KB/s，18 MB 的曲子光元数据就可能要 20 s，所以给得比较宽。
 */
export const NOISE_LOAD_TIMEOUT_MS = 20000;

/** 「能出声」所需的 readyState：HAVE_FUTURE_DATA(3)，即缓冲够继续播。 */
export const NOISE_READY_STATE = 3;

/**
 * 元素报错后的自动重试：间隔与上限。用尽后改为等用户手势再试 —— 也就是「不放弃」，
 * 但 UI 必须能看出它已经失败，不能一直显示得像在正常播放。
 */
export const NOISE_ERROR_RETRY_MS = 5000;
export const NOISE_ERROR_MAX_RETRIES = 3;

/** 对外暴露的播放状态。 */
export type NoiseStatus = 'off' | 'loading' | 'slow' | 'playing' | 'error';

/**
 * 元素是否真的能出声：缓冲到 HAVE_FUTURE_DATA 以上，且不处于暂停。
 * **只有它为真才允许开始淡入** —— 否则会重演「音量已经淡到目标、元素其实还在 waiting」。
 */
export function isNoiseAudible(readyState: number, paused: boolean): boolean {
  return readyState >= NOISE_READY_STATE && !paused;
}

/**
 * 由「是否要放 / 是否真的能出声 / 是否已报错 / 等待了多久」推导对外状态。
 * 等待超过上限只是换个文案（slow），不放弃播放；报错则是明确失败（error）。
 */
export function resolveNoiseStatus(input: {
  active: boolean;
  audible: boolean;
  waitingMs: number;
  failed?: boolean;
  timeoutMs?: number;
}): NoiseStatus {
  if (!input.active) {
    return 'off';
  }
  if (input.failed) {
    return 'error';
  }
  if (input.audible) {
    return 'playing';
  }
  return input.waitingMs >= (input.timeoutMs ?? NOISE_LOAD_TIMEOUT_MS) ? 'slow' : 'loading';
}

/** 状态 → 设置面板文案（纯映射，放这里便于测试）。 */
export function describeNoiseStatus(status: NoiseStatus): string {
  switch (status) {
    case 'playing':
      return '播放中';
    case 'loading':
      return '加载中…';
    case 'slow':
      return '加载较慢…';
    case 'error':
      return '加载失败';
    case 'off':
      return '已关闭';
  }
}

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
  /** 对外状态：已关闭 / 加载中 / 加载较慢 / 播放中。 */
  status: NoiseStatus;
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
  /**
   * 背景音乐开关。**引擎自己必须知道开关状态**：否则任何一条没守卫的入口
   * （例如情绪切换）都会把声音带回来，表现为「按钮显示关闭、声音却在响」。
   */
  setEnabled: (enabled: boolean) => void;
  startWhiteNoise: (mood: MoodId) => void;
  stopWhiteNoise: (fadeSeconds?: number) => void;
  setMood: (mood: MoodId) => void;
  setMuted: (muted: boolean) => void;
  getNoiseState: () => NoiseState;
  /** 仅开发期诊断用。 */
  __debug: () => Record<string, unknown>;
}

export interface SoundEngineOptions {
  /** 元素报错后的自动重试间隔（ms）。默认 `NOISE_ERROR_RETRY_MS`；测试用短值。 */
  errorRetryMs?: number;
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
  /** 淡到 0 后是否暂停该播放器并停止继续下载。 */
  releaseWhenDone: boolean;
}

const FADE_END_EPSILON = 0.004;

/** 诊断标记：确认浏览器加载的是本版实现（探针读 `__debug().engineTag`）。 */
const ENGINE_TAG = 'v1.2.1-loading-gate';

// 声景引擎：真实录音 + 轮询式交叉淡化，不依赖 Web Audio。
// 切曲时**先加载、能出声之后才淡入**；切走的曲子在淡出后停下载（保留播放位置）。
// 引擎自己持有「背景音乐开关（enabled）」与「静音（muted）」两个状态，
// 任何放声入口都必须同时尊重它们。
// 界面提示音（hover/click/open/close）仍用轻量 Web Audio 合成，与录音互不干扰。
// 引擎本身不碰 React。
export function createSoundEngine(options: SoundEngineOptions = {}): SoundEngine {
  const errorRetryMs = options.errorRetryMs ?? NOISE_ERROR_RETRY_MS;
  // 按曲缓存播放器：切回上一个情绪时保留播放位置，不会从头重放。
  const players = new Map<string, HTMLAudioElement>();
  let currentMood: MoodId = 'neutral';
  let muted = false;
  /** 背景音乐开关：关闭时「切情绪」「手势」「唤醒」都不许把声音带回来。 */
  let enabled = false;
  /** 播放曾被自动播放策略拦下，等下一次用户手势补放。 */
  let pendingWake = false;
  /** 最近一次 play() 失败原因，仅诊断用。 */
  let lastPlayError = '';
  /** error 后的自动重试计数；播放成功即清零。 */
  let errorRetries = 0;
  let retryTimer = 0;

  const now = (): number =>
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  /** 引擎此刻是否有权放声：开关打开且未静音。 */
  const canPlay = (): boolean => enabled && !muted;

  // ---- 淡化调度（单定时器 + 每曲一条状态） ----
  const fades = new Map<HTMLAudioElement, Fade>();
  /** 「等真的能出声再淡入」：元素 → 目标音量。 */
  const fadeInTargets = new Map<HTMLAudioElement, number>();
  /** 元素进入等待可播的时刻（含播放途中缓冲耗尽），用于判定「加载较慢」。 */
  const loadWaitSince = new Map<HTMLAudioElement, number>();
  /** 元素报错信息（如 `media-error-4`）：有记录即对外显示「加载失败」。 */
  const errorState = new Map<HTMLAudioElement, string>();
  let pollTimer = 0;
  let watchTimer = 0;

  const stopPoll = (): void => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = 0;
    }
  };

  const stopWatch = (): void => {
    if (watchTimer) {
      clearInterval(watchTimer);
      watchTimer = 0;
    }
  };

  const cancelRetry = (): void => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = 0;
    }
  };

  /** 停下载但保留位置：pause + preload='none'，不碰 src / currentTime。 */
  const releaseDownload = (audio: HTMLAudioElement): void => {
    try {
      audio.pause();
      audio.preload = 'none';
    } catch {
      // 忽略
    }
  };

  const startPoll = (): void => {
    if (pollTimer) {
      return;
    }
    pollTimer = setInterval(poll, 30) as unknown as number;
  };

  function poll(): void {
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
        // 淡出结束才真正停下载：既没有爆音，也不再抢带宽。
        // 但若这期间元素又被重新武装（fadeInTargets 里有它），说明这是一条**过期的释放**：
        // 此刻 pause() 会让淡入永远等不到（淡入要求 !paused），必须跳过。
        // 判据只能是 fadeInTargets：silenceAll 是先清 fadeInTargets 再排淡出，
        // 若改用 enabled / canPlay() 判断，会把「关开关 / 静音」这两种合法释放一并跳过，
        // 反而让旧曲下载永远停不下来。
        if (fade.releaseWhenDone && !fadeInTargets.has(audio)) {
          releaseDownload(audio);
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

  /** 元素数据够了：readyState >= HAVE_FUTURE_DATA。 */
  const isDataReady = (audio: HTMLAudioElement): boolean =>
    audio.readyState >= NOISE_READY_STATE;

  /**
   * 元素数据够了：清掉等待/失败记录，并按登记的目标音量开始淡入。
   *
   * 通用自愈：元素此刻若已被某条**异步收尾**暂停（例如释放淡出晚于重新武装），
   * 这里先把播放拉起来再淡入。能暂停活动元素的异步收尾不止一处、以后还可能多，
   * 所以不能靠「穷举所有入口」来保证安全，必须有一道与入口无关的兜底。
   */
  const markAudible = (audio: HTMLAudioElement): void => {
    errorState.delete(audio);
    errorRetries = 0;
    cancelRetry();
    loadWaitSince.delete(audio);
    const target = fadeInTargets.get(audio);
    if (target === undefined) {
      return;
    }
    fadeInTargets.delete(audio);
    if (audio.paused) {
      const resumed = audio.play();
      if (resumed && typeof resumed.catch === 'function') {
        resumed.catch(() => {
          // 拉不起来（例如自动播放被拦）：保持待唤醒，等下一次用户手势
          pendingWake = true;
        });
      }
    }
    fadeTo(audio, target, NOISE_CROSSFADE_MS / 1000);
  };

  /** 元素还不能出声：记下等待起点（只记第一次，重复调用不重置 20 s 计时）。 */
  const markWaiting = (audio: HTMLAudioElement): void => {
    if (!loadWaitSince.has(audio)) {
      loadWaitSince.set(audio, now());
    }
  };

  /**
   * 低频兜底：`canplay` / `playing` 事件万一没到（或被节流），
   * 也要在元素真的能出声之后开始淡入，并把等待起点补上。
   */
  function watch(): void {
    for (const audio of Array.from(fadeInTargets.keys())) {
      // 用「数据够了」而不是「正在出声」：被暂停的武装元素交给 markAudible 自愈。
      if (isDataReady(audio)) {
        markAudible(audio);
      } else {
        markWaiting(audio);
      }
    }
    if (fadeInTargets.size === 0) {
      stopWatch();
    }
  }

  const startWatch = (): void => {
    if (watchTimer) {
      return;
    }
    watchTimer = setInterval(watch, 300) as unknown as number;
  };

  /**
   * 把某个播放器的音量平滑推到 next。
   * next <= 0 且 release 时：淡完暂停并 `preload='none'`，停掉下载但保留 currentTime。
   */
  const fadeTo = (
    audio: HTMLAudioElement,
    next: number,
    fadeSeconds: number,
    release = next <= 0,
  ): void => {
    if (fadeSeconds <= 0) {
      fades.delete(audio);
      try {
        audio.volume = Math.min(1, Math.max(0, next));
        if (next <= 0 && release) {
          releaseDownload(audio);
        }
      } catch {
        // 忽略
      }
      return;
    }
    const from = audio.volume;
    fades.set(audio, {
      from,
      to: next,
      start: now(),
      releaseWhenDone: next <= 0 && release,
    });
    startPoll();
  };

  /** 当前正在播放（有 fade 或以音量 > 0 在响）的播放器。 */
  const activePlayer = (): HTMLAudioElement | null => {
    const profile = getNoiseProfile(currentMood);
    return players.get(profile.src) ?? null;
  };

  /** 当前曲目是否已经在正常出声：无需重新触发加载。 */
  const isSettled = (audio: HTMLAudioElement, target: number): boolean =>
    !audio.paused &&
    isNoiseAudible(audio.readyState, audio.paused) &&
    !fadeInTargets.has(audio) &&
    !loadWaitSince.has(audio) &&
    audio.volume >= target - FADE_END_EPSILON;

  /** 由「想放 / 真的能出声 / 是否失败 / 等了多久」推导当前对外状态。 */
  const describeCurrent = (): {
    audio: HTMLAudioElement | null;
    audible: boolean;
    waitingMs: number;
    status: NoiseStatus;
  } => {
    const audio = activePlayer();
    const audible = audio !== null && isNoiseAudible(audio.readyState, audio.paused);
    const since = audio === null ? undefined : loadWaitSince.get(audio);
    const waitingMs = since === undefined ? 0 : Math.round(now() - since);
    return {
      audio,
      audible,
      waitingMs,
      status: resolveNoiseStatus({
        // 开关关闭 / 静音即「已关闭」：即便某个元素还在响，也不该对外报播放中。
        active: canPlay() && audio !== null,
        audible,
        waitingMs,
        failed: audio !== null && errorState.has(audio),
      }),
    };
  };

  /** 元素报错后的重试：有限次自动重试，用尽后交给用户手势（不放弃）。 */
  const scheduleRetry = (audio: HTMLAudioElement): void => {
    if (retryTimer || !canPlay()) {
      return;
    }
    if (errorRetries >= NOISE_ERROR_MAX_RETRIES) {
      pendingWake = true;
      return;
    }
    errorRetries += 1;
    retryTimer = setTimeout(() => {
      retryTimer = 0;
      if (!canPlay() || activePlayer() !== audio) {
        return;
      }
      errorState.delete(audio);
      try {
        // error 之后元素已无可用数据，只能重新走一次资源选择（位置归零）。
        audio.load();
      } catch {
        // 忽略
      }
      playCurrent();
    }, errorRetryMs) as unknown as number;
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
    // 真的能出声才允许淡入；canplay = readyState >= HAVE_FUTURE_DATA。
    // 判据用「数据够了」：元素若被异步收尾暂停，由 markAudible 负责重新拉起（自愈）。
    for (const name of ['canplay', 'canplaythrough', 'playing']) {
      audio.addEventListener(name, () => {
        if (isDataReady(audio)) {
          markAudible(audio);
        }
      });
    }
    // 播放途中缓冲耗尽：状态回到「加载中」，**音量保持不变**，不做来回淡入淡出。
    for (const name of ['waiting', 'stalled']) {
      audio.addEventListener(name, () => {
        markWaiting(audio);
      });
    }
    // 加载/解码失败：对外显示「加载失败」，并走重试（网络恢复后要能自己回来）。
    audio.addEventListener('error', () => {
      lastPlayError = audio.error ? `media-error-${audio.error.code}` : 'media-error';
      errorState.set(audio, lastPlayError);
      fadeInTargets.delete(audio);
      loadWaitSince.delete(audio);
      if (fadeInTargets.size === 0) {
        stopWatch();
      }
      scheduleRetry(audio);
    });
    players.set(src, audio);
    return audio;
  };

  /**
   * 让当前情绪的声景进入播放：先加载，**能出声之后**才淡入。
   * 开关关闭 / 静音时是空操作；已在正常出声时重复调用也是空操作（用户手势会频繁走到这里）。
   */
  const playCurrent = (): void => {
    if (!canPlay()) {
      return;
    }
    const profile = getNoiseProfile(currentMood);
    const audio = ensurePlayer(profile.src);
    if (!audio) {
      return;
    }
    // 上一次 error 过：先重新走一次资源选择，再试。
    if (errorState.delete(audio)) {
      try {
        audio.load();
      } catch {
        // 忽略
      }
    }
    if (isSettled(audio, profile.volume)) {
      return;
    }
    // 撤掉可能还在跑的「释放淡出」（关→立刻开、静音→立刻取消、A→B→A 快速来回）。
    // 不撤的话它会在 0.6 s 后把刚武装的元素 pause()，而淡入要求 !paused →
    // 元素永远起不来（状态卡在 loading，20 s 后变 slow）。
    // 只按「有待执行的释放淡出」判断，不碰 enabled/canPlay()：silenceAll 是先清
    // fadeInTargets 再排淡出，用开关判断会把合法释放一起跳过，旧曲下载就停不掉了。
    const staleFade = fades.get(audio);
    if (staleFade?.releaseWhenDone) {
      fades.delete(audio);
    }
    // 之前可能为了停下载设过 preload='none'：重新开始加载。
    try {
      audio.preload = 'auto';
    } catch {
      // 忽略
    }
    // 先登记目标音量与等待起点；淡入由 markAudible 触发。
    fadeInTargets.set(audio, profile.volume);
    markWaiting(audio);
    startWatch();
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise
        .then(() => {
          // 成功才算解除待唤醒
          pendingWake = false;
          lastPlayError = '';
          if (isDataReady(audio)) {
            markAudible(audio);
          }
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
    // 切回已经缓冲好的曲目时元素当场就绪：直接淡入，不必等事件。
    if (isDataReady(audio)) {
      markAudible(audio);
    }
  };

  /** 切走某曲：淡出 → 暂停 → `preload='none'`；保留 currentTime 以便切回来续播。 */
  const releasePlayer = (audio: HTMLAudioElement): void => {
    fadeInTargets.delete(audio);
    loadWaitSince.delete(audio);
    if (audio.paused && audio.volume <= FADE_END_EPSILON) {
      // 本来就没在响：不必等 0.6 s 的淡化尾巴。
      releaseDownload(audio);
      return;
    }
    fadeTo(audio, 0, NOISE_CROSSFADE_MS / 1000);
  };

  /** 全部淡出并停下载（关闭开关 / 静音时用）。 */
  const silenceAll = (fadeSeconds: number): void => {
    for (const audio of players.values()) {
      fadeInTargets.delete(audio);
      loadWaitSince.delete(audio);
      fadeTo(audio, 0, fadeSeconds);
    }
    if (fadeInTargets.size === 0) {
      stopWatch();
    }
  };

  const stopWhiteNoise = (fadeSeconds = NOISE_CROSSFADE_MS / 1000): void => {
    enabled = false;
    pendingWake = false;
    cancelRetry();
    silenceAll(fadeSeconds);
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
    if (muted) {
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
      if (pendingWake && canPlay()) {
        playCurrent();
      }
    },
    play: (cue) => {
      playCue(cue);
    },
    setEnabled: (next) => {
      if (enabled === next) {
        return;
      }
      enabled = next;
      if (next) {
        // 只解锁，不主动放声：由 startWhiteNoise / 手势路径决定放什么。
        return;
      }
      pendingWake = false;
      cancelRetry();
      silenceAll(NOISE_CROSSFADE_MS / 1000);
    },
    startWhiteNoise: (mood) => {
      enabled = true;
      currentMood = mood;
      // 用户主动开一次：重试预算重新给满。
      errorRetries = 0;
      cancelRetry();
      playCurrent();
    },
    stopWhiteNoise,
    setMood: (mood) => {
      if (currentMood === mood) {
        return;
      }
      currentMood = mood;
      // 关闭 / 静音时只记情绪，绝不把声音带回来（high#1：关掉开关后切情绪又响了）。
      if (!canPlay()) {
        return;
      }
      // 换一首就是一次新尝试：重试预算重新给满。
      errorRetries = 0;
      cancelRetry();
      // 旧曲淡出 → 暂停 → 停下载（保留播放位置）；新曲不参与这次淡出。
      const nextSrc = getNoiseProfile(mood).src;
      for (const [src, audio] of players) {
        if (src !== nextSrc) {
          releasePlayer(audio);
        }
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
      const { audio, audible, status } = describeCurrent();
      const volume = audio === null ? 0 : audio.volume;
      return {
        mood: currentMood,
        // 开关关闭 / 静音时不算「在播放」，与 status 的语义保持一致。
        playing: canPlay() && audio !== null && audible && volume > FADE_END_EPSILON,
        muted,
        volume: Number(volume.toFixed(4)),
        src: audio?.src ?? '',
        status,
      };
    },
    __debug: () => {
      const current = describeCurrent();
      return {
        engineTag: ENGINE_TAG,
        status: current.status,
        enabled,
        muted,
        waitingMs: current.waitingMs,
        fades: fades.size,
        fadesDetail: Array.from(fades.values()).map((fade) => ({
          from: Number(fade.from.toFixed(3)),
          to: Number(fade.to.toFixed(3)),
          elapsedMs: Math.round(now() - fade.start),
        })),
        pollRunning: pollTimer !== 0,
        watchRunning: watchTimer !== 0,
        players: Array.from(players.values()).map((audio) => ({
          src: (audio.src || '').split('/').pop(),
          volume: Number(audio.volume.toFixed(3)),
          paused: audio.paused,
          preload: audio.preload,
          readyState: audio.readyState,
          networkState: audio.networkState,
          currentTime: Number(audio.currentTime.toFixed(2)),
          bufferedSec:
            audio.buffered.length > 0
              ? Number(audio.buffered.end(audio.buffered.length - 1).toFixed(1))
              : 0,
          waiting: loadWaitSince.has(audio),
          error: errorState.get(audio) ?? null,
        })),
        pendingWake,
        errorRetries,
        retryScheduled: retryTimer !== 0,
        lastPlayError,
        currentMood,
      };
    },
  };
}
