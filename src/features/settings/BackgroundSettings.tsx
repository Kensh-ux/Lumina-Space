import { useRef, useState } from 'react';
import type { CustomBackgrounds, MoodId } from '../../lib/types';
import {
  compressBackground,
  RECOMMENDED_BACKGROUND_SIZE,
  validateBackgroundFile,
} from '../../lib/customBackground';
import ConfirmDialog from '../../lib/ConfirmDialog';
import { MOODS } from '../mood/mood';
import styles from './BackgroundSettings.module.css';

interface BackgroundSettingsProps {
  mood: MoodId;
  backgrounds: CustomBackgrounds;
  onChange: (mood: MoodId, dataUrl: string) => void;
  onClear: (mood: MoodId) => void;
}

export default function BackgroundSettings({
  mood,
  backgrounds,
  onChange,
  onClear,
}: BackgroundSettingsProps) {
  const [selected, setSelected] = useState<MoodId>(mood);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const hasBackground = Boolean(backgrounds[selected]);
  const selectedLabel = MOODS.find((item) => item.id === selected)?.label ?? '';

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    const validationError = validateBackgroundFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setProcessing(true);
    try {
      const dataUrl = await compressBackground(file);
      onChange(selected, dataUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '图片处理失败，请换一张试试。');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>自定义背景</h3>
      <p className={styles.note}>
        推荐 {RECOMMENDED_BACKGROUND_SIZE}，支持 JPG / PNG / WebP，单文件 ≤ 12 MB；
        自动压缩后只保存在本机。
      </p>
      <div className={styles.sceneRow} role="group" aria-label="选择自定义背景场景">
        {MOODS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.sceneButton}
            aria-pressed={selected === item.id}
            disabled={processing}
            onClick={() => {
              setSelected(item.id);
              setError('');
            }}
          >
            <span>{item.label}</span>
            {backgrounds[item.id] ? <span className={styles.badge}>已设置</span> : null}
          </button>
        ))}
      </div>
      <div className={styles.preview}>
        {hasBackground ? (
          <img
            className={styles.previewImage}
            src={backgrounds[selected]}
            alt={`「${selectedLabel}」自定义背景预览`}
          />
        ) : (
          <p className={styles.previewEmpty}>当前使用原场景</p>
        )}
      </div>
      <input
        ref={fileInputRef}
        className={styles.fileInput}
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          void handleFile(file);
        }}
      />
      <div className={styles.actions}>
        <button
          ref={uploadButtonRef}
          type="button"
          className={styles.uploadButton}
          disabled={processing}
          onClick={() => fileInputRef.current?.click()}
        >
          {processing ? '正在处理…' : hasBackground ? '替换已设置背景' : '上传背景'}
        </button>
        {hasBackground ? (
          <button
            type="button"
            className={styles.restoreButton}
            onClick={() => setConfirming(true)}
          >
            恢复原先场景
          </button>
        ) : null}
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {confirming ? (
        <ConfirmDialog
          title="是否恢复原先场景？"
          message={`将移除「${selectedLabel}」的自定义背景，恢复动态场景。`}
          confirmLabel="恢复原先场景"
          danger
          onConfirm={() => {
            onClear(selected);
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
          fallbackFocusRef={uploadButtonRef}
        />
      ) : null}
    </section>
  );
}
