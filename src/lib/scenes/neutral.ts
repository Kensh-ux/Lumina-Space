// 基线：Qoder React renderNeutral.ts（浅色改版），适配现有 moodScene 外壳并补初始涟漪。
import { rand, type SceneRenderer } from './types';

interface Fog {
  x: number;
  y: number;
  rx: number;
  ry: number;
  alpha: number;
  vx: number;
  vy: number;
  phase: number;
}

interface Paper {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
  sway: number;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  phase: number;
  speed: number;
}

interface Link {
  a: number;
  b: number;
  distance: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

const FOG_COUNT = 12;
const PAPER_COUNT = 15;
const STAR_COUNT = 40;
const RIPPLE_INTERVAL = 2500;

// 中性：浅冷色雾团、纸片、星座连线、水面波纹与随机涟漪。
export function createNeutralScene(): SceneRenderer {
  let width = 0;
  let height = 0;
  let waterY = 0;
  let fogs: Fog[] = [];
  let papers: Paper[] = [];
  let stars: Star[] = [];
  let links: Link[] = [];
  let ripples: Ripple[] = [];
  let lastRipple = 0;

  const init = (nextWidth: number, nextHeight: number) => {
    width = nextWidth;
    height = nextHeight;
    waterY = height * 0.72;
    fogs = Array.from({ length: FOG_COUNT }, () => ({
      x: rand(0, width),
      y: rand(0, height),
      rx: rand(100, 220),
      ry: rand(45, 105),
      alpha: rand(0.1, 0.22),
      vx: rand(-0.08, 0.08),
      vy: rand(-0.04, 0.04),
      phase: rand(0, Math.PI * 2),
    }));
    papers = Array.from({ length: PAPER_COUNT }, () => ({
      x: rand(0, width),
      y: rand(0, height),
      width: rand(8, 18),
      height: rand(10, 24),
      rotation: rand(0, Math.PI * 2),
      rotationSpeed: rand(-0.0015, 0.0015),
      vx: rand(-0.1, 0.1),
      vy: rand(0.04, 0.14),
      alpha: rand(0.36, 0.7),
      phase: rand(0, Math.PI * 2),
      sway: rand(0.16, 0.4),
    }));
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x: rand(width * 0.08, width * 0.92),
      y: rand(height * 0.04, height * 0.61),
      radius: rand(0.5, 1.5),
      alpha: rand(0.2, 0.52),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.0007, 0.0018),
    }));
    links = [];
    for (let a = 0; a < stars.length; a += 1) {
      for (let b = a + 1; b < stars.length; b += 1) {
        const dx = stars[a].x - stars[b].x;
        const dy = stars[a].y - stars[b].y;
        const distance = Math.hypot(dx, dy);
        if (distance < 145 && Math.random() < 0.34) {
          links.push({ a, b, distance });
        }
      }
    }
    ripples = Array.from({ length: 3 }, () => ({
      x: rand(width * 0.2, width * 0.8),
      y: rand(waterY + 30, height * 0.93),
      radius: rand(12, 46),
      maxRadius: rand(72, 120),
      alpha: rand(0.12, 0.22),
      speed: rand(0.018, 0.03),
    }));
    lastRipple = 0;
  };

  const drawFogs = (ctx: CanvasRenderingContext2D, time: number, reduced: boolean) => {
    for (const fog of fogs) {
      if (!reduced) {
        fog.x += fog.vx + Math.sin(time * 0.0001 + fog.phase) * 0.08;
        fog.y += fog.vy;
        if (fog.x < -fog.rx) fog.x = width + fog.rx;
        if (fog.x > width + fog.rx) fog.x = -fog.rx;
        if (fog.y < -fog.ry) fog.y = height + fog.ry;
        if (fog.y > height + fog.ry) fog.y = -fog.ry;
      }
      const pulse = 1 + 0.12 * Math.sin(time * 0.00035 + fog.phase);
      ctx.save();
      ctx.translate(fog.x, fog.y);
      ctx.scale(1, fog.ry / fog.rx);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, fog.rx * pulse);
      gradient.addColorStop(0, `rgba(165, 190, 214, ${fog.alpha})`);
      gradient.addColorStop(0.45, `rgba(190, 208, 226, ${fog.alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(205, 218, 232, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, fog.rx * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const drawPapers = (ctx: CanvasRenderingContext2D, time: number, reduced: boolean) => {
    for (const paper of papers) {
      if (!reduced) {
        paper.x += paper.vx + paper.sway * Math.sin(time * 0.0005 + paper.phase);
        paper.y += paper.vy;
        paper.rotation += paper.rotationSpeed;
        if (paper.y > height + 28) {
          paper.y = -28;
          paper.x = rand(0, width);
        }
        if (paper.x < -28) paper.x = width + 28;
        if (paper.x > width + 28) paper.x = -28;
      }
      ctx.save();
      ctx.translate(paper.x, paper.y);
      ctx.rotate(paper.rotation);
      ctx.globalAlpha = paper.alpha * (0.78 + 0.22 * Math.sin(time * 0.001 + paper.phase));
      ctx.shadowColor = 'rgba(53, 78, 108, 0.14)';
      ctx.shadowBlur = 7;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.fillRect(-paper.width / 2, -paper.height / 2, paper.width, paper.height);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(98, 124, 152, 0.24)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-paper.width / 2, -paper.height / 2, paper.width, paper.height);
      ctx.fillStyle = 'rgba(120, 145, 170, 0.18)';
      ctx.fillRect(-paper.width / 2 + 2, -paper.height / 2 + 3, paper.width * 0.56, 1);
      ctx.fillRect(-paper.width / 2 + 2, -paper.height / 2 + 6, paper.width * 0.36, 1);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  const drawWater = (ctx: CanvasRenderingContext2D, time: number) => {
    const gradient = ctx.createLinearGradient(0, waterY, 0, height);
    gradient.addColorStop(0, 'rgba(164, 190, 216, 0.02)');
    gradient.addColorStop(0.18, 'rgba(156, 185, 214, 0.16)');
    gradient.addColorStop(1, 'rgba(139, 173, 206, 0.28)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, waterY, width, height - waterY);

    ctx.save();
    for (let line = 0; line < 6; line += 1) {
      const y = waterY + 18 + line * 22;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const wave =
          y +
          2.5 * Math.sin(x * 0.007 + time * 0.00035 + line * 0.8) +
          1.6 * Math.sin(x * 0.014 + time * 0.0006 + line);
        if (x === 0) ctx.moveTo(x, wave);
        else ctx.lineTo(x, wave);
      }
      ctx.strokeStyle = `rgba(78, 112, 148, ${0.12 - line * 0.01})`;
      ctx.lineWidth = 0.65;
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawConstellation = (ctx: CanvasRenderingContext2D, time: number) => {
    for (const link of links) {
      const a = stars[link.a];
      const b = stars[link.b];
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.0005 + link.distance * 0.01);
      ctx.globalAlpha = 0.1 * pulse;
      ctx.strokeStyle = '#4f7298';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const star of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * star.speed + star.phase);
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = '#426488';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = star.alpha * twinkle * 0.16;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const drawMist = (ctx: CanvasRenderingContext2D, time: number) => {
    for (let index = 0; index < 3; index += 1) {
      const x = width * (0.2 + index * 0.3) + 70 * Math.sin(time * 0.00012 + index * 2);
      const y = height * 0.44 + 28 * Math.cos(time * 0.00018 + index);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, width * 0.25);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.11)');
      gradient.addColorStop(1, 'rgba(235, 241, 248, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  };

  const drawRipples = (ctx: CanvasRenderingContext2D, time: number, reduced: boolean) => {
    if (!reduced && time - lastRipple > RIPPLE_INTERVAL && ripples.length < 5) {
      ripples.push({
        x: rand(width * 0.15, width * 0.85),
        y: rand(waterY + 24, height * 0.94),
        radius: 0,
        maxRadius: rand(48, 110),
        alpha: rand(0.12, 0.22),
        speed: rand(0.018, 0.032),
      });
      lastRipple = time;
    }
    for (let index = ripples.length - 1; index >= 0; index -= 1) {
      const ripple = ripples[index];
      if (!reduced) {
        ripple.radius += ripple.speed * 1.4;
      }
      const life = ripple.radius / ripple.maxRadius;
      const alpha = ripple.alpha * (1 - life);
      if (alpha <= 0.001 || ripple.radius >= ripple.maxRadius) {
        ripples.splice(index, 1);
        continue;
      }
      for (let ring = 0; ring < 3; ring += 1) {
        const radius = ripple.radius - ring * 7;
        if (radius < 0) continue;
        ctx.beginPath();
        ctx.ellipse(ripple.x, ripple.y, radius, radius * 0.34, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(69, 105, 143, ${alpha * (1 - ring * 0.25)})`;
        ctx.lineWidth = 0.8 - ring * 0.18;
        ctx.stroke();
      }
    }
  };

  return {
    resize: init,
    draw: (ctx, time, nextWidth, nextHeight, reduced) => {
      if (nextWidth !== width || nextHeight !== height) {
        init(nextWidth, nextHeight);
      }
      drawFogs(ctx, time, reduced);
      drawMist(ctx, time);
      drawWater(ctx, time);
      drawConstellation(ctx, time);
      drawPapers(ctx, time, reduced);
      drawRipples(ctx, time, reduced);
    },
  };
}
