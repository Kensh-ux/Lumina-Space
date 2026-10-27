import { describe, expect, it } from 'vitest';
import { getConfirmSpec, toggleConfirmKind } from '../src/features/tasks/confirm';

describe('getConfirmSpec', () => {
  it('完成：标题、正文带任务标题、非危险按钮', () => {
    expect(getConfirmSpec('complete', '数学')).toEqual({
      title: '是否确认完成？',
      message: '「数学」将标记为已完成。',
      confirmLabel: '确认完成',
      danger: false,
    });
  });

  it('取消完成：标题与正文', () => {
    expect(getConfirmSpec('uncomplete', '数学')).toEqual({
      title: '是否取消完成？',
      message: '「数学」将标记为未完成。',
      confirmLabel: '确认取消完成',
      danger: false,
    });
  });

  it('删除：危险样式与不可恢复文案', () => {
    expect(getConfirmSpec('delete', '数学')).toEqual({
      title: '是否确认删除？',
      message: '「数学」删除后无法恢复。',
      confirmLabel: '确认删除',
      danger: true,
    });
  });

  it('标题里的引号 / 特殊字符原样带进正文', () => {
    expect(getConfirmSpec('delete', '背「单词」').message).toBe(
      '「背「单词」」删除后无法恢复。',
    );
  });
});

describe('toggleConfirmKind', () => {
  it('未完成时请求完成，已完成时请求取消完成', () => {
    expect(toggleConfirmKind(false)).toBe('complete');
    expect(toggleConfirmKind(true)).toBe('uncomplete');
  });
});