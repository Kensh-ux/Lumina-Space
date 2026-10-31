import * as THREE from 'three';
import { makeGlowTexture, makeRingTexture, makeStarTexture, rand, tween, after, clamp } from '../util.js';

const NOISE_GLSL = /* glsl */`
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm2(vec2 p) {
    float v = 0.0;
    float amp = 0.55;
    for (int i = 0; i < 5; i++) {
      v += amp * noise2(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      amp *= 0.5;
    }
    return v;
  }
`;


function makeNebulaMask() {
  const w = 1024;
  const h = 512;
  const data = new Uint8Array(w * h * 4);
  const hash = (x, y) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  const noise = (x, y, period) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const wrap = (n) => ((n % period) + period) % period;
    const x0 = wrap(xi);
    const x1 = wrap(xi + 1);
    const a = hash(x0, yi);
    const b = hash(x1, yi);
    const c = hash(x0, yi + 1);
    const d = hash(x1, yi + 1);
    return (a + (b - a) * xf) * (1 - yf) + (c + (d - c) * xf) * yf;
  };
  const fbm = (x, y, period, octaves = 4) => {
    let v = 0;
    let amp = 0.56;
    let f = 1;
    for (let i = 0; i < octaves; i++) {
      v += amp * noise(x * f, y * f + i * 3.7, period * f);
      f *= 2;
      amp *= 0.5;
    }
    return v;
  };
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const warp = fbm(u * 3.0 + 7.0, v * 3.4 + 1.0, 3, 3);
      const cloud = fbm(u * 5.0 + warp * 2.4 + 11.0, v * 7.0 + warp * 0.9, 5, 4);
      const dust = fbm(u * 11.0 + warp * 1.2 + 23.0, v * 9.0, 11, 3);
      const i = (y * w + x) * 4;
      data[i] = Math.max(0, Math.min(255, (cloud - 0.16) * 320));
      data[i + 1] = Math.max(0, Math.min(255, (dust - 0.2) * 400));
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function makeStreakTexture() {
  const el = document.createElement('canvas');
  el.width = 512;
  el.height = 24;
  const ctx = el.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.55, 'rgba(255,255,255,.16)');
  g.addColorStop(0.82, 'rgba(255,255,255,.95)');
  g.addColorStop(0.9, 'rgba(255,255,255,1)');
  g.addColorStop(0.96, 'rgba(255,255,255,.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 24);
  ctx.globalCompositeOperation = 'destination-in';
  const v = ctx.createLinearGradient(0, 0, 0, 24);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.5, 'rgba(0,0,0,1)');
  v.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 512, 24);
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.pixelRatio = 1;
    this.pulseValue = 0;
    this._shooting = [];
    this._shootingTimer = rand(5, 9);
    this._starVisibility = 1;
    this._whaleVisible = true;
    this._buildSky();
    this._buildStars();
    this._buildMoon();
    this._buildAurora();
    this._buildHorizonMist();
  }

  _buildSky() {
    this.uniforms = {
      uTop: { value: new THREE.Color('#02040c') },
      uMid: { value: new THREE.Color('#061226') },
      uHorizon: { value: new THREE.Color('#0c2035') },
      uGlowColor: { value: new THREE.Color('#547fa4') },
      uNebula: { value: new THREE.Color('#294b68') },
      uMoonColor: { value: new THREE.Color('#dfeaff') },
      uMoonDir: { value: new THREE.Vector3(-0.34, 0.24, -1).normalize() },
      uAurora: { value: 0 },
      uAuroraA: { value: new THREE.Color('#5bffc8') },
      uAuroraB: { value: new THREE.Color('#9b86ff') },
      uEclipse: { value: 0 },
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uMask: { value: makeNebulaMask() },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vDir = normalize(world.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vDir;
        uniform vec3 uTop, uMid, uHorizon, uGlowColor, uNebula;
        uniform vec3 uMoonColor, uMoonDir, uAuroraA, uAuroraB;
        uniform float uAurora, uEclipse, uTime, uPulse;
        uniform sampler2D uMask;
        ${NOISE_GLSL}

        void main() {
          vec3 d = normalize(vDir);
          float y = d.y;

          vec3 col = mix(uHorizon, uMid, smoothstep(-0.015, 0.32, y));
          col = mix(col, uTop, smoothstep(0.24, 0.92, y));

          // broad moon bloom toward its bearing
          float md = max(dot(d, normalize(uMoonDir)), 0.0);
          col += uGlowColor * (pow(md, 34.0) * 0.30 + pow(md, 9.0) * 0.045 + pow(md, 2.0) * 0.006);

          // horizon breath, keeps sea and sky visually stitched
          float hz = exp(-pow(max(y, 0.0) / 0.075, 2.0));
          col += uGlowColor * hz * 0.05;

          // slow nebula wash, baked into a seamless mask
          float az = atan(d.z, d.x);
          float el = asin(clamp(y, -1.0, 1.0));
          vec3 mask = texture2D(uMask, vec2(az / 6.28318530718 + 0.5, el / 3.14159265359 + 0.5)).rgb;
          float cloud = mask.r * smoothstep(-0.06, 0.35, y) * smoothstep(1.1, 0.2, y);
          col = mix(col, uNebula, cloud * 0.26);

          // distant star haze in the band of the Milky Way
          float band = exp(-pow((y - 0.18 - sin(az * 1.4) * 0.10) / 0.17, 2.0));
          col += uGlowColor * band * smoothstep(0.3, 0.74, mask.g) * 0.045;

          // a low veil of sea-mist drinks the light at the waterline
          float mist = exp(-pow(max(y, 0.0) / 0.032, 2.0));
          col = mix(col, uHorizon * 1.04 + uGlowColor * 0.012, mist * 0.5);

          // aurora curtains
          if (uAurora > 0.001) {
            float curtainNoise = fbm2(vec2(az * 6.0 + uTime * 0.014, el * 3.5 - uTime * 0.01));
            float ribbonA = exp(-pow((y - 0.28 - 0.05 * sin(az * 3.2 + uTime * 0.02)) / 0.085, 2.0));
            float ribbonB = exp(-pow((y - 0.46 + 0.035 * sin(az * 4.1 - uTime * 0.017)) / 0.055, 2.0));
            float curtain = smoothstep(0.32, 0.72, curtainNoise);
            float rays = smoothstep(0.4, 0.78, fbm2(vec2(az * 44.0 + uTime * 0.03, el * 1.4)));
            vec3 aur = mix(uAuroraA, uAuroraB, smoothstep(0.18, 0.85, curtainNoise + y * 0.42));
            aur += uAuroraA * pow(max(0.0, 0.65 - y), 2.0) * 0.16;
            col += aur * (ribbonA * 0.22 + ribbonB * 0.12) * (0.12 + curtain * 0.32 + rays * 0.28) * uAurora;
          }

          // the eclipse stains the whole horizon
          if (uEclipse > 0.001) {
            float eclipseGlow = exp(-pow(max(y, 0.0) / 0.16, 2.0));
            col += vec3(0.38, 0.035, 0.05) * eclipseGlow * uEclipse * 0.22;
            col = mix(col, col * vec3(0.72, 0.48, 0.52), uEclipse * smoothstep(0.15, 0.9, y) * 0.35);
          }

          // response pulse for the resonance ritual
          col += uGlowColor * uPulse * 0.07 * smoothstep(0.0, 0.6, y);

          // gentle dithering to avoid banding in the very dark gradients
          float dither = (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
          col += dither;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const geo = new THREE.SphereGeometry(520, 48, 32);
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.renderOrder = -10;
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  _buildStars() {
    this.starUniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0.9 },
      uPulse: { value: 0 },
      uPixelRatio: { value: 1 },
    };

    const makeLayer = (count, radius, sizeMin, sizeMax, bright = false) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const phases = new Float32Array(count);
      const palette = [
        new THREE.Color('#cfe0ff'),
        new THREE.Color('#eaf2ff'),
        new THREE.Color('#ffe7c7'),
        new THREE.Color('#a8c4ff'),
      ];

      for (let i = 0; i < count; i++) {
        // half the stars cluster loosely along a tilted galactic band
        let x, y, z;
        if (i % 3 === 0) {
          const a = rand(0, Math.PI * 2);
          const spread = rand(-0.16, 0.16);
          const elevation = Math.sin(a) * 0.26 + 0.18 + spread;
          y = elevation;
          x = Math.cos(a) * Math.cos(elevation);
          z = Math.sin(a) * Math.cos(elevation);
          const len = Math.sqrt(x * x + y * y + z * z);
          x /= len; y /= len; z /= len;
        } else {
          const u = rand(0.015, 1);
          const v = rand(0, 1);
          y = Math.pow(u, 0.62);
          const theta = v * Math.PI * 2;
          const r = Math.sqrt(Math.max(0, 1 - y * y));
          x = Math.cos(theta) * r;
          z = Math.sin(theta) * r;
        }
        positions[i * 3] = x * radius;
        positions[i * 3 + 1] = y * radius;
        positions[i * 3 + 2] = z * radius;

        const col = palette[Math.floor(rand(0, palette.length))].clone();
        col.multiplyScalar(rand(0.6, 1.2));
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;

        sizes[i] = rand(sizeMin, sizeMax);
        phases[i] = rand(0, Math.PI * 2);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          ...this.starUniforms,
          uAtlas: { value: bright ? makeStarTexture() : makeGlowTexture(128, 0.85) },
          uBright: { value: bright ? 1.0 : 0.0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */`
          attribute vec3 aColor;
          attribute float aSize;
          attribute float aPhase;
          varying vec3 vColor;
          varying float vAlpha;
          uniform float uTime, uOpacity, uPulse, uPixelRatio, uBright;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            float twinkle = 0.68 + 0.32 * sin(uTime * (0.45 + fract(aPhase) * 0.9) + aPhase * 6.0);
            vColor = aColor;
            vAlpha = uOpacity * twinkle * (uBright > 0.5 ? 1.0 : 0.85);
            float scale = 1.0 + uPulse * (uBright > 0.5 ? 1.6 : 0.9);
            gl_PointSize = aSize * uPixelRatio * (260.0 / max(1.0, -mv.z)) * scale;
          }
        `,
        fragmentShader: /* glsl */`
          varying vec3 vColor;
          varying float vAlpha;
          uniform sampler2D uAtlas;
          uniform float uBright, uPulse;
          void main() {
            float a = texture2D(uAtlas, gl_PointCoord).a;
            vec3 col = vColor * (1.0 + uPulse * 0.9 + uBright * 0.35);
            gl_FragColor = vec4(col, a * vAlpha);
            if (gl_FragColor.a < 0.002) discard;
          }
        `,
      });

      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      points.renderOrder = -5;
      this.scene.add(points);
      return { points, material: mat };
    };

    this.starLayer = makeLayer(2400, 330, 1.2, 2.8, false);
    this.brightLayer = makeLayer(90, 322, 14, 34, true);
  }

  _buildMoon() {
    const moonPos = new THREE.Vector3(-54, 36, -128);
    this.moonPos = moonPos;

    this.moonUniforms = {
      uColor: { value: new THREE.Color('#dfeaff') },
      uRim: { value: new THREE.Color('#7fa7d8') },
      uEclipse: { value: 0 },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.moonUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vViewW;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vViewW = normalize(cameraPosition - world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vNormalW;
        varying vec3 vViewW;
        uniform vec3 uColor, uRim;
        uniform float uEclipse, uOpacity, uTime;
        ${NOISE_GLSL}
        void main() {
          vec2 uv = vUv;
          float maria = fbm2(uv * 3.1 + 19.0);
          float craters = fbm2(uv * 8.4 + 4.0);
          float craterRim = smoothstep(0.56, 0.63, craters) * (1.0 - smoothstep(0.63, 0.7, craters));
          float pits = smoothstep(0.62, 0.7, fbm2(uv * 17.0));
          vec3 col = uColor;
          col *= 0.72 + 0.36 * maria - 0.26 * smoothstep(0.5, 0.8, maria);
          col *= 1.0 - 0.28 * pits;
          col += uColor * craterRim * 0.16;
          float ndv = clamp(dot(normalize(vNormalW), normalize(vViewW)), 0.0, 1.0);
          col *= mix(0.42, 1.0, pow(ndv, 0.32));
          col += uRim * pow(1.0 - ndv, 4.5) * (0.5 + uEclipse * 1.4);
          col = mix(col, vec3(0.045, 0.012, 0.017) + uRim * pow(1.0 - ndv, 3.0) * 0.6, uEclipse);
          float halo = smoothstep(0.0, 0.08, ndv);
          gl_FragColor = vec4(col, 1.0) * uOpacity;
        }
      `,
    });

    this.moon = new THREE.Mesh(new THREE.SphereGeometry(8.6, 64, 48), mat);
    this.moon.position.copy(moonPos);
    this.moon.renderOrder = 2;
    this.scene.add(this.moon);

    // halo
    this.haloUniforms = { };
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(512, 1.4),
      color: new THREE.Color('#8cb4e4'),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.halo.position.copy(moonPos);
    this.halo.scale.set(48, 48, 1);
    this.halo.renderOrder = 1;
    this.scene.add(this.halo);

    // eclipse corona
    this.corona = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeRingTexture(512),
      color: new THREE.Color('#ff6266'),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.corona.position.copy(moonPos);
    this.corona.scale.set(52, 52, 1);
    this.corona.renderOrder = 3;
    this.scene.add(this.corona);

    this.moonDirUniform = this.uniforms.uMoonDir.value;
    this.moonDirUniform.copy(moonPos).normalize();
  }

  _buildAurora() {
    this.auroraUniforms = {
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uColorA: { value: new THREE.Color('#5bffc8') },
      uColorB: { value: new THREE.Color('#9b86ff') },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.auroraUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vWorld;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 p = position;
          float t = uTime;
          p.y += sin(p.x * 0.035 + t * 0.10) * 7.0 + sin(p.x * 0.012 - t * 0.06) * 11.0;
          p.z += sin(p.x * 0.02 + t * 0.08) * 6.0;
          vec4 world = modelMatrix * vec4(p, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vWorld;
        uniform float uTime, uAmount;
        uniform vec3 uColorA, uColorB;
        ${NOISE_GLSL}
        void main() {
          float fadeX = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
          float fadeY = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.52, vUv.y);
          float n = fbm2(vec2(vUv.x * 13.0 + uTime * 0.025, vUv.y * 2.2 - uTime * 0.015));
          float folds = fbm2(vec2(vUv.x * 34.0 - uTime * 0.04, vUv.y * 0.7));
          float curtain = smoothstep(0.35, 0.7, n) * (0.45 + folds * 0.8);
          float rays = smoothstep(0.42, 0.78, fbm2(vec2(vUv.x * 76.0 - uTime * 0.05, vUv.y * 1.1)));
          curtain *= 0.5 + rays * 1.05;
          vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.9, n + vUv.y * 0.25));
          float alpha = fadeX * fadeY * (0.045 + curtain * 0.4) * uAmount * 0.55;
          gl_FragColor = vec4(col * (0.8 + curtain * 1.15), alpha);
        }
      `,
    });

    this.auroraGroup = new THREE.Group();
    const specs = [
      { w: 250, h: 52, x: -8, y: 58, z: -155, ry: 0.06, phase: 0, op: 1 },
      { w: 210, h: 40, x: 38, y: 70, z: -162, ry: -0.04, phase: 2.1, op: 0.7 },
      { w: 280, h: 48, x: -48, y: 66, z: -150, ry: 0.12, phase: 4.4, op: 0.55 },
    ];
    this.ribbons = specs.map((s) => {
      const geo = new THREE.PlaneGeometry(s.w, s.h, 96, 1);
      const m = material.clone();
      m.uniforms = {
        ...this.auroraUniforms,
        uAmount: { value: 0 },
      };
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(s.x, s.y, s.z);
      mesh.rotation.y = s.ry;
      mesh.userData = s;
      mesh.renderOrder = -2;
      mesh.frustumCulled = false;
      this.auroraGroup.add(mesh);
      return mesh;
    });
    this.scene.add(this.auroraGroup);
  }


  _buildHorizonMist() {
    this.mistUniforms = {
      uHorizon: { value: new THREE.Color('#0c2035') },
      uGlow: { value: new THREE.Color('#547fa4') },
      uOpacity: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.mistUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec2 vUv;
        uniform vec3 uHorizon, uGlow;
        uniform float uOpacity;
        void main() {
          float band = exp(-pow((vUv.y - 0.5) / 0.055, 2.0));
          float ripple = 0.8 + 0.2 * sin(vUv.x * 26.0);
          vec3 col = uHorizon * 1.15 + uGlow * 0.22;
          gl_FragColor = vec4(col, band * ripple * 0.26 * uOpacity);
        }
      `,
    });
    this.horizonMist = new THREE.Mesh(new THREE.CylinderGeometry(330, 330, 34, 96, 1, true), mat);
    this.horizonMist.position.y = 0.0;
    this.horizonMist.renderOrder = -1;
    this.horizonMist.frustumCulled = false;
    this.scene.add(this.horizonMist);
  }

  setPalette(p) {
    this._palette = p;
    this.uniforms.uTop.value.copy(p.skyTop);
    this.uniforms.uMid.value.copy(p.skyMid);
    this.uniforms.uHorizon.value.copy(p.skyHorizon);
    this.uniforms.uGlowColor.value.copy(p.skyGlow);
    this.uniforms.uNebula.value.copy(p.nebula);
    this.uniforms.uAuroraA.value.copy(p.auroraA);
    this.uniforms.uAuroraB.value.copy(p.auroraB);
    this.uniforms.uAurora.value = p.aurora;
    this.uniforms.uEclipse.value = p.eclipse;
    this.starUniforms.uOpacity.value = p.starOpacity;
    this.moonUniforms.uColor.value.copy(p.moon);
    this.moonUniforms.uRim.value.copy(p.moonRim);
    this.moonUniforms.uEclipse.value = p.eclipse;
    this.moonUniforms.uOpacity.value = p.moonOpacity;
    this.halo.material.color.copy(p.moonRim).lerp(p.moon, 0.35);
    this.halo.material.opacity = p.moonOpacity * 0.3;
    this.corona.material.opacity = p.eclipse * 0.85;
    this.auroraUniforms.uColorA.value.copy(p.auroraA);
    this.auroraUniforms.uColorB.value.copy(p.auroraB);
    this.mistUniforms.uHorizon.value.copy(p.seaHorizon);
    this.mistUniforms.uGlow.value.copy(p.skyGlow);
    this.mistUniforms.uOpacity.value = 0.55 + p.moonOpacity * 0.5;
    this.ribbons.forEach((r, i) => {
      r.material.uniforms.uAmount.value = p.aurora * r.userData.op;
      r.material.uniforms.uColorA.value.copy(p.auroraA);
      r.material.uniforms.uColorB.value.copy(p.auroraB);
    });
  }

  pulse(amount = 1) {
    this.pulseValue = Math.max(this.pulseValue, amount);
    this.uniforms.uPulse.value = this.pulseValue;
    this.starUniforms.uPulse.value = this.pulseValue;
  }

  setWhaleVisible(visible) {
    this._whaleVisible = visible;
  }

  setPixelRatio(value) {
    this.pixelRatio = value;
    this.starUniforms.uPixelRatio.value = value;
  }

  update(dt, elapsed) {
    this.time = elapsed;
    this.uniforms.uTime.value = elapsed;
    this.starUniforms.uTime.value = elapsed;
    this.moonUniforms.uTime.value = elapsed;
    this.auroraUniforms.uTime.value = elapsed;
    this.ribbons.forEach((r, i) => {
      r.material.uniforms.uTime.value = elapsed + r.userData.phase;
    });

    this.pulseValue = Math.max(0, this.pulseValue - dt * 0.9);
    const pulse = this.pulseValue;
    this.uniforms.uPulse.value = pulse;
    this.starUniforms.uPulse.value = pulse;

    // moon breathes very slightly
    const breathe = 1 + Math.sin(elapsed * 0.12) * 0.004;
    this.moon.scale.setScalar(breathe);
    this.halo.scale.setScalar(48 * (1 + Math.sin(elapsed * 0.2) * 0.015));

    this._updateShooting(dt, elapsed);
  }

  _updateShooting(dt, elapsed) {
    if (!this._palette) return;
    const allowed = this._palette.storm < 0.5;
    this._shootingTimer -= dt;
    if (this._shootingTimer <= 0 && allowed) {
      this._spawnShootingStar();
      this._shootingTimer = rand(8, 17);
    }

    for (let i = this._shooting.length - 1; i >= 0; i--) {
      const s = this._shooting[i];
      s.life -= dt / s.duration;
      const t = 1 - clamp(s.life, 0, 1);
      s.mesh.position.x = s.x0 + s.dx * t;
      s.mesh.position.y = s.y0 + s.dy * t;
      s.mesh.material.opacity = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.75;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this._shooting.splice(i, 1);
      }
    }
  }

  _spawnShootingStar(origin = null) {
    if (!this._streakTex) this._streakTex = makeStreakTexture();
    const startX = origin?.x ?? rand(-70, 60);
    const startY = origin?.y ?? rand(26, 68);
    const angle = rand(0.18, 0.42);
    const dist = rand(18, 38);
    const dx = Math.cos(angle) * dist;
    const dy = -Math.sin(angle) * dist;

    const geo = new THREE.PlaneGeometry(1, 0.13);
    const mat = new THREE.MeshBasicMaterial({
      map: this._streakTex,
      color: new THREE.Color('#dbe9ff'),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(startX, startY, -118);
    mesh.scale.set(rand(12, 22), rand(0.7, 1.4), 1);
    mesh.rotation.z = -angle;
    mesh.renderOrder = 3;
    this.scene.add(mesh);
    this._shooting.push({
      mesh,
      x0: startX,
      y0: startY,
      dx,
      dy,
      life: 1,
      duration: rand(0.8, 1.5),
    });
  }

  spawnAtClick(point) {
    const x = clamp(point.x * 6, -80, 80);
    const y = clamp(30 + point.y * 18, 20, 80);
    this._spawnShootingStar({ x, y });
  }
}
