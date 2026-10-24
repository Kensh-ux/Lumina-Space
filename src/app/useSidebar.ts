import { useCallback, useEffect, useState } from 'react';

export const SIDEBAR_COLLAPSED_WIDTH = 56;
export const SIDEBAR_DEFAULT_WIDTH = 300;
export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 420;

const SIDEBAR_WIDTH_KEY = 'lumina:sidebar-width';

export interface SidebarLayout {
  expanded: boolean;
  width: number;
  dragging: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  setWidth: (width: number) => void;
  resetWidth: () => void;
  setDragging: (dragging: boolean) => void;
}

export function clampSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return SIDEBAR_DEFAULT_WIDTH;
  }
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}

function readStoredWidth(): number {
  if (typeof window === 'undefined') {
    return SIDEBAR_DEFAULT_WIDTH;
  }
  try {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (!raw) {
      return SIDEBAR_DEFAULT_WIDTH;
    }
    return clampSidebarWidth(Number.parseInt(raw, 10));
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

function storeWidth(width: number): void {
  try {
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampSidebarWidth(width)));
  } catch {
    // 存储不可用时只影响刷新保持，不影响本次交互。
  }
}

export function useSidebar(initialExpanded = true): SidebarLayout {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [width, setWidthState] = useState<number>(readStoredWidth);
  const [dragging, setDragging] = useState(false);

  // 拖拽中不写，松手（dragging=false）后持久化最终宽度。
  useEffect(() => {
    if (dragging) {
      return;
    }
    storeWidth(width);
  }, [width, dragging]);

  const setWidth = useCallback((next: number) => {
    setWidthState(clampSidebarWidth(next));
  }, []);

  const resetWidth = useCallback(() => {
    setWidthState(SIDEBAR_DEFAULT_WIDTH);
  }, []);

  const expand = useCallback(() => setExpanded(true), []);
  const collapse = useCallback(() => setExpanded(false), []);
  const toggle = useCallback(() => setExpanded((previous) => !previous), []);

  return {
    expanded,
    width,
    dragging,
    toggle,
    expand,
    collapse,
    setWidth,
    resetWidth,
    setDragging,
  };
}
