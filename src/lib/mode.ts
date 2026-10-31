/** 双模式入口：模式由 URL 路径表达，不额外写 localStorage，避免自动重定向。 */
export type AppMode = 'simple' | 'room';

export interface ModeUrls {
  simple: string;
  room: string;
}

/**
 * 从任意入口解析两个模式的绝对 URL：
 * - `https://example.com/` → `/` 与 `/room/`
 * - `https://example.com/repo/` → `/repo/` 与 `/repo/room/`
 * - `https://example.com/repo/index.html` → `/repo/` 与 `/repo/room/`
 */
export function resolveModeUrls(baseUri: string): ModeUrls {
  const simple = new URL('./', baseUri).href;
  return {
    simple,
    room: new URL('room/', simple).href,
  };
}

/** 简易模式入口：当前页面所在目录。 */
export function simpleUrl(): string {
  return resolveModeUrls(document.baseURI).simple;
}

/** 3D 入口：固定与简易模式同源的 room/ 子目录。 */
export function roomUrl(): string {
  return resolveModeUrls(document.baseURI).room;
}