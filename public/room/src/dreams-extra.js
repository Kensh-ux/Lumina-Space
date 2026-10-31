/* 窗畔 · 第二批幻境：云海、浮岛、沙海、冰原、萤森、书海、月面、花野
   目标是把窗外变成八个可以久看的小世界，而不是八张背景图。 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;
  const V3 = THREE.Vector3;

  /* ———————————————————— 公共：天空 / 发光 / 粒子 ———————————————————— */

  const NOISE = `
    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p = p * 2.03 + vec2(13.7, 7.3);
        a *= 0.5;
      }
      return v;
    }
    vec3 aces(vec3 x) {
      return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }
  `;

  const SKY_VERT = `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const SKY_FRAG = `
    precision highp float;
    varying vec3 vDir;
    uniform vec3 uTop, uMid, uHorizon, uGlow, uSunColor, uSunDir;
    uniform vec3 uCloudColor, uCloudLit, uAuroraA, uAuroraB;
    uniform float uTime, uSunSize, uSunHalo, uStars, uCloud, uAurora;
    ${NOISE}
    void main() {
      vec3 dir = normalize(vDir);
      float h = clamp(dir.y, -0.2, 1.0);
      vec3 sd = normalize(uSunDir);

      vec3 col = mix(uHorizon, uMid, smoothstep(-0.03, 0.3, h));
      col = mix(col, uTop, smoothstep(0.16, 0.8, h));

      vec2 sa = normalize(sd.xz + vec2(0.0001));
      vec2 da = normalize(dir.xz + vec2(0.0001));
      float az = max(dot(da, sa), 0.0);
      col += uGlow * pow(az, 5.0) * exp(-max(h, 0.0) * 6.0) * (0.28 + uSunHalo * 0.34);

      float cosA = dot(dir, sd);
      float ang = acos(clamp(cosA, -1.0, 1.0));
      float disc = 1.0 - smoothstep(uSunSize * 0.72, uSunSize * 1.12, ang);
      float halo = pow(max(cosA, 0.0), 180.0) * 0.7 + pow(max(cosA, 0.0), 20.0) * 0.07;
      col += uSunColor * disc * 2.6 * uSunHalo;
      col += uSunColor * halo * uSunHalo;

      if (uStars > 0.001) {
        vec2 sc = dir.xz / max(dir.y + 0.5, 0.14);
        vec2 g1 = sc * 74.0;
        vec2 cell = floor(g1);
        vec2 f1 = fract(g1) - 0.5;
        float hs = hash21(cell);
        float star = smoothstep(0.9952, 1.0, hs);
        float core = smoothstep(0.2, 0.015, length(f1));
        float halo = smoothstep(0.46, 0.0, length(f1)) * 0.12;
        float tw = 0.65 + 0.35 * sin(uTime * 1.5 + hs * 60.0);
        col += vec3(0.85, 0.92, 1.0) * star * (core + halo) * tw * smoothstep(0.02, 0.2, dir.y) * uStars * 2.1;
        vec2 g2 = sc * 27.0;
        vec2 cell2 = floor(g2);
        vec2 f2 = fract(g2) - 0.5;
        float hs2 = hash21(cell2 + 13.7);
        float big = smoothstep(0.995, 1.0, hs2);
        float core2 = smoothstep(0.26, 0.02, length(f2));
        float halo2 = smoothstep(0.52, 0.0, length(f2)) * 0.14;
        col += vec3(1.0, 0.94, 0.84) * big * (core2 + halo2) * smoothstep(0.03, 0.24, dir.y) * uStars * 2.5;
      }

      if (uCloud > 0.001) {
        vec2 cuv = dir.xz / (max(h, 0.0) + 0.3);
        float drift = uTime * 0.012;
        float n1 = fbm(cuv * vec2(1.4, 2.6) + vec2(drift, drift * 0.3));
        float n2 = fbm(cuv * vec2(3.4, 5.2) - vec2(drift * 1.8, 0.0));
        float band = smoothstep(0.02, 0.22, h) * (1.0 - smoothstep(0.45, 0.95, h));
        float cl = smoothstep(0.42, 0.78, n1 * 0.72 + n2 * 0.36) * band;
        col = mix(col, uCloudColor, cl * uCloud * 0.75);
        col += uCloudLit * pow(max(n1 * 0.7 + n2 * 0.3 - 0.35, 0.0), 1.8) * band * uCloud * 0.85;
      }

      if (uAurora > 0.001) {
        float az2 = atan(dir.x, -dir.z);
        float front = smoothstep(-1.4, -0.5, az2) * (1.0 - smoothstep(0.55, 1.5, az2));
        float curtain = 0.5 + 0.5 * sin(az2 * 4.6 + 0.8 + sin(az2 * 2.1 - uTime * 0.03) * 1.2);
        float ray = pow(0.5 + 0.5 * sin(az2 * 80.0 + h * 22.0 + uTime * 0.09 + sin(az2 * 7.0) * 2.0), 5.0);
        float body = smoothstep(0.05, 0.1, h) * (1.0 - smoothstep(0.16, 0.26, h));
        float hem = exp(-pow((h - 0.075) / 0.009, 2.0));
        col += mix(uAuroraA, uAuroraB, smoothstep(0.06, 0.2, h)) *
          (body * (0.08 + 0.9 * ray) + hem * (0.2 + 0.8 * ray)) *
          (0.25 + 0.75 * curtain) * front * uAurora;
      }

      col = mix(col, uHorizon, exp(-max(h, 0.0) * 24.0) * 0.18);
      col = aces(col * 1.06);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function makeAtmos(o) {
    const uniforms = {
      uTop: { value: new THREE.Color(o.top) },
      uMid: { value: new THREE.Color(o.mid) },
      uHorizon: { value: new THREE.Color(o.horizon) },
      uGlow: { value: new THREE.Color(o.glow || o.sunColor || '#ffffff') },
      uSunColor: { value: new THREE.Color(o.sunColor || '#ffffff') },
      uSunDir: { value: new V3(o.sunDir[0], o.sunDir[1], o.sunDir[2]).normalize() },
      uCloudColor: { value: new THREE.Color(o.cloudColor || '#3a4558') },
      uCloudLit: { value: new THREE.Color(o.cloudLit || '#7f8ba0') },
      uAuroraA: { value: new THREE.Color(o.auroraA || '#7cf0d0') },
      uAuroraB: { value: new THREE.Color(o.auroraB || '#8b74dc') },
      uSunSize: { value: o.sunSize === undefined ? 0.03 : o.sunSize },
      uSunHalo: { value: o.sunHalo === undefined ? 0.5 : o.sunHalo },
      uStars: { value: o.stars || 0 },
      uCloud: { value: o.cloud || 0 },
      uAurora: { value: o.aurora || 0 },
      uTime: { value: 0 }
    };
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(90, 48, 32),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
      })
    );
    mesh.renderOrder = -10;
    mesh.frustumCulled = false;
    return { mesh, uniforms };
  }

  function basic(color, opts) {
    opts = opts || {};
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: opts.opacity !== undefined,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: opts.depthWrite === undefined ? true : opts.depthWrite,
      side: opts.side || THREE.FrontSide,
      fog: opts.fog === undefined ? true : opts.fog,
      toneMapped: opts.toneMapped === undefined ? true : opts.toneMapped
    });
  }

  function standard(color, roughness, metalness, opts) {
    opts = opts || {};
    const m = new THREE.MeshStandardMaterial({
      color: color,
      roughness: roughness === undefined ? 0.85 : roughness,
      metalness: metalness === undefined ? 0.02 : metalness,
      flatShading: !!opts.flat,
      transparent: opts.opacity !== undefined,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      side: opts.side || THREE.FrontSide,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity === undefined ? 1 : opts.emissiveIntensity,
      depthWrite: opts.depthWrite === undefined ? true : opts.depthWrite,
      fog: opts.fog === undefined ? true : opts.fog
    });
    return m;
  }

  function glowSprite(tex, color, scale, opacity) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: color === undefined ? 0xffffff : color,
      transparent: true,
      opacity: opacity === undefined ? 1 : opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false
    });
    const s = new THREE.Sprite(mat);
    if (scale) s.scale.set(scale, scale, 1);
    return s;
  }

  function addLights(group, opts) {
    const hemi = new THREE.HemisphereLight(opts.sky || 0xbfd6ff, opts.ground || 0x201a16, opts.hemi === undefined ? 0.55 : opts.hemi);
    group.add(hemi);
    const dir = new THREE.DirectionalLight(opts.color || 0xffffff, opts.intensity === undefined ? 1 : opts.intensity);
    dir.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
    const target = new THREE.Object3D();
    target.position.set(0, 0, -18);
    group.add(target);
    dir.target = target;
    group.add(dir);
    return dir;
  }

  function starPoints(tex, count, spread, z0, z1, color, size, seed) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const rng = U.mulberry32(seed || 91);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rng() - 0.5) * spread;
      pos[i * 3 + 1] = rng() * spread * 0.42 + 0.4;
      pos[i * 3 + 2] = z0 + rng() * (z1 - z0);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: size || 0.1, map: tex, color: color, transparent: true, opacity: 0.75,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      toneMapped: false, fog: false
    });
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    return p;
  }

  function canvasTexture(w, h, draw, opts) {
    const c = U.makeCanvas(w, h);
    draw(c.getContext('2d'), w, h);
    return U.canvasTexture(c, opts || { clamp: true, aniso: 2 });
  }

  function stripeTexture(colors) {
    return canvasTexture(128, 128, (x, w, h) => {
      const n = colors.length;
      const bw = w / n;
      for (let i = 0; i < n; i++) {
        x.fillStyle = colors[i];
        x.fillRect(i * bw, 0, bw + 1, h);
      }
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0.24)');
      g.addColorStop(0.55, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.24)');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
    });
  }

  function waterTexture(tint) {
    return canvasTexture(128, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(8,28,26,1)');
      g.addColorStop(0.5, tint || 'rgba(22,74,66,1)');
      g.addColorStop(1, 'rgba(6,20,20,1)');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
      const rng = U.mulberry32(66);
      for (let i = 0; i < 26; i++) {
        const y = rng() * h;
        x.strokeStyle = 'rgba(190,245,226,' + (0.05 + rng() * 0.14) + ')';
        x.lineWidth = 1 + rng() * 1.6;
        x.beginPath();
        for (let px = 0; px <= w; px += 8) {
          x.lineTo(px, y + Math.sin(px * 0.12 + i) * 3);
        }
        x.stroke();
      }
    }, { repeat: [1, 2], aniso: 4 });
  }

  function tree(parent, x, z, scale, trunkMat, leafMat, seed) {
    const rng = U.mulberry32(seed || 7);
    const g = new THREE.Group();
    const h = 2.6 * scale;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.14 * scale, h, 6), trunkMat);
    trunk.position.y = h / 2;
    g.add(trunk);
    const blobs = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < blobs; i++) {
      const r = (0.55 + rng() * 0.4) * scale;
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), leafMat);
      leaf.position.set((rng() - 0.5) * 0.8 * scale, h * (0.7 + rng() * 0.35), (rng() - 0.5) * 0.8 * scale);
      leaf.scale.set(1, 0.72 + rng() * 0.25, 1);
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rng() * Math.PI;
    parent.add(g);
    return g;
  }

  function camels(parent, x, y, z, s) {
    const g = new THREE.Group();
    const bodyMat = standard(0x3a2921, 0.9, 0);
    const dark = standard(0x241812, 0.95, 0);
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), bodyMat);
      body.scale.set(1.5, 0.8, 0.72);
      body.position.y = 0.62;
      c.add(body);
      const hump = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), bodyMat);
      hump.scale.set(1.2, 0.9, 0.8);
      hump.position.set(-0.06, 0.84, 0);
      c.add(hump);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.5, 5), bodyMat);
      neck.position.set(0.38, 0.82, 0);
      neck.rotation.z = -0.7;
      c.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), bodyMat);
      head.scale.set(1.6, 0.9, 0.8);
      head.position.set(0.58, 1.02, 0);
      c.add(head);
      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), dark);
        ear.position.set(0.55, 1.13, side * 0.06);
        c.add(ear);
      });
      [[-0.26, -0.12], [-0.26, 0.12], [0.28, -0.12], [0.28, 0.12]].forEach((p) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.022, 0.62, 4), dark);
        leg.position.set(p[0], 0.31, p[1]);
        c.add(leg);
      });
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.28, 4), dark);
      tail.position.set(-0.45, 0.6, 0);
      tail.rotation.z = 0.4;
      c.add(tail);
      c.position.set(i * 0.82, 0, (i % 2) * 0.1);
      c.scale.setScalar(0.9 + (i % 3) * 0.05);
      g.add(c);
    }
    g.position.set(x, y, z);
    g.scale.setScalar(s || 1.1);
    g.rotation.y = -0.06;
    parent.add(g);
    return g;
  }

  /* ———————————————————— 11 云海 · SKY SEA ———————————————————— */

  function buildCloudSea(tex) {
    const group = new THREE.Group();
    group.name = 'cloudsea';
    const atmos = makeAtmos({
      top: '#1b2347', mid: '#73536f', horizon: '#f4bd92', glow: '#ffc994',
      sunColor: '#ffd9aa', sunDir: [-0.16, 0.2, -1], sunSize: 0.06, sunHalo: 1.5,
      stars: 0.18, cloud: 0.72, cloudColor: '#a37a78', cloudLit: '#ffd5b2'
    });
    group.add(atmos.mesh);
    addLights(group, { sky: '#9aa4c4', ground: '#67463d', hemi: 0.72, color: '#ffd2a6', intensity: 1.25, pos: [-6, 9, -7] });

    /* 云海：三层低多边形云团，近处的更暖、更慢 */
    const puffGeo = new THREE.SphereGeometry(1, 7, 5);
    const puffMat = standard(0xffe2c6, 0.95, 0, { flat: true });
    const layers = [
      { count: 46, x: 34, z0: -8, z1: -20, y0: -2.6, y1: -1.2, s0: 2.2, s1: 4.6, tone: [0xd9b4a6, 0xf6d7bc] },
      { count: 40, x: 58, z0: -18, z1: -40, y0: -1.4, y1: 0.4, s0: 3.2, s1: 7.2, tone: [0xc7a3a2, 0xf2cdb0] },
      { count: 24, x: 78, z0: -38, z1: -62, y0: -0.6, y1: 1.2, s0: 5.0, s1: 10.0, tone: [0xb48e9c, 0xecc2ab] }
    ];
    const rng = U.mulberry32(1207);
    const sea = [];
    layers.forEach((L, li) => {
      const inst = new THREE.InstancedMesh(puffGeo, puffMat, L.count);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const s = new V3();
      const p = new V3();
      const cA = new THREE.Color(L.tone[0]);
      const cB = new THREE.Color(L.tone[1]);
      for (let i = 0; i < L.count; i++) {
        p.set((rng() - 0.5) * L.x, L.y0 + rng() * (L.y1 - L.y0), L.z0 + rng() * (L.z1 - L.z0));
        const sc = L.s0 + rng() * (L.s1 - L.s0);
        s.set(sc, sc * (0.28 + rng() * 0.16), sc * (0.62 + rng() * 0.4));
        q.setFromEuler(new THREE.Euler(0, rng() * Math.PI, 0));
        m4.compose(p, q, s);
        inst.setMatrixAt(i, m4);
        const col = cA.clone().lerp(cB, rng());
        inst.setColorAt(i, col);
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.frustumCulled = false;
      group.add(inst);
      sea.push({ inst, li });
    });

    /* 从云里探出的远山 */
    const rockMat = standard(0x554a5e, 0.95, 0, { flat: true });
    const snowMat = standard(0xf2dfd1, 0.9, 0, { flat: true });
    for (let i = 0; i < 7; i++) {
      const h = 5 + rng() * 8;
      const r = 2.4 + rng() * 3.6;
      const x = -26 + i * 8.4 + (rng() - 0.5) * 3;
      const z = -34 - rng() * 15;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), rockMat);
      peak.position.set(x, -1.2 + h / 2, z);
      group.add(peak);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.52, h * 0.3, 6), snowMat);
      cap.position.set(x, -1.2 + h - h * 0.15, z);
      group.add(cap);
    }

    /* 热气球 */
    function balloon(x, y, z, sc, colors) {
      const g = new THREE.Group();
      const envMat = new THREE.MeshStandardMaterial({
        map: stripeTexture(colors), roughness: 0.72, metalness: 0.02, side: THREE.DoubleSide
      });
      const env = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.64), envMat);
      env.scale.set(1, 1.16, 1);
      env.rotation.x = Math.PI;
      env.position.y = 2.2;
      g.add(env);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.28, 0.45, 16, 1, true), envMat);
      skirt.position.y = 1.28;
      g.add(skirt);
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.5), standard(0x6d4a2e, 0.9, 0, { flat: true }));
      basket.position.y = 0.72;
      g.add(basket);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.56), standard(0x39261a, 0.9, 0));
      rim.position.y = 0.9;
      g.add(rim);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        const p0 = new V3(Math.cos(a) * 0.24, 0.9, Math.sin(a) * 0.24);
        const p1 = new V3(Math.cos(a) * 0.44, 1.3, Math.sin(a) * 0.44);
        const len = p0.distanceTo(p1);
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 4), standard(0x2f2418, 0.9, 0));
        rope.position.copy(p0).addScaledVector(p1.clone().sub(p0), 0.5);
        rope.quaternion.setFromUnitVectors(new V3(0, 1, 0), p1.clone().sub(p0).normalize());
        g.add(rope);
      }
      const burner = glowSprite(tex.glowWarm, 0xffc37a, 0.7, 0.55);
      burner.position.y = 1.12;
      g.add(burner);
      g.position.set(x, y, z);
      g.scale.setScalar(sc);
      group.add(g);
      return g;
    }
    const b1 = balloon(-2.4, 2.1, -12.5, 0.95, ['#e9d7bd', '#c4795f', '#e9d7bd', '#7d5561', '#e9d7bd', '#c4795f']);
    const b2 = balloon(4.2, 3.9, -23, 0.6, ['#d8cdb8', '#6f8b86', '#d8c6a7', '#a76c58']);
    const b3 = balloon(-7.5, 4.5, -32, 0.42, ['#e8d3b5', '#8d6b7e']);

    /* 飞鸟：几笔轻线 */
    const birds = new THREE.Group();
    const birdMat = new THREE.LineBasicMaterial({ color: 0x3c3240, transparent: true, opacity: 0.65 });
    for (let i = 0; i < 9; i++) {
      const pts = [
        -0.18, 0, 0, 0, 0.06, 0,
        0, 0.06, 0, 0.18, 0, 0
      ];
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const b = new THREE.LineSegments(bg, birdMat);
      b.position.set((rng() - 0.5) * 18, 3 + rng() * 5, -12 - rng() * 22);
      b.userData.phase = rng() * Math.PI * 2;
      b.userData.baseX = b.position.x;
      birds.add(b);
    }
    group.add(birds);

    const glowA = glowSprite(tex.glowSoft, 0xffcf9d, 18, 0.16);
    glowA.position.set(-10, 3.5, -45);
    group.add(glowA);

    return {
      group,
      update(dt, t) {
        atmos.uniforms.uTime.value = t;
        b1.position.y = 2.1 + Math.sin(t * 0.27) * 0.22;
        b1.rotation.y = Math.sin(t * 0.1) * 0.18;
        b2.position.y = 3.9 + Math.sin(t * 0.21 + 2) * 0.3;
        b3.position.y = 4.5 + Math.sin(t * 0.18 + 4) * 0.24;
        sea.forEach((s, i) => {
          s.inst.position.x = Math.sin(t * (0.006 + i * 0.002) + i) * (1.4 + i);
        });
        birds.children.forEach((b) => {
          b.position.x = b.userData.baseX + Math.sin(t * 0.05 + b.userData.phase) * 3.2;
          b.position.y += Math.sin(t * 1.6 + b.userData.phase) * 0.0008;
        });
      }
    };
  }

  /* ———————————————————— 12 浮岛 · SKY ISLES ———————————————————— */

  function buildIsles(tex) {
    const group = new THREE.Group();
    group.name = 'isles';
    const atmos = makeAtmos({
      top: '#061427', mid: '#295367', horizon: '#8fd6c8', glow: '#bdf4e4',
      sunColor: '#d6fff4', sunDir: [0.3, 0.42, -0.86], sunSize: 0.03, sunHalo: 0.9,
      stars: 0.55, cloud: 0.38, cloudColor: '#31555b', cloudLit: '#7eb0a9',
      aurora: 0.1, auroraA: '#7cf0d0', auroraB: '#6d9ad9'
    });
    group.add(atmos.mesh);
    addLights(group, { sky: '#9ed4d6', ground: '#1d3330', hemi: 0.8, color: '#c8fff0', intensity: 1.15, pos: [5, 8, -5] });

    const rockMat = standard(0x34484d, 0.95, 0, { flat: true });
    const grassMat = standard(0x517a62, 0.9, 0, { flat: true });
    const grassLit = standard(0x7da878, 0.88, 0, { flat: true });
    const vineMat = standard(0x3d6a55, 0.9, 0, { flat: true });
    const rng = U.mulberry32(1409);
    const islands = [];

    function island(x, y, z, r, h, big) {
      const g = new THREE.Group();
      const under = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rockMat);
      under.rotation.x = Math.PI;
      under.position.y = -h / 2 + 0.05;
      g.add(under);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.84, 0.34, 8), grassMat);
      top.position.y = 0.1;
      g.add(top);
      const top2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.82, r * 0.86, 0.12, 8), grassLit);
      top2.position.y = 0.31;
      g.add(top2);
      // 石块与草簇
      for (let i = 0; i < 5; i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + rng() * 0.3, 0), rockMat);
        rock.position.set((rng() - 0.5) * r * 1.4, 0.3, (rng() - 0.5) * r * 1.2);
        g.add(rock);
        if (rng() > 0.4) {
          const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5 + rng() * 0.3, 4), grassLit);
          tuft.position.set(rock.position.x * 1.1, 0.5, rock.position.z * 1.1);
          tuft.rotation.z = (rng() - 0.5) * 0.3;
          g.add(tuft);
        }
      }
      // 垂下的藤蔓
      const vines = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const a = rng() * Math.PI * 2;
        const rr = r * (0.6 + rng() * 0.35);
        const start = new V3(Math.cos(a) * rr, 0.0, Math.sin(a) * rr);
        const points = [];
        const len = 1.4 + rng() * 3.4;
        for (let s = 0; s < 6; s++) {
          points.push(new V3(
            start.x + Math.sin(s * 0.5 + a) * 0.1,
            -s * (len / 5),
            start.z + Math.cos(s * 0.4 + a) * 0.1
          ));
        }
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, 0.025 + rng() * 0.02, 4, false),
          vineMat
        );
        vines.add(tube);
        if (rng() > 0.35) {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), grassLit);
          leaf.scale.set(1, 0.4, 1);
          leaf.position.copy(points[2]);
          vines.add(leaf);
        }
      }
      g.add(vines);

      if (big) {
        tree(g, 0, 0, 1.4, standard(0x3c3126, 0.95, 0, { flat: true }), standard(0x3f6d55, 0.9, 0, { flat: true }), 71);
        // 树上的小灯
        for (let i = 0; i < 5; i++) {
          const lamp = glowSprite(tex.glowWarm, 0xffc472, 0.32, 0.8);
          lamp.position.set((rng() - 0.5) * 1.4, 1.9 + rng() * 1.2, (rng() - 0.5) * 1.2);
          g.add(lamp);
        }
      }
      // 瀑布：从岛缘垂下的渐变水幕
      if (r > 2.1) {
        const w = r * 0.55;
        const fallTex = canvasTexture(64, 256, (x2, w2, h2) => {
          const gr = x2.createLinearGradient(0, 0, 0, h2);
          gr.addColorStop(0, 'rgba(210,255,247,0.9)');
          gr.addColorStop(0.4, 'rgba(150,226,218,0.6)');
          gr.addColorStop(0.8, 'rgba(120,200,200,0.16)');
          gr.addColorStop(1, 'rgba(120,200,200,0)');
          x2.fillStyle = gr;
          x2.fillRect(0, 0, w2, h2);
          for (let i = 0; i < 9; i++) {
            x2.fillStyle = 'rgba(255,255,255,' + (0.12 + rng() * 0.2) + ')';
            x2.fillRect(rng() * w2, 0, 1 + rng() * 2, h2 * (0.4 + rng() * 0.5));
          }
        }, { repeat: [1, 1], aniso: 2 });
        const fall = new THREE.Mesh(
          new THREE.PlaneGeometry(w, 7.5 + rng() * 3),
          new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, fog: true })
        );
        fall.position.set(r * 0.42, -3.6, r * 0.44);
        fall.rotation.y = -0.5;
        g.add(fall);
        const mist = glowSprite(tex.glowMint, 0x9ff4e6, 2.6, 0.22);
        mist.position.set(fall.position.x, -7.6, fall.position.z);
        g.add(mist);
        g.userData.fallTex = fallTex;
      }

      g.position.set(x, y, z);
      group.add(g);
      islands.push({ g, baseY: y, phase: rng() * Math.PI * 2, fallTex: g.userData.fallTex });
      return g;
    }

    island(-1.2, 1.9, -13.5, 3.1, 5.4, true);
    island(5.6, 0.9, -21, 2.1, 3.9, false);
    island(-7.2, 3.4, -23.5, 1.5, 2.8, false);
    island(2.6, 5.8, -31, 1.2, 2.2, false);
    island(-12, 1.4, -34, 3.4, 5.6, false);

    /* 云底与远处的光 */
    const cloudMat = standard(0xbcdad5, 0.95, 0, { flat: true, transparent: true, opacity: 0.7 });
    const cloudGeo = new THREE.SphereGeometry(1, 7, 5);
    const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, 34);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new V3();
    const p = new V3();
    for (let i = 0; i < 34; i++) {
      p.set((rng() - 0.5) * 46, -4.6 + rng() * 1.4, -12 - rng() * 32);
      const s = 2.4 + rng() * 5;
      sc.set(s, s * 0.3, s * 0.8);
      q.setFromEuler(new THREE.Euler(0, rng() * 3, 0));
      m4.compose(p, q, sc);
      clouds.setMatrixAt(i, m4);
    }
    clouds.instanceMatrix.needsUpdate = true;
    group.add(clouds);

    const birds = new THREE.Group();
    const birdMat = new THREE.LineBasicMaterial({ color: 0xbdeee6, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 12; i++) {
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute([-0.22, 0, 0, 0, 0.08, 0, 0, 0.08, 0, 0.22, 0, 0], 3));
      const b = new THREE.LineSegments(bg, birdMat);
      b.position.set(-10 + i * 1.8, 2.6 + (i % 4) * 0.9, -18 - (i % 3) * 6);
      b.userData.phase = i * 0.7;
      birds.add(b);
    }
    group.add(birds);

    const sunGlow = glowSprite(tex.glowMint, 0xbcffee, 14, 0.24);
    sunGlow.position.set(8, 5, -48);
    group.add(sunGlow);

    return {
      group,
      update(dt, t) {
        atmos.uniforms.uTime.value = t;
        islands.forEach((is, i) => {
          is.g.position.y = is.baseY + Math.sin(t * 0.16 + is.phase) * (0.12 + i * 0.015);
          is.g.rotation.z = Math.sin(t * 0.1 + is.phase) * 0.006;
          if (is.fallTex) is.fallTex.offset.y = -t * 0.22;
        });
        birds.children.forEach((b) => {
          b.position.x += Math.sin(t * 0.12 + b.userData.phase) * 0.0016;
          b.position.y += Math.sin(t * 0.9 + b.userData.phase) * 0.0018;
        });
      }
    };
  }

  /* ———————————————————— 13 沙海 · DUNES ———————————————————— */

  function buildDunes(tex) {
    const group = new THREE.Group();
    group.name = 'dunes';
    const atmos = makeAtmos({
      top: '#080a1d', mid: '#2a2038', horizon: '#8d5545', glow: '#e2a06b',
      sunColor: '#ffd6a0', sunDir: [-0.55, 0.18, -0.84], sunSize: 0.045, sunHalo: 0.8,
      stars: 1.05, cloud: 0.08, cloudColor: '#382a3a', cloudLit: '#7c5443'
    });
    group.add(atmos.mesh);
    addLights(group, { sky: '#8d7a96', ground: '#3a2620', hemi: 0.6, color: '#ffcf95', intensity: 1.05, pos: [-7, 6, -6] });

    /* 沙丘地形 */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(95, 70, 70, 42),
      standard(0xb3835c, 0.98, 0, { flat: true })
    );
    const pos = ground.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h = Math.sin(x * 0.17 + y * 0.08) * 1.2 +
        Math.sin(x * 0.07 - y * 0.16 + 1.4) * 1.8 +
        Math.cos(x * 0.3 + y * 0.24) * 0.28;
      pos.setZ(i, h + Math.max(0, -y) * 0.025);
    }
    ground.geometry.computeVertexNormals();
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -1.1, -28);
    group.add(ground);

    // 近处的一道沙脊
    const ridge = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 10, 30, 8),
      standard(0xa77650, 0.98, 0, { flat: true })
    );
    const rp = ridge.geometry.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i);
      const y = rp.getY(i);
      rp.setZ(i, Math.sin(x * 0.32 + 2.0) * 0.7 + Math.cos(y * 0.4) * 0.18 + 0.9);
    }
    ridge.geometry.computeVertexNormals();
    ridge.rotation.x = -Math.PI / 2;
    ridge.position.set(0, -1.45, -9.6);
    group.add(ridge);

    const stone = standard(0x4c3a33, 0.96, 0, { flat: true });
    const stoneLit = standard(0x7d5a45, 0.94, 0, { flat: true });

    /* 半埋的石门 */
    const gate = new THREE.Group();
    [-1, 1].forEach((s) => {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 0.6), stone);
      pil.position.set(s * 1.5, 1.2, 0);
      pil.rotation.z = s * 0.05;
      gate.add(pil);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.8), stoneLit);
      cap.position.set(s * 1.5, 2.96, 0);
      gate.add(cap);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.4, 0.7), stoneLit);
    lintel.position.y = 3.24;
    lintel.rotation.z = 0.03;
    gate.add(lintel);
    // 门里的微光
    const doorGlow = glowSprite(tex.glowWarm, 0xffb76a, 2.4, 0.26);
    doorGlow.position.set(0, 2.4, -0.2);
    gate.add(doorGlow);
    gate.position.set(-3.4, -1.1, -15.5);
    gate.rotation.y = 0.12;
    group.add(gate);

    /* 方尖碑与刻痕 */
    const obelisk = new THREE.Mesh(new THREE.ConeGeometry(0.5, 5.6, 4), stoneLit);
    obelisk.position.set(5.8, 1.7, -19);
    obelisk.rotation.y = 0.5;
    group.add(obelisk);
    const runes = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.02), basic(0xffc276, { additive: true, toneMapped: false }));
      r.position.set(5.8 + Math.sin(i) * 0.2, 0.7 + i * 0.5, -19 - Math.cos(i) * 0.2);
      r.rotation.y = 0.5;
      runes.add(r);
    }
    group.add(runes);

    const caravan = camels(group, 2.0, -1.0, -14.4, 1.15);
    const caravan2 = camels(group, 3.4, -1.05, -17.8, 0.9);

    /* 双月 */
    const moon1 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex.moonDisc, color: 0xffe0ae, transparent: true, depthWrite: false, fog: false, toneMapped: false
    }));
    moon1.scale.set(8.5, 8.5, 1);
    moon1.position.set(-15, 8.5, -55);
    group.add(moon1);
    const moon2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex.moonDisc, color: 0xf0a68a, transparent: true, opacity: 0.65, depthWrite: false, fog: false, toneMapped: false
    }));
    moon2.scale.set(2.8, 2.8, 1);
    moon2.position.set(12, 11, -62);
    group.add(moon2);

    /* 被风卷起的沙 */
    const sand = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        size: 0.05, map: tex.spark, color: 0xffd6a2, transparent: true, opacity: 0.5,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false, fog: false
      })
    );
    const N = 180;
    const sp = new Float32Array(N * 3);
    const sd = [];
    const rng = U.mulberry32(903);
    for (let i = 0; i < N; i++) {
      sp[i * 3] = (rng() - 0.5) * 30;
      sp[i * 3 + 1] = -0.8 + rng() * 5;
      sp[i * 3 + 2] = -8 - rng() * 26;
      sd.push({ sp: 0.35 + rng() * 0.8, ph: rng() * 6.28 });
    }
    sand.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sand.frustumCulled = false;
    group.add(sand);

    const haze = glowSprite(tex.glowWarm, 0xe2a06b, 26, 0.14);
    haze.position.set(-12, 2, -50);
    group.add(haze);

    return {
      group,
      update(dt, t) {
        atmos.uniforms.uTime.value = t;
        const arr = sand.geometry.attributes.position.array;
        for (let i = 0; i < N; i++) {
          arr[i * 3] += sd[i].sp * dt;
          arr[i * 3 + 1] += Math.sin(t * 0.7 + sd[i].ph) * dt * 0.06;
          if (arr[i * 3] > 15) arr[i * 3] = -15;
        }
        sand.geometry.attributes.position.needsUpdate = true;
        caravan.position.y = -1 + Math.sin(t * 0.5) * 0.01;
        caravan2.position.y = -1.05 + Math.sin(t * 0.42 + 1) * 0.012;
        gate.rotation.y = 0.12 + Math.sin(t * 0.05) * 0.005;
      }
    };
  }

  /* ———————————————————— 14 冰原 · ICE FIELD ———————————————————— */

  function buildIce(tex) {
    const group = new THREE.Group();
    group.name = 'ice';
    const atmos = makeAtmos({
      top: '#02090f', mid: '#123440', horizon: '#2c6b72', glow: '#7fe0d1',
      sunColor: '#d8fbff', sunDir: [-0.25, 0.3, -0.92], sunSize: 0.02, sunHalo: 0.7,
      stars: 0.95, cloud: 0.06, cloudColor: '#0f2930', cloudLit: '#2f6068',
      aurora: 0.65, auroraA: '#68f0cf', auroraB: '#7f8ee0'
    });
    group.add(atmos.mesh);
    addLights(group, { sky: '#8acdd8', ground: '#122a31', hemi: 0.62, color: '#d8fbff', intensity: 0.95, pos: [-4, 8, -5] });

    const iceGround = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 64, 40, 28),
      standard(0x6fa3ab, 0.42, 0.18, { flat: true })
    );
    const gp = iceGround.geometry.attributes.position;
    const rng = U.mulberry32(1511);
    for (let i = 0; i < gp.count; i++) {
      gp.setZ(i, Math.sin(gp.getX(i) * 0.18) * 0.24 + Math.cos(gp.getY(i) * 0.22) * 0.18);
    }
    iceGround.geometry.computeVertexNormals();
    iceGround.rotation.x = -Math.PI / 2;
    iceGround.position.set(0, -0.9, -26);
    group.add(iceGround);

    /* 冰湖 */
    const lake = new THREE.Mesh(
      new THREE.CircleGeometry(9, 36),
      new THREE.MeshStandardMaterial({
        color: 0x163b46, roughness: 0.12, metalness: 0.55, transparent: true, opacity: 0.85
      })
    );
    lake.rotation.x = -Math.PI / 2;
    lake.scale.set(1.6, 1, 1);
    lake.position.set(1.5, -0.82, -18);
    group.add(lake);

    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xaeece8, roughness: 0.14, metalness: 0.12,
      emissive: 0x2e8f8e, emissiveIntensity: 0.4, transparent: true, opacity: 0.82,
      flatShading: true, side: THREE.DoubleSide
    });
    const crystals = [];
    function cluster(x, z, base, count, scale) {
      const g = new THREE.Group();
      for (let i = 0; i < count; i++) {
        const h = (1.2 + rng() * 3.4) * scale;
        const r = (0.16 + rng() * 0.34) * scale;
        const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), crystalMat);
        c.position.set((rng() - 0.5) * 1.1 * scale, h / 2, (rng() - 0.5) * 1.1 * scale);
        c.rotation.z = (rng() - 0.5) * 0.5;
        c.rotation.x = (rng() - 0.5) * 0.5;
        g.add(c);
        crystals.push(c);
      }
      g.position.set(x, base, z);
      group.add(g);
    }
    cluster(-5.2, -13.5, -0.9, 5, 1.2);
    cluster(5.9, -16.5, -0.9, 6, 1.0);
    cluster(-1.4, -21, -0.9, 4, 0.8);
    cluster(-9, -24, -0.9, 7, 1.4);
    cluster(9, -27, -0.9, 5, 1.1);
    cluster(0.8, -31, -0.9, 8, 1.5);

    /* 冰拱门 */
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xbfeee9, roughness: 0.18, metalness: 0.08, transparent: true, opacity: 0.72, flatShading: true
    });
    const arch = new THREE.Group();
    const top = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.28, 6, 22, Math.PI), archMat);
    top.position.y = 2.0;
    arch.add(top);
    [-1, 1].forEach((s) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 2.4, 6), archMat);
      leg.position.set(s * 2.2, 1.0, 0);
      arch.add(leg);
    });
    arch.position.set(-2.8, -0.9, -17.5);
    arch.rotation.y = -0.18;
    group.add(arch);
    const archGlow = glowSprite(tex.glowMint, 0x94f2e5, 4.6, 0.22);
    archGlow.position.set(-2.8, 1.4, -17.6);
    group.add(archGlow);

    /* 月光与雪 */
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex.moonDisc, color: 0xdaf7ff, transparent: true, opacity: 0.9, depthWrite: false, fog: false, toneMapped: false
    }));
    moon.scale.set(5.2, 5.2, 1);
    moon.position.set(10, 9, -50);
    group.add(moon);

    const snow = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        size: 0.055, map: tex.spark, color: 0xd8ffff, transparent: true, opacity: 0.65,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false, fog: false
      })
    );
    const N = 360;
    const sp = new Float32Array(N * 3);
    const seed = [];
    for (let i = 0; i < N; i++) {
      sp[i * 3] = (rng() - 0.5) * 32;
      sp[i * 3 + 1] = rng() * 11 - 1;
      sp[i * 3 + 2] = -6 - rng() * 30;
      seed.push({ v: 0.16 + rng() * 0.3, ph: rng() * 6.28 });
    }
    snow.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    snow.frustumCulled = false;
    group.add(snow);

    return {
      group,
      update(dt, t) {
        atmos.uniforms.uTime.value = t;
        crystalMat.emissiveIntensity = 0.3 + Math.sin(t * 0.55) * 0.14;
        crystals.forEach((c, i) => {
          c.rotation.y = Math.sin(t * 0.2 + i) * 0.04;
        });
        const arr = snow.geometry.attributes.position.array;
        for (let i = 0; i < N; i++) {
          arr[i * 3 + 1] -= seed[i].v * dt;
          arr[i * 3] += Math.sin(t * 0.4 + seed[i].ph) * dt * 0.06;
          if (arr[i * 3 + 1] < -1.2) arr[i * 3 + 1] = 10;
        }
        snow.geometry.attributes.position.needsUpdate = true;
        moon.material.opacity = 0.82 + Math.sin(t * 0.3) * 0.06;
      }
    };
  }

  /* ———————————————————— 15 萤森 · GLOW WOOD ———————————————————— */

  function buildFirefly(tex) {
    const group = new THREE.Group();
    group.name = 'firefly';
    const atmos = makeAtmos({
      top: '#020c09', mid: '#0b2620', horizon: '#2c5142', glow: '#a8dba0',
      sunColor: '#d8ffc0', sunDir: [-0.35, 0.42, -0.84], sunSize: 0.016, sunHalo: 0.3,
      stars: 0.4, cloud: 0.08, cloudColor: '#10261f', cloudLit: '#31513f'
    });
    group.add(atmos.mesh);
    addLights(group, { sky: '#6c9c86', ground: '#0d1b15', hemi: 0.5, color: '#bfe6a8', intensity: 0.6, pos: [-5, 8, -4] });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 52, 26, 18),
      standard(0x25372a, 0.98, 0, { flat: true })
    );
    const fp = floor.geometry.attributes.position;
    const rng = U.mulberry32(1613);
    for (let i = 0; i < fp.count; i++) {
      fp.setZ(i, Math.sin(fp.getX(i) * 0.2) * 0.18 + Math.cos(fp.getY(i) * 0.24) * 0.12);
    }
    floor.geometry.computeVertexNormals();
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.85, -22);
    group.add(floor);

    /* 会发光的溪 */
    const waterTex = waterTexture('rgba(24,86,72,1)');
    const stream = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 24),
      new THREE.MeshBasicMaterial({ map: waterTex, transparent: true, opacity: 0.9, depthWrite: false, fog: true })
    );
    stream.rotation.x = -Math.PI / 2;
    stream.rotation.z = -0.12;
    stream.position.set(1.2, -0.78, -17);
    group.add(stream);
    for (let i = 0; i < 7; i++) {
      const gl = glowSprite(tex.glowMint, 0x86f0c2, 0.9 + rng(), 0.08);
      gl.position.set(1.2 + Math.sin(i) * 1.1, -0.72, -8 - i * 3);
      group.add(gl);
    }

    /* 树与藤 */
    const trunkMat = standard(0x2c241c, 0.96, 0, { flat: true });
    const leafMat = standard(0x1b3b2c, 0.95, 0, { flat: true });
    const leafLit = standard(0x2f5940, 0.92, 0, { flat: true });
    const trees = [];
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      const tr = tree(group, side * (4.5 + rng() * 5.5), -9 - rng() * 18, 0.9 + rng() * 0.9,
        trunkMat, i % 3 === 0 ? leafLit : leafMat, 400 + i);
      trees.push(tr);
    }
    // 低垂的藤蔓与灯
    for (let i = 0; i < 10; i++) {
      const a = -3 + rng() * 7;
      const lamp = glowSprite(tex.glowWarm, 0xffc36e, 0.28 + rng() * 0.15, 0.7);
      lamp.position.set(a, 2.2 + rng() * 1.5, -10 - rng() * 12);
      group.add(lamp);
      const string = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new V3(a, 4.6, lamp.position.z), lamp.position.clone()]),
        new THREE.LineBasicMaterial({ color: 0x4d5b3d, transparent: true, opacity: 0.35 })
      );
      group.add(string);
    }

    /* 发光菌 */
    const mushroomCap = new THREE.MeshStandardMaterial({
      color: 0x9be8a0, roughness: 0.65, metalness: 0, emissive: 0x3fa05c, emissiveIntensity: 0.8
    });
    const mushroomCapWarm = new THREE.MeshStandardMaterial({
      color: 0xffcf8a, roughness: 0.65, metalness: 0, emissive: 0xd08a42, emissiveIntensity: 0.7
    });
    const stemMat = standard(0xd6cfb3, 0.85, 0);
    const shrooms = [];
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const h = 0.35 + rng() * 0.9;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, h, 7), stemMat);
      stem.position.y = h / 2;
      g.add(stem);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 + rng() * 0.24, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
        i % 3 === 0 ? mushroomCapWarm : mushroomCap
      );
      cap.scale.set(1, 0.55, 1);
      cap.position.y = h;
      g.add(cap);
      g.position.set(-4.5 + rng() * 9, -0.75, -10 - rng() * 10);
      group.add(g);
      shrooms.push(g);
    }
    const shroomLight = new THREE.PointLight(0x8fe08c, 0.9, 7, 2);
    shroomLight.position.set(-1.4, 1.0, -12.5);
    group.add(shroomLight);

    /* 小鹿 */
    const deer = new THREE.Group();
    const deerMat = standard(0x5a4633, 0.9, 0);
    const deerDark = standard(0x2f251b, 0.95, 0);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), deerMat);
    body.scale.set(1.5, 0.9, 0.75);
    body.position.y = 0.82;
    deer.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.55, 6), deerMat);
    neck.position.set(0.36, 1.08, 0);
    neck.rotation.z = -0.35;
    deer.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), deerMat);
    head.scale.set(1.5, 0.9, 0.9);
    head.position.set(0.56, 1.3, 0);
    deer.add(head);
    [-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), deerDark);
      ear.position.set(0.5, 1.46, s * 0.09);
      ear.rotation.x = s * 0.3;
      deer.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), basic(0xffe2a0, { toneMapped: false }));
      eye.position.set(0.68, 1.34, s * 0.075);
      deer.add(eye);
      for (let i = 0; i < 2; i++) {
        const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.26, 4), deerDark);
        antler.position.set(0.52 + i * 0.05, 1.55 + i * 0.03, s * 0.05);
        antler.rotation.z = (i - 0.5) * 0.5;
        antler.rotation.x = s * 0.4;
        deer.add(antler);
      }
    });
    [[-0.24, -0.1], [-0.24, 0.1], [0.26, -0.1], [0.26, 0.1]].forEach((p) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.72, 4), deerDark);
      leg.position.set(p[0], 0.36, p[1]);
      deer.add(leg);
    });
    deer.position.set(2.2, -0.8, -11.5);
    deer.rotation.y = -0.5;
    group.add(deer);

    /* 萤火虫：着色器点精灵 */
    const N = 170;
    const fireGeo = new THREE.BufferGeometry();
    const fpos = new Float32Array(N * 3);
    const fseed = new Float32Array(N);
    const fsize = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      fpos[i * 3] = -9 + rng() * 18;
      fpos[i * 3 + 1] = -0.3 + rng() * 4.5;
      fpos[i * 3 + 2] = -6 - rng() * 22;
      fseed[i] = rng();
      fsize[i] = 0.6 + rng() * 1.8;
    }
    fireGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
    fireGeo.setAttribute('aSeed', new THREE.BufferAttribute(fseed, 1));
    fireGeo.setAttribute('aSize', new THREE.BufferAttribute(fsize, 1));
    const fireMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uMap: { value: tex.glowMint }, uColor: { value: new THREE.Color(0xd6ff9a) }
      },
      vertexShader: `
        attribute float aSeed, aSize;
        uniform float uTime, uPixel;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.5 + aSeed * 6.283) * 0.6;
          p.y += sin(uTime * 0.37 + aSeed * 11.0) * 0.35;
          p.z += cos(uTime * 0.28 + aSeed * 7.0) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = max(-mv.z, 0.1);
          gl_PointSize = aSize * uPixel * (26.0 / d);
          gl_Position = projectionMatrix * mv;
          float tw = 0.55 + 0.45 * sin(uTime * 2.0 + aSeed * 24.0);
          vAlpha = tw * smoothstep(0.5, 3.0, d) * (1.0 - smoothstep(20.0, 30.0, d));
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform sampler2D uMap;
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          float a = t.a * vAlpha * 0.8;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
    });
    const flies = new THREE.Points(fireGeo, fireMat);
    flies.frustumCulled = false;
    group.add(flies);

    return {
      group,
      update(dt, t) {
        atmos.uniforms.uTime.value = t;
        fireMat.uniforms.uTime.value = t;
        waterTex.offset.y = -t * 0.06;
        shroomLight.intensity = 0.75 + Math.sin(t * 0.8) * 0.18;
        shrooms.forEach((s, i) => {
          s.rotation.z = Math.sin(t * 0.4 + i) * 0.015;
        });
        deer.rotation.y = -0.5 + Math.sin(t * 0.18) * 0.18;
        deer.children.forEach((c) => {
          if (c.geometry && c.geometry.type === 'SphereGeometry') c.rotation.y = Math.sin(t * 0.3) * 0.03;
        });
      }
    };
  }

  /* ———————————————————— 16 书海 · BOOK SEA ———————————————————— */

  function buildBookSea(tex) {
    const group = new THREE.Group();
    group.name = 'booksea';
    const atmos = makeAtmos({
      top: '#140d17', mid: '#3a2422', horizon: '#8c5a3d', glow: '#e8b075',
      sunColor: '#ffd9a2', sunDir: [0.4, 0.3, -0.87], sunSize: 0.018, sunHalo: 0.45,
      stars: 0.28, cloud: 0.1, cloudColor: '#3a2622', cloudLit: '#7d5138'
    });
    group.add(atmos.mesh);
    addLights(group, { sky: '#b08c6c', ground: '#1c120f', hemi: 0.55, color: '#f0cf9e', intensity: 0.8, pos: [4, 7, -5] });

    const woodMat = standard(0x4f3525, 0.8, 0.02, { flat: true });
    const trimMat = standard(0x9c7546, 0.5, 0.4);
    const rng = U.mulberry32(1717);

    /* 悬空书架拱门 */
    function shelfArch(x, y, z, s, ry) {
      const g = new THREE.Group();
      const W = 5 * s;
      const H = 4.2 * s;
      [-1, 1].forEach((side) => {
        const column = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, H, 0.5 * s), woodMat);
        column.position.set(side * W / 2, H / 2, 0);
        g.add(column);
        for (let i = 0; i < 5; i++) {
          const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.0 * s, 0.1 * s, 0.46 * s), woodMat);
          shelf.position.set(side * (W / 2 - 0.9 * s), 0.5 * s + i * 0.78 * s, 0);
          g.add(shelf);
          for (let b = 0; b < 6; b++) {
            const bh = 0.3 + rng() * 0.22;
            const book = new THREE.Mesh(
              new THREE.BoxGeometry(0.1 * s + rng() * 0.04, bh * s, 0.3 * s),
              standard([0x8a5a43, 0x5c6a55, 0x7d6b4a, 0x4b5566, 0x8a6b6b][Math.floor(rng() * 5)], 0.85, 0)
            );
            book.position.set(
              side * (W / 2 - 0.9 * s) - 0.8 * s + b * 0.27 * s,
              0.5 * s + i * 0.78 * s + (bh * s) / 2 + 0.06 * s,
              0.02
            );
            book.rotation.z = (rng() - 0.5) * 0.08;
            g.add(book);
          }
        }
        // 拱顶
        const arc = new THREE.Mesh(new THREE.TorusGeometry(W / 2, 0.12 * s, 5, 20, Math.PI), trimMat);
        arc.position.y = H;
        arc.rotation.z = 0;
        g.add(arc);
      });
      g.position.set(x, y, z);
      g.rotation.y = ry || 0;
      group.add(g);
      return g;
    }
    shelfArch(-5.5, 0.5, -16, 1.0, 0.25);
    shelfArch(6.4, 1.4, -22, 1.15, -0.3);
    shelfArch(-9.5, 2.2, -30, 1.35, 0.15);

    /* 浮书 */
    const bookCount = 44;
    const coverGeo = new THREE.BoxGeometry(0.5, 0.68, 0.09);
    const pageGeo = new THREE.BoxGeometry(0.44, 0.6, 0.045);
    const coverMat = standard(0xffffff, 0.85, 0.02, { flat: true });
    const pageMat = standard(0xefe3c9, 0.92, 0);
    const covers = new THREE.InstancedMesh(coverGeo, coverMat, bookCount);
    const pages = new THREE.InstancedMesh(pageGeo, pageMat, bookCount);
    const books = [];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new V3();
    const p = new V3();
    const coverColors = [0x8b5a43, 0x536453, 0x8b7448, 0x4c5769, 0x7e5158, 0x9b8456];
    for (let i = 0; i < bookCount; i++) {
      p.set((rng() - 0.5) * 26, 0.2 + rng() * 7, -8 - rng() * 26);
      const s = 0.6 + rng() * 0.9;
      sc.set(s, s, s);
      q.setFromEuler(new THREE.Euler((rng() - 0.5) * 1.2, rng() * Math.PI, (rng() - 0.5) * 0.9));
      m4.compose(p, q, sc);
      covers.setMatrixAt(i, m4);
      pages.setMatrixAt(i, m4);
      covers.setColorAt(i, new THREE.Color(coverColors[Math.floor(rng() * coverColors.length)]));
      books.push({ p, q, s, ph: rng() * 6.28, spin: (rng() - 0.5) * 0.1 });
    }
    covers.instanceMatrix.needsUpdate = true;
    pages.instanceMatrix.needsUpdate = true;
    if (covers.instanceColor) covers.instanceColor.needsUpdate = true;
    covers.frustumCulled = false;
    pages.frustumCulled = false;
    group.add(covers, pages);

    /* 飞的纸页 */
    const pageCount = 42;
    const sheetGeo = new THREE.PlaneGeometry(0.26, 0.34);
    const sheetMat = new THREE.MeshStandardMaterial({
      color: 0xf2e7d0, roughness: 0.9, side: THREE.DoubleSide,
      transparent: true, opacity: 0.9, depthWrite: false
    });
    const sheets = new THREE.InstancedMesh(sheetGeo, sheetMat, pageCount);
    const sheetData = [];
    for (let i = 0; i < pageCount; i++) {
      const data = {
        x: (rng() - 0.5) * 24,
        y: 0.4 + rng() * 7,
        z: -8 - rng() * 24,
        ph: rng() * 6.28,
        sp: 0.13 + rng() * 0.3,
        rot: rng() * 6.28
      };
      sheetData.push(data);
      m4.compose(new V3(data.x, data.y, data.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(data.rot, data.rot, 0)), new V3(1, 1, 1));
      sheets.setMatrixAt(i, m4);
    }
    sheets.instanceMatrix.needsUpdate = true;
    sheets.frustumCulled = false;
    group.add(sheets);

    /* 吊灯 */
    const lamps = [];
    for (let i = 0; i < 5; i++) {
      const lx = -6 + i * 3.1;
      const lz = -11 - (i % 2) * 5;
      const cordLen = 4.5 + rng() * 2;
      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, cordLen, 4),
        standard(0x2a1d16, 0.9, 0)
      );
      cord.position.set(lx, 8 - cordLen / 2, lz);
      group.add(cord);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), basic(0xffd8a0, { toneMapped: false }));
      bulb.position.set(lx, 8 - cordLen, lz);
      group.add(bulb);
      const halo = glowSprite(tex.glowWarm, 0xffc078, 1.5, 0.55);
      halo.position.copy(bulb.position);
      group.add(halo);
      lamps.push({ bulb, halo, ph: rng() * 6.28, baseX: lx });
    }
    const lampLight = new THREE.PointLight(0xffc07a, 1.15, 18, 2);
    lampLight.position.set(0, 3.8, -12);
    group.add(lampLight);

    /* 纸船 */
    const boat = new THREE.Group();
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-0.8, 0);
    hullShape.lineTo(0.8, 0);
    hullShape.lineTo(0.55, 0.35);
    hullShape.lineTo(-0.55, 0.35);
    hullShape.closePath();
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 0.4, bevelEnabled: false });
    hullGeo.rotateX(-Math.PI / 2);
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: 0xf0e2c5, roughness: 0.9, side: THREE.DoubleSide }));
    hull.position.y = -0.1;
    boat.add(hull);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), new THREE.MeshStandardMaterial({ color: 0xf6ecd8, roughness: 0.9, side: THREE.DoubleSide }));
    sail.position.set(0, 0.7, 0);
    boat.add(sail);
    boat.position.set(2.2, 1.4, -13);
    boat.rotation.y = 0.3;
    group.add(boat);

    return {
      group,
      update(dt, t) {
        atmos.uniforms.uTime.value = t;
        for (let i = 0; i < bookCount; i++) {
          const b = books[i];
          p.set(b.p.x + Math.sin(t * 0.2 + b.ph) * 0.35, b.p.y + Math.sin(t * 0.45 + b.ph) * 0.22, b.p.z);
          q.setFromEuler(new THREE.Euler(
            Math.sin(t * 0.2 + b.ph) * 0.22,
            b.q.y + t * b.spin * 0.1,
            Math.cos(t * 0.16 + b.ph) * 0.18
          ));
          sc.set(b.s, b.s, b.s);
          m4.compose(p, q, sc);
          covers.setMatrixAt(i, m4);
          pages.setMatrixAt(i, m4);
        }
        covers.instanceMatrix.needsUpdate = true;
        pages.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < pageCount; i++) {
          const d = sheetData[i];
          p.set(d.x + Math.sin(t * d.sp + d.ph) * 2.2, d.y + Math.sin(t * 0.3 + d.ph) * 0.7, d.z);
          q.setFromEuler(new THREE.Euler(t * d.sp + d.rot, t * 0.2 + d.ph, Math.sin(t * 0.4 + d.ph) * 0.8));
          sc.set(1, 1, 1);
          m4.compose(p, q, sc);
          sheets.setMatrixAt(i, m4);
        }
        sheets.instanceMatrix.needsUpdate = true;
        lamps.forEach((l) => {
          l.halo.material.opacity = 0.45 + Math.sin(t * 0.6 + l.ph) * 0.12;
          l.bulb.position.x = l.baseX + Math.sin(t * 0.2 + l.ph) * 0.08;
          l.halo.position.x = l.bulb.position.x;
        });
        boat.position.y = 1.4 + Math.sin(t * 0.32) * 0.18;
        boat.rotation.z = Math.sin(t * 0.24) * 0.04;
      }
    };
  }

  /* ———————————————————— 17 月面 · MOONLIT ———————————————————— */

  function earthTexture() {
    return canvasTexture(256, 128, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1b4d84');
      g.addColorStop(0.5, '#1d6aa6');
      g.addColorStop(1, '#12395f');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
      const rng = U.mulberry32(199);
      x.fillStyle = 'rgba(118,146,96,0.95)';
      for (let i = 0; i < 12; i++) {
        const cx = rng() * w;
        const cy = 22 + rng() * 82;
        x.beginPath();
        for (let a = 0; a < 9; a++) {
          const ang = (a / 9) * Math.PI * 2;
          const r = 6 + rng() * 20;
          x.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.7);
        }
        x.fill();
      }
      x.fillStyle = 'rgba(225,224,210,0.5)';
      for (let i = 0; i < 22; i++) {
        x.beginPath();
        x.ellipse(rng() * w, 10 + rng() * 105, 8 + rng() * 20, 3 + rng() * 6, rng(), 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = 'rgba(255,255,255,0.25)';
      x.fillRect(0, 0, w, 4);
      x.fillRect(0, h - 4, w, 4);
    }, { clamp: true, aniso: 4 });
  }

  function buildMoon(tex) {
    const group = new THREE.Group();
    group.name = 'moon';
    const atmos = makeAtmos({
      top: '#000206', mid: '#040812', horizon: '#101a2c', glow: '#5b7fb5',
      sunColor: '#ffffff', sunDir: [0.5, 0.45, -0.78], sunSize: 0.016, sunHalo: 0.45,
      stars: 1.55, cloud: 0
    });
    group.add(atmos.mesh);
    addLights(group, { sky: '#8090b5', ground: '#141822', hemi: 0.5, color: '#dfe9ff', intensity: 1.25, pos: [7, 9, -5] });

    /* 月壤 */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 70, 56, 36),
      standard(0x9a9c9c, 0.96, 0, { flat: true })
    );
    const gp = ground.geometry.attributes.position;
    const rng = U.mulberry32(1811);
    for (let i = 0; i < gp.count; i++) {
      gp.setZ(i, Math.sin(gp.getX(i) * 0.2) * 0.22 + Math.cos(gp.getY(i) * 0.17) * 0.16 - 0.2);
    }
    ground.geometry.computeVertexNormals();
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -1.0, -27);
    group.add(ground);

    /* 环形山 */
    const craterMat = standard(0x6e7275, 0.97, 0, { flat: true });
    const craterPos = [[-4.2, -13.5, 1.4], [4.8, -18, 2.1], [-8.5, -22, 2.8], [9.5, -26, 1.6], [0.5, -28, 3.2]];
    craterPos.forEach((c) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(c[2], 0.22, 4, 26), craterMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(c[0], -0.72 + (c[2] > 2 ? 0.02 : 0), c[1]);
      group.add(ring);
      const basin = new THREE.Mesh(new THREE.CircleGeometry(c[2] * 0.92, 26), standard(0x7b7e80, 0.98, 0, { flat: true }));
      basin.rotation.x = -Math.PI / 2;
      basin.position.set(c[0], -0.86, c[1]);
      group.add(basin);
    });
    /* 石块 */
    for (let i = 0; i < 18; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + rng() * 0.7, 0), craterMat);
      rock.position.set((rng() - 0.5) * 24, -0.9 + rng() * 0.35, -10 - rng() * 20);
      rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      group.add(rock);
    }
    /* 远处的山脊 */
    for (let i = 0; i < 10; i++) {
      const h = 2 + rng() * 5;
      const m = new THREE.Mesh(new THREE.ConeGeometry(2 + rng() * 4, h, 5), craterMat);
      m.position.set(-28 + i * 6.5, -1 + h / 2, -40 - rng() * 12);
      group.add(m);
    }

    /* 地球 */
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(4.6, 32, 20),
      new THREE.MeshBasicMaterial({ map: earthTexture(), fog: false })
    );
    earth.position.set(-13, 8.5, -46);
    earth.rotation.z = 0.3;
    group.add(earth);
    const earthGlow = glowSprite(tex.glowSoft, 0x7db4e8, 15, 0.3);
    earthGlow.position.copy(earth.position);
    group.add(earthGlow);

    /* 玻璃花房 */
    const dome = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.35, 20), standard(0xb9b3a6, 0.7, 0.2));
    base.position.y = 0.17;
    dome.add(base);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbfe0e4, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.18,
      side: THREE.DoubleSide, depthWrite: false, clearcoat: 1
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(2.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
    dome.add(shell);
    // 骨架
    const ribMat = standard(0xc9c2b2, 0.5, 0.35);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.016, 4, 12, Math.PI / 2), ribMat);
      rib.position.y = 0;
      rib.rotation.y = a;
      rib.rotation.z = 0;
      dome.add(rib);
    }
    // 花房里的树与灯
    const treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 1.3, 6), standard(0x6b4b31, 0.9, 0));
    treeTrunk.position.y = 0.85;
    dome.add(treeTrunk);
    const treeCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), standard(0x6f9a63, 0.9, 0, { flat: true }));
    treeCrown.position.set(0, 1.8, 0);
    treeCrown.scale.set(1, 0.8, 1);
    dome.add(treeCrown);
    const domeLight = new THREE.PointLight(0xffc884, 1.5, 10, 2);
    domeLight.position.set(0, 1.15, 0.2);
    dome.add(domeLight);
    const domeGlow = glowSprite(tex.glowWarm, 0xffc27d, 5.2, 0.32);
    domeGlow.position.set(0, 1.0, 0.6);
    dome.add(domeGlow);
    for (let i = 0; i < 7; i++) {
      const plant = new THREE.Mesh(new THREE.SphereGeometry(0.18 + rng() * 0.12, 6, 4), standard(0x7ba06b, 0.9, 0, { flat: true }));
      plant.position.set((rng() - 0.5) * 2.4, 0.35, (rng() - 0.5) * 2.4);
      plant.scale.y = 0.6;
      dome.add(plant);
    }
    dome.position.set(1.4, -0.78, -14.5);
    group.add(dome);

    /* 宇航员 */
    const astro = new THREE.Group();
    const suit = standard(0xe9e4da, 0.7, 0.03);
    const dark = standard(0x4a4d52, 0.8, 0.2);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.55, 6, 12), suit);
    torso.position.y = 1.05;
    astro.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), suit);
    head.position.y = 1.72;
    astro.add(head);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.255, 16, 10, 0, Math.PI * 2, 0.7, 1.0), new THREE.MeshBasicMaterial({ color: 0xd8a24a }));
    visor.position.set(0.02, 1.73, 0.18);
    visor.rotation.x = -0.3;
    astro.add(visor);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.3), dark);
    pack.position.set(0, 1.15, -0.34);
    astro.add(pack);
    [-1, 1].forEach((s) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 4, 8), suit);
      leg.position.set(s * 0.18, 0.42, 0);
      astro.add(leg);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.34), dark);
      boot.position.set(s * 0.18, 0.1, 0.06);
      astro.add(boot);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 8), suit);
      arm.position.set(s * 0.5, 1.05, 0.02);
      arm.rotation.z = s * 0.35;
      astro.add(arm);
    });
    astro.position.set(4.2, -0.78, -12.2);
    astro.rotation.y = -0.5;
    group.add(astro);

    /* 小旗 */
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.3, 5), standard(0xd8d3c8, 0.5, 0.4));
    pole.position.set(5.6, 0.1, -13.4);
    group.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.45), new THREE.MeshStandardMaterial({ color: 0xe2cfa4, roughness: 0.9, side: THREE.DoubleSide }));
    flag.position.set(5.98, 0.55, -13.4);
    group.add(flag);

    /* 月尘 */
    const N = 90;
    const dustGeo = new THREE.BufferGeometry();
    const dp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      dp[i * 3] = (rng() - 0.5) * 26;
      dp[i * 3 + 1] = -0.5 + rng() * 3.5;
      dp[i * 3 + 2] = -8 - rng() * 20;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      size: 0.04, map: tex.spark, color: 0xcfd8e8, transparent: true, opacity: 0.4,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false, fog: false
    }));
    dust.frustumCulled = false;
    group.add(dust);

    return {
      group,
      update(dt, t) {
        atmos.uniforms.uTime.value = t;
        earth.rotation.y = t * 0.02 + 1;
        domeGlow.material.opacity = 0.28 + Math.sin(t * 0.7) * 0.06;
        astro.rotation.y = -0.5 + Math.sin(t * 0.2) * 0.06;
        astro.children.forEach((c, i) => {
          if (c.geometry && c.geometry.type === 'CapsuleGeometry' && i > 5) c.rotation.z = Math.sin(t * 0.4 + i) * 0.03;
        });
      }
    };
  }

  /* ———————————————————— 18 花野 · WILDFLOWER ———————————————————— */

  function buildMeadow(tex) {
    const group = new THREE.Group();
    group.name = 'meadow';
    const atmos = makeAtmos({
      top: '#0a0820', mid: '#2c2248', horizon: '#755a7e', glow: '#f4bcc2',
      sunColor: '#ffe1d2', sunDir: [-0.42, 0.22, -0.88], sunSize: 0.018, sunHalo: 0.35,
      stars: 0.95, cloud: 0.1, cloudColor: '#332846', cloudLit: '#7c5c78'
    });
    group.add(atmos.mesh);
    addLights(group, { sky: '#a28cbc', ground: '#231b30', hemi: 0.6, color: '#ffd7ca', intensity: 0.65, pos: [-5, 7, -5] });

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(86, 64, 50, 30),
      standard(0x4d5c48, 0.97, 0, { flat: true })
    );
    const gp = ground.geometry.attributes.position;
    const rng = U.mulberry32(1913);
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i);
      const y = gp.getY(i);
      gp.setZ(i, Math.sin(x * 0.13) * 0.3 + Math.cos(y * 0.12 + 1.2) * 0.4 + Math.sin(x * 0.31 + y * 0.2) * 0.1);
    }
    ground.geometry.computeVertexNormals();
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -1.4, -28);
    group.add(ground);

    /* 大月亮 */
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex.moonDisc, color: 0xffe6dc, transparent: true, opacity: 0.95, depthWrite: false, fog: false, toneMapped: false
    }));
    moon.scale.set(9.5, 9.5, 1);
    moon.position.set(-6, 9.5, -55);
    group.add(moon);
    const moonHalo = glowSprite(tex.glowPink, 0xffc9d2, 22, 0.16);
    moonHalo.position.copy(moon.position);
    group.add(moonHalo);

    /* 花：茎与花头分开实例化，风一吹整片一起伏 */
    const timeU = { value: 0 };
    function windMaterial(color, emissive) {
      const m = standard(color, 0.9, 0, { flat: true, emissive: emissive || 0x000000, emissiveIntensity: emissive ? 0.2 : 0 });
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = timeU;
        shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           #ifdef USE_INSTANCING
             float ph = instanceMatrix[3].x * 0.45 + instanceMatrix[3].z * 0.3;
             float sway = sin(uTime * 1.15 + ph) * 0.055 + sin(uTime * 2.1 + ph * 1.7) * 0.012;
             transformed.x += sway * max(position.y, 0.0) * 1.6;
             transformed.z += sway * 0.5;
           #endif`
        );
      };
      return m;
    }
    const stemMat = windMaterial(0x4f6d46);
    const headMat = windMaterial(0xffffff);
    const headColors = [0xffd9c9, 0xffe8b0, 0xd9b8e8, 0xf2a9b6, 0xfff1dc, 0xc9b0e2];

    const flowerCount = 150;
    const stemGeo = new THREE.CylinderGeometry(0.012, 0.022, 1, 3);
    stemGeo.translate(0, 0.5, 0);
    const headGeo = new THREE.IcosahedronGeometry(0.11, 0);
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, flowerCount);
    const heads = new THREE.InstancedMesh(headGeo, headMat, flowerCount);
    const fm = new THREE.Matrix4();
    const fq = new THREE.Quaternion();
    const fsc = new V3();
    const fp = new V3();
    const flowers = [];
    for (let i = 0; i < flowerCount; i++) {
      const x = (rng() - 0.5) * 25;
      const z = -7 - rng() * 22;
      const h = 0.55 + rng() * 0.85;
      const rot = rng() * Math.PI;
      const lean = (rng() - 0.5) * 0.12;
      fq.setFromEuler(new THREE.Euler(lean, rot, 0));
      fp.set(x, -1.35, z);
      fsc.set(1, h, 1);
      fm.compose(fp, fq, fsc);
      stems.setMatrixAt(i, fm);
      const headScale = 0.8 + rng() * 0.9;
      fp.set(x + Math.sin(lean) * h * 0.5, -1.35 + h * 0.98, z);
      fsc.set(headScale, headScale * 0.8, headScale);
      fm.compose(fp, fq, fsc);
      heads.setMatrixAt(i, fm);
      heads.setColorAt(i, new THREE.Color(headColors[Math.floor(rng() * headColors.length)]));
      flowers.push({ x, z, h, ph: rng() * 6.28 });
    }
    stems.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    stems.frustumCulled = false;
    heads.frustumCulled = false;
    group.add(stems, heads);

    /* 草叶 */
    const grassGeo = new THREE.ConeGeometry(0.035, 0.6, 3);
    grassGeo.translate(0, 0.3, 0);
    const grassMat = windMaterial(0x546b4c);
    const grassCount = 260;
    const grass = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
    for (let i = 0; i < grassCount; i++) {
      fp.set((rng() - 0.5) * 30, -1.35, -6 - rng() * 26);
      fsc.set(0.8 + rng() * 0.8, 0.6 + rng() * 1.1, 0.8 + rng() * 0.8);
      fq.setFromEuler(new THREE.Euler(0, rng() * 3, 0));
      fm.compose(fp, fq, fsc);
      grass.setMatrixAt(i, fm);
    }
    grass.instanceMatrix.needsUpdate = true;
    grass.frustumCulled = false;
    group.add(grass);

    /* 风车 */
    const windmill = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 5.0, 7), standard(0x8f7a68, 0.9, 0, { flat: true }));
    tower.position.y = 2.5;
    windmill.add(tower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.8, 7), standard(0x5c4a42, 0.9, 0, { flat: true }));
    roof.position.y = 5.2;
    windmill.add(roof);
    const hub = new THREE.Group();
    hub.position.set(0, 4.6, 0.65);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 0.05), standard(0xc7b48e, 0.8, 0, { flat: true }));
      blade.position.y = 1.2;
      blade.rotation.z = (i / 4) * Math.PI * 2;
      blade.name = 'blade';
      const arm = new THREE.Group();
      arm.rotation.z = (i / 4) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.06), standard(0xc7b48e, 0.8, 0, { flat: true }));
      b.position.y = 1.3;
      arm.add(b);
      hub.add(arm);
    }
    windmill.add(hub);
    windmill.position.set(-6.5, -1.3, -19);
    windmill.rotation.y = 0.25;
    group.add(windmill);

    /* 蝴蝶 */
    const butterflies = [];
    const wingTex = canvasTexture(64, 64, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.translate(32, 34);
      x.fillStyle = 'rgba(255,226,236,0.9)';
      for (const s of [-1, 1]) {
        x.beginPath();
        x.ellipse(s * 13, -6, 15, 19, s * 0.4, 0, Math.PI * 2);
        x.fill();
        x.beginPath();
        x.ellipse(s * 10, 16, 9, 11, s * 0.2, 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = 'rgba(255,255,255,0.55)';
      x.beginPath();
      x.arc(-8, -8, 3, 0, 6.283);
      x.arc(8, -8, 3, 0, 6.283);
      x.fill();
    }, { clamp: true, aniso: 1 });
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.SpriteMaterial({
        map: wingTex, color: headColors[i % headColors.length], transparent: true,
        opacity: 0.85, depthWrite: false, toneMapped: false
      });
      const b = new THREE.Sprite(mat);
      b.scale.set(0.42, 0.32, 1);
      b.position.set((rng() - 0.5) * 12, -0.2 + rng() * 2.6, -8 - rng() * 13);
      b.userData = {
        baseX: b.position.x, baseY: b.position.y, baseZ: b.position.z,
        ph: rng() * 6.28, sp: 0.4 + rng() * 0.5
      };
      group.add(b);
      butterflies.push(b);
    }

    /* 萤火 */
    const fire = starPoints(tex.glowMint, 70, 24, -8, -22, 0xffe8a8, 0.09, 2001);
    fire.position.set(0, 0.7, 0);
    group.add(fire);

    return {
      group,
      update(dt, t) {
        atmos.uniforms.uTime.value = t;
        timeU.value = t;
        hub.rotation.z = -t * 0.35;
        butterflies.forEach((b) => {
          const u = b.userData;
          b.position.x = u.baseX + Math.sin(t * u.sp + u.ph) * 1.8;
          b.position.y = u.baseY + Math.sin(t * u.sp * 1.7 + u.ph) * 0.4;
          b.position.z = u.baseZ + Math.cos(t * u.sp * 0.8 + u.ph) * 0.8;
          b.scale.x = 0.42 * (0.55 + Math.abs(Math.sin(t * 8 + u.ph)) * 0.7);
        });
        moonHalo.material.opacity = 0.14 + Math.sin(t * 0.3) * 0.02;
      }
    };
  }

  /* ———————————————————— 注册 ———————————————————— */

  WP.buildDreamExtra = function (tex) {
    return {
      cloudsea: buildCloudSea(tex),
      isles: buildIsles(tex),
      dunes: buildDunes(tex),
      ice: buildIce(tex),
      firefly: buildFirefly(tex),
      booksea: buildBookSea(tex),
      moon: buildMoon(tex),
      meadow: buildMeadow(tex)
    };
  };
})();
