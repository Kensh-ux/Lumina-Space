import { useRef, useState } from 'react';
import type { MoodNote } from '../../lib/types';
import { useAudio } from '../../lib/AudioProvider';
import ConfirmDialog from '../../lib/ConfirmDialog';
import MoodNoteEditor from './MoodNoteEditor';
import {
  arrangeMoodNotes,
  buildMoodNoteDeleteMessage,
  filterMoodNotes,
  formatMoodNoteDate,
  formatMoodScore,
  type MoodNoteInput,
} from './journal';
import styles from './JournalView.module.css';

interface JournalViewProps {
  notes: readonly MoodNote[];
  onCreateNote: (input: MoodNoteInput) => void;
  onUpdateNote: (id: string, input: MoodNoteInput) => void;
  onDeleteNote: (id: string) => void;
}

type EditorState = { mode: 'create' } | { mode: 'edit'; note: MoodNote } | null;

export default function JournalView({
  notes,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: JournalViewProps) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [query, setQuery] = useState('');
  const [pinnedDate, setPinnedDate] = useState('');
  const [pendingDelete, setPendingDelete] = useState<MoodNote | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const editorTriggerRef = useRef<HTMLElement | null>(null);
  const { playOpen, playClose, playClick } = useAudio();
  const visibleNotes = arrangeMoodNotes(filterMoodNotes(notes, query), pinnedDate);

  const openEditor = (next: EditorState, trigger: HTMLElement) => {
    editorTriggerRef.current = trigger;
    playOpen();
    setEditor(next);
  };

  const closeEditor = () => {
    playClose();
    setEditor(null);
    requestAnimationFrame(() => {
      const trigger = editorTriggerRef.current;
      if (trigger && trigger.isConnected) {
        trigger.focus();
      } else {
        createButtonRef.current?.focus();
      }
    });
  };

  const handleEditorSubmit = (input: MoodNoteInput) => {
    if (editor?.mode === 'edit') {
      onUpdateNote(editor.note.id, input);
    } else {
      onCreateNote(input);
    }
    closeEditor();
  };

  const handleDeleteConfirm = () => {
    if (!pendingDelete) {
      return;
    }
    onDeleteNote(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <section className={styles.journal} aria-label="情绪记录">
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>情绪记录</h2>
          <p className={styles.subtitle}>
            写下此刻的情绪、发生的事和它的分量，积攒成一份只属于你的记录。
          </p>
        </div>
        <button
          ref={createButtonRef}
          type="button"
          className={styles.createButton}
          onClick={(event) => openEditor({ mode: 'create' }, event.currentTarget)}
        >
          ＋ 写一条
        </button>
      </header>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="search"
          value={query}
          placeholder="搜索情绪或事件…"
          aria-label="搜索情绪记录"
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className={styles.pinLabel}>
          <span className={styles.pinLabelText}>日期置顶</span>
          <input
            className={styles.pinInput}
            type="date"
            value={pinnedDate}
            aria-label="日期置顶"
            onChange={(event) => setPinnedDate(event.target.value)}
          />
        </label>
        {pinnedDate ? (
          <button
            type="button"
            className={styles.clearPinButton}
            onClick={() => setPinnedDate('')}
          >
            取消置顶
          </button>
        ) : null}
      </div>

      {notes.length === 0 ? (
        <p className={styles.empty}>当前还没有情绪记录</p>
      ) : visibleNotes.length === 0 ? (
        <p className={styles.empty}>没有匹配的情绪记录</p>
      ) : (
        <div className={styles.list}>
          {visibleNotes.map((note) => {
            const dateLabel = formatMoodNoteDate(note.createdAt);
            return (
              <article key={note.id} className={styles.item}>
                <header className={styles.itemHeader}>
                  <span className={styles.emotion}>{note.emotion}</span>
                  <span
                    className={styles.score}
                    data-tone={note.score >= 0 ? 'positive' : 'negative'}
                  >
                    好感 {formatMoodScore(note.score)}
                  </span>
                  <time className={styles.date} dateTime={note.createdAt}>
                    {dateLabel}
                  </time>
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`编辑：${note.emotion} ${dateLabel}`}
                      onClick={(event) =>
                        openEditor({ mode: 'edit', note }, event.currentTarget)
                      }
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      data-action="delete"
                      aria-label={`删除：${note.emotion} ${dateLabel}`}
                      onClick={() => {
                        playClick();
                        setPendingDelete(note);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </header>
                <p className={styles.content}>{note.content}</p>
              </article>
            );
          })}
        </div>
      )}

      {editor ? (
        <MoodNoteEditor
          key={editor.mode === 'edit' ? editor.note.id : 'create'}
          note={editor.mode === 'edit' ? editor.note : undefined}
          onSubmit={handleEditorSubmit}
          onCancel={closeEditor}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="是否确认删除？"
          message={buildMoodNoteDeleteMessage(pendingDelete)}
          confirmLabel="确认删除"
          danger
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDelete(null)}
          fallbackFocusRef={createButtonRef}
        />
      ) : null}
    </section>
  );
}
