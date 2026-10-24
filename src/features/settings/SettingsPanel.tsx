import { useRef, useState } from 'react';
import type { ExportResult } from '../../lib/data';
import { MOODS, type MoodId } from '../mood/mood';
import styles from './SettingsPanel.module.css';

export interface DataCounts {
  tasks: number;
  moodEntries: number;
  focusSessions: number;
}

interface SettingsPanelProps {
  mood: MoodId;
  onChangeMood: (mood: MoodId) => void;
  storageError: boolean;
  counts: DataCounts;
  onExportData: () => ExportResult;
  onClearData: () => void;
}

export default function SettingsPanel({
  mood,
  onChangeMood,
  storageError,
  counts,
  onExportData,
  onClearData,
}: SettingsPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const clearButtonRef = useRef<HTMLButtonElement>(null);

  const handleExport = () => {
    const { filename, json } = onExportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportMessage(`已导出 ${filename}`);
  };

  const handleClear = () => {
    onClearData();
    setConfirming(false);
    setCleared(true);
    // 确认按钮本身会卸载，等重渲染后把焦点还给「清空所有数据」。
    requestAnimationFrame(() => clearButtonRef.current?.focus());
  };

  return (
    <div className={styles.settings}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>主题</h3>
        <div className={styles.themeRow} role="group" aria-label="选择主题">
          {MOODS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.themeButton}
              aria-pressed={mood === item.id}
              onClick={() => onChangeMood(item.id)}
            >
              <span aria-hidden="true">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>数据</h3>
        <p className={styles.note}>数据保存在本机浏览器（localStorage），不会上传。</p>
        <p className={styles.dataCounts} aria-label="数据概况">
          任务 {counts.tasks} 条 · 情绪记录 {counts.moodEntries} 条 · 专注 {counts.focusSessions} 次
        </p>
        <div className={styles.actionRow}>
          <button type="button" className={styles.secondaryButton} onClick={handleExport}>
            导出数据
          </button>
        </div>
        {exportMessage ? (
          <p className={styles.exportStatus} role="status">
            {exportMessage}
          </p>
        ) : null}
        {confirming ? (
          <div className={styles.confirmRow} role="group" aria-label="确认清空数据">
            <p className={styles.confirmText}>确认清空所有任务和设置？此操作不可撤销。</p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.dangerButton} onClick={handleClear}>
                确认清空
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setConfirming(false)}
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            ref={clearButtonRef}
            type="button"
            className={styles.dangerButton}
            onClick={() => setConfirming(true)}
          >
            清空所有数据
          </button>
        )}
        {cleared ? (
          <p className={styles.cleared} role="status">
            已清空，恢复为默认数据。
          </p>
        ) : null}
      </section>

      {storageError ? (
        <p className={styles.storageError}>浏览器存储不可用，本次改动不会被记住。</p>
      ) : null}

      <p className={styles.version}>Lumina-Space v0.4.0</p>
    </div>
  );
}
