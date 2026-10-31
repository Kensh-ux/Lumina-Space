import * as THREE from 'three';
import {
  makeGlowTexture,
  makeStarTexture,
  tween,
  rand,
  randInt,
  clamp,
  after,
  easeOutCubic,
  easeOutExpo,
} from '../util.js';

const MOTE_VERT = /* glsl */`
  attribute float aSize;
  attribute float aPhase;
  attribute float aTint;
  varying float vTint;
  varying float vAlpha;
  uniform float uTime, uOpacity, uPixelRatio, uDrift;
  void main() {
    vTint = aTint;
    vec3 p = position;
    float a = uTime * 0.028 * (0.5 + aPhase) + aPhase * 6.2831;
    float c = cos(a), s = sin(a);
    p.xz = mat2(c, -s, s, c) * p.xz;
    p.y += sin(uTime * 0.23 + aPhase * 11.0) * uDrift;
    p.x += cos(uTime * 0.17 + aPhase * 7.0) * uDrift * 0.7;
    p.z += sin(uTime * 0.13 + aPhase * 5.0) * uDrift * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (46.0 / max(1.0, -mv.z));
    vAlpha = uOpacity * (0.55 + 0.45 * sin(uTime * (0.5 + aPhase) + aPhase * 12.0));
  }
`;

const MOTE_FRAG = /* glsl */`
  varying float vTint;
  varying float vAlpha;
  uniform vec3 uColor;
  uniform sampler2D uAtlas;
  void main() {
    float a = texture2D(uAtlas, gl_PointCoord).a;
    vec3 cool = vec3(0.55, 0.75, 1.0);
    vec3 col = mix(uColor, cool, vTint * 0.7);
    gl_FragColor = vec4(col * 1.5, a * vAlpha);
    if (gl_FragColor.a < 0.002) discard;
  }
`;

export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.elapsed = 0;
    this.pixelRatio = 1;
    this.lightningTimer = rand(3, 6);
    this.lightningEnabled = false;
    this.onLightning = null;
    this._ripples = [];
    this._buildMotes();
    this._buildRain();
    this._buildRitual();
  }

  _buildMotes() {
    const makeMotes = (count, spread, yCenter, ySpread, zSpread, sizeRange, drift) => {
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const phases = new Float32Array(count);
      const tints = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const r = Math.sqrt(rand()) * spread;
        positions[i * 3] = Math.cos(a) * r;
        positions[i * 3 + 1] = yCenter + rand(-ySpread, ySpread);
        positions[i * 3 + 2] = Math.sin(a) * r * zSpread;
        sizes[i] = rand(sizeRange[0], sizeRange[1]);
        phases[i] = rand();
        tints[i] = rand();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      geo.setAttribute('aTint', new THREE.BufferAttribute(tints, 1));
      const uniforms = {
        uTime: { value: 0 },
        uOpacity: { value: 0.6 },
        uPixelRatio: { value: 1 },
        uDrift: { value: drift },
        uColor: { value: new THREE.Color('#e8cfa2') },
        uAtlas: { value: makeGlowTexture(128, 0.9) },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: MOTE_VERT,
        fragmentShader: MOTE_FRAG,
      });
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      points.renderOrder = 5;
      this.scene.add(points);
      return { points, uniforms };
    };

    this.dust = makeMotes(380, 8.4, 5.85, 4.2, 0.55, [0.6, 2.4], 0.35);
    this.embers = makeMotes(110, 26, 1.0, 1.0, 0.65, [0.7, 2.1], 0.22);
  }

  _buildRain() {
    const drops = 780;
    const positions = new Float32Array(drops * 2 * 3);
    const baseY = new Float32Array(drops * 2);
    const offsets = new Float32Array(drops * 2);
    const tails = new Float32Array(drops * 2);
    for (let i = 0; i < drops; i++) {
      const x = rand(-48, 48);
      const z = rand(-32, 24);
      const y = rand(0, 32);
      const off = rand();
      for (let j = 0; j < 2; j++) {
        const idx = (i * 2 + j);
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = z;
        baseY[idx] = y;
        offsets[idx] = off;
        tails[idx] = j;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aBaseY', new THREE.BufferAttribute(baseY, 1));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));
    geo.setAttribute('aTail', new THREE.BufferAttribute(tails, 1));
    this.rainUniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color('#9db8cc') },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.rainUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float aBaseY;
        attribute float aOffset;
        attribute float aTail;
        uniform float uTime;
        void main() {
          float y = mod(aBaseY - uTime * 13.0 - aOffset * 32.0, 32.0);
          vec3 p = vec3(position.x + (32.0 - y) * 0.055, y - aTail * 0.7, position.z);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uOpacity;
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor, uOpacity * 0.55);
        }
      `,
    });
    this.rain = new THREE.LineSegments(geo, mat);
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 4;
    this.scene.add(this.rain);
  }

  _buildRitual() {
    // vertical beam
    const beamMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color('#ffd7a3') },
        uCore: { value: new THREE.Color('#ffffff') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec2 vUv;
        uniform float uTime, uOpacity;
        uniform vec3 uColor, uCore;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          float edge = pow(sin(vUv.x * 3.14159), 3.8);
          float endFade = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
          float streaks = 0.65 + 0.35 * sin(vUv.x * 80.0 + uTime * 2.0) * sin(vUv.y * 12.0 - uTime * 1.5);
          float wob = sin(vUv.y * 24.0 + uTime * 0.9) * 0.014 + sin(vUv.y * 61.0 - uTime * 1.7) * 0.007;
          float core = exp(-pow((vUv.x + wob - 0.5) / 0.072, 2.0));
          vec3 col = mix(uColor, uCore, core * 0.45);
          float alpha = edge * endFade * (0.065 + streaks * 0.085 + core * 0.235) * uOpacity;
          gl_FragColor = vec4(col * (1.0 + core * 0.6), alpha);
        }
      `,
    });
    this.beamUniforms = beamMat.uniforms;
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.76, 58, 48, 1, true), beamMat);
    this.beam.position.y = 29;
    this.beam.renderOrder = 7;
    this.beam.visible = false;
    this.scene.add(this.beam);

    // soft flash at the core
    this.flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(512, 1.2),
      color: new THREE.Color('#ffe7bd'),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }));
    this.flashSprite.position.set(0, 5.85, 0.4);
    this.flashSprite.scale.set(1, 1, 1);
    this.flashSprite.renderOrder = 11;
    this.scene.add(this.flashSprite);

    this.flash = 0;
    this.flashDecay = 0;

    // burst particles
    const count = 360;
    const positions = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const tints = new Float32Array(count);
    const origin = new THREE.Vector3(0, 5.85, 0);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = origin.x + rand(-0.2, 0.2);
      positions[i * 3 + 1] = origin.y + rand(-0.2, 0.2);
      positions[i * 3 + 2] = origin.z + rand(-0.2, 0.2);
      const theta = rand(0, Math.PI * 2);
      const phi = Math.acos(rand(-0.7, 1));
      const speed = rand(0.4, 2.1);
      vels[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vels[i * 3 + 1] = Math.cos(phi) * speed * 1.15 + rand(0.1, 0.6);
      vels[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      sizes[i] = rand(0.6, 2.6);
      tints[i] = rand();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aVel', new THREE.BufferAttribute(vels, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aTint', new THREE.BufferAttribute(tints, 1));
    this.burstUniforms = {
      uProgress: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color('#ffd7a3') },
      uAtlas: { value: makeStarTexture(128) },
    };
    const burstMat = new THREE.ShaderMaterial({
      uniforms: this.burstUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute vec3 aVel;
        attribute float aSize;
        attribute float aTint;
        varying float vTint;
        varying float vAlpha;
        uniform float uProgress, uOpacity, uPixelRatio;
        void main() {
          vTint = aTint;
          float t = uProgress;
          vec3 p = position + aVel * t * 9.0;
          p.y -= t * t * 2.4;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPixelRatio * (62.0 / max(1.0, -mv.z)) * (1.0 - t * 0.55);
          vAlpha = (1.0 - t) * uOpacity;
        }
      `,
      fragmentShader: /* glsl */`
        varying float vTint;
        varying float vAlpha;
        uniform vec3 uColor;
        uniform sampler2D uAtlas;
        void main() {
          float a = texture2D(uAtlas, gl_PointCoord).a;
          vec3 col = mix(uColor, vec3(1.0, 0.96, 0.86), vTint * 0.7);
          gl_FragColor = vec4(col * 2.0, a * vAlpha);
          if (gl_FragColor.a < 0.002) discard;
        }
      `,
    });
    this.burst = new THREE.Points(geo, burstMat);
    this.burst.frustumCulled = false;
    this.burst.renderOrder = 9;
    this.burst.visible = false;
    this.scene.add(this.burst);

    // lightning line pool (one at a time is plenty)
    this.boltGroup = new THREE.Group();
    this.boltGroup.visible = false;
    this.boltGroup.renderOrder = 10;
    this.scene.add(this.boltGroup);
  }

  setPalette(p) {
    this._palette = p;
    this.dust.uniforms.uColor.value.copy(p.dust).lerp(p.accent, 0.35);
    this.dust.uniforms.uOpacity.value = 0.32 + p.starOpacity * 0.38;
    this.embers.uniforms.uColor.value.copy(p.accent).lerp(p.core, 0.4);
    this.embers.uniforms.uOpacity.value = 0.2 + p.starOpacity * 0.32;
    this.rainUniforms.uOpacity.value = p.rain * 0.75;
    this.lightningEnabled = p.lightning > 0.5;
    this.boltGroup.visible = this.boltGroup.visible && this.lightningEnabled;
    this.beamUniforms.uColor.value.copy(p.accent);
    this.burstUniforms.uColor.value.copy(p.core);
    this.flashSprite.material.color.copy(p.core).lerp(new THREE.Color('#ffffff'), 0.45);
  }

  setPixelRatio(v) {
    this.pixelRatio = v;
    this.dust.uniforms.uPixelRatio.value = v;
    this.embers.uniforms.uPixelRatio.value = v;
    this.burstUniforms.uPixelRatio.value = v;
    this.dust.points.material.uniforms.uPixelRatio.value = v;
    this.embers.points.material.uniforms.uPixelRatio.value = v;
  }

  splash(point) {
    const makeRing = (delay, maxScale, duration) => {
      const geo = new THREE.RingGeometry(0.94, 1.0, 128);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#cfe9ff').multiplyScalar(1.3),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(point.x, 0.055, point.z);
      mesh.scale.setScalar(0.2);
      mesh.renderOrder = 3;
      this.scene.add(mesh);
      const entry = { mesh, life: 0, duration: duration / 1000 };
      tween(duration, (t) => {
        mesh.scale.setScalar(0.2 + maxScale * t);
        mesh.rotation.z = t * 0.12;
        mat.opacity = Math.sin(Math.min(1, t * 1.08) * Math.PI) * 0.55;
        if (t >= 1) {
          this.scene.remove(mesh);
          geo.dispose();
          mat.dispose();
        }
      }, { delay, ease: easeOutCubic });
      this._ripples.push(entry);
    };
    makeRing(0, 8.5, 2400);
    makeRing(160, 13.5, 2900);
  }

  resonate(corePosition) {
    this.flash = 1.2;
    this.beam.visible = true;
    this.beamUniforms.uOpacity.value = 0;
    tween(9500, (t) => {
      const rise = Math.min(1, t / 0.18);
      const fall = 1 - Math.max(0, (t - 0.4) / 0.6);
      this.beamUniforms.uOpacity.value = rise * fall * 0.4;
      if (t >= 1) this.beam.visible = false;
    }, { ease: (t) => t });

    // expanding waves on the sea
    for (let i = 0; i < 2; i++) {
      const geo = new THREE.RingGeometry(0.985, 1.0, 200);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffe4b6').multiplyScalar(1.8),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.06;
      mesh.renderOrder = 4;
      this.scene.add(mesh);
      tween(3200, (t) => {
        mesh.scale.setScalar(0.5 + t * 90);
        mat.opacity = Math.sin(Math.min(1, t * 1.05) * Math.PI) * 0.55;
        if (t >= 1) {
          this.scene.remove(mesh);
          geo.dispose();
          mat.dispose();
        }
      }, { delay: i * 250, ease: easeOutCubic });
    }

    // burst
    this.burst.visible = true;
    this.burstUniforms.uProgress.value = 0;
    this.burstUniforms.uOpacity.value = 1;
    tween(3800, (t) => {
      this.burstUniforms.uProgress.value = t;
      this.burstUniforms.uOpacity.value = Math.sin(Math.min(1, t * 1.05) * Math.PI) * 1.4;
      if (t >= 1) this.burst.visible = false;
    }, { ease: (t) => t });

    // flash sprite
    this.flashSprite.material.opacity = 0;
    this.flashSprite.scale.setScalar(1.6);
    tween(1300, (t) => {
      this.flashSprite.scale.setScalar(1.6 + t * 8.5);
      this.flashSprite.material.opacity = Math.sin(Math.min(1, t * 1.05) * Math.PI) * 0.55;
    }, { ease: easeOutCubic });

    this.beamUniforms.uTime.value = 0;
  }

  flashBolt() {
    // clear old geometry
    while (this.boltGroup.children.length) {
      const child = this.boltGroup.children.pop();
      child.geometry?.dispose();
      child.material?.dispose();
    }

    const color = new THREE.Color('#dfefff');
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const brightMat = mat.clone();
    brightMat.color = new THREE.Color('#ffffff');

    const x0 = rand(-70, 64);
    const z = -105;
    const top = rand(56, 70);
    const bottom = rand(8, 18);
    const points = [new THREE.Vector3(x0, top, z)];
    let x = x0;
    let y = top;
    const steps = 15;
    for (let i = 0; i < steps; i++) {
      x += rand(-4.2, 4.2);
      y -= (top - bottom) / steps;
      points.push(new THREE.Vector3(x, y, z + rand(-1.2, 1.2)));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const main = new THREE.Line(geo, brightMat);
    this.boltGroup.add(main);

    for (let b = 0; b < 3; b++) {
      const idx = randInt(2, steps - 2);
      const start = points[idx].clone();
      const bpts = [start];
      let bx = start.x;
      let by = start.y;
      const dir = rand() > 0.5 ? 1 : -1;
      for (let i = 0; i < 4; i++) {
        bx += rand(0.5, 3.4) * dir;
        by -= rand(1.0, 3.0);
        bpts.push(new THREE.Vector3(bx, by, z + rand(-1.5, 1.5)));
      }
      const bgeo = new THREE.BufferGeometry().setFromPoints(bpts);
      const branch = new THREE.Line(bgeo, mat);
      this.boltGroup.add(branch);
    }
    this.boltGroup.visible = true;

    const flicker = (t) => {
      const op = t < 0.12 ? 1 : t < 0.25 ? 0.15 : t < 0.36 ? 0.85 : 0.25 * (1 - t);
      mat.opacity = Math.max(0, op);
      brightMat.opacity = Math.max(0, op);
    };
    tween(420, flicker, {
      ease: (t) => t,
      onComplete: () => {
        this.boltGroup.visible = false;
      },
    });
    after(430, () => {
      while (this.boltGroup.children.length) {
        const child = this.boltGroup.children.pop();
        child.geometry?.dispose();
        child.material?.dispose();
      }
    });

    this.onLightning?.();
  }

  update(dt, elapsed) {
    this.elapsed = elapsed;
    this.dust.uniforms.uTime.value = elapsed;
    this.embers.uniforms.uTime.value = elapsed;
    this.rainUniforms.uTime.value = elapsed;
    this.beamUniforms.uTime.value = elapsed;

    const p = this._palette;
    if (p) {
      // embers only gather when the night is quiet or haunted
      const emberBase = 0.18 + p.starOpacity * 0.25;
      this.embers.uniforms.uOpacity.value = emberBase * (p.storm > 0.5 ? 0.2 : 1);
    }

    if (this.lightningEnabled) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.flashBolt();
        this.lightningTimer = rand(6.5, 12.5);
      }
    } else {
      this.lightningTimer = Math.max(this.lightningTimer, 2.5);
    }

    this.flash = Math.max(0, this.flash - dt * 4.0);
  }
}
