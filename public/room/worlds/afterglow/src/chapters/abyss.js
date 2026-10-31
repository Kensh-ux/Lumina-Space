import * as THREE from 'three';
import { createSky, createGlowSprite } from '../core/sky.js';
import { mountHold, doneAction } from '../core/interactions.js';
import { clamp, damp, easing, isSmall } from '../core/util.js';

const ABYSS_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAspect;
uniform float uHold;
uniform float uWave;
uniform float uWaveT;
uniform float uReveal;
uniform float uTilt;
uniform vec2 uCenter;
varying vec2 vUv;

float hash21(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise2(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// x 方向按 per 周期环绕，消除 atan 分支切口造成的接缝
float noise2p(vec2 p, float per){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(vec2(mod(i.x, per), i.y));
  float b = hash21(vec2(mod(i.x + 1.0, per), i.y));
  float c = hash21(vec2(mod(i.x, per), i.y + 1.0));
  float d = hash21(vec2(mod(i.x + 1.0, per), i.y + 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm2(vec2 p){
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 5; i++) {
    v += a * noise2(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v;
}
float fbm2p(vec2 p, float per){
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 5; i++) {
    v += a * noise2p(p, per);
    p = p * 2.0 + vec2(16.0, 9.2);
    per *= 2.0;
    a *= 0.5;
  }
  return v;
}
float sq(float x){ return x * x; }

void main(){
  vec2 p = (vUv - uCenter) * vec2(uAspect, 1.0);
  float r = length(p);

  // 引力波掠过
  float waveR = uWaveT * 1.15;
  float wband = exp(-sq((r - waveR) * 6.5)) * uWave;

  // 吸积盘（椭圆投影）
  float ca = cos(uTilt);
  float sa = sin(uTilt);
  vec2 pr = mat2(ca, -sa, sa, ca) * p;
  float ang = atan(pr.y, pr.x + 0.0001);
  float diskR = length(vec2(pr.x, pr.y / 0.195));
  float inner = 0.235;
  float outer = 0.86;
  float band = smoothstep(inner - 0.015, inner + 0.05, diskR) * (1.0 - smoothstep(outer - 0.24, outer + 0.04, diskR));
  float flow = fbm2p(vec2(ang * 2.069 + uTime * 0.05, diskR * 4.4 - uTime * 0.16), 13.0);
  float fine = noise2p(vec2(ang * 34.056, diskR * 15.0 - uTime * 0.5), 214.0);
  float filament = smoothstep(0.22, 0.78, flow);
  float streaks = 0.22 + filament * 1.05 + fine * 0.12;
  float dop = mix(0.5, 1.55, 1.0 - smoothstep(-0.6, 0.6, pr.x));
  vec3 diskCol = mix(vec3(0.95, 0.3, 0.06), vec3(1.0, 0.68, 0.32), 1.0 - smoothstep(0.31, 0.72, diskR));
  diskCol = mix(diskCol, vec3(0.32, 0.08, 0.025), smoothstep(0.54, 0.84, diskR));
  diskCol += vec3(0.22, 0.09, 0.03) * flow;
  vec3 emission = diskCol * band * streaks * dop * (1.0 + uHold * 0.7) * 0.2;

  // 视界剪影；盘面靠近镜头的一段从前方掠过
  float shadow = 1.0 - smoothstep(0.185, 0.235, r);
  float front = 1.0 - smoothstep(-0.13, 0.02, pr.y);
  float visible = max(1.0 - shadow * 0.985, front);
  vec3 col = emission * visible;

  // 光子环
  float ring = exp(-sq((r - 0.205) * 74.0));
  float ringSoft = exp(-sq((r - 0.218) * 12.0)) * 0.1;
  col += vec3(1.0, 0.84, 0.62) * (ring * (0.46 + 0.18 * sin(ang * 2.0 + uTime * 0.5)) + ringSoft);

  // 被引力弯折到视界上方的盘面光
  float arc = exp(-sq((r - 0.25) * 18.0)) * smoothstep(-0.02, 0.28, p.y);
  col += vec3(1.0, 0.7, 0.42) * arc * (0.16 + flow * 0.26);

  // 热斑
  float hs = atan(sin(ang - uTime * 0.45), cos(ang - uTime * 0.45));
  float spot = exp(-hs * hs * 12.0) * exp(-sq((diskR - 0.31) * 16.0)) * band;
  col += vec3(1.5, 1.15, 0.8) * spot * 0.12;

  // 视界外的暗红晕
  col += vec3(0.5, 0.15, 0.05) * exp(-sq((r - 0.27) * 7.0)) * 0.1;
  // 引力波
  col += vec3(0.55, 0.72, 1.0) * wband * 0.08;

  // 找回的回声：一圈很淡的谱色
  float echo = exp(-sq((r - 0.56) * 9.5)) * uReveal * (0.55 + 0.45 * sin(ang * 3.0 - uTime * 0.35));
  vec3 echoCol = 0.5 + 0.5 * cos(vec3(0.0, 2.1, 4.2) + ang * 2.2 + uTime * 0.25);
  echoCol = mix(vec3(1.0, 0.86, 0.7), echoCol, 0.6);
  col += echoCol * echo * 0.06;

  float alpha = 1.0 - smoothstep(0.58, 0.98, r);
  alpha = max(alpha, band * 0.92);
  alpha = max(alpha, ring * 0.9);
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}`;

export function createAbyssChapter(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
  camera.position.set(0, 0, 5);

  const sky = createSky({
    top: '#010204',
    bottom: '#05070c',
    nebA: '#2a1a20',
    nebB: '#181c2a',
    nebIntensity: 0.28,
    starCount: isSmall() ? 1000 : 2200,
    heroStars: [{ pos: [-12, 7, -24], color: '#93a8c9', scale: 2.4, opacity: 0.22 }],
    dustColor: '#8d7f72',
    seed: 91,
    renderOrder: -30,
  });
  scene.add(sky.group);

  const uniforms = {
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uHold: { value: 0 },
    uWave: { value: 0 },
    uWaveT: { value: 0 },
    uReveal: { value: 0 },
    uTilt: { value: -0.28 },
    uCenter: { value: new THREE.Vector2(0.64, 0.52) },
  };
  const planeGeo = new THREE.PlaneGeometry(2, 2);
  const plane = new THREE.Mesh(
    planeGeo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: ABYSS_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  plane.position.set(0, 0, 0);
  plane.renderOrder = 2;
  plane.frustumCulled = false;
  scene.add(plane);

  // —— 视界外的近景光 ——
  const holeWorld = new THREE.Vector3();
  const centerTarget = new THREE.Vector2(0.64, 0.52);
  const tiltTarget = { value: -0.28 };

  const probe = createGlowSprite('#ffe0b0', 0.28, 0.95, 'flare');
  const probeCore = createGlowSprite('#ffffff', 0.1, 1, 'flare');
  const probeGroup = new THREE.Group();
  probeGroup.add(probe, probeCore);
  probeGroup.visible = false;
  probeGroup.renderOrder = 4;
  scene.add(probeGroup);
  const trail = [];
  for (let i = 0; i < 8; i++) {
    const s = createGlowSprite('#ffc487', 0.15 * (1 - i / 9), 0.3 * (1 - i / 9), 'soft');
    scene.add(s);
    trail.push(s);
  }

  const waveSprites = [];
  for (let i = 0; i < 3; i++) {
    const s = createGlowSprite('#b9d7ff', 1, 0, 'ring');
    s.renderOrder = 3;
    scene.add(s);
    waveSprites.push({ sprite: s, t: 99, life: 2.6 });
  }

  const echoSprite = createGlowSprite('#ffe3bd', 1, 0, 'flare');
  echoSprite.renderOrder = 4;
  scene.add(echoSprite);

  const echoRing = createGlowSprite('#ffb684', 1, 0, 'ring');
  echoRing.renderOrder = 3;
  scene.add(echoRing);

  const label = ctx.ui.createLabel('is-soft');
  label.setHTML('SAGITTARIUS A* · 4.1 × 10⁶ M☉');
  const label2 = ctx.ui.createLabel('is-soft');
  label2.setHTML('EVENT HORIZON · 0.9 AU');

  let time = 0;
  let progress = 0;
  let holding = false;
  let hold = null;
  let done = false;
  let reveal = 0;
  let echoT = 99;
  let wave = 0;
  let waveT = 99;
  let probeAngle = 0;
  let hoverHole = false;
  let dragging = false;
  let dragDist = 0;
  let downPos = { x: 0, y: 0 };
  let pointer = { x: 0, y: 0 };
  let planeH = 4;
  let planeW = 7;
  const anchor = new THREE.Vector3();
  const proj = new THREE.Vector3();
  const moonScreen = new THREE.Vector2();

  function fitPlane() {
    const dist = camera.position.z - plane.position.z;
    planeH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist * 1.015;
    planeW = planeH * camera.aspect;
    plane.scale.set(planeW / 2, planeH / 2, 1);
    uniforms.uAspect.value = camera.aspect;
    const small = isSmall();
    centerTarget.set(small ? 0.5 : 0.645, small ? 0.655 : 0.525);
    holeWorld.set((uniforms.uCenter.value.x - 0.5) * planeW, (uniforms.uCenter.value.y - 0.5) * planeH, 0.5);
  }
  fitPlane();

  function screenOf(v3) {
    proj.copy(v3).project(camera);
    return moonScreen.set((proj.x * 0.5 + 0.5) * window.innerWidth, (-proj.y * 0.5 + 0.5) * window.innerHeight);
  }

  function spawnWave() {
    wave = 1;
    waveT = 0;
    const slot = waveSprites.reduce((a, b) => (a.t > b.t ? b : a));
    slot.t = 0;
    slot.life = 2.6;
    slot.sprite.position.copy(holeWorld);
    slot.sprite.position.z = 0.6;
    slot.sprite.scale.setScalar(0.6);
    ctx.audio.whoosh();
    ctx.audio.ping(1.5, 0.02, 2.4);
    ctx.flash(0.08, '#bcd8ff');
  }

  function finishObserve() {
    done = true;
    holding = false;
    ctx.state.abyssDone = true;
    ctx.flash(1.0, '#ffd7ae');
    ctx.audio.chargeStop(true);
    ctx.audio.boom(0.9);
    setTimeout(() => ctx.audio.chime(1), 260);
    echoT = 0;
    ctx.ui.setDetail(ctx.content.detail, true);
    ctx.ui.setHint('视界之外 · 光正在回来', true);
    label.setHTML('ECHO · 光正在回来');
    label2.setHTML('RETURNED LIGHT · 138 亿年 + 1 天');
    const act = doneAction({ caption: '回声已归档 · 事件视界 0.9 AU', next: ctx.nextDef, onNext: ctx.next });
    if (ctx.nextDef) ctx.ui.setAction(act.html, act.mount);
    else ctx.ui.setAction(`<div class="next-row"><span class="name-caption">回声已归档 · 事件视界 0.9 AU</span></div>`);
    if (hold) hold.disable();
    wave = 1;
    waveT = 0;
  }

  function mountHoldUI() {
    ctx.ui.setHint(ctx.content.hint);
    ctx.ui.clearDetail();
    ctx.ui.setAction(`<div class="action-slot" id="abyssHoldSlot"></div>`, (root) => {
      hold = mountHold(root.querySelector('#abyssHoldSlot'), {
        label: '按住 · 观测视界',
        sub: 'PRESS &amp; HOLD · 3.2s',
        onStart: () => {
          if (done) return;
          holding = true;
          ctx.audio.chargeStart(85);
        },
        onStop: () => {
          holding = false;
          ctx.audio.chargeStop();
        },
      });
    });
  }

  function onShow() {
    label.show();
    label2.show();
    fitPlane();
    if (done) {
      ctx.ui.setBody(ctx.content.body);
      ctx.ui.setDetail(ctx.content.detail, true);
      ctx.ui.setHint('视界之外 · 光正在回来', true);
      label.setHTML('ECHO · 光正在回来');
      label2.setHTML('RETURNED LIGHT · 138 亿年 + 1 天');
      const act = doneAction({ caption: '回声已归档 · 事件视界 0.9 AU', next: ctx.nextDef, onNext: ctx.next });
      if (ctx.nextDef) ctx.ui.setAction(act.html, act.mount);
      else ctx.ui.setAction(`<div class="next-row"><span class="name-caption">回声已归档 · 事件视界 0.9 AU</span></div>`);
    } else {
      ctx.ui.setBody(ctx.content.body);
      ctx.ui.clearDetail();
      label.setHTML('SAGITTARIUS A* · 4.1 × 10⁶ M☉');
      label2.setHTML('EVENT HORIZON · 0.9 AU');
      mountHoldUI();
    }
    progress = 0;
    if (hold) hold.reset();
    holding = false;
    reveal = done ? 1 : 0;
  }

  function onHide() {
    label.hide();
    label2.hide();
    holding = false;
    if (hold) hold.reset();
    ctx.audio.chargeStop(true);
    probeGroup.visible = false;
    trail.forEach((s) => (s.visible = false));
    ctx.ui.setSceneCursor(null);
  }

  function update(dt) {
    time += dt;
    sky.update(dt);
    uniforms.uTime.value = time;
    fitPlane();

    // 中心与倾斜带阻尼
    uniforms.uCenter.value.x = damp(uniforms.uCenter.value.x, centerTarget.x, 3, dt);
    uniforms.uCenter.value.y = damp(uniforms.uCenter.value.y, centerTarget.y, 3, dt);
    uniforms.uTilt.value = damp(uniforms.uTilt.value, tiltTarget.value, 3, dt);
    holeWorld.set(
      (uniforms.uCenter.value.x - 0.5) * planeW,
      (uniforms.uCenter.value.y - 0.5) * planeH,
      0
    );

    if (holding && !done) {
      progress = Math.min(1, progress + dt / 3.2);
      if (hold) hold.setProgress(progress);
      ctx.audio.chargeSet(progress);
      if (progress >= 1) finishObserve();
    } else if (!done) {
      progress = Math.max(0, progress - dt * 1.8);
      if (hold) hold.setProgress(progress);
    }
    const holdTarget = done ? 1 : progress;
    uniforms.uHold.value = damp(uniforms.uHold.value, holdTarget, 4, dt);
    if (done) reveal = damp(reveal, 1, 1.4, dt);
    uniforms.uReveal.value = reveal;

    // 探针
    const showProbe = (holding || progress > 0.02) && !done;
    probeGroup.visible = showProbe;
    if (showProbe) {
      probeAngle += dt * (0.45 + progress * 7.5);
      const rr = 1.05 + (1 - progress) * 1.35;
      const x = Math.cos(probeAngle) * rr;
      const y = Math.sin(probeAngle) * rr * 0.42;
      probeGroup.position.set(holeWorld.x + x, holeWorld.y + y + 0.1, 0.75);
      probeCore.position.copy(probe.position);
      probe.scale.setScalar(0.22 + progress * 0.1 + Math.sin(time * 5) * 0.02);
      for (let i = 0; i < trail.length; i++) {
        const a = probeAngle - (i + 1) * 0.13;
        const tr = rr + (i + 1) * 0.05;
        trail[i].visible = true;
        trail[i].position.set(holeWorld.x + Math.cos(a) * tr, holeWorld.y + Math.sin(a) * tr * 0.42 + 0.1, 0.7);
        trail[i].material.opacity = 0.36 * (1 - i / trail.length) * (0.5 + progress * 0.5);
      }
    } else if (!done) {
      trail.forEach((s) => (s.visible = false));
    }

    // 引力波
    if (waveT < 99) {
      waveT += dt * 0.9;
      wave = Math.max(0, 1 - waveT / 2.4);
      uniforms.uWave.value = wave;
      uniforms.uWaveT.value = waveT;
      for (const w of waveSprites) {
        if (w.t > w.life) {
          w.sprite.material.opacity = 0;
          continue;
        }
        w.t += dt;
        const k = clamp(w.t / w.life);
        const e = easing.outCubic(k);
        w.sprite.position.set(holeWorld.x, holeWorld.y, 0.6);
        w.sprite.scale.setScalar(0.5 + e * 4.4);
        w.sprite.material.opacity = (1 - k) * 0.4;
      }
    } else {
      uniforms.uWave.value = 0;
    }

    // 回声：一束光从视界里慢慢回来
    if (echoT < 3.6) {
      echoT += dt;
      const k = clamp(echoT / 2.6);
      const e = easing.outCubic(k);
      const ang = 2.3;
      const rr = 0.7 + e * 2.6;
      echoSprite.position.set(holeWorld.x + Math.cos(ang) * rr, holeWorld.y + Math.sin(ang) * rr * 0.5, 0.8);
      echoSprite.scale.setScalar(0.3 + Math.sin(k * Math.PI) * 0.8);
      echoSprite.material.opacity = Math.sin(k * Math.PI) * 0.85;
      echoRing.position.set(holeWorld.x, holeWorld.y, 0.6);
      echoRing.scale.setScalar(0.5 + e * 3.0);
      echoRing.material.opacity = (1 - k) * 0.45;
      if (k >= 1) {
        echoSprite.material.opacity = 0;
        echoRing.material.opacity = 0;
      }
    }
    // 相机与标注
    camera.position.x = damp(camera.position.x, pointer.x * 0.04, 2, dt);
    camera.position.y = damp(camera.position.y, pointer.y * 0.025, 2, dt);
    camera.lookAt(0, 0, 0);
    const small = isSmall();
    if (small) {
      // 小屏：把标注移出明亮的吸积盘，压在暗处
      label.set(holeWorld, camera, -window.innerWidth * 0.19, -window.innerHeight * 0.27);
      label2.set(holeWorld, camera, -window.innerWidth * 0.38, window.innerHeight * 0.245);
    } else {
      anchor.copy(holeWorld).add(new THREE.Vector3(0.8, 0.95, 0.4));
      label.set(anchor, camera, 0, 0);
      const anchor2 = holeWorld.clone().add(new THREE.Vector3(-1.1, -0.55, 0.4));
      label2.set(anchor2, camera, 0, 0);
    }

    // 悬停
    if (ctx.pointerActive) {
      const s = screenOf(holeWorld);
      const near = Math.hypot(ctx.pointerX - s.x, ctx.pointerY - s.y) < Math.min(window.innerHeight * 0.3, 240);
      if (near !== hoverHole) {
        hoverHole = near;
        ctx.ui.setSceneCursor(near ? '点击 · 引力波' : null);
      }
    } else if (hoverHole) {
      hoverHole = false;
      ctx.ui.setSceneCursor(null);
    }

  }

  function pointerDown(p) {
    downPos = { x: p.x, y: p.y };
    dragDist = 0;
    dragging = true;
  }

  function pointerMove(dx, dy, x, y) {
    pointer.x = x;
    pointer.y = y;
    if (!ctx.dragging) return;
    dragDist += Math.abs(dx) + Math.abs(dy);
    tiltTarget.value = clamp(tiltTarget.value + dx * 0.0035, -0.75, 0.35);
    centerTarget.x = clamp(centerTarget.x - dx * 0.00012, 0.57, 0.71);
    centerTarget.y = clamp(centerTarget.y + dy * 0.00012, 0.44, 0.6);
  }

  function pointerUp(p) {
    dragging = false;
    if (dragDist < 9 && !done) {
      spawnWave();
    }
    dragDist = 0;
    ctx.ui.setSceneCursor(null);
  }

  return {
    id: 'abyss',
    title: '深渊',
    scene,
    camera,
    bloom: 0.32,
    bloomRadius: 0.24,
    bloomThreshold: 0.46,
    exposure: 0.94,
    content: ctx.content,
    onShow,
    onHide,
    update,
    pointerMove,
    pointerDown,
    pointerUp,
    reset() {
      progress = 0;
      done = false;
      reveal = 0;
      echoT = 99;
      wave = 0;
      waveT = 0;
      holding = false;
      uniforms.uReveal.value = 0;
      uniforms.uCenter.value.set(0.64, 0.52);
      centerTarget.set(0.64, 0.52);
      tiltTarget.value = -0.28;
      uniforms.uTilt.value = -0.28;
      label.setHTML('SAGITTARIUS A* · 4.1 × 10⁶ M☉');
      label2.setHTML('EVENT HORIZON · 0.9 AU');
      probeGroup.visible = false;
      trail.forEach((s) => (s.visible = false));
      if (hold) {
        hold.reset();
        hold = null;
      }
      waveSprites.forEach((w) => {
        w.t = 99;
        w.sprite.material.opacity = 0;
      });
    },
    get done() {
      return done;
    },
  };
}
