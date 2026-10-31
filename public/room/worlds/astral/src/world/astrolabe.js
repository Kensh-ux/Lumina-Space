import * as THREE from 'three';
import { PLANETS } from '../acts.js';
import {
  makeDialTexture,
  makeGlowTexture,
  tween,
  easeInOutCubic,
  easeOutCubic,
} from '../util.js';

const CORE_NOISE = /* glsl */`
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0,0.0)), f.x),
               mix(hash21(i + vec2(0.0,1.0)), hash21(i + vec2(1.0,1.0)), f.x), f.y);
  }
  float fbm2(vec2 p) {
    float v = 0.0; float a = 0.55;
    for (int i = 0; i < 4; i++) { v += a * noise2(p); p = p * 2.04 + 9.1; a *= 0.5; }
    return v;
  }
`;

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const MANSIONS = [
  '角', '亢', '氐', '房', '心', '尾', '箕',
  '斗', '牛', '女', '虚', '危', '室', '壁',
  '奎', '娄', '胃', '昴', '毕', '觜', '参',
  '井', '鬼', '柳', '星', '张', '翼', '轸',
];
const TRIGRAMS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

export class Astrolabe {
  constructor(scene) {
    this.scene = scene;
    this.baseY = 5.85;
    this.elapsed = 0;
    this.corePulse = 0;
    this.resonance = 0;
    this.ringSpeed = 0.55;
    this.hovered = null;
    this.planetStates = new Map();
    this.pickTargets = [];
    this.dials = [];
    this._ritualRings = [];
    this._build();
  }

  _build() {
    this.group = new THREE.Group();
    this.group.position.set(0, this.baseY, 0);
    this.group.rotation.x = 0.06;
    this.group.rotation.z = -0.08;
    this.scene.add(this.group);

    this.tilt = new THREE.Group();
    this.tilt.rotation.x = -0.12;
    this.tilt.rotation.z = 0.035;
    this.group.add(this.tilt);

    this.face = new THREE.Group();
    this.tilt.add(this.face);

    this.gold = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8f6b32'),
      metalness: 0.92,
      roughness: 0.3,
      emissive: new THREE.Color('#2b1a07'),
      emissiveIntensity: 0.5,
      envMapIntensity: 1.0,
    });
    this.goldBright = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c69c52'),
      metalness: 0.86,
      roughness: 0.24,
      emissive: new THREE.Color('#5c3c15'),
      emissiveIntensity: 0.7,
      envMapIntensity: 1.3,
    });

    this._buildDials();
    this._buildArmillary();
    this._buildCore();
    this._buildPlanets();
    this._buildWhiskers();

    // core light living inside the instrument
    this.coreLight = new THREE.PointLight(new THREE.Color('#ffd7a3'), 6, 30, 2);
    this.coreLight.position.set(0, 0, 0.7);
    this.face.add(this.coreLight);

    this.coreFill = new THREE.PointLight(new THREE.Color('#a8cfff'), 1.5, 16, 2);
    this.coreFill.position.set(-1.8, 2.0, -1.6);
    this.face.add(this.coreFill);
  }

  _dialMaterial(texture, emissiveIntensity = 0.22) {
    return new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.66,
      roughness: 0.42,
      emissiveMap: texture,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity,
      envMapIntensity: 0.8,
      side: THREE.DoubleSide,
      transparent: false,
    });
  }

  _buildDials() {
    const createDial = ({ inner, outer, glyphs, smallGlyphs, tickCount, majorEvery, seed, z, speed, direction, name }) => {
      const tex = makeDialTexture({
        inner, outer, glyphs, smallGlyphs, tickCount, majorEvery, seed,
      });
      const geo = new THREE.RingGeometry(inner, outer, 256, 1);
      const mat = this._dialMaterial(tex, name === 'outer' ? 0.3 : 0.36);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = z;
      mesh.rotation.z = 0;
      mesh.userData.ring = name;
      mesh.userData.spin = direction;
      this.face.add(mesh);

      const rimMat = this.goldBright;
      const rimOuter = new THREE.Mesh(new THREE.TorusGeometry(outer, 0.024, 10, 256), rimMat);
      rimOuter.position.z = z;
      this.face.add(rimOuter);
      const rimInner = new THREE.Mesh(new THREE.TorusGeometry(inner, 0.016, 8, 256), rimMat);
      rimInner.position.z = z;
      this.face.add(rimInner);

      // rivets around the outer edge of each dial (single instanced draw)
      const rivetGeo = new THREE.SphereGeometry(0.022, 10, 8);
      const rivetMat = this.goldBright;
      const count = name === 'outer' ? 36 : 24;
      const rivets = new THREE.InstancedMesh(rivetGeo, rivetMat, count);
      const rivetMatrix = new THREE.Matrix4();
      const r = outer - 0.075;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        rivetMatrix.makeTranslation(Math.cos(a) * r, Math.sin(a) * r, z + 0.012);
        rivets.setMatrixAt(i, rivetMatrix);
      }
      rivets.instanceMatrix.needsUpdate = true;
      this.face.add(rivets);

      this.dials.push(mesh);
      return { mesh, speed, direction };
    };

    this.outerDial = createDial({
      inner: 3.28,
      outer: 4.26,
      glyphs: BRANCHES,
      smallGlyphs: ['·', '✶', '·', '✶', '·', '✶', '·', '✶', '·', '✶', '·', '✶'],
      tickCount: 144,
      majorEvery: 12,
      seed: 19,
      z: 0,
      speed: 0.013,
      direction: 1,
      name: 'outer',
    });

    this.middleDial = createDial({
      inner: 2.46,
      outer: 3.18,
      glyphs: MANSIONS,
      tickCount: 112,
      majorEvery: 7,
      seed: 47,
      z: -0.06,
      speed: 0.021,
      direction: -1,
      name: 'middle',
    });

    this.innerDial = createDial({
      inner: 1.64,
      outer: 2.36,
      glyphs: TRIGRAMS,
      tickCount: 64,
      majorEvery: 8,
      seed: 83,
      z: 0.06,
      speed: 0.036,
      direction: 1,
      name: 'inner',
    });

    // cardinal markers floating just outside the rim
    const markerMat = this.goldBright;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 2;
      const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), markerMat);
      marker.position.set(Math.cos(a) * 4.34, Math.sin(a) * 4.34, 0.02);
      marker.rotation.z = a;
      this.face.add(marker);
    }

    // a fine outer rail with four long compass needles
    const rail = new THREE.Mesh(new THREE.TorusGeometry(4.38, 0.014, 8, 320), this.goldBright);
    this.face.add(rail);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.34, 0.012), this.goldBright);
      needle.position.set(Math.cos(a) * 4.56, Math.sin(a) * 4.56, 0);
      needle.rotation.z = a - Math.PI / 2;
      this.face.add(needle);
    }
  }

  _buildArmillary() {
    this.armillary = new THREE.Group();
    this.face.add(this.armillary);

    const thinGold = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#a87f43'),
      metalness: 0.9,
      roughness: 0.32,
      emissive: new THREE.Color('#4b3214'),
      emissiveIntensity: 0.5,
      envMapIntensity: 1.2,
    });

    this.armA = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.019, 8, 288), thinGold);
    this.armA.rotation.x = Math.PI / 2.35;
    this.armA.rotation.y = 0.28;
    this.armillary.add(this.armA);

    this.armB = new THREE.Mesh(new THREE.TorusGeometry(3.52, 0.015, 8, 288), thinGold);
    this.armB.rotation.y = 1.18;
    this.armB.rotation.x = 0.24;
    this.armillary.add(this.armB);

    this.armC = new THREE.Mesh(new THREE.TorusGeometry(4.78, 0.012, 8, 320), thinGold);
    this.armC.rotation.x = 1.12;
    this.armC.rotation.z = 0.36;
    this.armillary.add(this.armC);

    // two small weights sliding on the outer armillary ring
    this.armWeights = [];
    for (let i = 0; i < 2; i++) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), this.goldBright);
      this.armillary.add(w);
      this.armWeights.push(w);
    }
  }

  _buildCore() {
    this.coreUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#ffd7a3') },
      uAccent: { value: new THREE.Color('#fff1cb') },
      uPulse: { value: 0 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.coreUniforms,
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
        uniform float uTime, uPulse;
        uniform vec3 uColor, uAccent;
        ${CORE_NOISE}
        void main() {
          float flow = fbm2(vUv * 4.2 + vec2(uTime * 0.055, -uTime * 0.032));
          float veins = smoothstep(0.42, 0.7, fbm2(vUv * 11.0 - vec2(uTime * 0.08, uTime * 0.05)));
          float fres = pow(1.0 - clamp(dot(normalize(vNormalW), normalize(vViewW)), 0.0, 1.0), 2.2);
          vec3 col = mix(uColor * 0.36, uColor * 1.18, flow);
          col += uAccent * veins * 0.8;
          col += uAccent * fres * 0.7;
          col *= 1.0 + uPulse * 2.2;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 48, 32), mat);
    this.face.add(this.core);

    this.coreHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(512, 1.0),
      color: new THREE.Color('#ffd7a3'),
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }));
    this.coreHalo.scale.set(2.1, 2.1, 1);
    this.coreHalo.renderOrder = 6;
    this.face.add(this.coreHalo);

    this.coreHaloWide = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(512, 1.6),
      color: new THREE.Color('#ffd7a3'),
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }));
    this.coreHaloWide.scale.set(6.8, 6.8, 1);
    this.coreHaloWide.renderOrder = 5;
    this.face.add(this.coreHaloWide);

    this.coreHit = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 12, 10),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.coreHit.userData.core = true;
    this.face.add(this.coreHit);
    this.pickTargets.push(this.coreHit);

    // star needles around the core
    this.needles = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const long = i % 3 === 0;
      const len = long ? 1.55 : 1.05;
      const needle = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, len, 0.008),
        long ? this.goldBright : this.gold,
      );
      needle.position.set(Math.cos(a) * (0.45 + len * 0.5), Math.sin(a) * (0.45 + len * 0.5), 0.1);
      needle.rotation.z = a - Math.PI / 2;
      this.needles.add(needle);
      if (long) {
        const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), this.goldBright);
        tip.position.set(Math.cos(a) * (0.45 + len), Math.sin(a) * (0.45 + len), 0.1);
        this.needles.add(tip);
      }
    }
    this.face.add(this.needles);

    // halo collar around the core
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.018, 8, 128), this.goldBright);
    collar.position.z = 0.12;
    this.face.add(collar);
    this.collar = collar;
  }

  _buildPlanets() {
    this.planetGroup = new THREE.Group();
    this.face.add(this.planetGroup);

    const orbitMatCache = {};
    for (const data of PLANETS) {
      const orbit = data.orbit;
      const holder = new THREE.Group();
      holder.rotation.set(orbit.tiltX, orbit.tiltY, 0);
      this.planetGroup.add(holder);

      // orbit line
      const points = [];
      const segments = 180;
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * orbit.radius, Math.sin(a) * orbit.radius, 0));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = orbitMatCache[data.color] ?? new THREE.LineBasicMaterial({
        color: new THREE.Color(data.color),
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      orbitMatCache[data.color] = lineMat;
      const line = new THREE.Line(lineGeo, lineMat);
      line.renderOrder = 3;
      holder.add(line);

      const pivot = new THREE.Group();
      holder.add(pivot);

      const color = new THREE.Color(data.color).multiplyScalar(2.4);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(orbit.size, 24, 18),
        new THREE.MeshBasicMaterial({ color }),
      );
      pivot.add(mesh);

      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(256, 0.9),
        color: new THREE.Color(data.color),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      halo.scale.set(1.15, 1.15, 1);
      pivot.add(halo);

      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 10, 8),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.userData.planetId = data.id;
      pivot.add(hit);
      this.pickTargets.push(hit);

      this.planetStates.set(data.id, {
        data,
        holder,
        pivot,
        mesh,
        halo,
        hit,
        angle: orbit.phase,
        hover: 0,
      });
    }
  }

  _buildWhiskers() {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c49a57'),
      metalness: 0.9,
      roughness: 0.28,
      emissive: new THREE.Color('#5a3914'),
      emissiveIntensity: 0.6,
      envMapIntensity: 1.2,
    });

    const paths = [
      [
        [3.0, 3.0, 0.05],
        [4.9, 4.7, 0.35],
        [6.3, 5.0, 0.7],
        [7.1, 4.3, 0.9],
      ],
      [
        [-3.2, -2.6, 0.02],
        [-5.4, -4.2, 0.4],
        [-6.8, -4.0, 0.8],
        [-7.3, -3.0, 1.0],
      ],
    ];

    this.whiskers = new THREE.Group();
    paths.forEach((points, idx) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.018, 6, false), mat);
      this.whiskers.add(tube);
      const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), this.goldBright);
      const end = curve.getPoint(1);
      tip.position.copy(end);
      this.whiskers.add(tip);
      const star = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture(128, 0.9),
        color: new THREE.Color('#ffe9b8'),
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      star.position.copy(end);
      star.scale.set(1.2, 1.2, 1);
      this.whiskers.add(star);
    });
    this.face.add(this.whiskers);
  }

  setPalette(p) {
    this._palette = p;
    this.ringSpeed = p.ringSpeed;
    this.coreUniforms.uColor.value.copy(p.core);
    this.coreUniforms.uAccent.value.copy(p.accent);
    this.coreHalo.material.color.copy(p.core);
    this.coreHaloWide.material.color.copy(p.core);
    this.coreLight.color.copy(p.core);
    this.coreFill.color.copy(p.moonRim);
    this.coreLight.intensity = 5.2 + p.bloom * 2.0;
    this.coreFill.intensity = 0.9 + p.starOpacity * 0.9;
    this.gold.emissive.copy(p.accent).multiplyScalar(0.12).add(new THREE.Color('#180d04'));
    this.goldBright.emissive.copy(p.accent).multiplyScalar(0.22).add(new THREE.Color('#221305'));
    this.needles.children.forEach((child) => {
      if (child.material === this.goldBright) child.material.emissive.copy(this.goldBright.emissive);
    });
    this.planetStates.forEach((state) => {
      // planets keep their own colour but pick up the current night
      state.halo.material.opacity = 0.62 + p.starOpacity * 0.3;
    });
  }

  setHoveredPlanet(id) {
    this.hovered = id;
  }

  getPlanet(id) {
    return this.planetStates.get(id);
  }

  getCoreWorldPosition(target = new THREE.Vector3()) {
    return this.core.getWorldPosition(target);
  }

  pulse(amount = 1) {
    this.corePulse = Math.max(this.corePulse, amount);
    this.coreUniforms.uPulse.value = this.corePulse;
  }

  spinRing(mesh) {
    const dir = mesh.userData.spin ?? 1;
    const start = mesh.rotation.z;
    const amount = (Math.PI / 6) * dir * 2;
    tween(950, (t) => {
      mesh.rotation.z = start + amount * t;
    }, { ease: easeOutCubic });
    this.pulse(0.18);
  }

  resonate() {
    this.resonance = 1;
    this.pulse(1.6);
    this.coreUniforms.uPulse.value = 1.6;

    // rings take a long ceremonial turn
    const rings = [
      { mesh: this.outerDial.mesh, amount: Math.PI * 1.15, delay: 0 },
      { mesh: this.middleDial.mesh, amount: -Math.PI * 1.7, delay: 120 },
      { mesh: this.innerDial.mesh, amount: Math.PI * 2.2, delay: 240 },
    ];
    rings.forEach(({ mesh, amount, delay }) => {
      const start = mesh.rotation.z;
      tween(5200, (t) => {
        mesh.rotation.z = start + amount * easeInOutCubic(t);
      }, { delay });
    });

    tween(7500, (t) => {
      this.resonance = 1 - t;
    }, { ease: (t) => t });

    // ritual light rings inside the dial plane
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.RingGeometry(0.98, 1.0, 192);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffdca6').multiplyScalar(2.0),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.z = 0.16;
      ring.scale.setScalar(0.2);
      ring.visible = false;
      this.face.add(ring);
      this._ritualRings.push(ring);

      tween(2600, (t, raw) => {
        if (raw <= 0.001) ring.visible = true;
        ring.scale.setScalar(0.2 + t * 7.2);
        mat.opacity = Math.sin(Math.min(1, raw * 1.1) * Math.PI) * 0.85;
        if (raw >= 1) {
          ring.visible = false;
        }
      }, {
        delay: 260 + i * 360,
        ease: easeOutCubic,
      });
    }

    // a bright bloom at the very beginning
    tween(1800, (t) => {
      this.corePulse = 1.6 * (1 - t) + 0.2;
      this.coreUniforms.uPulse.value = this.corePulse;
    }, { ease: easeOutCubic });
  }

  update(dt, elapsed) {
    this.elapsed = elapsed;
    const t = elapsed;
    this.coreUniforms.uTime.value = t;

    // gentle breathing of the whole instrument
    this.group.position.y = this.baseY + Math.sin(t * 0.34) * 0.075;
    this.tilt.rotation.z = 0.035 + Math.sin(t * 0.11) * 0.018;
    this.tilt.rotation.x = -0.12 + Math.sin(t * 0.09 + 1.2) * 0.012;
    this.whiskers.rotation.z = Math.sin(t * 0.08) * 0.018;

    const speed = this.ringSpeed * (1 + this.resonance * 2.2);
    this.outerDial.mesh.rotation.z += dt * this.outerDial.speed * speed * this.outerDial.direction;
    this.middleDial.mesh.rotation.z += dt * this.middleDial.speed * speed * this.middleDial.direction;
    this.innerDial.mesh.rotation.z += dt * this.innerDial.speed * speed * this.innerDial.direction;
    this.armA.rotation.z += dt * 0.015 * speed;
    this.armB.rotation.z -= dt * 0.021 * speed;
    this.armC.rotation.z += dt * 0.008 * speed;
    this.needles.rotation.z -= dt * 0.03 * (1 + this.resonance);
    this.collar.rotation.z += dt * 0.05;
    this.needles.children.forEach((c, i) => {
      if (c.geometry.type === 'OctahedronGeometry') {
        c.rotation.z += dt * 0.3;
      }
    });

    const a1 = t * 0.35;
    this.armWeights[0].position.set(Math.cos(a1) * 4.78, 0, Math.sin(a1) * 4.78);
    this.armWeights[0].position.applyAxisAngle(new THREE.Vector3(1, 0, 0), 1.12);
    const a2 = t * 0.23 + 2.4;
    this.armWeights[1].position.set(Math.cos(a2) * 4.78, 0, Math.sin(a2) * 4.78);
    this.armWeights[1].position.applyAxisAngle(new THREE.Vector3(1, 0, 0), 1.12);

    // planets
    this.planetStates.forEach((state, id) => {
      const orbit = state.data.orbit;
      state.angle += dt * orbit.speed * (0.35 + this.ringSpeed * 0.9) * (1 + this.resonance * 3.0);
      const x = Math.cos(state.angle) * orbit.radius;
      const y = Math.sin(state.angle) * orbit.radius;
      state.pivot.position.set(x, y, 0);
      const desired = this.hovered === id ? 1 : 0;
      state.hover += (desired - state.hover) * Math.min(1, dt * 8);
      const hs = 1.15 + state.hover * 0.65 + Math.sin(t * 1.1 + orbit.phase) * 0.05;
      state.halo.scale.set(hs, hs, 1);
      state.mesh.scale.setScalar(1 + state.hover * 0.35);
      state.halo.material.opacity = (0.62 + this._palette.starOpacity * 0.3) * (1 + state.hover * 0.3);
    });

    // core pulse decay
    this.corePulse = Math.max(0, this.corePulse - dt * 0.65);
    this.coreUniforms.uPulse.value = Math.max(this.coreUniforms.uPulse.value, this.corePulse);
    const pulse = this.coreUniforms.uPulse.value;
    this.coreHalo.scale.setScalar(2.1 + pulse * 1.8 + Math.sin(t * 1.3) * 0.07);
    this.coreHalo.material.opacity = 0.5 + pulse * 0.2;
    this.coreHaloWide.scale.setScalar(6.8 + pulse * 4.2);
    this.coreHaloWide.material.opacity = 0.13 + pulse * 0.14;
    this.coreLight.intensity = 5.2 + (this._palette?.bloom ?? 1) * 2.0 + pulse * 5.5;
    this.core.scale.setScalar(1 + pulse * 0.2);

  }
}
