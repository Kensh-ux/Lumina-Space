import { describe, expect, it } from 'vitest';
import {
  getNoiseProfile,
  NOISE_CROSSFADE_MS,
  NOISE_KEY,
  readSoundMuted,
  readWhiteNoiseEnabled,
  SOUND_KEY,
  writeSoundMuted,
  writeWhiteNoiseEnabled,
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
