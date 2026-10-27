import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useModalFocus } from '../../lib/useModalFocus';
import EmotionPicker from './EmotionPicker';
import {
  clampMoodScore,
  formatMoodScore,
  MOOD_NOTE_CONTENT_MAX_LENGTH,
  MOOD_NOTE_SCORE_MAX,
  MOOD_NOTE_SCORE_MIN,
  parseMoodScore,
  type MoodNoteInput,
} from './journal';
import styles from './MoodNoteEditor.module.css';

interface MoodNoteEditorProps {
  onSubmit: (input: MoodNoteInput) => void;
  onCancel: () => void;
}

export default function MoodNoteEditor({ onSubmit, onCancel }: MoodNoteEditorProps) {
  const headingId = useId();
  const errorId = `${headingId}-error`;
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [content, setContent] = useState('');
  const [scoreText, setScoreText] = useState('0');
  const [error, setError] = useState('');
  const { dialogRef, handleKeyDown } = useModalFocus();
  const score = parseMoodScore(scoreText);

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

  const handleScoreText = (raw: string) => {
    if (raw.trim().length === 0) {
      setScoreText(raw);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setScoreText('0');
      return;
    }
    const clamped = clampMoodScore(parsed);
    setScoreText(clamped === parsed ? raw : String(clamped));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chosen = custom.trim().length > 0 ? custom.trim() : (emotion ?? '');
    if (chosen.length === 0) {
      setError('请选择一种情绪，或自己写一个');
      return;
    }
    if (content.trim().length === 0) {
      setError('请填写事件描述');
      contentRef.current?.focus();
      return;
    }
    onSubmit({ emotion: chosen, content, score: parseMoodScore(scoreText) });
  };

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
        onKeyDown={handleKeyDown}
      >
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <header className={styles.header}>
            <h2 id={headingId} className={styles.heading}>
              写一条情绪记录
            </h2>
          </header>

          <div className={styles.body}>
            <EmotionPicker
              emotion={emotion}
              custom={custom}
              onSelect={(word) => {
                setEmotion(word);
                setCustom('');
                if (error) {
                  setError('');
                }
              }}
              onCustomChange={(value) => {
                setCustom(value);
                if (value.trim().length > 0) {
                  setEmotion(null);
                }
              }}
            />

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${headingId}-content`}>
                事件描述 <span className={styles.required}>*</span>
              </label>
              <textarea
                id={`${headingId}-content`}
                ref={contentRef}
                className={styles.textarea}
                rows={5}
                value={content}
                maxLength={MOOD_NOTE_CONTENT_MAX_LENGTH}
                placeholder="发生了什么？当时是什么感觉？"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => {
                  setContent(event.target.value);
                  if (error && event.target.value.trim().length > 0) {
                    setError('');
                  }
                }}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${headingId}-score`}>
                事件好感值 · {formatMoodScore(score)}
              </label>
              <div className={styles.scoreRow}>
                <input
                  id={`${headingId}-score-range`}
                  className={styles.range}
                  type="range"
                  min={MOOD_NOTE_SCORE_MIN}
                  max={MOOD_NOTE_SCORE_MAX}
                  step={1}
                  value={score}
                  aria-label="事件好感值滑块"
                  onChange={(event) => setScoreText(event.target.value)}
                />
                <input
                  id={`${headingId}-score`}
                  className={styles.scoreInput}
                  type="number"
                  min={MOOD_NOTE_SCORE_MIN}
                  max={MOOD_NOTE_SCORE_MAX}
                  step={1}
                  value={scoreText}
                  onChange={(event) => handleScoreText(event.target.value)}
                  onBlur={() => setScoreText(String(parseMoodScore(scoreText)))}
                />
              </div>
              <p className={styles.hint}>
                范围 {MOOD_NOTE_SCORE_MIN} ~ {MOOD_NOTE_SCORE_MAX}，超出会自动钳制。
              </p>
            </div>

            {error ? (
              <p id={errorId} className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <footer className={styles.footer}>
            <button type="button" className={styles.cancelButton} onClick={onCancel}>
              取消
            </button>
            <button type="submit" className={styles.saveButton}>
              保存记录
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
