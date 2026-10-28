import { useState } from 'react';
import type { FocusSession, Task } from '../lib/types';
import type { TaskDraft, TaskPatch } from '../features/tasks/task';
import TaskList from '../features/tasks/TaskList';
import CompletedTasks from '../features/tasks/CompletedTasks';
import FocusTimer from '../features/focus/FocusTimer';
import FocusStats from '../features/focus/FocusStats';
import ConfirmDialog from '../lib/ConfirmDialog';
import styles from './Sidebar.module.css';

interface TodayPanelProps {
  tasks: readonly Task[];
  onCreateTask: (draft: TaskDraft) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, patch: TaskPatch) => void;
}

export function TodayPanel({
  tasks,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
}: TodayPanelProps) {
  return (
    <>
      <TaskList
        tasks={tasks}
        onToggle={onToggleTask}
        onDelete={onDeleteTask}
        onUpdate={onUpdateTask}
        onCreateTask={onCreateTask}
        compact
        showCreate
      />
      <CompletedTasks tasks={tasks} onToggle={onToggleTask} onDelete={onDeleteTask} />
    </>
  );
}

interface FocusPanelProps {
  sessions: readonly FocusSession[];
  onComplete: (durationSec: number) => void;
  onClearSessions: () => void;
}

export function FocusPanel({ sessions, onComplete, onClearSessions }: FocusPanelProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <FocusTimer onComplete={onComplete} />
      <FocusStats sessions={sessions} onClear={() => setConfirming(true)} />
      {confirming ? (
        <ConfirmDialog
          title="是否确认清除专注数据？"
          message="只会清空专注记录，不影响任务、情绪记录与背景设置。"
          confirmLabel="确认清除"
          danger
          onConfirm={() => {
            onClearSessions();
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </>
  );
}

export function PlannerPanel() {
  return (
    <div className={styles.plannerPanel}>
      <p className={styles.plannerPanelTitle}>规划师</p>
      <p className={styles.plannerPanelNote}>
        主界面按所选的起始日期展示任务，按截止日期自动分列，左右滑动看更多天。
      </p>
      <p className={styles.plannerPanelNote}>
        点每列「＋ 添加」可直接排到那一天；顶部可跳到任意日期。
      </p>
    </div>
  );
}

export function JournalPanel() {
  return (
    <div className={styles.plannerPanel}>
      <p className={styles.plannerPanelTitle}>情绪记录</p>
      <p className={styles.plannerPanelNote}>
        主界面记录每条情绪、事件和好感值，最新的在最上面。
      </p>
      <p className={styles.plannerPanelNote}>点「＋ 写一条」开始记录，数据只保存在本机。</p>
    </div>
  );
}
