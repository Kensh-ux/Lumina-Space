import * as THREE from 'three';
import { createSky, createGlowSprite } from '../core/sky.js';
import { SPECTRAL } from '../core/shaders.js';
import { mountHold, doneAction } from '../core/interactions.js';
import { clamp, damp, easing, isSmall, lerp, TAU } from '../core/util.js';

const SEGMENTS = 300;

const RIBBON_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSpectrum;
uniform float uOpacity;
varying vec2 vUv;
${SPECTRAL}
void main(){
  float edge = pow(sin(vUv.y * 3.1415926), 0.55);
  float core = smoothstep(0.44, 0.0, abs(vUv.y - 0.5));
  vec3 spec = spectral(vUv.x * 0.97 + 0.015);
  vec3 warm = vec3(1.0, 0.86, 0.66);
  vec3 col = mix(warm, spec, uSpectrum);
  col = mix(col, vec3(1.0), core * 0.55);
  float shimmer = 0.78 + 0.22 * sin(vUv.x * 42.0 - uTime * 2.4 + sin(vUv.x * 9.0) * 2.0);
  float bands = 0.85 + 0.15 * sin(vUv.x * 7.0 + uTime * 0.4);
  float alpha = edge * shimmer * bands * uOpacity;
  alpha *= 0.55 + core * 0.8;
  gl_FragColor = vec4(col * (0.9 + core * 1.7 + uSpectrum * 0.35), alpha);
}
`;

export function createFirstChapter(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  camera.position.set(0, 0.2, 6.4);

  const sky = createSky({
    top: '#030407',
    bottom: '#090b0e',
    nebA: '#3a2a1a',
    nebB: '#1b2329',
    nebIntensity: 0.46,
    starCount: isSmall() ? 1900 : 4200,
    heroStars: [
      { pos: [-7.5, 2.4, -16], color: '#ffd8a4', scale: 2.6, opacity: 0.55 },
      { pos: [8.4, -2.2, -20], color: '#bcd6ff', scale: 1.7, opacity: 0.4 },
    ],
    dustColor: '#d7c4a5',
    seed: 12,
  });
  scene.add(sky.group);

  const group = new THREE.Group();
  group.position.set(1.05, 0.05, 0);
  group.rotation.set(0.04, 0.18, -0.1);
  scene.add(group);

  // —— 光带几何 ——
  const count = SEGMENTS + 1;
  const positions = new Float32Array(count * 2 * 3);
  const uvs = new Float32Array(count * 2 * 2);
  const indices = [];
  for (let i = 0; i < count; i++) {
    const u = i / SEGMENTS;
    uvs[i * 4] = u;
    uvs[i * 4 + 1] = 0;
    uvs[i * 4 + 2] = u;
    uvs[i * 4 + 3] = 1;
    if (i < SEGMENTS) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpectrum: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: RIBBON_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const ribbon = new THREE.Mesh(geo, mat);
  ribbon.frustumCulled = false;
  group.add(ribbon);

  // 光带周围的微尘
  const dustCount = isSmall() ? 260 : 620;
  const dp = new Float32Array(dustCount * 3);
  const ds = new Float32Array(dustCount);
  const dr = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    const a = Math.random() * TAU;
    const r = 0.4 + Math.pow(Math.random(), 0.6) * 3.6;
    dp[i * 3] = Math.cos(a) * r;
    dp[i * 3 + 1] = Math.sin(a) * r * 0.65;
    dp[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
    ds[i] = 0.02 + Math.random() * 0.055;
    dr[i] = Math.random() * TAU;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(ds, 1));
  dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dr, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDpr: { value: Math.min(devicePixelRatio || 1, 2) } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uDpr;
      varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.15 + aPhase) * 0.05;
        p.y += cos(uTime * 0.13 + aPhase * 1.3) * 0.05;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.5 + aPhase * 2.0));
        gl_PointSize = aSize * uDpr * (260.0 / max(-mv.z, 0.5));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.65) * 0.9, a * vA * 0.75);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  group.add(dust);

  // 光子与拖尾
  const photon = createGlowSprite('#fff6e0', 0.5, 0.95, 'soft');
  const photonCore = createGlowSprite('#ffffff', 0.16, 1.0, 'flare');
  group.add(photon, photonCore);
  const trail = [];
  for (let i = 0; i < 7; i++) {
    const s = createGlowSprite('#ffe0a8', 0.2 * (1 - i / 8), 0.32 * (1 - i / 8), 'soft');
    group.add(s);
    trail.push(s);
  }

  // 远处一圈微光，像档案室的穹顶
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(2.5, 0.0025, 6, 220, Math.PI * 1.4),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#c7a97c'),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  arc.rotation.set(0.5, 0.1, -0.4);
  arc.position.set(0, 0, -1.4);
  group.add(arc);

  // 投影标签
  const label = ctx.ui.createLabel('is-soft');
  label.setHTML('FIRST PHOTON · 138 亿年');
  const labelAnchor = new THREE.Vector3();

  let time = 0;
  let unfold = 0;
  let unfoldTarget = 0;
  let progress = 0;
  let holding = false;
  let done = false;
  let dragX = 0;
  let dragY = 0;
  let targetRotX = 0.04;
  let targetRotY = 0.18;
  let cameraZ = 6.4;
  let hoverRibbon = false;
  let hold = null;
  const tPoint = new THREE.Vector3();
  const tPrev = new THREE.Vector3();
  const tNext = new THREE.Vector3();
  const widthDir = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 0.2;

  function curvePoint(t, out, k = unfold) {
    const a = t * TAU * 1.62 + 1.15;
    const r = 0.97 - 0.34 * t;
    const cx = Math.cos(a) * r * 0.85 + Math.sin(t * 4.2) * 0.04;
    const cy = Math.sin(a) * r * 0.72 + Math.cos(t * 5.3) * 0.035;
    const cz = Math.sin(a * 1.7) * 0.12;
    const ox = (t - 0.5) * 4.9;
    const oy = Math.sin(t * Math.PI * 1.1 - 0.25) * 0.4 - 0.02;
    const oz = Math.sin(t * Math.PI * 1.85) * 0.18;
    out.set(lerp(cx, ox, k), lerp(cy, oy, k), lerp(cz, oz, k));
    return out;
  }

  function updateRibbon() {
    const k = easing.inOutCubic(unfold);
    const halfW = 0.018 + unfold * 0.052;
    for (let i = 0; i < count; i++) {
      const t = i / SEGMENTS;
      curvePoint(t, tPoint, k);
      curvePoint(Math.max(t - 0.004, 0), tPrev, k);
      curvePoint(Math.min(t + 0.004, 1), tNext, k);
      widthDir.set(-(tNext.y - tPrev.y), tNext.x - tPrev.x, 0);
      if (widthDir.lengthSq() < 1e-8) widthDir.set(0, 1, 0);
      widthDir.normalize().multiplyScalar(halfW);
      const idx = i * 6;
      positions[idx] = tPoint.x + widthDir.x;
      positions[idx + 1] = tPoint.y + widthDir.y;
      positions[idx + 2] = tPoint.z;
      positions[idx + 3] = tPoint.x - widthDir.x;
      positions[idx + 4] = tPoint.y - widthDir.y;
      positions[idx + 5] = tPoint.z;
    }
    geo.attributes.position.needsUpdate = true;
  }
  updateRibbon();

  const phase = 0.24;
  let photonT = 0;

  function setPhotonPositions() {
    photonT = (photonT + 0.0016 + unfold * 0.002) % 1;
    const k = easing.inOutCubic(unfold);
    for (let i = 0; i < trail.length; i++) {
      const tt = (photonT - i * 0.014 + 1) % 1;
      curvePoint(tt, tPoint, k);
      trail[i].position.copy(tPoint);
    }
    curvePoint(photonT, tPoint, k);
    photon.position.copy(tPoint);
    photonCore.position.copy(tPoint);
    photon.scale.setScalar(0.42 + unfold * 0.15 + Math.sin(time * 3.0) * 0.03);
    photonCore.scale.setScalar(0.14);
  }

  function applyLayout() {
    const small = isSmall();
    group.position.x = small ? 0.12 : 1.05;
    group.position.y = small ? 0.78 : 0.05;
    group.scale.setScalar(small ? 0.78 : 1);
    cameraZ = small ? 7.2 : 6.0 - unfold * 0.45;
  }
  applyLayout();

  function applyDoneUI() {
    const act = doneAction({ caption: '光谱已展开 · 拖动可见', next: ctx.nextDef, onNext: ctx.next });
    ctx.ui.setAction(act.html, act.mount);
    ctx.ui.setDetail(ctx.content.detail, true);
    ctx.ui.setHint('拖动 · 旋转光谱', true);
  }

  function onShow() {
    if (done) {
      applyDoneUI();
    } else {
      ctx.ui.setAction('', (root) => {
        hold = mountHold(root, {
          label: '按住 · 展开光谱',
          sub: 'PRESS & HOLD',
          onStart: () => {
            holding = true;
            ctx.audio.chargeStart(210);
          },
          onStop: () => {
            holding = false;
            ctx.audio.chargeStop();
          },
        });
        hold.setProgress(progress);
      });
      ctx.ui.clearDetail();
      ctx.ui.setHint(ctx.content.hint);
    }
    label.show();
    labelAnchor.copy(group.position).add(new THREE.Vector3(-0.2, isSmall() ? 1.4 : 1.85, 0));
  }

  function onHide() {
    label.hide();
    holding = false;
    hold = null;
    ctx.audio.chargeStop(true);
  }

  function markDone() {
    done = true;
    holding = false;
    progress = 1;
    hold?.disable();
    ctx.state.firstLightDone = true;
    ctx.audio.chargeStop(true);
    ctx.ui.setDetail(ctx.content.detail, true);
    ctx.ui.setHint('拖动 · 旋转光谱', true);
    ctx.flash(0.55, '#ffe6b0');
    ctx.audio.chime(2);
    setTimeout(() => ctx.audio.ping(3, 0.03, 2.4), 160);
    hold = null;
    applyDoneUI();
  }

  function update(dt) {
    time += dt;
    sky.update(dt);
    dustMat.uniforms.uTime.value = time;
    mat.uniforms.uTime.value = time;

    // 布局跟随窗口
    const small = isSmall();
    const tx = small ? 0.12 : 1.05;
    const ty = small ? 0.78 : 0.05;
    group.position.x = damp(group.position.x, tx, 3, dt);
    group.position.y = damp(group.position.y, ty, 3, dt);
    const targetScale = small ? 0.78 : 1;
    group.scale.x = group.scale.y = group.scale.z = damp(group.scale.x, targetScale, 3, dt);

    if (hold?.holding) holding = true;
    if (holding) {
      progress = Math.min(1, progress + dt / 2.1);
      hold?.setProgress(progress);
      ctx.audio.chargeSet(progress);
      if (progress >= 1 && !done) markDone();
    } else if (!done) {
      progress = Math.max(0, progress - dt * 3.0);
      hold?.setProgress(progress);
    }
    unfoldTarget = done ? 1 : progress;
    unfold = damp(unfold, unfoldTarget, 4.2, dt);
    mat.uniforms.uSpectrum.value = unfold;
    mat.uniforms.uOpacity.value = 0.9;

    updateRibbon();
    setPhotonPositions();
    dust.rotation.z += dt * 0.012;

    // 拖拽旋转
    targetRotX = clamp(targetRotX + dragX * 0.002, -0.5, 0.5);
    targetRotY = clamp(targetRotY + dragY * 0.002, -0.7, 0.8);
    dragX *= 0.85;
    dragY *= 0.85;
    group.rotation.x = damp(group.rotation.x, 0.04 + targetRotX, 4, dt);
    group.rotation.y = damp(group.rotation.y, 0.18 + targetRotY, 4, dt);
    group.rotation.z = -0.1 + Math.sin(time * 0.2) * 0.02;

    arc.rotation.z += dt * 0.006;

    // 相机
    const px = clamp((ctx.pointerX / window.innerWidth - 0.5) * 2, -1, 1);
    const py = clamp((ctx.pointerY / window.innerHeight - 0.5) * 2, -1, 1);
    const baseZ = small ? 7.2 : 6.0 - unfold * 0.4;
    camera.position.z = damp(camera.position.z, baseZ, 2.6, dt);
    camera.position.x = damp(camera.position.x, px * 0.08, 3, dt);
    camera.position.y = damp(camera.position.y, 0.2 + py * 0.05 + (small ? 0.1 : 0), 3, dt);
    const lookX = small ? 0 : 0.62 - unfold * 0.12;
    const lookY = small ? 0.55 : 0;
    camera.lookAt(lookX, lookY, 0);

    labelAnchor.copy(group.position).add(new THREE.Vector3(-0.3, small ? 1.35 : 1.8, 0));
    label.set(labelAnchor, camera, 0, 0);

    // 悬停
    if (ctx.pointerActive) {
      raycaster.setFromCamera(ctx.ndc, camera);
      const hit = raycaster.intersectObject(ribbon, false).length > 0;
      if (hit !== hoverRibbon) {
        hoverRibbon = hit;
        ctx.ui.setSceneCursor(hit ? '拖动 · 旋转' : null);
      }
    } else if (hoverRibbon) {
      hoverRibbon = false;
      ctx.ui.setSceneCursor(null);
    }
  }

  function pointerMove(dx, dy) {
    dragX += dx;
    dragY += dy;
  }

  return {
    id: 'first',
    title: '初光',
    scene,
    camera,
    bloom: 0.85,
    exposure: 1.05,
    content: ctx.content,
    onShow,
    onHide,
    update,
    pointerMove,
    pointerDown() {},
    pointerUp() {},
    reset() {
      done = false;
      progress = 0;
      unfold = 0;
      holding = false;
      hold = null;
      ctx.state.firstLightDone = false;
    },
    get done() {
      return done;
    },
  };
}
