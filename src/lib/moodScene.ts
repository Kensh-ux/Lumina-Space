import type { MoodId } from './types';
import { createPositiveScene } from './scenes/positive';
import { createNeutralScene } from './scenes/neutral';
import { createNegativeScene } from './scenes/negative';
import type { SceneRenderer } from './scenes/types';

function createRenderer(mood: MoodId): SceneRenderer {
  if (mood === 'positive') {
    return createPositiveScene();
  }
  if (mood === 'negative') {
    return createNegativeScene();
  }
  return createNeutralScene();
}

// Qoder 的 render* 负责画面；这里保留项目现有外壳，补上 Qoder 组件版缺少的
// ResizeObserver、动态 reduced-motion、DPR resize 和 ≤8px 鼠标视差。
export function createMoodScene(canvas: HTMLCanvasElement, mood: MoodId): () => void {
  const context = canvas.getContext('2d');
  if (!context) {
    return () => {};
  }
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const renderer = createRenderer(mood);
  canvas.dataset.scene = mood;
  canvas.dataset.reduced = String(reducedQuery.matches);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let reduced = reducedQuery.matches;
  let animationFrame = 0;
  let resizeTimer = 0;
  let disposed = false;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;

  const draw = (time: number) => {
    if (width < 1 || height < 1) {
      return;
    }
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(pointerX, pointerY);
    renderer.draw(context, time, width, height, reduced);
    context.restore();
  };

  const frame = (time: number) => {
    if (disposed) {
      return;
    }
    pointerX += (targetX - pointerX) * 0.06;
    pointerY += (targetY - pointerY) * 0.06;
    draw(time);
    animationFrame = window.requestAnimationFrame(frame);
  };

  const start = () => {
    if (reduced) {
      draw(0);
      return;
    }
    if (animationFrame === 0) {
      animationFrame = window.requestAnimationFrame(frame);
    }
  };

  const stop = () => {
    if (animationFrame !== 0) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };

  const resizeNow = () => {
    if (disposed) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return;
    }
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextWidth = rect.width;
    const nextHeight = rect.height;
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) {
      return;
    }
    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderer.resize(width, height);
    if (reduced) {
      draw(0);
    }
  };

  const scheduleResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resizeNow, 100);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (reduced || !finePointer) {
      return;
    }
    targetX = Math.max(-8, Math.min(8, (event.clientX / window.innerWidth - 0.5) * 16));
    targetY = Math.max(-8, Math.min(8, (event.clientY / window.innerHeight - 0.5) * 16));
  };

  const handleMotionChange = () => {
    reduced = reducedQuery.matches;
    canvas.dataset.reduced = String(reduced);
    if (reduced) {
      stop();
      draw(0);
    } else {
      start();
    }
  };

  const observer = new ResizeObserver(scheduleResize);
  observer.observe(canvas);
  window.addEventListener('resize', scheduleResize);
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  reducedQuery.addEventListener('change', handleMotionChange);
  resizeNow();
  start();

  return () => {
    disposed = true;
    stop();
    window.clearTimeout(resizeTimer);
    observer.disconnect();
    window.removeEventListener('resize', scheduleResize);
    window.removeEventListener('pointermove', handlePointerMove);
    reducedQuery.removeEventListener('change', handleMotionChange);
  };
}
