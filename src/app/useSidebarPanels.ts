import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { closeOverlay, getActiveOverlay, openOverlay, subscribeOverlay } from '../lib/overlay';
import type { SidebarLayout } from './useSidebar';

export type SidebarPanelId = 'today' | 'planner' | 'focus' | 'settings';

interface UseSidebarPanelsResult {
  activePanel: SidebarPanelId;
  sheetOpen: boolean;
  isMobile: boolean;
  sheetCloseRef: RefObject<HTMLButtonElement | null>;
  navRefs: RefObject<Record<SidebarPanelId, HTMLButtonElement | null>>;
  setSheetOpen: (open: boolean) => void;
  handleSelect: (id: SidebarPanelId) => void;
}

export function useSidebarPanels(
  initialPanel: SidebarPanelId | null,
  layout: SidebarLayout,
  onPanelChange?: (panel: SidebarPanelId) => void,
): UseSidebarPanelsResult {
  const [activePanel, setActivePanel] = useState<SidebarPanelId>(initialPanel ?? 'today');
  const [sheetOpen, setSheetOpen] = useState(Boolean(initialPanel));
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1119px)').matches,
  );
  const sheetOpenRef = useRef(sheetOpen);
  sheetOpenRef.current = sheetOpen;
  const sheetCloseRef = useRef<HTMLButtonElement>(null);
  const navRefs = useRef<Record<SidebarPanelId, HTMLButtonElement | null>>({
    today: null,
    planner: null,
    focus: null,
    settings: null,
  });
  const firstSheetEffectRef = useRef(true);
  const previousSheetRef = useRef(sheetOpen);
  const { expanded } = layout;

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1119px)');
    const handleChange = () => setIsMobile(query.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  // 只有移动端 sheet 参与 overlay 协调；桌面侧栏是布局的一部分。
  useEffect(() => {
    if (!isMobile || !sheetOpen) {
      if (getActiveOverlay() === 'sidebar') {
        closeOverlay('sidebar');
      }
      return;
    }
    openOverlay('sidebar');
    return () => {
      if (getActiveOverlay() === 'sidebar') {
        closeOverlay('sidebar');
      }
    };
  }, [isMobile, sheetOpen]);

  // 打开圆盘等其它浮层时，sheet 自动收起。
  useEffect(() => {
    return subscribeOverlay((activeId) => {
      if (activeId !== null && activeId !== 'sidebar' && sheetOpenRef.current) {
        setSheetOpen(false);
      }
    });
  }, []);

  // 只在 sheet 从关到开时把焦点送进关闭按钮；首帧预览不抢焦点。
  useEffect(() => {
    if (firstSheetEffectRef.current) {
      firstSheetEffectRef.current = false;
      return;
    }
    if (isMobile && sheetOpen) {
      sheetCloseRef.current?.focus();
    }
  }, [isMobile, sheetOpen]);

  // sheet 从开到关时焦点回导航项；sheet 已打开时切换模块不动焦点。
  useEffect(() => {
    if (previousSheetRef.current && !sheetOpen && isMobile) {
      navRefs.current[activePanel]?.focus();
    }
    previousSheetRef.current = sheetOpen;
  }, [isMobile, sheetOpen, activePanel]);

  // Esc：圆盘优先；否则移动端收 sheet、桌面收起侧栏。
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== 'Escape' ||
        getActiveOverlay() === 'mood-dial'
      ) {
        return;
      }
      if (isMobile && sheetOpen) {
        event.preventDefault();
        setSheetOpen(false);
        return;
      }
      if (!isMobile && expanded) {
        event.preventDefault();
        layout.collapse();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, sheetOpen, expanded, layout]);

  const handleSelect = useCallback(
    (id: SidebarPanelId) => {
      if (id !== activePanel) {
        onPanelChange?.(id);
      }
      setActivePanel(id);
      if (isMobile) {
        setSheetOpen((previous) => !(previous && activePanel === id));
        return;
      }
      if (!expanded) {
        layout.expand();
      }
    },
    [isMobile, activePanel, expanded, layout, onPanelChange],
  );

  return {
    activePanel,
    sheetOpen,
    isMobile,
    sheetCloseRef,
    navRefs,
    setSheetOpen,
    handleSelect,
  };
}
