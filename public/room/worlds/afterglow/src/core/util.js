export const PI = Math.PI;
export const TAU = Math.PI * 2;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const smoothstep = (a, b, v) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a, b, v) => {
  const t = invLerp(a, b, v);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// 近似高斯：三次均匀分布相加
export const gaussian = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

export const easing = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t) => -(Math.cos(PI * t) - 1) / 2,
  outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
};

export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export const isTouch = () =>
  typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
export const isSmall = () => typeof window !== 'undefined' && window.innerWidth < 820;
export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const dpr = () => Math.min(window.devicePixelRatio || 1, 1.75);

export const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class Tween {
  constructor() {
    this.items = [];
  }
  to(target, key, value, duration, easeFn = easing.outCubic, onComplete) {
    const from = target[key];
    this.items.push({ target, key, from, to: value, t: 0, duration, easeFn, onComplete });
    return this;
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t = Math.min(it.t + dt, it.duration);
      const p = it.easeFn(it.duration === 0 ? 1 : it.t / it.duration);
      it.target[it.key] = lerp(it.from, it.to, p);
      if (it.t >= it.duration) {
        this.items.splice(i, 1);
        it.onComplete?.();
      }
    }
  }
  clear() {
    this.items.length = 0;
  }
}

export class Timeline {
  constructor() {
    this.tracks = [];
    this.time = 0;
    this.playing = false;
    this.duration = 0;
  }
  at(time, fn) {
    this.tracks.push({ delay: time, duration: 0, fn, done: false });
    this.duration = Math.max(this.duration, time);
    return this;
  }
  add(delay, duration, fn, onDone) {
    this.tracks.push({ delay, duration, fn, onDone, done: false, started: false });
    this.duration = Math.max(this.duration, delay + duration);
    return this;
  }
  play(reset = true) {
    if (reset) {
      this.time = 0;
      for (const t of this.tracks) {
        t.done = false;
        t.started = false;
      }
    }
    this.playing = true;
    return this;
  }
  get finished() {
    return this.time >= this.duration && this.playing === false;
  }
  update(dt) {
    if (!this.playing) return;
    this.time += dt;
    for (const t of this.tracks) {
      if (t.done) continue;
      if (this.time < t.delay) continue;
      if (t.duration === 0) {
        if (!t.started) {
          t.started = true;
          t.fn?.(1);
          t.done = true;
        }
      } else {
        if (!t.started) {
          t.started = true;
          t.fn?.(0);
        }
        const p = clamp((this.time - t.delay) / t.duration);
        t.fn?.(p);
        if (p >= 1) {
          t.done = true;
          t.onDone?.();
        }
      }
    }
    if (this.time >= this.duration) this.playing = false;
  }
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatDate(d = new Date()) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
