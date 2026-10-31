import * as THREE from 'three';
import { createSky, createGlowSprite, createOrbitDust } from '../core/sky.js';
import { createStar } from '../core/objects.js';
import { mountHold, doneAction } from '../core/interactions.js';
import { clamp, damp, easing, escapeHtml, isSmall, lerp, mulberry32, TAU } from '../core/util.js';

const DUST_VERT = /* glsl */ `
attribute float aRadius;
attribute float aAngle;
attribute float aY;
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uGather;
uniform float uFade;
uniform float uDpr;
varying vec3 vColor;
varying float vAlpha;
void main(){
  float g = clamp(uGather, 0.0, 1.0);
  float gg = pow(g, 1.45);
  float ang = aAngle + uTime * 0.035 + gg * 3.1;
  float r = mix(aRadius, 0.1 + aSeed * 0.2, gg);
  float wobble = sin(ang * 3.0 + uTime * 0.55 + aSeed * 7.0) * 0.05 * (1.0 - gg);
  vec3 p = vec3(
    cos(ang) * (r + wobble),
    aY * (1.0 - gg * 0.84) + sin(uTime * 0.32 + aSeed * 8.0) * 0.05 * (1.0 - gg),
    sin(ang) * (r + wobble) * 0.62
  );
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vColor = aColor;
  float flicker = 0.72 + 0.28 * sin(uTime * (0.45 + aSeed * 1.3) + aSeed * 19.0);
  vAlpha = uFade * flicker * (0.3 + 0.7 * aSeed) * (1.0 - smoothstep(0.7, 1.0, g) * 0.9);
  gl_PointSize = aSize * uDpr * (300.0 / max(-mv.z, 0.6)) * (1.0 - gg * 0.2);
  gl_Position = projectionMatrix * mv;
}`;

const DUST_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.02, d);
  a = pow(a, 1.8);
  gl_FragColor = vec4(vColor, a * vAlpha);
}`;

export function createStardustChapter(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  camera.position.set(0, 0.15, 6.3);

  const sky = createSky({
    top: '#020608',
    bottom: '#061014',
    nebA: '#0d3038',
    nebB: '#332a1d',
    nebIntensity: 0.52,
    starCount: isSmall() ? 1600 : 3600,
    heroStars: [
      { pos: [-8.2, 3.5, -19], color: '#bdeee6', scale: 2.2, opacity: 0.35 },
      { pos: [9.0, -3.4, -22], color: '#ffd7a1', scale: 1.5, opacity: 0.3 },
    ],
    dustColor: '#9fc9c2',
    seed: 33,
  });
  scene.add(sky.group);

  const group = new THREE.Group();
  scene.add(group);

  // 背景星云的大团柔光
  const blooms = [];
  const bloomSpecs = [
    { color: '#1d6a66', scale: [7.5, 4.6], pos: [-1.3, 0.7, -4.5], opacity: 0.1 },
    { color: '#7a5a2c', scale: [5.5, 3.8], pos: [1.7, -0.9, -5], opacity: 0.085 },
    { color: '#274b5e', scale: [9, 5.5], pos: [0.8, 1.4, -6], opacity: 0.08 },
  ];
  for (const b of bloomSpecs) {
    const s = createGlowSprite(b.color, 1, b.opacity, 'soft');
    s.scale.set(b.scale[0], b.scale[1], 1);
    s.position.set(...b.pos);
    group.add(s);
    blooms.push(s);
  }

  // —— 星尘粒子 ——
  const count = isSmall() ? 2900 : 6400;
  const rng = mulberry32(506);
  const pos = new Float32Array(count * 3);
  const aRadius = new Float32Array(count);
  const aAngle = new Float32Array(count);
  const aY = new Float32Array(count);
  const aSize = new Float32Array(count);
  const aSeed = new Float32Array(count);
  const aColor = new Float32Array(count * 3);
  const palette = [
    new THREE.Color('#9fe0cf'),
    new THREE.Color('#f0c78e'),
    new THREE.Color('#d9ecff'),
    new THREE.Color('#57918c'),
    new THREE.Color('#ffffff'),
  ];
  for (let i = 0; i < count; i++) {
    const rr = 0.65 + Math.pow(rng(), 0.65) * 2.75;
    const arm = Math.floor(rng() * 3);
    const angle = rr * 1.35 + arm * (TAU / 3) + (rng() - 0.5) * 0.85;
    const y = (rng() - 0.5) * (0.65 + rr * 0.12);
    aRadius[i] = rr;
    aAngle[i] = angle;
    aY[i] = y;
    aSeed[i] = rng();
    aSize[i] = 0.012 + Math.pow(rng(), 2.2) * 0.075;
    const c = palette[Math.floor(Math.pow(rng(), 1.5) * palette.length)];
    const b = 0.35 + rng() * 0.65;
    aColor[i * 3] = c.r * b;
    aColor[i * 3 + 1] = c.g * b;
    aColor[i * 3 + 2] = c.b * b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRadius', new THREE.BufferAttribute(aRadius, 1));
  geo.setAttribute('aAngle', new THREE.BufferAttribute(aAngle, 1));
  geo.setAttribute('aY', new THREE.BufferAttribute(aY, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);
  const dustMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGather: { value: 0 },
      uFade: { value: 1 },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(geo, dustMat);
  dust.frustumCulled = false;
  group.add(dust);

  // —— 新生星 ——
  const starGroup = new THREE.Group();
  group.add(starGroup);
  const star = createStar({
    radius: 0.42,
    colorA: '#0a2b46',
    colorB: '#6bd9f2',
    colorC: '#ffffff',
    glowColor: '#a9ecff',
    seed: 8.2,
    heat: 0.1,
    scaleNoise: 3.8,
    glowScale: 0.9,
    detail: 96,
  });
  starGroup.add(star.group);
  starGroup.scale.setScalar(0.001);
  star.halo1.material.opacity = 0;
  star.halo2.material.opacity = 0;

  const core = createGlowSprite('#d8f8ff', 0.16, 0, 'flare');
  core.position.copy(starGroup.position);
  group.add(core);

  const corona = createGlowSprite('#bfefff', 2.4, 0, 'flare');
  group.add(corona);

  // 冲击波
  const shockA = createGlowSprite('#d9fbff', 1, 0, 'ring');
  const shockB = createGlowSprite('#ffe3b2', 1, 0, 'ring');
  group.add(shockA, shockB);

  // 点燃后的轨道
  const orbit = createOrbitDust({ count: isSmall() ? 130 : 260, radius: 1.25, spread: 0.55, color: '#9fe0cf', size: 0.025, seed: 21 });
  orbit.rotation.x = 1.05;
  orbit.material.opacity = 0;
  group.add(orbit);

  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.0032, 6, 220),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#9fe0cf'),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  torus.rotation.x = 1.05;
  torus.rotation.z = -0.15;
  group.add(torus);

  const label = ctx.ui.createLabel('is-soft');
  label.setHTML('NEBULA · 待坍缩');

  let time = 0;
  let phase = 'idle'; // idle | gather | burst | naming | done
  let progress = 0;
  let gather = 0;
  let ignite = 0;
  let fade = 1;
  let starName = '';
  let shake = 0;
  let pulse = 0;
  let pointerNear = false;
  let done = false;
  let dragX = 0;
  let dragY = 0;
  let targetRotY = 0;
  let targetRotX = 0;
  const pointer = { x: 0, y: 0 };
  let hold = null;
  const starScreen = new THREE.Vector2();
  const anchor = new THREE.Vector3();
  const proj = new THREE.Vector3();

  function applyName(name) {
    starName = name;
    done = true;
    phase = 'done';
    ctx.state.starName = name;
    ctx.state.stardustDone = true;
    ctx.ui.setBody(
      ctx.content.afterName.replace('{name}', `<span class="name-inline">${escapeHtml(name)}</span>`)
    );
    ctx.ui.setDetail(ctx.content.detail, true);
    ctx.ui.setHint('拖动 · 看看它的背面', true);
    label.el.classList.remove('is-soft');
    label.setHTML(`<span class="lbl-name">${escapeHtml(name)}</span>`);
    const act = doneAction({
      caption: '编号 AG–05 · 已登记',
      next: ctx.nextDef,
      onNext: ctx.next,
    });
    if (!ctx.nextDef) {
      ctx.ui.setAction(`<div class="next-row"><span class="name-caption">编号 AG–05 · 已登记</span></div>`);
    } else {
      ctx.ui.setAction(act.html, act.mount);
    }
    pulse = 1.0;
    ctx.audio.chime(3);
    setTimeout(() => ctx.audio.ping(4, 0.025, 2.4), 180);
    ctx.flash(0.35, '#cfeeff');
  }

  function openNaming() {
    phase = 'naming';
    label.show();
    label.el.classList.add('is-soft');
    label.setHTML('UNNAMED STAR · 尚未命名');
    ctx.ui.setHint('为它命名');
    ctx.ui.clearDetail();
    ctx.ui.setAction(
      `<form class="name-form" autocomplete="off">
        <span class="name-label">NAME THE NEW STAR · 给它一个名字</span>
        <div class="name-row">
          <input class="name-input" type="text" maxlength="12" placeholder="例如：小满" aria-label="为这颗星命名" />
          <button class="name-submit" type="submit">登记</button>
        </div>
        <button type="button" class="name-skip">不命名，让它保持无名</button>
      </form>`,
      (root) => {
        const form = root.querySelector('.name-form');
        const input = root.querySelector('.name-input');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const raw = input.value.trim().replace(/\s+/g, ' ').slice(0, 12);
          applyName(raw || '未名');
        });
        root.querySelector('.name-skip').addEventListener('click', () => applyName('未名'));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') e.stopPropagation();
        });
      }
    );
  }

  function startGather() {
    if (phase !== 'idle' || done) return;
    phase = 'gather';
    ctx.audio.chargeStart(120);
  }
  function stopGather() {
    if (phase !== 'gather') return;
    phase = 'idle';
    ctx.audio.chargeStop();
  }

  function igniteStar() {
    phase = 'burst';
    ignite = 0;
    starGroup.visible = true;
    ctx.audio.chargeStop(true);
    ctx.audio.boom(0.85);
    ctx.audio.chime(2);
    ctx.flash(1.35, '#d6f7ff');
    shake = 1;
    star.setHeat(0.35);
    label.show();
    label.setHTML('IGNITION · 点燃');
    ctx.ui.setHint('');
    ctx.ui.clearAction();
    ctx.ui.clearDetail();
  }

  function mountIdleUI() {
    ctx.ui.setHint(ctx.content.hint);
    ctx.ui.clearDetail();
    ctx.ui.setAction(`<div class="action-slot" id="holdSlot"></div>`, (root) => {
      hold = mountHold(root.querySelector('#holdSlot'), {
        label: '按住 · 收拢星尘',
        sub: 'PRESS &amp; HOLD · 2.8s',
        onStart: startGather,
        onStop: stopGather,
      });
    });
  }

  function applyLayout() {
    const small = isSmall();
    group.position.set(small ? 0.02 : 0.92, small ? 0.92 : 0.05, 0);
    group.scale.setScalar(small ? 0.85 : 1);
  }
  applyLayout();

  function onShow() {
    applyLayout();
    starGroup.visible = phase === 'burst' || phase === 'naming' || phase === 'done';
    if (done) {
      ctx.ui.setBody(
        ctx.content.afterName.replace('{name}', `<span class="name-inline">${escapeHtml(starName)}</span>`)
      );
      ctx.ui.setDetail(ctx.content.detail, true);
      ctx.ui.setHint('拖动 · 看看它的背面', true);
      label.show();
      label.el.classList.remove('is-soft');
      label.setHTML(`<span class="lbl-name">${escapeHtml(starName)}</span>`);
      const act = doneAction({ caption: '编号 AG–05 · 已登记', next: ctx.nextDef, onNext: ctx.next });
      if (ctx.nextDef) ctx.ui.setAction(act.html, act.mount);
      else ctx.ui.setAction(`<div class="next-row"><span class="name-caption">编号 AG–05 · 已登记</span></div>`);
    } else if (phase === 'naming') {
      openNaming();
    } else if (phase === 'burst') {
      ctx.ui.clearAction();
      ctx.ui.clearDetail();
      label.show();
    } else {
      label.hide();
      applyLayout();
      mountIdleUI();
    }
  }

  function onHide() {
    label.hide();
    if (hold) hold.reset();
    if (phase === 'gather') stopGather();
    ctx.audio.chargeStop(true);
  }

  function update(dt) {
    time += dt;
    sky.update(dt);
    dustMat.uniforms.uTime.value = time;
    star.update(dt);
    blooms.forEach((b, i) => {
      b.material.opacity = (0.075 + 0.02 * Math.sin(time * 0.25 + i * 2.1)) * (1 - clamp(ignite / 2, 0, 0.45));
    });

    const small = isSmall();
    const tx = small ? 0.02 : 0.92;
    const ty = small ? 0.92 : 0.05;
    group.position.x = damp(group.position.x, tx, 2.5, dt);
    group.position.y = damp(group.position.y, ty, 2.5, dt);

    if (phase === 'gather' && hold?.holding) {
      progress = Math.min(1, progress + dt / 2.8);
      hold.setProgress(progress);
      ctx.audio.chargeSet(progress);
      if (progress >= 1) igniteStar();
    } else if (phase === 'idle') {
      progress = Math.max(0, progress - dt * 2.2);
      if (hold) hold.setProgress(progress);
    }
    const targetGather = phase === 'idle' ? progress : 1;
    gather = damp(gather, targetGather, 3.2, dt);
    dustMat.uniforms.uGather.value = gather;

    // 点燃动画
    if (phase === 'burst') {
      ignite += dt;
      const k = clamp(ignite / 1.15);
      const e = easing.outCubic(k);
      starGroup.scale.setScalar(lerp(0.05, 1, easing.outBack ? easing.outBack(k) : e));
      star.setHeat(lerp(0.2, 1.25, e));
      star.halo1.material.opacity = e * 0.5;
      star.halo2.material.opacity = e * 0.2;
      core.material.opacity = (1 - k) * 0.7 + 0.14;
      core.scale.setScalar(0.13 + e * 0.09);
      corona.material.opacity = e * 0.18;
      corona.scale.setScalar(1.9 + e * 0.9);
      const sk = clamp(ignite / 1.5);
      shockA.scale.setScalar(0.4 + sk * 4.8);
      shockA.material.opacity = (1 - sk) * 0.85;
      shockB.scale.setScalar(0.3 + clamp((ignite - 0.16) / 1.5) * 3.8);
      shockB.material.opacity = (1 - sk) * 0.5;
      dustMat.uniforms.uFade.value = clamp(1 - ignite / 1.4, 0, 1);
      shake = Math.max(0, shake - dt * 1.6);
      if (k >= 1) openNaming();
    } else if (phase === 'naming' || phase === 'done') {
      const t = ignite + dt;
      ignite = Math.min(ignite + dt, 6);
      starGroup.scale.setScalar(1 + Math.sin(time * 0.9) * 0.012 + pulse * 0.04);
      star.setHeat(0.74 + Math.sin(time * 0.7) * 0.035 + Math.min(pulse, 1) * 0.2);
      star.halo1.material.opacity = damp(star.halo1.material.opacity, 0.3, 2.2, dt);
      star.halo2.material.opacity = damp(star.halo2.material.opacity, 0.1, 2.2, dt);
      core.material.opacity = 0.14 + Math.min(pulse, 1) * 0.26;
      core.scale.setScalar(0.17 + Math.min(pulse, 1) * 0.08);
      corona.material.opacity = damp(corona.material.opacity, 0.075, 2, dt);
      corona.scale.setScalar(damp(corona.scale.x, 2.15, 2, dt));
      shockA.material.opacity = Math.max(0, shockA.material.opacity - dt * 1.6);
      shockB.material.opacity = Math.max(0, shockB.material.opacity - dt * 1.6);
      dustMat.uniforms.uFade.value = Math.max(0, dustMat.uniforms.uFade.value - dt * 0.8);
      orbit.material.opacity = damp(orbit.material.opacity, 0.5, 1.5, dt);
      torus.material.opacity = damp(torus.material.opacity, 0.22, 1.5, dt);
      orbit.rotation.y += dt * 0.06;
    }

    pulse = Math.max(0, pulse - dt * 1.3);
    starGroup.rotation.y += dt * 0.06;
    starGroup.rotation.x = damp(starGroup.rotation.x, targetRotX * 0.4, 3, dt);

    // 星云随拖动轻转
    targetRotX = clamp(targetRotX + dragX * 0.0018, -0.38, 0.38);
    targetRotY = clamp(targetRotY + dragY * 0.0018, -0.5, 0.5);
    dragX *= 0.88;
    dragY *= 0.88;
    group.rotation.z = -0.08 + Math.sin(time * 0.13) * 0.02;
    dust.rotation.y = damp(dust.rotation.y, targetRotY * 0.7, 2, dt);
    dust.rotation.x = damp(dust.rotation.x, targetRotX * 0.6, 2, dt);

    // 轻微的手持感
    const shakeX = shake > 0 ? Math.sin(time * 61) * shake * 0.035 : 0;
    const shakeY = shake > 0 ? Math.cos(time * 53) * shake * 0.028 : 0;
    camera.position.x = damp(camera.position.x, pointer.x * 0.1 + shakeX, 2.5, dt);
    camera.position.y = damp(camera.position.y, 0.15 + pointer.y * 0.06 + shakeY + (small ? 0.1 : 0), 2.5, dt);
    camera.position.z = damp(camera.position.z, (small ? 6.8 : 6.15) + (done ? -0.15 : 0), 1.8, dt);
    camera.lookAt(small ? 0 : 0.58, small ? 0.62 : 0.02, 0);

    // 标签 / 屏幕位置
    if (label.visible) {
      anchor.copy(group.position).add(new THREE.Vector3(0, small ? 1.62 : 1.72, 0));
      label.set(anchor, camera, 0, 0);
    }
    group.updateMatrixWorld(true);
    proj.copy(starGroup.position).applyMatrix4(group.matrixWorld).project(camera);
    starScreen.set((proj.x * 0.5 + 0.5) * window.innerWidth, (-proj.y * 0.5 + 0.5) * window.innerHeight);

    if (ctx.pointerActive && (phase === 'naming' || phase === 'done')) {
      const dx = ctx.pointerX - starScreen.x;
      const dy = ctx.pointerY - starScreen.y;
      const near = Math.hypot(dx, dy) < 90;
      if (near !== pointerNear) {
        pointerNear = near;
        ctx.ui.setSceneCursor(near ? '这就是你的星' : null);
      }
      const follow = near ? 0.7 : 0.25;
      group.rotation.y = damp(group.rotation.y, (ctx.pointerX / window.innerWidth - 0.5) * follow * 0.2, 2, dt);
    } else if (pointerNear) {
      pointerNear = false;
      ctx.ui.setSceneCursor(null);
    }

    torus.rotation.z += dt * 0.035;
  }

  function pointerMove(dx, dy, x, y) {
    pointer.x = x;
    pointer.y = y;
    dragX += dx;
    dragY += dy;
  }

  return {
    id: 'stardust',
    title: '星尘',
    scene,
    camera,
    bloom: 0.95,
    exposure: 1.08,
    content: ctx.content,
    onShow,
    onHide,
    update,
    pointerMove,
    pointerDown() {},
    pointerUp() {},
    reset() {
      phase = 'idle';
      progress = 0;
      gather = 0;
      ignite = 0;
      done = false;
      starName = '';
      pulse = 0;
      shake = 0;
      fade = 1;
      starGroup.visible = false;
      starGroup.scale.setScalar(0.001);
      star.halo1.material.opacity = 0;
      star.halo2.material.opacity = 0;
      core.material.opacity = 0;
      corona.material.opacity = 0;
      orbit.material.opacity = 0;
      torus.material.opacity = 0;
      dustMat.uniforms.uFade.value = 1;
      dustMat.uniforms.uGather.value = 0;
      label.hide();
      label.el.classList.add('is-soft');
      label.setHTML('NEBULA · 待坍缩');
      if (hold) {
        hold.reset();
        hold = null;
      }
    },
    get done() {
      return done;
    },
  };
}
