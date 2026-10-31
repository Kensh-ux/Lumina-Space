import * as THREE from 'three';
import { createSky, createGlowSprite, createOrbitDust } from '../core/sky.js';
import { createOceanPlanet } from '../core/objects.js';
import { NOISE } from '../core/shaders.js';
import { doneAction } from '../core/interactions.js';
import { clamp, damp, invLerp, isSmall, TAU } from '../core/util.js';

const MOON_VERT = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main(){
  vObj = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const MOON_FRAG = /* glsl */ `
uniform vec3 uLightDir;
uniform float uTide;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vWorldPos;
${NOISE}
void main(){
  vec3 p = normalize(vObj);
  float n = fbm3(p * 2.6 + vec3(4.1, 1.7, 8.3));
  float fine = fbm3low(p * 6.5 + vec3(1.0));
  float maria = smoothstep(0.56, 0.72, fbm3low(p * 1.7 + 2.2));
  vec3 base = mix(vec3(0.24, 0.255, 0.27), vec3(0.62, 0.6, 0.56), n * 0.75 + fine * 0.25);
  base = mix(base, vec3(0.16, 0.17, 0.19), maria * 0.55);
  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndl = dot(N, L);
  float day = smoothstep(-0.12, 0.45, ndl);
  vec3 col = base * (0.045 + day * 1.06);
  // 来自海洋行星的幽蓝反照
  float rim = pow(1.0 - abs(dot(N, V)), 2.2);
  col += vec3(0.09, 0.26, 0.3) * rim * (1.0 - day) * (0.7 + uTide * 0.8);
  // 晨昏线暖边
  col += vec3(1.0, 0.48, 0.2) * rim * smoothstep(0.05, 0.75, ndl) * 0.3;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createTidesChapter(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140);
  camera.position.set(0, 0.15, 6.7);

  const sky = createSky({
    top: '#020509',
    bottom: '#07121c',
    nebA: '#12303e',
    nebB: '#2a2418',
    nebIntensity: 0.55,
    starCount: isSmall() ? 1700 : 3900,
    heroStars: [
      { pos: [-8.6, 4.0, -18], color: '#ffd7a3', scale: 3.2, opacity: 0.3 },
      { pos: [7.6, -4.5, -22], color: '#9fc9e6', scale: 1.6, opacity: 0.28 },
    ],
    dustColor: '#a8c6c9',
    seed: 71,
  });
  scene.add(sky.group);

  const lightDir = new THREE.Vector3(-0.55, 0.42, 0.72).normalize();

  const system = new THREE.Group();
  scene.add(system);

  // —— 行星 ——
  const planetRoot = new THREE.Group();
  planetRoot.rotation.set(0.14, 0, -0.12);
  system.add(planetRoot);

  const planet = createOceanPlanet({
    radius: 1.13,
    detail: isSmall() ? 96 : 144,
    seed: 6.4,
    rings: true,
    lightDir,
    colors: {
      deep: '#02131d',
      shallow: '#0b4351',
      sand: '#8c7b56',
      moss: '#4f6347',
      ice: '#d9e6e5',
      glow: '#5ce8cb',
      atmosphere: '#8fd3e2',
      ringA: '#a99678',
      ringB: '#ded0b4',
    },
  });
  planetRoot.add(planet.group);

  const tideHalo = createGlowSprite('#4fe3c6', 3.8, 0, 'soft');
  tideHalo.position.set(0, 0, -0.35);
  system.add(tideHalo);

  const tideRing = createGlowSprite('#a8f6e8', 2.9, 0, 'ring');
  tideRing.position.set(0, 0, 0.55);
  system.add(tideRing);

  const mist = createOrbitDust({
    count: isSmall() ? 120 : 260,
    radius: 1.2,
    spread: 0.38,
    color: '#6ff0d8',
    size: 0.028,
    seed: 9,
  });
  mist.rotation.x = 1.1;
  mist.material.opacity = 0;
  system.add(mist);

  // —— 月亮 ——
  const moonGroup = new THREE.Group();
  system.add(moonGroup);
  const moonUniforms = {
    uLightDir: { value: lightDir.clone() },
    uTide: { value: 0 },
  };
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.29, isSmall() ? 48 : 64, isSmall() ? 36 : 48),
    new THREE.ShaderMaterial({
      uniforms: moonUniforms,
      vertexShader: MOON_VERT,
      fragmentShader: MOON_FRAG,
    })
  );
  moonGroup.add(moon);
  const moonHalo = createGlowSprite('#bcd8e8', 0.9, 0.28, 'soft');
  moonGroup.add(moonHalo);

  // —— 轨道与引力线 ——
  const orbitCurve = new THREE.BufferGeometry();
  orbitCurve.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 220), 3));
  const orbitLine = new THREE.LineLoop(
    orbitCurve,
    new THREE.LineBasicMaterial({
      color: new THREE.Color('#8fb9c8'),
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  system.add(orbitLine);

  const tetherGeo = new THREE.BufferGeometry();
  tetherGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const tether = new THREE.Line(
    tetherGeo,
    new THREE.LineBasicMaterial({
      color: new THREE.Color('#6fe6d0'),
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  system.add(tether);

  const ORBIT_FAR = 2.62;
  const ORBIT_NEAR = 1.72;
  const SQUASH = 0.63;
  let moonAngle = 2.18;
  let moonRadius = ORBIT_FAR;
  let targetAngle = moonAngle;
  let targetRadius = ORBIT_FAR;
  let draggingMoon = false;
  let holdingTide = false;
  let tideReadout = null;
  let tideTip = null;
  let tide = 0;
  let tideVis = 0;
  let done = false;
  let planetSpin = 0;
  let hoverMoon = false;
  let hoverPlanet = false;
  let meterFill = null;
  let meterPct = null;
  let time = 0;
  const pointer = { x: 0, y: 0 };
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.22);
  const hitPoint = new THREE.Vector3();
  const worldPos = new THREE.Vector3();
  const proj = new THREE.Vector3();
  const moonScreen = new THREE.Vector2();
  const planetScreen = new THREE.Vector2();
  const labelMoon = ctx.ui.createLabel();
  const labelPlanet = ctx.ui.createLabel('is-soft');
  labelMoon.setHTML('SELENE · 潮汐卫星');
  labelPlanet.setHTML('OCEAN WORLD · 逆行自转');

  // 轨道参考点
  const opos = orbitCurve.attributes.position;
  for (let i = 0; i < 220; i++) {
    const a = (i / 220) * TAU;
    opos.setXYZ(i, Math.cos(a) * ORBIT_FAR, Math.sin(a) * ORBIT_FAR * SQUASH, 0.02);
  }
  opos.needsUpdate = true;

  function setMoonPosition() {
    moonGroup.position.set(Math.cos(moonAngle) * moonRadius, Math.sin(moonAngle) * moonRadius * SQUASH, 0.22 + Math.sin(time * 0.4) * 0.015);
    moonGroup.position.z = 0.22;
    moon.rotation.y = -moonAngle + Math.PI * 0.5;
    const t = tetherGeo.attributes.position;
    t.setXYZ(0, 0, 0, 0.18);
    t.setXYZ(1, moonGroup.position.x, moonGroup.position.y, 0.18);
    t.needsUpdate = true;
  }
  setMoonPosition();

  function applyTide(immediate = false) {
    const t = clamp(1 - invLerp(ORBIT_NEAR, ORBIT_FAR - 0.02, moonRadius));
    tide = t;
    if (immediate) tideVis = t;
    planet.uniforms.uTide.value = tideVis;
    planet.uniforms.uMoonDir.value.set(moonGroup.position.x, moonGroup.position.y, 0.4).normalize();
    moonUniforms.uTide.value = tideVis;
    tideHalo.material.opacity = Math.pow(tideVis, 1.5) * 0.55;
    tideHalo.scale.setScalar(3.4 + tideVis * 1.6 + Math.sin(time * 0.7) * 0.05);
    tideRing.material.opacity = Math.pow(tideVis, 2.0) * 0.55;
    tideRing.scale.setScalar(2.7 + Math.sin(time * 0.5) * 0.04 + tideVis * 0.65);
    mist.material.opacity = Math.pow(tideVis, 1.6) * 0.65;
    tether.material.opacity = 0.12 + tideVis * 0.34;
    orbitLine.material.opacity = 0.1 + (draggingMoon ? 0.15 : 0);
    if (meterFill) meterFill.style.transform = `scaleX(${clamp(tideVis)})`;
    if (meterPct) meterPct.textContent = `${Math.round(tideVis * 100)}%`;
    if (tideTip) tideTip.classList.toggle('is-off', done || (!holdingTide && tideVis > 0.02));
    if (!done && tideVis > 0.93) finishTide();
  }

  function finishTide() {
    done = true;
    holdingTide = false;
    ctx.state.tideDone = true;
    ctx.flash(0.75, '#bff6e6');
    ctx.audio.boom(0.4);
    ctx.audio.chime(2);
    ctx.ui.setDetail(ctx.content.detail, true);
    ctx.ui.setHint('满潮 · 全海发光', true);
    labelMoon.setHTML('SELENE · 满潮');
    const act = doneAction({ caption: '潮汐已抵达 · 97% 的海洋', next: ctx.nextDef, onNext: ctx.next });
    if (ctx.nextDef) ctx.ui.setAction(act.html, act.mount);
    else ctx.ui.setAction(`<div class="next-row"><span class="name-caption">潮汐已抵达 · 97% 的海洋</span></div>`);
    meterFill = null;
    meterPct = null;
    tideReadout = null;
    tideTip = null;
  }

  function setHolding(on) {
    if (done) on = false;
    if (holdingTide === on) return;
    holdingTide = on;
    tideReadout?.classList.toggle('is-holding', on);
    if (on) ctx.audio.ping(1.6, 0.018, 1.2);
    else {
      targetRadius = clamp(targetRadius, ORBIT_NEAR, ORBIT_FAR);
      ctx.audio.ping(1.9, 0.01, 1.1);
    }
    if (tideTip) tideTip.classList.toggle('is-off', done || (!on && tideVis > 0.02));
    const key = tideTip?.querySelector('.hold-key');
    const txt = tideTip?.querySelector('.tide-tip-text');
    if (key) key.textContent = on ? '涨潮中' : '按住';
    if (txt) txt.textContent = on ? '松开 · 停在当前' : '让月亮靠近 · 或拖动它';
  }

  function mountReadout() {
    const act = `
      <div class="tide-readout is-interactive" id="tideReadout" role="button" tabindex="0" aria-label="按住，让月亮靠近，提升潮汐">
        <div class="tide-readout-top">
          <span class="name-caption">TIDAL FORCE · 潮汐强度</span>
          <span class="tide-pct" id="tidePct">0%</span>
        </div>
        <span class="hold-track"><i id="tideFill"></i></span>
        <span class="tide-tip" id="tideTip"><span class="hold-key">按住</span><span class="tide-tip-text">让月亮靠近 · 或拖动它</span></span>
      </div>`;
    ctx.ui.setAction(act, (root) => {
      meterFill = root.querySelector('#tideFill');
      meterPct = root.querySelector('#tidePct');
      tideReadout = root.querySelector('#tideReadout');
      tideTip = root.querySelector('#tideTip');
      if (meterFill) meterFill.style.transform = `scaleX(${tideVis})`;
      if (meterPct) meterPct.textContent = `${Math.round(tideVis * 100)}%`;

      const el = tideReadout;
      if (!el) return;
      let holdPointer = null;
      let holdAt = 0;
      let tapTimer = 0;
      const tapHint = () => {
        ctx.audio.ping(2.4, 0.015, 1);
        ctx.ui.toast('按住读数不放 · 月亮才会靠近');
        el.classList.remove('is-tap');
        void el.offsetWidth;
        el.classList.add('is-tap');
        clearTimeout(tapTimer);
        tapTimer = window.setTimeout(() => el.classList.remove('is-tap'), 700);
      };
      const begin = (e) => {
        if (done) return;
        e.preventDefault();
        holdPointer = e.pointerId;
        holdAt = performance.now();
        try {
          el.setPointerCapture?.(e.pointerId);
        } catch (err) {}
        setHolding(true);
      };
      const end = (e) => {
        if (holdPointer !== null && e?.pointerId !== undefined && e.pointerId !== holdPointer) return;
        holdPointer = null;
        setHolding(false);
        if (!done && e?.type === 'pointerup' && holdAt && performance.now() - holdAt < 220) tapHint();
        holdAt = 0;
      };
      el.addEventListener('pointerdown', begin);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('lostpointercapture', () => {
        holdPointer = null;
        setHolding(false);
      });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('keydown', (e) => {
        if (e.code !== 'Space' && e.code !== 'Enter') return;
        e.preventDefault();
        setHolding(true);
      });
      el.addEventListener('keyup', (e) => {
        if (e.code !== 'Space' && e.code !== 'Enter') return;
        e.preventDefault();
        setHolding(false);
      });
      el.addEventListener('blur', () => setHolding(false));
    });
  }

  function onShow() {
    labelMoon.show();
    labelPlanet.show();
    ctx.ui.setBody(ctx.content.body);
    if (done) {
      ctx.ui.setDetail(ctx.content.detail, true);
      ctx.ui.setHint('满潮 · 全海发光', true);
      labelMoon.setHTML('SELENE · 满潮');
      const act = doneAction({ caption: '潮汐已抵达 · 97% 的海洋', next: ctx.nextDef, onNext: ctx.next });
      if (ctx.nextDef) ctx.ui.setAction(act.html, act.mount);
      else ctx.ui.setAction(`<div class="next-row"><span class="name-caption">潮汐已抵达 · 97% 的海洋</span></div>`);
    } else {
      ctx.ui.clearDetail();
      ctx.ui.setHint(ctx.content.hint);
      labelMoon.setHTML('SELENE · 潮汐卫星');
      mountReadout();
    }
    applyTide(true);
  }

  function onHide() {
    labelMoon.hide();
    labelPlanet.hide();
    draggingMoon = false;
    holdingTide = false;
    meterFill = null;
    meterPct = null;
    tideReadout = null;
    tideTip = null;
    ctx.ui.setSceneCursor(null);
  }

  function applyLayout() {
    const small = isSmall();
    system.position.set(small ? 0 : 1.12, small ? 0.92 : 0.02, 0);
    system.scale.setScalar(small ? 0.82 : 1);
  }
  applyLayout();

  function update(dt) {
    time += dt;
    sky.update(dt);
    planet.update(dt, 0.0028);
    if (Math.abs(planetSpin) > 0.0001) {
      planet.planet.rotation.y += planetSpin * dt;
      planet.clouds.rotation.y += planetSpin * dt * 0.4;
      planetSpin *= Math.pow(0.02, dt);
    }

    const small = isSmall();
    system.position.x = damp(system.position.x, small ? 0 : 1.12, 2.2, dt);
    system.position.y = damp(system.position.y, small ? 0.92 : 0.02, 2.2, dt);
    const ts = small ? 0.82 : 1;
    const cur = system.scale.x;
    system.scale.setScalar(damp(cur, ts, 2.2, dt));

    // 月亮位置随拖动趋近，松开后保留（走最短弧）
    if (done) targetRadius = ORBIT_NEAR;
    if (holdingTide && !done) {
      targetRadius = clamp(targetRadius - dt * 0.62, ORBIT_NEAR, ORBIT_FAR);
    }
    moonRadius = damp(moonRadius, targetRadius, draggingMoon ? 7 : 3.2, dt);
    const deltaAngle = Math.atan2(Math.sin(targetAngle - moonAngle), Math.cos(targetAngle - moonAngle));
    moonAngle += deltaAngle * (1 - Math.exp(-(draggingMoon ? 9 : 3.2) * dt));
    setMoonPosition();

    tideVis = damp(tideVis, tide, 5, dt);
    applyTide();

    tideHalo.position.set(0, 0, -0.35);
    tideRing.position.set(0, 0, 0.55);
    mist.rotation.z += dt * (0.02 + tideVis * 0.1);

    // 月亮轨道上的微光尘埃（用月光晕代替）
    moonHalo.material.opacity = 0.2 + tideVis * 0.18 + (hoverMoon ? 0.16 : 0);
    moonHalo.scale.setScalar(0.85 + Math.sin(time * 0.6) * 0.03 + tideVis * 0.2);

    // 相机
    camera.position.x = damp(camera.position.x, pointer.x * 0.12, 2.4, dt);
    camera.position.y = damp(camera.position.y, 0.15 + pointer.y * 0.07 + (small ? 0.1 : 0), 2.4, dt);
    camera.position.z = damp(camera.position.z, small ? 7.4 : 6.6, 2, dt);
    camera.lookAt(small ? 0 : 0.65, small ? 0.72 : 0.12, 0);

    // 标签与屏幕位置
    system.updateMatrixWorld();
    worldPos.set(-0.36, 0.85, 0.3).applyMatrix4(system.matrixWorld);
    labelPlanet.set(worldPos.clone().add(new THREE.Vector3(-0.15, 0.55, 0)), camera, 0, 0);
    moonGroup.getWorldPosition(worldPos);
    labelMoon.set(worldPos.clone().add(new THREE.Vector3(0.3, 0.32, 0)), camera, 0, 0);
    proj.copy(worldPos).project(camera);
    moonScreen.set((proj.x * 0.5 + 0.5) * window.innerWidth, (-proj.y * 0.5 + 0.5) * window.innerHeight);
    proj.set(0, 0, 0).applyMatrix4(system.matrixWorld).project(camera);
    planetScreen.set((proj.x * 0.5 + 0.5) * window.innerWidth, (-proj.y * 0.5 + 0.5) * window.innerHeight);

    // 悬停游标
    if (ctx.pointerActive) {
      const dMoon = Math.hypot(ctx.pointerX - moonScreen.x, ctx.pointerY - moonScreen.y);
      const dPlanet = Math.hypot(ctx.pointerX - planetScreen.x, ctx.pointerY - planetScreen.y);
      const hm = dMoon < 56;
      const hp = !hm && dPlanet < 190;
      if (hm !== hoverMoon || hp !== hoverPlanet) {
        hoverMoon = hm;
        hoverPlanet = hp;
        ctx.ui.setSceneCursor(hm ? '拖动月亮 · 让它靠近' : hp ? '拖动行星 · 旋转' : null);
      }
    } else if (hoverMoon || hoverPlanet) {
      hoverMoon = false;
      hoverPlanet = false;
      ctx.ui.setSceneCursor(null);
    }

  }

  function pointerDown(p) {
    if (done) {
      // 完成后仍可把玩，但不再重复触发
    }
    const dMoon = Math.hypot(p.x - moonScreen.x, p.y - moonScreen.y);
    draggingMoon = dMoon < 64;
    ctx.ui.setSceneCursor(draggingMoon ? '松开 · 让它停在这里' : null);
  }

  function pointerMove(dx, dy, x, y) {
    pointer.x = x;
    pointer.y = y;
    if (!ctx.dragging) return;
    if (draggingMoon) {
      ray.setFromCamera(ctx.ndc, camera);
      if (ray.ray.intersectPlane(plane, hitPoint)) {
        const local = hitPoint.clone();
        system.worldToLocal(local);
        let a = Math.atan2(local.y / SQUASH, local.x);
        let r = Math.hypot(local.x, local.y / SQUASH);
        r = clamp(r, ORBIT_NEAR, ORBIT_FAR);
        targetAngle = a;
        targetRadius = done ? ORBIT_NEAR : r;
      }
    } else {
      planetSpin += dx * 0.012;
      planet.planet.rotation.y += dx * 0.0035;
      planet.clouds.rotation.y += dx * 0.0018;
    }
  }

  function pointerUp() {
    if (draggingMoon) {
      draggingMoon = false;
      targetRadius = clamp(targetRadius, ORBIT_NEAR, ORBIT_FAR);
      ctx.audio.ping(2.2, 0.02, 1.4);
    }
    ctx.ui.setSceneCursor(null);
  }

  return {
    id: 'tides',
    title: '潮汐',
    scene,
    camera,
    bloom: 0.78,
    exposure: 1.0,
    content: ctx.content,
    onShow,
    onHide,
    update,
    pointerMove,
    pointerDown,
    pointerUp,
    reset() {
      moonAngle = 2.18;
      targetAngle = moonAngle;
      moonRadius = ORBIT_FAR;
      targetRadius = ORBIT_FAR;
      tide = 0;
      tideVis = 0;
      done = false;
      planetSpin = 0;
      hoverMoon = false;
      hoverPlanet = false;
      holdingTide = false;
      meterFill = null;
      meterPct = null;
      tideReadout = null;
      tideTip = null;
      labelMoon.setHTML('SELENE · 潮汐卫星');
      setMoonPosition();
      applyTide(true);
    },
    get done() {
      return done;
    },
  };
}
