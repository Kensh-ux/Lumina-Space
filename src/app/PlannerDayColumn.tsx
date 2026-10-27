import type { Task } from '../lib/types';
import type { PlannerDay } from '../lib/planner';
import { TASK_PRIORITY_META } from '../features/tasks/task';
import { useAudio } from '../lib/AudioProvider';
import styles from './PlannerView.module.css';

interface PlannerDayColumnProps {
  day: PlannerDay;
  tasks: readonly Task[];
  onRequestToggle: (task: Task) => void;
  onRequestDelete: (task: Task) => void;
  onEdit: (task: Task, trigger: HTMLElement) => void;
  onCreate: (date: string, trigger: HTMLElement) => void;
}

export default function PlannerDayColumn({
  day,
  tasks,
  onRequestToggle,
  onRequestDelete,
  onEdit,
  onCreate,
}: PlannerDayColumnProps) {
  const { playHover, playClick } = useAudio();

  return (
    <section
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
        {tasks.length === 0 ? (
          <p className={styles.empty}>暂无任务</p>
        ) : (
          <ul className={styles.taskList}>
            {tasks.map((task) => {
              const priorityMeta = task.priority
                ? TASK_PRIORITY_META.find((item) => item.value === task.priority)
                : undefined;
              return (
                <li key={task.id} className={styles.task} data-done={task.done}>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={task.done}
                      aria-label={`${task.done ? '取消完成' : '完成'}：${task.title}`}
                      onChange={() => {
                        playClick();
                        onRequestToggle(task);
                      }}
                    />
                  </label>
                  <div className={styles.taskMain}>
                    <button
                      type="button"
                      className={styles.taskTitle}
                      title="编辑任务"
                      onPointerEnter={playHover}
                      onClick={(event) => onEdit(task, event.currentTarget)}
                    >
                      {task.title}
                    </button>
                    {priorityMeta || task.dueTime ? (
                      <div className={styles.taskMeta}>
                        {priorityMeta && task.priority ? (
                          <span className={styles.priority} data-priority={task.priority}>
                            <span className={styles.priorityDot} aria-hidden="true" />
                            {priorityMeta.label}
                          </span>
                        ) : null}
                        {task.dueTime ? <span className={styles.time}>{task.dueTime}</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={styles.delete}
                    aria-label={`删除：${task.title}`}
                    onClick={() => {
                      playClick();
                      onRequestDelete(task);
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
        onClick={(event) => onCreate(day.date, event.currentTarget)}
      >
        ＋ 添加
      </button>
    </section>
  );
}
