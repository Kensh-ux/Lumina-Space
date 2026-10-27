import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

// 弹窗用 portal 挂在 body：把 #root 设为 inert，Tab 在 dialog 内循环。
// 任务编辑器、确认弹窗、情绪记录编辑器共用这一份。
export function useModalFocus() {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) {
      return;
    }
    const wasInert = root.hasAttribute('inert');
    root.setAttribute('inert', '');
    return () => {
      if (!wasInert) {
        root.removeAttribute('inert');
      }
    };
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') {
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => element.offsetParent !== null);
    if (focusables.length === 0) {
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  };

  return { dialogRef, handleKeyDown };
}