export type ConfirmKind = 'complete' | 'uncomplete' | 'delete';

export interface ConfirmSpec {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
}

// 完成 / 取消完成 / 删除三套文案；弹窗正文带任务标题。
export function getConfirmSpec(kind: ConfirmKind, taskTitle: string): ConfirmSpec {
  switch (kind) {
    case 'complete':
      return {
        title: '是否确认完成？',
        message: `「${taskTitle}」将标记为已完成。`,
        confirmLabel: '确认完成',
        danger: false,
      };
    case 'uncomplete':
      return {
        title: '是否取消完成？',
        message: `「${taskTitle}」将标记为未完成。`,
        confirmLabel: '确认取消完成',
        danger: false,
      };
    case 'delete':
      return {
        title: '是否确认删除？',
        message: `「${taskTitle}」删除后无法恢复。`,
        confirmLabel: '确认删除',
        danger: true,
      };
  }
}

// 勾选状态 → 需要确认的动作：未完成点勾 = 完成，已完成点勾 = 取消完成。
export function toggleConfirmKind(done: boolean): ConfirmKind {
  return done ? 'uncomplete' : 'complete';
}