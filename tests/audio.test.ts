import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createSoundEngine,
  describeNoiseStatus,
  getNoiseProfile,
  isNoiseAudible,
  NOISE_CROSSFADE_MS,
  NOISE_ERROR_MAX_RETRIES,
  NOISE_ERROR_RETRY_MS,
  NOISE_KEY,
  NOISE_LOAD_TIMEOUT_MS,
  NOISE_READY_STATE,
  readSoundMuted,
  readWhiteNoiseEnabled,
  resolveNoiseStatus,
  SOUND_KEY,
  writeSoundMuted,
  writeWhiteNoiseEnabled,
  type SoundEngine,
} from '../src/lib/audio';

class MemoryStorage implements Storage {
  private items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.items.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

class BlockedStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('blocked');
  }

  override setItem(): void {
    throw new Error('blocked');
  }
}

describe('声音静音持久化', () => {
  it('没有设置时默认未静音', () => {
    expect(readSoundMuted(new MemoryStorage())).toBe(false);
  });

  it('写入 true / false 后能读回', () => {
    const storage = new MemoryStorage();

    expect(writeSoundMuted(true, storage)).toBe(true);
    expect(storage.getItem(SOUND_KEY)).toBe('true');
    expect(readSoundMuted(storage)).toBe(true);

    expect(writeSoundMuted(false, storage)).toBe(true);
    expect(readSoundMuted(storage)).toBe(false);
  });

  it('存储不可用时降级为未静音且不抛错', () => {
    const storage = new BlockedStorage();

    expect(readSoundMuted(storage)).toBe(false);
    expect(writeSoundMuted(true, storage)).toBe(false);
  });

  it('没有 storage 时安全返回', () => {
    expect(readSoundMuted(null)).toBe(false);
    expect(writeSoundMuted(true, null)).toBe(false);
  });
});

describe('白噪音偏好持久化', () => {
  it('没有记录时默认关闭', () => {
    expect(readWhiteNoiseEnabled(new MemoryStorage())).toBe(false);
  });

  it('写入 true / false 后能读回，且不影响静音 key', () => {
    const storage = new MemoryStorage();

    expect(writeWhiteNoiseEnabled(true, storage)).toBe(true);
    expect(storage.getItem(NOISE_KEY)).toBe('true');
    expect(readWhiteNoiseEnabled(storage)).toBe(true);
    expect(readSoundMuted(storage)).toBe(false);

    expect(writeWhiteNoiseEnabled(false, storage)).toBe(true);
    expect(readWhiteNoiseEnabled(storage)).toBe(false);

    expect(writeWhiteNoiseEnabled(true, new BlockedStorage())).toBe(false);
    expect(readWhiteNoiseEnabled(null)).toBe(false);
  });
});

describe('三情绪声景配置', () => {
  const moods = ['positive', 'neutral', 'negative'] as const;

  it('每种情绪都有自己的循环音频地址，且都是 https', () => {
    const srcs = moods.map((mood) => getNoiseProfile(mood).src);

    for (const src of srcs) {
      expect(src.startsWith('https://')).toBe(true);
      expect(src.endsWith('.mp3')).toBe(true);
    }
    expect(new Set(srcs).size).toBe(3);
  });

  it('每种情绪都有非空中文说明，且各不相同', () => {
    const labels = moods.map((mood) => getNoiseProfile(mood).label);

    for (const label of labels) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(labels).size).toBe(3);
  });

  it('音量在 0..1 内且三档互不相同：雨声最靠前、黄昏最退后', () => {
    const positive = getNoiseProfile('positive').volume;
    const neutral = getNoiseProfile('neutral').volume;
    const negative = getNoiseProfile('negative').volume;

    for (const value of [positive, neutral, negative]) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(new Set([positive, neutral, negative]).size).toBe(3);
    // 消极（雨声）应最响：它承担主要安抚作用
    expect(negative).toBeGreaterThan(positive);
    expect(positive).toBeGreaterThan(neutral);
  });

  it('交叉淡化时长是正数且不超过 1 秒，避免切情绪时明显停顿', () => {
    expect(NOISE_CROSSFADE_MS).toBeGreaterThan(0);
    expect(NOISE_CROSSFADE_MS).toBeLessThanOrEqual(1000);
  });
});

describe('背景音乐加载态', () => {
  it('只有缓冲到 HAVE_FUTURE_DATA 且未暂停才算能出声', () => {
    expect(isNoiseAudible(4, false)).toBe(true);
    expect(isNoiseAudible(3, false)).toBe(true);
    expect(isNoiseAudible(2, false)).toBe(false);
    expect(isNoiseAudible(0, false)).toBe(false);
    // 有缓冲但被暂停（如自动播放被拦）不算能出声
    expect(isNoiseAudible(4, true)).toBe(false);
  });

  it('可出声阈值就是 3，边界严格', () => {
    expect(NOISE_READY_STATE).toBe(3);
    expect(isNoiseAudible(NOISE_READY_STATE - 1, false)).toBe(false);
    expect(isNoiseAudible(NOISE_READY_STATE, false)).toBe(true);
  });

  it('没有播放意图时是已关闭', () => {
    expect(resolveNoiseStatus({ active: false, audible: true, waitingMs: 0 })).toBe('off');
    expect(resolveNoiseStatus({ active: false, audible: false, waitingMs: 99_999 })).toBe('off');
  });

  it('要放但还不能出声是加载中；超过上限变加载较慢（仍是等待，不放弃）', () => {
    expect(resolveNoiseStatus({ active: true, audible: false, waitingMs: 0 })).toBe('loading');
    expect(
      resolveNoiseStatus({ active: true, audible: false, waitingMs: NOISE_LOAD_TIMEOUT_MS - 1 }),
    ).toBe('loading');
    expect(
      resolveNoiseStatus({ active: true, audible: false, waitingMs: NOISE_LOAD_TIMEOUT_MS }),
    ).toBe('slow');
    expect(
      resolveNoiseStatus({ active: true, audible: false, waitingMs: NOISE_LOAD_TIMEOUT_MS * 3 }),
    ).toBe('slow');
  });

  it('能出声就是播放中，即使等待已经超过上限', () => {
    expect(resolveNoiseStatus({ active: true, audible: true, waitingMs: 0 })).toBe('playing');
    expect(
      resolveNoiseStatus({ active: true, audible: true, waitingMs: NOISE_LOAD_TIMEOUT_MS * 5 }),
    ).toBe('playing');
  });

  it('加载上限是 20 秒量级，且可注入自定义值', () => {
    expect(NOISE_LOAD_TIMEOUT_MS).toBe(20_000);
    expect(
      resolveNoiseStatus({ active: true, audible: false, waitingMs: 999, timeoutMs: 1000 }),
    ).toBe('loading');
    expect(
      resolveNoiseStatus({ active: true, audible: false, waitingMs: 1000, timeoutMs: 1000 }),
    ).toBe('slow');
  });

  it('五种状态都有不同的中文文案', () => {
    const labels = (['off', 'loading', 'slow', 'playing', 'error'] as const).map(
      describeNoiseStatus,
    );

    expect(labels).toEqual(['已关闭', '加载中…', '加载较慢…', '播放中', '加载失败']);
    expect(new Set(labels).size).toBe(5);
  });

  it('报错优先于可出声：failed 即「加载失败」', () => {
    expect(resolveNoiseStatus({ active: true, audible: true, waitingMs: 0, failed: true })).toBe(
      'error',
    );
    expect(
      resolveNoiseStatus({ active: true, audible: false, waitingMs: 99_999, failed: true }),
    ).toBe('error');
    // 没有播放意图时仍然是「已关闭」
    expect(resolveNoiseStatus({ active: false, audible: false, waitingMs: 0, failed: true })).toBe(
      'off',
    );
  });

  it('报错自动重试参数是正数、上限为正整数', () => {
    expect(NOISE_ERROR_RETRY_MS).toBeGreaterThan(0);
    expect(NOISE_ERROR_MAX_RETRIES).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(NOISE_ERROR_MAX_RETRIES)).toBe(true);
  });
});

// ---- 引擎级：注入假 audio 元素（引擎是纯逻辑，不碰 React） ----
interface DebugPlayer {
  src: string;
  volume: number;
  paused: boolean;
  preload: string;
  currentTime: number;
  error: string | null;
}

class FakeAudioElement {
  src: string;
  loop = false;
  preload = 'auto';
  volume = 0;
  paused = true;
  readyState = 0;
  currentTime = 0;
  networkState = 1;
  error: MediaError | null = null;
  /** 置 true 后每次 play() 都报错（模拟坏资源）。 */
  broken = false;
  /**
   * 置 true 后 play() 返回挂起的 promise：`paused=false` 但 `readyState` 停在 2，
   * 也就是「已经开始播、但还没缓冲够」的真实加载态。用它才能覆盖加载门控本身。
   */
  stalled = false;
  playCalls = 0;
  readonly buffered = { length: 0 } as unknown as TimeRanges;
  private listeners = new Map<string, Set<() => void>>();
  private playResolvers: Array<() => void> = [];

  constructor(src?: string) {
    this.src = src ?? '';
  }

  addEventListener(type: string, listener: () => void): void {
    const set = this.listeners.get(type) ?? new Set<() => void>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of Array.from(this.listeners.get(type) ?? [])) {
      listener();
    }
  }

  play(): Promise<void> {
    this.playCalls += 1;
    if (this.broken) {
      this.error = { code: 4 } as unknown as MediaError;
      this.paused = true;
      this.readyState = 0;
      this.emit('error');
      return Promise.reject(new Error('fake media error'));
    }
    this.paused = false;
    if (this.stalled) {
      // 还不能出声：readyState 停在 HAVE_CURRENT_DATA，play() 的 promise 保持挂起
      this.readyState = 2;
      return new Promise<void>((resolve) => {
        this.playResolvers.push(resolve);
      });
    }
    // 假元素立刻可出声；引擎必须在 readyState>=3 且非暂停之后才淡入。
    this.readyState = 4;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  load(): void {
    this.readyState = 0;
    this.paused = true;
  }

  /** 缓冲够了：readyState 到 4 并发出 canplay / playing（不动 paused，那是元素自己的状态）。 */
  becomeBuffered(): void {
    this.stalled = false;
    this.readyState = 4;
    this.emit('canplay');
    this.emit('playing');
    for (const resolve of this.playResolvers.splice(0)) {
      resolve();
    }
  }
}

describe('背景音乐开关（引擎级）', () => {
  const originalAudio = window.Audio;
  let created: FakeAudioElement[] = [];
  /** 下一次创建的元素是否处于「还在缓冲」状态（要在 startWhiteNoise 之前设置）。 */
  let nextStalled = false;

  beforeEach(() => {
    created = [];
    nextStalled = false;
    Object.defineProperty(window, 'Audio', {
      value: function (src?: string): FakeAudioElement {
        const element = new FakeAudioElement(src);
        element.stalled = nextStalled;
        created.push(element);
        return element;
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'Audio', {
      value: originalAudio,
      configurable: true,
      writable: true,
    });
  });

  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const waitFor = async (
    predicate: () => boolean,
    timeoutMs = 2000,
  ): Promise<boolean> => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (predicate()) {
        return true;
      }
      await sleep(25);
    }
    return predicate();
  };

  const playersOf = (engine: SoundEngine): DebugPlayer[] =>
    (engine.__debug().players ?? []) as DebugPlayer[];

  const debugOf = (engine: SoundEngine): { errorRetries: number; pendingWake: boolean } =>
    engine.__debug() as { errorRetries: number; pendingWake: boolean };

  it('setEnabled(true) 只解锁，不主动放声', () => {
    const engine = createSoundEngine();

    engine.setEnabled(true);

    expect(engine.getNoiseState().status).toBe('off');
    expect(playersOf(engine).length).toBe(0);
  });

  it('打开开关后切情绪：新曲淡入、音量到目标', async () => {
    const engine = createSoundEngine();
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => engine.getNoiseState().volume > 0.4)).toBe(true);
    expect(engine.getNoiseState().status).toBe('playing');

    engine.setMood('positive');
    expect(await waitFor(() => /bird-forest/.test(engine.getNoiseState().src))).toBe(true);

    expect(await waitFor(() => engine.getNoiseState().volume > 0.5)).toBe(true);
    expect(engine.getNoiseState().status).toBe('playing');
    engine.stopWhiteNoise(0);
  });

  it('关闭开关后切情绪不会再放声（关掉后声音不得自己回来）', async () => {
    const engine = createSoundEngine();
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => engine.getNoiseState().volume > 0.1)).toBe(true);

    engine.stopWhiteNoise(0);
    engine.setMood('positive');

    await sleep(150);
    const state = engine.getNoiseState();
    expect(state.status).toBe('off');
    expect(state.volume).toBe(0);
    expect(state.playing).toBe(false);
    // 情绪仍然记账：重新打开时放的是新情绪
    expect(state.mood).toBe('positive');
    // 没有任何播放器在响，也没有为新情绪建播放器（不会偷偷开始下载）
    const players = playersOf(engine);
    expect(players.every((player) => player.paused)).toBe(true);
    expect(players.some((player) => /bird-forest/.test(player.src))).toBe(false);
  });

  it('静音时切情绪也不放声', async () => {
    const engine = createSoundEngine();
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => engine.getNoiseState().status === 'playing')).toBe(true);

    engine.setMuted(true);
    engine.setMood('positive');

    // 先等淡出收尾（关闭会淡出 0.6 s），再确认没有重新淡入
    expect(await waitFor(() => playersOf(engine).every((player) => player.paused))).toBe(true);
    await sleep(150);
    const state = engine.getNoiseState();
    expect(state.status).toBe('off');
    expect(state.volume).toBe(0);
    expect(playersOf(engine).every((player) => player.paused)).toBe(true);
  });

  it('切走的曲子暂停并停下载（preload=none），但保留播放位置', async () => {
    const engine = createSoundEngine();
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => created.length === 1)).toBe(true);
    const neutral = created[0];
    neutral.currentTime = 12.5;

    engine.setMood('positive');

    expect(
      await waitFor(() => neutral.paused && neutral.preload === 'none'),
    ).toBe(true);
    expect(neutral.currentTime).toBe(12.5);
    engine.stopWhiteNoise(0);
  });

  it('缓冲耗尽（waiting）时音量保持不变，恢复后继续播', async () => {
    const engine = createSoundEngine();
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => created.length === 1)).toBe(true);
    const element = created[0];
    // 先等淡入收敛，拿一个稳定的基准音量
    expect(await waitFor(() => Math.abs(element.volume - 0.5) < 0.001)).toBe(true);
    const settledVolume = element.volume;

    // 播放途中缓冲耗尽：readyState 掉到 HAVE_CURRENT_DATA 并进 waiting
    element.readyState = 2;
    element.emit('waiting');

    await sleep(150);
    const state = engine.getNoiseState();
    expect(state.status).toBe('loading'); // 状态回到「加载中」
    expect(element.paused).toBe(false); // 没有把元素停掉
    expect(element.volume).toBe(settledVolume); // 音量保持，不来回淡入淡出

    // 缓冲回来 → 回到播放，且不重新淡入
    element.becomeBuffered();
    expect(await waitFor(() => engine.getNoiseState().status === 'playing')).toBe(true);
    expect(element.volume).toBe(settledVolume);
    engine.stopWhiteNoise(0);
  });

  it('释放淡出还没收尾就重新武装：元素不得被停死（race 回归）', async () => {
    nextStalled = true; // 元素处于「还在缓冲」，淡入必须等真正可播
    const engine = createSoundEngine();
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => created.length === 1)).toBe(true);
    const element = created[0];
    expect(engine.getNoiseState().status).toBe('loading');

    // 关键时序：关（排一条 0.6 s 的释放淡出）→ 0.6 s 内又开，且此时还不能出声
    engine.stopWhiteNoise();
    engine.startWhiteNoise('neutral');
    await sleep(700); // 让那条释放淡出走完

    const debug = engine.__debug() as { fades: number; watchRunning: boolean };
    // 死锁指纹：paused=true + preload=none；正常应是「还在等可播」
    expect({
      paused: element.paused,
      preload: element.preload,
      fades: debug.fades,
      watchRunning: debug.watchRunning,
    }).toEqual({ paused: false, preload: 'auto', fades: 0, watchRunning: true });
    expect(engine.getNoiseState().status).toBe('loading');

    // 缓冲够了：必须能淡入到播放（被停死的话这里永远等不到）
    element.becomeBuffered();
    expect(await waitFor(() => engine.getNoiseState().status === 'playing')).toBe(true);
    expect(await waitFor(() => element.volume > 0.4)).toBe(true);
    engine.stopWhiteNoise(0);
  });

  it('加载中关掉开关：释放淡出结束后照样要停下载（防止把合法释放一起放过）', async () => {
    nextStalled = true;
    const engine = createSoundEngine();
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => created.length === 1)).toBe(true);
    const element = created[0];
    expect(engine.getNoiseState().status).toBe('loading');

    // 加载中关闭：silenceAll 会先清 fadeInTargets、再排释放淡出。
    // 释放判据若错用 enabled / canPlay()，这里就会被放过，旧曲下载永远停不下来。
    engine.stopWhiteNoise();

    expect(await waitFor(() => element.paused && element.preload === 'none', 2000)).toBe(true);
    expect(engine.getNoiseState().status).toBe('off');
  });

  it('数据就绪但元素已被（别处）暂停时，自愈重新拉起再淡入', async () => {
    nextStalled = true;
    const engine = createSoundEngine();
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => created.length === 1)).toBe(true);
    const element = created[0];

    // 模拟「武装之后被某条异步收尾暂停」这个形状（H1 的根因形状）
    element.pause();
    expect(element.paused).toBe(true);

    // 数据够了：引擎必须自己把播放拉起来，而不是卡在 paused 上
    element.becomeBuffered();

    expect(await waitFor(() => engine.getNoiseState().status === 'playing', 1000)).toBe(true);
    expect(element.paused).toBe(false);
    expect(await waitFor(() => element.volume > 0.4, 1000)).toBe(true);
    engine.stopWhiteNoise(0);
  });

  it('setEnabled(false) 之后切情绪不放声', async () => {
    const engine = createSoundEngine();
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => engine.getNoiseState().status === 'playing')).toBe(true);

    engine.setEnabled(false);
    expect(engine.getNoiseState().status).toBe('off');
    expect(await waitFor(() => playersOf(engine).every((player) => player.paused))).toBe(true);

    engine.setMood('positive');
    await sleep(200);
    const state = engine.getNoiseState();
    expect(state.status).toBe('off');
    expect(state.volume).toBe(0);
    const players = playersOf(engine);
    expect(players.every((player) => player.paused)).toBe(true);
    expect(players.some((player) => /bird-forest/.test(player.src))).toBe(false);
  });

  it('元素报错后显示加载失败，并自动重试恢复播放', async () => {
    const engine = createSoundEngine({ errorRetryMs: 40 });
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => engine.getNoiseState().status === 'playing')).toBe(true);
    const element = created[0];

    element.error = { code: 4 } as unknown as MediaError;
    element.emit('error');

    expect(engine.getNoiseState().status).toBe('error');
    expect(describeNoiseStatus(engine.getNoiseState().status)).toBe('加载失败');
    // 行为断言：自动重试之后必须真的回到播放（不钉 load() 这种实现细节）
    expect(await waitFor(() => engine.getNoiseState().status === 'playing', 1000)).toBe(true);
    engine.stopWhiteNoise(0);
  });

  it('自动重试用尽后仍可凭用户手势恢复（不放弃）', async () => {
    const engine = createSoundEngine({ errorRetryMs: 30 });
    engine.startWhiteNoise('neutral');
    expect(await waitFor(() => engine.getNoiseState().status === 'playing')).toBe(true);
    const element = created[0];
    element.broken = true;

    element.error = { code: 4 } as unknown as MediaError;
    element.emit('error');

    expect(await waitFor(() => debugOf(engine).errorRetries >= NOISE_ERROR_MAX_RETRIES, 2000)).toBe(
      true,
    );
    expect(debugOf(engine).pendingWake).toBe(true);
    expect(engine.getNoiseState().status).toBe('error');

    // 资源恢复 + 用户手势 → 必须能重新放出来
    element.broken = false;
    engine.applyGesture();

    expect(await waitFor(() => engine.getNoiseState().status === 'playing', 1000)).toBe(true);
    engine.stopWhiteNoise(0);
  });
});
