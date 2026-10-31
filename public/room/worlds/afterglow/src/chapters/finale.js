import * as THREE from 'three';
import { createSky, createGlowSprite, createOrbitDust, softTexture } from '../core/sky.js';
import { createStar, createOceanPlanet } from '../core/objects.js';
import { POSTER_NODES } from '../core/poster.js';
import { MEMORIES, UI_TEXT } from '../content.js';
import { clamp, damp, easing, escapeHtml, isSmall, mulberry32, TAU } from '../core/util.js';

const CHART_SCALE = 2.2;
const MEMORY_KEYS = ['first', 'stardust', 'tides', 'abyss', 'ember'];
const LABEL_SIDE = { first: -1, stardust: 1, tides: -1, abyss: -1, ember: 1 };

const CHART_FRAG = /* glsl */ `
uniform float uTime;
uniform float uReveal;
uniform float uOpacity;
varying vec2 vUv;

float hash21(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float ang = atan(p.y, p.x);
  float inside = smoothstep(1.0, 0.9, r);
  float rings = 0.0;
  rings += smoothstep(0.0045, 0.0, abs(r - 0.905));
  rings += smoothstep(0.0035, 0.0, abs(r - 0.665)) * 0.72;
  rings += smoothstep(0.0028, 0.0, abs(r - 0.34)) * 0.48;
  rings += smoothstep(0.0022, 0.0, abs(r - 0.135)) * 0.32;
  float spokes = smoothstep(0.55, 0.86, r) * smoothstep(0.97, 0.88, r)
    * smoothstep(0.78, 1.0, sin(ang * 36.0 + uTime * 0.015) * 0.5 + 0.5) * 0.45;
  float cross = (smoothstep(0.0025, 0.0, abs(p.x)) + smoothstep(0.0025, 0.0, abs(p.y)))
    * smoothstep(0.9, 0.2, r) * 0.3;
  float h = hash21(floor(vUv * 230.0));
  float dust = smoothstep(0.987, 1.0, h) * (0.35 + 0.65 * sin(uTime * 0.55 + h * 40.0));
  dust *= smoothstep(1.0, 0.12, r);
  vec3 col = vec3(0.87, 0.8, 0.64);
  float alpha = (rings * 0.2 + spokes * 0.055 + cross * 0.075 + dust * 0.5) * inside * uOpacity * uReveal;
  // 细小的纸面颗粒
  alpha += (hash21(floor(vUv * 600.0)) - 0.5) * 0.002 * inside * uReveal;
  gl_FragColor = vec4(col, max(alpha, 0.0));
}
`;

function makeTicks(radius = 1.81, count = 120) {
  const pos = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    const major = i % 10 === 0;
    const len = major ? 0.075 : i % 5 === 0 ? 0.045 : 0.022;
    const r1 = radius;
    const r2 = radius - len;
    pos.push(Math.cos(a) * r1, Math.sin(a) * r1, 0, Math.cos(a) * r2, Math.sin(a) * r2, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({
      color: new THREE.Color('#cbb996'),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
}

function makeLink(from, to, colorA, colorB, bow = 0.12) {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const dir = to.clone().sub(from);
  const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar(bow);
  const control = mid.clone().add(perp).add(new THREE.Vector3(0, 0, 0.12));
  const curve = new THREE.QuadraticBezierCurve3(from.clone(), control, to.clone());
  const geo = new THREE.TubeGeometry(curve, 64, 0.0042, 5, false);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uReveal: { value: 0 },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      uniform float uOpacity;
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec2 vUv;
      void main(){
        if (vUv.x > uReveal) discard;
        float ended = smoothstep(0.9, 1.0, vUv.x) * 0.45;
        float head = smoothstep(0.0, 0.03, vUv.x) + ended;
        float wave = 0.75 + 0.25 * sin(vUv.x * 40.0 - uTime * 0.8);
        vec3 col = mix(uColorA, uColorB, smoothstep(0.15, 0.85, vUv.x));
        float alpha = uOpacity * (0.22 + 0.55 * wave) * (1.0 - ended) + head * 0.2;
        gl_FragColor = vec4(col * 1.4, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const spark = createGlowSprite('#fff1d4', 0.08, 0.9, 'flare');
  spark.visible = false;
  return { mesh, mat, curve, spark, reveal: 0, target: 0 };
}

function makeSpectrumRelic() {
  const geo = new THREE.TorusKnotGeometry(0.058, 0.0028, 120, 8, 2, 3);
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const t = i / count;
    c.setHSL(0.015 + t * 0.88, 0.78, 0.62);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const group = new THREE.Group();
  group.add(mesh);
  const core = createGlowSprite('#fff6e2', 0.11, 0.9, 'soft');
  group.add(core);
  return {
    group,
    update(dt, t) {
      mesh.rotation.x += dt * 0.35;
      mesh.rotation.y += dt * 0.55;
      mesh.rotation.z = Math.sin(t * 0.3) * 0.4;
      core.scale.setScalar(0.1 + Math.sin(t * 1.6) * 0.01);
    },
  };
}

function makeStardustRelic() {
  const star = createStar({
    radius: 0.05,
    colorA: '#371007',
    colorB: '#ffb672',
    colorC: '#fff4d5',
    seed: 4.7,
    glowScale: 0.34,
    detail: 32,
  });
  const group = new THREE.Group();
  group.add(star.group);
  const dust = createOrbitDust({ count: 70, radius: 0.14, spread: 0.045, color: '#f7d9a1', size: 0.0045, seed: 17 });
  dust.rotation.x = 0.45;
  group.add(dust);
  return {
    group,
    update(dt, t) {
      star.update(dt);
      dust.rotation.y -= dt * 0.12;
      group.rotation.y = Math.sin(t * 0.22) * 0.3;
    },
  };
}

function makeTidesRelic() {
  const planet = createOceanPlanet({
    radius: 0.072,
    detail: 48,
    seed: 5.3,
    rings: true,
    lightDir: new THREE.Vector3(-1, 0.5, 0.8).normalize(),
    colors: { deep: '#04161f', shallow: '#0d5560', sand: '#91805a', moss: '#5b6d4c', ice: '#e2ece9', glow: '#7ff0d5', atmosphere: '#9fd8df', ringA: '#c4b08a', ringB: '#e6d8b8' },
  });
  const group = new THREE.Group();
  group.add(planet.group);
  const moonPivot = new THREE.Group();
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.0105, 14, 10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#d7d8cf') })
  );
  moon.position.set(0.2, 0, 0);
  moonPivot.add(moon);
  moonPivot.rotation.x = 1.05;
  group.add(moonPivot);
  const moonHalo = createGlowSprite('#dbeef4', 0.075, 0.55, 'soft');
  moon.add(moonHalo);
  return {
    group,
    update(dt, t) {
      planet.update(dt, 0.014);
      moonPivot.rotation.z += dt * 0.24;
      group.rotation.z = Math.sin(t * 0.2) * 0.25;
    },
  };
}

// 星夜模式的深空底片：斜向的微尘带 + 散落近星
function makeDeepField(count, seed) {
  const rng = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const warm = new THREE.Color('#ffe0b8');
  const cool = new THREE.Color('#a8c6da');
  const tmpC = new THREE.Color();
  for (let i = 0; i < count; i++) {
    let x;
    let y;
    if (rng() < 0.62) {
      const t = rng();
      x = (t - 0.5) * 30 + (rng() - 0.5) * 4.5;
      y = (t - 0.5) * 8.4 + (rng() - 0.5) * 4.6;
    } else {
      x = (rng() - 0.5) * 32;
      y = (rng() - 0.5) * 18;
    }
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = -13 - rng() * 10;
    tmpC.copy(warm).lerp(cool, rng());
    const k = 0.45 + rng() * 0.55;
    col[i * 3] = tmpC.r * k;
    col[i * 3 + 1] = tmpC.g * k;
    col[i * 3 + 2] = tmpC.b * k;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: softTexture('soft', 64),
      size: 0.072,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      vertexColors: true,
    })
  );
}

function makeAbyssRelic() {  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 20, 14),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#000000') })
  );
  group.add(core);

  const photon = new THREE.Mesh(
    new THREE.TorusGeometry(0.066, 0.0021, 6, 80),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffd0a0'),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  group.add(photon);

  const diskMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#ff8b52') },
      uColorB: { value: new THREE.Color('#fff0cf') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main(){
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec3 vPos;
      void main(){
        float r = length(vPos.xy);
        float x = clamp((r - 0.062) / (0.17 - 0.062), 0.0, 1.0);
        float bands = 0.58 + 0.42 * sin(r * 190.0 - uTime * 2.4) * sin(r * 67.0 + uTime * 0.8);
        float alpha = smoothstep(0.0, 0.1, x) * smoothstep(1.0, 0.86, x) * (0.18 + 0.42 * bands);
        vec3 col = mix(uColorB, uColorA, pow(x, 0.62));
        gl_FragColor = vec4(col * 1.5, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const disk = new THREE.Mesh(new THREE.RingGeometry(0.062, 0.17, 72, 1), diskMat);
  disk.rotation.x = 1.12;
  disk.rotation.y = 0.2;
  disk.renderOrder = 2;
  group.add(disk);

  const halo = createGlowSprite('#ff9a6c', 0.32, 0.35, 'soft');
  group.add(halo);
  const ringHalo = createGlowSprite('#ffd0a8', 0.24, 0.3, 'ring');
  group.add(ringHalo);

  return {
    group,
    update(dt, t) {
      photon.rotation.z += dt * 0.2;
      diskMat.uniforms.uTime.value = t;
      disk.rotation.z += dt * 0.16;
      const pulse = 1 + Math.sin(t * 0.8) * 0.04;
      halo.scale.setScalar(0.32 * pulse);
    },
  };
}

function makeEmberRelic(ctx, memoryKey) {
  const group = new THREE.Group();
  const star = createStar({
    radius: 0.05,
    colorA: '#3b0c03',
    colorB: '#ff6a26',
    colorC: '#ffd18c',
    seed: 8.1,
    glowScale: 0.36,
    detail: 32,
  });
  group.add(star.group);
  const rng = mulberry32(83);
  const embers = [];
  for (let i = 0; i < 11; i++) {
    const s = createGlowSprite(i % 3 === 0 ? '#ffe3b0' : '#ff8f52', 0.014, 0.7, 'soft');
    s.userData = { a: rng() * TAU, r: 0.04 + rng() * 0.06, sp: 0.5 + rng() * 0.9, ph: rng() * TAU };
    group.add(s);
    embers.push(s);
  }
  const newStar = createStar({
    radius: 0.019,
    colorA: '#2a1707',
    colorB: '#bfe8ff',
    colorC: '#ffffff',
    seed: 2.1,
    glowScale: 0.6,
    detail: 24,
  });
  newStar.group.position.set(0.1, 0.075, 0.03);
  newStar.group.visible = false;
  group.add(newStar.group);

  return {
    group,
    update(dt, t) {
      star.update(dt);
      for (const e of embers) {
        const d = e.userData;
        const life = ((t * d.sp * 0.16 + d.ph) % 1);
        const r = d.r + life * 0.07;
        e.position.set(Math.cos(d.a + t * 0.35) * r, life * 0.15 - 0.03, Math.sin(d.a) * r * 0.4);
        e.material.opacity = (1 - life) * 0.5;
        e.scale.setScalar(0.014 * (0.4 + life));
      }
      const ignite = ctx.state.ending === 'ignite';
      newStar.group.visible = ignite && ctx.state.emberDone;
      if (newStar.group.visible) {
        newStar.update(dt);
        newStar.group.position.y = 0.075 + Math.sin(t * 0.9) * 0.008;
      }
      group.rotation.y = Math.sin(t * 0.26) * 0.35;
    },
  };
}

function makeRelic(key, ctx) {
  if (key === 'first') return makeSpectrumRelic();
  if (key === 'stardust') return makeStardustRelic();
  if (key === 'tides') return makeTidesRelic();
  if (key === 'abyss') return makeAbyssRelic();
  return makeEmberRelic(ctx, key);
}

export function createFinaleChapter(ctx) {
  const content = ctx.content;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  camera.position.set(0, 0.2, 6.8);

  const sky = createSky({
    top: '#030408',
    bottom: '#070a10',
    nebA: '#2c2a1d',
    nebB: '#16262b',
    nebIntensity: 0.46,
    starCount: isSmall() ? 2000 : 4600,
    heroStars: [
      { pos: [-9, 3.2, -22], color: '#ffe2b0', scale: 3.1, opacity: 0.5 },
      { pos: [10, -3.4, -26], color: '#bcd9ff', scale: 2.2, opacity: 0.34 },
    ],
    dustColor: '#d4c3a4',
    seed: 31,
  });
  scene.add(sky.group);

  const backGlow = createGlowSprite('#a88654', 8.5, 0.05, 'soft');
  backGlow.position.set(0.3, 0.1, -6);
  scene.add(backGlow);

  // 星夜模式专用的深空层：两团极淡的星云与一条斜向尘埃带
  const ambientSky = new THREE.Group();
  ambientSky.visible = false;
  scene.add(ambientSky);
  const ambientTeal = createGlowSprite('#5e9fb0', 7.2, 0.055, 'soft');
  ambientTeal.position.set(4.4, -1.3, -8.2);
  ambientSky.add(ambientTeal);
  const ambientAmber = createGlowSprite('#c19563', 8.2, 0.04, 'soft');
  ambientAmber.position.set(-4.6, 1.7, -9);
  ambientSky.add(ambientAmber);
  const ambientBand = createOrbitDust({
    count: isSmall() ? 240 : 440,
    radius: 12.6,
    spread: 4.6,
    color: '#c4b596',
    size: 0.02,
    seed: 907,
  });
  ambientBand.rotation.x = 1.16;
  ambientBand.rotation.z = 0.44;
  ambientBand.material.opacity = 0.42;
  ambientSky.add(ambientBand);
  const ambientStars = makeDeepField(isSmall() ? 1150 : 1700, 7331);
  ambientSky.add(ambientStars);

  const chart = new THREE.Group();
  chart.position.set(0.18, 0.06, 0);
  scene.add(chart);

  // —— 星图纸面 ——
  const chartUniforms = {
    uTime: { value: 0 },
    uReveal: { value: 0 },
    uOpacity: { value: 0.85 },
  };
  const chartPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 4.0),
    new THREE.ShaderMaterial({
      uniforms: chartUniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: CHART_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  chartPlane.position.z = -0.14;
  chart.add(chartPlane);

  // —— 刻度与环 ——
  const ticks = makeTicks(1.82, 120);
  chart.add(ticks);
  const ringMats = [];
  const ringDefs = [
    [1.95, 0.0024, 0.24],
    [1.6, 0.0016, 0.1],
    [1.12, 0.0012, 0.055],
  ];
  for (const [r, tube, op] of ringDefs) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#cbb996'),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 220), mat);
    chart.add(ring);
    ringMats.push({ mat, base: op });
  }
  // 四角的方位细线
  const crossGeo = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const r1 = 1.62;
    const r2 = 1.9;
    crossGeo.push(Math.cos(a) * r1, Math.sin(a) * r1, 0, Math.cos(a) * r2, Math.sin(a) * r2, 0);
  }
  const crossLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(crossGeo, 3)),
    new THREE.LineBasicMaterial({ color: '#cbb996', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  chart.add(crossLines);

  const chartDust = createOrbitDust({ count: isSmall() ? 180 : 320, radius: 2.55, spread: 0.55, color: '#d3c2a4', size: 0.018, seed: 44 });
  chartDust.rotation.x = 0.24;
  chart.add(chartDust);
  const chartDust2 = createOrbitDust({ count: isSmall() ? 120 : 220, radius: 3.25, spread: 0.7, color: '#9fb6bd', size: 0.014, seed: 45 });
  chartDust2.rotation.x = -0.32;
  chart.add(chartDust2);

  // 完成时的星环
  const finalRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#e6d3ab'),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const finalRing = new THREE.Mesh(new THREE.TorusGeometry(2.16, 0.0035, 8, 260), finalRingMat);
  chart.add(finalRing);
  const finalHalo = createGlowSprite('#e2cda5', 5.4, 0, 'ring');
  finalHalo.position.z = -0.05;
  chart.add(finalHalo);

  // —— 五枚节点 ——
  const memoryByKey = Object.fromEntries(MEMORIES.map((m) => [m.key, m]));
  const nodes = {};
  const hitMeshes = [];
  const nodeMeta = POSTER_NODES.map((n, i) => ({
    ...n,
    no: String(i + 1).padStart(2, '0'),
    index: i,
    memory: memoryByKey[n.key],
    side: LABEL_SIDE[n.key] || 1,
  }));

  for (const meta of nodeMeta) {
    const group = new THREE.Group();
    group.position.set(meta.local[0] * CHART_SCALE, meta.local[1] * CHART_SCALE, 0);
    group.userData.baseY = group.position.y;
    group.userData.phase = meta.index * 1.7 + 0.6;
    chart.add(group);

    const empty = createGlowSprite(meta.color, 0.92, 0.09, 'ring');
    group.add(empty);

    const halo = createGlowSprite(meta.color, 0.9, 0.02, 'soft');
    group.add(halo);
    const core = createGlowSprite('#fff8ea', 0.24, 0.14, 'flare');
    group.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.165, 0.0026, 6, 90),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(meta.color),
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(ring);

    const orbitRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.33, 0.0014, 5, 120),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(meta.color),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(orbitRing);

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 10, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.userData.key = meta.key;
    group.add(hit);
    hitMeshes.push(hit);

    const holder = new THREE.Group();
    holder.visible = false;
    group.add(holder);
    const relic = makeRelic(meta.key, ctx);
    relic.group.scale.setScalar(0.001);
    holder.add(relic.group);

    const shock = createGlowSprite('#fff3da', 0.1, 0, 'ring');
    group.add(shock);

    const sparks = [];
    for (let i = 0; i < 7; i++) {
      const s = createGlowSprite(meta.color, 0.024, 0.9, 'soft');
      s.visible = false;
      group.add(s);
      const a = (i / 7) * TAU + 0.3;
      sparks.push({ sprite: s, dx: Math.cos(a), dy: Math.sin(a), t: 1 });
    }

    const label = ctx.ui.createLabel('lbl-sky is-dim');
    label.setHTML(
      `<span class="sky-no">${meta.no}</span><span class="sky-name" style="color:${meta.color}">${meta.memory.title}</span><span class="sky-en">${meta.memory.en}</span>`
    );

    nodes[meta.key] = {
      meta,
      group,
      empty,
      halo,
      core,
      ring,
      orbitRing,
      holder,
      relic,
      shock,
      sparks,
      label,
      placed: false,
      life: 0,
      shockT: 1,
      replay: 0,
      hover: false,
      orbitAngle: meta.index * 1.3 + 0.7,
      shake: 0,
    };
  }

  // —— 星座连线 ——
  const links = [];
  for (let i = 0; i < nodeMeta.length - 1; i++) {
    const a = nodes[nodeMeta[i].key];
    const b = nodes[nodeMeta[i + 1].key];
    const link = makeLink(a.group.position, b.group.position, a.meta.color, b.meta.color, i % 2 === 0 ? 0.14 : -0.11);
    chart.add(link.mesh, link.spark);
    link.keys = [a.meta.key, b.meta.key];
    links.push(link);
  }
  const nameLink = makeLink(
    new THREE.Vector3(-1.16, 0.56, 0),
    nodes.stardust.group.position,
    '#9fe0cf',
    '#f3e3c3',
    0.22
  );
  nameLink.mat.uniforms.uOpacity.value = 0.5;
  chart.add(nameLink.mesh);
  nameLink.keys = ['name', 'stardust'];

  // —— 命名的那颗星 ——
  const nameGroup = new THREE.Group();
  nameGroup.position.set(-1.16, 0.56, 0);
  nameGroup.visible = false;
  chart.add(nameGroup);
  const nameHalo = createGlowSprite('#9fe0cf', 0.58, 0.24, 'soft');
  const nameCore = createGlowSprite('#ffffff', 0.14, 0.9, 'flare');
  const nameRing = createGlowSprite('#9fe0cf', 0.42, 0.18, 'ring');
  nameGroup.add(nameHalo, nameCore, nameRing);
  const nameLabel = ctx.ui.createLabel('lbl-sky is-name');
  nameLabel.setHTML('');

  // —— 交互状态 ——
  let time = 0;
  let reveal = 0;
  let finalReveal = 0;
  let completed = false;
  let completionApplied = false;
  let railHover = null;
  let sceneHover = null;
  let hoverKey = null;
  let down = null;
  let dragging = false;
  let draggingMoved = 0;
  let restartArmed = false;
  let restartTimer = null;
  let nameStarTime = 0;
  let ambientMode = false;
  let ambientScheduled = false;
  let ambientStart = 0;
  let ambientNext = Infinity;
  const activeVisitors = [];
  const visitorPool = new Map();
  const visitorKinds = ['ocean', 'giant', 'ember', 'abyss'];
  const visitorRng = mulberry32(9317);
  const timers = new Set();
  const flights = [];
  const flying = new Set();
  const ripples = [];
  const raycaster = new THREE.Raycaster();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.1);

  function after(ms, fn) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }
  function clearTimers() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  }

  // —— 星夜模式：完成之后，星图散去，只剩会呼吸的夜空 ——
  function makeAmbientVisitor(kind) {
    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);
    let update = () => {};
    if (kind === 'ocean') {
      const planet = createOceanPlanet({
        radius: 0.56,
        detail: isSmall() ? 56 : 88,
        seed: 12.7,
        rings: true,
        lightDir: new THREE.Vector3(-0.75, 0.5, 0.6).normalize(),
        colors: {
          deep: '#02121b',
          shallow: '#0b4956',
          sand: '#8b7c58',
          moss: '#526548',
          ice: '#dce9e6',
          glow: '#67ead0',
          atmosphere: '#98d9e0',
          ringA: '#a89472',
          ringB: '#d9c8a8',
        },
      });
      group.add(planet.group);
      update = (dt) => planet.update(dt, 0.0045);
    } else if (kind === 'giant') {
      const planet = createOceanPlanet({
        radius: 0.78,
        detail: isSmall() ? 56 : 96,
        seed: 4.6,
        rings: false,
        lightDir: new THREE.Vector3(0.8, 0.4, 0.5).normalize(),
        colors: {
          deep: '#241006',
          shallow: '#7a3f1d',
          sand: '#d0a06a',
          moss: '#8a623c',
          ice: '#f4dfbd',
          glow: '#ffc48a',
          atmosphere: '#f2caa0',
        },
      });
      group.add(planet.group);
      update = (dt) => planet.update(dt, 0.003);
    } else if (kind === 'ember') {
      const star = createStar({
        radius: 0.27,
        colorA: '#3b0c03',
        colorB: '#ff6a26',
        colorC: '#ffd18c',
        seed: 7.4,
        glowScale: 0.7,
        detail: 48,
      });
      star.halo1.material.opacity = 0.4;
      star.halo2.material.opacity = 0.16;
      group.add(star.group);
      update = (dt) => star.update(dt);
    } else {
      const relic = makeAbyssRelic();
      relic.group.scale.setScalar(6.2);
      group.add(relic.group);
      update = (dt) => relic.update(dt, time);
    }
    const v = {
      kind,
      group,
      update,
      active: false,
      t: 0,
      dur: 1,
      x0: 0,
      x1: 0,
      y0: 0,
      z0: 0,
      z1: 0,
      phase: 0,
      sway: 0,
      spin: 0,
    };
    visitorPool.set(kind, v);
    return v;
  }

  function spawnAmbientVisitor(forceKind) {
    if (!ambientMode || activeVisitors.length >= 2) return false;
    const free = visitorKinds.filter((k) => !activeVisitors.some((v) => v.kind === k));
    if (!free.length) return false;
    const kind = forceKind && free.includes(forceKind) ? forceKind : free[Math.floor(visitorRng() * free.length)];
    const v = visitorPool.get(kind) || makeAmbientVisitor(kind);
    const small = isSmall();
    const aspect = window.innerWidth / window.innerHeight;
    const z0 = -12.5 - visitorRng() * 3.2;
    const z1 = -5.3 - visitorRng() * 1.5;
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * (8.3 - z0);
    const halfW = halfH * aspect;
    const side = visitorRng() < 0.5 ? -1 : 1;
    const outset = small ? 0.6 : 1.8;
    v.x0 = side * (halfW + outset);
    v.x1 = -side * (halfW + outset + 0.3);
    v.y0 = -1.5 + visitorRng() * 3.2;
    v.z0 = z0;
    v.z1 = z1;
    v.phase = visitorRng() * TAU;
    v.sway = 0.16 + visitorRng() * 0.32;
    v.spin = 0.006 + visitorRng() * 0.012;
    v.dur = (small ? 30 : 36) + visitorRng() * (small ? 16 : 20);
    v.t = small ? 0.1 : 0;
    v.active = true;
    v.group.visible = true;
    v.group.position.set(v.x0, v.y0, z0);
    v.group.rotation.set((visitorRng() - 0.5) * 0.25, visitorRng() * TAU, (visitorRng() - 0.5) * 0.2);
    activeVisitors.push(v);
    return true;
  }

  function updateAmbientVisitors(dt) {
    ambientBand.rotation.z += dt * 0.005;
    ambientBand.rotation.x = 1.16 + Math.sin(time * 0.028) * 0.018;
    for (let i = activeVisitors.length - 1; i >= 0; i--) {
      const v = activeVisitors[i];
      v.t += dt / v.dur;
      const e = clamp(v.t);
      const x = v.x0 + (v.x1 - v.x0) * e;
      const y = v.y0 + Math.sin(e * Math.PI * 2 + v.phase) * v.sway;
      const z = v.z0 + (v.z1 - v.z0) * e + Math.sin(e * Math.PI + v.phase) * 0.22;
      v.group.position.set(x, y, z);
      v.group.rotation.y += dt * v.spin;
      v.group.rotation.z += Math.sin(time * 0.08 + v.phase) * dt * 0.004;
      v.update(dt);
      if (v.t >= 1) {
        v.active = false;
        v.group.visible = false;
        activeVisitors.splice(i, 1);
      }
    }
  }

  function scheduleAmbient(delay = 6000) {
    if (!completed || ambientScheduled || ambientMode) return;
    ambientScheduled = true;
    after(delay, enterAmbientMode);
  }

  function enterAmbientMode() {
    if (ambientMode || !completed) return;
    ambientMode = true;
    ambientScheduled = true;
    const veil = ctx.ui.dom.ambientVeil;
    veil?.classList.add('is-show');
    after(950, () => {
      const small = isSmall();
      chart.visible = false;
      ambientSky.visible = true;
      ambientTeal.position.set(small ? 1.7 : 4.4, small ? -1.0 : -1.3, small ? -7.2 : -8.2);
      ambientTeal.scale.setScalar(small ? 4.8 : 7.2);
      ambientAmber.position.set(small ? -1.8 : -4.6, small ? 1.5 : 1.7, small ? -7.8 : -9);
      ambientAmber.scale.setScalar(small ? 5.4 : 8.2);
      for (const key of MEMORY_KEYS) nodes[key]?.label.hide();
      nameLabel.hide();
      ctx.ui.setAmbient(true);
      ctx.ui.setHint('');
      ctx.ui.setSceneCursor(null);
      ambientStart = time;
      ambientNext = time + (small ? 4.5 : 7.5);
      spawnAmbientVisitor('ocean');
      ctx.audio.boom(0.2);
    });
    after(2400, () => veil?.classList.remove('is-show'));
  }

  function leaveAmbientMode() {
    ambientMode = false;
    ambientScheduled = false;
    ambientStart = 0;
    ambientNext = Infinity;
    for (const v of activeVisitors) {
      v.active = false;
      v.group.visible = false;
    }
    activeVisitors.length = 0;
    ambientSky.visible = false;
    chart.visible = true;
    ctx.ui.dom.ambientVeil?.classList.remove('is-show');
    ctx.ui.setAmbient(false);
  }


  function unlockedMap() {
    return {
      first: !!ctx.state.firstLightDone,
      stardust: !!ctx.state.stardustDone,
      tides: !!ctx.state.tideDone,
      abyss: !!ctx.state.abyssDone,
      ember: !!ctx.state.emberDone,
    };
  }

  function refreshRail() {
    railHover = null;
    ctx.ui.renderMemories(
      { unlocked: unlockedMap(), placed: ctx.state.placed },
      {
        onPlace: (key, pt) => flyMemory(key, pt),
        onPlaced: (key) => replayMemory(key),
        onLocked: (key) => {
          const m = memoryByKey[key];
          ctx.ui.toast(`先去打开「${m.title}」`);
          after(650, () => ctx.navigate(key));
        },
        onHover: (key, on) => {
          railHover = on ? key : null;
          const btn = document.querySelector(`.mem-item[data-mem="${key}"]`);
          btn?.classList.toggle('is-hovering', on);
          refreshHover();
        },
      }
    );
  }

  function refreshHover(force = false) {
    const next = sceneHover || railHover;
    if (!force && next === hoverKey) return;
    const prev = nodes[hoverKey];
    if (prev) {
      prev.hover = false;
      prev.label.el.classList.remove('is-hot');
      if (prev.placed) {
        prev.label.show();
        prev.label.el.classList.add('is-dim');
      } else {
        prev.label.hide();
      }
    }
    hoverKey = next;
    const node = nodes[hoverKey];
    if (node) {
      node.hover = true;
      node.label.el.classList.remove('is-dim');
      node.label.el.classList.add('is-hot');
      node.label.show();
    }
    if (sceneHover) {
      const n = nodes[sceneHover];
      const unlocked = unlockedMap();
      if (!n) ctx.ui.setSceneCursor(null);
      else if (n.placed) ctx.ui.setSceneCursor(`重看 · ${n.meta.memory.title}`);
      else if (unlocked[sceneHover]) ctx.ui.setSceneCursor(`点击 · 让「${n.meta.memory.title}」归位`);
      else ctx.ui.setSceneCursor(`尚未打开 · ${n.meta.memory.title}`);
    } else {
      ctx.ui.setSceneCursor(null);
    }
  }

  function bumpRailItem(key, on) {
    const btn = document.querySelector(`.mem-item[data-mem="${key}"]`);
    btn?.classList.toggle('is-flying', on);
  }

  function updateNameStar() {
    const named = !!ctx.state.starName && !!ctx.state.stardustDone;
    nameGroup.visible = named;
    if (named) {
      nameLabel.setHTML(
        `<span class="sky-name" style="color:#9fe0cf">「${escapeHtml(ctx.state.starName)}」</span><span class="sky-en">THE NEWEST LIGHT</span>`
      );
      nameLabel.show();
    } else {
      nameLabel.hide();
    }
    nameLink.target = named && ctx.state.placed.has('stardust') ? 1 : 0;
    if (!named) nameLink.reveal = 0;
  }

  function spawnSparks(node) {
    for (const s of node.sparks) {
      s.t = 0;
      s.sprite.visible = true;
    }
  }

  function igniteNode(key, { quiet = false } = {}) {
    const node = nodes[key];
    if (!node || node.placed) return;
    node.placed = true;
    ctx.state.placed.add(key);
    node.life = 0.001;
    node.shockT = 0;
    node.replay = 0;
    node.holder.visible = true;
    node.holder.scale.setScalar(0.001);
    node.label.show();
    node.label.el.classList.remove('is-dim');
    node.label.el.classList.add('is-hot');
    spawnSparks(node);
    flying.delete(key);
    bumpRailItem(key, false);

    if (!quiet) {
      ctx.flash(0.18, node.meta.color);
      ctx.audio.chime(node.meta.index);
    }
    refreshRail();
    updateNameStar();
    const count = MEMORY_KEYS.filter((k) => ctx.state.placed.has(k)).length;
    refreshHover(true);
    if (count >= 5) {
      beginCompletion(quiet);
    } else if (!quiet) {
      ctx.ui.setHint(`拾光匣 · ${count} / 5 已归位`, false);
      mountIdleAction();
    }
  }

  function replayMemory(key) {
    const node = nodes[key];
    if (!node || !node.placed) return;
    node.replay = 1;
    spawnSparks(node);
    node.shockT = 0;
    ctx.audio.chime(node.meta.index + 2);
    ctx.ui.toast(`${node.meta.memory.title} · ${node.meta.memory.ready}`);
    node.label.el.classList.add('is-hot');
    after(900, () => {
      if (!node.hover) node.label.el.classList.remove('is-hot');
    });
  }

  function finishFlight(f, quiet = false) {
    if (f.done) return;
    f.done = true;
    scene.remove(f.group);
    f.trail.forEach((s) => {
      scene.remove(s);
      s.material.dispose();
    });
    f.mote.material.dispose();
    f.core.material.dispose();
    const idx = flights.indexOf(f);
    if (idx >= 0) flights.splice(idx, 1);
    flying.delete(f.key);
    bumpRailItem(f.key, false);
    igniteNode(f.key, { quiet });
  }

  function flyMemory(key, pt) {
    if (ctx.state.placed.has(key) || flying.has(key)) return;
    if (!unlockedMap()[key]) {
      const m = memoryByKey[key];
      ctx.ui.toast(`先去打开「${m.title}」`);
      after(650, () => ctx.navigate(key));
      return;
    }
    const node = nodes[key];
    if (!node) return;
    const startPt = pt && typeof pt.x === 'number' ? pt : { x: window.innerWidth * 0.78, y: window.innerHeight * 0.5 };
    const ndcStart = new THREE.Vector3((startPt.x / window.innerWidth) * 2 - 1, -(startPt.y / window.innerHeight) * 2 + 1, 0.5);
    ndcStart.unproject(camera);

    chart.updateMatrixWorld();
    const target = new THREE.Vector3();
    node.group.getWorldPosition(target);
    const control = ndcStart.clone().lerp(target, 0.48);
    control.y += 0.9 + startPt.y / window.innerHeight * 0.5;
    control.z += 0.55;

    const group = new THREE.Group();
    scene.add(group);
    const mote = createGlowSprite(node.meta.color, 0.14, 0.95, 'flare');
    group.add(mote);
    const core = createGlowSprite('#ffffff', 0.055, 1, 'soft');
    group.add(core);
    const trail = [];
    for (let i = 0; i < 7; i++) {
      const s = createGlowSprite(node.meta.color, 0.045 * (1 - i / 9), 0.5 * (1 - i / 8), 'soft');
      s.visible = false;
      scene.add(s);
      trail.push(s);
    }
    const curve = new THREE.QuadraticBezierCurve3(ndcStart.clone(), control, target.clone());
    flights.push({ key, node, group, mote, core, trail, curve, t: 0, dur: 1.05 + Math.random() * 0.15, done: false });
    flying.add(key);
    bumpRailItem(key, true);
    ctx.audio.ping(2.6, 0.03, 1.4);
    window.setTimeout(() => ctx.audio.ping(3.4, 0.02, 1.8), 160);
  }

  function activateNode(key) {
    if (ctx.state.placed.has(key)) {
      replayMemory(key);
      return;
    }
    if (!unlockedMap()[key]) {
      const m = memoryByKey[key];
      ctx.ui.toast(`先去打开「${m.title}」`);
      after(650, () => ctx.navigate(key));
      return;
    }
    igniteNode(key);
  }

  function updateLinks(dt, instant = false) {
    const placed = ctx.state.placed;
    for (const link of links) {
      const active = placed.has(link.keys[0]) && placed.has(link.keys[1]) ? 1 : 0;
      link.target = active;
      if (instant) link.reveal = active;
      else link.reveal = damp(link.reveal, active, 2.4, dt);
      link.mat.uniforms.uReveal.value = link.reveal;
      link.mat.uniforms.uTime.value = time;
      const visible = link.reveal > 0.02;
      link.spark.visible = visible && link.target > 0;
      if (link.spark.visible) {
        const tt = (time * 0.055 + link.keys[0].length * 0.17) % 1;
        if (tt <= link.reveal) {
          link.curve.getPoint(tt, tmp);
          link.spark.position.copy(tmp);
          link.spark.material.opacity = 0.55 + Math.sin(time * 3.3) * 0.2;
        } else {
          link.spark.visible = false;
        }
      }
    }
    nameLink.reveal = instant && nameLink.target ? 1 : damp(nameLink.reveal, nameLink.target, 1.8, dt);
    nameLink.mat.uniforms.uReveal.value = nameLink.reveal;
    nameLink.mat.uniforms.uTime.value = time;
  }

  function beginCompletion(quiet = false) {
    if (completed) return;
    completed = true;
    ctx.state.finaleDone = true;
    finalReveal = quiet ? 1 : 0;
    updateNameStar();
    updateLinks(0.016, quiet);
    if (quiet) {
      applyCompletionUI();
      revealCompletionPose(true);
      return;
    }
    ctx.audio.boom(0.4);
    after(240, () => {
      MEMORY_KEYS.forEach((key, i) => {
        after(i * 280, () => {
          const node = nodes[key];
          if (!node) return;
          node.replay = 1;
          node.shockT = 0;
          spawnSparks(node);
          ctx.audio.chime(i + 2);
        });
      });
    });
    after(1550, () => {
      ctx.flash(0.42, '#ffeccb');
      ctx.audio.chime(6);
      applyCompletionUI();
      scheduleAmbient(4200);
    });
  }

  function revealCompletionPose(instant = false) {
    finalReveal = 1;
    finalRingMat.opacity = 0.34;
    finalHalo.material.opacity = 0.12;
    if (instant) {
      finalRing.scale.setScalar(1);
      finalHalo.scale.setScalar(5.4);
    }
    ctx.ui.setHint('五段记忆 · 已归位', true);
  }

  function disarmRestart() {
    restartArmed = false;
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    const btn = document.querySelector('#restartBtn');
    const note = document.querySelector('#finNote');
    if (btn) btn.textContent = content.restart;
    if (note) note.textContent = '这张星图会下载到你的设备 · 不经过任何服务器';
  }

  function applyCompletionUI() {
    if (completionApplied) {
      ctx.ui.setBody(content.closing);
      ctx.ui.setDetail(ctx.state.ending === 'ignite' ? content.closingIgnite : content.closingFade, true);
      return;
    }
    completionApplied = true;
    ctx.ui.setBody(content.closing);
    ctx.ui.setDetail(ctx.state.ending === 'ignite' ? content.closingIgnite : content.closingFade, true);
    ctx.ui.setHint('五段记忆 · 已归位', true);
    ctx.ui.setAction(
      `<div class="fin-actions">
        <button class="btn btn-solid" id="saveSkyBtn" type="button">
          <span>${content.save}</span>
          <span class="btn-k">1500 × 2000 · PNG</span>
        </button>
        <button class="link-btn" id="restartBtn" type="button">${content.restart}</button>
        <div class="fin-note" id="finNote">这张星图会下载到你的设备 · 不经过任何服务器</div>
      </div>`,
      (root) => {
        const saveBtn = root.querySelector('#saveSkyBtn');
        const restartBtn = root.querySelector('#restartBtn');
        const note = root.querySelector('#finNote');
        saveBtn?.addEventListener('click', async () => {
          if (saveBtn.disabled) return;
          saveBtn.disabled = true;
          const label = saveBtn.querySelector('span');
          if (label) label.textContent = '正在冲洗星图…';
          const ok = await ctx.savePoster();
          saveBtn.disabled = false;
          if (label) label.textContent = content.save;
          if (ok) {
            ctx.ui.toast(UI_TEXT.saved);
            if (note) note.textContent = '已保存 · afterglow-your-sky.png';
            ctx.audio.chime(4);
          } else {
            ctx.ui.toast('保存失败了 · 换一个浏览器再试试');
            if (note) note.textContent = '保存失败，请允许浏览器下载文件。';
          }
        });
        restartBtn?.addEventListener('click', () => {
          if (!restartArmed) {
            restartArmed = true;
            restartBtn.textContent = '确定？回到第一件藏品';
            if (note) note.textContent = '这一夜会留在本机，场景会回到最初。';
            restartTimer = setTimeout(disarmRestart, 4200);
            return;
          }
          disarmRestart();
          ctx.restart();
        });
      }
    );
    ctx.audio.chime(1);
  }

  function mountIdleAction() {
    if (completed) return;
    const count = MEMORY_KEYS.filter((k) => ctx.state.placed.has(k)).length;
    const small = isSmall();
    ctx.ui.setAction(
      `<div class="fin-note">${
        count > 0
          ? `已归位 ${count} / 5 · ${small ? '打开拾光匣继续' : '继续点击右侧「拾光匣」'}`
          : small
            ? '打开拾光匣，选一段记忆<br>也可以直接点击天空里的空位'
            : '从右侧「拾光匣」选择一段记忆<br>也可以直接点击天空里的空位'
      }</div>
      ${
        small
          ? `<button class="next-link" id="openReliquary" type="button">
              <span>打开拾光匣 · ${count} / 5</span>
              <span class="next-arrow" aria-hidden="true">→</span>
            </button>`
          : ''
      }`,
      (root) => {
        root.querySelector('#openReliquary')?.addEventListener('click', () => {
          ctx.audio.click();
          ctx.ui.setMenu(true);
        });
      }
    );
  }

  function onShow() {
    leaveAmbientMode();
    updateNameStar();
    refreshRail();
    reveal = 0;
    // 复位所有标签，随后按状态重新点亮
    for (const key of MEMORY_KEYS) {
      const node = nodes[key];
      node.label.hide();
      node.label.el.classList.remove('is-hot');
      node.label.el.classList.add('is-dim');
      node.placed = ctx.state.placed.has(key);
      node.life = node.placed ? 1 : 0;
      node.holder.visible = node.placed;
      node.holder.scale.setScalar(node.placed ? 1 : 0.001);
      node.relic.group.scale.setScalar(node.placed ? 1 : 0.001);
      node.empty.material.opacity = node.placed ? 0 : 0.09;
      node.orbitRing.material.opacity = node.placed ? 0.16 : 0;
      if (node.placed) node.label.show();
    }
    completed = !!ctx.state.finaleDone;
    completionApplied = false;
    disarmRestart();
    updateLinks(0.016, true);
    if (completed) {
      revealCompletionPose(true);
      applyCompletionUI();
      scheduleAmbient(3600);
    } else {
      finalRingMat.opacity = 0;
      finalHalo.material.opacity = 0;
      ctx.ui.setBody(content.body);
      ctx.ui.clearDetail();
      mountIdleAction();
      const count = MEMORY_KEYS.filter((k) => ctx.state.placed.has(k)).length;
      ctx.ui.setHint(count ? `拾光匣 · ${count} / 5 已归位 · 继续点击右侧` : content.hint);
    }
    hoverKey = null;
    sceneHover = null;
    railHover = null;
    refreshHover();
    ctx.ui.setSceneCursor(null);
  }

  function onHide() {
    clearTimers();
    leaveAmbientMode();
    // 正在飞行的记忆直接归位，避免状态悬空
    for (const f of flights.slice()) finishFlight(f, true);
    for (const ripple of ripples.splice(0)) {
      chart.remove(ripple.sprite);
      ripple.sprite.material.dispose();
    }
    for (const key of MEMORY_KEYS) nodes[key]?.label.hide();
    nameLabel.hide();
    ctx.ui.setSceneCursor(null);
    disarmRestart();
    dragging = false;
    down = null;
    sceneHover = null;
    railHover = null;
  }

  function pointerDown(p) {
    if (ambientMode) return;
    down = { x: p.x, y: p.y };
    dragging = true;
    draggingMoved = 0;
  }

  function pointerMove(dx, dy) {
    if (ambientMode || !dragging) return;
    draggingMoved += Math.abs(dx) + Math.abs(dy);
  }

  function pointerUp(p) {
    if (ambientMode) {
      dragging = false;
      down = null;
      return;
    }
    if (!dragging) return;
    dragging = false;
    const moved = Math.hypot(p.x - down.x, p.y - down.y);
    down = null;
    if (moved > 10 || draggingMoved > 14) return;
    const ndc = new THREE.Vector2((p.x / window.innerWidth) * 2 - 1, -(p.y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(hitMeshes, false)[0];
    if (hit?.object?.userData?.key) {
      activateNode(hit.object.userData.key);
      return;
    }
    const surface = raycaster.intersectObject(chartPlane, false)[0];
    if (surface) {
      const local = chart.worldToLocal(surface.point.clone());
      spawnRipple(local);
    }
  }

  function spawnRipple(local) {
    const sprite = createGlowSprite('#d9c8a8', 0.06, 0.5, 'ring');
    sprite.position.copy(local);
    sprite.position.z = 0;
    chart.add(sprite);
    ripples.push({ sprite, t: 0 });
    ctx.audio.ping(3.2, 0.012, 1.2);
  }

  function updateRipples(dt) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t += dt / 1.1;
      r.sprite.scale.setScalar(0.06 + r.t * 0.6);
      r.sprite.material.opacity = 0.5 * (1 - r.t);
      if (r.t >= 1) {
        chart.remove(r.sprite);
        r.sprite.material.dispose();
        ripples.splice(i, 1);
      }
    }
  }

  function updateFlights(dt) {
    for (const f of flights.slice()) {
      f.t += dt / f.dur;
      const tt = clamp(f.t);
      const e = easing.inOutCubic(tt);
      f.curve.getPoint(e, tmp);
      f.group.position.copy(tmp);
      f.mote.scale.setScalar(0.14 + Math.sin(time * 9) * 0.012);
      f.core.scale.setScalar(0.055);
      for (let i = 0; i < f.trail.length; i++) {
        const te = clamp(e - i * 0.022);
        f.curve.getPoint(te, tmp2);
        const s = f.trail[i];
        s.visible = true;
        s.position.copy(tmp2);
        s.material.opacity = (0.45 * (1 - i / f.trail.length)) * (0.3 + e * 0.7);
        s.scale.setScalar(0.05 * (1 - i / f.trail.length) * (0.6 + Math.sin(time * 6 + i) * 0.1));
      }
      if (f.t >= 1) finishFlight(f);
    }
  }

  function updateLabels() {
    chart.updateMatrixWorld();
    const small = isSmall();
    for (const key of MEMORY_KEYS) {
      const node = nodes[key];
      if (!node.label.visible) continue;
      node.group.getWorldPosition(tmp);
      tmp.y += 0.02;
      const w = node.label.el.offsetWidth || 150;
      const offsetX = node.meta.side < 0 ? -(w + 16) : 16;
      node.label.set(tmp, camera, offsetX, small ? -8 : -12);
    }
    if (nameLabel.visible) {
      nameGroup.getWorldPosition(tmp);
      nameLabel.set(tmp, camera, 18, -14);
    }
  }

  function update(dt) {
    time += dt;
    sky.update(dt);
    chartUniforms.uTime.value = time;
    chartUniforms.uReveal.value = reveal = damp(reveal, 1, 2.2, dt);
    ticks.material.opacity = 0.22 * reveal;
    crossLines.material.opacity = 0.16 * reveal;
    for (const r of ringMats) r.mat.opacity = r.base * reveal;

    const small = isSmall();
    const tx = small ? 0 : 0.18;
    const ty = small ? 1.32 : 0.06;
    const ts = small ? 0.56 : 1;
    chart.position.x = damp(chart.position.x, tx, 2.4, dt);
    chart.position.y = damp(chart.position.y, ty, 2.4, dt);
    chart.scale.x = chart.scale.y = chart.scale.z = damp(chart.scale.x, ts, 2.4, dt);

    const px = clamp(ctx.ndc.x * 0.6, -0.6, 0.6);
    const py = clamp(ctx.ndc.y * 0.6, -0.6, 0.6);
    chart.rotation.x = damp(chart.rotation.x, -0.055 + py * 0.022, 1.6, dt);
    chart.rotation.y = damp(chart.rotation.y, 0.07 + px * 0.035, 1.6, dt);
    chart.rotation.z = damp(chart.rotation.z, -0.015, 1.6, dt);

    camera.position.x = damp(camera.position.x, px * 0.12, 1.8, dt);
    camera.position.y = damp(camera.position.y, (small ? 1.23 : 0.2) + py * 0.08, 1.8, dt);
    camera.position.z = damp(camera.position.z, (small ? 7.1 : 6.8) - (completed ? 0.32 : 0), 1.6, dt);
    camera.lookAt(small ? 0 : 0.18, (small ? 1.16 : 0.1) + py * 0.03, 0);

    if (ambientMode) {
      const at = time - ambientStart;
      camera.position.x = damp(camera.position.x, Math.sin(at * 0.043) * 0.4 + px * 0.24, 0.9, dt);
      camera.position.y = damp(camera.position.y, 0.18 + Math.sin(at * 0.031 + 1.2) * 0.16 + py * 0.12, 0.9, dt);
      camera.position.z = damp(camera.position.z, 8.25, 0.8, dt);
      camera.lookAt(0, 0.05, 0);
    }

    chartDust.rotation.z += dt * 0.005;
    chartDust2.rotation.z -= dt * 0.003;
    chartDust2.rotation.x = -0.32 + Math.sin(time * 0.07) * 0.05;

    if (nameGroup.visible) {
      nameStarTime += dt;
      const pulse = 1 + Math.sin(nameStarTime * 0.9) * 0.07;
      nameHalo.scale.setScalar(0.58 * pulse);
      nameRing.rotation.z += dt * 0.08;
      nameHalo.material.opacity = 0.22 + Math.sin(nameStarTime * 0.7) * 0.04;
    }

    // 节点
    for (const key of MEMORY_KEYS) {
      const node = nodes[key];
      const n = node.meta;
      node.group.position.y = node.group.userData.baseY + Math.sin(time * 0.42 + node.group.userData.phase) * 0.008;
      node.ring.rotation.z += dt * (node.placed ? 0.16 : 0.05);
      node.group.position.z = Math.sin(time * 0.33 + node.group.userData.phase) * (node.placed ? 0.014 : 0.006);
      node.label.el.style.setProperty('--node-color', n.color);

      if (node.placed) {
        node.life = damp(node.life, 1, 3.4, dt);
        const l = node.life;
        node.life = l;
        node.halo.material.opacity = 0.26 + Math.sin(time * 1.1 + n.index) * 0.04;
        node.core.material.opacity = 0.85;
        node.core.scale.setScalar(0.22 + Math.sin(time * 1.4 + n.index) * 0.006);
        node.ring.material.opacity = 0.42;
        node.empty.material.opacity = damp(node.empty.material.opacity, 0, 3, dt);
        node.orbitRing.material.opacity = 0.13 + Math.sin(time * 0.7 + n.index) * 0.025;
        node.orbitRing.rotation.z -= dt * 0.04;
        node.holder.scale.setScalar(0.6 + node.life * 0.4);
        node.relic.group.scale.setScalar(Math.max(0.001, node.life));
        node.orbitAngle += dt * (0.13 + n.index * 0.012);
        node.holder.position.set(Math.cos(node.orbitAngle) * 0.33, Math.sin(node.orbitAngle) * 0.33, 0.06);
        node.relic.update(dt, time);
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.8 + n.index * 1.4);
        node.halo.material.opacity = 0.03 + pulse * 0.025;
        node.core.material.opacity = 0.1 + pulse * 0.06;
        node.core.scale.setScalar(0.16 + pulse * 0.02);
        node.ring.material.opacity = 0.1 + pulse * 0.08;
        node.empty.material.opacity = 0.06 + pulse * 0.035;
        node.orbitRing.material.opacity = 0;
        node.holder.visible = false;
      }

      // 悬停/回放
      const targetScale = node.hover && !node.placed ? 1.18 : 1;
      node.ring.scale.x = damp(node.ring.scale.x, targetScale, 5, dt);
      node.ring.scale.y = node.ring.scale.x;
      node.empty.scale.setScalar(damp(node.empty.scale.x, node.hover && !node.placed ? 1.08 : 1, 5, dt));
      node.replay = Math.max(0, node.replay - dt * 1.4);

      // 冲击环
      if (node.shockT < 1) {
        node.shockT = Math.min(1, node.shockT + dt / 0.9);
        const s = 0.08 + easing.outCubic(node.shockT) * 1.15;
        node.shock.scale.setScalar(s);
        node.shock.material.opacity = 0.75 * (1 - node.shockT);
      } else {
        node.shock.material.opacity = 0;
      }

      for (const s of node.sparks) {
        if (s.t >= 1) {
          s.sprite.visible = false;
          continue;
        }
        s.t = Math.min(1, s.t + dt / (0.7 + Math.random() * 0.2));
        const d = easing.outCubic(s.t) * 0.42;
        s.sprite.position.set(s.dx * d, s.dy * d, 0.01);
        s.sprite.material.opacity = 0.7 * (1 - s.t);
        s.sprite.scale.setScalar(0.025 * (1 - s.t * 0.7));
      }

      if (node.hover && !node.placed && ctx.pointerActive) {
        node.label.el.classList.add('is-hot');
      }
    }

    // 完成时的星环
    const ft = completed ? 1 : 0;
    finalReveal = damp(finalReveal, ft, 2.2, dt);
    finalRingMat.opacity = 0.34 * finalReveal;
    finalRing.scale.setScalar(0.72 + finalReveal * 0.28);
    finalHalo.material.opacity = 0.11 * finalReveal;
    finalHalo.scale.setScalar(4.7 + Math.sin(time * 0.5) * 0.12);

    updateLinks(dt);
    updateFlights(dt);
    updateRipples(dt);

    if (ambientMode) {
      updateAmbientVisitors(dt);
      if (time >= ambientNext) {
        const spawned = spawnAmbientVisitor();
        const gap = isSmall() ? 7 + visitorRng() * 8 : 9 + visitorRng() * 10;
        ambientNext = time + (spawned ? gap : 4);
      }
    } else {
      // 场景悬停
      if (ctx.pointerActive && !dragging) {
        raycaster.setFromCamera(ctx.ndc, camera);
        const hit = raycaster.intersectObjects(hitMeshes, false)[0];
        const key = hit?.object?.userData?.key || null;
        if (key !== sceneHover) {
          sceneHover = key;
          refreshHover();
        }
      } else if (!ctx.pointerActive && sceneHover) {
        sceneHover = null;
        refreshHover();
      }

      updateLabels();
    }
  }

  applyLayoutConstants();
  function applyLayoutConstants() {
    if (isSmall()) {
      camera.position.set(0, 1.23, 7.1);
      camera.lookAt(0, 1.16, 0);
    } else {
      camera.position.set(0, 0.2, 6.8);
      camera.lookAt(0.18, 0.1, 0);
    }
  }

  return {
    id: 'finale',
    title: '你的星空',
    scene,
    camera,
    bloom: 0.9,
    exposure: 1.02,
    content,
    onShow,
    onHide,
    update,
    pointerMove,
    pointerDown,
    pointerUp,
    reset() {
      clearTimers();
      leaveAmbientMode();
      for (const v of visitorPool.values()) {
        v.active = false;
        v.group.visible = false;
      }
      activeVisitors.length = 0;
      chart.visible = true;
      for (const f of flights.slice()) {
        f.done = true;
        scene.remove(f.group);
        f.trail.forEach((s) => {
          scene.remove(s);
          s.material.dispose();
        });
        f.mote.material.dispose();
        f.core.material.dispose();
      }
      flights.length = 0;
      flying.clear();
      ctx.state.placed.clear();
      ctx.state.finaleDone = false;
      completed = false;
      completionApplied = false;
      finalReveal = 0;
      reveal = 0;
      hoverKey = null;
      sceneHover = null;
      railHover = null;
      nameGroup.visible = false;
      nameLabel.hide();
      nameLink.reveal = 0;
      nameLink.target = 0;
      for (const key of MEMORY_KEYS) {
        const node = nodes[key];
        node.placed = false;
        node.life = 0;
        node.shockT = 1;
        node.replay = 0;
        node.hover = false;
        node.holder.visible = false;
        node.holder.scale.setScalar(0.001);
        node.label.hide();
        node.label.el.classList.remove('is-hot');
        node.label.el.classList.add('is-dim');
        node.empty.material.opacity = 0.09;
        node.orbitRing.material.opacity = 0;
        for (const s of node.sparks) {
          s.t = 1;
          s.sprite.visible = false;
        }
      }
      for (const link of links) {
        link.reveal = 0;
        link.target = 0;
      }
      finalRingMat.opacity = 0;
      finalHalo.material.opacity = 0;
      ctx.ui.clearAction();
      ctx.ui.clearDetail();
    },
    get done() {
      return completed;
    },
  };
}
