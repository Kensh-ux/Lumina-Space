import { useEffect, useRef } from 'react';
import type { MoodId } from '../lib/types';
import { createParticleScene } from '../lib/particles';
import styles from './ParticleField.module.css';

export default function ParticleField({ mood }: { mood: MoodId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    return createParticleScene(canvas, mood);
  }, [mood]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
