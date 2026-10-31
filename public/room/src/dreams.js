/* 窗畔 · 幻境：深海、星潮、樱夜、花火
   四种把窗子变成任意门的立体光景。全部由几何、粒子与着色器生成。 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;

  const V3 = THREE.Vector3;

  /* ———————————————————— 公共：天空、贴图与小工具 ———————————————————— */

  const SKY_VERT = `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

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

  function makeSky(fragment, uniforms) {
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: SKY_VERT,
      fragmentShader: fragment,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(86, 48, 32), mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    return mesh;
  }

  function basic(color, opts) {
    opts = opts || {};
    const m = new THREE.MeshBasicMaterial({
      color: color,
      transparent: opts.opacity !== undefined,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: opts.depthWrite === undefined ? true : opts.depthWrite,
      side: opts.side || THREE.FrontSide,
      fog: opts.fog === undefined ? true : opts.fog,
      toneMapped: opts.toneMapped === undefined ? true : opts.toneMapped
    });
    return m;
  }

  function glowSprite(tex, color, scale, opacity, additive) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: color === undefined ? 0xffffff : color,
      transparent: true,
      opacity: opacity === undefined ? 1 : opacity,
      depthWrite: false,
      blending: additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
      fog: false,
      toneMapped: false
    });
    const s = new THREE.Sprite(mat);
    if (scale) s.scale.set(scale, scale, 1);
    return s;
  }

  function radialTex(inner, mid, size) {
    return U.softGlowTexture(inner, mid, size || 128);
  }

  function petalTexture() {
    const s = 64;
    const c = U.makeCanvas(s, s);
    const x = c.getContext('2d');
    x.translate(s / 2, s / 2);
    x.rotate(-0.28);
    const g = x.createLinearGradient(0, -26, 0, 26);
    g.addColorStop(0, 'rgba(255,244,248,1)');
    g.addColorStop(0.5, 'rgba(255,198,216,1)');
    g.addColorStop(1, 'rgba(249,159,190,0.92)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, -26);
    x.bezierCurveTo(19, -19, 22, 7, 0, 26);
    x.bezierCurveTo(-22, 7, -19, -19, 0, -26);
    x.fill();
    x.globalCompositeOperation = 'destination-out';
    x.beginPath();
    x.arc(0, -27, 6.4, 0, Math.PI * 2);
    x.fill();
    x.globalCompositeOperation = 'source-over';
    x.strokeStyle = 'rgba(255,255,255,0.35)';
    x.lineWidth = 1.1;
    x.beginPath();
    x.moveTo(0, -17);
    x.lineTo(0, 19);
    x.stroke();
    return U.canvasTexture(c, { clamp: true, srgb: true, aniso: 1 });
  }

  function bubbleTexture() {
    const s = 64;
    const c = U.makeCanvas(s, s);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(180,255,245,0.10)');
    g.addColorStop(0.62, 'rgba(190,255,246,0.12)');
    g.addColorStop(0.82, 'rgba(210,255,250,0.62)');
    g.addColorStop(0.92, 'rgba(210,255,250,0.18)');
    g.addColorStop(1, 'rgba(210,255,250,0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(32, 32, 30, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.75)';
    x.beginPath();
    x.arc(23, 23, 3.2, 0, Math.PI * 2);
    x.fill();
    return U.canvasTexture(c, { clamp: true, srgb: true, aniso: 1 });
  }

  function shaftTexture() {
    const w = 128, h = 512;
    const c = U.makeCanvas(w, h);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(190,255,244,0.75)');
    g.addColorStop(0.28, 'rgba(150,238,226,0.32)');
    g.addColorStop(1, 'rgba(120,220,210,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-in';
    const hg = x.createLinearGradient(0, 0, w, 0);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.3, 'rgba(0,0,0,0.7)');
    hg.addColorStop(0.5, 'rgba(0,0,0,1)');
    hg.addColorStop(0.7, 'rgba(0,0,0,0.7)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hg;
    x.fillRect(0, 0, w, h);
    return U.canvasTexture(c, { clamp: true, srgb: true, aniso: 2 });
  }

  function moonTexture() {
    const s = 256;
    const c = U.makeCanvas(s, s);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(96, 88, 12, 128, 128, 128);
    g.addColorStop(0, '#fffdf4');
    g.addColorStop(0.55, '#efe7d7');
    g.addColorStop(1, '#c9c1b4');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    const rng = U.mulberry32(87);
    for (let i = 0; i < 26; i++) {
      const r = 2 + rng() * 15;
      x.fillStyle = 'rgba(110,104,102,' + (0.04 + rng() * 0.09) + ')';
      x.beginPath();
      x.ellipse(30 + rng() * 196, 30 + rng() * 196, r, r * (0.7 + rng() * 0.5), rng() * 3, 0, Math.PI * 2);
      x.fill();
    }
    for (let i = 0; i < 8; i++) {
      const r = 4 + rng() * 12;
      x.strokeStyle = 'rgba(255,255,246,0.16)';
      x.lineWidth = 1.4;
      x.beginPath();
      x.arc(34 + rng() * 188, 34 + rng() * 188, r, 0, Math.PI * 2);
      x.stroke();
    }
    return U.canvasTexture(c, { clamp: true, srgb: true, aniso: 2 });
  }

  /* 圆形月盘：给精灵与贴片用，透明边让它不再是一块方形贴图 */
  function moonDiscTexture() {
    const s = 256;
    const c = U.makeCanvas(s, s);
    const x = c.getContext('2d');
    x.clearRect(0, 0, s, s);
    x.save();
    x.beginPath();
    x.arc(128, 128, 124, 0, Math.PI * 2);
    x.clip();
    const g = x.createRadialGradient(96, 88, 10, 128, 128, 130);
    g.addColorStop(0, '#fffdf4');
    g.addColorStop(0.55, '#f2e8d7');
    g.addColorStop(0.86, '#ddd1c0');
    g.addColorStop(1, '#bdb2a4');
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    const rng = U.mulberry32(87);
    for (let i = 0; i < 30; i++) {
      const r = 2 + rng() * 15;
      x.fillStyle = 'rgba(110,104,102,' + (0.035 + rng() * 0.085) + ')';
      x.beginPath();
      x.ellipse(24 + rng() * 208, 24 + rng() * 208, r, r * (0.7 + rng() * 0.5), rng() * 3, 0, Math.PI * 2);
      x.fill();
    }
    for (let i = 0; i < 8; i++) {
      const r = 4 + rng() * 12;
      x.strokeStyle = 'rgba(255,255,246,0.15)';
      x.lineWidth = 1.4;
      x.beginPath();
      x.arc(28 + rng() * 200, 28 + rng() * 200, r, 0, Math.PI * 2);
      x.stroke();
    }
    /* 边缘一圈柔和的通透感，避免贴图圆盘出现硬锯齿 */
    const rim = x.createRadialGradient(128, 128, 108, 128, 128, 124);
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(0.85, 'rgba(0,0,0,0.12)');
    rim.addColorStop(1, 'rgba(0,0,0,0.9)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = rim;
    x.fillRect(0, 0, s, s);
    x.restore();
    return U.canvasTexture(c, { clamp: true, srgb: true, aniso: 4 });
  }

  /* 通用：贴图星点（带顶点色） */
  function starField(count, spread, zRange, tex, size) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const rng = U.mulberry32(1201 + count);
    const palette = [
      [1.0, 0.93, 0.80],
      [0.78, 0.88, 1.0],
      [0.92, 0.84, 1.0],
      [1.0, 0.78, 0.72]
    ];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rng() - 0.5) * spread;
      pos[i * 3 + 1] = (rng() - 0.5) * spread * 0.55 + 2;
      pos[i * 3 + 2] = zRange[0] + rng() * (zRange[1] - zRange[0]);
      const p = palette[Math.floor(rng() * palette.length)];
      col[i * 3] = p[0];
      col[i * 3 + 1] = p[1];
      col[i * 3 + 2] = p[2];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: size || 0.13,
      map: tex,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
      fog: false
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return points;
  }

  function limb(parent, a, b, r1, r2, mat, seg) {
    const dir = new V3().subVectors(b, a);
    const len = dir.length();
    if (len < 0.001) return null;
    const geo = new THREE.CylinderGeometry(r2, r1, len, seg || 7);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.clone().normalize());
    parent.add(m);
    return m;
  }

  /* ———————————————————— 深海 · ABYSS ———————————————————— */

  function buildAbyss(tex) {
    const group = new THREE.Group();
    group.name = 'abyss';

    /* 天空：海面透下来的光、光柱与漂浮物 */
    const skyFrag = `
      precision highp float;
      varying vec3 vDir;
      uniform float uTime;
      uniform vec3 uDeep, uMid, uSurface, uGlow;
      ${NOISE}
      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y;
        vec3 col = mix(uDeep, uMid, smoothstep(-0.55, 0.18, h));
        col = mix(col, uSurface, smoothstep(0.02, 0.92, h) * 0.86);
        col += uGlow * smoothstep(0.55, 1.0, h) * 0.22;

        float az = atan(dir.x, -dir.z);
        float r1 = pow(0.5 + 0.5 * sin(az * 27.0 + sin(az * 5.0 + uTime * 0.05) * 2.4), 7.0);
        float r2 = pow(0.5 + 0.5 * sin(az * 15.0 - uTime * 0.03 + 1.3), 11.0);
        float mask = smoothstep(-0.02, 0.28, h) * (1.0 - smoothstep(0.6, 1.0, h));
        col += uGlow * (r1 * 0.19 + r2 * 0.12) * mask;

        vec2 cuv = dir.xz / (max(h, 0.0) + 0.34) * 0.6;
        float ca = fbm(cuv * 2.1 + vec2(uTime * 0.025, uTime * 0.018));
        float ca2 = fbm(cuv * 4.4 - vec2(uTime * 0.03, 0.0));
        col += uGlow * pow(ca * 0.7 + ca2 * 0.3, 2.6) * smoothstep(0.18, 0.9, h) * 0.3;

        // 极细的悬浮微粒（格内取圆点，别让整格发亮）
        vec2 sc = dir.xz / (abs(h) + 0.4) * 1.4;
        vec2 dg = sc * 130.0;
        float dust = smoothstep(0.9975, 1.0, hash21(floor(dg))) * smoothstep(0.22, 0.03, length(fract(dg) - 0.5));
        col += vec3(0.6, 0.95, 0.9) * dust * smoothstep(-0.2, 0.5, h) * 0.4;

        col *= mix(0.62, 1.0, smoothstep(-0.75, 0.05, h));
        col = aces(col * 1.15);
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    const sky = makeSky(skyFrag, {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#01070d') },
      uMid: { value: new THREE.Color('#042430') },
      uSurface: { value: new THREE.Color('#1e7c83') },
      uGlow: { value: new THREE.Color('#9ff2e0') }
    });
    group.add(sky);

    const light = new THREE.DirectionalLight(0x9fe8df, 1.75);
    light.position.set(-7, 16, -8);
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, 0, -26);
    group.add(lightTarget);
    light.target = lightTarget;
    group.add(light);

    /* 海床与礁石 */
    const floorMat = basic(0x020a0e, { fog: true });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(150, 150, 1, 1), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -6.4, -32);
    group.add(floor);

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x0a2028, roughness: 0.95, metalness: 0.02 });
    const rockMat2 = new THREE.MeshStandardMaterial({ color: 0x0d2a30, roughness: 0.9, metalness: 0.03 });
    const rr = U.mulberry32(311);
    const spire = [];
    for (let i = 0; i < 13; i++) {
      const h = 3 + rr() * 8;
      const r = 0.7 + rr() * 2.4;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6 + Math.floor(rr() * 3), 2), i % 3 ? rockMat : rockMat2);
      cone.position.set(-18 + rr() * 36, -6.4 + h / 2, -18 - rr() * 28);
      cone.rotation.y = rr() * Math.PI;
      group.add(cone);
      spire.push(cone);
    }

    /* 沉没的石拱门 */
    const arch = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x123038, roughness: 0.94, metalness: 0.01 });
    const archGeo = new THREE.TorusGeometry(3.4, 0.36, 8, 40, Math.PI);
    const archTop = new THREE.Mesh(archGeo, stone);
    archTop.position.y = 0.4;
    arch.add(archTop);
    [-1, 1].forEach((s) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 6.4, 9), stone);
      pillar.position.set(s * 3.4, -2.8, 0);
      arch.add(pillar);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.32, 1.15), stone);
      cap.position.set(s * 3.4, 1.0, 0);
      arch.add(cap);
    });
    arch.position.set(-6.8, -3.2, -24);
    arch.rotation.y = 0.16;
    group.add(arch);

    // 拱门上发光的藻类
    const algaeGeo = new THREE.BufferGeometry();
    const algaePos = new Float32Array(42 * 3);
    const ar = U.mulberry32(412);
    for (let i = 0; i < 42; i++) {
      const a = ar() * Math.PI;
      algaePos[i * 3] = -6.8 + Math.cos(a) * 3.4 + (ar() - 0.5) * 0.4;
      algaePos[i * 3 + 1] = -2.8 + Math.sin(a) * 3.4 + (ar() - 0.5) * 0.6;
      algaePos[i * 3 + 2] = -24 + (ar() - 0.5) * 0.5;
    }
    algaeGeo.setAttribute('position', new THREE.BufferAttribute(algaePos, 3));
    const algae = new THREE.Points(algaeGeo, new THREE.PointsMaterial({
      size: 0.14, map: tex.glowMint, color: 0x95ffe6, transparent: true, opacity: 0.8,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false
    }));
    algae.frustumCulled = false;
    group.add(algae);

    /* 鲸：用一条旋转的轮廓挤出圆润的背、钝头和收窄的尾柄，
       再加长胸鳍、尾叶与下颌线，避免“导弹/飞艇”的读感 */
    const whale = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2a6373, roughness: 0.68, metalness: 0.02,
      emissive: 0x0a2b33, emissiveIntensity: 0.8
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0x6d9aa2, roughness: 0.76, metalness: 0.02,
      emissive: 0x13343b, emissiveIntensity: 0.55
    });
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x93bdba, roughness: 0.7, metalness: 0.02,
      emissive: 0x1f4647, emissiveIntensity: 0.5
    });
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x061419, side: THREE.DoubleSide });

    const whProfile = [
      new THREE.Vector2(0.02, 0.0),
      new THREE.Vector2(0.1, 0.08),
      new THREE.Vector2(0.3, 0.32),
      new THREE.Vector2(0.55, 0.7),
      new THREE.Vector2(0.82, 1.22),
      new THREE.Vector2(1.0, 1.8),
      new THREE.Vector2(1.06, 2.3),
      new THREE.Vector2(1.03, 2.72),
      new THREE.Vector2(0.92, 3.1),
      new THREE.Vector2(0.72, 3.5),
      new THREE.Vector2(0.45, 3.9),
      new THREE.Vector2(0.2, 4.15),
      new THREE.Vector2(0.0, 4.22)
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(whProfile, 48), bodyMat);
    body.rotation.z = -Math.PI / 2;
    body.scale.set(0.82, 1, 1.04);
    body.position.x = -2.05;
    whale.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 18), bellyMat);
    belly.scale.set(1.45, 0.28, 0.72);
    belly.position.set(0.02, -0.62, 0);
    whale.add(belly);

    /* 额头与下颌，给钝钝的鲸头一点层次 */
    const forehead = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), bodyMat);
    forehead.scale.set(0.62, 0.46, 0.72);
    forehead.position.set(1.55, 0.28, 0);
    whale.add(forehead);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), bellyMat);
    jaw.scale.set(0.78, 0.22, 0.62);
    jaw.position.set(1.45, -0.42, 0);
    whale.add(jaw);
    const mouthPts = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      const x = 2.06 - k * 0.88;
      const y = -0.16 - k * 0.24 - Math.sin(k * Math.PI) * 0.05;
      mouthPts.push(new V3(x, y, 0.62 + k * 0.26));
    }
    const mouth = U.makeCurveTube(mouthPts, 0.012, darkMat, 18, 4);
    whale.add(mouth);
    const mouth2 = mouth.clone();
    mouth2.scale.z = -1;
    whale.add(mouth2);

    /* 头顶的小结节，像座头鲸 */
    const knots = [[1.5, 0.62, 0.1], [1.7, 0.6, -0.16], [1.86, 0.57, 0.18], [1.35, 0.63, -0.22], [1.62, 0.64, 0.32]];
    knots.forEach((p) => {
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), bodyMat);
      k.position.set(p[0], p[1], p[2]);
      whale.add(k);
    });

    /* 长胸鳍：一片带弧度的扁平轮廓，向外后方扫开 */
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0.12);
    finShape.bezierCurveTo(-0.25, 0.22, -0.62, 0.2, -1.12, 0.02);
    finShape.bezierCurveTo(-1.28, -0.04, -1.26, -0.14, -1.02, -0.18);
    finShape.bezierCurveTo(-0.58, -0.24, -0.18, -0.16, 0.02, -0.05);
    finShape.quadraticCurveTo(0.08, 0.04, 0, 0.12);
    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.04, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.01, bevelThickness: 0.012, steps: 1
    });
    finGeo.translate(0, 0, -0.02);
    [-1, 1].forEach((s) => {
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(0.82, -0.32, s * 0.68);
      fin.rotation.set(s * Math.PI / 2, s * 0.12, -0.16);
      whale.add(fin);
    });

    /* 背鳍：向后倒的钩形 */
    const dorsalShape = new THREE.Shape();
    dorsalShape.moveTo(-0.3, 0);
    dorsalShape.quadraticCurveTo(-0.26, 0.28, 0.02, 0.34);
    dorsalShape.quadraticCurveTo(-0.02, 0.16, -0.14, 0.04);
    dorsalShape.quadraticCurveTo(-0.22, 0, -0.3, 0);
    const dorsal = new THREE.Mesh(new THREE.ExtrudeGeometry(dorsalShape, {
      depth: 0.035, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.006, bevelThickness: 0.008
    }), bodyMat);
    dorsal.position.set(-0.35, 0.64, -0.017);
    whale.add(dorsal);

    /* 尾柄与两片带缺口的尾叶 */
    const tail = new THREE.Group();
    tail.position.set(-2.02, 0, 0);
    const stock = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.24, 0.55, 10), bodyMat);
    stock.rotation.z = Math.PI / 2;
    stock.position.x = -0.28;
    tail.add(stock);
    [-1, 1].forEach((s) => {
      const fl = new THREE.Shape();
      fl.moveTo(0, 0);
      fl.bezierCurveTo(-0.12, s * 0.2, -0.35, s * 0.66, -0.78, s * 0.8);
      fl.bezierCurveTo(-1.0, s * 0.86, -1.08, s * 0.6, -0.94, s * 0.34);
      fl.bezierCurveTo(-0.72, s * 0.08, -0.3, 0, 0, 0);
      const fg = new THREE.ExtrudeGeometry(fl, {
        depth: 0.045, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.008, bevelThickness: 0.01, steps: 1
      });
      fg.translate(0, 0, -0.0225);
      const fluke = new THREE.Mesh(fg, bodyMat);
      fluke.rotation.x = -Math.PI / 2;
      fluke.position.set(-0.52, 0, 0);
      fluke.rotation.y = s * 0.06;
      tail.add(fluke);
    });
    whale.add(tail);

    /* 眼睛与侧腹的呼吸光点 */
    [-1, 1].forEach((s) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd9fff3 }));
      eye.position.set(1.58, 0.22, s * 0.81);
      whale.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), darkMat);
      pupil.position.set(1.61, 0.22, s * 0.84);
      whale.add(pupil);
    });
    const spotGeo = new THREE.BufferGeometry();
    const spotPos = new Float32Array(52 * 3);
    const wr = U.mulberry32(561);
    for (let i = 0; i < 52; i++) {
      const x = -1.45 + wr() * 3.0;
      const t = wr() * Math.PI * 2;
      const rr = Math.sqrt(Math.max(0.08, 1 - Math.pow((x - 0.2) / 2.35, 2)));
      spotPos[i * 3] = x;
      spotPos[i * 3 + 1] = Math.sin(t) * rr * 0.82 - 0.05;
      spotPos[i * 3 + 2] = Math.cos(t) * rr * 0.98;
    }
    spotGeo.setAttribute('position', new THREE.BufferAttribute(spotPos, 3));
    const spotMat = new THREE.PointsMaterial({
      size: 0.08, map: tex.glowMint, color: 0xa5ffea, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false
    });
    const spots = new THREE.Points(spotGeo, spotMat);
    spots.frustumCulled = false;
    whale.add(spots);
    whale.name = 'whale';
    whale.scale.setScalar(0.92);
    whale.position.set(0, 2.4, -20);
    group.add(whale);

    /* 水母 */
    const jellies = [];
    const jellyColors = [0xffb3d0, 0x99e6ff, 0xd2a9ff, 0x9fffe0, 0xffcf9e];
    const jr = U.mulberry32(672);
    for (let i = 0; i < 7; i++) {
      const j = new THREE.Group();
      const color = jellyColors[i % jellyColors.length];
      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        basic(color, { opacity: 0.22, additive: true, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      bell.scale.y = 0.66;
      j.add(bell);
      const glow = glowSprite(tex.glowSoft, color, 1.9, 0.3);
      j.add(glow);
      // 触须：合进一个 LineSegments
      const seg = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + jr() * 0.3;
        const r = 0.42 + jr() * 0.12;
        let prev = new V3(Math.cos(a) * r, 0, Math.sin(a) * r);
        for (let s = 1; s <= 7; s++) {
          const y = -s * (0.26 + jr() * 0.08);
          const next = new V3(
            Math.cos(a + s * 0.12) * r * (1 - s * 0.04),
            y,
            Math.sin(a + s * 0.12) * r * (1 - s * 0.04)
          );
          seg.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
          prev = next;
        }
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(seg), 3));
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
        color: color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending,
        depthWrite: false, fog: false
      }));
      j.add(lines);
      j.position.set(-10 + jr() * 20, 0.5 + jr() * 6.5, -15 - jr() * 15);
      j.userData.baseY = j.position.y;
      j.userData.phase = jr() * Math.PI * 2;
      j.userData.bell = bell;
      j.userData.glow = glow;
      group.add(j);
      jellies.push(j);
    }

    /* 鱼群 */
    const school = new THREE.Group();
    const fishCount = 72;
    const fishGeo = new THREE.ConeGeometry(0.055, 0.24, 5);
    fishGeo.rotateZ(-Math.PI / 2);
    const fishMat = new THREE.MeshBasicMaterial({
      color: 0x5e9391, transparent: true, opacity: 0.72, depthWrite: false, fog: true
    });
    const fish = new THREE.InstancedMesh(fishGeo, fishMat, fishCount);
    const fm = new THREE.Matrix4();
    const fq = new THREE.Quaternion();
    const fs = new V3();
    const fr = U.mulberry32(733);
    for (let i = 0; i < fishCount; i++) {
      const p = new V3((fr() - 0.5) * 8.5, (fr() - 0.5) * 2.4, (fr() - 0.5) * 5.5);
      const sc = 0.65 + fr() * 0.8;
      fq.setFromEuler(new THREE.Euler(0, (fr() - 0.5) * 0.5, (fr() - 0.5) * 0.3));
      fs.set(sc, sc, sc);
      fm.compose(p, fq, fs);
      fish.setMatrixAt(i, fm);
    }
    fish.instanceMatrix.needsUpdate = true;
    school.add(fish);
    school.position.set(0, 1.3, -15.5);
    group.add(school);

    /* 气泡与海雪 */
    const bubbleTex = tex.bubble;
    const bubbleGeo = new THREE.BufferGeometry();
    const bCount = 260;
    const bp = new Float32Array(bCount * 3);
    const bSeed = new Float32Array(bCount);
    const bSize = new Float32Array(bCount);
    const bSpeed = new Float32Array(bCount);
    const br = U.mulberry32(844);
    for (let i = 0; i < bCount; i++) {
      bp[i * 3] = -12 + br() * 24;
      bp[i * 3 + 1] = br() * 16;
      bp[i * 3 + 2] = -8 - br() * 26;
      bSeed[i] = br();
      bSize[i] = 0.7 + br() * 2.4;
      bSpeed[i] = 0.7 + br() * 1.5;
    }
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    bubbleGeo.setAttribute('aSeed', new THREE.BufferAttribute(bSeed, 1));
    bubbleGeo.setAttribute('aSize', new THREE.BufferAttribute(bSize, 1));
    bubbleGeo.setAttribute('aSpeed', new THREE.BufferAttribute(bSpeed, 1));
    const bubbleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uMap: { value: bubbleTex },
        uColor: { value: new THREE.Color(0xbffcf0) },
        uOpacity: { value: 0.55 }
      },
      vertexShader: `
        attribute float aSeed, aSize, aSpeed;
        uniform float uTime, uPixel;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float y = mod(position.y + uTime * aSpeed, 17.0) - 6.2;
          p.y = y;
          p.x += sin(uTime * 0.42 + aSeed * 6.283) * 0.32;
          p.z += cos(uTime * 0.34 + aSeed * 4.1) * 0.24;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = max(-mv.z, 0.1);
          gl_PointSize = aSize * uPixel * (26.0 / d);
          gl_Position = projectionMatrix * mv;
          vAlpha = smoothstep(-6.2, -4.4, y) * (1.0 - smoothstep(8.4, 10.8, y));
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          float a = t.a * vAlpha * uOpacity;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false
    });
    const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
    bubbles.frustumCulled = false;
    group.add(bubbles);

    const snowGeo = new THREE.BufferGeometry();
    const sCount = 420;
    const sp = new Float32Array(sCount * 3);
    const ss = new Float32Array(sCount);
    const spd = new Float32Array(sCount);
    const sr = U.mulberry32(955);
    for (let i = 0; i < sCount; i++) {
      sp[i * 3] = -16 + sr() * 32;
      sp[i * 3 + 1] = sr() * 18;
      sp[i * 3 + 2] = -6 - sr() * 32;
      ss[i] = sr();
      spd[i] = 0.06 + sr() * 0.2;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    snowGeo.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
    snowGeo.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
    const snowMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uColor: { value: new THREE.Color(0xa9e7de) }
      },
      vertexShader: `
        attribute float aSeed, aSpeed;
        uniform float uTime, uPixel;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.y = mod(position.y - uTime * aSpeed, 18.0) - 6.0;
          p.x += sin(uTime * 0.18 + aSeed * 6.283) * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = max(-mv.z, 0.1);
          gl_PointSize = uPixel * (10.0 / d);
          gl_Position = projectionMatrix * mv;
          vAlpha = 0.18 + 0.3 * aSeed;
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float a = smoothstep(0.5, 0.0, length(c)) * vAlpha;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false
    });
    const snow = new THREE.Points(snowGeo, snowMat);
    snow.frustumCulled = false;
    group.add(snow);

    /* 光柱 */
    const shafts = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6 + i * 0.5, 26),
        new THREE.MeshBasicMaterial({
          map: tex.shaft, color: 0x9df3e2, transparent: true, opacity: 0.12,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
        })
      );
      m.position.set(-8 + i * 5.4, 8.2, -20 - i * 3.2);
      m.rotation.z = -0.16 + i * 0.07;
      group.add(m);
      shafts.push(m);
    }

    const whaleGlow = glowSprite(tex.glowMint, 0x3d8f9a, 7.5, 0.12);
    whaleGlow.position.set(0, 2.2, -21);
    group.add(whaleGlow);

    /* 鲸鱼用进入场景后的本地时间，保证每次切到深海都从窗心入场 */
    let localT = 0;

    return {
      group,
      update(dt, t) {
        localT += dt;
        sky.material.uniforms.uTime.value = t;
        bubbleMat.uniforms.uTime.value = t;
        snowMat.uniforms.uTime.value = t;

        /* 一进入深海就让鲸鱼从窗心游过，不必等二十多秒 */
        const wt = localT;
        const wx = -13 + ((wt * 0.55 + 13) % 27);
        whale.position.x = wx;
        whale.position.y = 2.45 + Math.sin(wt * 0.2) * 0.3;
        whale.rotation.z = Math.sin(wt * 0.24) * 0.035;
        whale.rotation.x = Math.sin(wt * 0.18 + 1.1) * 0.02;
        tail.rotation.z = Math.sin(wt * 0.78) * 0.16;
        spotMat.opacity = 0.46 + Math.sin(t * 0.9) * 0.12;

        school.position.x = Math.sin(t * 0.075) * 4.2;
        school.position.y = 1.2 + Math.sin(t * 0.31) * 0.28;
        school.rotation.y = Math.sin(t * 0.05) * 0.1;

        jellies.forEach((j, i) => {
          const ph = j.userData.phase;
          j.position.y = j.userData.baseY + Math.sin(t * 0.42 + ph) * 0.45;
          j.rotation.y = Math.sin(t * 0.16 + ph) * 0.35;
          const pulse = 1 + Math.sin(t * 0.9 + ph) * 0.08;
          j.userData.bell.scale.set(pulse, 0.66 * (2 - pulse), pulse);
          j.userData.glow.material.opacity = 0.22 + Math.sin(t * 0.7 + i) * 0.08;
        });

        shafts.forEach((m, i) => {
          m.material.opacity = 0.09 + Math.sin(t * 0.23 + i * 1.3) * 0.04;
          m.rotation.z = -0.16 + i * 0.07 + Math.sin(t * 0.08 + i) * 0.02;
        });
        algae.material.opacity = 0.55 + Math.sin(t * 0.7) * 0.2;
      }
    };
  }

  /* ———————————————————— 星潮 · COSMOS ———————————————————— */

  function buildCosmos(tex) {
    const group = new THREE.Group();
    group.name = 'cosmos';

    const skyFrag = `
      precision highp float;
      varying vec3 vDir;
      uniform float uTime;
      uniform vec3 uTop, uMid, uHorizon, uNebulaA, uNebulaB;
      ${NOISE}
      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y * 0.5 + 0.5;
        vec3 col = mix(uHorizon, uMid, smoothstep(0.02, 0.5, h));
        col = mix(col, uTop, smoothstep(0.4, 0.98, h));

        float band = exp(-pow(dot(dir, normalize(vec3(0.38, 0.52, 0.76))) * 2.35, 2.0));
        float n1 = fbm(dir.xz * 3.0 + vec2(uTime * 0.004, 0.0));
        float n2 = fbm(dir.xz * 6.4 + vec2(3.1, -1.7) + uTime * 0.0025);
        vec3 neb = mix(uNebulaA, uNebulaB, n2) * band * (0.3 + n1 * 0.9);
        col += neb * 0.62;
        float dust = pow(max(fbm(dir.xz * 9.0 - vec2(uTime * 0.006, 0.0)), 0.0), 3.0);
        col += uNebulaB * dust * band * 0.18;

        vec2 sc = dir.xz / (abs(dir.y) + 0.34);
        vec2 sg = sc * 145.0;
        vec2 scell = floor(sg);
        float hs = hash21(scell);
        float tw = 0.62 + 0.38 * sin(uTime * 1.8 + hs * 80.0);
        float st = smoothstep(0.9955, 1.0, hs) * smoothstep(0.2, 0.01, length(fract(sg) - 0.5));
        col += vec3(0.82, 0.9, 1.0) * st * tw * 1.25;
        vec2 sg2 = sc * 42.0;
        vec2 sc2 = floor(sg2);
        float hs2 = hash21(sc2 + 17.3);
        float big = smoothstep(0.9965, 1.0, hs2) * smoothstep(0.3, 0.02, length(fract(sg2) - 0.5));
        col += mix(vec3(1.0, 0.86, 0.7), vec3(0.75, 0.88, 1.0), hash21(sc2)) * big * 2.2;

        float vign = 0.72 + 0.28 * smoothstep(-0.3, 0.7, dir.y);
        col = aces(col * 1.1) * vign;
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    const sky = makeSky(skyFrag, {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color('#01030b') },
      uMid: { value: new THREE.Color('#0a1028') },
      uHorizon: { value: new THREE.Color('#1b1738') },
      uNebulaA: { value: new THREE.Color('#5e3fb0') },
      uNebulaB: { value: new THREE.Color('#1e7a86') }
    });
    group.add(sky);

    const light = new THREE.DirectionalLight(0xdbe8ff, 1.9);
    light.position.set(10, 15, -5);
    const target = new THREE.Object3D();
    target.position.set(0, 0, -30);
    group.add(target);
    light.target = target;
    group.add(light);

    /* 带环行星 */
    const planet = new THREE.Group();
    planet.position.set(6.4, 4.6, -39);
    const planetR = 6.6;

    const planetMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLight: { value: new THREE.Vector3(-0.82, 0.34, 0.46).normalize() }
      },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vObj;
        void main() {
          vObj = normalize(position);
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vN;
        varying vec3 vObj;
        uniform float uTime;
        uniform vec3 uLight;
        ${NOISE}
        void main() {
          float lat = vObj.y;
          float lon = atan(vObj.z, vObj.x);
          float warp = fbm(vec2(lon * 1.6, lat * 4.2) + vec2(uTime * 0.008, 0.0));
          float bands = sin(lat * 22.0 + warp * 4.5 + sin(lon * 3.0 + lat * 8.0) * 0.5);
          vec3 warm = vec3(0.92, 0.72, 0.46);
          vec3 cool = vec3(0.26, 0.5, 0.52);
          vec3 pale = vec3(0.96, 0.9, 0.78);
          vec3 col = mix(warm, cool, smoothstep(-0.5, 0.55, bands));
          col = mix(col, pale, smoothstep(0.55, 0.96, bands) * 0.55);
          // 细云带
          float cloud = fbm(vec2(lon * 3.6 + uTime * 0.004, lat * 12.0));
          col = mix(col, vec3(0.95, 0.92, 0.84), smoothstep(0.55, 0.8, cloud) * 0.22);
          // 光与影
          vec3 n = normalize(vN);
          float diff = dot(n, normalize(uLight)) * 0.5 + 0.5;
          diff = smoothstep(0.1, 0.9, diff);
          float rim = pow(1.0 - max(n.z, 0.0), 2.4);
          // 压住高光，让云带的层次留得住
          col *= 0.12 + diff * 0.72;
          col = mix(vec3(0.015, 0.028, 0.062), col, smoothstep(0.0, 0.16, diff));
          col += vec3(0.34, 0.58, 0.88) * rim * 0.28;
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    const planetMesh = new THREE.Mesh(new THREE.SphereGeometry(planetR, 64, 48), planetMat);
    planet.add(planetMesh);

    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#4f86e8') } },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        precision mediump float;
        varying vec3 vN;
        varying vec3 vV;
        uniform vec3 uColor;
        void main() {
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
          gl_FragColor = vec4(uColor, f * 0.32);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide
    });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(planetR * 1.045, 48, 32), atmoMat);
    planet.add(atmo);

    const ringMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vP;
        void main() {
          vP = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vP;
        uniform float uTime;
        ${NOISE}
        void main() {
          float r = length(vP.xy);
          float a = atan(vP.y, vP.x);
          float band = 0.55 + 0.45 * sin(r * 2.1 + sin(a * 7.0) * 0.4);
          float gap = smoothstep(0.12, 0.24, abs(sin(r * 1.35 + 0.7)));
          float fine = 0.7 + 0.3 * sin(r * 11.0 + a * 2.0);
          vec3 col = mix(vec3(0.52, 0.44, 0.36), vec3(0.8, 0.72, 0.58), band);
          float alpha = (0.26 + 0.32 * band) * gap * fine;
          alpha *= smoothstep(8.0, 8.9, r) * (1.0 - smoothstep(14.0, 15.2, r));
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(8.3, 15.2, 160, 2), ringMat);
    ring.rotation.set(1.24, 0, 0.22);
    planet.add(ring);
    group.add(planet);

    /* 小卫星 */
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 32, 24),
      new THREE.MeshBasicMaterial({ map: tex.moon, color: 0xb9c6dd })
    );
    moon.position.set(-10.5, 6.6, -33);
    moon.rotation.z = 0.4;
    group.add(moon);
    const moonGlow = glowSprite(tex.glowSoft, 0xd8e6ff, 7.5, 0.26);
    moonGlow.position.copy(moon.position);
    group.add(moonGlow);

    /* 近处星尘与更远的星 */
    group.add(starField(260, 64, [-20, -64], tex.spark, 0.13));
    const farStars = starField(180, 110, [-52, -90], tex.spark, 0.2);
    farStars.material.opacity = 0.6;
    group.add(farStars);

    /* 小行星 */
    const astCount = 20;
    const ast = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0x585a68, roughness: 0.95, metalness: 0.05, flatShading: true }),
      astCount
    );
    const am = new THREE.Matrix4();
    const aq = new THREE.Quaternion();
    const arr = U.mulberry32(1042);
    for (let i = 0; i < astCount; i++) {
      const p = new V3((arr() - 0.5) * 30, (arr() - 0.5) * 14 + 1, -16 - arr() * 18);
      const s = 0.09 + arr() * 0.55;
      aq.setFromEuler(new THREE.Euler(arr() * 3, arr() * 3, arr() * 3));
      am.compose(p, aq, new V3(s, s * (0.6 + arr() * 0.7), s));
      ast.setMatrixAt(i, am);
    }
    ast.instanceMatrix.needsUpdate = true;
    group.add(ast);

    /* 彗星 */
    const comet = new THREE.Group();
    const cometGeo = new THREE.BufferGeometry();
    const trailN = 26;
    const cp = new Float32Array(trailN * 3);
    for (let i = 0; i < trailN; i++) {
      cp[i * 3] = i * 0.34;
      cp[i * 3 + 1] = -i * 0.045;
      cp[i * 3 + 2] = 0;
    }
    cometGeo.setAttribute('position', new THREE.BufferAttribute(cp, 3));
    const cometTrail = new THREE.Points(cometGeo, new THREE.PointsMaterial({
      size: 0.34, map: tex.spark, color: 0xbfe9ff, transparent: true, opacity: 0.7,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false
    }));
    cometTrail.frustumCulled = false;
    comet.add(cometTrail);
    const cometHead = glowSprite(tex.spark, 0xe8fbff, 1.1, 0.95);
    comet.add(cometHead);
    comet.visible = false;
    group.add(comet);

    const nebGlow = glowSprite(tex.glowSoft, 0x6d54c9, 46, 0.1);
    nebGlow.position.set(2, 10, -70);
    group.add(nebGlow);
    const nebGlow2 = glowSprite(tex.glowSoft, 0x1f7c8c, 36, 0.08);
    nebGlow2.position.set(-16, 2, -60);
    group.add(nebGlow2);

    return {
      group,
      update(dt, t) {
        sky.material.uniforms.uTime.value = t;
        planetMat.uniforms.uTime.value = t;
        ringMat.uniforms.uTime.value = t;
        ring.rotation.z = 0.22 + t * 0.0015;
        ast.rotation.y = t * 0.006;
        ast.rotation.x = Math.sin(t * 0.03) * 0.03;
        moonGlow.material.opacity = 0.22 + Math.sin(t * 0.5) * 0.05;

        const cycle = 19;
        const prog = ((t + 6.5) % cycle) / cycle;
        if (prog < 0.52) {
          comet.visible = true;
          comet.position.set(24 - prog / 0.52 * 54, 11.5 - prog * 8.0, -28 - prog * 8);
          comet.rotation.z = -0.12;
          const fade = Math.min(1, prog / 0.08) * Math.min(1, (0.52 - prog) / 0.12);
          cometTrail.material.opacity = 0.55 * fade;
          cometHead.material.opacity = 0.9 * fade;
        } else {
          comet.visible = false;
        }
      }
    };
  }

  /* ———————————————————— 樱夜 · SAKURA ———————————————————— */

  function buildSakura(tex) {
    const group = new THREE.Group();
    group.name = 'sakura';

    const skyFrag = `
      precision highp float;
      varying vec3 vDir;
      uniform float uTime;
      uniform vec3 uTop, uMid, uHorizon, uMoonColor, uMoonDir, uCloud;
      ${NOISE}
      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.08, 0.32, h));
        col = mix(col, uTop, smoothstep(0.28, 0.85, h));

        vec3 md = normalize(uMoonDir);
        float cosA = dot(dir, md);
        float ang = acos(clamp(cosA, -1.0, 1.0));
        float disc = 1.0 - smoothstep(0.052, 0.062, ang);
        float craters = 0.78 + 0.22 * fbm(dir.xy * 26.0 + 4.0);
        float maria = smoothstep(0.46, 0.7, fbm(dir.xz * 7.0 + 8.0));
        col += uMoonColor * disc * 1.05 * craters;
        col -= uMoonColor * disc * maria * 0.26;
        col += uMoonColor * (pow(max(cosA, 0.0), 260.0) * 0.42 + pow(max(cosA, 0.0), 22.0) * 0.1);

        vec2 skg = dir.xz / (abs(h) + 0.36) * 150.0;
        float star = smoothstep(0.9958, 1.0, hash21(floor(skg))) * smoothstep(0.22, 0.02, length(fract(skg) - 0.5));
        float tw = 0.6 + 0.4 * sin(uTime * 1.3 + star * 60.0);
        col += vec3(1.0, 0.9, 0.95) * star * tw * 1.0 * smoothstep(0.0, 0.28, h);

        float cloud = fbm(vec2(atan(dir.x, -dir.z) * 2.2, h * 9.0) + vec2(uTime * 0.008, 0.0));
        cloud = smoothstep(0.48, 0.72, cloud) * smoothstep(-0.02, 0.22, h) * (1.0 - smoothstep(0.28, 0.55, h));
        col += uCloud * cloud * 0.32;

        col = aces(col * 1.12);
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTop: { value: new THREE.Color('#050614') },
        uMid: { value: new THREE.Color('#1b1433') },
        uHorizon: { value: new THREE.Color('#4b2a44') },
        uMoonColor: { value: new THREE.Color('#ffd9de') },
        uMoonDir: { value: new THREE.Vector3(0.09, 0.082, -1).normalize() },
        uCloud: { value: new THREE.Color('#b17390') }
      },
      vertexShader: SKY_VERT,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(86, 48, 32), skyMat);
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    group.add(sky);

    const light = new THREE.DirectionalLight(0xffc6d2, 1.2);
    light.position.set(-12, 13, -6);
    const target = new THREE.Object3D();
    target.position.set(0, -1, -30);
    group.add(target);
    light.target = target;
    group.add(light);

    const moonGlow = glowSprite(tex.glowPink, 0xffd7df, 22, 0.18);
    moonGlow.position.set(5.0, 4.6, -55);
    group.add(moonGlow);

    /* 远山：三层剪影 */
    function ridge(z, baseY, amp, offset, color, seed) {
      const shape = new THREE.Shape();
      const rng = U.mulberry32(seed);
      shape.moveTo(-70, -14);
      shape.lineTo(-70, baseY);
      let x = -70;
      let y = baseY;
      const pts = [];
      while (x < 70) {
        x += 4 + rng() * 8;
        y = baseY + Math.abs(Math.sin(x * 0.06 + offset)) * amp * (0.4 + rng() * 0.8);
        pts.push([x, y]);
        shape.lineTo(x, y);
      }
      shape.lineTo(70, -14);
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: color, fog: true }));
      mesh.position.z = z;
      group.add(mesh);
      return mesh;
    }
    ridge(-58, -2.2, 5.2, 0.3, 0x241b3a, 1203);
    ridge(-47, -2.4, 3.8, 1.7, 0x1a132c, 1204);
    ridge(-38, -2.5, 2.6, 3.1, 0x110e20, 1205);

    /* 湖面 */
    const waterGeo = new THREE.PlaneGeometry(120, 90, 1, 1);
    const waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMoonColor: { value: new THREE.Color('#ffd9de') },
        uDeep: { value: new THREE.Color('#0a0a1c') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uMoonColor, uDeep;
        void main() {
          vec3 col = uDeep * (0.7 + 0.5 * vUv.y);
          float ripple = 0.5 + 0.5 * sin(vUv.y * 160.0 + sin(vUv.x * 36.0 + uTime * 0.4) * 2.0 + uTime * 1.1);
          col += vec3(0.12, 0.1, 0.2) * ripple * 0.15;
          float colX = 1.0 - smoothstep(0.0, 0.13, abs(vUv.x - 0.53));
          float shimmer = pow(0.5 + 0.5 * sin(vUv.y * 190.0 + uTime * 2.0 + sin(vUv.x * 80.0) * 3.0), 6.0);
          col += uMoonColor * colX * shimmer * 0.55;
          col += uMoonColor * colX * 0.05;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      fog: false
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -1.7, -40);
    group.add(water);

    /* 樱花树 */
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2b1a28, roughness: 0.95, metalness: 0.02 });
    const blossomGeo = new THREE.IcosahedronGeometry(0.26, 1);
    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.9, metalness: 0,
      emissive: 0x6e2b44, emissiveIntensity: 0.32, flatShading: true
    });
    const blossomPositions = [];
    const brng = U.mulberry32(1450);

    function growTree(treeGroup, base, scale, seed, spread, count) {
      const rng = U.mulberry32(seed);
      const tips = [];
      function grow(a, dir, len, radius, depth) {
        const b = a.clone().addScaledVector(dir, len);
        limb(treeGroup, a, b, radius, radius * 0.58, trunkMat, 6);
        if (depth <= 0) {
          tips.push(b.clone());
          return;
        }
        const n = depth > 1 ? 2 : 3;
        for (let i = 0; i < n; i++) {
          const nd = dir.clone();
          nd.x += (rng() - 0.5) * spread;
          nd.y += 0.32 + rng() * 0.4;
          nd.z += (rng() - 0.5) * spread * 0.7;
          nd.normalize();
          grow(b, nd, len * (0.68 + rng() * 0.12), radius * 0.62, depth - 1);
        }
      }
      grow(base, new V3(0.16, 1, 0.1).normalize(), 2.5 * scale, 0.4 * scale, 4);
      for (let i = 0; i < count; i++) {
        const tip = tips[Math.floor(rng() * tips.length)];
        const p = tip.clone().add(new V3((rng() - 0.5) * 1.8, (rng() - 0.5) * 1.2, (rng() - 0.5) * 1.6));
        p.multiplyScalar(0.999);
        blossomPositions.push({ p, s: 0.42 + rng() * 1.1, c: rng() });
      }
      return treeGroup;
    }

    const tree = new THREE.Group();
    const baseFar = new V3(-7.6, -1.7, -24);
    growTree(tree, baseFar, 1.25, 1501, 0.8, 96);
    // 斜向窗口的一条长枝
    const limbBase = new V3(-4.8, 2.4, -21);
    limb(tree, limbBase, new V3(-2.2, 4.7, -16.2), 0.16, 0.055, trunkMat, 6);
    limb(tree, new V3(-2.2, 4.7, -16.2), new V3(-0.4, 5.25, -13.6), 0.06, 0.025, trunkMat, 5);
    for (let i = 0; i < 26; i++) {
      const p = new V3(-2.4 + brng() * 2.4, 4.2 + brng() * 1.5, -17 + brng() * 3.2);
      blossomPositions.push({ p, s: 0.5 + brng() * 0.9, c: brng() });
    }
    // 近处的小树，框住左上角
    const nearTree = new THREE.Group();
    growTree(nearTree, new V3(-6.4, -1.7, -12.5), 0.78, 1602, 0.95, 44);
    tree.add(nearTree);

    const blossomCount = blossomPositions.length;
    const blossoms = new THREE.InstancedMesh(blossomGeo, blossomMat, blossomCount);
    const bm = new THREE.Matrix4();
    const bq = new THREE.Quaternion();
    const bp = new V3();
    const bs = new V3();
    const cA = new THREE.Color('#ffd3dd');
    const cB = new THREE.Color('#f59bb6');
    const cC = new THREE.Color('#fff2f4');
    blossomPositions.forEach((b, i) => {
      bq.setFromEuler(new THREE.Euler(b.c * 3, b.c * 5, b.c * 2));
      bs.setScalar(b.s);
      bm.compose(b.p, bq, bs);
      blossoms.setMatrixAt(i, bm);
      const mixC = b.c < 0.32 ? cA : (b.c < 0.72 ? cB : cC);
      blossoms.setColorAt(i, mixC);
    });
    blossoms.instanceMatrix.needsUpdate = true;
    if (blossoms.instanceColor) blossoms.instanceColor.needsUpdate = true;
    tree.add(blossoms);
    group.add(tree);

    const treeGlow = glowSprite(tex.glowPink, 0xc85b86, 24, 0.13);
    treeGlow.position.set(-5.5, 3.2, -20);
    group.add(treeGlow);
    const treeGlow2 = glowSprite(tex.glowPink, 0x9a3c68, 14, 0.12);
    treeGlow2.position.set(-3.2, 4.2, -15);
    group.add(treeGlow2);

    /* 花瓣 */
    const petalCount = 460;
    const petalGeo = new THREE.BufferGeometry();
    const pp = new Float32Array(petalCount * 3);
    const ps = new Float32Array(petalCount);
    const psp = new Float32Array(petalCount);
    const psz = new Float32Array(petalCount);
    const prng = U.mulberry32(1701);
    for (let i = 0; i < petalCount; i++) {
      pp[i * 3] = -16 + prng() * 32;
      pp[i * 3 + 1] = prng() * 16;
      pp[i * 3 + 2] = -6 - prng() * 26;
      ps[i] = prng();
      psp[i] = 0.35 + prng() * 0.75;
      psz[i] = 0.55 + prng() * 0.9;
    }
    petalGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    petalGeo.setAttribute('aSeed', new THREE.BufferAttribute(ps, 1));
    petalGeo.setAttribute('aSpeed', new THREE.BufferAttribute(psp, 1));
    petalGeo.setAttribute('aSize', new THREE.BufferAttribute(psz, 1));
    const petalMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uMap: { value: tex.petal }
      },
      vertexShader: `
        attribute float aSeed, aSpeed, aSize;
        uniform float uTime, uPixel;
        varying float vAlpha;
        varying float vRot;
        void main() {
          vec3 p = position;
          float fall = uTime * aSpeed;
          p.y = mod(position.y - fall, 17.0) - 1.2;
          p.x += sin(uTime * 0.35 + aSeed * 6.283) * (0.7 + aSeed);
          p.z += cos(uTime * 0.24 + aSeed * 4.0) * 0.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = max(-mv.z, 0.2);
          gl_PointSize = aSize * uPixel * (22.0 / d) * 8.0;
          gl_Position = projectionMatrix * mv;
          vAlpha = smoothstep(-1.2, 0.5, p.y) * (1.0 - smoothstep(11.0, 15.0, p.y));
          vRot = aSeed * 6.283 + uTime * (0.4 + aSeed);
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform sampler2D uMap;
        varying float vAlpha;
        varying float vRot;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float s = sin(vRot), co = cos(vRot);
          vec2 r = vec2(c.x * co - c.y * s, c.x * s + c.y * co) + 0.5;
          vec4 t = texture2D(uMap, r);
          if (t.a < 0.02) discard;
          gl_FragColor = vec4(t.rgb, t.a * vAlpha * 0.92);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });
    const petals = new THREE.Points(petalGeo, petalMat);
    petals.frustumCulled = false;
    group.add(petals);

    /* 浮灯 */
    const lanternCount = 22;
    const lanternGeo = new THREE.BoxGeometry(0.18, 0.24, 0.18);
    const lanternMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.12, 0.56), toneMapped: false });
    const lanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, lanternCount);
    lanterns.frustumCulled = false;
    group.add(lanterns);
    const lanternGlowGeo = new THREE.BufferGeometry();
    const lgPos = new Float32Array(lanternCount * 3);
    lanternGlowGeo.setAttribute('position', new THREE.BufferAttribute(lgPos, 3));
    const lanternGlow = new THREE.Points(lanternGlowGeo, new THREE.PointsMaterial({
      size: 1.25, map: tex.glowWarm, color: 0xffb06a, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false
    }));
    lanternGlow.frustumCulled = false;
    group.add(lanternGlow);
    const lanternData = [];
    const lr = U.mulberry32(1811);
    for (let i = 0; i < lanternCount; i++) {
      lanternData.push({
        x: -14 + lr() * 28,
        z: -12 - lr() * 22,
        speed: 0.18 + lr() * 0.28,
        phase: lr() * 12,
        rot: lr() * 3
      });
    }
    const lm = new THREE.Matrix4();
    const lq = new THREE.Quaternion();
    const ls = new V3(1, 1, 1);
    const lp = new V3();
    const le = new THREE.Euler();

    /* 湖上的小舟 */
    const boat = new THREE.Group();
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-1.0, 0);
    hullShape.quadraticCurveTo(-0.55, 0.28, 0, 0.3);
    hullShape.quadraticCurveTo(0.55, 0.28, 1.05, 0);
    hullShape.lineTo(0.85, -0.16);
    hullShape.quadraticCurveTo(0, -0.28, -0.85, -0.16);
    hullShape.closePath();
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 0.24, bevelEnabled: false });
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: 0x1b1420, roughness: 0.85 }));
    hull.position.y = -0.12;
    boat.add(hull);
    const boatLantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.2, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.2, 0.6), toneMapped: false })
    );
    boatLantern.position.set(0.55, 0.34, 0.12);
    boat.add(boatLantern);
    const boatGlow = glowSprite(tex.glowWarm, 0xffb166, 1.9, 0.5);
    boatGlow.position.copy(boatLantern.position);
    boat.add(boatGlow);
    boat.position.set(-4.1, -1.72, -14.2);
    boat.rotation.y = 0.3;
    group.add(boat);

    /* 远处的塔 */
    const pagoda = new THREE.Group();
    const pagodaMat = basic(0x110d1c, { fog: true });
    const pagodaRoof = basic(0x191125, { fog: true });
    let py = 0;
    for (let i = 0; i < 5; i++) {
      const w = 2.5 - i * 0.34;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.75, w * 0.8), pagodaMat);
      body.position.y = py + 0.38;
      pagoda.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.98, 0.44, 4), pagodaRoof);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = py + 0.86;
      pagoda.add(roof);
      if (i % 2 === 0) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.24), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.0, 0.5), toneMapped: false }));
        win.position.set(0, py + 0.4, w * 0.401);
        pagoda.add(win);
      }
      py += 0.76;
    }
    const spireTop = new THREE.Mesh(new THREE.ConeGeometry(0.07, 1.3, 5), pagodaRoof);
    spireTop.position.y = py + 0.6;
    pagoda.add(spireTop);
    pagoda.position.set(8.8, -1.7, -35);
    pagoda.rotation.y = -0.25;
    group.add(pagoda);
    const pagodaGlow = glowSprite(tex.glowWarm, 0xff9f60, 4.5, 0.16);
    pagodaGlow.position.set(8.8, 1.2, -34.8);
    group.add(pagodaGlow);

    /* 萤火 */
    const fireflyGeo = new THREE.BufferGeometry();
    const ffCount = 90;
    const ffPos = new Float32Array(ffCount * 3);
    const fr = U.mulberry32(1901);
    for (let i = 0; i < ffCount; i++) {
      ffPos[i * 3] = -12 + fr() * 18;
      ffPos[i * 3 + 1] = -0.5 + fr() * 7;
      ffPos[i * 3 + 2] = -8 - fr() * 22;
    }
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    const fireflies = new THREE.Points(fireflyGeo, new THREE.PointsMaterial({
      size: 0.12, map: tex.glowWarm, color: 0xffd58a, transparent: true, opacity: 0.6,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false
    }));
    fireflies.frustumCulled = false;
    group.add(fireflies);

    const moonSprite = glowSprite(tex.glowPink, 0xffd0da, 36, 0.08);
    moonSprite.position.set(5.0, 4.6, -58);
    group.add(moonSprite);

    return {
      group,
      update(dt, t) {
        skyMat.uniforms.uTime.value = t;
        waterMat.uniforms.uTime.value = t;
        petalMat.uniforms.uTime.value = t;

        for (let i = 0; i < lanternCount; i++) {
          const d = lanternData[i];
          const y = -1.2 + ((t * d.speed + d.phase) % 14);
          le.set(0, d.rot + t * 0.1, Math.sin(t * 0.4 + i) * 0.1);
          lq.setFromEuler(le);
          lp.set(d.x, y, d.z);
          bm.compose(lp, lq, ls);
          lanterns.setMatrixAt(i, bm);
          lgPos[i * 3] = d.x;
          lgPos[i * 3 + 1] = y;
          lgPos[i * 3 + 2] = d.z;
        }
        lanterns.instanceMatrix.needsUpdate = true;
        lanternGlowGeo.attributes.position.needsUpdate = true;

        boat.position.y = -1.72 + Math.sin(t * 0.7) * 0.035;
        boat.rotation.z = Math.sin(t * 0.45) * 0.018;
        boatGlow.material.opacity = 0.4 + Math.sin(t * 1.7) * 0.1;
        fireflies.material.opacity = 0.42 + Math.sin(t * 1.1) * 0.18;
        fireflies.rotation.y = Math.sin(t * 0.03) * 0.06;
        tree.rotation.z = Math.sin(t * 0.12) * 0.0035;
        treeGlow.material.opacity = 0.1 + Math.sin(t * 0.3) * 0.025;
      }
    };
  }

  /* ———————————————————— 花火 · HANABI ———————————————————— */

  function buildHanabi(tex) {
    const group = new THREE.Group();
    group.name = 'hanabi';

    const skyFrag = `
      precision highp float;
      varying vec3 vDir;
      uniform float uTime;
      uniform vec3 uTop, uMid, uHorizon, uHaze;
      ${NOISE}
      void main() {
        vec3 dir = normalize(vDir);
        float h = dir.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.04, 0.3, h));
        col = mix(col, uTop, smoothstep(0.22, 0.8, h));

        vec2 sc = dir.xz / (abs(h) + 0.38);
        vec2 hg = sc * 130.0;
        float hs = hash21(floor(hg));
        float st = smoothstep(0.996, 1.0, hs) * smoothstep(0.22, 0.02, length(fract(hg) - 0.5));
        float tw = 0.6 + 0.4 * sin(uTime * 1.5 + hs * 70.0);
        col += vec3(0.92, 0.94, 1.0) * st * tw * 1.1 * smoothstep(0.02, 0.25, h);

        float az = atan(dir.x, -dir.z);
        float glow = pow(max(0.0, 1.0 - abs(az - 0.55) * 0.55), 3.0) * exp(-max(h, 0.0) * 10.0);
        col += uHaze * glow * 0.32;

        float cloud = fbm(vec2(az * 2.4 + uTime * 0.006, h * 8.0));
        cloud = smoothstep(0.55, 0.78, cloud) * smoothstep(-0.02, 0.15, h) * (1.0 - smoothstep(0.24, 0.46, h));
        col += vec3(0.16, 0.24, 0.3) * cloud * 0.5;

        col = aces(col * 1.15);
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTop: { value: new THREE.Color('#020814') },
        uMid: { value: new THREE.Color('#071a2b') },
        uHorizon: { value: new THREE.Color('#123540') },
        uHaze: { value: new THREE.Color('#ffb174') }
      },
      vertexShader: SKY_VERT,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(86, 48, 32), skyMat);
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    group.add(sky);

    const light = new THREE.DirectionalLight(0xffc7a2, 1.15);
    light.position.set(9, 14, -6);
    const target = new THREE.Object3D();
    target.position.set(0, 0, -32);
    group.add(target);
    light.target = target;
    group.add(light);

    const WATER_Y = -2.1;

    /* 水面 */
    const waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color('#06121e') },
        uWarm: { value: new THREE.Color('#ffab72') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uDeep, uWarm;
        void main() {
          vec3 col = uDeep * (0.55 + 0.7 * vUv.y);
          float wave = sin(vUv.y * 120.0 + sin(vUv.x * 34.0 + uTime * 0.7) * 2.4 + uTime * 1.2);
          col += vec3(0.1, 0.16, 0.2) * (wave * 0.5 + 0.5) * 0.12;
          float shore = smoothstep(0.35, 1.0, vUv.y);
          col += uWarm * shore * 0.06;
          float glint = pow(0.5 + 0.5 * sin(vUv.x * 180.0 + uTime * 1.4 + sin(vUv.y * 60.0) * 3.0), 8.0);
          col += uWarm * glint * 0.06 * (1.0 - shore);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      fog: false
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(130, 100), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, WATER_Y, -42);
    group.add(water);

    /* 对岸的城市与灯火 */
    function cityLayer(z, baseY, amp, color, seed, windowCount) {
      const shape = new THREE.Shape();
      const rng = U.mulberry32(seed);
      shape.moveTo(-70, -8);
      shape.lineTo(-70, baseY);
      let x = -70;
      const tops = [];
      while (x < 70) {
        const w = 2 + rng() * 4;
        const h = baseY + rng() * amp + Math.abs(Math.sin(x * 0.12)) * amp * 0.4;
        shape.lineTo(x, h);
        shape.lineTo(x + w, h);
        tops.push([x + w * 0.5, h]);
        x += w;
      }
      shape.lineTo(70, -8);
      shape.closePath();
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: color, fog: true }));
      mesh.position.z = z;
      group.add(mesh);

      const lightsGeo = new THREE.BufferGeometry();
      const lp = new Float32Array(windowCount * 3);
      const lrng = U.mulberry32(seed + 7);
      for (let i = 0; i < windowCount; i++) {
        const top = tops[Math.floor(lrng() * tops.length)];
        lp[i * 3] = top[0] + (lrng() - 0.5) * 2.2;
        lp[i * 3 + 1] = top[1] - 0.15 - lrng() * Math.min(2.6, top[1] - baseY + 1.2);
        lp[i * 3 + 2] = z + 0.06;
      }
      lightsGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
      const lights = new THREE.Points(lightsGeo, new THREE.PointsMaterial({
        size: 0.5, map: tex.glowWarm, color: 0xffd09a, transparent: true, opacity: 0.92,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false
      }));
      lights.frustumCulled = false;
      group.add(lights);
      return mesh;
    }
    cityLayer(-54, -2.2, 3.6, 0x0b1826, 2101, 170);
    cityLayer(-44, -2.3, 2.4, 0x07111c, 2102, 130);

    /* 岸边的灯笼 */
    const lampCount = 22;
    const postGeo = new THREE.CylinderGeometry(0.02, 0.03, 1.4, 5);
    const postMat = basic(0x0a1520, { fog: true });
    const posts = new THREE.InstancedMesh(postGeo, postMat, lampCount);
    const lampGeo = new THREE.BoxGeometry(0.14, 0.2, 0.14);
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.1, 1.15, 0.6), toneMapped: false });
    const lampMesh = new THREE.InstancedMesh(lampGeo, lampMat, lampCount);
    const lampPositions = new Float32Array(lampCount * 3);
    const hm = new THREE.Matrix4();
    for (let i = 0; i < lampCount; i++) {
      const x = -19 + i * 1.75;
      const z = -20 - Math.abs(Math.sin(i * 0.9)) * 3.5;
      hm.compose(new V3(x, WATER_Y + 0.7, z), new THREE.Quaternion(), new V3(1, 1, 1));
      posts.setMatrixAt(i, hm);
      hm.compose(new V3(x, WATER_Y + 1.52, z), new THREE.Quaternion(), new V3(1, 1, 1));
      lampMesh.setMatrixAt(i, hm);
      lampPositions[i * 3] = x;
      lampPositions[i * 3 + 1] = WATER_Y + 1.5;
      lampPositions[i * 3 + 2] = z;
    }
    posts.instanceMatrix.needsUpdate = true;
    lampMesh.instanceMatrix.needsUpdate = true;
    group.add(posts, lampMesh);
    const lampGlowGeo = new THREE.BufferGeometry();
    lampGlowGeo.setAttribute('position', new THREE.BufferAttribute(lampPositions, 3));
    const lampGlow = new THREE.Points(lampGlowGeo, new THREE.PointsMaterial({
      size: 1.1, map: tex.glowWarm, color: 0xffa869, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false
    }));
    lampGlow.frustumCulled = false;
    group.add(lampGlow);

    /* 摩天轮 */
    const wheel = new THREE.Group();
    const wheelCenter = new V3(10.4, 2.9, -33.5);
    const wheelRadius = 4.2;
    const wheelMat = basic(0x22303c, { fog: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.075, 6, 64), wheelMat);
    wheel.add(ring);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius * 0.58, 0.04, 5, 48), wheelMat);
    wheel.add(innerRing);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, wheelRadius, 4), wheelMat);
      spoke.position.set(Math.cos(a) * wheelRadius / 2, Math.sin(a) * wheelRadius / 2, 0);
      spoke.rotation.z = a + Math.PI / 2;
      wheel.add(spoke);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.3), basic(0x2b3946, { fog: true }));
      cab.position.set(Math.cos(a) * wheelRadius, Math.sin(a) * wheelRadius, 0.05);
      wheel.add(cab);
    }
    const wheelLightsGeo = new THREE.BufferGeometry();
    const wheelLightCount = 70;
    const wlp = new Float32Array(wheelLightCount * 3);
    for (let i = 0; i < wheelLightCount; i++) {
      const a = (i / wheelLightCount) * Math.PI * 2;
      wlp[i * 3] = Math.cos(a) * wheelRadius;
      wlp[i * 3 + 1] = Math.sin(a) * wheelRadius;
      wlp[i * 3 + 2] = 0.06;
    }
    wheelLightsGeo.setAttribute('position', new THREE.BufferAttribute(wlp, 3));
    const wheelLights = new THREE.Points(wheelLightsGeo, new THREE.PointsMaterial({
      size: 0.4, map: tex.glowWarm, color: 0xffd49a, transparent: true, opacity: 0.92,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false
    }));
    wheelLights.frustumCulled = false;
    wheel.add(wheelLights);
    wheel.position.copy(wheelCenter);
    group.add(wheel);
    [-1, 1].forEach((s) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 5.4, 5), wheelMat);
      leg.position.set(wheelCenter.x + s * 2.0, wheelCenter.y - 2.2, wheelCenter.z);
      leg.rotation.z = s * 0.35;
      group.add(leg);
    });
    const wheelGlow = glowSprite(tex.glowWarm, 0xffab6d, 9, 0.14);
    wheelGlow.position.copy(wheelCenter);
    group.add(wheelGlow);

    /* ———— 花火 ———— */
    const sparkTex = tex.spark;
    const burstCount = 9;
    const perBurst = 230;
    const bursts = [];
    const palette = [
      ['#ffd27a', '#ff8a4c'],
      ['#ffb3c1', '#ff5f87'],
      ['#ffe9a8', '#ffc35c'],
      ['#d6b4ff', '#8d6bff'],
      ['#ffd9a0', '#ff9a5a'],
      ['#bfe6ff', '#6aa8ff']
    ];
    for (let b = 0; b < burstCount; b++) {
      const geo = new THREE.BufferGeometry();
      const dir = new Float32Array(perBurst * 3);
      const spd = new Float32Array(perBurst);
      const seed = new Float32Array(perBurst);
      const sz = new Float32Array(perBurst);
      const br = U.mulberry32(3001 + b);
      for (let i = 0; i < perBurst; i++) {
        const u = br() * 2 - 1;
        const th = br() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        dir[i * 3] = Math.cos(th) * r;
        dir[i * 3 + 1] = u * (br() > 0.55 ? 0.45 : 1.0);
        dir[i * 3 + 2] = Math.sin(th) * r;
        spd[i] = 4.8 + br() * 2.4;
        seed[i] = br();
        sz[i] = 0.7 + br() * 0.9;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(perBurst * 3), 3));
      geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
      geo.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uAge: { value: 0 },
          uLife: { value: 3.6 },
          uGravity: { value: 1.6 },
          uSize: { value: 1.0 },
          uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) },
          uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          uColorA: { value: new THREE.Color('#ffd27a') },
          uColorB: { value: new THREE.Color('#ff8a4c') }
        },
        vertexShader: `
          attribute vec3 aDir;
          attribute float aSpeed, aSeed, aSize;
          uniform float uAge, uLife, uGravity, uSize, uPixel;
          uniform vec2 uRes;
          uniform vec3 uColorA, uColorB;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSeed;
          varying float vAngle;
          varying float vStretch;
          void main() {
            float age = uAge;
            float drag = 1.0 - exp(-age * 1.4);
            float dist = aSpeed * drag * (1.0 - 0.22 * (age / uLife));
            vec3 p = aDir * dist;
            p.y -= 0.5 * uGravity * age * age;
            p.x += sin(aSeed * 19.0 + age * 2.6) * 0.12 * age;
            p.z += cos(aSeed * 13.0 + age * 2.1) * 0.1 * age;

            /* 取上一帧的位置，把火花拉成一小段拖尾 */
            float age2 = max(age - 0.07, 0.0);
            float drag2 = 1.0 - exp(-age2 * 1.4);
            float dist2 = aSpeed * drag2 * (1.0 - 0.22 * (age2 / uLife));
            vec3 p2 = aDir * dist2;
            p2.y -= 0.5 * uGravity * age2 * age2;
            p2.x += sin(aSeed * 19.0 + age2 * 2.6) * 0.12 * age2;
            p2.z += cos(aSeed * 13.0 + age2 * 2.1) * 0.1 * age2;

            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vec4 mv2 = modelViewMatrix * vec4(p2, 1.0);
            vec4 c0 = projectionMatrix * mv;
            vec4 c1 = projectionMatrix * mv2;
            vec2 s0 = c0.xy / max(c0.w, 0.0001);
            vec2 s1 = c1.xy / max(c1.w, 0.0001);
            vec2 delta = (s1 - s0) * uRes * 0.5;
            vAngle = atan(-delta.y, delta.x + 0.0001);
            float plen = length(delta);
            vStretch = clamp(1.0 + plen * 0.35, 1.0, 3.0);

            float d = max(-mv.z, 0.5);
            float base = uSize * aSize * uPixel * (240.0 / d) * (1.0 - 0.35 * (age / uLife));
            gl_PointSize = base * vStretch * 0.7;
            gl_Position = c0;
            vAlpha = pow(max(0.0, 1.0 - age / uLife), 1.5);
            vSeed = aSeed;
            vColor = mix(uColorA, uColorB, aSeed);
          }
        `,
        fragmentShader: `
          precision highp float;
          uniform float uAge;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vSeed;
          varying float vAngle;
          varying float vStretch;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float s = sin(vAngle), co = cos(vAngle);
            vec2 r = vec2(c.x * co - c.y * s, c.x * s + c.y * co);
            r.x /= vStretch;
            float d = length(r);
            float a = smoothstep(0.46, 0.02, d);
            float core = pow(smoothstep(0.2, 0.0, d), 2.0);
            if (a < 0.01) discard;
            float twinkle = 0.8 + 0.2 * sin(vSeed * 83.0 + uAge * 17.0);
            gl_FragColor = vec4(vColor * (1.25 + core * 1.7) * twinkle, a * vAlpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false
      });
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      points.visible = false;
      group.add(points);
      const flash = glowSprite(tex.glowSoft, 0xffd9a0, 8, 0);
      flash.position.z = 0.2;
      points.add(flash);
      const refl = glowSprite(tex.glowSoft, 0xffc078, 6, 0);
      refl.position.set(0, WATER_Y + 0.02, 0);
      refl.scale.set(5.5, 1.6, 1);
      group.add(refl);
      bursts.push({ points, mat, flash, refl, age: 0, life: 3, active: false, origin: new V3() });
    }

    const launchTex = tex.spark;
    const launches = [];
    for (let i = 0; i < 4; i++) {
      const s = glowSprite(launchTex, 0xffd9a0, 0.35, 0);
      s.scale.set(0.16, 1.4, 1);
      group.add(s);
      launches.push({ sprite: s, active: false, start: 0, dur: 0.8, origin: new V3(), colorA: '#ffd27a', colorB: '#ff8a4c' });
    }

    let nextFire = 0.4;
    const frng = U.mulberry32(3311);
    let pendingCursor = 0;

    function startBurst(origin, colorA, colorB, life) {
      let b = null;
      for (let i = 0; i < bursts.length; i++) {
        if (!bursts[i].active) { b = bursts[i]; break; }
      }
      if (!b) return;
      b.active = true;
      b.age = 0;
      b.life = life;
      b.origin.copy(origin);
      b.points.position.copy(origin);
      b.points.visible = true;
      b.mat.uniforms.uAge.value = 0;
      b.mat.uniforms.uLife.value = life;
      b.mat.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
      b.mat.uniforms.uGravity.value = 0.5 + frng() * 0.5;
      b.mat.uniforms.uColorA.value.set(colorA);
      b.mat.uniforms.uColorB.value.set(colorB);
      b.flash.material.color.set(colorA);
      b.flash.material.opacity = 0.58;
      b.flash.scale.setScalar(2.0 + frng() * 1.4);
      b.refl.position.set(origin.x, WATER_Y + 0.02, origin.z);
      b.refl.material.color.set(colorB);
      b.refl.material.opacity = 0.34;
    }

    function scheduleLaunch() {
      const l = launches[pendingCursor % launches.length];
      pendingCursor++;
      const x = -10 + frng() * 20;
      const y = 5.0 + frng() * 5.4;
      const z = -32 - frng() * 12;
      const pal = palette[Math.floor(frng() * palette.length)];
      l.active = true;
      l.start = 0;
      l.dur = 0.5 + frng() * 0.3;
      l.origin.set(x, y, z);
      l.colorA = pal[0];
      l.colorB = pal[1];
      l.sprite.visible = true;
      l.sprite.position.set(x, WATER_Y + 0.2, z);
      l.sprite.material.color.set(pal[0]);
      l.sprite.material.opacity = 0.9;
      l.sprite.scale.set(0.13, 1.15, 1);
      l.elapsed = 0;
    }

    return {
      group,
      /* 测试 / 截图用：立刻放一朵花火，可指定位置 */
      fire(x, y, z) {
        const pal = palette[Math.floor(frng() * palette.length)];
        const o = new V3(
          x === undefined ? -5.8 + frng() * 11.6 : x,
          y === undefined ? 5.4 + frng() * 2.8 : y,
          z === undefined ? -34 - frng() * 5 : z
        );
        startBurst(o, pal[0], pal[1], 3.4 + frng() * 0.6);
      },
      update(dt, t) {
        skyMat.uniforms.uTime.value = t;
        waterMat.uniforms.uTime.value = t;
        wheel.rotation.z = t * 0.07;
        wheelGlow.material.opacity = 0.11 + Math.sin(t * 0.7) * 0.03;
        lampGlow.material.opacity = 0.42 + Math.sin(t * 0.8) * 0.1;

        nextFire -= dt;
        if (nextFire <= 0) {
          scheduleLaunch();
          if (frng() > 0.78) scheduleLaunch();
          nextFire = 0.9 + frng() * 1.1;
        }

        for (let i = 0; i < launches.length; i++) {
          const l = launches[i];
          if (!l.active) continue;
          l.elapsed += dt;
          const k = Math.min(1, l.elapsed / l.dur);
          l.sprite.position.y = WATER_Y + 0.2 + (l.origin.y - WATER_Y - 0.2) * k;
          l.sprite.position.x = l.origin.x + Math.sin(k * 9.0) * 0.05;
          l.sprite.material.opacity = 0.85 * (1.0 - k * 0.55);
          if (k >= 1) {
            l.active = false;
            l.sprite.visible = false;
            startBurst(l.origin, l.colorA, l.colorB, 3.0 + frng() * 0.9);
          }
        }

        for (let i = 0; i < bursts.length; i++) {
          const b = bursts[i];
          if (!b.active) continue;
          b.age += dt;
          if (b.age >= b.life) {
            b.active = false;
            b.points.visible = false;
            b.refl.material.opacity = 0;
            continue;
          }
          b.mat.uniforms.uAge.value = b.age;
          const k = b.age / b.life;
          b.flash.material.opacity = 0.58 * Math.pow(1 - k, 1.8);
          b.flash.scale.setScalar(2.0 + k * 5.2);
          b.refl.material.opacity = 0.3 * Math.pow(1 - k, 1.35);
          b.refl.position.x = b.origin.x + Math.sin(b.age * 1.4 + i) * 0.18;
          b.refl.scale.set(4.5 + Math.sin(b.age * 2.0) * 0.8, 1.3 + Math.sin(b.age * 3.0 + i) * 0.2, 1);
        }
      }
    };
  }

  /* ———————————————————— 组装 ———————————————————— */

  WP.buildDreams = function (scene, M, street) {
    const tex = {
      glowSoft: U.softGlowTexture('rgba(255,250,238,1)', 'rgba(255,214,160,0.5)', 128),
      glowMint: U.softGlowTexture('rgba(220,255,248,1)', 'rgba(90,230,215,0.45)', 96),
      glowPink: U.softGlowTexture('rgba(255,240,246,1)', 'rgba(255,160,195,0.5)', 96),
      glowWarm: U.softGlowTexture('rgba(255,238,200,1)', 'rgba(255,170,100,0.55)', 96),
      spark: U.softGlowTexture('rgba(255,255,255,1)', 'rgba(210,235,255,0.55)', 64),
      shaft: shaftTexture(),
      petal: petalTexture(),
      bubble: bubbleTexture(),
      moon: moonTexture(),
      moonDisc: moonDiscTexture()
    };

    const root = new THREE.Group();
    root.name = 'dreams';
    scene.add(root);

    const extra = WP.buildDreamExtra ? WP.buildDreamExtra(tex) : {};
    const worlds = {
      abyss: buildAbyss(tex),
      cosmos: buildCosmos(tex),
      sakura: buildSakura(tex),
      hanabi: buildHanabi(tex),
      ...extra
    };

    Object.keys(worlds).forEach((k) => {
      worlds[k].group.visible = false;
      root.add(worlds[k].group);
    });

    let current = null;

    function setWorld(name) {
      const next = worlds[name] ? name : null;
      if (next === current) return;
      current = next;
      Object.keys(worlds).forEach((k) => {
        worlds[k].group.visible = k === current;
      });
      const streetVisible = !current;
      if (street) {
        if (street.root) street.root.visible = streetVisible;
        if (street.sky) street.sky.visible = streetVisible;
        if (street.cloudSprites) {
          street.cloudSprites.forEach((s) => { s.visible = streetVisible; });
        }
      }
    }

    function update(dt, t) {
      if (current && worlds[current]) worlds[current].update(dt, t);
    }

    const D = {
      root,
      worlds,
      setWorld,
      update,
      get active() { return current; },
      get isDreaming() { return !!current; }
    };
    WP.dreams = D;

    setWorld(street ? street.mood : null);
    return D;
  };
})();
