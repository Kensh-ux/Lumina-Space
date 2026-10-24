import { useRef } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import styles from './Sidebar.module.css';

interface SidebarResizeHandleProps {
  width: number;
  minWidth: number;
  maxWidth: number;
  onWidthChange: (width: number) => void;
  onDraggingChange: (dragging: boolean) => void;
  onReset: () => void;
}

const KEYBOARD_STEP = 16;

export default function SidebarResizeHandle({
  width,
  minWidth,
  maxWidth,
  onWidthChange,
  onDraggingChange,
  onReset,
}: SidebarResizeHandleProps) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    dragRef.current = { startX: event.clientX, startWidth: width };
    onDraggingChange(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    onWidthChange(drag.startWidth + (event.clientX - drag.startX));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      return;
    }
    dragRef.current = null;
    onDraggingChange(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = width - KEYBOARD_STEP;
    if (event.key === 'ArrowRight') next = width + KEYBOARD_STEP;
    if (event.key === 'Home') next = minWidth;
    if (event.key === 'End') next = maxWidth;
    if (next === null) {
      return;
    }
    event.preventDefault();
    onWidthChange(next);
  };

  return (
    <div
      className={styles.resizeHandle}
      role="separator"
      aria-orientation="vertical"
      aria-label="调整侧栏宽度"
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
    />
  );
}
