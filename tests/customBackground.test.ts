import { describe, expect, it } from 'vitest';
import {
  BACKGROUND_QUALITIES,
  fitBackgroundSize,
  isCustomBackgroundDataUrl,
  MAX_BACKGROUND_DATA_URL_LENGTH,
  MAX_BACKGROUND_FILE_BYTES,
  normalizeCustomBackgrounds,
  validateBackgroundFile,
} from '../src/lib/customBackground';

const JPEG = 'data:image/jpeg;base64,AAAA';
const PNG = 'data:image/png;base64,BBBB';
const WEBP = 'data:image/webp;base64,CCCC';
const TOO_LONG = `data:image/jpeg;base64,${'A'.repeat(MAX_BACKGROUND_DATA_URL_LENGTH)}`;

describe('fitBackgroundSize', () => {
  it('超宽 16:9 图缩到 1920×1080', () => {
    expect(fitBackgroundSize(3840, 2160)).toEqual({ width: 1920, height: 1080 });
  });

  it('小图不放大', () => {
    expect(fitBackgroundSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitBackgroundSize(1920, 1080)).toEqual({ width: 1920, height: 1080 });
  });

  it('超长竖图按高度缩，保持比例', () => {
    expect(fitBackgroundSize(1000, 4000)).toEqual({ width: 270, height: 1080 });
  });

  it('方图两边都不超过上限', () => {
    expect(fitBackgroundSize(3000, 3000)).toEqual({ width: 1080, height: 1080 });
  });

  it('超宽横图按宽度缩', () => {
    expect(fitBackgroundSize(6000, 1000)).toEqual({ width: 1920, height: 320 });
  });

  it('非法尺寸返回 0×0', () => {
    expect(fitBackgroundSize(0, 100)).toEqual({ width: 0, height: 0 });
    expect(fitBackgroundSize(100, -1)).toEqual({ width: 0, height: 0 });
    expect(fitBackgroundSize(Number.NaN, 100)).toEqual({ width: 0, height: 0 });
  });
});

describe('isCustomBackgroundDataUrl', () => {
  it('接受 JPEG / PNG / WebP 的 base64 data URL', () => {
    expect(isCustomBackgroundDataUrl(JPEG)).toBe(true);
    expect(isCustomBackgroundDataUrl(PNG)).toBe(true);
    expect(isCustomBackgroundDataUrl(WEBP)).toBe(true);
  });

  it('拒绝普通 URL、非图片 MIME、空内容与非字符串', () => {
    expect(isCustomBackgroundDataUrl('https://example.com/a.jpg')).toBe(false);
    expect(isCustomBackgroundDataUrl('data:text/plain;base64,AAAA')).toBe(false);
    expect(isCustomBackgroundDataUrl('data:image/jpeg;base64,')).toBe(false);
    expect(isCustomBackgroundDataUrl(undefined)).toBe(false);
    expect(isCustomBackgroundDataUrl(42)).toBe(false);
  });

  it('拒绝超过字符上限的 data URL', () => {
    expect(TOO_LONG.length).toBeGreaterThan(MAX_BACKGROUND_DATA_URL_LENGTH);
    expect(isCustomBackgroundDataUrl(TOO_LONG)).toBe(false);
  });
});

describe('validateBackgroundFile', () => {
  it('接受支持的类型且不超过 12 MB', () => {
    expect(validateBackgroundFile({ type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(validateBackgroundFile({ type: 'image/png', size: 1024 })).toBeNull();
    expect(
      validateBackgroundFile({ type: 'image/webp', size: MAX_BACKGROUND_FILE_BYTES }),
    ).toBeNull();
  });

  it('非图片 / 空文件 / 超大文件返回可读错误', () => {
    expect(validateBackgroundFile({ type: 'image/gif', size: 1024 })).toContain('JPG');
    expect(validateBackgroundFile({ type: 'text/plain', size: 1024 })).not.toBeNull();
    expect(validateBackgroundFile({ type: 'image/jpeg', size: 0 })).not.toBeNull();
    expect(
      validateBackgroundFile({ type: 'image/jpeg', size: MAX_BACKGROUND_FILE_BYTES + 1 }),
    ).toContain('12 MB');
  });
});

describe('normalizeCustomBackgrounds', () => {
  it('旧数据缺字段 / 类型不对时返回空对象', () => {
    expect(normalizeCustomBackgrounds(undefined)).toEqual({});
    expect(normalizeCustomBackgrounds(null)).toEqual({});
    expect(normalizeCustomBackgrounds([])).toEqual({});
    expect(normalizeCustomBackgrounds('positive')).toEqual({});
  });

  it('合法场景保留，非法与超长逐场景丢弃', () => {
    const input = {
      positive: JPEG,
      neutral: 'https://example.com/a.jpg',
      negative: TOO_LONG,
    };

    expect(normalizeCustomBackgrounds(input)).toEqual({ positive: JPEG });
  });

  it('不修改输入对象，并忽略未知场景', () => {
    const input = { positive: JPEG, happy: PNG };

    const normalized = normalizeCustomBackgrounds(input);

    expect(normalized).toEqual({ positive: JPEG });
    expect(input).toEqual({ positive: JPEG, happy: PNG });
  });
});

describe('BACKGROUND_QUALITIES', () => {
  it('从 0.85 降到 0.65，且不超过 1920×1080 的验证值', () => {
    expect(BACKGROUND_QUALITIES[0]).toBe(0.85);
    expect(BACKGROUND_QUALITIES[BACKGROUND_QUALITIES.length - 1]).toBe(0.65);
  });
});
