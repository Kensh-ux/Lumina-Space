import type { TaskCounts, TaskFilter } from './task';
import styles from './tasks.module.css';

interface TaskFiltersProps {
  filter: TaskFilter;
  query: string;
  counts: TaskCounts;
  visible: number;
  onFilterChange: (filter: TaskFilter) => void;
  onQueryChange: (query: string) => void;
  onClearCompleted: () => void;
}

const FILTERS: readonly { value: TaskFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '未完成' },
  { value: 'done', label: '已完成' },
];

export default function TaskFilters({
  filter,
  query,
  counts,
  visible,
  onFilterChange,
  onQueryChange,
  onClearCompleted,
}: TaskFiltersProps) {
  const narrowed = filter !== 'all' || query.trim().length > 0;

  return (
    <div className={styles.filters}>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          type="search"
          value={query}
          placeholder="搜索任务…"
          aria-label="搜索任务"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <button
          type="button"
          className={styles.clearButton}
          disabled={counts.done === 0}
          onClick={onClearCompleted}
        >
          清除已完成
        </button>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.segmented} role="group" aria-label="筛选任务">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={styles.filterButton}
              aria-pressed={filter === item.value}
              onClick={() => onFilterChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className={styles.filterCounts} aria-live="polite">
          共 {counts.total} 件 · 未完成 {counts.open} · 已完成 {counts.done}
          {narrowed ? ` · 显示 ${visible} 件` : ''}
        </p>
      </div>
    </div>
  );
}
