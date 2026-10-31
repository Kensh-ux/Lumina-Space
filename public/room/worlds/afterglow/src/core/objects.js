import * as THREE from 'three';
import { NOISE } from './shaders.js';
import { softTexture } from './sky.js';

const STAR_VERT = /* glsl */ `
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

const STAR_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uHeat;
uniform float uScale;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vWorldPos;
${NOISE}
void main(){
  vec3 p = normalize(vObj);
  vec3 q = p * uScale + vec3(uSeed, uSeed * 1.7, uSeed * 0.3);
  float n1 = fbm3(q + vec3(0.0, uTime * 0.025, 0.0));
  float n2 = fbm3(q * 2.15 + n1 * 1.1 - vec3(uTime * 0.04, 0.0, 0.0));
  float cells = smoothstep(0.34, 0.78, n1 * 0.58 + n2 * 0.56);
  float fine = smoothstep(0.46, 0.92, n2);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float limb = pow(clamp(dot(normalize(vNormalW), V), 0.0, 1.0), 0.38);
  vec3 col = mix(uColorA, uColorB, cells);
  col = mix(col, uColorC, pow(cells, 2.2) * 0.75);
  col += uColorC * pow(fine, 3.0) * 0.55;
  col *= (0.35 + 0.85 * limb) * uHeat;
  // 边缘一圈更暗，像真正的大气层压住了光
  float rim = smoothstep(0.0, 0.55, limb);
  col *= 0.62 + rim * 0.55;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createStar({
  radius = 1,
  colorA = '#6a0d05',
  colorB = '#ff5a1a',
  colorC = '#ffd08a',
  seed = 3,
  heat = 1,
  scaleNoise = 3.2,
  glowScale = 1,
  glowColor = '#ffb46b',
  detail = 96,
} = {}) {
  const group = new THREE.Group();
  const uniforms = {
    uTime: { value: 0 },
    uSeed: { value: seed },
    uHeat: { value: heat },
    uScale: { value: scaleNoise },
    uColorA: { value: new THREE.Color(colorA) },
    uColorB: { value: new THREE.Color(colorB) },
    uColorC: { value: new THREE.Color(colorC) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, detail, detail), mat);
  group.add(mesh);

  const halo1 = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: softTexture('soft'),
      color: new THREE.Color(colorC),
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  halo1.scale.setScalar(radius * 7 * glowScale);
  group.add(halo1);

  const halo2 = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: softTexture('soft'),
      color: new THREE.Color(glowColor),
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  halo2.scale.setScalar(radius * 16 * glowScale);
  group.add(halo2);

  let t = 0;
  function update(dt) {
    t += dt;
    uniforms.uTime.value = t;
    const pulse = 1 + Math.sin(t * 0.7 + seed) * 0.012;
    halo1.scale.setScalar(radius * 7 * glowScale * pulse);
    halo2.scale.setScalar(radius * 16 * glowScale * (1 + Math.sin(t * 0.32 + 2.0) * 0.02));
  }
  return { group, mesh, uniforms, halo1, halo2, update, setHeat: (v) => (uniforms.uHeat.value = v) };
}

// —————————————— 海洋行星 ——————————————
const PLANET_VERT = /* glsl */ `
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

const PLANET_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uTide;
uniform vec3 uLightDir;
uniform vec3 uMoonDir;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSand;
uniform vec3 uMoss;
uniform vec3 uIce;
uniform vec3 uGlow;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vWorldPos;
${NOISE}
void main(){
  vec3 p = normalize(vObj);
  vec3 seedv = vec3(uSeed);
  float continent = fbm3(p * 1.55 + seedv) * 0.74 + fbm3(p * 3.7 - seedv * 0.6) * 0.26;
  float shelf = smoothstep(0.455, 0.515, continent);
  float land = smoothstep(0.515, 0.535, continent);
  float mountains = smoothstep(0.58, 0.72, continent + fbm3low(p * 8.0 + seedv) * 0.08);
  float lat = abs(p.y);
  float ice = smoothstep(0.72, 0.88, lat + (fbm3low(p * 5.0 + seedv) - 0.5) * 0.12);
  ice = max(ice, smoothstep(0.88, 0.97, lat));

  vec3 ocean = mix(uDeep, uShallow, smoothstep(0.28, 0.52, continent));
  ocean += uShallow * 0.18 * pow(max(0.0, 1.0 - lat * 2.2), 2.0);
  vec3 ground = mix(uSand, uMoss, smoothstep(0.53, 0.66, continent));
  ground = mix(ground, uSand * 1.15, mountains);

  vec3 col = mix(ocean, ground, land);
  col = mix(col, uIce, ice);

  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 H = normalize(L + V);
  float ndl = dot(N, L);
  float day = smoothstep(-0.16, 0.32, ndl);
  float spec = pow(max(dot(N, H), 0.0), 110.0) * (1.0 - land) * smoothstep(0.0, 0.25, ndl);
  spec += pow(max(dot(N, H), 0.0), 26.0) * 0.18 * (1.0 - land);
  vec3 lit = col * (0.045 + day * 1.08);
  lit += vec3(1.0, 0.78, 0.48) * spec * 0.85;
  // 晨昏线暖色
  float term = smoothstep(0.25, 0.0, abs(ndl + 0.02)) * 0.24;
  lit += vec3(1.0, 0.42, 0.16) * term;

  // 夜面海岸生物荧光
  float night = smoothstep(0.08, -0.32, ndl);
  float coast = smoothstep(0.535, 0.505, continent) * smoothstep(0.46, 0.5, continent);
  float glow = (coast * 0.65 + 0.06) * night * uGlow.r;
  lit += uGlow * glow * 0.6;

  // 月亮落下的潮汐辉光
  float moonFace = pow(max(dot(N, normalize(uMoonDir)), 0.0), 10.0);
  float tideGlow = moonFace * uTide * (1.0 + 0.4 * sin(uTime * 0.8));
  lit += uGlow * tideGlow * (0.45 + 0.55 * (1.0 - land)) * 1.3;

  // 云影与细微大气散射
  float cloudShadow = smoothstep(0.5, 0.72, fbm3low(p * 3.1 + vec3(uTime * 0.005, 0.0, 0.0))) * 0.14;
  lit *= 1.0 - cloudShadow * day;

  gl_FragColor = vec4(lit, 1.0);
}
`;

const CLOUD_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform vec3 uLightDir;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vWorldPos;
${NOISE}
void main(){
  vec3 p = normalize(vObj);
  vec3 q = p * 3.2 + vec3(uTime * 0.014, 0.0, uSeed);
  float n = fbm3(q) * 0.7 + fbm3low(q * 2.4 + 1.7) * 0.3;
  float mask = smoothstep(0.52, 0.72, n);
  float band = smoothstep(0.05, 0.3, abs(p.y)) * 0.45 + 0.55;
  float alpha = mask * band * 0.55;
  vec3 N = normalize(vNormalW);
  float ndl = max(dot(N, normalize(uLightDir)), 0.0);
  vec3 col = mix(vec3(0.32, 0.42, 0.48), vec3(1.0, 0.94, 0.84), smoothstep(-0.2, 0.7, ndl));
  gl_FragColor = vec4(col, alpha);
}
`;

const ATMO_FRAG = /* glsl */ `
uniform vec3 uLightDir;
uniform vec3 uColor;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float rim = pow(1.0 - abs(dot(N, V)), 2.6);
  float light = smoothstep(-0.35, 0.65, dot(N, normalize(uLightDir)));
  vec3 col = uColor * rim * (0.3 + light * 1.1);
  float alpha = rim * (0.25 + light * 0.75);
  gl_FragColor = vec4(col, alpha);
}
`;

const RING_VERT = /* glsl */ `
varying vec3 vLocal;
varying vec3 vWorldPos;
void main(){
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const RING_FRAG = /* glsl */ `
uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec3 vLocal;
varying vec3 vWorldPos;
${NOISE}
void main(){
  float r = length(vLocal.xy);
  float x = (r - uInner) / (uOuter - uInner);
  float bands = noise3(vec3(x * 42.0, 0.0, 1.3)) * 0.5 + noise3(vec3(x * 120.0, 3.1, 0.0)) * 0.5;
  float mask = smoothstep(0.0, 0.05, x) * smoothstep(1.0, 0.92, x);
  float gap = smoothstep(0.36, 0.38, x) * smoothstep(0.43, 0.41, x);
  float alpha = mask * (0.12 + bands * 0.5) * (1.0 - gap * 0.8);
  alpha *= 0.7;
  vec3 col = mix(uColorA, uColorB, smoothstep(0.1, 0.9, x));
  // 内外缘的细亮线
  float edge = exp(-abs(x - 0.02) * 80.0) + exp(-abs(x - 0.97) * 120.0);
  col += uColorB * edge * 0.6;
  alpha += edge * 0.16;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

export function createOceanPlanet({
  radius = 1,
  detail = 128,
  seed = 4.2,
  rings = true,
  lightDir = new THREE.Vector3(-1, 0.45, 0.55).normalize(),
  colors = {},
} = {}) {
  const group = new THREE.Group();
  const uniforms = {
    uTime: { value: 0 },
    uSeed: { value: seed },
    uTide: { value: 0 },
    uLightDir: { value: lightDir.clone() },
    uMoonDir: { value: new THREE.Vector3(1, 0, 0) },
    uDeep: { value: new THREE.Color(colors.deep || '#03151f') },
    uShallow: { value: new THREE.Color(colors.shallow || '#0c4c5a') },
    uSand: { value: new THREE.Color(colors.sand || '#8f7f5a') },
    uMoss: { value: new THREE.Color(colors.moss || '#596b4b') },
    uIce: { value: new THREE.Color(colors.ice || '#dbe7e6') },
    uGlow: { value: new THREE.Color(colors.glow || '#54e0c3') },
  };
  const planetMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: PLANET_VERT,
    fragmentShader: PLANET_FRAG,
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(radius, detail, Math.floor(detail * 0.7)), planetMat);
  group.add(planet);

  const cloudUniforms = {
    uTime: { value: 0 },
    uSeed: { value: seed * 1.7 },
    uLightDir: { value: lightDir.clone() },
  };
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: cloudUniforms,
    vertexShader: PLANET_VERT,
    fragmentShader: CLOUD_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.012, detail, Math.floor(detail * 0.7)), cloudMat);
  group.add(clouds);

  const atmoUniforms = {
    uLightDir: { value: lightDir.clone() },
    uColor: { value: new THREE.Color(colors.atmosphere || '#8dc8d8') },
  };
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.055, detail, Math.floor(detail * 0.7)),
    new THREE.ShaderMaterial({
      uniforms: atmoUniforms,
      vertexShader: PLANET_VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(atmo);

  let ring = null;
  if (rings) {
    const inner = radius * 1.55;
    const outer = radius * 2.55;
    const ringUniforms = {
      uTime: { value: 0 },
      uInner: { value: inner },
      uOuter: { value: outer },
      uColorA: { value: new THREE.Color(colors.ringA || '#b9a58a') },
      uColorB: { value: new THREE.Color(colors.ringB || '#dfd0b2') },
    };
    ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 180, 1),
      new THREE.ShaderMaterial({
        uniforms: ringUniforms,
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = 0.08;
    group.add(ring);
  }

  let t = 0;
  function update(dt, spin = 0.015) {
    t += dt;
    uniforms.uTime.value = t;
    cloudUniforms.uTime.value = t;
    if (ring) ring.material.uniforms.uTime.value = t;
    planet.rotation.y += spin * dt * 20;
    clouds.rotation.y += spin * 1.5 * dt * 20;
  }
  return { group, planet, clouds, atmo, ring, uniforms, cloudUniforms, update, radius };
}

export function createRingSprite(color = '#ffd6a0', size = 1, opacity = 0.8) {
  const mat = new THREE.SpriteMaterial({
    map: softTexture('ring'),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(size);
  return sprite;
}

export function createPointLabelSprite(text, color = '#f3e3c3', scale = 0.5) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = '44px "Noto Serif SC", serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })
  );
  sprite.scale.set(scale * 4, scale, 1);
  return sprite;
}
