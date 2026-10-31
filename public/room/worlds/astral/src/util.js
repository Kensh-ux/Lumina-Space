import * as THREE from 'three';

/* ---------------------------------- math --------------------------------- */

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a);
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutQuint = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/* --------------------------------- tweens -------------------------------- */

const tasks = new Set();

/**
 * Lightweight tween on the shared ticker.
 * update(easedT, rawT)
 */
export function tween(duration, update, options = {}) {
  const {
    delay = 0,
    ease = easeInOutCubic,
    onComplete,
    tag = null,
  } = options;
  const task = {
    elapsed: -delay,
    duration: Math.max(1, duration),
    update,
    ease,
    onComplete,
    tag,
    cancelled: false,
  };
  tasks.add(task);
  return {
    cancel() {
      task.cancelled = true;
      tasks.delete(task);
    },
  };
}

export function tickTweens(dtMs) {
  for (const task of Array.from(tasks)) {
    if (task.cancelled) continue;
    task.elapsed += dtMs;
    if (task.elapsed < 0) continue;
    const raw = Math.min(1, task.elapsed / task.duration);
    const eased = task.ease(raw);
    task.update(eased, raw);
    if (raw >= 1) {
      tasks.delete(task);
      task.onComplete?.();
    }
  }
}

export function cancelTweens(tag) {
  if (!tag) return;
  for (const task of Array.from(tasks)) {
    if (task.tag === tag) {
      task.cancelled = true;
      tasks.delete(task);
    }
  }
}

export function after(ms, fn) {
  return tween(ms, () => {}, { onComplete: fn });
}

/* -------------------------------- palettes ------------------------------- */

export function preparePalette(raw) {
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = typeof value === 'string' && value.startsWith('#')
      ? new THREE.Color(value)
      : value;
  }
  return out;
}

export function mixPalettes(a, b, t) {
  const out = {};
  for (const key of Object.keys(a)) {
    const va = a[key];
    const vb = b[key] ?? va;
    if (va instanceof THREE.Color && vb instanceof THREE.Color) {
      out[key] = va.clone().lerp(vb, t);
    } else if (typeof va === 'number' && typeof vb === 'number') {
      out[key] = lerp(va, vb, t);
    } else {
      out[key] = t < 0.5 ? va : vb;
    }
  }
  return out;
}

/* -------------------------------- textures ------------------------------- */

function canvas(size) {
  const el = document.createElement('canvas');
  el.width = size;
  el.height = size;
  return el;
}

export function makeGlowTexture(size = 256, sharpness = 1.0) {
  const el = canvas(size);
  const ctx = el.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.08 * sharpness, 'rgba(255,255,255,.92)');
  g.addColorStop(0.18 * sharpness, 'rgba(255,255,255,.42)');
  g.addColorStop(0.42 * sharpness, 'rgba(255,255,255,.12)');
  g.addColorStop(0.72, 'rgba(255,255,255,.025)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function makeStarTexture(size = 128) {
  const el = canvas(size);
  const ctx = el.getContext('2d');
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.08, 'rgba(255,255,255,.9)');
  g.addColorStop(0.22, 'rgba(255,255,255,.22)');
  g.addColorStop(0.55, 'rgba(255,255,255,.04)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // four-point flare
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) {
    const angle = (i * Math.PI) / 2;
    const grad = ctx.createLinearGradient(
      c - Math.cos(angle) * c, c - Math.sin(angle) * c,
      c + Math.cos(angle) * c, c + Math.sin(angle) * c,
    );
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.45, 'rgba(255,255,255,.18)');
    grad.addColorStop(0.5, 'rgba(255,255,255,.95)');
    grad.addColorStop(0.55, 'rgba(255,255,255,.18)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(c - Math.cos(angle) * c, c - Math.sin(angle) * c);
    ctx.lineTo(c + Math.cos(angle) * c, c + Math.sin(angle) * c);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeRingTexture(size = 512) {
  const el = canvas(size);
  const ctx = el.getContext('2d');
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, size * 0.3, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.62, 'rgba(255,255,255,0)');
  g.addColorStop(0.68, 'rgba(255,255,255,.75)');
  g.addColorStop(0.7, 'rgba(255,255,255,.15)');
  g.addColorStop(0.8, 'rgba(255,255,255,.6)');
  g.addColorStop(0.82, 'rgba(255,255,255,.05)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws an astrolabe dial band. The texture is laid out as a full disk so it can
 * be mapped straight onto a THREE.RingGeometry (UVs follow local XY).
 */
export function makeDialTexture({
  inner = 3.3,
  outer = 4.3,
  glyphs = [],
  smallGlyphs = [],
  tickCount = 144,
  majorEvery = 12,
  accent = '#d9b16b',
  accentBright = '#ffe8b7',
  seed = 7,
  innerLine = true,
  outerLine = true,
  dotted = true,
} = {}) {
  const size = 2048;
  const el = canvas(size);
  const ctx = el.getContext('2d');
  const c = size / 2;
  const pxOuter = c * 0.998;
  const scale = pxOuter / outer;
  const pxInner = inner * scale;
  const band = pxOuter - pxInner;
  const rng = mulberry32(seed);

  ctx.clearRect(0, 0, size, size);

  // base bronze, using an annulus path
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, pxOuter, 0, Math.PI * 2, false);
  ctx.arc(c, c, pxInner, 0, Math.PI * 2, true);
  ctx.closePath();
  const base = ctx.createRadialGradient(c, c, pxInner, c, c, pxOuter);
  base.addColorStop(0, '#2a1e0e');
  base.addColorStop(0.35, '#4a361b');
  base.addColorStop(0.62, '#3a2a14');
  base.addColorStop(0.86, '#251a0c');
  base.addColorStop(1, '#100b05');
  ctx.fillStyle = base;
  ctx.fill('evenodd');
  ctx.clip();

  // fine aged streaks
  for (let i = 0; i < 900; i++) {
    const a = rng() * Math.PI * 2;
    const r = pxInner + rng() * band;
    const len = 2 + rng() * 38;
    ctx.strokeStyle = rng() > 0.45 ? 'rgba(238,199,129,.06)' : 'rgba(0,0,0,.16)';
    ctx.lineWidth = 0.6 + rng() * 1.1;
    ctx.beginPath();
    const x = c + Math.cos(a) * r;
    const y = c + Math.sin(a) * r;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a + Math.PI / 2) * len, y + Math.sin(a + Math.PI / 2) * len);
    ctx.stroke();
  }

  // soft concentric shading to give the dial depth
  const shade = ctx.createRadialGradient(
    c - band * 0.12, c - band * 0.25, pxInner * 0.8,
    c, c, pxOuter,
  );
  shade.addColorStop(0, 'rgba(255,221,158,.10)');
  shade.addColorStop(0.55, 'rgba(255,221,158,0)');
  shade.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);

  const radiusAt = (t) => pxInner + band * t;

  // border circles
  ctx.lineWidth = Math.max(1.2, size * 0.0014);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.82;
  if (innerLine) {
    ctx.beginPath();
    ctx.arc(c, c, pxInner + band * 0.035, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, pxInner + band * 0.085, 0, Math.PI * 2);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  if (outerLine) {
    ctx.lineWidth = Math.max(1.2, size * 0.0014);
    ctx.beginPath();
    ctx.arc(c, c, pxOuter - band * 0.035, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, c, pxOuter - band * 0.082, 0, Math.PI * 2);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ticks
  for (let i = 0; i < tickCount; i++) {
    const a = (i / tickCount) * Math.PI * 2 - Math.PI / 2;
    const major = i % majorEvery === 0;
    const mid = i % (majorEvery / 2) === 0;
    const r1 = pxInner + band * (major ? 0.12 : mid ? 0.155 : 0.18);
    const r2 = pxInner + band * (major ? 0.31 : mid ? 0.26 : 0.225);
    ctx.strokeStyle = major ? accentBright : accent;
    ctx.globalAlpha = major ? 0.95 : mid ? 0.6 : 0.32;
    ctx.lineWidth = major ? size * 0.0017 : mid ? size * 0.001 : size * 0.00065;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
    ctx.lineTo(c + Math.cos(a) * r2, c + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // dotted orbit rails
  if (dotted) {
    for (const t of [0.38, 0.44]) {
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.34;
      const count = 220;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const rr = radiusAt(t);
        ctx.beginPath();
        ctx.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, size * 0.0011, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // primary glyph ring
  if (glyphs.length) {
    const fontPx = Math.min(band * 0.34, 96);
    glyphs.forEach((glyph, i) => {
      const a = (i / glyphs.length) * Math.PI * 2 - Math.PI / 2;
      const rr = radiusAt(0.63);
      ctx.save();
      ctx.translate(c + Math.cos(a) * rr, c + Math.sin(a) * rr);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = accentBright;
      ctx.globalAlpha = 0.9;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${fontPx}px "Songti SC","STSong","SimSun",serif`;
      ctx.fillText(glyph, 0, 0);
      ctx.restore();

      // separators
      const sepA = a + Math.PI / glyphs.length;
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = size * 0.0014;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(sepA) * radiusAt(0.53), c + Math.sin(sepA) * radiusAt(0.53));
      ctx.lineTo(c + Math.cos(sepA) * radiusAt(0.73), c + Math.sin(sepA) * radiusAt(0.73));
      ctx.stroke();
      ctx.restore();
    });
  }

  // secondary tiny glyphs, closer to the inner edge
  if (smallGlyphs.length) {
    const fontPx = Math.max(16, Math.min(band * 0.15, 40));
    smallGlyphs.forEach((glyph, i) => {
      const a = (i / smallGlyphs.length) * Math.PI * 2 - Math.PI / 2 + Math.PI / smallGlyphs.length;
      const rr = radiusAt(0.9);
      ctx.save();
      ctx.translate(c + Math.cos(a) * rr, c + Math.sin(a) * rr);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.72;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${fontPx}px "Songti SC","STSong","SimSun",serif`;
      ctx.fillText(glyph, 0, 0);
      ctx.restore();
    });
  }

  // rivets between the rails
  const rivets = Math.max(24, tickCount / 3);
  for (let i = 0; i < rivets; i++) {
    const a = (i / rivets) * Math.PI * 2;
    const rr = radiusAt(0.47);
    ctx.beginPath();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.5;
    ctx.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, size * 0.0016, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, size * 0.0007, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // a faint inner glow band, keeps the dial from feeling flat
  ctx.strokeStyle = 'rgba(255,226,168,.12)';
  ctx.lineWidth = size * 0.002;
  ctx.beginPath();
  ctx.arc(c, c, pxInner + band * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function makeSoftDiscTexture(size = 256) {
  const el = canvas(size);
  const ctx = el.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,.85)');
  g.addColorStop(0.35, 'rgba(255,255,255,.28)');
  g.addColorStop(0.75, 'rgba(255,255,255,.045)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeNoiseTexture(size = 256) {
  const el = canvas(size);
  const ctx = el.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(el);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
