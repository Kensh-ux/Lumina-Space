import { MOOD_IDS, type CustomBackgrounds } from './types';

/** 设置面板展示的推荐尺寸文案。 */
export const RECOMMENDED_BACKGROUND_SIZE = '1920×1080（16:9 横图）';

export const MAX_BACKGROUND_WIDTH = 1920;
export const MAX_BACKGROUND_HEIGHT = 1080;
export const MAX_BACKGROUND_FILE_BYTES = 12 * 1024 * 1024;
/** 压缩后的 data URL 上限（字符数）：约 1.4M，超过会明显拖慢 localStorage。 */
export const MAX_BACKGROUND_DATA_URL_LENGTH = 1_400_000;
/** 先降到 0.85；仍超长就继续 0.75 / 0.65，再超长就缩小尺寸。 */
export const BACKGROUND_QUALITIES = [0.85, 0.75, 0.65] as const;

const SUPPORTED_BACKGROUND_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
const DATA_URL_PREFIX = /^data:image\/(?:jpeg|png|webp);base64,/;
const MAX_COMPRESS_ATTEMPTS = 6;
const MIN_BACKGROUND_EDGE = 64;

export interface BackgroundSize {
  width: number;
  height: number;
}

export interface BackgroundFileInfo {
  type: string;
  size: number;
}

// 等比缩到不超过 1920×1080；小图不放大。非法尺寸返回 0×0，由调用方兜底。
export function fitBackgroundSize(width: number, height: number): BackgroundSize {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(1, MAX_BACKGROUND_WIDTH / width, MAX_BACKGROUND_HEIGHT / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// 返回可读错误文案；合法返回 null。只做校验，不读文件内容。
export function validateBackgroundFile(file: BackgroundFileInfo): string | null {
  if (!SUPPORTED_BACKGROUND_TYPES.includes(file.type)) {
    return '请选择 JPG、PNG 或 WebP 图片。';
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return '图片文件为空，请重新选择。';
  }
  if (file.size > MAX_BACKGROUND_FILE_BYTES) {
    return '图片超过 12 MB，请先压缩后再上传。';
  }
  return null;
}

// 只接受本应用写出的 JPEG / PNG / WebP base64 data URL，且必须有内容、不超长。
export function isCustomBackgroundDataUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  if (value.length > MAX_BACKGROUND_DATA_URL_LENGTH) {
    return false;
  }
  const match = DATA_URL_PREFIX.exec(value);
  return match !== null && value.length > match[0].length;
}

// 旧数据缺字段 / 字段类型不对 → {}；非法 data URL 或超长逐场景丢弃。
export function normalizeCustomBackgrounds(value: unknown): CustomBackgrounds {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  const source = value as Record<string, unknown>;
  const backgrounds: CustomBackgrounds = {};
  for (const mood of MOOD_IDS) {
    if (isCustomBackgroundDataUrl(source[mood])) {
      backgrounds[mood] = source[mood];
    }
  }
  return backgrounds;
}

function decodeImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片解析失败，请换一张试试。'));
    };
    image.src = url;
  });
}

// 白底、等比缩放、JPEG 压缩；超过字符上限时逐轮缩小，最终仍失败则给可读错误。
export async function compressBackground(file: File): Promise<string> {
  const validationError = validateBackgroundFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  const image = await decodeImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持图片压缩，请换一个浏览器。');
  }
  let size = fitBackgroundSize(image.naturalWidth, image.naturalHeight);
  if (size.width === 0 || size.height === 0) {
    throw new Error('图片尺寸异常，请换一张试试。');
  }
  let lastLength = 0;
  for (let attempt = 0; attempt < MAX_COMPRESS_ATTEMPTS; attempt += 1) {
    canvas.width = size.width;
    canvas.height = size.height;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);
    for (const quality of BACKGROUND_QUALITIES) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      lastLength = dataUrl.length;
      if (dataUrl.length <= MAX_BACKGROUND_DATA_URL_LENGTH) {
        return dataUrl;
      }
    }
    if (lastLength === 0) {
      break;
    }
    const shrink = Math.sqrt(MAX_BACKGROUND_DATA_URL_LENGTH / lastLength) * 0.92;
    const nextWidth = Math.max(MIN_BACKGROUND_EDGE, Math.round(size.width * shrink));
    const nextHeight = Math.max(MIN_BACKGROUND_EDGE, Math.round(size.height * shrink));
    if (nextWidth >= size.width || nextHeight >= size.height) {
      break;
    }
    size = { width: nextWidth, height: nextHeight };
  }
  throw new Error('图片太大，换一张或先压缩。');
}
