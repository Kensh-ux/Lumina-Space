import * as THREE from 'three';
import { clamp } from '../util.js';

const SEA_NOISE = /* glsl */`
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm2(vec2 p) {
    float v = 0.0;
    float amp = 0.55;
    for (int i = 0; i < 4; i++) {
      v += amp * noise2(p);
      p = p * 2.03 + vec2(11.7, 5.1);
      amp *= 0.5;
    }
    return v;
  }
`;

export class Sea {
  constructor(scene) {
    this.scene = scene;
    this.flashValue = 0;

    this.uniforms = {
      uTime: { value: 0 },
      uWave: { value: 0.34 },
      uStorm: { value: 0 },
      uFog: { value: 0.0115 },
      uDeep: { value: new THREE.Color('#02060d') },
      uShallow: { value: new THREE.Color('#081521') },
      uHorizon: { value: new THREE.Color('#0b2237') },
      uSkyTop: { value: new THREE.Color('#02040c') },
      uGlow: { value: new THREE.Color('#547fa4') },
      uMoonColor: { value: new THREE.Color('#dfeaff') },
      uMoonPos: { value: new THREE.Vector3(-52, 31, -128) },
      uCoreColor: { value: new THREE.Color('#ffd7a3') },
      uCorePos: { value: new THREE.Vector3(0, 5.6, 0) },
      uAccent: { value: new THREE.Color('#e7c88d') },
      uAurora: { value: 0 },
      uAuroraColor: { value: new THREE.Color('#5bffc8') },
      uEclipse: { value: 0 },
      uFlash: { value: 0 },
      uPixelRatio: { value: 1 },
    };

    const geo = new THREE.PlaneGeometry(640, 640, 190, 190);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`
        uniform float uTime, uWave, uStorm, uFog;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying float vHeight;
        varying float vDist;

        float waveHeight(vec2 p) {
          float t = uTime;
          float amp = 0.10 + uWave * 0.30;
          float h = 0.0;
          h += sin(p.x * 0.165 + t * 0.54) * amp;
          h += sin(p.y * 0.215 - t * 0.43) * amp * 0.72;
          h += sin((p.x * 0.095 + p.y * 0.155) + t * 0.31) * amp * 0.55;
          h += sin((p.x * 0.38 - p.y * 0.29) - t * 0.92) * amp * (0.16 + uStorm * 0.24);
          h += sin((p.x * 0.72 + p.y * 0.61) + t * 1.35) * amp * (0.05 + uStorm * 0.12);
          return h;
        }

        void main() {
          vec3 p = position;
          float h = waveHeight(p.xz);
          p.y += h;
          float e = 0.32;
          float hx = waveHeight(p.xz + vec2(e, 0.0)) - waveHeight(p.xz - vec2(e, 0.0));
          float hz = waveHeight(p.xz + vec2(0.0, e)) - waveHeight(p.xz - vec2(0.0, e));
          vec3 n = normalize(vec3(-hx / (2.0 * e), 1.0, -hz / (2.0 * e)));
          float dist = length(p.xz - cameraPosition.xz);
          n = mix(n, vec3(0.0, 1.0, 0.0), smoothstep(90.0, 290.0, dist) * 0.68);
          vDist = dist;
          vWorld = p;
          vNormalW = n;
          vHeight = h;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        uniform float uTime, uWave, uStorm, uFog, uAurora, uEclipse, uFlash;
        uniform vec3 uDeep, uShallow, uHorizon, uSkyTop, uGlow, uMoonColor, uMoonPos;
        uniform vec3 uCoreColor, uCorePos, uAccent, uAuroraColor;
        varying vec3 vWorld;
        varying vec3 vNormalW;
        varying float vHeight;
        varying float vDist;
        ${SEA_NOISE}

        void main() {
          vec3 N = normalize(vNormalW);
          vec3 V = normalize(cameraPosition - vWorld);
          float ndv = clamp(dot(N, V), 0.0, 1.0);
          float fres = pow(1.0 - ndv, 4.0);
          float near = smoothstep(0.0, 26.0, vDist);
          float haze = smoothstep(40.0, 320.0, vDist);

          vec3 base = mix(uDeep, uShallow, 0.28 + fres * 0.45);
          base = mix(base, uHorizon, fres * 0.28);
          base *= 0.9 + near * 0.12;

          // moon path
          vec3 L = normalize(uMoonPos - vWorld);
          vec3 H = normalize(L + V);
          float moonSpec = pow(max(dot(N, H), 0.0), 220.0);
          float moonSheen = pow(max(dot(N, H), 0.0), 20.0);
          float glitter = smoothstep(0.58, 0.9, fbm2(vWorld.xz * 1.85 + vec2(uTime * 0.035, -uTime * 0.022)));
          vec3 col = base;
          col += uMoonColor * (moonSpec * (0.95 + glitter * 1.8) + moonSheen * 0.045);
          col += uGlow * fres * 0.1;

          // the astrolabe's reflection: a soft amber column in the water
          vec3 L2 = normalize(uCorePos - vWorld);
          vec3 H2 = normalize(L2 + V);
          float coreSpec = pow(max(dot(N, H2), 0.0), 110.0);
          float coreSheen = pow(max(dot(N, H2), 0.0), 8.0);
          float column = exp(-abs(vWorld.x - uCorePos.x) * 0.3);
          float reach = smoothstep(38.0, -4.0, vWorld.z) * smoothstep(-72.0, -8.0, vWorld.z + 8.0);
          float broken = 0.55 + 0.45 * fbm2(vec2(vWorld.x * 0.45, vWorld.z * 0.22 + uTime * 0.04));
          col += uCoreColor * (coreSpec * 1.7 + coreSheen * 0.04);
          col += uCoreColor * column * reach * broken * 0.032;

          // crest light and storm foam
          float crest = smoothstep(0.12, 0.32, vHeight + uWave * 0.09);
          col += uGlow * crest * 0.045 * uWave;
          float foamNoise = fbm2(vWorld.xz * 1.4 + vec2(uTime * 0.1, uTime * 0.05));
          float foam = smoothstep(0.62, 0.88, foamNoise) * smoothstep(0.18, 0.42, vHeight) * uStorm;
          col = mix(col, uGlow * 0.9 + uAccent * 0.15, foam * 0.22);

          // aurora reflected on the face of the water
          col += uAuroraColor * fres * uAurora * 0.11;

          // eclipse makes the water almost black, with blood-red edges
          col = mix(col, col * vec3(0.75, 0.45, 0.5), uEclipse * 0.62);
          col += uCoreColor * fres * uEclipse * 0.08;

          // lightning bloom
          col += vec3(0.55, 0.68, 0.78) * uFlash * (0.18 + fres * 0.6);

          // distance haze into the exact sky horizon colour
          col = mix(col, uHorizon, clamp(haze, 0.0, 1.0));
          col += uGlow * smoothstep(120.0, 320.0, vDist) * 0.02;

          // fine dither
          col += (hash21(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0;
    this.scene.add(this.mesh);
  }

  setPalette(p) {
    const u = this.uniforms;
    u.uWave.value = p.wave;
    u.uStorm.value = p.storm;
    u.uFog.value = p.fogDensity;
    u.uDeep.value.copy(p.seaDeep);
    u.uShallow.value.copy(p.seaShallow);
    u.uHorizon.value.copy(p.seaHorizon);
    u.uSkyTop.value.copy(p.skyTop);
    u.uGlow.value.copy(p.skyGlow);
    u.uMoonColor.value.copy(p.moon);
    u.uCoreColor.value.copy(p.core);
    u.uAccent.value.copy(p.accent);
    u.uAurora.value = p.aurora;
    u.uAuroraColor.value.copy(p.auroraA);
    u.uEclipse.value = p.eclipse;
  }

  setCorePosition(v) {
    this.uniforms.uCorePos.value.copy(v);
  }

  flash(amount = 1) {
    this.flashValue = Math.max(this.flashValue, amount);
  }

  update(dt, elapsed) {
    this.uniforms.uTime.value = elapsed;
    this.flashValue = Math.max(0, this.flashValue - dt * 8.5);
    this.uniforms.uFlash.value = this.flashValue;
  }
}
