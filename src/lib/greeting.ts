const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) {
    return '早上好';
  }
  if (hour < 18) {
    return '下午好';
  }
  return '晚上好';
}

export function formatHeroDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${year}年${month}月${day}日 ${WEEKDAY_LABELS[now.getDay()]}`;
}

export function formatTodaySummary(open: number, done: number, focusMinutes: number): string {
  return `${open} 件待办 · 已完成 ${done} · 专注 ${focusMinutes} 分钟`;
}
