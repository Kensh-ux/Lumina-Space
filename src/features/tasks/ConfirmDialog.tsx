import { useEffect, useId, useRef } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useModalFocus } from '../../lib/useModalFocus';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** 触发控件被移除时的兜底焦点（例如删除成功后原来的 × 已不存在）。 */
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

// 通用二次确认：Esc / 点遮罩取消，Tab 焦点循环，默认焦点在「取消」上。
// 关闭后把焦点还给打开弹窗的触发控件；触发控件已被移除时退到 fallbackFocusRef。
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
  fallbackFocusRef,
}: ConfirmDialogProps) {
  const headingId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const { dialogRef, handleKeyDown } = useModalFocus();

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const trigger = triggerRef.current;
    return () => {
      if (trigger && trigger.isConnected) {
        trigger.focus();
        return;
      }
      const fallback = fallbackFocusRef?.current;
      if (fallback && fallback.isConnected) {
        fallback.focus();
      }
    };
  }, [fallbackFocusRef]);

  // 捕获阶段先处理 Esc，避免侧栏 / 移动 sheet 的 document 监听同时收起。
  useEffect(() => {
    const handleKeyDownDocument = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };
    document.addEventListener('keydown', handleKeyDownDocument, true);
    return () => document.removeEventListener('keydown', handleKeyDownDocument, true);
  }, [onCancel]);

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={messageId}
        onKeyDown={handleKeyDown}
      >
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>
        <p id={messageId} className={styles.message}>
          {message}
        </p>
        <div className={styles.actions}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className={danger ? styles.dangerButton : styles.confirmButton}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
