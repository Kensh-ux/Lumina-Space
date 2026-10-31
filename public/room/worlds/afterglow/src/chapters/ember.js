import * as THREE from 'three';
import { createSky, createGlowSprite, createOrbitDust } from '../core/sky.js';
import { createStar } from '../core/objects.js';
import { doneAction } from '../core/interactions.js';
import { clamp, damp, easing, isSmall, lerp, mulberry32, TAU } from '../core/util.js';

const EMBER_VERT = /* glsl */ `
attribute vec3 aDir;
attribute vec3 aColor;
attribute float aDist;
attribute float aSize;
attribute float aSeed;
uniform float uTime;
uniform float uBurst;
uniform float uSettle;
uniform float uDpr;
varying vec3 vColor;
varying float vAlpha;
void main(){
  float b = uBurst;
  float st = uSettle;
  float d = aDist * (1.0 + b * (1.6 + aSeed * 1.9) - st * (0.45 + aSeed * 0.25));
  vec3 p = aDir * d;
  p.y += sin(uTime * 0.35 + aSeed * 12.0) * 0.05 - st * (0.5 + aSeed * 0.6);
  p.x += cos(uTime * 0.3 + aSeed * 9.0) * 0.05;
  p.z += sin(uTime * 0.27 + aSeed * 7.0) * 0.05;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vColor = aColor;
  float flicker = 0.65 + 0.35 * sin(uTime * (0.6 + aSeed) + aSeed * 21.0);
  float burstFade = 1.0 - smoothstep(0.05, 0.98, b);
  vAlpha = flicker * (0.3 + 0.7 * aSeed) * burstFade * (1.0 - st * 0.92);
  gl_PointSize = aSize * uDpr * (290.0 / max(-mv.z, 0.6)) * (1.0 + b * 1.4);
  gl_Position = projectionMatrix * mv;
}`;

const EMBER_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.02, d);
  a = pow(a, 1.7);
  gl_FragColor = vec4(vColor, a * vAlpha);
}`;

const SPECTRUM = ['#ff6b4a', '#ffb75e', '#ffe9a6', '#9fe0a8', '#8fd4ff', '#b6a3ff', '#ff9ad5'];

export function createEmberChapter(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140);
  camera.position.set(0, 0.1, 7.3);

  const sky = createSky({
    top: '#040204',
    bottom: '#100805',
    nebA: '#4a1d10',
    nebB: '#2a1a22',
    nebIntensity: 0.5,
    starCount: isSmall() ? 1500 : 3300,
    heroStars: [
      { pos: [-9, 4.6, -20], color: '#ffbb84', scale: 2.2, opacity: 0.3 },
      { pos: [8.8, -4.8, -24], color: '#c7b3d6', scale: 1.4, opacity: 0.22 },
    ],
    dustColor: '#d8b192',
    seed: 117,
  });
  scene.add(sky.group);

  const system = new THREE.Group();
  scene.add(system);

  // —— 将熄的巨星 ——
  const oldGroup = new THREE.Group();
  system.add(oldGroup);
  const star = createStar({
    radius: 1.38,
    colorA: '#3d0502',
    colorB: '#ff5a1c',
    colorC: '#ffd08a',
    glowColor: '#ff9b5e',
    seed: 4.7,
    heat: 0.78,
    scaleNoise: 2.5,
    glowScale: 1.15,
    detail: isSmall() ? 96 : 144,
  });
  oldGroup.add(star.group);
  star.halo1.material.opacity = 0.36;
  star.halo2.material.opacity = 0.14;

  const flare = createGlowSprite('#ff9a58', 5.6, 0.16, 'flare');
  oldGroup.add(flare);
  const corona = createGlowSprite('#ffbf86', 3.8, 0.1, 'soft');
  oldGroup.add(corona);

  const arcMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffb27a'),
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const arc1 = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.0038, 6, 220), arcMat);
  arc1.rotation.set(1.1, 0.2, 0.3);
  system.add(arc1);
  const arc2 = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.0024, 6, 220), arcMat.clone());
  arc2.material.opacity = 0.18;
  arc2.rotation.set(1.32, -0.3, -0.5);
  system.add(arc2);

  // —— 余烬粒子 ——
  const count = isSmall() ? 2100 : 4800;
  const rng = mulberry32(909);
  const dir = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const dists = new Float32Array(count);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  const palette = [new THREE.Color('#ffd9a0'), new THREE.Color('#ff8b45'), new THREE.Color('#ff5c2a'), new THREE.Color('#ffe9c8')];
  for (let i = 0; i < count; i++) {
    const theta = rng() * TAU;
    const u = rng() * 2 - 1;
    const s = Math.sqrt(1 - u * u);
    dir[i * 3] = Math.cos(theta) * s;
    dir[i * 3 + 1] = u * 0.55;
    dir[i * 3 + 2] = Math.sin(theta) * s;
    dists[i] = 1.7 + Math.pow(rng(), 0.6) * 2.2;
    seeds[i] = rng();
    sizes[i] = 0.02 + Math.pow(rng(), 2.2) * 0.1;
    const c = palette[Math.floor(rng() * palette.length)];
    const b = 0.4 + rng() * 0.6;
    colors[i * 3] = c.r * b;
    colors[i * 3 + 1] = c.g * b;
    colors[i * 3 + 2] = c.b * b;
  }
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  eGeo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
  eGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  eGeo.setAttribute('aDist', new THREE.BufferAttribute(dists, 1));
  eGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  eGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  eGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 8);
  const emberMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBurst: { value: 0 },
      uSettle: { value: 0 },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: EMBER_VERT,
    fragmentShader: EMBER_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const embers = new THREE.Points(eGeo, emberMat);
  embers.frustumCulled = false;
  system.add(embers);

  // —— 冲击波 ——
  const shock = createGlowSprite('#fff2d8', 1, 0, 'ring');
  system.add(shock);
  const shock2 = createGlowSprite('#ffc08a', 1, 0, 'ring');
  system.add(shock2);
  const burstGlow = createGlowSprite('#ffffff', 1, 0, 'flare');
  system.add(burstGlow);

  // —— 新生星 ——
  const newGroup = new THREE.Group();
  newGroup.visible = false;
  newGroup.scale.setScalar(0.001);
  system.add(newGroup);
  const newborn = createStar({
    radius: 0.56,
    colorA: '#0b2740',
    colorB: '#7ad9ff',
    colorC: '#ffffff',
    seed: 2.2,
    heat: 1.1,
    scaleNoise: 3.4,
    glowScale: 0.95,
    detail: 96,
  });
  newGroup.add(newborn.group);
  const newHalo = createGlowSprite('#a8e9ff', 3.6, 0.3, 'soft');
  newGroup.add(newHalo);

  // 谱色残环
  const ringPts = [];
  const ringColors = [];
  const spec = SPECTRUM.map((c) => new THREE.Color(c));
  for (let i = 0; i < 240; i++) {
    const a = (i / 240) * TAU;
    const r = 1.32 + Math.sin(a * 5.0) * 0.035;
    ringPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    const c = spec[Math.floor((i / 240) * spec.length)];
    ringColors.push(c.r, c.g, c.b);
  }
  const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
  ringGeo.setAttribute('color', new THREE.Float32BufferAttribute(ringColors, 3));
  const spectrumRing = new THREE.LineLoop(
    ringGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  spectrumRing.rotation.set(1.02, 0.25, 0);
  newGroup.add(spectrumRing);

  const newDust = createOrbitDust({ count: isSmall() ? 90 : 180, radius: 1.0, spread: 0.45, color: '#bfe8ff', size: 0.024, seed: 13 });
  newDust.rotation.x = 1.0;
  newDust.material.opacity = 0;
  newGroup.add(newDust);

  const label = ctx.ui.createLabel('is-soft');
  label.setHTML('FINAL STAR · 128 亿年');
  const label2 = ctx.ui.createLabel('is-soft');
  label2.setHTML('THE EMBER · 一个决定');

  let phase = 'wait'; // wait | fade | ignite | done
  let ending = null;
  let t = 0;
  let time = 0;
  let skyBase = 0.5;
  let hover = false;
  let dragX = 0;
  let dragY = 0;
  let targetRotY = 0;
  let targetRotX = 0;
  let pointer = { x: 0, y: 0 };
  let done = false;
  let choiceLocked = false;
  let lastShot = -1;
  const anchor = new THREE.Vector3();
  const proj = new THREE.Vector3();
  const starScreen = new THREE.Vector2();

  function setSky(v) {
    sky.setNebIntensity?.(v);
  }

  function choose(kind) {
    if (choiceLocked) return;
    choiceLocked = true;
    ending = kind;
    phase = kind;
    t = 0;
    ctx.state.ending = kind;
    ctx.audio.click();
    ctx.audio.chargeStart(kind === 'fade' ? 70 : 140);
    if (kind === 'fade') {
      ctx.audio.ping(0.75, 0.03, 2.6);
      ctx.ui.setHint('正在熄灭 · 请等它一会儿');
    } else {
      ctx.audio.ping(3, 0.03, 1.2);
      ctx.ui.setHint('正在点燃 · 请站远一点');
    }
    ctx.ui.setAction(
      `<div class="next-row"><span class="name-caption">${
        kind === 'fade' ? 'COOLING DOWN · 温度正在散去' : 'IGNITION · 正在压缩核心'
      }</span><span class="think-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>`
    );
    ctx.ui.clearDetail();
  }

  function finalize(kind) {
    if (done) return;
    done = true;
    phase = 'done';
    choiceLocked = true;
    ctx.audio.chargeStop(true);
    if (kind === 'fade') {
      ctx.state.ending = 'fade';
      ctx.state.emberDone = true;
      oldGroup.visible = false;
      ctx.ui.setBody(ctx.content.afterFade);
      ctx.ui.setDetail(ctx.content.detailFade, true);
      ctx.ui.setHint('长夜 · 安静', true);
      label.setHTML('WHITE DWARF · 余温未散');
      label2.hide();
      const act = doneAction({ caption: '你陪它走完了最后一程', next: ctx.nextDef, onNext: ctx.next });
      if (ctx.nextDef) ctx.ui.setAction(act.html, act.mount);
      else ctx.ui.setAction(`<div class="next-row"><span class="name-caption">你陪它走完了最后一程</span></div>`);
      ctx.audio.chime(4);
      ctx.flash(0.22, '#cfe2ff');
    } else {
      ctx.state.ending = 'ignite';
      ctx.state.emberDone = true;
      ctx.ui.setBody(ctx.content.afterIgnite);
      ctx.ui.setDetail(ctx.content.detailIgnite, true);
      ctx.ui.setHint('第一颗 · 新星', true);
      label.setHTML('AG–05 · REBORN');
      label2.setHTML('A NEW FIRST LIGHT');
      const act = doneAction({ caption: '最后一颗星 · 变成了第一颗', next: ctx.nextDef, onNext: ctx.next });
      if (ctx.nextDef) ctx.ui.setAction(act.html, act.mount);
      else ctx.ui.setAction(`<div class="next-row"><span class="name-caption">最后一颗星 · 变成了第一颗</span></div>`);
      ctx.audio.chime(2);
      setTimeout(() => ctx.audio.chime(5), 300);
      ctx.flash(0.3, '#ffffff');
    }
  }

  function applyEndingState(instant = false) {
    if (!ending) return;
    phase = 'done';
    done = true;
    choiceLocked = true;
    ctx.state.ending = ending;
    ctx.state.emberDone = true;
    if (ending === 'fade') {
      oldGroup.visible = false;
      star.setHeat(0);
      setSky(0.2);
      newGroup.visible = false;
      emberMat.uniforms.uSettle.value = 1;
      emberMat.uniforms.uBurst.value = 0;
      // 白矮星
      wolf.visible = true;
      wolf.material.opacity = 0.9;
      wolfRing.visible = true;
      wolfRing.material.opacity = 0.4;
      if (!instant) finalize('fade');
    } else {
      oldGroup.visible = false;
      newGroup.visible = true;
      newGroup.scale.setScalar(1);
      spectrumRing.material.opacity = 0.55;
      newDust.material.opacity = 0.5;
      emberMat.uniforms.uBurst.value = 1;
      emberMat.uniforms.uSettle.value = 1;
      setSky(0.75);
      if (!instant) finalize('ignite');
    }
  }

  // 白矮星与残环
  const wolf = createGlowSprite('#d8ecff', 0.7, 0, 'flare');
  wolf.visible = false;
  system.add(wolf);
  const wolfRing = createGlowSprite('#bcd8ef', 1.4, 0, 'ring');
  wolfRing.visible = false;
  system.add(wolfRing);

  function mountChoices() {
    ctx.ui.setHint(ctx.content.hint);
    ctx.ui.clearDetail();
    ctx.ui.setAction(
      `<div class="choice-grid">
        <button class="choice is-fade" type="button" data-choice="fade">
          <span class="choice-icon"><i></i></span>
          <span><span class="choice-label">${ctx.content.choiceFade}</span><span class="choice-en">LET IT REST</span></span>
        </button>
        <button class="choice is-ignite" type="button" data-choice="ignite">
          <span class="choice-icon"><i></i></span>
          <span><span class="choice-label">${ctx.content.choiceIgnite}</span><span class="choice-en">ONE MORE LIGHT</span></span>
        </button>
      </div>`,
      (root) => {
        root.querySelectorAll('.choice').forEach((btn) => {
          btn.addEventListener('click', () => choose(btn.dataset.choice));
        });
      }
    );
  }

  function onShow() {
    label.show();
    label2.show();
    // 中途离开过：直接抵达已经选择的结局
    if (ctx.state.ending && !ending) {
      ending = ctx.state.ending;
      applyEndingState(true);
    }
    if (ending === 'fade') {
      if (!done) applyEndingState(true);
      ctx.ui.setBody(ctx.content.afterFade);
      ctx.ui.setDetail(ctx.content.detailFade, true);
      ctx.ui.setHint('长夜 · 安静', true);
      label.setHTML('WHITE DWARF · 余温未散');
      label2.hide();
      const act = doneAction({ caption: '你陪它走完了最后一程', next: ctx.nextDef, onNext: ctx.next });
      if (ctx.nextDef) ctx.ui.setAction(act.html, act.mount);
      else ctx.ui.setAction(`<div class="next-row"><span class="name-caption">你陪它走完了最后一程</span></div>`);
      return;
    }
    if (ending === 'ignite') {
      if (!done) applyEndingState(true);
      ctx.ui.setBody(ctx.content.afterIgnite);
      ctx.ui.setDetail(ctx.content.detailIgnite, true);
      ctx.ui.setHint('第一颗 · 新星', true);
      label.setHTML('AG–05 · REBORN');
      label2.setHTML('A NEW FIRST LIGHT');
      const act = doneAction({ caption: '最后一颗星 · 变成了第一颗', next: ctx.nextDef, onNext: ctx.next });
      if (ctx.nextDef) ctx.ui.setAction(act.html, act.mount);
      else ctx.ui.setAction(`<div class="next-row"><span class="name-caption">最后一颗星 · 变成了第一颗</span></div>`);
      return;
    }
    // 尚未选择，恢复等待状态
    ctx.ui.setBody(ctx.content.body);
    ctx.ui.clearDetail();
    mountChoices();
    phase = 'wait';
    ending = null;
    done = false;
    choiceLocked = false;
    t = 0;
    lastShot = -1;
    oldGroup.visible = true;
    oldGroup.scale.setScalar(1);
    newGroup.visible = false;
    newGroup.scale.setScalar(0.001);
    wolf.visible = false;
    wolfRing.visible = false;
    star.setHeat(0.78);
    star.halo1.material.opacity = 0.36;
    star.halo2.material.opacity = 0.14;
    flare.material.opacity = 0.16;
    corona.material.opacity = 0.1;
    setSky(skyBase);
    emberMat.uniforms.uBurst.value = 0;
    emberMat.uniforms.uSettle.value = 0;
    spectrumRing.material.opacity = 0;
    newDust.material.opacity = 0;
  }

  function onHide() {
    label.hide();
    label2.hide();
    ctx.audio.chargeStop(true);
    ctx.ui.setSceneCursor(null);
  }

  function applyLayout() {
    const small = isSmall();
    system.position.set(small ? 0 : 0.98, small ? 0.9 : 0.02, 0);
    system.scale.setScalar(small ? 0.78 : 1);
  }
  applyLayout();

  function update(dt) {
    time += dt;
    sky.update(dt);
    star.update(dt);
    newborn.update(dt);
    emberMat.uniforms.uTime.value = time;

    const small = isSmall();
    system.position.x = damp(system.position.x, small ? 0 : 0.98, 2, dt);
    system.position.y = damp(system.position.y, small ? 0.9 : 0.02, 2, dt);
    system.scale.setScalar(damp(system.scale.x, small ? 0.78 : 1, 2, dt));

    // 拖动轻转
    targetRotX = clamp(targetRotX + dragX * 0.0016, -0.3, 0.3);
    targetRotY = clamp(targetRotY + dragY * 0.0016, -0.4, 0.4);
    dragX *= 0.88;
    dragY *= 0.88;
    oldGroup.rotation.y = damp(oldGroup.rotation.y, targetRotY * 0.3, 2.4, dt);
    oldGroup.rotation.x = damp(oldGroup.rotation.x, targetRotX * 0.3, 2.4, dt);
    newGroup.rotation.y = damp(newGroup.rotation.y, targetRotY * 0.4, 2.4, dt);

    arc1.rotation.z += dt * 0.02;
    arc2.rotation.z -= dt * 0.013;
    arc1.material.opacity = 0.3 * (1 - clamp(t / 6, 0, 0.7));
    arc2.material.opacity = 0.16 * (1 - clamp(t / 6, 0, 0.7));

    if (phase === 'fade') {
      t += dt;
      const k = clamp(t / 5.2);
      const e = easing.inOutCubic(k);
      star.setHeat(lerp(0.78, 0.02, e));
      oldGroup.scale.setScalar(lerp(1, 0.55, easing.outCubic(clamp(k * 1.1))));
      star.halo1.material.opacity = lerp(0.36, 0, e);
      star.halo2.material.opacity = lerp(0.14, 0, e);
      flare.material.opacity = lerp(0.16, 0, e);
      corona.material.opacity = lerp(0.1, 0, e);
      emberMat.uniforms.uSettle.value = e;
      setSky(lerp(skyBase, 0.16, e));
      wolf.visible = k > 0.55;
      wolf.material.opacity = clamp((k - 0.55) / 0.3) * 0.9;
      wolf.scale.setScalar(0.25 + clamp((k - 0.55) / 0.45) * 0.35);
      wolfRing.visible = k > 0.6;
      wolfRing.material.opacity = clamp((k - 0.6) / 0.25) * 0.32;
      wolfRing.scale.setScalar(1.5 + Math.sin(time * 0.5) * 0.04);
      camera.position.z = damp(camera.position.z, 8.1, 0.6, dt);
      if (k >= 1 && !done) {
        ctx.audio.chargeStop(true);
        ctx.audio.boom(0.25);
        finalize('fade');
      }
    } else if (phase === 'ignite') {
      t += dt;
      if (t < 0.55) {
        const k = t / 0.55;
        oldGroup.scale.setScalar(lerp(1, 0.86, easing.inCubic(k)));
        star.setHeat(lerp(0.78, 1.8, k));
        flare.material.opacity = 0.16 + k * 0.4;
      } else if (t < 1.9) {
        const k = clamp((t - 0.55) / 1.35);
        const e = easing.outCubic(k);
        if (lastShot < 0) {
          lastShot = 0;
          ctx.flash(1.6, '#fff4de');
          ctx.audio.chargeStop(true);
          ctx.audio.boom(1.5);
          ctx.audio.chime(1);
        }
        oldGroup.visible = k < 0.75;
        oldGroup.scale.setScalar(lerp(0.86, 2.6, e));
        star.setHeat(lerp(1.8, 0.4, k));
        star.halo1.material.opacity = (1 - k) * 0.9;
        star.halo2.material.opacity = (1 - k) * 0.5;
        flare.material.opacity = Math.max(0, 0.6 - k * 0.6);
        corona.material.opacity = Math.max(0, 0.3 - k * 0.3);
        burstGlow.material.opacity = Math.sin(Math.min(1, k * 1.3) * Math.PI) * 1.2;
        burstGlow.scale.setScalar(1 + e * 9);
        shock.material.opacity = (1 - k) * 0.85;
        shock.scale.setScalar(0.8 + e * 7.5);
        shock2.material.opacity = (1 - clamp((t - 0.7) / 1.6)) * 0.6;
        shock2.scale.setScalar(1.0 + e * 6);
        emberMat.uniforms.uBurst.value = clamp((t - 0.55) / 1.6);
        setSky(lerp(skyBase, 0.4, k));
      } else {
        const k = clamp((t - 1.9) / 1.7);
        const e = easing.outCubic(k);
        oldGroup.visible = false;
        burstGlow.material.opacity = 0;
        newGroup.visible = true;
        newGroup.scale.setScalar(lerp(0.2, 1, easing.outBack(k)));
        newborn.setHeat(0.62 + Math.sin(time) * 0.03);
        newborn.halo1.material.opacity = e * 0.24;
        newborn.halo2.material.opacity = e * 0.09;
        spectrumRing.material.opacity = e * 0.55;
        newDust.material.opacity = e * 0.45;
        newHalo.material.opacity = e * 0.14;
        emberMat.uniforms.uBurst.value = 1;
        emberMat.uniforms.uSettle.value = clamp((t - 1.9) / 2.6);
        setSky(lerp(0.4, 0.75, e));
        camera.position.z = damp(camera.position.z, 6.85, 0.8, dt);
        shock.material.opacity = Math.max(0, shock.material.opacity - dt * 0.8);
        shock2.material.opacity = Math.max(0, shock2.material.opacity - dt * 0.8);
        if (k >= 1 && !done) {
          ctx.audio.boom(0.4);
          finalize('ignite');
        }
      }
    } else if (phase === 'done') {
      if (ending === 'fade') {
        wolf.material.opacity = 0.75 + Math.sin(time * 0.7) * 0.06;
        wolf.scale.setScalar(0.6 + Math.sin(time * 0.5) * 0.01);
        wolfRing.material.opacity = 0.3 + Math.sin(time * 0.4) * 0.025;
        wolfRing.scale.setScalar(1.5 + Math.sin(time * 0.5) * 0.03);
        setSky(0.16);
      } else {
        newGroup.rotation.y += dt * 0.06;
        spectrumRing.rotation.z += dt * 0.12;
        spectrumRing.material.opacity = 0.5 + Math.sin(time * 0.8) * 0.06;
        newDust.rotation.y += dt * 0.05;
        newborn.setHeat(0.62 + Math.sin(time * 0.9) * 0.025);
        newborn.halo1.material.opacity = 0.24;
        newborn.halo2.material.opacity = 0.09;
        newHalo.material.opacity = 0.14;
        newHalo.scale.setScalar(3.5 + Math.sin(time * 0.6) * 0.08);
        setSky(0.75);
      }
    } else {
      // 等待选择：巨星的呼吸
      star.setHeat(0.78 + Math.sin(time * 0.5) * 0.03);
      corona.scale.setScalar(3.8 + Math.sin(time * 0.3) * 0.1);
    }

    if (phase === 'wait') {
      camera.position.z = damp(camera.position.z, 7.3, 1.2, dt);
    }
    camera.position.x = damp(camera.position.x, pointer.x * 0.1, 2, dt);
    camera.position.y = damp(camera.position.y, 0.1 + pointer.y * 0.06 + (small ? 0.08 : 0), 2, dt);
    camera.lookAt(small ? 0 : 0.55, small ? 0.6 : 0, 0);

    // 标注
    if (label.visible) {
      anchor.copy(system.position).add(new THREE.Vector3(0, small ? 1.55 : 1.95, 0));
      if (done && ending === 'ignite') {
        anchor.copy(system.position).add(new THREE.Vector3(0, small ? 1.0 : 1.25, 0));
      }
      label.set(anchor, camera, 0, 0);
    }
    const l2 = system.position.clone().add(new THREE.Vector3(small ? -0.9 : -1.5, small ? -0.9 : -1.55, 0));
    label2.set(l2, camera, 0, 0);

    proj.copy(system.position).project(camera);
    starScreen.set((proj.x * 0.5 + 0.5) * window.innerWidth, (-proj.y * 0.5 + 0.5) * window.innerHeight);
    if (ctx.pointerActive && phase === 'wait') {
      const near = Math.hypot(ctx.pointerX - starScreen.x, ctx.pointerY - starScreen.y) < 190;
      if (near !== hover) {
        hover = near;
        ctx.ui.setSceneCursor(near ? '它还剩一个决定' : null);
      }
    } else if (hover) {
      hover = false;
      ctx.ui.setSceneCursor(null);
    }
  }

  function pointerMove(dx, dy, x, y) {
    pointer.x = x;
    pointer.y = y;
    dragX += dx;
    dragY += dy;
  }

  return {
    id: 'ember',
    title: '余烬',
    scene,
    camera,
    bloom: 0.88,
    exposure: 0.98,
    content: ctx.content,
    onShow,
    onHide,
    update,
    pointerMove,
    pointerDown() {},
    pointerUp() {},
    reset() {
      phase = 'wait';
      ending = null;
      done = false;
      choiceLocked = false;
      t = 0;
      lastShot = -1;
      hover = false;
      oldGroup.visible = true;
      oldGroup.scale.setScalar(1);
      newGroup.visible = false;
      newGroup.scale.setScalar(0.001);
      star.setHeat(0.78);
      star.halo1.material.opacity = 0.36;
      star.halo2.material.opacity = 0.14;
      flare.material.opacity = 0.16;
      corona.material.opacity = 0.1;
      wolf.visible = false;
      wolfRing.visible = false;
      spectrumRing.material.opacity = 0;
      newDust.material.opacity = 0;
      emberMat.uniforms.uBurst.value = 0;
      emberMat.uniforms.uSettle.value = 0;
      setSky(skyBase);
      label.setHTML('FINAL STAR · 128 亿年');
      label2.setHTML('THE EMBER · 一个决定');
    },
    get done() {
      return done;
    },
  };
}
