// 基线：Qoder React renderPositive.ts（浅色改版），适配现有 moodScene 外壳与更强日光。
import { rand, type SceneRenderer } from './types';

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
}

interface Band {
  y: number;
  amp: number;
  freq: number;
  speed: number;
  thickness: number;
  alpha: number;
  hue: number;
  phase: number;
}

interface Ray {
  angle: number;
  width: number;
  alpha: number;
  phase: number;
  speed: number;
}

const MOTE_COUNT = 60;
const BAND_COUNT = 5;
const RAY_COUNT = 7;

// 积极：浅暖色日光、放射光束、流动光带、金色浮粒和底部暖雾。
export function createPositiveScene(): SceneRenderer {
  let width = 0;
  let height = 0;
  let motes: Mote[] = [];
  let bands: Band[] = [];
  let rays: Ray[] = [];

  const init = (nextWidth: number, nextHeight: number) => {
    width = nextWidth;
    height = nextHeight;
    motes = Array.from({ length: MOTE_COUNT }, () => ({
      x: rand(0, width),
      y: rand(0, height),
      vx: rand(-0.12, 0.12),
      vy: rand(0.12, 0.38),
      radius: rand(0.8, 2.8),
      alpha: rand(0.22, 0.62),
      phase: rand(0, Math.PI * 2),
    }));
    bands = Array.from({ length: BAND_COUNT }, (_, index) => ({
      y: height * rand(0.2, 0.76),
      amp: rand(22, 58),
      freq: rand(0.0025, 0.006),
      speed: rand(0.00012, 0.0003),
      thickness: rand(34, 76),
      alpha: rand(0.11, 0.19),
      hue: 30 + index * 4,
      phase: rand(0, Math.PI * 2),
    }));
    rays = Array.from({ length: RAY_COUNT }, (_, index) => ({
      angle: -0.68 + (index / (RAY_COUNT - 1)) * 1.36,
      width: rand(0.025, 0.07),
      alpha: rand(0.09, 0.16),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.00012, 0.00028),
    }));
  };

  const drawSun = (ctx: CanvasRenderingContext2D, time: number) => {
    const cx = width * 0.78;
    const cy = height * 0.04;
    const pulse = 1 + 0.035 * Math.sin(time * 0.0007);
    const radius = Math.max(width, height) * 0.44 * pulse;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, 'rgba(255, 236, 176, 0.5)');
    glow.addColorStop(0.16, 'rgba(255, 207, 116, 0.26)');
    glow.addColorStop(0.48, 'rgba(255, 184, 92, 0.08)');
    glow.addColorStop(1, 'rgba(255, 170, 70, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const coreRadius = Math.max(46, Math.min(width, height) * 0.07);
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
    core.addColorStop(0, 'rgba(255, 248, 216, 0.95)');
    core.addColorStop(0.35, 'rgba(255, 222, 146, 0.5)');
    core.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawRays = (ctx: CanvasRenderingContext2D, time: number) => {
    const cx = width * 0.78;
    const cy = height * 0.04;
    const length = Math.max(width, height) * 1.25;
    ctx.save();
    ctx.translate(cx, cy);
    for (const ray of rays) {
      const angle = ray.angle + 0.035 * Math.sin(time * ray.speed + ray.phase);
      const halfWidth = ray.width;
      const alpha = ray.alpha * (0.72 + 0.28 * Math.sin(time * 0.0004 + ray.phase));
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(length * Math.cos(-halfWidth), length * Math.sin(-halfWidth));
      ctx.lineTo(length * Math.cos(halfWidth), length * Math.sin(halfWidth));
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, length * 0.75, 0);
      gradient.addColorStop(0, `rgba(255, 198, 94, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 174, 68, ${alpha * 0.35})`);
      gradient.addColorStop(1, 'rgba(255, 150, 60, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  const drawBands = (ctx: CanvasRenderingContext2D, time: number) => {
    for (const band of bands) {
      ctx.beginPath();
      ctx.moveTo(-12, band.y);
      const step = 10;
      for (let x = 0; x <= width + step; x += step) {
        const y =
          band.y +
          band.amp * Math.sin(x * band.freq + time * band.speed + band.phase) +
          band.amp * 0.45 * Math.sin(x * band.freq * 1.7 + time * band.speed * 0.7);
        ctx.lineTo(x, y);
      }
      const bottom = band.y + band.thickness;
      for (let x = width + step; x >= -12; x -= step) {
        const y =
          bottom +
          band.amp * 0.5 * Math.sin(x * band.freq * 0.8 + time * band.speed * 1.2 + band.phase + 1);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      const gradient = ctx.createLinearGradient(
        0,
        band.y - band.amp,
        0,
        bottom + band.amp,
      );
      gradient.addColorStop(0, `hsla(${band.hue}, 92%, 68%, 0)`);
      gradient.addColorStop(0.35, `hsla(${band.hue}, 90%, 58%, ${band.alpha})`);
      gradient.addColorStop(0.7, `hsla(${band.hue}, 86%, 54%, ${band.alpha * 0.7})`);
      gradient.addColorStop(1, `hsla(${band.hue}, 82%, 50%, 0)`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  };

  const drawHaze = (ctx: CanvasRenderingContext2D, time: number) => {
    const gradient = ctx.createLinearGradient(0, height, 0, height * 0.45);
    gradient.addColorStop(0, 'rgba(255, 196, 118, 0.2)');
    gradient.addColorStop(0.45, 'rgba(255, 210, 145, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 220, 165, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const driftX = width * 0.32 + 42 * Math.sin(time * 0.00018);
    const driftY = height * 0.78 + 12 * Math.cos(time * 0.00022);
    const glow = ctx.createRadialGradient(driftX, driftY, 0, driftX, driftY, width * 0.36);
    glow.addColorStop(0, 'rgba(255, 195, 115, 0.1)');
    glow.addColorStop(1, 'rgba(255, 185, 100, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  };

  const drawMotes = (ctx: CanvasRenderingContext2D, time: number, reduced: boolean) => {
    for (const mote of motes) {
      if (!reduced) {
        mote.y -= mote.vy;
        mote.x += mote.vx + Math.sin(time * 0.0007 + mote.phase) * 0.12;
        if (mote.y < -12) {
          mote.y = height + 12;
          mote.x = rand(0, width);
        }
        if (mote.x < -12) mote.x = width + 12;
        if (mote.x > width + 12) mote.x = -12;
      }
      const twinkle = 0.65 + 0.35 * Math.sin(time * 0.0022 + mote.phase);
      ctx.globalAlpha = mote.alpha * twinkle;
      ctx.fillStyle = '#d99a38';
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
      ctx.fill();

      if (mote.radius > 2.2) {
        const glow = ctx.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.radius * 5);
        glow.addColorStop(0, `rgba(255, 206, 120, ${0.24 * twinkle})`);
        glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.radius * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  return {
    resize: init,
    draw: (ctx, time, nextWidth, nextHeight, reduced) => {
      if (nextWidth !== width || nextHeight !== height) {
        init(nextWidth, nextHeight);
      }
      drawSun(ctx, time);
      drawRays(ctx, time);
      drawBands(ctx, time);
      drawHaze(ctx, time);
      drawMotes(ctx, time, reduced);
    },
  };
}
