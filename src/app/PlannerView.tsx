import { useRef, useState } from 'react';
import type { Task } from '../lib/types';
import { TASK_PRIORITY_META, type TaskDraft, type TaskPatch } from '../features/tasks/task';
import { getNextDays, tasksForDate } from '../lib/planner';
import TaskEditor from '../features/tasks/TaskEditor';
import { useAudio } from '../lib/AudioProvider';
import styles from './PlannerView.module.css';

interface PlannerViewProps {
  tasks: readonly Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, patch: TaskPatch) => void;
  onCreateTask: (draft: TaskDraft) => void;
}

type EditorState = { mode: 'create'; date: string } | { mode: 'edit'; task: Task } | null;

export default function PlannerView({
  tasks,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onCreateTask,
}: PlannerViewProps) {
  const [editor, setEditor] = useState<EditorState>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const { playClick, playHover, playOpen, playClose } = useAudio();
  const days = getNextDays();
  const unscheduled = tasks.filter((task) => !task.dueDate).length;

  const openEditor = (next: EditorState, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    playOpen();
    setEditor(next);
  };

  const closeEditor = () => {
    playClose();
    setEditor(null);
    requestAnimationFrame(() => {
      const trigger = triggerRef.current;
      if (trigger && trigger.isConnected) {
        trigger.focus();
      }
    });
  };

  const handleSave = (draft: TaskDraft) => {
    if (editor?.mode === 'edit') {
      onUpdateTask(editor.task.id, draft);
    } else {
      onCreateTask(draft);
    }
    closeEditor();
  };

  return (
    <section className={styles.planner} aria-label="未来 7 天规划">
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>未来 7 天</h2>
          <p className={styles.subtitle}>从今天开始，按截止日期排布 · 横向滚动看完整 7 天</p>
        </div>
        <p className={styles.unscheduled}>
          {unscheduled > 0 ? `未排期 ${unscheduled} 件` : '按天安排任务'}
        </p>
      </header>

      <div className={styles.days}>
        {days.map((day) => {
          const dayTasks = tasksForDate(tasks, day.date);
          return (
            <section
              key={day.date}
              className={styles.day}
              data-date={day.date}
              data-today={day.isToday}
              aria-label={`${day.label} ${day.dateLabel}`}
            >
              <header className={styles.dayHeader}>
                <span className={styles.dayLabel}>{day.label}</span>
                <span className={styles.dayDate}>{day.dateLabel}</span>
              </header>

              <div className={styles.dayBody}>
                {dayTasks.length === 0 ? (
                  <p className={styles.empty}>暂无任务</p>
                ) : (
                  <ul className={styles.taskList}>
                    {dayTasks.map((task) => {
                      const priority = task.priority ?? 2;
                      const priorityLabel =
                        TASK_PRIORITY_META.find((item) => item.value === priority)?.label ?? '中';
                      return (
                        <li key={task.id} className={styles.task} data-done={task.done}>
                          <label className={styles.check}>
                            <input
                              type="checkbox"
                              checked={task.done}
                              aria-label={`完成：${task.title}`}
                              onChange={() => {
                                playClick();
                                onToggleTask(task.id);
                              }}
                            />
                          </label>
                          <div className={styles.taskMain}>
                            <button
                              type="button"
                              className={styles.taskTitle}
                              title="编辑任务"
                              onPointerEnter={playHover}
                              onClick={(event) => {
                                openEditor({ mode: 'edit', task }, event.currentTarget);
                              }}
                            >
                              {task.title}
                            </button>
                            <div className={styles.taskMeta}>
                              <span className={styles.priority} data-priority={priority}>
                                <span className={styles.priorityDot} aria-hidden="true" />
                                {priorityLabel}
                              </span>
                              {task.dueTime ? (
                                <span className={styles.time}>{task.dueTime}</span>
                              ) : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            className={styles.delete}
                            aria-label={`删除：${task.title}`}
                            onClick={() => {
                              playClick();
                              onDeleteTask(task.id);
                            }}
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button
                type="button"
                className={styles.addButton}
                aria-label={`添加任务：${day.label} ${day.dateLabel}`}
                onClick={(event) => {
                  openEditor({ mode: 'create', date: day.date }, event.currentTarget);
                }}
              >
                ＋ 添加
              </button>
            </section>
          );
        })}
      </div>

      {editor ? (
        <TaskEditor
          mode={editor.mode}
          task={editor.mode === 'edit' ? editor.task : undefined}
          initialDueDate={editor.mode === 'create' ? editor.date : undefined}
          onSubmit={handleSave}
          onCancel={closeEditor}
        />
      ) : null}
    </section>
  );
}
