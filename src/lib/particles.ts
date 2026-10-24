import type { MoodId } from './types';

type ParticleMode = 'rise' | 'dust' | 'rain';

interface ParticleConfig {
  count: number;
  mode: ParticleMode;
  colors: string[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
}

const CONFIG: Record<MoodId, ParticleConfig> = {
  positive: {
    count: 56,
    mode: 'rise',
    colors: ['#ffcf7a', '#ffb35c', '#fff1c9', '#ffd995'],
  },
  neutral: {
    count: 48,
    mode: 'dust',
    colors: ['#ffffff', '#dfe8f3', '#c9d6e6', '#eef3f9'],
  },
  negative: {
    count: 76,
    mode: 'rain',
    colors: ['#9fb8d8', '#7f9cc2', '#c4d4e8'],
  },
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Canvas 2D 粒子：三种情绪不同运动与色板；DPR 适配；reduced motion 只画静态帧。
export function createParticleScene(canvas: HTMLCanvasElement, mood: MoodId): () => void {
  const context = canvas.getContext('2d');
  if (!context) {
    return () => {};
  }
  const config = CONFIG[mood];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  canvas.dataset.mood = mood;
  canvas.dataset.reduced = String(reducedMotion);

  let width = 0;
  let height = 0;
  let particles: Particle[] = [];
  let animationFrame = 0;
  let lastTime = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;

  const spawn = () => {
    if (width < 1 || height < 1) {
      particles = [];
      return;
    }
    particles = Array.from({ length: config.count }, () => {
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      if (config.mode === 'rain') {
        return {
          x: randomBetween(-40, width + 40),
          y: randomBetween(-height, height),
          vx: randomBetween(0.5, 1.3),
          vy: randomBetween(4.5, 9),
          size: randomBetween(10, 22),
          alpha: randomBetween(0.2, 0.5),
          phase: randomBetween(0, Math.PI * 2),
          color,
        };
      }
      if (config.mode === 'rise') {
        return {
          x: randomBetween(0, width),
          y: randomBetween(0, height),
          vx: randomBetween(-0.15, 0.15),
          vy: randomBetween(0.18, 0.55),
          size: randomBetween(1.4, 4.6),
          alpha: randomBetween(0.28, 0.8),
          phase: randomBetween(0, Math.PI * 2),
          color,
        };
      }
      return {
        x: randomBetween(0, width),
        y: randomBetween(0, height),
        vx: randomBetween(-0.22, 0.22),
        vy: randomBetween(-0.18, 0.18),
        size: randomBetween(1, 2.8),
        alpha: randomBetween(0.22, 0.58),
        phase: randomBetween(0, Math.PI * 2),
        color,
      };
    });
    canvas.dataset.count = String(particles.length);
  };

  const render = () => {
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(pointerX, pointerY);

    if (config.mode === 'rain') {
      context.lineCap = 'round';
      context.lineWidth = 1.3;
    }

    for (const particle of particles) {
      context.globalAlpha = particle.alpha;
      if (config.mode === 'rain') {
        context.strokeStyle = particle.color;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(particle.x + particle.size * 0.22, particle.y + particle.size);
        context.stroke();
      } else {
        if (config.mode === 'rise') {
          context.shadowBlur = particle.size * 4;
          context.shadowColor = particle.color;
        } else {
          context.shadowBlur = 0;
        }
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.restore();
    context.globalAlpha = 1;
    context.shadowBlur = 0;
  };

  const update = (delta: number) => {
    for (const particle of particles) {
      if (config.mode === 'rise') {
        particle.y -= particle.vy * delta;
        particle.x += (particle.vx + Math.sin(particle.phase) * 0.18) * delta;
        if (particle.y < -24) {
          particle.y = height + randomBetween(8, 80);
          particle.x = randomBetween(0, width);
        }
      } else if (config.mode === 'rain') {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        if (particle.y > height + 24) {
          particle.y = randomBetween(-120, -16);
          particle.x = randomBetween(-40, width + 40);
        }
      } else {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        if (particle.x < -12) particle.x = width + 12;
        if (particle.x > width + 12) particle.x = -12;
        if (particle.y < -12) particle.y = height + 12;
        if (particle.y > height + 12) particle.y = -12;
      }
    }
  };

  const step = (time: number) => {
    if (lastTime === 0) {
      lastTime = time;
    }
    const delta = Math.min(32, time - lastTime) / 16.67;
    lastTime = time;
    pointerX += (targetX - pointerX) * 0.06;
    pointerY += (targetY - pointerY) * 0.06;
    update(delta);
    render();
    animationFrame = window.requestAnimationFrame(step);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return;
    }
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    spawn();
    if (reducedMotion) {
      render();
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (reducedMotion || !finePointer) {
      return;
    }
    targetX = (event.clientX / window.innerWidth - 0.5) * 16;
    targetY = (event.clientY / window.innerHeight - 0.5) * 12;
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  if (!reducedMotion) {
    animationFrame = window.requestAnimationFrame(step);
  }

  return () => {
    window.cancelAnimationFrame(animationFrame);
    observer.disconnect();
    window.removeEventListener('pointermove', handlePointerMove);
  };
}
