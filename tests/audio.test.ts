import { describe, expect, it } from 'vitest';
import {
  readSoundMuted,
  SOUND_KEY,
  writeSoundMuted,
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
