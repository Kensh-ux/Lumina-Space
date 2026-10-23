import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { TASK_TITLE_MAX_LENGTH } from './task';
import styles from './tasks.module.css';

interface TaskComposerProps {
  onAdd: (title: string) => void;
}

export default function TaskComposer({ onAdd }: TaskComposerProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (title.trim().length === 0) {
      return;
    }
    onAdd(title);
    setTitle('');
    inputRef.current?.focus();
  };

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <label className={styles.visuallyHidden} htmlFor="task-title">
        新待办
      </label>
      <input
        ref={inputRef}
        id="task-title"
        className={styles.input}
        type="text"
        value={title}
        placeholder="添加一件小事…"
        maxLength={TASK_TITLE_MAX_LENGTH}
        autoComplete="off"
        onChange={(event) => setTitle(event.target.value)}
      />
      <button type="submit" className={styles.addButton}>
        添加
      </button>
    </form>
  );
}
