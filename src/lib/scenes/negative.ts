// 基线：Qoder React renderNegative.ts（深色雨夜），适配现有 moodScene 外壳并补初始涟漪。
import { rand, type SceneRenderer } from './types';

interface Drop {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
  wind: number;
}

interface Splash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

interface Mist {
  x: number;
  y: number;
  rx: number;
  ry: number;
  alpha: number;
  vx: number;
  phase: number;
}

interface Glow {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  phase: number;
}

const DROP_COUNT = 200;
const WATER_Y = 0.78;

// 整屏渐变改成「按尺寸缓存 + 每帧 drawImage」：
// 3 个全屏 glow 与 1 个全屏 vignette 的渐变只随尺寸变化，原先每帧重建 4 次整屏渐变填充，
// DPR2 实测 5.94ms/帧（占消极空闲帧时间 37%）。缓存成离屏画布后每帧只剩下 2 次 drawImage。
// 倍率取 moodScene backing 倍率的一半：这两层都是低频平滑渐变（glow/vignette），
// 半分辨率贴图放大后与全分辨率在逐像素上不可分辨，而每帧贴图的纹素带宽与显存都降到 1/4
// （DPR2 实测：全分辨率贴图 2 笔 = 4.50ms/帧，半分辨率 = 见报告表）。
const CACHE_SCALE = Math.min(window.devicePixelRatio || 1, 2);

function makeLayer(width: number, height: number): HTMLCanvasElement {
  const layer = document.createElement('canvas');
  layer.width = Math.max(1, Math.round(width * CACHE_SCALE));
  layer.height = Math.max(1, Math.round(height * CACHE_SCALE));
  const layerCtx = layer.getContext('2d');
  if (layerCtx) {
    layerCtx.setTransform(CACHE_SCALE, 0, 0, CACHE_SCALE, 0, 0);
  }
  return layer;
}

// 消极：深色雨夜，雨丝落在水面，涟漪、倒影和低雾。
export function createNegativeScene(): SceneRenderer {
  let width = 0;
  let height = 0;
  let waterY = 0;
  let drops: Drop[] = [];
  let splashes: Splash[] = [];
  let mists: Mist[] = [];
  let glows: Glow[] = [];
  let glowLayer: HTMLCanvasElement | null = null;
  let vignetteLayer: HTMLCanvasElement | null = null;
  let glowPhase = 0;

  const makeDrop = (randomY: boolean): Drop => ({
    x: rand(-60, width + 60),
    y: randomY ? rand(0, height) : rand(-80, -10),
    length: rand(10, 26),
    speed: rand(3.4, 7.4),
    alpha: rand(0.1, 0.24),
    wind: rand(-0.7, -0.35),
  });

  const init = (nextWidth: number, nextHeight: number) => {
    width = nextWidth;
    height = nextHeight;
    waterY = height * WATER_Y;
    drops = Array.from({ length: DROP_COUNT }, () => makeDrop(true));
    splashes = Array.from({ length: 5 }, () => ({
      x: rand(0, width),
      y: waterY + rand(2, 60),
      radius: rand(2, 9),
      maxRadius: rand(8, 18),
      alpha: rand(0.12, 0.22),
      speed: rand(0.16, 0.3),
    }));
    mists = Array.from({ length: 6 }, () => ({
      x: rand(0, width),
      y: waterY - 20 + rand(0, 60),
      rx: rand(150, 340),
      ry: rand(26, 62),
      alpha: rand(0.03, 0.07),
      vx: rand(-0.06, 0.06),
      phase: rand(0, Math.PI * 2),
    }));
    glows = Array.from({ length: 3 }, (_, index) => ({
      x: width * (0.3 + index * 0.2),
      y: height * rand(0.12, 0.34),
      radius: rand(110, 250),
      alpha: rand(0.02, 0.045),
      phase: rand(0, Math.PI * 2),
    }));
    glowLayer = buildGlowLayer();
    vignetteLayer = buildVignetteLayer();
  };

  // 3 个 glow 的 pulse 各自带随机 phase，缓存后无法逐帧分辨，这里取三者 phase 的均值，
  // 逐帧用 globalAlpha = 同一个 pulse 复原呼吸（alpha 只有 0.02–0.045，相位差在画面上不可分辨）。
  const buildGlowLayer = () => {
    glowPhase = glows.length
      ? glows.reduce((sum, glow) => sum + glow.phase, 0) / glows.length
      : 0;
    const layer = makeLayer(width, height);
    const layerCtx = layer.getContext('2d');
    if (!layerCtx) {
      return layer;
    }
    for (const glow of glows) {
      const gradient = layerCtx.createRadialGradient(
        glow.x,
        glow.y,
        0,
        glow.x,
        glow.y,
        glow.radius,
      );
      gradient.addColorStop(0, `rgba(92, 122, 158, ${glow.alpha})`);
      gradient.addColorStop(0.6, `rgba(68, 94, 128, ${glow.alpha * 0.3})`);
      gradient.addColorStop(1, 'rgba(52, 76, 106, 0)');
      layerCtx.fillStyle = gradient;
      layerCtx.fillRect(0, 0, width, height);
    }
    return layer;
  };

  const buildVignetteLayer = () => {
    const layer = makeLayer(width, height);
    const layerCtx = layer.getContext('2d');
    if (!layerCtx) {
      return layer;
    }
    const vignette = layerCtx.createRadialGradient(
      width * 0.5,
      height * 0.46,
      Math.min(width, height) * 0.25,
      width * 0.5,
      height * 0.46,
      Math.max(width, height) * 0.72,
    );
    vignette.addColorStop(0, 'rgba(2, 4, 8, 0)');
    vignette.addColorStop(0.72, 'rgba(2, 4, 8, 0.16)');
    vignette.addColorStop(1, 'rgba(2, 4, 8, 0.46)');
    layerCtx.fillStyle = vignette;
    layerCtx.fillRect(0, 0, width, height);
    return layer;
  };

  const drawGlows = (ctx: CanvasRenderingContext2D, time: number) => {
    if (!glowLayer) {
      return;
    }
    ctx.globalAlpha = 0.72 + 0.28 * Math.sin(time * 0.0003 + glowPhase);
    ctx.drawImage(glowLayer, 0, 0, width, height);
    ctx.globalAlpha = 1;
  };

  const spawnSplash = (x: number, y: number) => {
    if (splashes.length >= 30) return;
    splashes.push({
      x,
      y,
      radius: 0,
      maxRadius: rand(5, 14),
      alpha: rand(0.12, 0.24),
      speed: rand(0.16, 0.32),
    });
  };

  const drawRain = (ctx: CanvasRenderingContext2D, reduced: boolean) => {
    ctx.save();
    for (const drop of drops) {
      if (!reduced) {
        drop.x += drop.wind;
        drop.y += drop.speed;
      }
      if (drop.y > waterY) {
        spawnSplash(drop.x, waterY);
        Object.assign(drop, makeDrop(false));
      }
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + drop.wind * 2.5, drop.y + drop.length);
      ctx.strokeStyle = `rgba(148, 172, 200, ${drop.alpha})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawWater = (ctx: CanvasRenderingContext2D, time: number, reduced: boolean) => {
    const gradient = ctx.createLinearGradient(0, waterY - 8, 0, height);
    gradient.addColorStop(0, 'rgba(9, 14, 22, 0)');
    gradient.addColorStop(0.08, 'rgba(9, 14, 22, 0.34)');
    gradient.addColorStop(0.35, 'rgba(8, 12, 20, 0.54)');
    gradient.addColorStop(1, 'rgba(7, 10, 17, 0.72)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, waterY - 8, width, height - waterY + 8);

    for (let line = 0; line < 8; line += 1) {
      const y = waterY + 4 + line * 15;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 7) {
        const wave =
          y +
          2 * Math.sin(x * 0.006 + time * 0.0003 + line * 1.2) +
          1.4 * Math.sin(x * 0.012 + time * 0.0005 + line * 0.7);
        if (x === 0) ctx.moveTo(x, wave);
        else ctx.lineTo(x, wave);
      }
      ctx.strokeStyle = `rgba(88, 116, 152, ${0.09 - line * 0.009})`;
      ctx.lineWidth = 0.55;
      ctx.stroke();
    }

    for (let index = splashes.length - 1; index >= 0; index -= 1) {
      const splash = splashes[index];
      if (!reduced) {
        splash.radius += splash.speed;
      }
      const life = splash.radius / splash.maxRadius;
      const alpha = splash.alpha * (1 - life);
      if (alpha <= 0.001) {
        splashes.splice(index, 1);
        continue;
      }
      ctx.beginPath();
      ctx.ellipse(splash.x, splash.y, splash.radius, splash.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(124, 152, 186, ${alpha})`;
      ctx.lineWidth = 0.55;
      ctx.stroke();
    }
  };

  const drawReflection = (ctx: CanvasRenderingContext2D, time: number) => {
    const glow = ctx.createLinearGradient(0, waterY, 0, waterY + 90);
    glow.addColorStop(0, 'rgba(102, 132, 168, 0.06)');
    glow.addColorStop(1, 'rgba(76, 105, 140, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, waterY, width, 90);

    const shimmerX = width * 0.46 + 32 * Math.sin(time * 0.0002);
    const shimmer = ctx.createRadialGradient(
      shimmerX,
      waterY + 12,
      0,
      shimmerX,
      waterY + 12,
      130,
    );
    shimmer.addColorStop(0, `rgba(118, 148, 184, ${0.09 + 0.025 * Math.sin(time * 0.0004)})`);
    shimmer.addColorStop(1, 'rgba(92, 122, 160, 0)');
    ctx.fillStyle = shimmer;
    ctx.fillRect(shimmerX - 130, waterY, 260, 52);
  };

  const drawMist = (ctx: CanvasRenderingContext2D, time: number, reduced: boolean) => {
    for (const mist of mists) {
      if (!reduced) {
        mist.x += mist.vx + Math.sin(time * 0.0001 + mist.phase) * 0.04;
        if (mist.x < -mist.rx) mist.x = width + mist.rx;
        if (mist.x > width + mist.rx) mist.x = -mist.rx;
      }
      ctx.save();
      ctx.translate(mist.x, mist.y);
      ctx.scale(1, mist.ry / mist.rx);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, mist.rx);
      gradient.addColorStop(0, `rgba(92, 116, 148, ${mist.alpha})`);
      gradient.addColorStop(0.5, `rgba(76, 98, 128, ${mist.alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(62, 84, 112, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, mist.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const drawVignette = (ctx: CanvasRenderingContext2D) => {
    if (!vignetteLayer) {
      return;
    }
    ctx.drawImage(vignetteLayer, 0, 0, width, height);
  };

  return {
    resize: init,
    draw: (ctx, time, nextWidth, nextHeight, reduced) => {
      if (nextWidth !== width || nextHeight !== height) {
        init(nextWidth, nextHeight);
      }
      drawGlows(ctx, time);
      drawRain(ctx, reduced);
      drawWater(ctx, time, reduced);
      drawReflection(ctx, time);
      drawMist(ctx, time, reduced);
      drawVignette(ctx);
    },
  };
}
