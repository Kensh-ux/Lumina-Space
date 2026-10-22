import { describe, expect, it } from 'vitest';
import { DEFAULT_MOOD, getMoodMeta, isMoodId, MOODS } from '../src/features/mood/mood';

describe('MOODS', () => {
  it('正好包含三条情绪', () => {
    expect(MOODS).toHaveLength(3);
  });

  it('id 不重复', () => {
    const ids = MOODS.map((mood) => mood.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('默认情绪是中性', () => {
    expect(DEFAULT_MOOD).toBe('neutral');
  });
});

describe('isMoodId', () => {
  it('接受三个合法值', () => {
    expect(isMoodId('positive')).toBe(true);
    expect(isMoodId('neutral')).toBe(true);
    expect(isMoodId('negative')).toBe(true);
  });

  it('拒绝非法值', () => {
    expect(isMoodId('x')).toBe(false);
    expect(isMoodId(null)).toBe(false);
    expect(isMoodId(1)).toBe(false);
    expect(isMoodId(undefined)).toBe(false);
  });
});

describe('getMoodMeta', () => {
  it('返回对应情绪的元数据', () => {
    expect(getMoodMeta('positive').label).toBe('积极');
    expect(getMoodMeta('negative').label).toBe('消极');
  });

  it('非法值回退到 MOODS[1]（中性）', () => {
    expect(getMoodMeta('x' as never)).toBe(MOODS[1]);
  });
});
