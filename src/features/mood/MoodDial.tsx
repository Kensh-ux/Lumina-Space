import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import MoodDialMenu from './MoodDialMenu';
import { getMoodMeta, type MoodId } from './mood';
import styles from './MoodDial.module.css';

interface MoodDialProps {
  current: MoodId;
  onChange: (mood: MoodId) => void;
  defaultOpen?: boolean;
}

export default function MoodDial({ current, onChange, defaultOpen = false }: MoodDialProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [pendingFocus, setPendingFocus] = useState<number | null>(null);
  const openedByHoverRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const meta = getMoodMeta(current);

  const closeMenu = useCallback((restoreFocus = false) => {
    openedByHoverRef.current = false;
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  // 菜单打开时，Esc 在整页范围内都可关闭（焦点可能不在圆盘里）。
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeMenu]);

  // 点击菜单外部关闭；若焦点还在菜单里，把焦点还给圆盘。
  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }
      const active = document.activeElement;
      const focusInMenu = active instanceof HTMLElement && containerRef.current?.contains(active);
      closeMenu(focusInMenu);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, closeMenu]);

  useEffect(() => {
    if (pendingFocus === null) {
      return;
    }
    itemRefs.current[pendingFocus]?.focus();
    setPendingFocus(null);
  }, [pendingFocus]);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowRight'
    ) {
      event.preventDefault();
      openedByHoverRef.current = false;
      setOpen(true);
      setPendingFocus(0);
    }
  };

  const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) {
      return;
    }
    closeMenu(false);
  };

  const handlePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || open) {
      return;
    }
    openedByHoverRef.current = true;
    setOpen(true);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !openedByHoverRef.current) {
      return;
    }
    openedByHoverRef.current = false;
    setOpen(false);
  };

  const handleTriggerClick = () => {
    if (!open) {
      openedByHoverRef.current = false;
      setOpen(true);
      return;
    }
    if (openedByHoverRef.current) {
      // hover 打开后的第一次点击：保持展开，转为 click-open。
      openedByHoverRef.current = false;
      return;
    }
    closeMenu(false);
  };

  const handleSelect = (mood: MoodId) => {
    onChange(mood);
    closeMenu(true);
  };

  return (
    <div
      ref={containerRef}
      className={styles.dial}
      data-open={open}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onBlur={handleBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'mood-dial-menu' : undefined}
        aria-label={`当前情绪：${meta.label}，打开情绪选择`}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={styles.triggerEmoji} aria-hidden="true">
          {meta.emoji}
        </span>
        <span className={styles.triggerLabel} aria-hidden="true">
          {meta.label}
        </span>
      </button>

      {open ? (
        <MoodDialMenu current={current} itemRefs={itemRefs} onSelect={handleSelect} />
      ) : null}
    </div>
  );
}
