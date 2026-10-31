import * as THREE from 'three';
import { NOISE, STARS, VERT_PASS } from './shaders.js';
import { rand, mulberry32, isSmall } from './util.js';

const TEX_CACHE = new Map();

export function softTexture(kind = 'soft', size = 256) {
  const key = kind + size;
  if (TEX_CACHE.has(key)) return TEX_CACHE.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  if (kind === 'soft') {
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.12, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.22)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.03)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (kind === 'flare') {
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.06, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.22, 'rgba(255,255,255,0.16)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.02)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate((i * Math.PI) / 4 + Math.PI / 8);
      const len = i < 2 ? c * 0.95 : c * 0.55;
      const grad = ctx.createLinearGradient(-len, 0, len, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.32)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.32)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-len, -1.2, len * 2, 2.4);
      ctx.restore();
    }
  } else if (kind === 'ring') {
    const g = ctx.createRadialGradient(c, c, c * 0.36, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.72, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.86, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.94, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  } else if (kind === 'bokeh') {
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.34)');
    g.addColorStop(0.82, 'rgba(255,255,255,0.12)');
    g.addColorStop(0.94, 'rgba(255,255,255,0.42)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  TEX_CACHE.set(key, tex);
  return tex;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uNebA;
uniform vec3 uNebB;
uniform vec3 uHorizon;
uniform float uIntensity;
uniform float uTime;
uniform float uHorizonStrength;
varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir);
  float h = smoothstep(-0.6, 0.9, d.y);
  vec3 col = mix(uBottom, uTop, h);
  float n = fbm3(d * 2.5 + vec3(0.0, uTime * 0.003, 0.0));
  float cloud = pow(smoothstep(0.40, 0.85, n), 2.0);
  float n2 = fbm3low(d * 6.0 - vec3(uTime * 0.006, 0.0, 0.0));
  float wisp = pow(smoothstep(0.52, 0.9, n2), 3.0);
  col += uNebA * cloud * uIntensity;
  col += uNebB * wisp * uIntensity * 0.6;
  float horizon = smoothstep(0.1, -0.35, d.y);
  col = mix(col, uHorizon, horizon * uHorizonStrength * smoothstep(0.55, 0.95, n * 0.7 + 0.3));
  // 消除色带
  col += (hash21(gl_FragCoord.xy) - 0.5) * 0.0035;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createSky(opts = {}) {
  const {
    top = '#04070d',
    bottom = '#0a1019',
    nebA = '#1a2b3a',
    nebB = '#1d2a2a',
    nebIntensity = 0.5,
    horizon = '#000000',
    horizonStrength = 0.0,
    starCount = isSmall() ? 1800 : 4200,
    heroStars = [],
    seed = 7,
    renderOrder = -20,
  } = opts;

  const group = new THREE.Group();
  group.name = 'sky';

  const domeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uBottom: { value: new THREE.Color(bottom) },
      uNebA: { value: new THREE.Color(nebA) },
      uNebB: { value: new THREE.Color(nebB) },
      uIntensity: { value: nebIntensity },
      uHorizon: { value: new THREE.Color(horizon) },
      uHorizonStrength: { value: horizonStrength },
      uTime: { value: 0 },
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(70, 48, 32), domeMat);
  dome.renderOrder = renderOrder;
  dome.frustumCulled = false;
  group.add(dome);

  // 星点
  const rng = mulberry32(seed * 9973 + 11);
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const phases = new Float32Array(starCount);
  const col = new THREE.Color();
  for (let i = 0; i < starCount; i++) {
    const u = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const r = 42 + rng() * 16;
    const s = Math.sqrt(1 - u * u);
    positions[i * 3] = Math.cos(theta) * s * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = Math.sin(theta) * s * r;
    const temp = rng();
    if (temp > 0.9) col.setRGB(1.0, 0.82, 0.62);
    else if (temp > 0.7) col.setRGB(0.82, 0.9, 1.0);
    else col.setRGB(1.0, 0.98, 0.94);
    const b = 0.35 + Math.pow(rng(), 2.5) * 0.9;
    colors[i * 3] = col.r * b;
    colors[i * 3 + 1] = col.g * b;
    colors[i * 3 + 2] = col.b * b;
    sizes[i] = 0.12 + Math.pow(rng(), 3.0) * 0.55;
    phases[i] = rng() * Math.PI * 2;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uDpr;
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float twinkle = 0.72 + 0.28 * sin(uTime * 0.55 + aPhase * 3.1);
        vAlpha = twinkle;
        vColor = aColor;
        gl_PointSize = aSize * uDpr * (310.0 / max(-mv.z, 1.0));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float a = smoothstep(0.5, 0.02, d);
        a = pow(a, 1.8);
        gl_FragColor = vec4(vColor * vAlpha, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = renderOrder + 1;
  stars.frustumCulled = false;
  group.add(stars);

  // 亮星 / 光晕
  const flares = [];
  for (const h of heroStars) {
    const mat = new THREE.SpriteMaterial({
      map: softTexture('flare'),
      color: new THREE.Color(h.color || '#ffe8c8'),
      transparent: true,
      opacity: h.opacity ?? 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    const pos = h.pos ? new THREE.Vector3(...h.pos) : new THREE.Vector3(rand(-30, 30), rand(-10, 20), -40);
    sprite.position.copy(pos);
    const s = h.scale ?? 4;
    sprite.scale.set(s, s, 1);
    sprite.renderOrder = renderOrder + 2;
    group.add(sprite);
    flares.push({ sprite, base: s, phase: rand(0, 10) });
  }

  // 漂浮尘埃
  const dustCount = isSmall() ? 90 : 220;
  const dustPos = new Float32Array(dustCount * 3);
  const dustRng = mulberry32(seed * 131 + 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (dustRng() - 0.5) * 11;
    dustPos[i * 3 + 1] = (dustRng() - 0.5) * 7;
    dustPos[i * 3 + 2] = (dustRng() - 0.5) * 5 + 1;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    map: softTexture('bokeh', 128),
    color: new THREE.Color(opts.dustColor || '#cdbb9b'),
    size: 0.055,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.renderOrder = 20;
  group.add(dust);

  let time = 0;
  function update(dt) {
    time += dt;
    domeMat.uniforms.uTime.value = time;
    starMat.uniforms.uTime.value = time;
    stars.rotation.y = time * 0.0018;
    dust.rotation.y = time * 0.004;
    dust.position.y = Math.sin(time * 0.05) * 0.12;
    for (const f of flares) {
      const k = 1 + Math.sin(time * 0.35 + f.phase) * 0.025;
      f.sprite.scale.set(f.base * k, f.base * k, 1);
    }
  }

  return { group, update, dome, stars, dust, setNebIntensity: (v) => (domeMat.uniforms.uIntensity.value = v) };
}

export function createGlowSprite(color = '#ffe4b0', scale = 1, opacity = 1, kind = 'soft') {
  const mat = new THREE.SpriteMaterial({
    map: softTexture(kind),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

// 在球面上撒一圈细尘
export function createOrbitDust({ count = 600, radius = 2, spread = 0.25, color = '#cdd8e6', size = 0.03, seed = 1 }) {
  const rng = mulberry32(seed);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = radius + (rng() - 0.5) * spread;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = (rng() - 0.5) * spread * 0.7;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: softTexture('soft', 64),
    color: new THREE.Color(color),
    size,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

export { SKY_VERT, SKY_FRAG };
