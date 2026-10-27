import { useRef, useState } from 'react';
import type { MoodNote } from '../../lib/types';
import { useAudio } from '../../lib/AudioProvider';
import MoodNoteEditor from './MoodNoteEditor';
import {
  formatMoodNoteDate,
  formatMoodScore,
  sortMoodNotes,
  type MoodNoteInput,
} from './journal';
import styles from './JournalView.module.css';

interface JournalViewProps {
  notes: readonly MoodNote[];
  onCreateNote: (input: MoodNoteInput) => void;
}

export default function JournalView({ notes, onCreateNote }: JournalViewProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const { playOpen, playClose } = useAudio();
  const sorted = sortMoodNotes(notes);

  const closeEditor = () => {
    playClose();
    setEditorOpen(false);
    requestAnimationFrame(() => createButtonRef.current?.focus());
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
          onClick={() => {
            playOpen();
            setEditorOpen(true);
          }}
        >
          ＋ 写一条
        </button>
      </header>

      {sorted.length === 0 ? (
        <p className={styles.empty}>当前还没有情绪记录</p>
      ) : (
        <div className={styles.list}>
          {sorted.map((note) => (
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
                  {formatMoodNoteDate(note.createdAt)}
                </time>
              </header>
              <p className={styles.content}>{note.content}</p>
            </article>
          ))}
        </div>
      )}

      {editorOpen ? (
        <MoodNoteEditor
          onSubmit={(input) => {
            onCreateNote(input);
            closeEditor();
          }}
          onCancel={closeEditor}
        />
      ) : null}
    </section>
  );
}