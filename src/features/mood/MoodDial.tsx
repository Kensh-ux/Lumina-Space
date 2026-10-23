import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { getMoodMeta, MOODS, type MoodId } from './mood';
import styles from './MoodDial.module.css';

interface MoodDialProps {
  current: MoodId;
  onChange: (mood: MoodId) => void;
  defaultOpen?: boolean;
}

const DIAL_ANGLES = [0, 45, 90] as const;
const DIAL_RADIUS = 78;

function itemPosition(index: number): CSSProperties {
  const radians = (DIAL_ANGLES[index] * Math.PI) / 180;
  return {
    left: `${Math.cos(radians) * DIAL_RADIUS}px`,
    top: `${Math.sin(radians) * DIAL_RADIUS}px`,
  };
}

export default function MoodDial({ current, onChange, defaultOpen = false }: MoodDialProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [pendingFocus, setPendingFocus] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const meta = getMoodMeta(current);

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (pendingFocus === null) {
      return;
    }
    itemRefs.current[pendingFocus]?.focus();
    setPendingFocus(null);
  }, [pendingFocus]);

  const moveFocus = (step: number) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    if (items.length === 0) {
      return;
    }
    const activeIndex = items.findIndex((item) => item === document.activeElement);
    const nextIndex = (activeIndex + step + items.length) % items.length;
    items[nextIndex].focus();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      closeMenu(false);
      return;
    }
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowRight'
    ) {
      event.preventDefault();
      setOpen(true);
      setPendingFocus(0);
    }
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeMenu(true);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        moveFocus(-1);
        break;
      case 'Home':
        event.preventDefault();
        itemRefs.current[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        itemRefs.current[MOODS.length - 1]?.focus();
        break;
      default:
        break;
    }
  };

  const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) {
      return;
    }
    setOpen(false);
  };

  const handleMouseLeave = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && containerRef.current?.contains(active)) {
      triggerRef.current?.focus();
    }
    setOpen(false);
  };

  const handleSelect = (mood: MoodId) => {
    onChange(mood);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={styles.dial}
      data-open={open}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={handleMouseLeave}
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
        onClick={() => setOpen((previous) => !previous)}
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
        <div
          id="mood-dial-menu"
          role="menu"
          aria-label="选择当前情绪"
          className={styles.menu}
          onKeyDown={handleMenuKeyDown}
        >
          {MOODS.map((mood, index) => (
            <button
              key={mood.id}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={mood.id === current}
              className={styles.item}
              style={itemPosition(index)}
              onClick={() => handleSelect(mood.id)}
            >
              <span className={styles.itemEmoji} aria-hidden="true">
                {mood.emoji}
              </span>
              <span className={styles.itemLabel}>{mood.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
