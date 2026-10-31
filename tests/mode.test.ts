import { describe, expect, it } from 'vitest';
import { resolveModeUrls } from '../src/lib/mode';

describe('resolveModeUrls', () => {
  it('自定义域名的根路径', () => {
    expect(resolveModeUrls('https://example.com/')).toEqual({
      simple: 'https://example.com/',
      room: 'https://example.com/room/',
    });
  });

  it('GitHub Pages 项目页保留 repo 前缀', () => {
    expect(resolveModeUrls('https://name.github.io/repo/')).toEqual({
      simple: 'https://name.github.io/repo/',
      room: 'https://name.github.io/repo/room/',
    });
  });

  it('直接访问 index.html 时回到所在目录', () => {
    expect(resolveModeUrls('https://example.com/repo/index.html')).toEqual({
      simple: 'https://example.com/repo/',
      room: 'https://example.com/repo/room/',
    });
  });

  it('带查询参数时仍以目录为基准', () => {
    expect(resolveModeUrls('http://localhost:5173/?panel=today')).toEqual({
      simple: 'http://localhost:5173/',
      room: 'http://localhost:5173/room/',
    });
  });
});