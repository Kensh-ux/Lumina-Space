/* 窗畔 · 街景生活层：街边小物、行人、车流、水洼与飞鸟 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;
  const SK = WP.SK;
  const Z = -16.4;          // 对街立面
  const BASE = SK.BASE;     // 对街人行道面
  const ROAD = SK.ROAD_Y;   // 路面

  let ctx, R, M, T;
  let LM = null;

  /* ———————————————————— 小工具 ———————————————————— */
  function snowBox(parent, w, h, d, x, y, z) {
    const m = SK.box(parent, w, h, d, ctx.snowMat, x, y, z, false, false);
    ctx.addSnow(m);
    return m;
  }

  function rod(parent, a, b, r, mat, seg) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 5), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function group(x, y, z, ry) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (ry) g.rotation.y = ry;
    R.add(g);
    return g;
  }

  function mat(color, roughness, metalness, extra) {
    const m = new THREE.MeshStandardMaterial({
      color, roughness: roughness === undefined ? 0.8 : roughness,
      metalness: metalness === undefined ? 0.02 : metalness
    });
    if (extra) Object.assign(m, extra);
    return m;
  }

  function buildMaterials() {
    LM = {
      skin: mat(0xc3a086, 0.82),
      hair: mat(0x2c2621, 0.95),
      dark: mat(0x24282a, 0.55, 0.35),
      blackIron: mat(0x1d2122, 0.45, 0.6),
      teal: mat(0x36514b, 0.52, 0.3),
      rust: mat(0x8a4a36, 0.62, 0.16),
      creamPaint: mat(0xd8c9ab, 0.6, 0.03),
      woodSeat: mat(0x6e4c31, 0.78, 0.02),
      boxGreen: mat(0x2f4539, 0.55, 0.2),
      paper: mat(0xd9cdb4, 0.95),
      tyre: mat(0x141618, 0.85, 0.1),
      chrome: mat(0xb9b3a2, 0.28, 0.85),
      glassDark: mat(0x0f181c, 0.12, 0.6),
      water: new THREE.MeshStandardMaterial({
        color: 0x0c1418, roughness: 0.05, metalness: 0.82,
        transparent: true, opacity: 0.62, depthWrite: false
      }),
      ripple: new THREE.MeshBasicMaterial({
        color: 0xbcd6dc, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        toneMapped: false
      })
    };
  }

  /* ———————————————————— 咖啡店外的小圆桌 ———————————————————— */
  function bistroChair(g, x, z, ry) {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    c.rotation.y = ry;
    g.add(c);
    const seat = SK.box(c, 0.34, 0.035, 0.34, LM.teal, 0, 0.43, 0);
    seat.castShadow = true;
    const legGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.43, 5);
    [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].forEach((p) => {
      const leg = new THREE.Mesh(legGeo, LM.blackIron);
      leg.position.set(p[0], 0.215, p[1]);
      leg.rotation.z = p[0] * 0.16;
      leg.rotation.x = -p[1] * 0.16;
      leg.castShadow = true;
      c.add(leg);
    });
    // 靠背
    const back = new THREE.Group();
    back.position.set(0, 0.45, -0.155);
    back.rotation.x = -0.12;
    c.add(back);
    SK.box(back, 0.34, 0.03, 0.025, LM.teal, 0, 0.34, 0);
    SK.box(back, 0.34, 0.03, 0.025, LM.teal, 0, 0.2, 0);
    rod(back, new THREE.Vector3(-0.14, 0, 0), new THREE.Vector3(-0.13, 0.36, 0), 0.012, LM.blackIron);
    rod(back, new THREE.Vector3(0.14, 0, 0), new THREE.Vector3(0.13, 0.36, 0), 0.012, LM.blackIron);
    snowBox(c, 0.3, 0.018, 0.3, 0, 0.452, 0);
    return c;
  }

  function makeBistro() {
    const g = group(-5.5, BASE, -15.42);
    // 桌面与立柱
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.035, 26), LM.creamPaint);
    top.position.y = 0.7;
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.012, 5, 26), LM.blackIron);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.703;
    g.add(rim);
    rod(g, new THREE.Vector3(0, 0.045, 0), new THREE.Vector3(0, 0.69, 0), 0.028, LM.blackIron, 8);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.035, 18), LM.blackIron);
    foot.position.y = 0.018;
    foot.castShadow = true;
    g.add(foot);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.009, 4, 18), LM.blackIron);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.13;
    g.add(ring);
    // 杯碟、书、小花瓶
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.008, 14), LM.paper);
    saucer.position.set(0.13, 0.723, 0.05);
    g.add(saucer);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.05, 12), LM.paper);
    cup.position.set(0.13, 0.75, 0.05);
    cup.castShadow = true;
    g.add(cup);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.031, 12), mat(0x3a2418, 0.4));
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.set(0.13, 0.776, 0.05);
    g.add(coffee);
    const book = SK.box(g, 0.17, 0.018, 0.12, LM.rust, -0.13, 0.727, -0.03);
    book.rotation.y = 0.35;
    SK.box(g, 0.15, 0.012, 0.1, LM.paper, -0.13, 0.741, -0.03).rotation.y = 0.35;
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.09, 10), mat(0x6a7b70, 0.4, 0.1));
    vase.position.set(-0.06, 0.756, 0.14);
    g.add(vase);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 4), mat(0x4d623f, 0.9));
    stem.position.set(-0.06, 0.855, 0.14);
    g.add(stem);
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.032, 0), mat(0xd9a7a0, 0.7));
    head.position.set(-0.06, 0.915, 0.14);
    g.add(head);
    snowBox(g, 0.52, 0.012, 0.52, 0, 0.728, 0);

    bistroChair(g, -0.54, -0.06, Math.PI / 2 + 0.12);
    bistroChair(g, 0.54, 0.06, -Math.PI / 2 - 0.1);
    // 桌下小盆栽
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.16, 10), LM.rust);
    pot.position.set(0.4, 0.08, 0.42);
    pot.castShadow = true;
    g.add(pot);
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), mat(0x4d6544, 0.9));
    bush.position.set(0.4, 0.25, 0.42);
    bush.castShadow = true;
    g.add(bush);
    snowBox(g, 0.13, 0.012, 0.13, 0.4, 0.33, 0.42);
  }

  /* ———————————————————— 黑板与花桶 ———————————————————— */
  function makeChalkboard(x, z, ry, tex, w, h) {
    const g = group(x, BASE, z, ry);
    const board = SK.box(g, w, h, 0.035, M.woodDark, 0, 0.62, 0);
    board.rotation.x = -0.11;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.92, metalness: 0
    }));
    face.position.set(0, 0.62, 0.021);
    face.rotation.x = -0.11;
    g.add(face);
    // A 字腿
    [-1, 1].forEach((s) => {
      rod(g, new THREE.Vector3(s * (w / 2 - 0.04), 0.08, 0.1), new THREE.Vector3(s * (w / 2 - 0.04), h + 0.12, 0), 0.018, M.woodDark);
      rod(g, new THREE.Vector3(s * (w / 2 - 0.04), 0.08, -0.1), new THREE.Vector3(s * (w / 2 - 0.04), h * 0.55, -0.04), 0.018, M.woodDark);
    });
    SK.box(g, w + 0.04, 0.035, 0.12, M.woodDark, 0, h * 0.55 + 0.62, -0.01);
    snowBox(g, w + 0.02, 0.015, 0.06, 0, h * 0.55 + 0.645, -0.05);
    return g;
  }

  function makeFlowerBuckets() {
    const specs = [
      { x: -1.16, z: -15.08, h: 0.3, tone: 0x8b7a5e, flowers: [0xd98f86, 0xe7c3ac, 0xd6a0ae] },
      { x: -0.78, z: -14.98, h: 0.26, tone: 0x7b654a, flowers: [0xe6d3ae, 0xd8a45e, 0xc4895f] },
      { x: -0.4, z: -15.1, h: 0.32, tone: 0x6c7a6c, flowers: [0xa9b48f, 0xded6bd, 0xb57982] }
    ];
    const rng = U.mulberry32(311);
    specs.forEach((s, si) => {
      const g = group(s.x, BASE, s.z, rng() * 3);
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, s.h, 12, 1, true), mat(s.tone, 0.6, 0.4, { side: THREE.DoubleSide }));
      bucket.position.y = s.h / 2;
      bucket.castShadow = true;
      g.add(bucket);
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), mat(0x3a342a, 0.9));
      bottom.rotation.x = -Math.PI / 2;
      bottom.position.y = 0.005;
      g.add(bottom);
      for (let i = 0; i < 9; i++) {
        const a = rng() * Math.PI * 2;
        const spread = 0.03 + rng() * 0.11;
        const topY = s.h + 0.1 + rng() * 0.22;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, topY - s.h * 0.6, 4), mat(0x506441, 0.9));
        stem.position.set(Math.cos(a) * spread * 0.5, (topY + s.h * 0.6) / 2, Math.sin(a) * spread * 0.5);
        stem.rotation.z = Math.cos(a) * spread * 0.8;
        stem.rotation.x = -Math.sin(a) * spread * 0.8;
        g.add(stem);
        const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.032 + rng() * 0.018, 0), mat(s.flowers[i % s.flowers.length], 0.72));
        head.position.set(Math.cos(a) * spread, topY, Math.sin(a) * spread);
        head.castShadow = true;
        g.add(head);
        if (rng() > 0.5) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), mat(0x516640, 0.9, 0.02, { side: THREE.DoubleSide }));
          leaf.position.set(Math.cos(a) * spread * 1.2, topY - 0.12, Math.sin(a) * spread * 1.2);
          leaf.rotation.set(rng() * 2, rng() * 3, rng() * 2);
          g.add(leaf);
        }
      }
      if (si === 0) {
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.2, 12, 1, true), mat(0xcbbfa3, 0.9, 0, { side: THREE.DoubleSide }));
        wrap.position.y = s.h * 0.55;
        g.add(wrap);
      }
    });
    // 门口水壶
    const can = group(0.45, BASE, -15.3, 0.4);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.24, 12), mat(0x5f6f64, 0.55, 0.35));
    body.position.y = 0.15;
    body.castShadow = true;
    can.add(body);
    rod(can, new THREE.Vector3(0.08, 0.2, 0), new THREE.Vector3(0.3, 0.34, 0), 0.016, mat(0x5f6f64, 0.55, 0.35), 6);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 5, 12, Math.PI), mat(0x5f6f64, 0.55, 0.35));
    handle.position.set(-0.06, 0.28, 0);
    handle.rotation.z = Math.PI / 2;
    can.add(handle);
    snowBox(can, 0.18, 0.015, 0.18, 0, 0.275, 0);
  }

  /* ———————————————————— 旧书店门前的自行车 ———————————————————— */
  function makeBicycle() {
    const g = group(4.85, BASE, -15.9, -0.12);
    const wheelGeo = new THREE.TorusGeometry(0.33, 0.022, 6, 26);
    const tireMat = mat(0x1b1d1e, 0.75, 0.1);
    const rimMat = mat(0x8f8a7c, 0.35, 0.7);
    [-0.52, 0.52].forEach((wx) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, 0.34, 0);
      wheel.castShadow = true;
      g.add(wheel);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.007, 4, 26), rimMat);
      rim.position.copy(wheel.position);
      g.add(rim);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 8), rimMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.copy(wheel.position);
      g.add(hub);
      for (let i = 0; i < 4; i++) {
        rod(g, wheel.position.clone(), wheel.position.clone().add(new THREE.Vector3(Math.cos(i * Math.PI / 4) * 0.29, Math.sin(i * Math.PI / 4) * 0.29, 0)), 0.0035, rimMat, 3);
      }
    });
    const frame = [
      [new THREE.Vector3(-0.52, 0.34, 0), new THREE.Vector3(-0.1, 0.72, 0)],
      [new THREE.Vector3(-0.1, 0.72, 0), new THREE.Vector3(0.42, 0.72, 0)],
      [new THREE.Vector3(0.42, 0.72, 0), new THREE.Vector3(0.52, 0.34, 0)],
      [new THREE.Vector3(-0.1, 0.72, 0), new THREE.Vector3(0.02, 0.34, 0)],
      [new THREE.Vector3(0.02, 0.34, 0), new THREE.Vector3(0.52, 0.34, 0)],
      [new THREE.Vector3(-0.52, 0.34, 0), new THREE.Vector3(0.02, 0.34, 0)]
    ];
    frame.forEach((f) => rod(g, f[0], f[1], 0.017, LM.teal, 6));
    // 座杆与鞍座
    rod(g, new THREE.Vector3(-0.14, 0.72, 0), new THREE.Vector3(-0.17, 0.93, 0), 0.014, rimMat, 5);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.13), mat(0x4a342a, 0.7, 0.05));
    saddle.position.set(-0.19, 0.95, 0);
    saddle.castShadow = true;
    g.add(saddle);
    // 车把
    rod(g, new THREE.Vector3(0.42, 0.72, 0), new THREE.Vector3(0.42, 0.95, 0), 0.014, rimMat, 5);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.42, 6), rimMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0.42, 0.96, 0);
    g.add(bar);
    [-1, 1].forEach((s) => {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), mat(0x3c2f26, 0.8));
      grip.rotation.x = Math.PI / 2;
      grip.position.set(0.42, 0.96, s * 0.2);
      g.add(grip);
    });
    // 前车篓与两本书
    const basket = SK.box(g, 0.3, 0.22, 0.3, mat(0x6b5b44, 0.85, 0.06), 0.55, 0.78, 0);
    basket.rotation.z = 0.02;
    for (let i = 0; i < 2; i++) {
      const bk = SK.box(g, 0.16 + i * 0.02, 0.035, 0.2, i ? LM.rust : LM.paper, 0.55, 0.9 + i * 0.04, 0.02);
      bk.rotation.z = 0.12 - i * 0.2;
    }
    // 撑脚
    rod(g, new THREE.Vector3(0.02, 0.34, 0), new THREE.Vector3(-0.06, 0.02, 0.16), 0.009, rimMat, 4);
    g.rotation.z = 0.11;
    g.position.z = -15.92;
    snowBox(g, 0.26, 0.02, 0.14, -0.19, 0.975, 0);
    return g;
  }

  /* ———————————————————— 街心立钟 ———————————————————— */
  let clockHands = null;
  function makeClock() {
    const g = group(1.85, BASE, -14.85, 0.04);
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.09, 8), LM.blackIron);
    base1.position.y = 0.045;
    base1.castShadow = true;
    g.add(base1);
    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.12, 8), LM.blackIron);
    base2.position.y = 0.14;
    g.add(base2);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.12, 2.15, 10), LM.blackIron);
    column.position.y = 1.27;
    column.castShadow = true;
    g.add(column);
    for (let i = 0; i < 8; i++) {
      const flute = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.9, 0.02), LM.blackIron);
      const a = (i / 8) * Math.PI * 2;
      flute.position.set(Math.cos(a) * 0.09, 1.25, Math.sin(a) * 0.09);
      flute.rotation.y = -a;
      g.add(flute);
    }
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.12, 12), M.brass);
    collar.position.y = 2.37;
    g.add(collar);
    // 钟头
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 22), LM.blackIron);
    head.rotation.x = Math.PI / 2;
    head.position.y = 2.72;
    head.castShadow = true;
    g.add(head);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 8, 28), M.brass);
    rim.position.set(0, 2.72, 0.115);
    g.add(rim);
    const faceMat = new THREE.MeshStandardMaterial({
      map: T.clockFace, emissive: 0xffd8a2, emissiveMap: T.clockFace,
      emissiveIntensity: 0.35, roughness: 0.62, metalness: 0.02
    });
    ctx.addGlow(faceMat, 0.5, 'shop');
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.335, 32), faceMat);
    face.position.set(0, 2.72, 0.118);
    g.add(face);
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.335, 24), mat(0x1e2422, 0.5, 0.4));
    back.rotation.y = Math.PI;
    back.position.set(0, 2.72, -0.115);
    g.add(back);
    // 指针
    const hands = new THREE.Group();
    hands.position.set(0, 2.72, 0.14);
    hands.userData.noMerge = true;
    g.add(hands);
    const hour = new THREE.Group();
    const hourHand = SK.box(hour, 0.014, 0.15, 0.008, mat(0x24211c, 0.5, 0.3), 0, 0.075, 0, false, false);
    hour.add(hourHand);
    const min = new THREE.Group();
    SK.box(min, 0.011, 0.23, 0.008, mat(0x24211c, 0.5, 0.3), 0, 0.115, 0, false, false);
    hands.add(hour);
    hands.add(min);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.brass);
    pin.position.z = 0.012;
    hands.add(pin);
    clockHands = { hour, min };
    // 顶盖与尖顶
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.26, 16), LM.blackIron);
    cap.position.y = 3.05;
    cap.castShadow = true;
    g.add(cap);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.brass);
    finial.position.y = 3.21;
    g.add(finial);
    snowBox(g, 0.42, 0.03, 0.42, 0, 3.12, 0);
    snowBox(g, 0.34, 0.02, 0.34, 0.02, 0.2, 0);
    const glow = SK.glow(g, ctx.glowTex, 0xffc27f, 0, 0.95, 0, 2.72, 0.18);
    ctx.addLamp({ glow, glowBase: 0.3 });
  }

  /* ———————————————————— 邮筒 ———————————————————— */
  function makeMailbox() {
    const g = group(-6.5, BASE, -14.92, 0.32);
    const body = new THREE.Mesh(U.roundedBoxGeometry(0.36, 0.58, 0.28, 0.05, 0.012), LM.boxGreen);
    body.position.y = 0.62;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 16, 1, false, Math.PI / 2, Math.PI), LM.boxGreen);
    top.rotation.x = Math.PI / 2;
    top.position.set(0, 0.91, 0);
    top.castShadow = true;
    g.add(top);
    const slot = SK.box(g, 0.22, 0.035, 0.02, mat(0x101514, 0.9), 0, 0.82, 0.145, false, false);
    slot.rotation.x = 0.06;
    const plate = SK.box(g, 0.14, 0.05, 0.012, M.brass, 0, 0.66, 0.148, false, false);
    const legs = new THREE.CylinderGeometry(0.022, 0.022, 0.34, 6);
    [-0.12, 0.12].forEach((x) => {
      const leg = new THREE.Mesh(legs, LM.blackIron);
      leg.position.set(x, 0.17, 0);
      g.add(leg);
    });
    const foot = SK.box(g, 0.3, 0.025, 0.22, LM.blackIron, 0, 0.012, 0);
    snowBox(g, 0.34, 0.025, 0.26, 0, 0.93, 0);
    snowBox(g, 0.36, 0.02, 0.28, 0, 0.92, 0);
  }

  /* ———————————————————— 长椅 ———————————————————— */
  function makeBench() {
    const g = group(4.4, -0.142, -13.15, 0.02);
    const slatGeo = new THREE.BoxGeometry(1.6, 0.045, 0.1);
    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(slatGeo, LM.woodSeat);
      slat.position.set(0, 0.46, -0.16 + i * 0.11);
      slat.castShadow = true;
      slat.receiveShadow = true;
      g.add(slat);
    }
    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.085, 0.035), LM.woodSeat);
      slat.position.set(0, 0.7 + i * 0.14, -0.27 - i * 0.012);
      slat.rotation.x = -0.1;
      slat.castShadow = true;
      g.add(slat);
    }
    [-0.7, 0.7].forEach((x) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), LM.blackIron);
      arm.position.set(x, 0.62, -0.05);
      g.add(arm);
      const legF = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.06), LM.blackIron);
      legF.position.set(x, 0.23, 0.18);
      legF.rotation.x = 0.08;
      g.add(legF);
      const legB = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.06), LM.blackIron);
      legB.position.set(x, 0.45, -0.24);
      legB.rotation.x = -0.08;
      g.add(legB);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.52), LM.blackIron);
      foot.position.set(x, 0.015, -0.04);
      g.add(foot);
    });
    // 一张折页报纸
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshStandardMaterial({
      map: U.labelTexture('晚 风 日 报', { w: 256, h: 180, bg: '#d9cdb4', color: '#3b332a', size: 30, border: 'rgba(59,51,42,0.4)' }),
      roughness: 0.95
    }));
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = 0.28;
    paper.position.set(0.32, 0.49, 0.05);
    g.add(paper);
    snowBox(g, 1.58, 0.035, 0.42, 0, 0.5, -0.015);
    snowBox(g, 1.5, 0.02, 0.06, 0, 0.98, -0.3);
  }

  /* ———————————————————— 水洼、涟漪与湿地反光 ———————————————————— */
  const ripples = [];
  const reflections = [];
  function makePuddles() {
    const rng = U.mulberry32(2026);
    const spots = [
      [-3.0, -8.3, 1.5, 0.7, ROAD],
      [0.6, -9.5, 1.9, 0.62, ROAD],
      [3.2, -8.85, 1.2, 0.52, ROAD],
      [-1.3, -11.3, 1.6, 0.6, ROAD],
      [4.5, -11.55, 1.05, 0.46, ROAD],
      [-4.5, -14.2, 1.35, 0.5, -0.142],
      [2.7, -14.05, 1.1, 0.42, -0.142]
    ];
    spots.forEach((s, si) => {
      const geo = new THREE.CircleGeometry(1, 30);
      const pos = geo.attributes.position;
      for (let i = 1; i < pos.count; i++) {
        const a = Math.atan2(pos.getY(i), pos.getX(i));
        const k = 0.82 + Math.sin(a * 3 + si) * 0.08 + Math.sin(a * 7 + si * 2) * 0.06 + rng() * 0.05;
        pos.setXY(i, Math.cos(a) * k, Math.sin(a) * k);
      }
      geo.computeVertexNormals();
      const p = new THREE.Mesh(geo, LM.water);
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = rng() * Math.PI;
      p.scale.set(s[2], s[3], 1);
      p.position.set(s[0], s[4] + 0.006, s[1]);
      p.renderOrder = 1;
      p.name = 'puddle';
      R.add(p);
      // 涟漪
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 22), LM.ripple.clone());
        ring.rotation.x = -Math.PI / 2;
        const ox = (rng() - 0.5) * 0.9 * s[2];
        const oz = (rng() - 0.5) * 0.9 * s[3];
        ring.position.set(s[0] + ox, s[4] + 0.012, s[1] + oz);
        ring.userData = { ph: rng(), speed: 0.34 + rng() * 0.3, scale: 0.1 + rng() * 0.16 };
        ring.renderOrder = 2;
        R.add(ring);
        ripples.push(ring);
      }
    });
    // 店铺灯光在湿石板上的倒影
    const shopX = [-4.55, 0, 4.5, -2.0, 2.0];
    shopX.forEach((x, i) => {
      const tex = SK.wetStreakTexture(90 + i, true);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.6), new THREE.MeshBasicMaterial({
        map: tex, color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
      }));
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = Math.PI;
      m.position.set(x, -0.136, -14.35);
      m.renderOrder = 2;
      R.add(m);
      reflections.push({ mesh: m, kind: 'shop' });
    });
    // 冷光倒影（路灯与天空）
    [-2.92, 2.9].forEach((x, i) => {
      const tex = SK.wetStreakTexture(140 + i, false);
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.4), new THREE.MeshBasicMaterial({
        map: tex, color: 0xdfeef2, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
      }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, ROAD + 0.011, -8.5);
      m.renderOrder = 2;
      R.add(m);
      reflections.push({ mesh: m, kind: 'lamp' });
    });
  }

  /* ———————————————————— 行人 ———————————————————— */
  const people = [];
  function makePerson(o) {
    const g = new THREE.Group();
    g.position.set(o.x, o.baseY, o.z);
    g.rotation.y = o.ry || 0;
    g.userData.noMerge = true;
    R.add(g);
    const coatMat = mat(o.coat, 0.92);
    const coatDark = mat(o.coatDark || 0x3b332c, 0.95);
    const pantsMat = mat(o.pants || 0x2c2f31, 0.9);
    const shoeMat = mat(0x1b1c1e, 0.82, 0.08);

    // 大衣：收肩的躯干、微张的下摆与翻领
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.2, 0.6, 12), coatMat);
    torso.position.y = 1.065;
    torso.castShadow = true;
    torso.receiveShadow = true;
    g.add(torso);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), coatMat);
    shoulder.scale.set(1.08, 0.36, 0.68);
    shoulder.position.y = 1.34;
    shoulder.castShadow = true;
    g.add(shoulder);
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.238, 0.28, 12), coatMat);
    hem.position.y = 0.72;
    hem.castShadow = true;
    g.add(hem);
    [-1, 1].forEach((s) => {
      const lapel = U.box(0.058, 0.27, 0.012, coatDark, s * 0.065, 1.2, 0.17);
      lapel.rotation.z = -s * 0.23;
      lapel.rotation.x = -0.05;
      g.add(lapel);
    });
    for (let i = 0; i < 3; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), coatDark);
      button.position.set(0.015, 1.11 - i * 0.12, 0.185);
      g.add(button);
    }

    // 腿（保留独立枢轴用于步行）
    const legs = [];
    [-1, 1].forEach((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.078, 0.72, 0);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.043, 0.64, 7), pantsMat);
      leg.position.y = -0.32;
      leg.castShadow = true;
      pivot.add(leg);
      const shoe = new THREE.Mesh(U.roundedBoxGeometry(0.105, 0.06, 0.2, 0.025, 0.012), shoeMat);
      shoe.position.set(0, -0.69, 0.045);
      shoe.castShadow = true;
      pivot.add(shoe);
      g.add(pivot);
      legs.push(pivot);
    });

    // 手臂
    const arms = [];
    [-1, 1].forEach((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.19, 1.31, 0);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.033, 0.5, 7), coatMat);
      arm.position.y = -0.25;
      arm.castShadow = true;
      pivot.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.041, 7, 6), LM.skin);
      hand.position.y = -0.51;
      pivot.add(hand);
      pivot.rotation.z = s * 0.045;
      g.add(pivot);
      arms.push(pivot);
    });

    // 围巾、颈与头
    const scarfMat = mat(o.scarf || 0x7e3f34, 0.94);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.035, 7, 16), scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.385;
    g.add(scarf);
    const scarfTail = U.box(0.07, 0.27, 0.035, scarfMat, -0.095, 1.24, 0.12);
    scarfTail.rotation.z = 0.1;
    g.add(scarfTail);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.11, 8), LM.skin);
    neck.position.y = 1.415;
    g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 12), LM.skin);
    head.scale.set(0.94, 1.03, 0.96);
    head.position.y = 1.515;
    head.castShadow = true;
    g.add(head);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 5), LM.skin);
    nose.position.set(0, 1.505, 0.1);
    nose.rotation.x = Math.PI / 2;
    g.add(nose);
    [-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), LM.skin);
      ear.scale.set(0.55, 1, 0.62);
      ear.position.set(s * 0.1, 1.515, 0);
      g.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 5, 4), LM.dark);
      eye.position.set(s * 0.036, 1.54, 0.094);
      g.add(eye);
    });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.108, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), LM.hair);
    hair.position.y = 1.53;
    hair.scale.set(0.96, 1, 0.98);
    g.add(hair);
    if (o.hat) {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.165, 0.022, 14), mat(o.hat, 0.88));
      brim.position.y = 1.585;
      brim.castShadow = true;
      g.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.13, 14), mat(o.hat, 0.88));
      crown.position.y = 1.65;
      crown.castShadow = true;
      g.add(crown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.104, 0.106, 0.03, 14), coatDark);
      band.position.y = 1.607;
      g.add(band);
    }

    // 单肩包，给行走的人一点生活痕迹
    if (o.bag) {
      const leather = mat(o.bagColor || 0x5a3f2d, 0.86, 0.06);
      const bag = new THREE.Mesh(U.roundedBoxGeometry(0.23, 0.22, 0.09, 0.045, 0.015), leather);
      bag.position.set(0.27, 0.93, -0.015);
      bag.castShadow = true;
      g.add(bag);
      rod(g, new THREE.Vector3(0.085, 1.34, 0), new THREE.Vector3(0.28, 1.02, -0.015), 0.007, leather, 4);
    }

    // 伞
    const umb = new THREE.Group();
    umb.position.set(0.26, 0, 0.02);
    g.add(umb);
    const rodMat = mat(0x2a2724, 0.5, 0.4);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1.3, 6), rodMat);
    shaft.position.y = 1.62;
    umb.add(shaft);
    const canopyMat = mat(o.umb || 0x3c4a55, 0.8, 0.02, { side: THREE.DoubleSide });
    const canopyProfile = [
      new THREE.Vector2(0.015, 0.31),
      new THREE.Vector2(0.2, 0.285),
      new THREE.Vector2(0.43, 0.185),
      new THREE.Vector2(0.6, 0.06),
      new THREE.Vector2(0.65, 0)
    ];
    const canopy = new THREE.Mesh(new THREE.LatheGeometry(canopyProfile, 16), canopyMat);
    canopy.position.y = 2.14;
    canopy.castShadow = false;
    umb.add(canopy);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.1, 6), rodMat);
    tip.position.y = 2.5;
    umb.add(tip);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.011, 5, 10, Math.PI), rodMat);
    handle.position.set(0.058, 0.99, 0);
    handle.rotation.z = Math.PI;
    umb.add(handle);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 16;
      rod(umb,
        new THREE.Vector3(0, 2.44, 0),
        new THREE.Vector3(Math.cos(a) * 0.63, 2.16, Math.sin(a) * 0.63),
        0.0045, rodMat, 3);
    }
    umb.rotation.x = -0.09;
    umb.rotation.z = 0.06;
    umb.visible = false;

    // 行人是整体移动的，把不动的身体部分在自己的小组内合批，减少绘制调用
    U.mergeStatic(g, { exclude: legs.concat(arms, [umb]) });

    const p = {
      g, legs, arms, umb, phase: o.phase || 0, dir: o.dir || 1,
      speed: o.speed || 0.52, walk: !!o.walk, x: o.x, z: o.z,
      min: o.min === undefined ? 0.3 : o.min, baseY: o.baseY, armSwing: 0
    };
    people.push(p);
    return p;
  }
  function makePeople() {
    makePerson({
      x: -3.4, z: -13.82, baseY: -0.142, walk: true, dir: 1, speed: 0.46,
      coat: 0x705942, coatDark: 0x3c3028, pants: 0x2b2d30, scarf: 0x9b4f3c, hat: 0x39342d, umb: 0x3d4c55, bag: true, bagColor: 0x4a3324,
      phase: 0.4, min: 0.28
    });
    makePerson({
      x: 4.2, z: -14.05, baseY: -0.142, walk: true, dir: -1, speed: 0.4,
      coat: 0x4e6a5c, coatDark: 0x2c3c35, pants: 0x26282a, scarf: 0xc3a06b, hat: 0, umb: 0x6b4a44, bag: true, bagColor: 0x6d5038,
      phase: 2.1, min: 0.48
    });
    makePerson({
      x: 0.55, z: -15.48, baseY: -0.142, ry: Math.PI, walk: false,
      coat: 0x84694b, coatDark: 0x493c2e, pants: 0x2c2c2c, scarf: 0x76805c, hat: 0x4a3e33, umb: 0x7b6a58,
      phase: 0.9, min: 0.7
    });
    makePerson({
      x: 6.55, z: -13.8, baseY: -0.142, walk: true, dir: -1, speed: 0.34,
      coat: 0x5c6269, coatDark: 0x32373c, pants: 0x232527, scarf: 0x8c5142, hat: 0, umb: 0x36434a, bag: true, bagColor: 0x3c3028,
      phase: 4.2, min: 0.55
    });
  }

  /* ———————————————————— 车辆 ———————————————————— */
  const cars = [];
  function makeCar(o) {
    const g = new THREE.Group();
    g.position.set(0, ROAD, o.z);
    g.userData.noMerge = true;
    R.add(g);
    const bodyMat = mat(o.color, 0.36, 0.35);
    const body = new THREE.Mesh(U.roundedBoxGeometry(3.05, 0.56, 1.26, 0.16, 0.05), bodyMat);
    body.position.y = 0.62;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const cabin = new THREE.Mesh(U.roundedBoxGeometry(1.6, 0.5, 1.06, 0.16, 0.045), bodyMat);
    cabin.position.set(-0.18, 1.03, 0);
    cabin.castShadow = true;
    g.add(cabin);
    const winMat = LM.glassDark;
    const winL = SK.box(g, 1.34, 0.3, 1.08, winMat, -0.18, 1.06, 0, false, false);
    const winSideGeo = new THREE.BoxGeometry(1.3, 0.27, 0.02);
    [-0.545, 0.545].forEach((z) => {
      const w = new THREE.Mesh(winSideGeo, winMat);
      w.position.set(-0.18, 1.06, z);
      g.add(w);
    });
    // 车头灯
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffe6b8, toneMapped: false });
    const headGeo = new THREE.SphereGeometry(0.085, 10, 8);
    const headSprites = [];
    [-0.38, 0.38].forEach((z) => {
      const h = new THREE.Mesh(headGeo, headMat);
      h.position.set(1.52, 0.63, z);
      h.scale.z = 0.6;
      g.add(h);
      const gl = U.sprite(ctx.glowTex, 0xffd9a0, 0.55, 0.7);
      gl.position.set(1.62, 0.63, z);
      g.add(gl);
      headSprites.push(gl);
    });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0x8e241d, toneMapped: false });
    [-0.4, 0.4].forEach((z) => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.16), tailMat);
      t.position.set(-1.52, 0.68, z);
      g.add(t);
    });
    // 保险杠与镀铬
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 1.18), LM.chrome);
    bumper.position.set(1.53, 0.43, 0);
    g.add(bumper);
    const bumperR = bumper.clone();
    bumperR.position.x = -1.53;
    g.add(bumperR);
    const plate = SK.box(g, 0.02, 0.11, 0.26, mat(0xd8cdb2, 0.7), 1.56, 0.42, 0, false, false);
    // 车轮
    const wheels = [];
    [[-0.95, -0.6], [0.95, -0.6], [-0.95, 0.6], [0.95, 0.6]].forEach((p) => {
      const pivot = new THREE.Group();
      pivot.position.set(p[0], 0.31, p[1]);
      const spin = new THREE.Group();
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.17, 16), LM.tyre);
      tyre.rotation.x = Math.PI / 2;
      tyre.castShadow = true;
      spin.add(tyre);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 10), LM.chrome);
      hub.rotation.x = Math.PI / 2;
      spin.add(hub);
      pivot.add(spin);
      g.add(pivot);
      wheels.push(spin);
    });
    // 车顶积雪
    snowBox(g, 1.45, 0.035, 0.95, -0.18, 1.31, 0);
    // 车灯：灯珠与光晕负责观感，地面用一块加法光斑代替点光源
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 2.0),
      new THREE.MeshBasicMaterial({
        map: ctx.glowTex, color: 0xffc27a, transparent: true, opacity: 0.1,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(3.5, 0.018, 0);
    g.add(pool);
    const car = {
      g, wheels, headSprites, pool, dir: o.dir, z: o.z,
      period: o.period, offset: o.offset, speed: o.speed || 8.5, travel: 82 / (o.speed || 8.5)
    };
    g.visible = false;
    g.rotation.y = o.dir > 0 ? 0 : Math.PI;
    cars.push(car);
    return car;
  }

  function makeCars() {
    makeCar({ color: 0x34474d, z: -8.75, dir: -1, period: 29, offset: 3.4, speed: 8.2 });
    makeCar({ color: 0x6b3432, z: -11.25, dir: 1, period: 37, offset: 17.5, speed: 9.2 });
  }

  /* ———————————————————— 鸟群 ———————————————————— */
  let flock = null;
  function makeBirds() {
    flock = new THREE.Group();
    flock.position.set(-14, 4.8, -15.2);
    flock.userData.noMerge = true;
    R.add(flock);
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x272b2b, side: THREE.DoubleSide, toneMapped: true });
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      0.07, 0, 0, -0.14, 0, 0.02, 0.02, 0.015, 0.3
    ], 3));
    wingGeo.computeVertexNormals();
    const bodyGeo = new THREE.SphereGeometry(0.055, 6, 5);
    const birds = [];
    const offs = [
      [0, 0, 0], [-0.42, 0.08, 0.35], [-0.4, 0.06, -0.34],
      [-0.84, 0.15, 0.64], [-0.82, 0.13, -0.62], [-1.3, 0.2, 0.9]
    ];
    offs.forEach((o, i) => {
      const b = new THREE.Group();
      b.position.set(o[0], o[1], o[2]);
      b.scale.setScalar(0.9 + (i % 3) * 0.08);
      const body = new THREE.Mesh(bodyGeo, birdMat);
      body.scale.set(1.7, 0.75, 0.8);
      b.add(body);
      const wl = new THREE.Group();
      const wlMesh = new THREE.Mesh(wingGeo, birdMat);
      wl.add(wlMesh);
      b.add(wl);
      const wr = new THREE.Group();
      const wrMesh = new THREE.Mesh(wingGeo, birdMat);
      wrMesh.scale.z = -1;
      wr.add(wrMesh);
      b.add(wr);
      flock.add(b);
      birds.push({ g: b, wl, wr, seed: i * 1.7 });
    });
    flock.visible = false;
    flock.userData = { birds };
    flock.userData.span = 30;
  }

  /* ———————————————————— 萤火虫 ———————————————————— */
  const fireflies = [];
  function makeFireflies() {
    const rng = U.mulberry32(812);
    const spots = [
      [-1.0, 1.4, -15.3], [-0.4, 2.0, -15.0], [0.5, 1.2, -15.2], [1.2, 2.2, -15.4],
      [-6.0, 2.4, -13.4], [-5.1, 1.8, -14.2], [-3.6, 2.2, -15.2], [2.2, 1.7, -15.3],
      [3.0, 2.4, -18.0], [-2.0, 3.2, -16.0], [-7.0, 2.0, -15.0], [5.2, 1.6, -15.1]
    ];
    spots.forEach((s, i) => {
      const sp = U.sprite(ctx.glowTex, 0xd9ee9a, 0, 0.09 + (i % 3) * 0.02);
      sp.position.set(s[0], s[1], s[2]);
      sp.userData = { base: sp.position.clone(), seed: i * 1.37, amp: 0.25 + rng() * 0.5 };
      R.add(sp);
      fireflies.push(sp);
    });
  }

  /* ———————————————————— 落叶 ———————————————————— */
  const leafClusters = [];
  /* 每帧复用，避免 28 片叶子反复分配矩阵与向量 */
  const leafM4 = new THREE.Matrix4();
  const leafQ = new THREE.Quaternion();
  const leafE = new THREE.Euler();
  const leafP = new THREE.Vector3();
  const leafS = new THREE.Vector3();
  function makeLeaves() {
    const tex = T.leaf('autumn');
    const geo = new THREE.PlaneGeometry(0.11, 0.085);
    const mats = [
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.32, side: THREE.DoubleSide, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ map: T.leaf('green'), transparent: true, alphaTest: 0.32, side: THREE.DoubleSide, roughness: 0.9 })
    ];
    const specs = [
      { x: 3.95, y: 0, z: -6.55, count: 16, mat: mats[0], spreadX: 2.0, spreadZ: 1.6, top: 4.6 },
      { x: -5.7, y: 0, z: -12.6, count: 12, mat: mats[1], spreadX: 2.0, spreadZ: 1.4, top: 4.2 }
    ];
    const rng = U.mulberry32(4040);
    specs.forEach((s, ci) => {
      const inst = new THREE.InstancedMesh(geo, s.mat, s.count);
      inst.castShadow = false;
      inst.receiveShadow = false;
      inst.frustumCulled = false;
      R.add(inst);
      const arr = [];
      for (let i = 0; i < s.count; i++) {
        arr.push({
          x: s.x + (rng() - 0.5) * s.spreadX,
          z: s.z + (rng() - 0.5) * s.spreadZ,
          ph: rng(), speed: 0.055 + rng() * 0.045,
          sway: rng() * Math.PI * 2,
          sx: (rng() - 0.5) * 0.3,
          rot: rng() * 6
        });
      }
      leafClusters.push({ inst, leaves: arr, top: s.top, spec: s });
    });
  }

  /* ———————————————————— 蒸汽与呼出的白气 ———————————————————— */
  const steams = [];
  function makeSteam() {
    const rng = U.mulberry32(555);
    const addPlume = (x, y, z, n, scale, kind) => {
      for (let i = 0; i < n; i++) {
        const m = new THREE.SpriteMaterial({
          map: ctx.glowTex, color: 0xdfe4e1, transparent: true, opacity: 0,
          depthWrite: false, blending: THREE.NormalBlending
        });
        const s = new THREE.Sprite(m);
        s.position.set(x + (rng() - 0.5) * 0.14, y, z + (rng() - 0.5) * 0.1);
        s.scale.setScalar(scale * (0.6 + rng() * 0.7));
        s.userData = { base: new THREE.Vector3(x, y, z), seed: rng(), rise: 2.4 + rng() * 1.6, kind };
        R.add(s);
        steams.push(s);
      }
    };
    addPlume(-5.9, BASE + 5.9, -18.15, 7, 0.55, 'chimney');
    addPlume(-3.9, BASE + 0.1, -14.7, 5, 0.26, 'vent');
  }

  /* ———————————————————— 街牌 ———————————————————— */
  function makeStreetSign() {
    const lamp = group(-2.92, 0, -7.12, 0);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.26), new THREE.MeshStandardMaterial({
      map: T.signStreet, roughness: 0.65, metalness: 0.05
    }));
    plate.position.set(0, 2.52, 0.14);
    lamp.add(plate);
    const back = SK.box(lamp, 0.92, 0.28, 0.03, LM.blackIron, 0, 2.52, 0.12, true, true);
    const bracket = SK.box(lamp, 0.03, 0.03, 0.12, LM.blackIron, -0.34, 2.63, 0.1, false, false);
    const bracket2 = SK.box(lamp, 0.03, 0.03, 0.12, LM.blackIron, 0.34, 2.4, 0.1, false, false);
  }

  /* ———————————————————— 每帧更新 ———————————————————— */
  function updateAll(dt, t, st) {
    // 立钟走时
    if (clockHands) {
      const d = new Date();
      const sec = d.getSeconds() + d.getMilliseconds() / 1000;
      const minA = ((d.getMinutes() + sec / 60) / 60) * Math.PI * 2;
      const hrA = (((d.getHours() % 12) + d.getMinutes() / 60) / 12) * Math.PI * 2;
      clockHands.min.rotation.z = -minA;
      clockHands.hour.rotation.z = -hrA;
    }

    // 行人
    const wetWeather = st.rain > 0.2 || st.snow > 0.25;
    people.forEach((p, i) => {
      const show = st.people >= p.min;
      p.g.visible = show;
      if (!show) return;
      if (p.walk) {
        p.x += p.dir * p.speed * dt;
        if (p.x > 6.9) { p.x = 6.9; p.dir = -1; }
        if (p.x < -6.9) { p.x = -6.9; p.dir = 1; }
        p.g.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        p.phase += dt * (2.6 + p.speed * 3.6);
        const sw = Math.sin(p.phase);
        p.legs[0].rotation.x = sw * 0.44;
        p.legs[1].rotation.x = -sw * 0.44;
        p.arms[0].rotation.x = -sw * 0.3;
        p.arms[1].rotation.x = sw * 0.12 - 0.12;
        p.g.position.y = p.baseY + Math.abs(Math.sin(p.phase)) * 0.018;
        p.g.position.x = p.x;
      } else {
        const breathe = Math.sin(t * 1.1 + i) * 0.01;
        p.g.position.y = p.baseY + breathe;
      }
      p.umb.visible = wetWeather;
      if (wetWeather) {
        p.umb.rotation.z = 0.06 + Math.sin(t * 0.7 + i * 2) * 0.02 + Math.sin(p.phase || 0) * 0.02;
      }
    });

    // 车辆
    cars.forEach((c) => {
      const ph = (t + c.offset) % c.period;
      const driving = ph < c.travel;
      c.g.visible = driving;
      if (!driving) return;
      const progress = ph / c.travel;
      const x = c.dir > 0 ? -42 + progress * 84 : 42 - progress * 84;
      c.g.position.x = x;
      c.g.position.y = ROAD + Math.sin(ph * 9) * 0.006;
      c.wheels.forEach((w) => { w.rotation.z -= (c.dir * (c.speed || 8.5) * dt) / 0.3; });
      c.headSprites.forEach((s) => { s.material.opacity = 0.22 + st.lamp * 0.6; });
      c.pool.material.opacity = 0.035 + st.lamp * 0.15;
    });

    // 鸟群
    if (flock) {
      const cycle = 34;
      const ph = (t * 1.6) % cycle;
      const active = st.birds > 0.35;
      flock.visible = active;
      if (active) {
        flock.position.x = -15 + ph;
        flock.position.y = 4.75 + Math.sin(t * 0.5) * 0.25;
        flock.position.z = -15.2 + Math.sin(t * 0.23) * 0.5;
        flock.userData.birds.forEach((b, i) => {
          const flap = Math.sin(t * 8.5 + b.seed) * 0.5 + 0.18;
          b.wl.rotation.x = flap;
          b.wr.rotation.x = -flap;
          b.g.position.y = Math.sin(t * 1.7 + b.seed) * 0.06;
        });
      }
    }

    // 萤火虫
    const firefliesOn = st.fireflies > 0.05;
    fireflies.forEach((f, i) => {
      f.visible = firefliesOn;
      if (!firefliesOn) return;
      const u = f.userData;
      f.position.x = u.base.x + Math.sin(t * 0.55 + u.seed) * u.amp;
      f.position.y = u.base.y + Math.sin(t * 0.72 + u.seed * 2) * u.amp * 0.6;
      f.position.z = u.base.z + Math.cos(t * 0.41 + u.seed) * u.amp * 0.5;
      const flick = 0.35 + 0.35 * Math.sin(t * 2.1 + u.seed * 3) + 0.2 * Math.sin(t * 5.3 + u.seed);
      f.material.opacity = Math.max(0, flick) * 0.55 * st.fireflies;
    });

    // 水洼与反光
    ripples.forEach((r) => {
      const u = r.userData;
      const k = (t * u.speed + u.ph) % 1;
      const s = u.scale * (0.3 + k * 3.2);
      r.scale.set(s, s, 1);
      r.material.opacity = (1 - k) * (1 - k) * 0.34 * (0.25 + st.rain * 0.9);
    });
    reflections.forEach((r) => {
      if (r.kind === 'shop') {
        r.mesh.material.opacity = st.wet * (0.16 + st.shop * 0.34);
      } else {
        r.mesh.material.opacity = st.wet * (0.12 + st.lamp * 0.3);
      }
    });

    // 落叶
    const leavesOn = st.snow < 0.65;
    leafClusters.forEach((c) => {
      c.inst.visible = leavesOn;
      if (!leavesOn) return;
      c.leaves.forEach((l, i) => {
        const k = (t * l.speed + l.ph) % 1;
        const y = c.top * (1 - k);
        leafP.set(
          l.x + Math.sin(t * 0.8 + l.sway) * 0.22 * k,
          y + 0.05,
          l.z + l.sx * k
        );
        leafE.set(t * 1.6 + l.rot, t * 0.9 + l.rot * 2, Math.sin(t * 2 + l.sway) * 0.8);
        leafQ.setFromEuler(leafE);
        const s = 0.8 + l.ph * 0.5;
        leafS.set(s, s, s);
        leafM4.compose(leafP, leafQ, leafS);
        c.inst.setMatrixAt(i, leafM4);
      });
      c.inst.instanceMatrix.needsUpdate = true;
    });

    // 蒸汽
    const cold = U.clamp(st.snow * 1.1 + st.rain * 0.5, 0, 1);
    steams.forEach((s) => {
      const u = s.userData;
      const k = (t * 0.11 + u.seed) % 1;
      s.position.y = u.base.y + u.rise * k;
      s.position.x = u.base.x + Math.sin(t * 0.4 + u.seed * 5) * 0.22 * k;
      s.material.opacity = Math.max(0, (1 - k) * (k < 0.08 ? k / 0.08 : 1)) * 0.1 * (0.25 + cold);
      const sc = (u.kind === 'chimney' ? 0.5 : 0.26) * (0.7 + k * 1.8);
      s.scale.set(sc, sc, 1);
    });
  }

  /* ———————————————————— 主构建 ———————————————————— */
  WP.StreetLife = {
    build(c) {
      ctx = c;
      R = c.root;
      M = c.mats;
      T = Object.assign({}, c.tex, {
        leaf: WP.Textures.leaf
      });
      buildMaterials();

      makeBistro();
      makeChalkboard(-3.85, -15.28, 0.3, T.chalkCafe, 0.55, 0.82);
      makeChalkboard(0.72, -15.04, -0.26, T.chalkFlower, 0.52, 0.8);
      makeChalkboard(6.28, -15.16, 0.18, T.chalkBook, 0.58, 0.84);
      makeFlowerBuckets();
      makeBicycle();
      makeClock();
      makeMailbox();
      makeBench();
      makePuddles();
      makePeople();
      makeCars();
      makeBirds();
      makeFireflies();
      makeLeaves();
      makeSteam();
      makeStreetSign();

      ctx.addUpdate(updateAll);
    }
  };
})();
