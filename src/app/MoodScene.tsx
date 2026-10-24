import { useEffect, useRef } from 'react';
import type { MoodId } from '../lib/types';
import { createMoodScene } from '../lib/moodScene';
import styles from './MoodScene.module.css';

export default function MoodScene({ mood }: { mood: MoodId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    return createMoodScene(canvas, mood);
  }, [mood]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
