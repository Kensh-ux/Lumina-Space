import { describe, expect, it } from 'vitest';
import {
  getNoiseProfile,
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
  it('积极为带通+pad，中性为棕噪声低通，消极为高通+缓慢调制', () => {
    const positive = getNoiseProfile('positive');
    const neutral = getNoiseProfile('neutral');
    const negative = getNoiseProfile('negative');

    expect(positive).toMatchObject({ filterType: 'bandpass', noiseColor: 'pink' });
    expect(positive.padFrequencies?.length).toBeGreaterThan(0);
    expect(neutral).toMatchObject({ filterType: 'lowpass', noiseColor: 'brown' });
    expect(negative).toMatchObject({ filterType: 'highpass', noiseColor: 'white' });
    expect(negative.modulation?.rate).toBeGreaterThan(0);
    expect(negative.modulation?.depth).toBeGreaterThan(0);
  });

  it('三种情绪的 filter/frequency/gain 都不相同', () => {
    const profiles = ['positive', 'neutral', 'negative'].map((mood) =>
      getNoiseProfile(mood as 'positive' | 'neutral' | 'negative'),
    );

    expect(new Set(profiles.map((profile) => profile.filterType)).size).toBe(3);
    expect(new Set(profiles.map((profile) => profile.frequency)).size).toBe(3);
    expect(new Set(profiles.map((profile) => profile.gain)).size).toBe(3);
  });
});
