/**
 * 星潮 · ASTRAL TIDE
 * 夜海、星盘、四幕潮汐。
 *
 * 这个文件把场景、声音与界面缝在一起：
 * 每一次换幕都是整片夜色的重新呼吸，
 * 每一次触碰星盘都会在海上留下回声。
 */

import * as THREE from 'three';
import { OrbitControls } from '../vendor/addons/controls/OrbitControls.js';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';

import { Sky } from './world/sky.js';
import { Sea } from './world/sea.js';
import { Astrolabe } from './world/astrolabe.js';
import { ConstellationWhale } from './world/whale.js';
import { Effects } from './world/effects.js';
import { Soundscape } from './audio/soundscape.js';
import { UI } from './ui.js';
import { ACTS, ACT_ORDER, PLANETS, WHALE_NAME } from './acts.js';
import {
  preparePalette,
  mixPalettes,
  tween,
  cancelTweens,
  tickTweens,
  after,
  easeInOutCubic,
  clamp,
} from './util.js';

const BASE_FOV = 42;
const MAX_DPR = 1.5;
const PIXEL_BUDGET = 3_000_000;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const rnd = (min, max) => min + Math.random() * (max - min);

function showFatal(message) {
  const intro = document.querySelector('#intro');
  const enter = document.querySelector('#enter');
  const desc = document.querySelector('.intro-desc');
  const note = document.querySelector('.intro-note');
  if (desc) desc.innerHTML = message;
  if (note) note.textContent = '请尝试更新浏览器，或在设置中开启硬件加速。';
  if (enter) {
    enter.disabled = true;
    enter.querySelector('.enter-label').textContent = '此夜未能展开';
  }
  if (intro) intro.classList.add('is-fatal');
}

class AstralApp {
  constructor() {
    this.canvas = document.querySelector('#stage');
    this.entered = false;
    this.entering = false;
    this.actTransition = false;
    this.resonating = false;
    this.soundOn = true;
    this.whaleVisible = true;
    this.act = 'still';
    this.pendingAct = null;
    this.bloomBase = 0.48;
    this.resonanceBloom = 0;
    this.hoverPlanetId = null;
    this.hoverWhale = false;
    this.hoverCore = false;
    this.qualityLocked = false;
    this.renderScale = 1;
    this.fps = 60;
    this.ambientChime = rnd(10, 18);
    this.whaleCall = rnd(58, 82);
    this._frameTime = 0;
    this._frameCount = 0;
    this._dragging = false;
    this._down = null;
    this._lastPointer = { x: 0, y: 0 };
    this._ndc = new THREE.Vector2();
    this._corePos = new THREE.Vector3();
    this._raycaster = new THREE.Raycaster();

    this._initRenderer();
    this._initScene();
    this._initWorld();
    this._initPost();
    this._initUI();
    this._bind();
    this._applyPalette(this.palettes.still);
    this._currentPalette = this.palettes.still;
    this._setIntroCamera();

    this.elapsed = 0;
    this._last = performance.now();
    this._onResize();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);

    this._expose();
  }

  /* ------------------------------ renderer ------------------------------- */

  _initRenderer() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 760 ? 1.35 : MAX_DPR);
    const startPixels = innerWidth * innerHeight * this.dpr * this.dpr;
    if (startPixels > PIXEL_BUDGET) {
      this.renderScale = Math.max(0.6, Math.sqrt(PIXEL_BUDGET / startPixels));
    }
    renderer.setPixelRatio(this.dpr * this.renderScale);
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.setClearColor(0x02040a, 1);
    this.renderer = renderer;

    this._contextLost = false;
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this._contextLost = true;
      this.ui?.toast('星海正在重新凝神…', 3600);
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this._contextLost = false;
      this._applyResolution();
      this.ui?.toast('星海归位', 2400);
    });
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x06101e, 0.0115);

    this.camera = new THREE.PerspectiveCamera(BASE_FOV, innerWidth / innerHeight, 0.1, 700);
    this.camera.position.set(0, 6.4, 28.6);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.048;
    this.controls.enablePan = false;
    this.controls.enabled = false;
    this.controls.rotateSpeed = 0.52;
    this.controls.zoomSpeed = 0.72;
    this.controls.minDistance = 9;
    this.controls.maxDistance = 34;
    this.controls.minPolarAngle = Math.PI * 0.19;
    this.controls.maxPolarAngle = Math.PI * 0.56;
    this.controls.target.set(0, 5.6, 0);
    this.controls.update();

    this._buildEnvironment();

    this.ambient = new THREE.AmbientLight(0x9aaecb, 0.5);
    this.scene.add(this.ambient);

    this.keyLight = new THREE.DirectionalLight(0xdfeaff, 1.35);
    this.keyLight.position.set(-52, 31, -64);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x9fbde0, 0.5);
    this.fillLight.position.set(16, 10, 28);
    this.scene.add(this.fillLight);

    this.warmRim = new THREE.DirectionalLight(0xffc27d, 0.4);
    this.warmRim.position.set(18, -4, -30);
    this.scene.add(this.warmRim);
  }

  _buildEnvironment() {
    const width = 64;
    const height = 32;
    const data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      const v = y / (height - 1);
      for (let x = 0; x < width; x++) {
        const u = x / (width - 1);
        const i = (y * width + x) * 4;
        // cool sky above, a warm remembered horizon, near-black sea below
        const top = [4, 8, 18];
        const middle = [32, 44, 60];
        const horizon = [74, 58, 38];
        const bottom = [3, 5, 8];
        let r;
        let g;
        let b;
        if (v < 0.42) {
          const k = v / 0.42;
          r = top[0] + (middle[0] - top[0]) * k;
          g = top[1] + (middle[1] - top[1]) * k;
          b = top[2] + (middle[2] - top[2]) * k;
        } else if (v < 0.56) {
          const k = (v - 0.42) / 0.14;
          r = middle[0] + (horizon[0] - middle[0]) * k;
          g = middle[1] + (horizon[1] - middle[1]) * k;
          b = middle[2] + (horizon[2] - middle[2]) * k;
        } else {
          const k = clamp((v - 0.56) / 0.44, 0, 1);
          r = horizon[0] + (bottom[0] - horizon[0]) * k;
          g = horizon[1] + (bottom[1] - horizon[1]) * k;
          b = horizon[2] + (bottom[2] - horizon[2]) * k;
        }
        // the moon, low and veiled, on the other side of the sky
        const mu = Math.min(Math.abs(u - 0.68), 1 - Math.abs(u - 0.68));
        const mv = v - 0.22;
        const md = Math.sqrt(mu * mu * 1.9 + mv * mv * 3.1);
        const moonGlow = Math.exp(-md * md * 160) * 210 + Math.exp(-md * md * 24) * 30;
        const warmBand = Math.exp(-Math.pow((v - 0.51) * 9.5, 2)) * Math.exp(-Math.pow((u - 0.36) * 2.2, 2)) * 22;
        r = clamp(r + moonGlow * 0.82 + warmBand, 0, 255);
        g = clamp(g + moonGlow * 0.9 + warmBand * 0.72, 0, 255);
        b = clamp(b + moonGlow + warmBand * 0.42, 0, 255);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.needsUpdate = true;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const env = pmrem.fromEquirectangular(tex);
    this.scene.environment = env.texture;
    this.scene.environmentIntensity = 0.42;
    tex.dispose();
    pmrem.dispose();
  }

  _initWorld() {
    this.sky = new Sky(this.scene);
    this.sea = new Sea(this.scene);
    this.astro = new Astrolabe(this.scene);
    this.whale = new ConstellationWhale(this.scene, this.camera);
    this.effects = new Effects(this.scene, this.camera);

    // the instrument itself blocks clicks from falling through to the sea
    this.instrumentBlocker = new THREE.Mesh(
      new THREE.CircleGeometry(4.78, 72),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.instrumentBlocker.position.z = -0.14;
    this.astro.face.add(this.instrumentBlocker);

    this.effects.onLightning = () => {
      this.sea.flash(1.15);
      this.sound.thunder();
      this.ui?.flash(0.8);
      this.sky.pulse(0.28);
    };
  }

  _initPost() {
    const w = innerWidth;
    const h = innerHeight;
    const pixels = w * h * this.dpr * this.dpr * this.renderScale * this.renderScale;
    const target = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      samples: pixels > 1_900_000 ? 0 : 2,
    });
    target.texture.colorSpace = THREE.LinearSRGBColorSpace;

    this.composer = new EffectComposer(this.renderer, target);
    this.composer.setPixelRatio(this.dpr * this.renderScale);
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      this.bloomBase,
      0.42,
      0.8,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.sky.setPixelRatio(this.dpr * this.renderScale);
    this.whale.setPixelRatio(this.dpr * this.renderScale);
    this.effects.setPixelRatio(this.dpr * this.renderScale);
  }

  _initUI() {
    this.ui = new UI();
    this.sound = new Soundscape();

    this.ui.on('enter', () => this.enter());
    this.ui.on('act', (id) => this.setAct(id));
    this.ui.on('sound', (on) => this.setSound(on));
    this.ui.on('whale', (on) => this.setWhale(on));
    this.ui.on('resonance', () => this.resonance());
  }

  /* ------------------------------ palettes ------------------------------- */

  get palettes() {
    if (!this._palettes) {
      this._palettes = {};
      for (const id of ACT_ORDER) {
        this._palettes[id] = preparePalette(ACTS[id].palette);
      }
    }
    return this._palettes;
  }

  _applyPalette(p) {
    this.sky.setPalette(p);
    this.sea.setPalette(p);
    this.astro.setPalette(p);
    this.whale.setPalette(p);
    this.effects.setPalette(p);

    this.scene.fog.color.copy(p.fogColor);
    this.scene.fog.density = p.fogDensity;
    this.bloomBase = p.bloom;
    this.renderer.toneMappingExposure = p.exposure;

    this.ambient.color.copy(p.moonRim).lerp(p.skyMid, 0.62);
    this.ambient.intensity = 0.2 + p.starOpacity * 0.22;
    this.keyLight.color.copy(p.moon);
    this.keyLight.intensity = 0.52 + (1 - p.storm) * 0.42 + p.eclipse * 0.1;
    this.fillLight.color.copy(p.moonRim);
    this.fillLight.intensity = 0.18 + p.starOpacity * 0.25;
    this.warmRim.color.copy(p.core);
    this.warmRim.intensity = 0.16 + p.bloom * 0.2;
  }

  _framedCamera(actId) {
    const act = ACTS[actId];
    const target = new THREE.Vector3().fromArray(act.camera.target);
    const base = new THREE.Vector3().fromArray(act.camera.pos);
    const aspect = Math.max(0.4, innerWidth / innerHeight);
    const pull = clamp((1.12 - aspect) * 0.82, 0, 0.58);
    const offset = base.clone().sub(target).multiplyScalar(1 + pull);
    const pos = target.clone().add(offset);
    pos.y += pull * 1.5;
    const fov = BASE_FOV + pull * 19;
    return { pos, target, fov };
  }

  _setIntroCamera() {
    const aspect = innerWidth / innerHeight;
    const fov = BASE_FOV + clamp((1.1 - aspect) * 14, 0, 10);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 6.5, aspect < 0.8 ? 32 : 28.6);
    this.controls.target.set(0, 5.9, 0);
    this.camera.lookAt(this.controls.target);
  }

  _tweenCamera(to, duration, tag, onComplete) {
    cancelTweens(tag);
    const fromPos = this.camera.position.clone();
    const fromTarget = this.controls.target.clone();
    const fromFov = this.camera.fov;
    this.controls.enabled = false;
    tween(duration, (t) => {
      this.camera.position.lerpVectors(fromPos, to.pos, t);
      this.controls.target.lerpVectors(fromTarget, to.target, t);
      const fov = fromFov + (to.fov - fromFov) * t;
      if (Math.abs(this.camera.fov - fov) > 0.001) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
      }
      this.camera.lookAt(this.controls.target);
    }, {
      ease: easeInOutCubic,
      tag,
      onComplete: () => {
        this.controls.enabled = this.entered && !this.resonating;
        this.controls.update();
        onComplete?.();
      },
    });
  }

  /* -------------------------------- enter -------------------------------- */

  async enter() {
    if (this.entered) return;
    this.entered = true;
    this.entering = true;
    this.controls.enabled = false;

    // Start the reveal first; audio synthesis should never delay the night.
    const audioPromise = Promise.resolve().then(() => this.sound.init()).catch(() => null);

    this.astro.pulse(0.55);
    this.sky.pulse(0.3);
    this.sea.flash(0.24);
    after(720, () => this.ui.flash(0.32, true));
    after(1150, () => this.ui.ritualCaption('夜海醒来的第一件事，是记住你的名字。', 5600));

    this._tweenCamera(this._framedCamera(this.act), REDUCED ? 900 : 4200, 'enter', () => {
      this.entering = false;
      this.controls.enabled = true;
      this.controls.update();
      this.ambientChime = rnd(10, 18);
      this.whaleCall = rnd(58, 82);
      this.whale.call();
      this.sound.whale();
      this.ui.toast('拖动星盘 · 点击星体 · 或唤醒共鸣', 5200);
      if (this.pendingAct) {
        const next = this.pendingAct;
        this.pendingAct = null;
        if (next !== this.act) this.setAct(next);
      }
    });

    await audioPromise;
    if (!this.sound.ready) {
      this.soundOn = false;
      this.ui.setSound(false);
      this.ui.toast('此夜暂且无声 · 星海仍在流动', 4200);
      return;
    }
    this.sound.setEnabled(this.soundOn);
    this.sound.setAct(this.act);
    setTimeout(() => {
      if (this.entered && this.soundOn) this.ui.toast('声景已开启 · 建议佩戴耳机', 3400);
    }, 1800);
  }

  setSound(on) {
    this.soundOn = on;
    this.sound.setEnabled(on);
    if (on) {
      if (this.sound.ctx?.state === 'suspended') this.sound.ctx.resume();
      this.sound.chime(3, 0.35);
    }
  }

  setWhale(on) {
    this.whaleVisible = on;
    this.whale.setVisible(on);
    this.sky.setWhaleVisible(on);
    if (on) {
      after(420, () => {
        if (!this.whaleVisible) return;
        this.whale.call();
        this.sound.whale();
        this.sky.pulse(0.2);
      });
    } else if (this.ui.planet && this.ui.planet.id === 'whale') {
      this.ui.closePlanet();
    }
  }

  /* -------------------------------- acts --------------------------------- */

  setAct(id, options = {}) {
    const { instant = false } = options;
    if (!ACTS[id]) return;
    if (instant) {
      cancelTweens('act');
      cancelTweens('enter');
      this.actTransition = false;
      this.entering = false;
      this._commitAct(id);
      this._applyPalette(this.palettes[id]);
      this._currentPalette = this.palettes[id];
      const home = this._framedCamera(id);
      this.camera.position.copy(home.pos);
      this.controls.target.copy(home.target);
      this.camera.fov = home.fov;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(home.target);
      this.controls.enabled = this.entered && !this.resonating;
      this.controls.update();
      this.bloom.strength = this.palettes[id].bloom;
      return;
    }
    if (this.actTransition || this.resonating || this.entering) {
      this.pendingAct = id;
      return;
    }
    if (id === this.act) return;

    this.actTransition = true;
    this.pendingAct = null;
    const from = this._clonePalette(this._currentPalette || this.palettes[this.act]);
    const target = this.palettes[id];

    this._commitAct(id);

    const home = this._framedCamera(id);
    // small counter-move so the camera feels like it is inhaling
    const camFrom = this.camera.position.clone();
    const dir = camFrom.clone().sub(this.controls.target).normalize();
    const dip = dir.multiplyScalar(0.55).add(new THREE.Vector3(0, 0.22, 0));

    this.ui.flash(id === 'eclipse' ? 0.46 : 0.3, id === 'eclipse');
    this.sky.pulse(0.32);
    this.astro.pulse(0.42);
    this.sea.flash(0.18);
    this.sound.chime(id === 'storm' ? 4 : id === 'eclipse' ? 5 : 1, 0.32);

    const duration = REDUCED ? 700 : (id === 'storm' ? 3100 : 2700);    const fromPos = this.camera.position.clone();
    const fromTarget = this.controls.target.clone();
    const fromFov = this.camera.fov;
    this.controls.enabled = false;

    tween(duration, (t, raw) => {
      const mix = mixPalettes(from, target, t);
      this._applyPalette(mix);
      this._currentPalette = mix;

      this.camera.position.lerpVectors(fromPos, home.pos, t);
      this.camera.position.addScaledVector(dip, Math.sin(raw * Math.PI));
      this.controls.target.lerpVectors(fromTarget, home.target, t);
      const fov = fromFov + (home.fov - fromFov) * t;
      if (Math.abs(this.camera.fov - fov) > 0.001) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
      }
      this.camera.lookAt(this.controls.target);
    }, {
      ease: easeInOutCubic,
      tag: 'act',
      onComplete: () => {
        this._applyPalette(target);
        this._currentPalette = target;
        this.camera.position.copy(home.pos);
        this.controls.target.copy(home.target);
        this.camera.fov = home.fov;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(home.target);
        this.bloom.strength = target.bloom;
        this.actTransition = false;
        this.controls.enabled = this.entered && !this.resonating;
        this.controls.update();
        if (this.pendingAct) {
          const next = this.pendingAct;
          this.pendingAct = null;
          if (next !== this.act) this.setAct(next);
        }
      },
    });
  }

  _commitAct(id) {
    this.act = id;
    this.ui.setAct(id);
    this.sound.setAct(id);
    this.astro.setHoveredPlanet(null);
    this.hoverPlanetId = null;
    if (this.whaleVisible) this.whale.setVisible(true);
  }

  _clonePalette(p) {
    const out = {};
    for (const [key, value] of Object.entries(p)) {
      out[key] = value instanceof THREE.Color ? value.clone() : value;
    }
    return out;
  }

  /* ------------------------------ resonance ------------------------------ */

  resonance() {
    if (!this.entered || this.resonating || this.actTransition || this.entering) return;
    this.resonating = true;
    this.pendingAct = null;
    this.ui.setResonanceBusy(true);
    this.ui.closePlanet();
    this.controls.enabled = false;

    const core = this.astro.getCoreWorldPosition(new THREE.Vector3());
    const fromPos = this.camera.position.clone();
    const fromTarget = this.controls.target.clone();
    const dir = fromPos.clone().sub(fromTarget);
    const toPos = fromTarget.clone().addScaledVector(dir, 0.74);
    toPos.y += 0.28;
    const lookAt = fromTarget.clone().lerp(core, 0.1);

    this.astro.resonate();
    this.effects.resonate(core);
    this.sea.flash(0.9);
    this.sky.pulse(0.65);
    this.sound.resonance();
    this.ui.flash(0.42, true);

    cancelTweens('resonanceBloom');
    this.resonanceBloom = 0;
    tween(6800, (t) => {
      this.resonanceBloom = Math.sin(Math.min(1, t * 1.02) * Math.PI) * 0.12;
    }, {
      tag: 'resonanceBloom',
      ease: (t) => t,
      onComplete: () => { this.resonanceBloom = 0; },
    });

    tween(1900, (t) => {
      this.camera.position.lerpVectors(fromPos, toPos, t);
      this.controls.target.lerpVectors(fromTarget, lookAt, t);
      this.camera.lookAt(this.controls.target);
    }, { ease: easeInOutCubic, tag: 'resonance' });

    tween(2500, (t) => {
      this.camera.position.lerpVectors(toPos, fromPos, t);
      this.controls.target.lerpVectors(lookAt, fromTarget, t);
      this.camera.lookAt(this.controls.target);
    }, {
      delay: 4300,
      ease: easeInOutCubic,
      tag: 'resonance',
      onComplete: () => {
        this.controls.target.copy(fromTarget);
        this.camera.position.copy(fromPos);
        this.camera.lookAt(fromTarget);
        this.resonating = false;
        this.ui.setResonanceBusy(false);
        this.controls.enabled = true;
        this.controls.update();
        this.ui.toast('星盘已记住这一刻', 3200);
      },
    });

    after(1250, () => {
      if (this.resonating) this.ui.ritualCaption('你听见了海的心跳。', 5600);
    });
    after(2900, () => {
      if (this.resonating) this.ui.flash(0.28, true);
    });
  }

  /* -------------------------------- picking ------------------------------ */

  _setRay(x, y) {
    this._ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    this._raycaster.setFromCamera(this._ndc, this.camera);
  }

  _rayObject(object) {
    return this._raycaster.intersectObject(object, false)[0] || null;
  }

  _pick(x, y) {
    this._setRay(x, y);

    const starHits = this._raycaster.intersectObjects(this.astro.pickTargets, false);
    for (const hit of starHits) {
      if (hit.object.userData.planetId) {
        return { type: 'planet', id: hit.object.userData.planetId };
      }
      if (hit.object.userData.core) return { type: 'core' };
    }

    const dial = this._rayObject(this.astro.dials[0]) ||
      this._rayObject(this.astro.dials[1]) ||
      this._rayObject(this.astro.dials[2]);
    if (dial) return { type: 'dial', object: dial.object };

    if (this._rayObject(this.instrumentBlocker)) return { type: 'instrument' };

    if (this.whaleVisible && this.whale.opacityScale > 0.08) {
      const whaleHit = this._rayObject(this.whale.hit);
      if (whaleHit) return { type: 'whale' };
    }

    const seaHit = this._rayObject(this.sea.mesh);
    if (seaHit && seaHit.distance < 270 && y > innerHeight * 0.5) {
      return { type: 'sea', point: seaHit.point };
    }

    return { type: 'sky' };
  }

  _pickHover(x, y) {
    this._setRay(x, y);

    const starHits = this._raycaster.intersectObjects(this.astro.pickTargets, false);
    if (starHits.length) {
      const hit = starHits[0];
      if (hit.object.userData.planetId) {
        return { type: 'planet', id: hit.object.userData.planetId };
      }
      if (hit.object.userData.core) return { type: 'core' };
    }

    const dial = this._rayObject(this.astro.dials[0]) ||
      this._rayObject(this.astro.dials[1]) ||
      this._rayObject(this.astro.dials[2]);
    if (dial) return { type: 'dial' };

    if (this._rayObject(this.instrumentBlocker)) return { type: 'instrument' };

    if (this.whaleVisible && this.whale.opacityScale > 0.12) {
      if (this._rayObject(this.whale.hit)) return { type: 'whale' };
    }

    return { type: 'none' };
  }

  _updateHover(x, y) {
    if (!this.entered || this.actTransition || this.resonating || this.entering) {
      this._clearHover();
      return;
    }
    if (this.ui.planet) {
      this.astro.setHoveredPlanet(null);
      this.hoverPlanetId = null;
      this.hoverWhale = false;
      this.hoverCore = false;
      this.ui.hidePlanetTip();
      this.ui.setInteractiveHover(false);
      return;
    }

    const hit = this._pickHover(x, y);
    let interactive = false;

    if (hit.type === 'planet') {
      const planet = PLANETS.find((p) => p.id === hit.id);
      if (planet) {
        if (this.hoverPlanetId !== planet.id) {
          this.astro.setHoveredPlanet(planet.id);
          this.hoverPlanetId = planet.id;
          this.hoverWhale = false;
          this.hoverCore = false;
          this.sound.chime(PLANETS.indexOf(planet) + 1, 0.12);
        }
        this.ui.showPlanetTip(planet, x, y);
        interactive = true;
      }
    } else if (hit.type === 'core') {
      this.astro.setHoveredPlanet(null);
      this.hoverPlanetId = null;
      this.hoverWhale = false;
      this.hoverCore = true;
      this.ui.showPlanetTip({ cn: '星核', epithet: 'STAR CORE · 轻触共鸣' }, x, y);
      interactive = true;
    } else if (hit.type === 'whale') {
      this.astro.setHoveredPlanet(null);
      this.hoverPlanetId = null;
      this.hoverWhale = true;
      this.hoverCore = false;
      this.ui.showPlanetTip({ cn: WHALE_NAME.cn, epithet: WHALE_NAME.note }, x, y);
      interactive = true;
    } else if (hit.type === 'dial') {
      this.astro.setHoveredPlanet(null);
      this.hoverPlanetId = null;
      this.hoverWhale = false;
      this.hoverCore = false;
      this.ui.hidePlanetTip();
      interactive = true;
    } else {
      this.astro.setHoveredPlanet(null);
      this.hoverPlanetId = null;
      this.hoverWhale = false;
      this.hoverCore = false;
      this.ui.hidePlanetTip();
    }

    this.ui.setInteractiveHover(interactive);
  }

  _clearHover() {
    this.astro?.setHoveredPlanet(null);
    this.hoverPlanetId = null;
    this.hoverWhale = false;
    this.hoverCore = false;
    this.ui?.hidePlanetTip();
    this.ui?.setInteractiveHover(false);
  }

  _activate(x, y) {
    if (!this.entered || this.entering) return;
    if (this.ui.planet) {
      this.ui.closePlanet();
      return;
    }
    if (this.actTransition || this.resonating) return;

    const hit = this._pick(x, y);
    switch (hit.type) {
      case 'planet': {
        const planet = PLANETS.find((p) => p.id === hit.id);
        if (planet) this.openPlanet(planet, PLANETS.indexOf(planet));
        break;
      }
      case 'core':
        this.resonance();
        break;
      case 'dial':
        this.astro.spinRing(hit.object);
        this.sound.tick();
        this.astro.pulse(0.14);
        this.sky.pulse(0.06);
        break;
      case 'whale':
        this.openWhale();
        break;
      case 'sea': {
        const point = new THREE.Vector3(hit.point.x, 0.06, hit.point.z);
        this.effects.splash(point);
        this.sea.flash(0.22);
        this.sound.splash();
        this.astro.pulse(0.09);
        if (Math.random() < 0.3) {
          this.sky.spawnAtClick({
            x: this._ndc.x * rnd(4, 8),
            y: this._ndc.y * rnd(1.4, 2.4),
          });
        }
        break;
      }
      default:
        this.sky.spawnAtClick({
          x: this._ndc.x * rnd(4.5, 8.5),
          y: this._ndc.y * rnd(1.4, 2.6),
        });
        break;
    }
  }

  openPlanet(planet, index) {
    this.ui.openPlanet(planet, index);
    this.astro.setHoveredPlanet(planet.id);
    this.hoverPlanetId = planet.id;
    this.astro.pulse(0.22);
    this.sound.chime(index + 1, 0.5);
    this.ui.hidePlanetTip();
  }

  openWhale() {
    const entry = {
      id: 'whale',
      cn: WHALE_NAME.cn,
      en: WHALE_NAME.en,
      epithet: WHALE_NAME.note,
      act: this.act,
      color: '#a9c9ec',
      desc: '它并非真的鲸。夜海把散落的星连成它的骨，把潮声填进它的胸腔。每当有人抬头，它就从梦的背面游过，把一小片星空留在浪里。',
      meta: [
        ['形质', '星群与雾'],
        ['行迹', '梦与梦之间'],
        ['方位', '所有海的背面'],
      ],
    };
    this.ui.openPlanet(entry, PLANETS.length);
    this.whale.call();
    this.sound.whale();
    this.sky.pulse(0.34);
    this.ui.ritualCaption('鲸落 · 它跃过的地方，星群重新排列。', 4200);
    this.ui.hidePlanetTip();
  }

  /* -------------------------------- input -------------------------------- */

  _bind() {
    const canvas = this.canvas;

    canvas.addEventListener('pointermove', (e) => {
      this._lastPointer.x = e.clientX;
      this._lastPointer.y = e.clientY;
      if (this._down) {
        const dx = e.clientX - this._down.x;
        const dy = e.clientY - this._down.y;
        if (Math.hypot(dx, dy) > 6) this._dragging = true;
      }
      if (e.pointerType === 'touch') return;
      if (this._dragging) {
        this.ui.hidePlanetTip();
        return;
      }
      this._updateHover(e.clientX, e.clientY);
    }, { passive: true });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this._down = { x: e.clientX, y: e.clientY, time: performance.now() };
      this._dragging = false;
    });

    canvas.addEventListener('pointerup', (e) => {
      if (!this._down) return;
      const dx = e.clientX - this._down.x;
      const dy = e.clientY - this._down.y;
      const elapsed = performance.now() - this._down.time;
      const moved = Math.hypot(dx, dy);
      this._down = null;
      if (this._dragging || moved > 7 || elapsed > 900) {
        this._dragging = false;
        return;
      }
      this._dragging = false;
      this._activate(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointerleave', () => {
      this._clearHover();
      this._down = null;
      this._dragging = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this._onResize(), 60));

    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        this.ui.closePlanet();
        return;
      }
      if (!this.entered) return;
      if (e.key >= '1' && e.key <= '4') {
        this.setAct(ACT_ORDER[Number(e.key) - 1]);
      } else if (e.key.toLowerCase() === 'r') {
        this.resonance();
      } else if (e.key.toLowerCase() === 'm') {
        document.querySelector('#soundBtn')?.click();
      } else if (e.key.toLowerCase() === 'w') {
        document.querySelector('#whaleBtn')?.click();
      }
    });

    this.controls.addEventListener('start', () => {
      this.ui.hidePlanetTip();
      this.ui.setInteractiveHover(false);
    });
    this.controls.addEventListener('end', () => {
      this._updateHover(this._lastPointer.x, this._lastPointer.y);
    });
  }

  _onResize() {
    const w = innerWidth;
    const h = innerHeight;
    const pixels = w * h * this.dpr * this.dpr;
    if (pixels > PIXEL_BUDGET) {
      const next = Math.max(0.6, Math.sqrt(PIXEL_BUDGET / pixels));
      if (next < this.renderScale - 0.001) {
        this.renderScale = next;
        this._applyResolution();
      }
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);

    const aspect = w / h;
    const pull = clamp((1.12 - aspect) * 0.82, 0, 0.58);
    if (!this.entering && !this.actTransition && !this.resonating) {
      const fov = BASE_FOV + pull * 19;
      if (Math.abs(this.camera.fov - fov) > 0.01) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
      }
    }

    const ratio = this.dpr * this.renderScale;
    this.whale.setPixelRatio(ratio);
    this.sky.setPixelRatio(ratio);
    this.effects.setPixelRatio(ratio);
  }

  _applyResolution() {
    const ratio = this.dpr * this.renderScale;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(innerWidth, innerHeight);
    this.sky.setPixelRatio(ratio);
    this.whale.setPixelRatio(ratio);
    this.effects.setPixelRatio(ratio);
  }

  setRenderScale(value) {
    this.renderScale = clamp(value, 0.6, 1);
    this._applyResolution();
  }

  /* --------------------------------- loop -------------------------------- */

  _loop(now) {
    requestAnimationFrame(this._loop);
    if (this._contextLost) {
      this._last = now;
      return;
    }
    const rawDt = Math.min((now - this._last) / 1000 || 0, 0.5);
    const dt = Math.min(rawDt, 0.05);
    this._last = now;
    if (rawDt <= 0) return;

    tickTweens(rawDt * 1000);
    this.elapsed += Math.min(rawDt, 0.1);
    const elapsed = this.elapsed;

    if (!this.entered && !this.entering) {
      const t = elapsed;
      this.camera.position.set(
        Math.sin(t * 0.065) * 0.85,
        6.5 + Math.sin(t * 0.11) * 0.16,
        (innerWidth / innerHeight < 0.8 ? 32 : 28.6) + Math.sin(t * 0.045) * 0.75,
      );
      this.controls.target.set(0, 5.9 + Math.sin(t * 0.08) * 0.1, 0);
      this.camera.lookAt(this.controls.target);
    } else if (this.controls.enabled) {
      this.controls.update();
    }

    this.sky.update(dt, elapsed);
    this.astro.update(dt, elapsed);
    this.astro.getCoreWorldPosition(this._corePos);
    this.sea.setCorePosition(this._corePos);
    this.sea.update(dt, elapsed);
    this.whale.update(dt, elapsed, this.camera.quaternion);
    this.effects.update(dt, elapsed);

    this.bloom.strength = this.bloomBase + this.resonanceBloom;

    this._ambient(dt);
    this._quality(rawDt);

    this.composer.render(dt);
  }

  _ambient(dt) {
    if (!this.entered) return;
    if (this.soundOn) {
      this.ambientChime -= dt;
      if (this.ambientChime <= 0) {
        this.sound.chime(Math.floor(rnd(0, 7)), rnd(0.16, 0.32));
        this.ambientChime = rnd(14, 27);
      }
    }
    if (this.whaleVisible && this.act !== 'storm' && !this.resonating) {
      this.whaleCall -= dt;
      if (this.whaleCall <= 0) {
        this.whale.call();
        this.sound.whale();
        this.whaleCall = rnd(62, 96);
      }
    }
  }

  _quality(dt) {
    this._frameTime += dt;
    this._frameCount += 1;
    if (this._frameTime < 1.4) return;
    this.fps = this._frameCount / this._frameTime;
    this._frameTime = 0;
    this._frameCount = 0;

    if (this.qualityLocked || document.hidden || this._contextLost) return;
    // never rebuild buffers in the middle of an entrance, act change or ritual
    if (this.resonating || this.entering || this.actTransition) return;
    if (this.fps < 42 && this.renderScale > 0.65) {
      this.renderScale = Math.max(0.65, Number((this.renderScale - 0.12).toFixed(2)));
      this._applyResolution();
    } else if (this.fps < 42 && this.dpr > 1.02) {
      this.dpr = Math.max(1, Number((this.dpr - 0.15).toFixed(2)));
      this._applyResolution();
    }
    if (this.renderScale <= 0.65 && this.dpr <= 1.02) this.qualityLocked = true;
  }

  /* --------------------------------- debug ------------------------------- */

  _expose() {
    const app = this;
    window.__ASTRAL__ = {
      app,
      enter: () => document.querySelector('#enter')?.click(),
      setAct: (id, options) => app.setAct(id, options),
      resonance: () => app.resonance(),
      setSound: (on) => app.setSound(on),
      setWhale: (on) => app.setWhale(on),
      setRenderScale: (v) => app.setRenderScale(v),
      state: () => ({
        act: app.act,
        entered: app.entered,
        transitioning: app.actTransition,
        resonating: app.resonating,
        dpr: app.dpr,
        fps: Number(app.fps.toFixed(1)),
        camera: app.camera.position.toArray().map((v) => Number(v.toFixed(2))),
        target: app.controls.target.toArray().map((v) => Number(v.toFixed(2))),
        planets: PLANETS.length,
        audio: app.sound.ready,
      }),
      camera: app.camera,
      controls: app.controls,
      renderer: app.renderer,
      composer: app.composer,
      scene: app.scene,
      astro: app.astro,
      whale: app.whale,
      sky: app.sky,
      sea: app.sea,
      effects: app.effects,
    };
  }
}

try {
  new AstralApp();
} catch (error) {
  console.error('[ASTRAL TIDE]', error);
  showFatal('此夜未能展开。<br />浏览器似乎没有点亮 WebGL。');
}
