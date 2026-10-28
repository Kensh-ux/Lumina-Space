import { useRef, useState } from 'react';
import type { ExportResult } from '../../lib/data';
import type { CustomBackgrounds } from '../../lib/types';
import { useAudio } from '../../lib/AudioProvider';
import { describeNoiseStatus, getNoiseProfile } from '../../lib/audio';
import { MOODS, type MoodId } from '../mood/mood';
import BackgroundSettings from './BackgroundSettings';
import styles from './SettingsPanel.module.css';

export interface DataCounts {
  tasks: number;
  focusSessions: number;
}

interface SettingsPanelProps {
  mood: MoodId;
  onChangeMood: (mood: MoodId) => void;
  storageError: boolean;
  counts: DataCounts;
  customBackgrounds: CustomBackgrounds;
  onSetCustomBackground: (mood: MoodId, dataUrl: string) => void;
  onClearCustomBackground: (mood: MoodId) => void;
  onExportData: () => ExportResult;
  onClearData: () => void;
}

export default function SettingsPanel({
  mood,
  onChangeMood,
  storageError,
  counts,
  customBackgrounds,
  onSetCustomBackground,
  onClearCustomBackground,
  onExportData,
  onClearData,
}: SettingsPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const { muted, toggleMuted, whiteNoiseEnabled, toggleWhiteNoise, noiseStatus, playClick, playHover } =
    useAudio();

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
              onPointerEnter={playHover}
              onClick={() => {
                playClick();
                onChangeMood(item.id);
              }}
            >
              <span aria-hidden="true">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>声音</h3>
        <button
          type="button"
          className={styles.soundButton}
          aria-pressed={!muted}
          onPointerEnter={playHover}
          onClick={() => {
            playClick();
            toggleMuted();
          }}
        >
          <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
          声音 {muted ? '关闭' : '开启'}
        </button>
        <p className={styles.note}>轻提示音；首次交互后启用。</p>
        <button
          type="button"
          className={styles.soundButton}
          aria-pressed={whiteNoiseEnabled}
          onPointerEnter={playHover}
          onClick={() => {
            playClick();
            toggleWhiteNoise();
          }}
        >
          <span aria-hidden="true">🌧️</span>
          背景音乐 {whiteNoiseEnabled ? '开启' : '关闭'}
        </button>
        <p className={styles.note} role="status">
          当前声景：{getNoiseProfile(mood).label} · {describeNoiseStatus(noiseStatus)}
          {noiseStatus === 'loading' || noiseStatus === 'slow'
            ? ' 由于网络原因，请耐心等待(*￣︶￣*)'
            : ''}
        </p>
        {muted ? <p className={styles.note}>当前已静音，取消静音后恢复。</p> : null}
      </section>

      <BackgroundSettings
        mood={mood}
        backgrounds={customBackgrounds}
        onChange={onSetCustomBackground}
        onClear={onClearCustomBackground}
      />

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>数据</h3>
        <p className={styles.note}>数据保存在本机浏览器（localStorage），不会上传。</p>
        <p className={styles.dataCounts} aria-label="数据概况">
          任务 {counts.tasks} 条 · 专注 {counts.focusSessions} 次
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
            <p className={styles.confirmText}>
              确认清空所有任务与记录？声音偏好会保留，此操作不可撤销。
            </p>
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
            已清空，声音偏好保留。
          </p>
        ) : null}
      </section>

      {storageError ? (
        <p className={styles.storageError}>浏览器存储不可用，本次改动不会被记住。</p>
      ) : null}

      <p className={styles.version}>Lumina-Space v1.3.2</p>
    </div>
  );
}
