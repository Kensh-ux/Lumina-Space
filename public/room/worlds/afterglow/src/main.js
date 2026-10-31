import * as THREE from 'three';
import { CHAPTERS, UI_TEXT } from './content.js';
import { SoundEngine } from './core/audio.js';
import { UI } from './core/ui.js';
import { createRenderer } from './core/post.js';
import { savePoster } from './core/poster.js';
import { createFirstChapter } from './chapters/first.js';
import { createStardustChapter } from './chapters/stardust.js';
import { createTidesChapter } from './chapters/tides.js';
import { createAbyssChapter } from './chapters/abyss.js';
import { createEmberChapter } from './chapters/ember.js';
import { createFinaleChapter } from './chapters/finale.js';
import { clamp, easing, isTouch, nextFrame } from './core/util.js';

const $ = (sel) => document.querySelector(sel);

const canvas = $('#stage');
const post = createRenderer(canvas);
const sound = new SoundEngine();
const state = {
  firstLightDone: false,
  stardustDone: false,
  starName: '',
  tideDone: false,
  abyssDone: false,
  emberDone: false,
  ending: null,
  finaleDone: false,
  placed: new Set(),
};

const defById = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));
const order = CHAPTERS.map((c) => c.id);
const chapters = {};
let current = null;
let currentId = null;
let booted = false;
let hasEntered = false;
let transitioning = false;
let warpAnim = null;
let flashValue = 0;
let flashDecay = 2.6;
let time = 0;
let lastFrame = performance.now();
let dragging = false;
let lastX = 0;
let lastY = 0;
let ambientRestarting = false;

const ctxBase = {
  ui: null,
  audio: sound,
  state,
  ndc: new THREE.Vector2(),
  pointerX: window.innerWidth / 2,
  pointerY: window.innerHeight / 2,
  pointerActive: false,
  dragging: false,
  flash,
  navigate: (id) => navigate(id),
  restart: () => restart(),
  savePoster: () => downloadPoster(),
};

const ui = new UI({
  audio: sound,
  onEnter: () => enterExperience(),
  onBrand: () => openIntro(),
  onNavigate: (id) => navigate(id),
  onSoundToggle: () => sound.toggleMuted(),
  onFullscreen: () => toggleFullscreen(),
  onAmbientSave: () => downloadPoster(),
  onAmbientRestart: () => restart(true),
});
ctxBase.ui = ui;

function buildChapterCtx(def) {
  const idx = order.indexOf(def.id);
  const nextDef = defById[order[idx + 1]] || null;
  const chapterCtx = {
    ...ctxBase,
    content: def,
    nextDef,
    next: () => {
      if (nextDef) navigate(nextDef.id);
    },
  };
  // 指针状态在主循环里持续变化，必须让章节实时读到，而不是拿到构建时的快照。
  for (const key of ['pointerX', 'pointerY', 'pointerActive', 'dragging']) {
    Object.defineProperty(chapterCtx, key, {
      get: () => ctxBase[key],
      set: (v) => {
        ctxBase[key] = v;
      },
      enumerable: true,
      configurable: true,
    });
  }
  return chapterCtx;
}

const FACTORIES = {
  first: createFirstChapter,
  stardust: createStardustChapter,
  tides: createTidesChapter,
  abyss: createAbyssChapter,
  ember: createEmberChapter,
  finale: createFinaleChapter,
};

const LOADER_LABELS = {
  first: '正在点亮最后一束光',
  stardust: '正在收拾散落的星尘',
  tides: '正在等一场潮汐抵达',
  abyss: '正在校准事件视界',
  ember: '正在留下最后一点余烬',
  finale: '正在铺开你的星空',
};

function syncCamera(chapter) {
  if (!chapter) return;
  chapter.camera.aspect = window.innerWidth / window.innerHeight;
  chapter.camera.updateProjectionMatrix();
}

function applyLook(chapter) {
  post.bloom.strength = chapter.bloom ?? 0.8;
  post.bloom.radius = chapter.bloomRadius ?? 0.72;
  post.bloom.threshold = chapter.bloomThreshold ?? 0.18;
  post.renderer.toneMappingExposure = chapter.exposure ?? 1.05;
}

function flash(amount = 0.2, color = '#fff0d0') {
  flashValue = Math.min(1.25, flashValue + amount);
  flashDecay = 2.0 + amount * 2.4;
  post.setFlashColor(color);
}

function animateWarp(to, duration, easeFn = easing.outCubic, onDone) {
  warpAnim = {
    from: post.grade.uniforms.uWarp.value,
    to,
    t: 0,
    duration,
    easeFn,
    onDone,
  };
}

function updateWarp(dt) {
  if (!warpAnim) return;
  const a = warpAnim;
  a.t = Math.min(a.t + dt, a.duration);
  const p = a.duration === 0 ? 1 : a.t / a.duration;
  post.setWarp(a.from + (a.to - a.from) * a.easeFn(p));
  if (p >= 1) {
    warpAnim = null;
    a.onDone?.();
  }
}

function activateChapter(id, { card = false } = {}) {
  const def = defById[id];
  const chapter = chapters[id];
  if (!def || !chapter) return;
  if (current && current !== chapter) current.onHide?.();
  else if (current === chapter) current.onHide?.();
  current = chapter;
  currentId = id;
  ui.setAmbient(false);
  post.useChapter(chapter);
  applyLook(chapter);
  syncCamera(chapter);
  ui.showChapter(def);
  ui.setSceneCursor(null);
  chapter.onShow?.();
  sound.setChapter(id);
  if (card) ui.showChapterCard(def);
  try {
    history.replaceState(null, '', `#${id}`);
  } catch (e) {}
}

function navigate(id, { force = false } = {}) {
  if (!booted || ui.introOpen || transitioning) return;
  const def = defById[id];
  if (!def || !chapters[id]) return;
  if (id === currentId && !force) return;
  transitioning = true;
  ui.beginLeave();
  ui.closeMenu();
  sound.whoosh();
  const from = post.grade.uniforms.uWarp.value;
  animateWarp(1, 0.82, easing.inQuad, () => {
    activateChapter(id, { card: true });
    flash(0.24, def.accent);
    animateWarp(0, 1.55, easing.outCubic, () => {
      transitioning = false;
    });
  });
  post.setWarp(from);
}

function openIntro() {
  if (!booted || transitioning) return;
  ui.reopenIntro();
  sound.setChapter('intro');
  ctxBase.pointerActive = false;
  const label = $('#enterBtn .enter-label');
  if (label) label.textContent = hasEntered ? '回到最后一夜' : '推开档案室的门';
}

function enterExperience() {
  if (!booted || transitioning) return;
  sound.init();
  ui.enter();
  const resume = hasEntered && currentId;
  hasEntered = true;
  transitioning = true;
  post.setWarp(0.93);
  post.setFlash(0);
  flashValue = 0;
  const targetId = resume ? currentId : 'first';
  sound.setChapter(resume ? currentId : 'first');
  window.setTimeout(() => {
    activateChapter(targetId, { card: !resume });
    flash(0.3, defById[targetId].accent);
    sound.whoosh();
    animateWarp(0, 1.75, easing.outCubic, () => {
      transitioning = false;
    });
  }, 460);
  ctxBase.pointerActive = false;
}


function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    el.requestFullscreen?.().catch(() => ui.toast('当前浏览器不支持全屏'));
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

async function downloadPoster() {
  const ok = await savePoster(state);
  if (ok) {
    try {
      localStorage.setItem(
        'afterglow.lastArchive',
        JSON.stringify({ starName: state.starName, ending: state.ending, savedAt: new Date().toISOString() })
      );
    } catch (e) {}
  }
  return ok;
}

function restart(fromAmbient = false) {
  if (transitioning) return;
  if (fromAmbient) {
    if (ambientRestarting) return;
    const veil = document.getElementById('ambientVeil');
    if (!veil) return;
    ambientRestarting = true;
    veil.classList.add('is-show');
    setTimeout(() => {
      restart();
      setTimeout(() => {
        veil.classList.remove('is-show');
        ambientRestarting = false;
      }, 600);
    }, 900);
    return;
  }
  ui.setAmbient(false);
  for (const id of order) chapters[id]?.reset?.();
  state.firstLightDone = false;
  state.stardustDone = false;
  state.starName = '';
  state.tideDone = false;
  state.abyssDone = false;
  state.emberDone = false;
  state.ending = null;
  state.finaleDone = false;
  state.placed.clear();
  ui.visited = new Set();
  ui.clearDetail();
  ui.clearAction();
  ui.setSceneCursor(null);
  ui.toast('档案已回到第一页');
  navigate('first', { force: true });
}

// —— 指针 ——
function updatePointer(e) {
  ctxBase.pointerX = e.clientX;
  ctxBase.pointerY = e.clientY;
  ctxBase.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
}

canvas.addEventListener('pointerdown', (e) => {
  if (!booted || ui.introOpen || transitioning) return;
  e.preventDefault();
  updatePointer(e);
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  ctxBase.dragging = true;
  ctxBase.pointerActive = !isTouch();
  current?.pointerDown?.({ x: e.clientX, y: e.clientY });
});

window.addEventListener('pointermove', (e) => {
  updatePointer(e);
  const overCanvas = e.target === canvas;
  if (!dragging) ctxBase.pointerActive = overCanvas && !isTouch() && !ui.introOpen && !transitioning;
  if (!dragging || !booted) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = -(e.clientY / window.innerHeight) * 2 + 1;
  current?.pointerMove?.(dx, dy, nx, ny);
});

function endDrag(e) {
  if (!dragging) return;
  dragging = false;
  ctxBase.dragging = false;
  current?.pointerUp?.({ x: e.clientX, y: e.clientY });
  ctxBase.pointerActive = e.target === canvas && !isTouch();
}
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
window.addEventListener('blur', () => {
  if (dragging) {
    dragging = false;
    ctxBase.dragging = false;
    current?.pointerUp?.({ x: lastX, y: lastY });
  }
  ctxBase.pointerActive = false;
});
window.addEventListener('pointerout', (e) => {
  if (!e.relatedTarget) ctxBase.pointerActive = false;
});

window.addEventListener('resize', () => {
  post.size();
  for (const id of order) syncCamera(chapters[id]);
});
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    post.size();
    for (const id of order) syncCamera(chapters[id]);
  }, 220);
});

// —— 主循环 ——
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  time += dt;
  if (current?.update) current.update(dt);
  updateWarp(dt);
  if (flashValue > 0.001) {
    flashValue = Math.max(0, flashValue - dt * flashDecay * flashValue);
    post.setFlash(flashValue);
  } else if (post.grade.uniforms.uFlash.value !== 0) {
    flashValue = 0;
    post.setFlash(0);
  }
  post.setTime(time);
  post.render();
  sound.update(dt);
}

// —— 启动 ——
async function boot() {
  try {
    ui.progress(0.04, '正在校准坐标');
    await nextFrame();
    try {
      await document.fonts?.ready;
    } catch (e) {}
    ui.progress(0.12, '正在铺开档案纸');
    await nextFrame();

    let i = 0;
    for (const def of CHAPTERS) {
      const chapter = FACTORIES[def.id](buildChapterCtx(def));
      chapters[def.id] = chapter;
      syncCamera(chapter);
      i++;
      ui.progress(0.14 + (i / CHAPTERS.length) * 0.6, LOADER_LABELS[def.id] || '正在整理藏品');
      await nextFrame();
    }

    ui.progress(0.8, '正在让最后一束光通过镜头');
    await nextFrame();
    for (const def of CHAPTERS) {
      const ch = chapters[def.id];
      try {
        post.renderer.compile(ch.scene, ch.camera);
      } catch (e) {}
      await nextFrame();
    }

    // 序章背后先亮起第一件藏品
    const first = chapters.first;
    current = first;
    currentId = null;
    post.useChapter(first);
    applyLook(first);
    post.setWarp(0);
    ui.progress(0.97, '正在检查每一粒星尘');
    await nextFrame();
    await new Promise((r) => setTimeout(r, 420));
    ui.progress(1, '档案已就绪');
    await new Promise((r) => setTimeout(r, 380));
    ui.finishLoading();
    booted = true;
    sound.setChapter('intro');
    requestAnimationFrame((t) => {
      lastFrame = t;
      tick(t);
    });

    window.__afterglow = {
      state,
      chapters,
      ui,
      sound,
      navigate,
      debugJump: (id) => {
        if (ui.introOpen) ui.enter();
        post.setWarp(0);
        booted = true;
        activateChapter(id);
      },
      unlockAll: () => {
        state.firstLightDone = true;
        state.stardustDone = true;
        state.starName = state.starName || '未名';
        state.tideDone = true;
        state.abyssDone = true;
        state.emberDone = true;
        state.ending = state.ending || 'ignite';
      },
    };
  } catch (err) {
    console.error(err);
    ui.fatal('档案打开时出了点问题 · 请刷新再试');
  }
}

// 让 hash 能给测试和演示直接定位章节
boot();
