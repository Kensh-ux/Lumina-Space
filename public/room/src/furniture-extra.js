/* 窗畔 · 追加陈设：玩偶、水族箱、地球仪、八音盒、摇椅、边几、屏风与壁灯
   这些小东西都带着一点自己的脾气：会跳、会游、会转、会响。 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;
  const V3 = THREE.Vector3;

  /* ———————————————————— 小工具 ———————————————————— */

  function std(color, rough, metal, opts) {
    const m = new THREE.MeshStandardMaterial({
      color: color,
      roughness: rough === undefined ? 0.82 : rough,
      metalness: metal === undefined ? 0 : metal,
      envMapIntensity: opts && opts.env !== undefined ? opts.env : 0.55
    });
    if (opts && opts.flat) m.flatShading = true;
    if (opts && opts.side) m.side = opts.side;
    if (opts && opts.emissive !== undefined) {
      m.emissive = new THREE.Color(opts.emissive);
      m.emissiveIntensity = opts.emissiveIntensity === undefined ? 0.6 : opts.emissiveIntensity;
    }
    return m;
  }

  function sphere(r, mat, x, y, z, sx, sy, sz) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.scale.set(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz);
    m.castShadow = true;
    return m;
  }

  /* 毛绒布：低饱和的斑点与竖毛，近看才有力气 */
  function plushTexture(hex, seed) {
    const s = 128;
    const c = U.makeCanvas(s, s);
    const x = c.getContext('2d');
    const base = new THREE.Color(hex);
    const rng = U.mulberry32(seed || 5);
    x.fillStyle = '#' + base.getHexString();
    x.fillRect(0, 0, s, s);
    for (let i = 0; i < 1700; i++) {
      const light = rng() > 0.48;
      const a = 0.03 + rng() * 0.09;
      x.fillStyle = light ? 'rgba(255,250,238,' + a + ')' : 'rgba(38,24,16,' + (a * 0.8) + ')';
      const len = 1 + rng() * 3;
      x.fillRect(rng() * s, rng() * s, 1, len);
    }
    return U.canvasTexture(c, { repeat: [2, 2], aniso: 2 });
  }

  function plush(hex, seed) {
    return new THREE.MeshStandardMaterial({
      map: plushTexture(hex, seed), color: 0xffffff, roughness: 0.98, metalness: 0
    });
  }

  const EYE = new THREE.MeshStandardMaterial({ color: 0x17120f, roughness: 0.16, metalness: 0.15 });
  const GLINT = new THREE.MeshBasicMaterial({ color: 0xfff5e2 });
  const BLUSH = new THREE.MeshStandardMaterial({ color: 0xd99080, roughness: 0.95, transparent: true, opacity: 0.55 });

  function eyePair(head, r, x, y, z, scale) {
    [-1, 1].forEach((s) => {
      const e = sphere(r, EYE, s * x, y, z, 1, 1.06, 0.62);
      head.add(e);
      const g = sphere(r * 0.28, GLINT, s * x - r * 0.2, y + r * 0.28, z + r * 0.55);
      g.scale.set(1, 1, 0.4);
      head.add(g);
      if (scale !== false) {
        const b = sphere(r * 1.05, BLUSH, s * (x + r * 1.15), y - r * 0.9, z * 0.82, 1, 0.52, 0.35);
        head.add(b);
      }
    });
  }

  function hitArea(group, r, y) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    m.position.y = y === undefined ? 0.2 : y;
    m.userData.noMerge = true;
    group.add(m);
    return m;
  }

  function glyphTexture(kind) {
    const s = 64;
    const c = U.makeCanvas(s, s);
    const x = c.getContext('2d');
    x.translate(s / 2, s / 2);
    x.fillStyle = 'rgba(255,236,200,0.95)';
    if (kind === 0) {
      x.beginPath();
      x.ellipse(0, 3, 7, 5.5, -0.25, 0, Math.PI * 2);
      x.fill();
      x.fillRect(6, -7, 2, 10);
      x.fillStyle = 'rgba(226,178,110,0.8)';
      x.beginPath();
      x.ellipse(-2, 2, 3, 2, -0.25, 0, Math.PI * 2);
      x.fill();
    } else {
      x.beginPath();
      x.arc(-5, 4, 4.5, 0, Math.PI * 2);
      x.arc(5, 4, 4.5, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = 'rgba(226,178,110,0.85)';
      x.beginPath();
      x.arc(-8, 0, 3.4, 0, Math.PI * 2);
      x.arc(8, 0, 3.4, 0, Math.PI * 2);
      x.fill();
    }
    return U.canvasTexture(c, { clamp: true, srgb: true, aniso: 1 });
  }

  /* ———————————————————— 玩偶 ———————————————————— */

  function buildPenguin() {
    const g = new THREE.Group();
    const black = plush(0x2b3038, 31);
    const cream = plush(0xe6dcc6, 32);
    const beakMat = std(0xd08a3e, 0.55, 0.05);
    const footMat = std(0xc47c35, 0.7, 0);
    const scarfMat = std(0x8c5a45, 0.92, 0);

    const body = sphere(0.135, black, 0, 0.21, 0, 1.0, 1.25, 0.92);
    g.add(body);
    const belly = sphere(0.105, cream, 0, 0.19, 0.075, 0.92, 1.16, 0.48);
    g.add(belly);
    // 肚子上的细软毛
    const bellyTuft = sphere(0.035, cream, 0, 0.25, 0.14, 1.5, 0.8, 0.5);
    g.add(bellyTuft);

    const head = new THREE.Group();
    head.position.set(0, 0.385, 0.01);
    head.add(sphere(0.098, black, 0, 0, 0, 1.04, 0.96, 0.98));
    const face = sphere(0.077, cream, 0, -0.008, 0.052, 1.05, 0.92, 0.55);
    head.add(face);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.023, 0.072, 6), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.016, 0.118);
    beak.scale.set(1.2, 1, 0.72);
    head.add(beak);
    const beakLow = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.05, 6), footMat);
    beakLow.rotation.x = Math.PI / 2;
    beakLow.position.set(0, -0.036, 0.104);
    beakLow.scale.set(1.15, 1, 0.6);
    head.add(beakLow);
    eyePair(head, 0.016, 0.041, 0.035, 0.077, true);

    /* 小围巾 */
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.081, 0.018, 6, 18), scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.315;
    scarf.scale.z = 0.8;
    g.add(scarf);
    const tail = new THREE.Mesh(U.roundedBoxGeometry(0.034, 0.11, 0.014, 0.012, 0.003), scarfMat);
    tail.position.set(0.055, 0.27, 0.08);
    tail.rotation.z = -0.24;
    g.add(tail);

    const wingL = new THREE.Group();
    wingL.position.set(-0.122, 0.26, 0);
    const wingLMesh = sphere(0.05, black, -0.018, -0.065, 0, 0.42, 1.5, 0.85);
    wingL.add(wingLMesh);
    g.add(wingL);
    const wingR = new THREE.Group();
    wingR.position.set(0.122, 0.26, 0);
    const wingRMesh = sphere(0.05, black, 0.018, -0.065, 0, 0.42, 1.5, 0.85);
    wingR.add(wingRMesh);
    g.add(wingR);
    g.add(head);
    wingL.userData.noMerge = true;
    wingR.userData.noMerge = true;
    head.userData.noMerge = true;

    [-1, 1].forEach((s) => {
      const foot = sphere(0.048, footMat, s * 0.062, 0.032, 0.045, 1.15, 0.42, 1.5);
      g.add(foot);
    });
    hitArea(g, 0.22, 0.22);

    let bounce = 0;
    const item = {
      key: 'penguin', kind: 'penguin', group: g, lights: [], on: true, interactive: 'doll',
      baseY: 0, head, wingL, wingR, ears: [],
      onClick() {
        bounce = 1.4;
      },
      update(t, dt) {
        bounce = U.damp(bounce, 0, 3.4, dt);
        g.position.y = g.userData.baseY + Math.abs(Math.sin(t * 7.2)) * 0.03 * bounce;
        g.rotation.z = Math.sin(t * 9.4) * 0.045 * bounce;
        head.rotation.z = Math.sin(t * 1.1) * 0.03 + Math.sin(t * 8.6) * 0.11 * bounce;
        head.rotation.y = Math.sin(t * 0.53) * 0.08;
        wingL.rotation.z = -0.08 - Math.sin(t * 10.2) * 0.55 * bounce;
        wingR.rotation.z = 0.08 + Math.sin(t * 10.2) * 0.55 * bounce;
      }
    };
    return item;
  }

  function buildSeal() {
    const g = new THREE.Group();
    const grey = plush(0x8d9294, 41);
    const cream = plush(0xe8dfcd, 42);
    const dark = std(0x3c3430, 0.65, 0);
    const pink = std(0xb8796f, 0.9, 0);

    const body = sphere(0.16, grey, 0, 0.185, 0, 1.0, 1.08, 1.22);
    g.add(body);
    const belly = sphere(0.125, cream, 0, 0.16, 0.075, 0.9, 1.0, 0.5);
    g.add(belly);
    const head = new THREE.Group();
    head.position.set(0, 0.35, 0.055);
    head.add(sphere(0.108, grey, 0, 0, 0, 1.03, 0.94, 0.98));
    const muzzle = sphere(0.072, cream, 0, -0.026, 0.072, 1.1, 0.82, 0.75);
    head.add(muzzle);
    const nose = sphere(0.019, dark, 0, -0.002, 0.132, 1.35, 0.8, 0.75);
    head.add(nose);
    eyePair(head, 0.018, 0.048, 0.036, 0.086, true);
    [-1, 1].forEach((s) => {
      const brow = sphere(0.026, grey, s * 0.047, 0.062, 0.072, 1.2, 0.3, 0.55);
      head.add(brow);
      const whisker = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints([
          new V3(s * 0.055, -0.025, 0.11), new V3(s * 0.15, -0.008, 0.13),
          new V3(s * 0.055, -0.035, 0.11), new V3(s * 0.145, -0.045, 0.12)
        ]),
        new THREE.LineBasicMaterial({ color: 0xefe4cf, transparent: true, opacity: 0.38 })
      );
      head.add(whisker);
    });
    g.add(head);
    head.userData.noMerge = true;

    const flipperL = new THREE.Group();
    flipperL.position.set(-0.14, 0.24, 0.02);
    flipperL.add(sphere(0.058, grey, -0.018, -0.045, 0.02, 0.38, 1.25, 0.8));
    g.add(flipperL);
    const flipperR = new THREE.Group();
    flipperR.position.set(0.14, 0.24, 0.02);
    flipperR.add(sphere(0.058, grey, 0.018, -0.045, 0.02, 0.38, 1.25, 0.8));
    g.add(flipperR);
    flipperL.userData.noMerge = true;
    flipperR.userData.noMerge = true;

    const tail = sphere(0.075, grey, 0, 0.06, -0.17, 1.2, 0.32, 1.0);
    tail.rotation.x = -0.3;
    g.add(tail);
    const tailTip = sphere(0.058, dark, 0, 0.075, -0.24, 1.1, 0.2, 0.75);
    g.add(tailTip);

    [-1, 1].forEach((s) => {
      const spot = sphere(0.035, grey, s * 0.1, 0.27, -0.05, 1.2, 1.2, 0.4);
      spot.scale.y = 0.85;
      g.add(spot);
    });
    hitArea(g, 0.23, 0.22);

    let bounce = 0;
    const item = {
      key: 'seal', kind: 'seal', group: g, lights: [], on: true, interactive: 'doll',
      baseY: 0, head, flipperL, flipperR,
      onClick() { bounce = 1.2; },
      update(t, dt) {
        bounce = U.damp(bounce, 0, 3.2, dt);
        g.position.y = g.userData.baseY + Math.sin(t * 5.6) * 0.018 * bounce;
        g.rotation.z = Math.sin(t * 7.6) * 0.06 * bounce;
        head.rotation.z = Math.sin(t * 0.9) * 0.04 + Math.sin(t * 7.2) * 0.13 * bounce;
        head.rotation.y = Math.sin(t * 0.47 + 1.2) * 0.1;
        flipperL.rotation.z = Math.sin(t * 8.2) * 0.6 * bounce;
        flipperR.rotation.z = -Math.sin(t * 8.2) * 0.6 * bounce;
      }
    };
    return item;
  }

  function buildBear() {
    const g = new THREE.Group();
    const fur = plush(0xa9744c, 51);
    const cream = plush(0xe3d2b6, 52);
    const stitch = std(0x4e3221, 0.9, 0);
    const noseMat = std(0x2c2019, 0.42, 0.1);

    const body = sphere(0.14, fur, 0, 0.205, 0, 1.02, 1.28, 0.9);
    g.add(body);
    const belly = sphere(0.09, cream, 0, 0.18, 0.082, 1.02, 1.05, 0.45);
    g.add(belly);
    // 肚皮上的手缝线
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.0035, 4, 16, Math.PI * 1.35), stitch);
    seam.position.set(0, 0.18, 0.135);
    seam.rotation.set(0.2, 0, Math.PI * 0.82);
    seam.scale.y = 1.3;
    g.add(seam);

    const head = new THREE.Group();
    head.position.set(0, 0.39, 0.01);
    head.add(sphere(0.112, fur, 0, 0, 0, 1.08, 0.98, 1));
    const muzzle = sphere(0.062, cream, 0, -0.032, 0.083, 1.15, 0.85, 0.8);
    head.add(muzzle);
    head.add(sphere(0.022, noseMat, 0, -0.002, 0.147, 1.25, 0.8, 0.75));
    eyePair(head, 0.017, 0.043, 0.032, 0.092, true);
    [-1, 1].forEach((s) => {
      const earPivot = new THREE.Group();
      earPivot.position.set(s * 0.084, 0.082, -0.005);
      earPivot.rotation.z = s * 0.18;
      const ear = sphere(0.045, fur, 0, 0, 0, 1.05, 1, 0.6);
      earPivot.add(ear);
      const inner = sphere(0.026, cream, 0, 0, 0.018, 1, 1, 0.35);
      earPivot.add(inner);
      head.add(earPivot);
    });
    g.add(head);
    head.userData.noMerge = true;

    const armL = new THREE.Group();
    armL.position.set(-0.125, 0.26, 0.02);
    armL.rotation.z = 0.32;
    armL.add(sphere(0.055, fur, -0.015, -0.06, 0.01, 0.5, 1.4, 0.75));
    g.add(armL);
    const armR = new THREE.Group();
    armR.position.set(0.125, 0.26, 0.02);
    armR.rotation.z = -0.32;
    armR.add(sphere(0.055, fur, 0.015, -0.06, 0.01, 0.5, 1.4, 0.75));
    g.add(armR);
    armL.userData.noMerge = true;
    armR.userData.noMerge = true;

    [-1, 1].forEach((s) => {
      const leg = sphere(0.062, fur, s * 0.07, 0.06, 0.035, 1, 0.72, 1.15);
      g.add(leg);
      const paw = sphere(0.028, cream, s * 0.07, 0.055, 0.098, 1, 0.6, 0.5);
      g.add(paw);
    });
    hitArea(g, 0.23, 0.23);

    let bounce = 0;
    const item = {
      key: 'bear', kind: 'bear', group: g, lights: [], on: true, interactive: 'doll',
      baseY: 0, head, armL, armR,
      onClick() { bounce = 1.1; },
      update(t, dt) {
        bounce = U.damp(bounce, 0, 3.0, dt);
        g.position.y = g.userData.baseY + Math.abs(Math.sin(t * 6.4)) * 0.024 * bounce;
        g.rotation.z = Math.sin(t * 8.2) * 0.04 * bounce;
        head.rotation.z = Math.sin(t * 1.0 + 0.4) * 0.04 + Math.sin(t * 7.8) * 0.1 * bounce;
        head.rotation.y = Math.sin(t * 0.44 + 2.1) * 0.1;
        armL.rotation.z = 0.32 + Math.sin(t * 9) * 0.5 * bounce;
        armR.rotation.z = -0.32 - Math.sin(t * 9) * 0.5 * bounce;
      }
    };
    return item;
  }

  function buildBunny() {
    const g = new THREE.Group();
    const fur = plush(0xe6dccb, 61);
    const inner = plush(0xd8aeb0, 62);
    const noseMat = std(0xc9898c, 0.7, 0);
    const tailMat = plush(0xf3ede0, 63);

    const body = sphere(0.125, fur, 0, 0.19, 0, 1.0, 1.22, 0.9);
    g.add(body);
    const belly = sphere(0.082, plush(0xf2ebdc, 64), 0, 0.165, 0.072, 1, 1.05, 0.45);
    g.add(belly);

    const head = new THREE.Group();
    head.position.set(0, 0.36, 0.01);
    head.add(sphere(0.102, fur, 0, 0, 0, 1.04, 0.96, 1));
    const muzzle = sphere(0.05, plush(0xf4eee2, 65), 0, -0.03, 0.078, 1.15, 0.72, 0.72);
    head.add(muzzle);
    const nose = sphere(0.014, noseMat, 0, 0.002, 0.128, 1.3, 0.85, 0.8);
    head.add(nose);
    eyePair(head, 0.018, 0.043, 0.032, 0.083, true);

    // 一只耳朵竖着，一只耳朵软软地折下去
    const earL = new THREE.Group();
    earL.position.set(-0.052, 0.083, 0.0);
    earL.rotation.z = -0.18;
    const earLM = sphere(0.026, fur, 0, 0.105, 0, 0.95, 3.2, 0.55);
    earL.add(earLM);
    const earLIn = sphere(0.016, inner, 0, 0.105, 0.014, 0.8, 2.8, 0.3);
    earL.add(earLIn);
    head.add(earL);
    const earR = new THREE.Group();
    earR.position.set(0.055, 0.08, 0);
    earR.rotation.z = 0.68;
    const earRM = sphere(0.026, fur, 0, 0.095, 0, 0.95, 2.9, 0.5);
    earR.add(earRM);
    const earRIn = sphere(0.016, inner, 0, 0.095, 0.014, 0.8, 2.5, 0.3);
    earR.add(earRIn);
    head.add(earR);
    g.add(head);
    head.userData.noMerge = true;

    const armL = new THREE.Group();
    armL.position.set(-0.108, 0.23, 0.01);
    armL.add(sphere(0.047, fur, -0.01, -0.045, 0.008, 0.48, 1.25, 0.75));
    g.add(armL);
    const armR = new THREE.Group();
    armR.position.set(0.108, 0.23, 0.01);
    armR.add(sphere(0.047, fur, 0.01, -0.045, 0.008, 0.48, 1.25, 0.75));
    g.add(armR);
    armL.userData.noMerge = true;
    armR.userData.noMerge = true;

    const tail = sphere(0.052, tailMat, 0, 0.083, -0.115, 1, 1, 0.9);
    g.add(tail);
    [-1, 1].forEach((s) => {
      g.add(sphere(0.052, fur, s * 0.062, 0.055, 0.038, 0.95, 0.55, 1.25));
    });
    hitArea(g, 0.23, 0.22);

    let bounce = 0;
    const item = {
      key: 'bunny', kind: 'bunny', group: g, lights: [], on: true, interactive: 'doll',
      baseY: 0, head, earL, earR, armL, armR,
      onClick() { bounce = 1.2; },
      update(t, dt) {
        bounce = U.damp(bounce, 0, 3.6, dt);
        g.position.y = g.userData.baseY + Math.abs(Math.sin(t * 8.8)) * 0.03 * bounce;
        g.rotation.z = Math.sin(t * 10) * 0.04 * bounce;
        head.rotation.z = Math.sin(t * 0.8 + 1) * 0.035 + Math.sin(t * 7.4) * 0.08 * bounce;
        head.rotation.y = Math.sin(t * 0.39 + 0.6) * 0.11;
        earL.rotation.z = -0.18 + Math.sin(t * 1.7) * 0.06 + Math.sin(t * 9) * 0.2 * bounce;
        earR.rotation.z = 0.68 + Math.sin(t * 1.2 + 0.6) * 0.05 + Math.sin(t * 8.2) * 0.12 * bounce;
        armL.rotation.z = Math.sin(t * 8) * 0.4 * bounce;
        armR.rotation.z = -Math.sin(t * 8) * 0.4 * bounce;
      }
    };
    return item;
  }

  function placeDoll(item, x, z, rotY) {
    item.group.position.set(x, 0.026, z);
    item.group.rotation.y = rotY || 0;
    item.group.userData.baseY = 0.026;
    item.baseY = 0.026;
    /* 头颈处补一颗隐形拾取球：兔耳之间有空隙，不补的话点在头上会落到后面的吉他上 */
    item.group.updateWorldMatrix(true, true);
    const bb = new THREE.Box3().setFromObject(item.group);
    const h = bb.max.y - bb.min.y;
    hitArea(item.group, Math.min(0.14, h * 0.22), (bb.max.y - 0.026) * 0.72);
    return item;
  }

  /* ———————————————————— 水族箱 ———————————————————— */

  function fishBodyGeometry() {
    const geo = new THREE.SphereGeometry(0.055, 12, 8);
    geo.scale(0.66, 0.82, 1.9);
    return geo;
  }

  function fishTailGeometry() {
    const geo = new THREE.ConeGeometry(0.04, 0.12, 5);
    geo.rotateX(-Math.PI / 2);
    geo.scale(1.15, 0.28, 1);
    return geo;
  }

  function buildAquarium(M) {
    const g = new THREE.Group();
    const W = 0.9, H = 0.58, D = 0.4;
    const wood = M.darkWood;
    const brass = M.brass;
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbfe6e2, roughness: 0.04, metalness: 0.05, transparent: true, opacity: 0.14,
      side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.03,
      envMapIntensity: 0.8
    });
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x2f7d78, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.22,
      depthWrite: false, side: THREE.DoubleSide, emissive: 0x0c3c3a, emissiveIntensity: 0.35
    });
    const frameMat = brass;
    const baseY = 0.075;

    // 底座
    const plinth = U.box(W + 0.05, 0.075, D + 0.05, wood, 0, baseY / 2, 0);
    plinth.castShadow = true;
    g.add(plinth);
    const trim = U.box(W + 0.075, 0.018, D + 0.075, frameMat, 0, 0.078, 0);
    g.add(trim);

    // 水与玻璃
    const water = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, H - 0.1, D - 0.02), waterMat);
    water.position.y = baseY + (H - 0.1) / 2;
    water.renderOrder = 2;
    g.add(water);
    water.userData.noMerge = true;

    const glass = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), glassMat);
    glass.position.y = baseY + H / 2;
    glass.renderOrder = 3;
    g.add(glass);
    glass.userData.noMerge = true;

    // 铜框
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((p) => {
      const post = U.box(0.018, H + 0.02, 0.018, frameMat, p[0] * W / 2, baseY + H / 2, p[1] * D / 2);
      g.add(post);
    });
    const topFrame = U.box(W + 0.02, 0.022, D + 0.02, frameMat, 0, baseY + H + 0.01, 0);
    g.add(topFrame);
    const bottomFrame = U.box(W + 0.02, 0.016, D + 0.02, frameMat, 0, baseY + 0.008, 0);
    g.add(bottomFrame);
    // 顶盖半掩
    const lid = U.box(W + 0.04, 0.012, D + 0.03, wood, 0.06, baseY + H + 0.028, 0);
    g.add(lid);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.03, 12), M.brassDark);
    lamp.position.set(-0.18, baseY + H + 0.03, 0);
    g.add(lamp);
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: M.glowTex, color: 0xffd9a3, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
    }));
    lampGlow.scale.set(0.22, 0.22, 1);
    lampGlow.position.set(-0.18, baseY + H + 0.04, 0);
    g.add(lampGlow);

    // 底砂与卵石
    const sand = U.box(W - 0.045, 0.045, D - 0.045, std(0x6c5740, 0.95, 0), 0, baseY + 0.03, 0);
    g.add(sand);
    const rng = U.mulberry32(773);
    const pebbleGeo = new THREE.DodecahedronGeometry(0.014, 0);
    const pebbleMat = std(0x4f554e, 0.9, 0);
    const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, 42);
    const pm = new THREE.Matrix4();
    const pq = new THREE.Quaternion();
    const ps = new V3();
    for (let i = 0; i < 42; i++) {
      pq.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3));
      ps.set(0.35 + rng() * 1.5, 0.5 + rng() * 1.1, 0.6 + rng() * 0.7);
      pm.compose(new V3((rng() - 0.5) * (W - 0.09), baseY + 0.045, (rng() - 0.5) * (D - 0.09)), pq, ps);
      pebbles.setMatrixAt(i, pm);
    }
    g.add(pebbles);

    // 沉木与石块
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.065, 0), std(0x59605a, 0.9, 0));
    rock.position.set(-0.26, baseY + 0.075, 0.02);
    rock.scale.set(1.2, 0.75, 0.9);
    g.add(rock);
    const rock2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), std(0x464e48, 0.92, 0));
    rock2.position.set(0.22, baseY + 0.06, -0.08);
    rock2.rotation.set(1, 0.4, 0.2);
    g.add(rock2);
    const drift = U.makeCurveTube([
      new V3(-0.36, baseY + 0.04, 0.02),
      new V3(-0.3, baseY + 0.18, 0.05),
      new V3(-0.16, baseY + 0.26, 0.0),
      new V3(-0.04, baseY + 0.24, -0.04)
    ], 0.014, std(0x5d4028, 0.95, 0), 18, 6);
    g.add(drift);

    // 水草
    const plantMat = std(0x4f8a62, 0.9, 0);
    const plantMat2 = std(0x6ca06e, 0.9, 0);
    const plants = [];
    for (let i = 0; i < 9; i++) {
      const px = -0.38 + rng() * 0.76;
      const pz = -0.14 + rng() * 0.28;
      const h = 0.12 + rng() * 0.24;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, h, 4), i % 2 ? plantMat : plantMat2);
      stem.position.set(px, baseY + 0.05 + h / 2, pz);
      g.add(stem);
      for (let j = 0; j < 3; j++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.012), i % 2 ? plantMat : plantMat2);
        leaf.position.set(px + Math.sin(j * 2.1) * 0.012, baseY + 0.07 + h * (0.35 + j * 0.22), pz);
        leaf.rotation.set(0.2, j * 1.8, 0.5 + Math.sin(j) * 0.3);
        g.add(leaf);
      }
      plants.push({ mesh: stem, phase: rng() * 6.28, baseRot: 0 });
    }

    // 鱼群
    const fishCount = 11;
    const palette = [0xe0a04f, 0x7fb8c9, 0xd97c68, 0xdfcb92, 0x8fb58a];
    const bodyGeo = fishBodyGeometry();
    const tailGeo = fishTailGeometry();
    const fishMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.42, metalness: 0.18, envMapIntensity: 0.8
    });
    const bodies = new THREE.InstancedMesh(bodyGeo, fishMat, fishCount);
    const tails = new THREE.InstancedMesh(tailGeo, fishMat, fishCount);
    bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const fishes = [];
    const frng = U.mulberry32(801);
    for (let i = 0; i < fishCount; i++) {
      const data = {
        rx: 0.12 + frng() * 0.22,
        rz: 0.08 + frng() * 0.11,
        y: baseY + 0.14 + frng() * 0.3,
        speed: (0.28 + frng() * 0.38) * (frng() > 0.5 ? 1 : -1),
        phase: frng() * Math.PI * 2,
        scale: 0.5 + frng() * 0.55,
        sway: frng() * 2.5,
        color: palette[i % palette.length]
      };
      fishes.push(data);
      bodies.setColorAt(i, new THREE.Color(data.color));
      tails.setColorAt(i, new THREE.Color(data.color).multiplyScalar(0.82));
    }
    bodies.instanceColor.needsUpdate = true;
    tails.instanceColor.needsUpdate = true;
    g.add(bodies);
    g.add(tails);

    // 气泡
    const bubbleGeo = new THREE.BufferGeometry();
    const bubbleN = 26;
    const bp = new Float32Array(bubbleN * 3);
    const bseed = [];
    for (let i = 0; i < bubbleN; i++) {
      const d = {
        x: -0.34 + frng() * 0.68, z: -0.13 + frng() * 0.26,
        y: frng(), speed: 0.08 + frng() * 0.13, r: 0.008 + frng() * 0.012
      };
      bseed.push(d);
      bp[i * 3] = d.x; bp[i * 3 + 1] = baseY + 0.05 + d.y * (H - 0.2); bp[i * 3 + 2] = d.z;
    }
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    const bubbles = new THREE.Points(bubbleGeo, new THREE.PointsMaterial({
      size: 0.018, map: M.glowTex, color: 0xdff7f0, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false
    }));
    bubbles.frustumCulled = false;
    g.add(bubbles);

    // 鱼食
    const foodGeo = new THREE.BufferGeometry();
    const foodN = 14;
    const fp = new Float32Array(foodN * 3);
    for (let i = 0; i < foodN; i++) {
      fp[i * 3] = (frng() - 0.5) * 0.4;
      fp[i * 3 + 1] = baseY + H - 0.08;
      fp[i * 3 + 2] = (frng() - 0.5) * 0.2;
    }
    foodGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    const food = new THREE.Points(foodGeo, new THREE.PointsMaterial({
      size: 0.014, color: 0xe0b56e, transparent: true, opacity: 0,
      depthWrite: false, sizeAttenuation: true
    }));
    food.frustumCulled = false;
    g.add(food);

    let feedTimer = 0;
    const phaseCollect = [];
    for (let i = 0; i < fishCount; i++) phaseCollect.push({ f: null });
    const tmpM = new THREE.Matrix4();
    const tmpB = new THREE.Matrix4();
    const tmpT = new THREE.Matrix4();
    const tmpQ = new THREE.Quaternion();
    const tmpP = new V3();
    const tmpS = new V3();
    const tmpE = new THREE.Euler();

    function updateFish(t, dt) {
      const excite = U.clamp(feedTimer / 2.2, 0, 1);
      for (let i = 0; i < fishCount; i++) {
        const f = fishes[i];
        const a = t * f.speed + f.phase;
        const x = Math.cos(a) * f.rx * (1 + excite * 0.28);
        const z = Math.sin(a) * f.rz * (1 + excite * 0.28);
        const y = f.y + Math.sin(t * 1.5 + f.phase * 2) * 0.025 + excite * Math.sin(t * 5 + f.phase) * 0.02;
        f.yaw = Math.atan2(-Math.sin(a) * f.rx * Math.sign(f.speed), Math.cos(a) * f.rz * Math.sign(f.speed) * 1.2);
        tmpE.set(0, f.yaw + Math.PI / 2, Math.sin(t * 2 + f.phase) * 0.08 * (1 + excite));
        tmpQ.setFromEuler(tmpE);
        tmpP.set(x, y, z);
        tmpS.setScalar(f.scale);
        tmpM.compose(tmpP, tmpQ, tmpS);
        tmpB.copy(tmpM);
        bodies.setMatrixAt(i, tmpB);
        const sway = Math.sin(t * 16 + f.phase + f.sway) * (0.34 + excite * 0.3);
        tmpT.copy(tmpM);
        tmpT.multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.092));
        tmpT.multiply(new THREE.Matrix4().makeRotationY(sway));
        tails.setMatrixAt(i, tmpT);
      }
      bodies.instanceMatrix.needsUpdate = true;
      tails.instanceMatrix.needsUpdate = true;
    }

    const item = {
      key: 'aquarium', group: g, lights: [], on: true, interactive: 'aquarium',
      onClick() {
        feedTimer = 7;
        const f = food.geometry.attributes.position;
        for (let i = 0; i < foodN; i++) {
          f.array[i * 3] = (Math.random() - 0.5) * 0.42;
          f.array[i * 3 + 1] = baseY + H - 0.08 - Math.random() * 0.035;
          f.array[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        }
        f.needsUpdate = true;
        return true;
      },
      hover() {
        return '撒一点鱼食';
      },
      update(t, dt) {
        updateFish(t, dt);
        // 水草轻摆
        plants.forEach((p, i) => {
          p.mesh.rotation.z = Math.sin(t * 0.8 + p.phase) * 0.1;
          p.mesh.position.x += Math.sin(t * 0.55 + i) * 0.00008;
        });
        // 气泡
        const bpos = bubbles.geometry.attributes.position;
        for (let i = 0; i < bubbleN; i++) {
          const d = bseed[i];
          let y = bpos.array[i * 3 + 1] + d.speed * dt;
          if (y > baseY + H - 0.06) y = baseY + 0.05;
          bpos.array[i * 3 + 1] = y;
          bpos.array[i * 3] = d.x + Math.sin(t * 1.2 + i) * 0.004;
        }
        bpos.needsUpdate = true;
        // 鱼食缓慢下沉、被吃掉
        if (feedTimer > 0) {
          feedTimer -= dt;
          food.material.opacity = U.clamp(feedTimer / 2, 0, 0.9);
          const f = food.geometry.attributes.position;
          for (let i = 0; i < foodN; i++) {
            f.array[i * 3 + 1] -= dt * (0.035 + (i % 3) * 0.012);
          }
          f.needsUpdate = true;
        } else if (food.material.opacity > 0) {
          food.material.opacity = Math.max(0, food.material.opacity - dt * 0.6);
        }
        lampGlow.material.opacity = 0.42 + Math.sin(t * 0.9) * 0.06;
      }
    };
    return item;
  }

  /* ———————————————————— 地球仪 ———————————————————— */

  function earthTexture() {
    const w = 512, h = 256;
    const c = U.makeCanvas(w, h);
    const x = c.getContext('2d');
    const rng = U.mulberry32(902);
    const ocean = x.createLinearGradient(0, 0, 0, h);
    ocean.addColorStop(0, '#163a4c');
    ocean.addColorStop(0.45, '#1f6172');
    ocean.addColorStop(1, '#14313e');
    x.fillStyle = ocean;
    x.fillRect(0, 0, w, h);
    // 陆块：几团被拉伸的噪声圆
    function blob(cx, cy, rx, ry, color) {
      x.fillStyle = color;
      x.beginPath();
      const steps = 28;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const wob = 0.75 + Math.sin(a * 3 + cx) * 0.1 + Math.sin(a * 7 + cy) * 0.07;
        const px = cx + Math.cos(a) * rx * wob;
        const py = cy + Math.sin(a) * ry * wob;
        if (i === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.closePath();
      x.fill();
    }
    const land = '#b7a878';
    const land2 = '#8f9e6c';
    const land3 = '#d0c190';
    blob(98, 96, 42, 28, land2);     // 北美
    blob(132, 132, 26, 40, land);
    blob(158, 192, 30, 22, land2);   // 南美
    blob(250, 88, 48, 26, land);     // 欧亚
    blob(292, 122, 34, 20, land3);
    blob(330, 152, 22, 16, land2);
    blob(250, 190, 22, 26, land3);   // 非洲
    blob(390, 196, 26, 16, land2);   // 澳洲
    blob(300, 60, 34, 18, land2);
    // 极冠
    x.fillStyle = 'rgba(242,243,235,0.9)';
    x.fillRect(0, 0, w, 12);
    x.fillRect(0, h - 16, w, 16);
    // 云带
    for (let i = 0; i < 22; i++) {
      x.fillStyle = 'rgba(250,250,243,' + (0.04 + rng() * 0.08) + ')';
      x.beginPath();
      x.ellipse(rng() * w, 20 + rng() * (h - 50), 12 + rng() * 30, 4 + rng() * 7, rng() * 3, 0, Math.PI * 2);
      x.fill();
    }
    // 经纬线
    x.strokeStyle = 'rgba(238,232,210,0.10)';
    x.lineWidth = 1;
    for (let i = 1; i < 12; i++) {
      x.beginPath();
      x.moveTo((i / 12) * w, 0);
      x.lineTo((i / 12) * w, h);
      x.stroke();
    }
    for (let i = 1; i < 6; i++) {
      x.beginPath();
      x.moveTo(0, (i / 6) * h);
      x.lineTo(w, (i / 6) * h);
      x.stroke();
    }
    return U.canvasTexture(c, { clamp: true, srgb: true, aniso: 4 });
  }

  function buildGlobe(M) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.085, 0),
      new THREE.Vector2(0.09, 0.014),
      new THREE.Vector2(0.05, 0.03),
      new THREE.Vector2(0.038, 0.055),
      new THREE.Vector2(0.03, 0.075)
    ], 20), M.walnut);
    base.castShadow = true;
    g.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.09, 10), M.brass);
    stem.position.y = 0.115;
    g.add(stem);
    const axis = new THREE.Group();
    axis.position.y = 0.235;
    axis.rotation.z = -0.36;
    g.add(axis);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.115, 26, 18), new THREE.MeshStandardMaterial({
      map: earthTexture(), roughness: 0.5, metalness: 0.05, envMapIntensity: 0.7
    }));
    globe.castShadow = true;
    globe.userData.noMerge = true;
    axis.add(globe);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.127, 0.006, 6, 40), M.brass);
    ring.rotation.y = Math.PI / 2;
    ring.scale.z = 1.02;
    axis.add(ring);
    const equator = new THREE.Mesh(new THREE.TorusGeometry(0.117, 0.0022, 4, 36), M.brassDark);
    equator.rotation.x = Math.PI / 2;
    axis.add(equator);
    const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 6), M.brass);
    pointer.position.set(0, 0.145, 0);
    pointer.rotation.z = Math.PI;
    axis.add(pointer);
    const pinNorth = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.brass);
    pinNorth.position.set(0, 0.121, 0);
    axis.add(pinNorth);
    hitArea(g, 0.16, 0.25);

    let spin = 0;
    const item = {
      key: 'globe', group: g, lights: [], on: true, interactive: 'globe',
      globe,
      onClick() { spin = 1; },
      hover() { return '转一转地球'; },
      update(t, dt) {
        spin = U.damp(spin, 0, 1.4, dt);
        globe.rotation.y += dt * (0.075 + spin * 5.2);
        axis.rotation.z = -0.36 + Math.sin(t * 0.8) * 0.015 + spin * 0.04;
      }
    };
    return item;
  }

  /* ———————————————————— 八音盒 ———————————————————— */

  function buildMusicBox(M) {
    const g = new THREE.Group();
    const wood = M.walnut;
    const brass = M.brass;
    const velvet = std(0x6e3f3d, 0.96, 0);
    const ivory = std(0xf0e6d2, 0.5, 0);
    const boxW = 0.22, boxD = 0.15, boxH = 0.085;

    const body = new THREE.Mesh(U.roundedBoxGeometry(boxW, boxH, boxD, 0.012, 0.004), wood);
    body.position.y = boxH / 2;
    body.castShadow = true;
    g.add(body);
    const rim = U.box(boxW + 0.008, 0.008, boxD + 0.008, brass, 0, boxH - 0.004, 0);
    g.add(rim);
    const tray = U.box(boxW - 0.03, 0.01, boxD - 0.03, velvet, 0, boxH - 0.008, 0);
    g.add(tray);
    // 铜机芯与摇柄
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.075, 14), brass);
    cylinder.rotation.z = Math.PI / 2;
    cylinder.position.set(0.028, boxH + 0.008, -0.04);
    g.add(cylinder);
    const comb = U.box(0.055, 0.008, 0.018, brass, -0.035, boxH + 0.006, -0.045);
    g.add(comb);
    const crank = new THREE.Group();
    crank.position.set(boxW / 2 + 0.006, boxH * 0.55, 0);
    const crankRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6), brass);
    crankRod.rotation.z = Math.PI / 2;
    crank.add(crankRod);
    const crankHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.032, 6), brass);
    crankHandle.position.set(0.025, 0.014, 0);
    crank.add(crankHandle);
    g.add(crank);

    // 盖子
    const lid = new THREE.Group();
    lid.position.set(0, boxH, -boxD / 2);
    lid.userData.noMerge = true;
    const lidMesh = new THREE.Mesh(U.roundedBoxGeometry(boxW + 0.008, 0.014, boxD + 0.008, 0.008, 0.003), wood);
    lidMesh.position.set(0, 0.007, boxD / 2);
    lid.add(lidMesh);
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(boxW - 0.035, boxD - 0.04), new THREE.MeshStandardMaterial({
      color: 0xd8c9ac, roughness: 0.18, metalness: 0.7, envMapIntensity: 1.2
    }));
    mirror.rotation.x = Math.PI / 2;
    mirror.position.set(0, 0.017, boxD / 2 + 0.012);
    lid.add(mirror);
    g.add(lid);

    // 跳舞的小人
    const dancer = new THREE.Group();
    dancer.position.set(-0.02, boxH + 0.002, 0);
    dancer.userData.noMerge = true;
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.055, 10), std(0xd7b36d, 0.7, 0.1));
    skirt.position.y = 0.048;
    dancer.add(skirt);
    const torso = sphere(0.012, ivory, 0, 0.085, 0, 1, 1.3, 0.9);
    dancer.add(torso);
    const head = sphere(0.011, ivory, 0, 0.108, 0);
    dancer.add(head);
    const hair = sphere(0.0115, std(0x5a3d2c, 0.95, 0), 0, 0.114, -0.003, 1, 0.7, 1);
    dancer.add(hair);
    [-1, 1].forEach((s) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.035, 4), ivory);
      arm.position.set(s * 0.015, 0.09, 0);
      arm.rotation.z = s * 0.8;
      dancer.add(arm);
    });
    g.add(dancer);

    // 音符
    const notes = [];
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glyphTexture(i % 2), color: 0xffe3b0, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
      }));
      sp.scale.set(0.055, 0.055, 1);
      sp.userData.phase = i / 4;
      g.add(sp);
      notes.push(sp);
    }

    /* 小盒子的可点范围比机身略大，免得鼠标总是从摇柄缝里漏过去 */
    hitArea(g, 0.15, 0.07);

    let open = 0;
    let target = 0;
    let playing = false;
    let until = 0;
    const item = {
      key: 'musicBox', group: g, lights: [], on: true, interactive: 'musicBox',
      get playing() { return playing; },
      onClick() {
        playing = !playing;
        target = playing ? 1 : 0;
        until = playing ? performance.now() / 1000 + 14 : 0;
        return playing;
      },
      hover() { return playing ? ['合上盒盖', 'CLOSE THE LID'] : ['上紧发条', 'WIND THE BOX']; },
      update(t, dt) {
        if (playing && until && performance.now() / 1000 > until) {
          playing = false;
          target = 0;
        }
        open = U.damp(open, target, 2.4, dt);
        lid.rotation.x = -open * 1.35;
        dancer.rotation.y += dt * (0.7 + open * 2.6);
        dancer.position.y = boxH + 0.002 + Math.abs(Math.sin(t * 4.2)) * 0.006 * open;
        crank.rotation.x += dt * open * 4.8;
        notes.forEach((sp, i) => {
          const p = ((t * 0.22 + sp.userData.phase) % 1);
          sp.position.set(-0.02 + Math.sin(t * 1.5 + i * 2.1) * 0.08, boxH + 0.1 + p * 0.32, 0.02 + Math.cos(t + i) * 0.04);
          sp.material.opacity = open * Math.max(0, Math.sin(p * Math.PI)) * 0.7;
          sp.material.rotation = Math.sin(t * 0.8 + i) * 0.2;
        });
      }
    };
    return item;
  }

  /* ———————————————————— 风铃 ———————————————————— */
  function buildWindChime(M) {
    const g = new THREE.Group();
    const pivot = new THREE.Group();
    pivot.userData.noMerge = true;
    g.add(pivot);

    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.13, 5), M.brassDark);
    hanger.position.y = -0.065;
    pivot.add(hanger);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.092, 0.018, 20), M.walnut);
    disc.position.y = -0.14;
    disc.castShadow = true;
    pivot.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.004, 5, 24), M.brass);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.14;
    pivot.add(rim);

    /* 五根铜管，长短错开，声音才会一层一层散开 */
    const lengths = [0.24, 0.31, 0.27, 0.34, 0.21];
    lengths.forEach((len, i) => {
      const a = (i / lengths.length) * Math.PI * 2 + 0.3;
      const x = Math.cos(a) * 0.064;
      const z = Math.sin(a) * 0.064;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, len, 8), M.brass);
      tube.position.set(x, -0.16 - len / 2, z);
      tube.castShadow = true;
      pivot.add(tube);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.009, 8), M.brassDark);
      cap.position.set(x, -0.155, z);
      pivot.add(cap);
    });

    const clapper = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.08, 6), M.darkWood);
    clapper.position.y = -0.325;
    clapper.rotation.y = 0.4;
    pivot.add(clapper);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.15, 4), M.rod);
    line.position.y = -0.245;
    pivot.add(line);
    const sail = new THREE.Mesh(U.roundedBoxGeometry(0.07, 0.11, 0.008, 0.02, 0.004), M.linenCream);
    sail.position.set(0, -0.44, 0.008);
    sail.rotation.z = 0.06;
    pivot.add(sail);

    /* 可点范围做在吊牌附近，挂在窗边也不怕点不中 */
    hitArea(pivot, 0.16, -0.28);

    let impulse = 0;
    const item = {
      key: 'windChime', group: g, lights: [], on: true, interactive: 'windChime',
      onClick() {
        impulse = 1;
        return true;
      },
      hover() { return ['摇一摇风铃', 'RING THE CHIME']; },
      update(t, dt) {
        impulse = U.damp(impulse, 0, 1.1, dt);
        const swing = Math.sin(t * 0.85) * 0.022 + impulse * Math.sin(t * 5.4) * 0.24;
        pivot.rotation.z = swing;
        pivot.rotation.x = Math.cos(t * 0.66) * 0.014 + impulse * Math.cos(t * 4.7) * 0.13;
      }
    };
    g.position.set(2.18, 3.02, -3.22);
    return item;
  }

  /* ———————————————————— 绕茶几跑的玩具小火车 ———————————————————— */
  function buildToyTrain(M) {
    const g = new THREE.Group();
    /* 茶几右侧、边几前正好一圈空地：把轨道收成 1.0 × 0.8 米的小圈，
       小火车的比例不变，镜头里能完整看见，也不会蹭到桌腿和边几 */
    const cx = 0, cz = 0, rx = 0.5, rz = 0.4;
    const points = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      points.push(new V3(cx + Math.cos(a) * rx, 0.028, cz + Math.sin(a) * rz));
    }
    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

    const bedMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1f, roughness: 0.92 });
    const bed = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.013, 5, true), bedMat);
    bed.receiveShadow = true;
    g.add(bed);
    const railPts = points.map((p) => new V3(p.x, p.y + 0.012, p.z));
    const railCurve = new THREE.CatmullRomCurve3(railPts, true, 'centripetal');
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 180, 0.0042, 4, true), M.brass);
    g.add(rail);

    const carBody = new THREE.MeshStandardMaterial({ color: 0x26463b, roughness: 0.52, metalness: 0.35 });
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x8f4b35, roughness: 0.48, metalness: 0.28 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2b2119, roughness: 0.6, metalness: 0.4 });
    const glowMat = new THREE.SpriteMaterial({
      map: M.glowTex, color: 0xffcf8a, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
    });

    function wheels(parent, xs, zs, r) {
      xs.forEach((x) => zs.forEach((z) => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.011, 10), wheelMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(x, r + 0.006, z);
        parent.add(w);
      }));
    }

    function makeEngine() {
      const e = new THREE.Group();
      const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.16, 12), carBody);
      boiler.rotation.z = Math.PI / 2;
      boiler.position.set(0.025, 0.055, 0);
      e.add(boiler);
      const cab = new THREE.Mesh(U.roundedBoxGeometry(0.085, 0.082, 0.082, 0.012, 0.006), cabMat);
      cab.position.set(-0.065, 0.056, 0);
      e.add(cab);
      const roof = new THREE.Mesh(U.roundedBoxGeometry(0.098, 0.012, 0.094, 0.006, 0.003), M.brassDark);
      roof.position.set(-0.065, 0.103, 0);
      e.add(roof);
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.055, 8), M.brassDark);
      chimney.position.set(0.075, 0.107, 0);
      e.add(chimney);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), M.brass);
      dome.position.set(0.018, 0.088, 0);
      e.add(dome);
      wheels(e, [-0.035, 0.065], [-0.038, 0.038], 0.021);
      const lamp = new THREE.Sprite(glowMat);
      lamp.scale.set(0.15, 0.15, 1);
      lamp.position.set(0.115, 0.06, 0.02);
      e.add(lamp);
      const puff = new THREE.Sprite(new THREE.SpriteMaterial({
        map: M.steamTex, color: 0xe8e2d4, transparent: true, opacity: 0.22,
        depthWrite: false, blending: THREE.NormalBlending
      }));
      puff.scale.set(0.07, 0.1, 1);
      puff.position.set(0.078, 0.16, 0);
      e.add(puff);
      e.userData.puff = puff;
      hitArea(e, 0.11, 0.07);
      return e;
    }

    function makeCar(i) {
      const c = new THREE.Group();
      const base = new THREE.Mesh(U.roundedBoxGeometry(0.145, 0.028, 0.06, 0.008, 0.004), M.darkWood);
      base.position.y = 0.033;
      c.add(base);
      const body = new THREE.Mesh(U.roundedBoxGeometry(0.132, 0.05, 0.052, 0.01, 0.005), i % 2 ? cabMat : carBody);
      body.position.y = 0.068;
      c.add(body);
      const roof = new THREE.Mesh(U.roundedBoxGeometry(0.14, 0.008, 0.058, 0.004, 0.002), M.brassDark);
      roof.position.y = 0.096;
      c.add(roof);
      wheels(c, [-0.04, 0.04], [-0.028, 0.028], 0.016);
      hitArea(c, 0.085, 0.06);
      return c;
    }

    const train = new THREE.Group();
    train.userData.noMerge = true;
    g.add(train);
    const engine = makeEngine();
    train.add(engine);
    const cars = [makeCar(0), makeCar(1), makeCar(2)];
    cars.forEach((c) => train.add(c));
    const units = [{ obj: engine, offset: 0 }].concat(cars.map((c, i) => ({ obj: c, offset: 0.045 + i * 0.036 })));

    let u = 0.16;
    let boost = 0;
    const item = {
      key: 'toyTrain', group: g, lights: [], on: true, interactive: 'toyTrain',
      onClick() {
        boost = 1;
        return true;
      },
      hover() { return ['让火车跑快些', 'WIND THE TRAIN']; },
      update(t, dt) {
        u = (u + dt * (0.021 + boost * 0.075)) % 1;
        boost = U.damp(boost, 0, 0.55, dt);
        units.forEach((unit, i) => {
          const at = (u - unit.offset + 1) % 1;
          const p = curve.getPointAt(at);
          const tan = curve.getTangentAt(at);
          unit.obj.position.set(p.x, p.y + 0.006, p.z);
          unit.obj.rotation.y = Math.atan2(-tan.z, tan.x);
          unit.obj.rotation.z = Math.sin(at * Math.PI * 2 * 3 + i) * 0.012;
        });
        engine.userData.puff.material.opacity = 0.12 + Math.max(0, Math.sin(t * 2.6)) * 0.16 + boost * 0.18;
        engine.userData.puff.position.y = 0.16 + (Math.sin(t * 2.6) * 0.5 + 0.5) * 0.035;
      }
    };
    return item;
  }

  /* ———————————————————— 摇椅 ———————————————————— */

  function buildRockingChair(M) {
    const g = new THREE.Group();
    const wood = M.walnut;
    const cushionMat = M.linenRust;
    const throwMat = M.linenThrow;

    // 两条弯月形的摇杆
    [-1, 1].forEach((s) => {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const a = -0.65 + (i / 12) * 1.3;
        pts.push(new V3(s * 0.27, 0.02 + Math.cos(a) * 0.018 + (Math.abs(a) / 1.3) * 0.055, Math.sin(a) * 0.34));
      }
      const runner = U.makeCurveTube(pts, 0.018, wood, 26, 7);
      runner.castShadow = true;
      g.add(runner);
      const foot = U.box(0.05, 0.026, 0.09, wood, s * 0.27, 0.02, 0.3);
      g.add(foot);
    });

    const chair = new THREE.Group();
    chair.position.y = 0.06;
    chair.userData.noMerge = true;

    // 腿与座框
    [[-0.22, 0.18], [0.22, 0.18], [-0.22, -0.2], [0.22, -0.2]].forEach((p) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.021, 0.26, 8), wood);
      leg.position.set(p[0], 0.14, p[1]);
      leg.rotation.z = p[0] * 0.08;
      leg.castShadow = true;
      chair.add(leg);
    });
    const seat = new THREE.Mesh(U.roundedBoxGeometry(0.52, 0.06, 0.48, 0.06, 0.012), wood);
    seat.position.set(0, 0.28, 0);
    seat.castShadow = true;
    chair.add(seat);
    const cushion = new THREE.Mesh(U.roundedBoxGeometry(0.45, 0.07, 0.41, 0.06, 0.014), cushionMat);
    cushion.position.set(0, 0.345, 0.01);
    cushion.castShadow = true;
    chair.add(cushion);
    // 靠背
    const back = new THREE.Group();
    back.position.set(0, 0.34, -0.23);
    back.rotation.x = 0.13;
    [-1, 1].forEach((s) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.57, 8), wood);
      post.position.set(s * 0.23, 0.29, 0);
      back.add(post);
    });
    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.43, 8), wood);
      slat.rotation.z = Math.PI / 2;
      slat.position.set(0, 0.13 + i * 0.12, 0);
      back.add(slat);
    }
    const backPad = new THREE.Mesh(U.roundedBoxGeometry(0.36, 0.19, 0.045, 0.05, 0.01), cushionMat);
    backPad.position.set(0, 0.34, 0.025);
    back.add(backPad);
    chair.add(back);
    // 扶手
    [-1, 1].forEach((s) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8), wood);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(s * 0.28, 0.45, -0.02);
      chair.add(arm);
      const support = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.18, 8), wood);
      support.position.set(s * 0.28, 0.36, 0.15);
      chair.add(support);
    });
    // 搭在椅背上的薄毯
    const throwCloth = new THREE.Mesh(U.roundedBoxGeometry(0.27, 0.36, 0.03, 0.04, 0.008), throwMat);
    throwCloth.position.set(0.15, 0.48, -0.24);
    throwCloth.rotation.set(0.1, 0, -0.08);
    chair.add(throwCloth);
    g.add(chair);
    hitArea(g, 0.36, 0.32);

    let phase = 0;
    let amp = 0;
    const item = {
      key: 'rockingChair', group: g, lights: [], on: true, interactive: 'rockingChair',
      onClick() { amp = 0.085; phase = 0; },
      hover() { return '坐上去摇一摇'; },
      update(t, dt) {
        amp = U.damp(amp, 0, 0.55, dt);
        phase += dt * 2.1;
        chair.rotation.z = Math.sin(phase) * amp;
        chair.rotation.x = Math.sin(phase * 0.5) * amp * 0.12;
      }
    };
    return item;
  }

  /* ———————————————————— 边几与台灯 ———————————————————— */

  function buildSideTable(M) {
    const g = new THREE.Group();
    const wood = M.walnut;
    const brass = M.brass;
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xecd9b6, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
      emissive: 0xffa858, emissiveIntensity: 0.1
    });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.03, 24), wood);
    top.position.y = 0.58;
    top.castShadow = true;
    g.add(top);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.008, 6, 30), brass);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.596;
    g.add(lip);
    // 三条外撇的腿
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.019, 0.57, 8), wood);
      leg.position.set(Math.cos(a) * 0.15, 0.285, Math.sin(a) * 0.15);
      leg.rotation.z = -Math.cos(a) * 0.12;
      leg.rotation.x = Math.sin(a) * 0.12;
      g.add(leg);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.007, 5, 24), wood);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.18;
    g.add(ring);

    // 小台灯
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.018, 16), brass);
    lampBase.position.set(0.05, 0.603, -0.02);
    g.add(lampBase);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.23, 8), brass);
    stem.position.set(0.05, 0.72, -0.02);
    g.add(stem);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.095, 0.105, 18, 1, true), shadeMat);
    shade.position.set(0.05, 0.845, -0.02);
    shade.castShadow = true;
    shade.userData.noMerge = true;
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd7a2 }));
    bulb.position.set(0.05, 0.8, -0.02);
    g.add(bulb);
    bulb.userData.noMerge = true;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: M.glowTex, color: 0xffc27d, transparent: true, opacity: 0.28,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
    }));
    glow.scale.set(0.36, 0.36, 1);
    glow.position.set(0.05, 0.81, -0.02);
    g.add(glow);

    const light = new THREE.PointLight(0xffbe83, 0.5, 2.6, 2);
    light.position.set(0.05, 0.82, -0.02);
    g.add(light);

    // 一本压着杯垫的书
    const book = U.box(0.17, 0.022, 0.23, M.velvetDeep, -0.08, 0.607, 0.02);
    book.rotation.y = 0.4;
    g.add(book);
    const coaster = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.033, 0.008, 16), brass);
    coaster.position.set(0.1, 0.603, 0.09);
    g.add(coaster);

    let lampOn = true;
    const item = {
      key: 'sideTable', group: g, lights: [light], on: true, interactive: 'sideTable', manualLights: true,
      get lampOn() { return lampOn; },
      onClick() {
        lampOn = !lampOn;
        return lampOn;
      },
      hover() { return lampOn ? '关掉台灯' : '点亮台灯'; },
      update(t) {
        const flick = lampOn ? 0.94 + Math.sin(t * 2.1) * 0.03 + Math.sin(t * 7.3) * 0.015 : 0;
        light.intensity = 0.5 * flick * (this.moodGain || 1);
        shadeMat.emissiveIntensity = lampOn ? 0.26 + Math.sin(t * 1.7) * 0.03 : 0.015;
        bulb.material.color.setHex(lampOn ? 0xffd7a2 : 0x5b5045);
        glow.material.opacity = lampOn ? 0.22 + Math.sin(t * 1.9) * 0.03 : 0.02;
      }
    };
    /* 原来在 3.32，镜头里只剩一条边；挪到摇椅旁，既是边几也点得到 */
    g.position.set(2.52, 0, -0.12);
    g.rotation.y = 0.2;
    return item;
  }

  /* ———————————————————— 屏风 ———————————————————— */

  function screenArt(seed, mood) {
    const w = 256, h = 384;
    const c = U.makeCanvas(w, h);
    const x = c.getContext('2d');
    const rng = U.mulberry32(seed);
    const bg = x.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#e7dcc4');
    bg.addColorStop(0.55, '#d8c9ad');
    bg.addColorStop(1, '#c6b394');
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    // 远山
    for (let layer = 0; layer < 4; layer++) {
      x.fillStyle = 'rgba(64,75,73,' + (0.10 + layer * 0.07) + ')';
      x.beginPath();
      x.moveTo(0, h);
      const baseY = 120 + layer * 55;
      for (let i = 0; i <= 12; i++) {
        const px = (i / 12) * w;
        const py = baseY + Math.sin(i * 1.3 + layer) * 20 + rng() * 12;
        x.lineTo(px, py);
      }
      x.lineTo(w, h);
      x.closePath();
      x.fill();
    }
    // 月亮
    if (mood === 0) {
      x.fillStyle = 'rgba(246,231,198,0.82)';
      x.beginPath();
      x.arc(186, 78, 34, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = 'rgba(90,82,68,0.18)';
      x.lineWidth = 1;
      x.stroke();
    } else {
      // 一截探出来的松枝
      x.strokeStyle = 'rgba(54,63,54,0.5)';
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(28, 20);
      x.bezierCurveTo(70, 58, 68, 122, 52, 164);
      x.stroke();
      for (let i = 0; i < 12; i++) {
        x.strokeStyle = 'rgba(54,63,54,' + (0.3 + rng() * 0.25) + ')';
        x.lineWidth = 2;
        const px = 46 + rng() * 70;
        const py = 48 + rng() * 110;
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px + (rng() - 0.5) * 45, py + (rng() - 0.5) * 32);
        x.stroke();
      }
    }
    // 飞鸟
    x.strokeStyle = 'rgba(60,62,55,0.35)';
    x.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      const bx = 30 + rng() * 150, by = 60 + rng() * 110;
      x.beginPath();
      x.moveTo(bx - 5, by);
      x.quadraticCurveTo(bx - 2, by - 4, bx, by);
      x.quadraticCurveTo(bx + 2, by - 4, bx + 5, by);
      x.stroke();
    }
    // 纸纹
    for (let i = 0; i < 2200; i++) {
      x.fillStyle = rng() > 0.5 ? 'rgba(255,248,232,0.05)' : 'rgba(80,64,44,0.04)';
      x.fillRect(rng() * w, rng() * h, 1, 1);
    }
    // 落款红印
    x.fillStyle = 'rgba(142,58,44,0.65)';
    x.fillRect(w - 42, h - 58, 18, 18);
    x.fillStyle = 'rgba(238,224,200,0.85)';
    x.font = '10px serif';
    x.fillText('窗', w - 37, h - 45);
    return U.canvasTexture(c, { clamp: true, srgb: true, aniso: 4 });
  }

  function buildScreen(M) {
    const g = new THREE.Group();
    const frameMat = M.darkWood;
    const panelW = 0.58, panelH = 1.64;
    const artMats = [
      new THREE.MeshStandardMaterial({ map: screenArt(21, 0), roughness: 0.94, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: screenArt(22, 1), roughness: 0.94, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: screenArt(23, 0), roughness: 0.94, side: THREE.DoubleSide })
    ];
    const pivots = [];
    [-1, 0, 1].forEach((which) => {
      const pivot = new THREE.Group();
      const offset = which * panelW;
      pivot.position.set(offset, 0, 0);
      pivot.rotation.y = which * -0.34;
      if (which !== 0) pivot.userData.noMerge = true;
      const panel = new THREE.Group();
      // 木框
      const fw = 0.035;
      panel.add(U.box(panelW, fw, 0.024, frameMat, 0, panelH, 0));
      panel.add(U.box(panelW, fw, 0.024, frameMat, 0, 0, 0));
      panel.add(U.box(fw, panelH, 0.024, frameMat, -panelW / 2 + fw / 2, panelH / 2, 0));
      panel.add(U.box(fw, panelH, 0.024, frameMat, panelW / 2 - fw / 2, panelH / 2, 0));
      panel.add(U.box(panelW - fw * 2, 0.012, 0.02, frameMat, 0, panelH * 0.67, 0));
      // 纸面
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(panelW - fw * 2, panelH - fw * 2), artMats[which + 1]);
      paper.position.set(0, panelH / 2, 0.002);
      paper.receiveShadow = true;
      panel.add(paper);
      // 底座与铜脚
      panel.add(U.box(panelW + 0.04, 0.035, 0.13, frameMat, 0, 0.018, 0));
      [-1, 1].forEach((s) => {
        const foot = U.box(0.045, 0.012, 0.16, M.brass, s * (panelW / 2 - 0.04), 0.006, 0);
        panel.add(foot);
      });
      pivot.add(panel);
      g.add(pivot);
      pivots.push(pivot);
    });

    let fold = 1;
    let target = 1;
    const item = {
      key: 'screen', group: g, lights: [], on: true, interactive: 'screen',
      onClick() {
        target = target > 0.5 ? 0 : 1;
        return target > 0.5;
      },
      hover() { return target > 0.5 ? ['折起屏风', 'FOLD THE SCREEN'] : ['展开屏风', 'UNFOLD THE SCREEN']; },
      update(t, dt) {
        fold = U.damp(fold, target, 3.2, dt);
        pivots[0].rotation.y = 0.34 + fold * 0.5;
        pivots[2].rotation.y = -0.34 - fold * 0.5;
        pivots[1].position.z = fold * 0.08;
      }
    };
    g.position.set(-2.86, 0, -0.82);
    g.rotation.y = 0.52;
    return item;
  }

  /* ———————————————————— 壁灯 ———————————————————— */

  function buildSconce(M) {
    const g = new THREE.Group();
    const brass = M.brass;
    const shadeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf3dfbc, roughness: 0.6, metalness: 0, transparent: true, opacity: 0.42,
      side: THREE.DoubleSide, emissive: 0xffb268, emissiveIntensity: 0.5,
      depthWrite: false
    });
    const lights = [];
    const glows = [];
    [-1, 1].forEach((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 3.4, 0, 0);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.018, 12), brass);
      plate.rotation.x = Math.PI / 2;
      plate.position.set(0, 0, 0.01);
      arm.add(plate);
      const elbow = U.makeCurveTube([
        new V3(0, 0, 0.02),
        new V3(0, -0.03, 0.09),
        new V3(s * 0.01, 0.035, 0.14),
        new V3(s * 0.02, 0.075, 0.14)
      ], 0.008, brass, 14, 5);
      arm.add(elbow);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.025, 0.04, 12), brass);
      cup.position.set(s * 0.02, 0.092, 0.14);
      arm.add(cup);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.038, 0.13, 14, 1, true), shadeMat);
      shade.position.set(s * 0.02, 0.175, 0.14);
      shade.userData.noMerge = true;
      arm.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd7a2 }));
      bulb.position.set(s * 0.02, 0.128, 0.14);
      bulb.userData.noMerge = true;
      arm.add(bulb);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: M.glowTex, color: 0xffc785, transparent: true, opacity: 0.4,
        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
      }));
      glow.scale.set(0.5, 0.5, 1);
      glow.position.set(s * 0.02, 0.18, 0.15);
      arm.add(glow);
      glows.push(glow);
      const light = new THREE.PointLight(0xffc184, 0.5, 4.2, 2);
      light.position.set(s * 0.02, 0.15, 0.2);
      arm.add(light);
      lights.push(light);
      g.add(arm);
    });

    let on = true;
    const item = {
      key: 'sconce', group: g, lights, on: true, interactive: 'sconce', manualLights: true,
      get lit() { return on; },
      onClick() {
        on = !on;
        return on;
      },
      hover() { return on ? '熄掉壁灯' : '拨亮壁灯'; },
      update(t) {
        const f = on ? 0.92 + Math.sin(t * 2.2) * 0.035 + Math.sin(t * 8.1 + 2) * 0.02 : 0;
        const gain = this.moodGain || 1;
        lights.forEach((l) => { l.intensity = 0.5 * f * gain; });
        shadeMat.emissiveIntensity = on ? 0.55 + Math.sin(t * 1.6) * 0.05 : 0.025;
        glows.forEach((gl, i) => {
          gl.material.opacity = on ? 0.32 + Math.sin(t * 1.8 + i) * 0.05 : 0.03;
        });
      }
    };
    g.position.set(0, 2.2, -3.44);
    return item;
  }

  /* ———————————————————— 组装 ———————————————————— */

  WP.buildFurnitureExtra = function (M) {
    const items = {};
    const add = (item) => {
      if (!item) return;
      if (item.group && !item.group.userData.pickItem) item.group.userData.pickItem = item;
      items[item.key] = item;
      return item;
    };

    /* 四只玩偶沿窗台前的地毯排成一弯，避开左侧钢琴的脚 */
    add(placeDoll(buildPenguin(), -0.45, -1.62, 0.14));
    add(placeDoll(buildSeal(), 0.18, -1.9, -0.06));
    add(placeDoll(buildBear(), 0.85, -2.1, -0.12));
    add(placeDoll(buildBunny(), 1.48, -1.72, 0.1));

    const aquarium = add(buildAquarium(M));
    aquarium.group.position.set(-1.9, 0.462, -3.16);
    aquarium.group.rotation.y = 0.04;

    const globe = add(buildGlobe(M));
    globe.group.position.set(-0.42, 0.462, -3.03);
    globe.group.rotation.y = -0.25;

    const musicBox = add(buildMusicBox(M));
    /* 放到茶几前侧：坐下时伸手就能上发条，也不再和窗台的烛台挤在一起 */
    musicBox.group.position.set(0.08, 0.4095, 0.29);
    musicBox.group.rotation.y = 0.38;
    musicBox.group.scale.setScalar(0.95);

    add(buildRockingChair(M));
    items.rockingChair.group.position.set(-1.35, 0, 1.05);
    items.rockingChair.group.rotation.y = 0.95;
    items.rockingChair.group.scale.setScalar(0.94);

    add(buildSideTable(M));
    items.sideTable.group.position.set(2.3, 0, -0.82);
    items.sideTable.group.rotation.y = 0.3;

    const screen = add(buildScreen(M));
    /* 屏风立在琴凳右前、茶几左侧的空地上，默认展开。
       位置往画面中间收了一点，不会被左侧陈设栏整块挡住 */
    screen.group.position.set(-1.25, 0, 0.15);
    screen.group.rotation.y = 0.9;
    screen.group.scale.setScalar(0.6);

    add(buildSconce(M));
    add(buildWindChime(M));
    const toyTrain = add(buildToyTrain(M));
    /* 轨道铺在茶几右侧、边几前的毯子上，默认视角里完整可见 */
    toyTrain.group.position.set(1.36, 0, -0.85);

    return items;
  };
})();
