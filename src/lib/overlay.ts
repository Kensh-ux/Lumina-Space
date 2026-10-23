export type OverlayId = 'mood-dial' | 'sidebar';

type OverlayListener = (active: OverlayId | null) => void;

let activeOverlay: OverlayId | null = null;
const listeners = new Set<OverlayListener>();

function notify(): void {
  for (const listener of listeners) {
    listener(activeOverlay);
  }
}

export function getActiveOverlay(): OverlayId | null {
  return activeOverlay;
}

// 同一时间只有一个浮层活跃；打开新的会自动通知旧的关闭。
export function openOverlay(id: OverlayId): void {
  if (activeOverlay === id) {
    return;
  }
  activeOverlay = id;
  notify();
}

export function closeOverlay(id: OverlayId): void {
  if (activeOverlay !== id) {
    return;
  }
  activeOverlay = null;
  notify();
}

export function subscribeOverlay(listener: OverlayListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
