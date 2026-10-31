/* 窗畔 · 家具与陈设：全部由几何体与程序化贴图搭成 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;
  const T = WP.Textures;

  function ceramicTexture(seed, base) {
    const s = 256;
    const c = U.makeCanvas(s, s);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(seed || 7);
    ctx.fillStyle = base || '#d9cbb4';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1800; i++) {
      const v = 110 + rng() * 80;
      ctx.fillStyle = 'rgba(' + v + ',' + (v - 8) + ',' + (v - 20) + ',' + (0.05 + rng() * 0.15) + ')';
      const r = 0.4 + rng() * 1.6;
      ctx.beginPath();
      ctx.arc(rng() * s, rng() * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createLinearGradient(0, 0, s, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    return U.canvasTexture(c, { repeat: [1, 1], aniso: 4 });
  }

  function catFurTexture() {
    const s = 256;
    const c = U.makeCanvas(s, s);
    const ctx = c.getContext('2d');
    const rng = U.mulberry32(19);
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#b87542');
    g.addColorStop(0.55, '#a56237');
    g.addColorStop(1, '#7e4628');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // 姜黄虎斑
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = 'rgba(86,48,27,' + (0.22 + rng() * 0.2) + ')';
      ctx.lineWidth = 7 + rng() * 8;
      const x = rng() * s;
      ctx.beginPath();
      for (let y = 0; y < s; y += 8) {
        ctx.lineTo(x + Math.sin(y * 0.05 + i) * 7, y);
      }
      ctx.stroke();
    }
    // 绒毛
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = rng() > 0.5 ? 'rgba(255,214,170,0.10)' : 'rgba(66,34,18,0.10)';
      ctx.fillRect(rng() * s, rng() * s, 1, 2 + rng() * 3);
    }
    return U.canvasTexture(c, { clamp: false, repeat: [2, 1], aniso: 4 });
  }

  WP.buildMaterials = function () {
    if (WP.MATS) return WP.MATS;
    const wallTex = T.wall(11);
    const floorMap = T.floor();
    const walnutMap = T.wood({ base: '#5a3822', light: '#8d5c37', dark: '#2d1a0d', seed: 21, knots: 2 });
    const oakMap = T.wood({ base: '#8a623c', light: '#bf9163', dark: '#54371d', seed: 34, knots: 1 });
    const darkWoodMap = T.wood({ base: '#3c2618', light: '#65412a', dark: '#1d110a', seed: 9, knots: 1 });
    const clothMap = T.cloth(4);
    const linenMap = T.linen(5);
    const rugMap = T.rug();
    const paperMap = T.paper({ staff: true, seed: 14 });
    const bookMap = T.paper({ seed: 20 });

    const M = {};
    /* 墙面不再拿彩色贴图充当凹凸：细颗粒在斜视时会抖成摩尔纹，交给粗糙度即可 */
    M.wall = new THREE.MeshLambertMaterial({
      map: wallTex, color: 0xfff7e9
    });
    M.floorMap = floorMap;
    M.wainscot = new THREE.MeshLambertMaterial({ color: 0x59624f });
    M.wainscotLight = new THREE.MeshLambertMaterial({ color: 0x68715c });
    M.trim = new THREE.MeshLambertMaterial({ color: 0xd9cbb2 });
    M.sash = new THREE.MeshLambertMaterial({ color: 0xe1d4b9 });
    M.sill = new THREE.MeshStandardMaterial({ map: walnutMap, color: 0xb59b7e, roughness: 0.38, metalness: 0.04 });
    M.rod = new THREE.MeshStandardMaterial({ color: 0x3f3022, roughness: 0.35, metalness: 0.55 });
    M.brass = new THREE.MeshStandardMaterial({ color: 0xae8850, roughness: 0.28, metalness: 0.92, envMapIntensity: 1.2 });
    M.brassDark = new THREE.MeshStandardMaterial({ color: 0x7e6138, roughness: 0.4, metalness: 0.8 });
    M.glass = new THREE.MeshPhysicalMaterial({
      color: 0xcfd9d6, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.055,
      envMapIntensity: 0.55, side: THREE.DoubleSide, depthWrite: false,
      clearcoat: 1, clearcoatRoughness: 0.03
    });
    M.curtainMap = clothMap;
    M.clothMap = clothMap;
    M.linenCream = new THREE.MeshLambertMaterial({ map: clothMap, color: 0xd8cbb2 });
    M.linenOlive = new THREE.MeshLambertMaterial({ map: clothMap, color: 0x74795d });
    M.linenRust = new THREE.MeshLambertMaterial({ map: clothMap, color: 0x9b5b44 });
    M.linenThrow = new THREE.MeshLambertMaterial({ map: clothMap, color: 0xb9a88c });
    M.velvet = new THREE.MeshStandardMaterial({ map: clothMap, color: 0x7c4a3c, roughness: 0.86, metalness: 0.02 });
    M.velvetDeep = new THREE.MeshStandardMaterial({ map: clothMap, color: 0x5f4d3c, roughness: 0.9 });
    M.walnut = new THREE.MeshStandardMaterial({ map: walnutMap, color: 0xc9ad8e, roughness: 0.42, metalness: 0.03 });
    M.walnutRaw = new THREE.MeshStandardMaterial({ map: walnutMap, roughness: 0.44, metalness: 0.02 });
    M.oak = new THREE.MeshStandardMaterial({ map: oakMap, color: 0xdcc3a4, roughness: 0.5, metalness: 0.02 });
    M.darkWood = new THREE.MeshStandardMaterial({ map: darkWoodMap, roughness: 0.48, metalness: 0.03 });
    M.pianoBlack = new THREE.MeshPhysicalMaterial({
      color: 0x08090a, metalness: 0.35, roughness: 0.13, clearcoat: 1, clearcoatRoughness: 0.055,
      envMapIntensity: 1.5
    });
    M.pianoUnder = new THREE.MeshStandardMaterial({ color: 0x1c0f08, roughness: 0.55 });
    M.ivory = new THREE.MeshStandardMaterial({ color: 0xf1e7d2, roughness: 0.34, metalness: 0 });
    M.ebony = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.28 });
    M.rug = new THREE.MeshLambertMaterial({ map: rugMap });
    M.rugEdge = new THREE.MeshLambertMaterial({ color: 0x3b211c });
    M.paperMusic = new THREE.MeshStandardMaterial({ map: paperMap, roughness: 0.8, side: THREE.DoubleSide });
    M.bookPage = new THREE.MeshStandardMaterial({ map: bookMap, color: 0xfff9ea, roughness: 0.8 });
    M.gold = new THREE.MeshStandardMaterial({ color: 0xc49a5b, metalness: 0.75, roughness: 0.3 });
    M.shade = new THREE.MeshStandardMaterial({
      color: 0xead7b4, roughness: 0.92, metalness: 0, side: THREE.DoubleSide,
      emissive: 0xffa858, emissiveIntensity: 0.18
    });
    M.bulb = new THREE.MeshBasicMaterial({ color: 0xffd6a0 });
    M.ceramic = new THREE.MeshStandardMaterial({ map: ceramicTexture(4, '#cfc4ae'), color: 0xffffff, roughness: 0.55, metalness: 0.02 });
    M.ceramicBlue = new THREE.MeshStandardMaterial({ map: ceramicTexture(8, '#6d837d'), color: 0xffffff, roughness: 0.42 });
    M.terracotta = new THREE.MeshStandardMaterial({ map: ceramicTexture(12, '#9a5b41'), roughness: 0.8 });
    M.soil = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1 });
    M.leaf = new THREE.MeshStandardMaterial({ map: T.leaf('green'), color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide, alphaTest: 0.35 });
    M.leafDark = new THREE.MeshStandardMaterial({ map: T.leaf('dark'), color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.35 });
    M.bookSpines = T.bookSpines(14, 31);
    M.bookMats = M.bookSpines.map((tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62 }));
    M.catFur = new THREE.MeshStandardMaterial({ map: catFurTexture(), color: 0xffffff, roughness: 0.95 });
    M.catCream = new THREE.MeshStandardMaterial({ color: 0xe9d4b5, roughness: 0.95 });
    M.catDark = new THREE.MeshStandardMaterial({ color: 0x4b2c1b, roughness: 0.9 });
    M.cushionGreen = new THREE.MeshStandardMaterial({ map: clothMap, color: 0x435244, roughness: 0.95 });
    M.candleWax = new THREE.MeshStandardMaterial({ color: 0xe8d8b9, roughness: 0.66, metalness: 0 });
    M.flame = new THREE.MeshBasicMaterial({ color: 0xffc16c, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    M.glowTex = U.softGlowTexture('rgba(255,236,200,1)', 'rgba(255,186,102,0.5)', 128);
    M.steamTex = U.softGlowTexture('rgba(255,255,255,0.7)', 'rgba(255,255,255,0.15)', 128);
    M.recordTex = T.recordLabel();
    M.cafeTex = T.cafe();
    M.aptTex = [T.apartmentWindow(0), T.apartmentWindow(1), T.apartmentWindow(2), T.apartmentWindow(3), T.apartmentWindow(4), T.apartmentWindow(5)];
    M.envMap = T.envCanvas();
    M.paintingTex = [T.painting(0), T.painting(1), T.painting(2)];
    M.rainGlassTex = T.rainGlass();
    WP.MATS = M;
    return M;
  };

  /* ———————————————— 地毯 ———————————————— */
  function buildRug(M) {
    const g = new THREE.Group();
    const base = U.box(3.98, 0.022, 2.92, M.rugEdge, 0, 0.011, 0);
    base.castShadow = false;
    base.receiveShadow = true;
    g.add(base);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(3.92, 2.86), M.rug);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.0235;
    top.receiveShadow = true;
    g.add(top);
    // 两端流苏
    const fringeGeo = new THREE.BoxGeometry(0.005, 0.004, 0.06);
    const fringeMat = new THREE.MeshStandardMaterial({ color: 0xc8b693, roughness: 0.95 });
    const count = 42;
    const inst = new THREE.InstancedMesh(fringeGeo, fringeMat, count * 2);
    const m4 = new THREE.Matrix4();
    let idx = 0;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < count; i++) {
        const z = -1.4 + (i / (count - 1)) * 2.8;
        m4.makeRotationY((Math.random() - 0.5) * 0.2);
        m4.setPosition(side * 2.0, 0.015, z);
        inst.setMatrixAt(idx++, m4);
      }
    }
    inst.receiveShadow = true;
    g.add(inst);
    g.position.set(0.25, 0.005, -0.65);
    return { key: 'rug', group: g, lights: [], on: true, interactive: null };
  }

  /* ———————————————— 钢琴 ———————————————— */
  function buildPiano(M) {
    const g = new THREE.Group();
    g.name = 'piano';

    const shape = new THREE.Shape();
    shape.moveTo(-0.82, -1.13);
    shape.lineTo(0.82, -1.13);
    shape.lineTo(0.82, -0.62);
    shape.bezierCurveTo(0.82, 0.24, 0.6, 0.96, 0.1, 1.3);
    shape.bezierCurveTo(-0.3, 1.48, -0.82, 1.12, -0.82, 0.42);
    shape.closePath();
    const bodyH = 0.23;
    const bodyTop = 0.78;
    const bodyGeo = new THREE.ExtrudeGeometry(shape, {
      depth: bodyH, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018,
      bevelSegments: 3, curveSegments: 36, steps: 1
    });
    bodyGeo.rotateX(-Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, M.pianoBlack);
    body.position.y = bodyTop;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // 内部音板与琴弦
    const plateShape = new THREE.Shape();
    plateShape.moveTo(-0.64, -0.92);
    plateShape.lineTo(0.62, -0.92);
    plateShape.lineTo(0.62, -0.35);
    plateShape.bezierCurveTo(0.62, 0.3, 0.38, 0.7, 0.06, 0.94);
    plateShape.bezierCurveTo(-0.24, 1.06, -0.62, 0.78, -0.62, 0.3);
    plateShape.closePath();
    const plateGeo = new THREE.ExtrudeGeometry(plateShape, { depth: 0.012, bevelEnabled: false, curveSegments: 22 });
    plateGeo.rotateX(-Math.PI / 2);
    const plate = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ color: 0x9a6f36, metalness: 0.7, roughness: 0.45 }));
    plate.position.y = bodyTop + 0.18;
    g.add(plate);
    const stringMat = new THREE.MeshStandardMaterial({ color: 0xd6b57c, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < 26; i++) {
      const sx = -0.6 + i * 0.045;
      const len = 0.7 + (1 - Math.abs(i - 13) / 13) * 0.8;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.0017, 0.0017, len, 3), stringMat);
      st.rotation.x = Math.PI / 2;
      st.position.set(sx, bodyTop + 0.195, -0.15 - (13 - i) * 0.012);
      g.add(st);
    }

    // 打开的琴盖
    const lidPivot = new THREE.Group();
    lidPivot.position.set(-0.82, bodyTop + bodyH + 0.021, 0.02);
    const lidShape = shape.clone();
    const lidGeo = new THREE.ExtrudeGeometry(lidShape, {
      depth: 0.024, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01,
      bevelSegments: 2, curveSegments: 30, steps: 1
    });
    lidGeo.rotateX(-Math.PI / 2);
    lidGeo.translate(0.82, 0, 0);
    const lidMat = [M.pianoBlack, M.pianoBlack];
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.castShadow = true;
    lid.receiveShadow = true;
    lidPivot.add(lid);
    // 琴盖内侧的暖色木纹衬板
    const innerLid = new THREE.Mesh(lidGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x2b160c, roughness: 0.45, metalness: 0.1 }));
    innerLid.scale.set(0.97, -1, 0.97);
    innerLid.position.y = -0.026;
    innerLid.material.side = THREE.BackSide;
    lidPivot.add(innerLid);
    lidPivot.rotation.z = 0.56;
    g.add(lidPivot);
    // 支杆
    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), M.darkWood);
    prop.position.set(0.18, bodyTop + 0.47, 0.4);
    prop.rotation.z = -0.62;
    prop.rotation.x = 0.2;
    g.add(prop);

    // 键盘区
    const keyBed = U.box(1.56, 0.07, 0.32, M.pianoBlack, 0, 0.79, 1.04);
    g.add(keyBed);
    const cheekL = U.box(0.08, 0.11, 0.3, M.pianoBlack, -0.79, 0.79, 1.04);
    const cheekR = U.box(0.08, 0.11, 0.3, M.pianoBlack, 0.79, 0.79, 1.04);
    g.add(cheekL, cheekR);
    // 白键
    const whiteCount = 52;
    const keyW = 0.0264;
    const whiteGeo = new THREE.BoxGeometry(1, 1, 1);
    const whiteInst = new THREE.InstancedMesh(whiteGeo, M.ivory, whiteCount);
    whiteInst.castShadow = true;
    whiteInst.receiveShadow = true;
    const whiteBase = [];
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < whiteCount; i++) {
      const x = -0.746 + i * (1.492 / (whiteCount - 1));
      const pos = new THREE.Vector3(x, 0.831, 1.055);
      const scale = new THREE.Vector3(keyW, 0.017, 0.145);
      whiteBase.push({ pos: pos.clone(), scale });
      m4.compose(pos, new THREE.Quaternion(), scale);
      whiteInst.setMatrixAt(i, m4);
    }
    g.add(whiteInst);
    // 黑键
    const blackOffsets = [0, 1, 3, 4, 5];
    const blackPositions = [];
    for (let oct = 0; oct < 7; oct++) {
      for (let k = 0; k < blackOffsets.length; k++) {
        const whiteIdx = oct * 7 + blackOffsets[k];
        if (whiteIdx < whiteCount - 1) {
          const x1 = -0.746 + whiteIdx * (1.492 / (whiteCount - 1));
          const x2 = -0.746 + (whiteIdx + 1) * (1.492 / (whiteCount - 1));
          blackPositions.push({ x: (x1 + x2) / 2, whiteIdx });
        }
      }
    }
    const blackInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.ebony, blackPositions.length);
    blackInst.castShadow = true;
    const blackBase = [];
    blackPositions.forEach((b, i) => {
      const pos = new THREE.Vector3(b.x, 0.842, 1.025);
      const scale = new THREE.Vector3(0.0145, 0.024, 0.085);
      blackBase.push({ pos: pos.clone(), scale });
      m4.compose(pos, new THREE.Quaternion(), scale);
      blackInst.setMatrixAt(i, m4);
    });
    g.add(blackInst);
    // 红绒防尘条
    g.add(U.box(1.52, 0.012, 0.018, new THREE.MeshStandardMaterial({ color: 0x6e2020, roughness: 0.9 }), 0, 0.805, 0.985));

    // 谱架与乐谱
    const desk = U.box(0.74, 0.03, 0.34, M.pianoBlack, 0, 0.95, 0.82);
    desk.rotation.x = -0.5;
    g.add(desk);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), M.paperMusic);
    sheet.position.set(0, 1.0, 0.79);
    sheet.rotation.x = -0.5;
    sheet.castShadow = true;
    g.add(sheet);
    const sheetBack = sheet.clone();
    sheetBack.position.z -= 0.004;
    sheetBack.rotation.y = Math.PI;
    g.add(sheetBack);
    // 谱架小铜夹
    g.add(U.box(0.03, 0.02, 0.04, M.brass, -0.23, 1.03, 0.74));
    g.add(U.box(0.03, 0.02, 0.04, M.brass, 0.23, 1.03, 0.74));
    // 谱架支撑：两根立柱接到琴身，下沿托住乐谱
    [-1, 1].forEach((s) => {
      const post = U.box(0.022, 0.17, 0.022, M.pianoBlack, s * 0.32, 0.895, 0.9);
      post.rotation.x = -0.2;
      g.add(post);
    });
    const ledge = U.box(0.66, 0.026, 0.05, M.pianoBlack, 0, 0.832, 0.885);
    ledge.rotation.x = -0.5;
    g.add(ledge);

    // 琴腿
    function pianoLeg(x, z) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.7, 14), M.pianoBlack);
      leg.position.set(x, 0.35, z);
      leg.castShadow = true;
      g.add(leg);
      // 腿顶与琴身之间的连接块，避免看起来悬空
      const joint = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), M.pianoBlack);
      joint.position.set(x, 0.735, z);
      joint.castShadow = true;
      joint.receiveShadow = true;
      g.add(joint);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.035, 14), M.brass);
      cap.position.set(x, 0.018, z);
      g.add(cap);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.024, 12), M.brassDark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.03, z);
      g.add(wheel);
    }
    pianoLeg(-0.62, 0.92);
    pianoLeg(0.62, 0.92);
    pianoLeg(0.02, -0.82);

    // 踏板
    const pedalBox = U.box(0.36, 0.06, 0.18, M.pianoBlack, 0, 0.35, 1.18);
    g.add(pedalBox);
    for (let i = 0; i < 3; i++) {
      const pedal = U.box(0.035, 0.018, 0.12, M.brass, -0.08 + i * 0.08, 0.39, 1.27);
      pedal.rotation.x = -0.12;
      g.add(pedal);
    }

    // 琴凳
    const bench = new THREE.Group();
    const benchSeat = new THREE.Mesh(U.roundedBoxGeometry(0.96, 0.12, 0.36, 0.04, 0.012), M.velvetDeep);
    benchSeat.position.y = 0.48;
    benchSeat.castShadow = true;
    bench.add(benchSeat);
    const benchBase = U.box(0.9, 0.07, 0.3, M.pianoBlack, 0, 0.41, 0);
    bench.add(benchBase);
    [[-0.38, 0.11], [0.38, 0.11], [-0.38, -0.11], [0.38, -0.11]].forEach((p) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.38, 10), M.pianoBlack);
      leg.position.set(p[0], 0.19, p[1]);
      bench.add(leg);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.024, 0.018, 10), M.brass);
      cap.position.set(p[0], 0.009, p[1]);
      bench.add(cap);
    });
    bench.position.set(0, 0, 1.62);
    g.add(bench);

    // 交互标记 / 动画
    const item = {
      key: 'piano', group: g, lights: [], on: true,
      interactive: 'piano',
      keys: { whiteInst, blackInst, whiteBase, blackBase, whiteCount, blackPositions },
      notes: [],
      playPhrase(fromClick) {
        const starts = [0, 0.42, 0.86, 1.26, 1.62, 2.1, 2.52, 3.05, 3.5, 3.96];
        const idx = [22, 25, 27, 29, 27, 25, 24, 22, 20, 19];
        const now = performance.now() / 1000;
        this.notes = idx.map((k, i) => ({ keyIndex: k, t0: now + starts[i], dur: 0.8 + (i % 3) * 0.25 }));
        if (this.onNote) {
          idx.forEach((k, i) => this.onNote(k + 40, i, starts[i]));
        }
      },
      update(t, dt) {
        if (!this.notes.length) return;
        const now = performance.now() / 1000;
        let active = false;
        const pressed = new Map();
        this.notes.forEach((n) => {
          const dt0 = now - n.t0;
          if (dt0 < 0) { active = true; return; }
          if (dt0 > n.dur + 0.3) return;
          active = true;
          const env = dt0 < 0.02 ? dt0 / 0.02 : dt0 < n.dur ? 1 : Math.max(0, 1 - (dt0 - n.dur) / 0.3);
          pressed.set(n.keyIndex, Math.max(pressed.get(n.keyIndex) || 0, env));
        });
        if (!active) { this.notes = []; }
        // 白键
        const inst = this.keys.whiteInst;
        const m = this._m || (this._m = new THREE.Matrix4());
        const pv = this._p || (this._p = new THREE.Vector3());
        const q = this._q || (this._q = new THREE.Quaternion());
        for (let i = 0; i < this.keys.whiteCount; i++) {
          const b = this.keys.whiteBase[i];
          const p = pressed.get(i) ? pressed.get(i) * 0.009 : 0;
          pv.set(b.pos.x, b.pos.y - p, b.pos.z);
          m.compose(pv, q, b.scale);
          inst.setMatrixAt(i, m);
        }
        inst.instanceMatrix.needsUpdate = true;
        // 黑键
        const bInst = this.keys.blackInst;
        for (let i = 0; i < this.keys.blackBase.length; i++) {
          const b = this.keys.blackBase[i];
          const wi = this.keys.blackPositions[i].whiteIdx;
          const p = pressed.get(wi) ? pressed.get(wi) * 0.009 : 0;
          pv.set(b.pos.x, b.pos.y - p, b.pos.z);
          m.compose(pv, q, b.scale);
          bInst.setMatrixAt(i, m);
        }
        bInst.instanceMatrix.needsUpdate = true;
      }
    };
    g.userData.pickItem = item;
    g.position.set(-2.24, 0, -1.68);
    g.rotation.y = 0.32;
    return item;
  }

  /* ———————————————— 扶手椅 ———————————————— */
  function buildArmchair(M) {
    const g = new THREE.Group();
    // 四条车木腿
    const legProfile = [];
    legProfile.push(new THREE.Vector2(0.028, 0));
    legProfile.push(new THREE.Vector2(0.035, 0.06));
    legProfile.push(new THREE.Vector2(0.028, 0.12));
    legProfile.push(new THREE.Vector2(0.045, 0.2));
    legProfile.push(new THREE.Vector2(0.033, 0.3));
    legProfile.push(new THREE.Vector2(0.048, 0.38));
    const legGeo = new THREE.LatheGeometry(legProfile, 10);
    [[-0.38, 0.3], [0.38, 0.3], [-0.38, -0.32], [0.38, -0.32]].forEach((p) => {
      const leg = new THREE.Mesh(legGeo, M.darkWood);
      leg.position.set(p[0], 0, p[1]);
      leg.castShadow = true;
      g.add(leg);
    });

    // 座框与坐垫
    const base = new THREE.Mesh(U.roundedBoxGeometry(0.84, 0.3, 0.78, 0.07, 0.018), M.velvet);
    base.position.set(0, 0.42, 0);
    base.castShadow = true;
    g.add(base);
    const seat = new THREE.Mesh(U.roundedBoxGeometry(0.8, 0.14, 0.72, 0.09, 0.022), M.velvet);
    seat.position.set(0, 0.6, 0.04);
    seat.castShadow = true;
    g.add(seat);
    // 靠背（略带倾斜）
    const backGroup = new THREE.Group();
    const back = new THREE.Mesh(U.roundedBoxGeometry(0.86, 0.86, 0.2, 0.14, 0.03), M.velvet);
    back.position.set(0, 0.35, -0.06);
    back.castShadow = true;
    backGroup.add(back);
    const backCushion = new THREE.Mesh(U.roundedBoxGeometry(0.72, 0.6, 0.12, 0.1, 0.022), M.velvet);
    backCushion.position.set(0, 0.3, 0.08);
    backCushion.castShadow = true;
    backGroup.add(backCushion);
    // 纽扣
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), M.velvetDeep);
        btn.scale.z = 0.4;
        btn.position.set(-0.16 + i * 0.32, 0.26 + j * 0.15, 0.145);
        backGroup.add(btn);
      }
    }
    backGroup.position.set(0, 0.58, -0.34);
    backGroup.rotation.x = -0.12;
    g.add(backGroup);
    // 扶手
    [-1, 1].forEach((s) => {
      const armBase = new THREE.Mesh(U.roundedBoxGeometry(0.15, 0.3, 0.72, 0.06, 0.016), M.velvet);
      armBase.position.set(s * 0.49, 0.51, 0.02);
      armBase.castShadow = true;
      g.add(armBase);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.68, 16), M.velvet);
      roll.rotation.x = Math.PI / 2;
      roll.position.set(s * 0.49, 0.68, 0.02);
      roll.castShadow = true;
      g.add(roll);
      for (let i = 0; i < 7; i++) {
        const nail = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), M.brass);
        nail.position.set(s * 0.568, 0.7, -0.27 + i * 0.09);
        g.add(nail);
      }
    });
    // 翼状侧翼
    [-1, 1].forEach((s) => {
      const wing = new THREE.Mesh(U.roundedBoxGeometry(0.13, 0.52, 0.3, 0.06, 0.018), M.velvet);
      wing.position.set(s * 0.41, 0.93, -0.27);
      wing.rotation.z = s * 0.06;
      wing.rotation.y = s * -0.12;
      wing.castShadow = true;
      g.add(wing);
    });
    // 抱枕与搭毯（靠垫单独一份材质，点一下可以换颜色）
    const pillowSkin = M.linenOlive.clone();
    const pillow = new THREE.Mesh(U.roundedBoxGeometry(0.42, 0.36, 0.12, 0.09, 0.02), pillowSkin);
    pillow.position.set(-0.12, 0.77, -0.13);
    pillow.rotation.z = 0.08;
    pillow.rotation.x = -0.15;
    pillow.castShadow = true;
    g.add(pillow);
    for (let i = 0; i < 3; i++) {
      const fold = new THREE.Mesh(U.roundedBoxGeometry(0.6 - i * 0.04, 0.025, 0.22, 0.015, 0.005), M.linenThrow);
      fold.position.set(0.45, 0.74 + i * 0.026, 0.13 + i * 0.01);
      fold.rotation.z = -0.06 + i * 0.02;
      fold.castShadow = true;
      g.add(fold);
    }
    for (let i = 0; i < 9; i++) {
      const fr = U.box(0.004, 0.075, 0.004, M.linenThrow, 0.24 + i * 0.045, 0.68, 0.25);
      g.add(fr);
    }

    const skins = [
      { color: 0x74795d, name: '橄榄绿' },
      { color: 0x9b5b44, name: '陶土红' },
      { color: 0xd8cbb2, name: '亚麻白' }
    ];
    let skin = 0;
    const item = {
      key: 'armchair', group: g, lights: [], on: true, interactive: 'armchair',
      onClick() {
        skin = (skin + 1) % skins.length;
        pillowSkin.color.setHex(skins[skin].color);
        return skins[skin].name;
      },
      hover() { return ['换一只靠垫', 'SWAP THE CUSHION']; }
    };
    g.userData.pickItem = item;
    g.position.set(2.6, 0, -1.98);
    g.rotation.y = -0.55;
    return item;
  }

  /* ———————————————— 唱片柜 ———————————————— */
  function buildConsole(M) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(U.roundedBoxGeometry(1.5, 0.62, 0.42, 0.035, 0.01), M.walnut);
    body.position.y = 0.45;
    body.castShadow = true;
    g.add(body);
    const top = U.box(1.54, 0.035, 0.45, M.walnut, 0, 0.777, 0);
    g.add(top);
    // 藤编门板
    const caneMat = new THREE.MeshStandardMaterial({ map: M.clothMap, color: 0xa98c63, roughness: 0.95 });
    [-1, 1].forEach((s) => {
      const door = U.box(0.68, 0.46, 0.018, M.walnut, s * 0.37, 0.45, 0.219);
      g.add(door);
      const cane = U.box(0.58, 0.36, 0.01, caneMat, s * 0.37, 0.45, 0.232);
      cane.castShadow = false;
      g.add(cane);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 16), M.brass);
      handle.position.set(s * 0.08, 0.45, 0.243);
      g.add(handle);
      // 门上的细木条
      for (let i = 0; i < 5; i++) {
        const strip = U.box(0.012, 0.36, 0.004, M.walnut, s * 0.37 - 0.28 + i * 0.14, 0.45, 0.239);
        strip.castShadow = false;
        g.add(strip);
      }
    });
    // 腿
    [[-0.62, 0.16], [0.62, 0.16], [-0.62, -0.16], [0.62, -0.16]].forEach((p) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.16, 10), M.darkWood);
      leg.position.set(p[0], 0.08, p[1]);
      leg.rotation.z = p[0] * 0.18;
      leg.rotation.x = -p[1] * 0.4;
      g.add(leg);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.015, 8), M.brass);
      cap.position.set(p[0], 0.007, p[1]);
      g.add(cap);
    });

    // 唱机
    const deck = new THREE.Group();
    const plinth = new THREE.Mesh(U.roundedBoxGeometry(0.54, 0.06, 0.4, 0.025, 0.008), M.darkWood);
    plinth.position.y = 0.825;
    plinth.castShadow = true;
    deck.add(plinth);
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.022, 36), new THREE.MeshStandardMaterial({ color: 0x1a1b1d, metalness: 0.4, roughness: 0.32 }));
    platter.position.set(-0.08, 0.868, 0);
    deck.add(platter);
    const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.006, 40), new THREE.MeshPhysicalMaterial({
      color: 0x0c0c0e, roughness: 0.22, metalness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2
    }));
    vinyl.position.set(-0.08, 0.882, 0);
    deck.add(vinyl);
    const label = new THREE.Mesh(new THREE.CircleGeometry(0.042, 24), new THREE.MeshStandardMaterial({ map: M.recordTex, roughness: 0.8 }));
    label.rotation.x = -Math.PI / 2;
    label.position.set(0, 0.004, 0);
    vinyl.add(label);
    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 6), M.brass);
    spindle.position.set(-0.08, 0.892, 0);
    deck.add(spindle);
    // 唱臂
    const armPivot = new THREE.Group();
    armPivot.position.set(0.14, 0.872, -0.1);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.31, 6), M.brass);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = -0.75;
    arm.position.set(-0.13, 0.02, 0.05);
    armPivot.add(arm);
    const counter = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.022, 10), M.brassDark);
    counter.rotation.z = Math.PI / 2;
    counter.position.set(0.015, 0.025, -0.02);
    armPivot.add(counter);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.026), M.brassDark);
    needle.position.set(-0.27, 0.0, 0.12);
    armPivot.add(needle);
    deck.add(armPivot);
    // 旋钮
    for (let i = 0; i < 2; i++) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.018, 12), M.brass);
      knob.position.set(0.17 + i * 0.06, 0.862, 0.14);
      deck.add(knob);
    }
    // 唱片封套
    const sleeveColors = [0x6d5a46, 0x39484a, 0x8a5a43];
    for (let i = 0; i < 3; i++) {
      const sleeve = U.box(0.3, 0.3, 0.012, new THREE.MeshStandardMaterial({ color: sleeveColors[i], roughness: 0.85 }), 0.45 + i * 0.015, 0.9 + i * 0.014, -0.08);
      sleeve.rotation.z = -0.12 - i * 0.05;
      sleeve.rotation.x = -0.08;
      deck.add(sleeve);
      const mark = U.box(0.18, 0.018, 0.002, M.gold, 0.45 + i * 0.015, 0.95 + i * 0.014, -0.073);
      mark.rotation.z = -0.12 - i * 0.05;
      mark.castShadow = false;
      deck.add(mark);
    }
    // 小音箱
    const speaker = new THREE.Mesh(U.roundedBoxGeometry(0.22, 0.28, 0.17, 0.02, 0.006), M.walnut);
    speaker.position.set(0.55, 0.93, 0.06);
    speaker.rotation.y = -0.2;
    speaker.castShadow = true;
    deck.add(speaker);
    const grille = U.box(0.17, 0.2, 0.004, new THREE.MeshStandardMaterial({ map: M.clothMap, color: 0x3c3026, roughness: 1 }), 0.55, 0.93, 0.149);
    grille.rotation.y = -0.2;
    deck.add(grille);
    // 一只小咖啡杯
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.027, 0.065, 16), M.ceramic);
    cup.position.set(-0.5, 0.835, 0.12);
    deck.add(cup);
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.008, 20), M.ceramic);
    saucer.position.set(-0.5, 0.802, 0.12);
    deck.add(saucer);
    deck.position.set(0, 0, 0);
    g.add(deck);

    const item = {
      key: 'record', group: g, lights: [], on: true, interactive: 'record',
      platter, vinyl, armPivot, isPlaying: false, spin: 0,
      mergeExclude: [platter, vinyl, armPivot],
      toggle() {
        this.isPlaying = !this.isPlaying;
        return this.isPlaying;
      },
      update(t, dt) {
        if (this.isPlaying) {
          this.spin += dt * 3.2;
          this.platter.rotation.y = this.spin;
          this.vinyl.rotation.y = this.spin;
          this.armPivot.rotation.y = U.lerp(this.armPivot.rotation.y, -0.16, dt * 3);
        } else {
          this.armPivot.rotation.y = U.lerp(this.armPivot.rotation.y, 0, dt * 3);
        }
      }
    };
    g.userData.pickItem = item;
    g.position.set(3.62, 0, -3.1);
    return item;
  }

  /* ———————————————— 壁架与书 ———————————————— */
  function makeBookInstances(M, parent, x, y, z, width, rng) {
    // 随机摆放的书：每本书用一个实例，按颜色分组
    const positions = [];
    let cursor = -width / 2 + 0.08;
    while (cursor < width / 2 - 0.1) {
      const w = 0.028 + rng() * 0.035;
      const h = 0.22 + rng() * 0.14;
      const d = 0.14 + rng() * 0.04;
      if (rng() > 0.84) {
        // 平放的一摞书
        const count = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < count; i++) {
          positions.push({
            pos: new THREE.Vector3(cursor + w / 2, y + 0.018 + i * 0.034, z + (rng() - 0.5) * 0.02),
            scale: new THREE.Vector3(w + 0.05, 0.03, d + 0.02),
            rotZ: 0,
            mat: Math.floor(rng() * 8)
          });
        }
        cursor += w + 0.1;
      } else {
        positions.push({
          pos: new THREE.Vector3(cursor + w / 2, y + h / 2, z + (rng() - 0.5) * 0.018),
          scale: new THREE.Vector3(w, h, d),
          rotZ: rng() > 0.86 ? (rng() - 0.5) * 0.16 : 0,
          mat: Math.floor(rng() * 8)
        });
        cursor += w + 0.006 + rng() * 0.012;
      }
    }
    const byMat = {};
    positions.forEach((p) => { (byMat[p.mat] = byMat[p.mat] || []).push(p); });
    Object.keys(byMat).forEach((mi) => {
      const arr = byMat[mi];
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: [0x3f4d3f, 0x5a2e2b, 0x26384a, 0x6b5235, 0x7b3b32, 0x3d3b34, 0x78563f, 0x2f4b4a][mi], roughness: 0.68 });
      const inst = new THREE.InstancedMesh(geo, mat, arr.length);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      arr.forEach((p, i) => {
        q.setFromEuler(new THREE.Euler(0, 0, p.rotZ));
        m.compose(p.pos, q, p.scale);
        inst.setMatrixAt(i, m);
      });
      inst.castShadow = true;
      inst.receiveShadow = true;
      parent.add(inst);
    });
    // 少量烫金书名
    for (let i = 0; i < 7; i++) {
      const p = positions[Math.floor(rng() * positions.length)];
      if (!p || p.scale.y < 0.12) continue;
      const mark = new THREE.Mesh(new THREE.BoxGeometry(p.scale.x * 0.45, 0.006, 0.002), M.gold);
      mark.position.set(p.pos.x, p.pos.y + p.scale.y * 0.2, p.pos.z + p.scale.z / 2 + 0.002);
      mark.castShadow = false;
      parent.add(mark);
    }
  }

  function buildShelves(M) {
    const g = new THREE.Group();
    const rng = U.mulberry32(71);
    const shelfW = 1.35;
    const levels = [1.25, 1.84, 2.43];
    levels.forEach((y, si) => {
      const board = U.box(shelfW, 0.045, 0.24, M.walnut, 0, y, 0);
      board.castShadow = true;
      g.add(board);
      [-1, 1].forEach((s) => {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.19), M.brassDark);
        bracket.position.set(s * (shelfW / 2 - 0.12), y - 0.09, 0.01);
        g.add(bracket);
      });
      makeBookInstances(M, g, 0, y + 0.022, 0.01, shelfW - 0.16, rng);
    });
    // 顶层：小陶罐与垂蔓
    const jar = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.03, 0), new THREE.Vector2(0.09, 0.015), new THREE.Vector2(0.1, 0.09),
      new THREE.Vector2(0.07, 0.15), new THREE.Vector2(0.045, 0.17), new THREE.Vector2(0.05, 0.19)
    ], 20), M.ceramicBlue);
    jar.position.set(-0.46, 2.455, 0);
    jar.castShadow = true;
    g.add(jar);
    // 垂下的绿萝
    const vineMat = M.leafDark;
    for (let v = 0; v < 4; v++) {
      const pts = [];
      const x0 = -0.44 + (rng() - 0.5) * 0.08;
      for (let i = 0; i < 6; i++) {
        pts.push(new THREE.Vector3(x0 + Math.sin(i * 0.8 + v) * 0.06, 2.62 - i * 0.14, 0.05 + Math.cos(i + v) * 0.03));
      }
      const vine = U.makeCurveTube(pts, 0.0035, new THREE.MeshStandardMaterial({ color: 0x3c5236, roughness: 0.9 }), 20, 4);
      vine.castShadow = false;
      g.add(vine);
      for (let i = 1; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.08), vineMat);
        leaf.position.copy(pts[i]);
        leaf.rotation.set(-0.5 + rng(), rng() * 3, 0.4);
        g.add(leaf);
      }
    }
    // 铜座小钟
    const clockMat = M.brass;
    const clockBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 20), clockMat);
    clockBase.position.set(0.5, 1.27, 0);
    g.add(clockBase);
    const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.055, 24), new THREE.MeshStandardMaterial({ color: 0xeee5d2, roughness: 0.6 }));
    clockFace.position.set(0.5, 1.322, 0.036);
    clockFace.rotation.x = -Math.PI / 2 + 0.35;
    g.add(clockFace);
    const hand1 = U.box(0.003, 0.035, 0.002, M.ebony, 0.5, 1.33, 0.037);
    hand1.rotation.y = 0.4;
    g.add(hand1);
    const hand2 = U.box(0.003, 0.026, 0.002, M.ebony, 0.5, 1.33, 0.037);
    hand2.rotation.y = -1.1;
    g.add(hand2);
    // 相框
    const photo = U.box(0.24, 0.3, 0.018, M.darkWood, 0.5, 1.96, 0);
    photo.rotation.y = -0.05;
    g.add(photo);
    const photoIn = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.23), new THREE.MeshStandardMaterial({ map: M.paintingTex[2], roughness: 0.7 }));
    photoIn.position.set(0.5, 1.96, 0.012);
    photoIn.rotation.y = -0.05;
    g.add(photoIn);
    // 小书挡
    const bookend = U.box(0.02, 0.15, 0.15, M.brass, -0.58, 1.3, 0);
    g.add(bookend);

    const item = { key: 'shelves', group: g, lights: [], on: true, interactive: null };
    g.position.set(3.55, 0, -3.44);
    return item;
  }

  /* ———————————————— 落地灯 ———————————————— */
  function buildFloorLamp(M) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.035, 28), M.brassDark);
    base.position.y = 0.018;
    base.castShadow = true;
    g.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 1.55, 10), M.brassDark);
    stem.position.y = 0.8;
    stem.castShadow = true;
    g.add(stem);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), M.brass);
    knob.position.y = 1.0;
    g.add(knob);
    const shadeMat = M.shade.clone();
    shadeMat.side = THREE.DoubleSide;
    shadeMat.emissiveIntensity = 0.25;
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.34, 28, 1, true), shadeMat);
    shade.position.y = 1.66;
    shade.castShadow = true;
    g.add(shade);
    const shadeTop = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.17, 24), M.brassDark);
    shadeTop.rotation.x = -Math.PI / 2;
    shadeTop.position.y = 1.83;
    g.add(shadeTop);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.23, 0.32, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffbd77, side: THREE.DoubleSide, transparent: true, opacity: 0.33 }));
    inner.position.y = 1.66;
    g.add(inner);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), M.bulb);
    bulb.position.y = 1.62;
    g.add(bulb);
    const glow = U.sprite(M.glowTex, 0xffb168, 0.32, 1.1);
    glow.position.set(0, 1.62, 0.03);
    g.add(glow);
    const light = new THREE.PointLight(0xffa856, 0.78, 7.5, 2);
    light.position.set(0, 1.58, 0.04);
    light.castShadow = false;
    g.add(light);
    const item = { key: 'floorLamp', group: g, lights: [light], baseLight: 1.7, on: true, interactive: null };
    /* 沿右墙排在扶手椅与唱片柜之间，避免灯罩压进椅背 */
    g.position.set(3.94, 0, -2.54);
    return item;
  }

  /* ———————————————— 吊灯 ———————————————— */
  function buildPendant(M) {
    const g = new THREE.Group();
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.035, 24), M.trim);
    rose.position.y = -0.02;
    g.add(rose);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.62, 6), new THREE.MeshStandardMaterial({ color: 0x5a4834, roughness: 0.8 }));
    cord.position.y = -0.33;
    g.add(cord);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.09, 12), M.brass);
    socket.position.y = -0.66;
    g.add(socket);
    // 蛋白石玻璃灯罩
    const points = [];
    points.push(new THREE.Vector2(0.03, 0));
    points.push(new THREE.Vector2(0.2, 0.0));
    points.push(new THREE.Vector2(0.235, 0.055));
    points.push(new THREE.Vector2(0.23, 0.16));
    points.push(new THREE.Vector2(0.17, 0.25));
    points.push(new THREE.Vector2(0.08, 0.3));
    points.push(new THREE.Vector2(0.035, 0.305));
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xf5e8cd, roughness: 0.22, metalness: 0, transparent: true, opacity: 0.82,
      clearcoat: 0.6, emissive: 0xffb970, emissiveIntensity: 0.24, side: THREE.DoubleSide
    });
    const globe = new THREE.Mesh(new THREE.LatheGeometry(points, 28), glassMat);
    globe.position.y = -0.96;
    globe.castShadow = false;
    g.add(globe);
    const innerBulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd29a }));
    innerBulb.position.y = -1.0;
    g.add(innerBulb);
    const glow = U.sprite(M.glowTex, 0xffb46a, 0.3, 1.22);
    glow.position.y = -1.0;
    g.add(glow);
    const light = new THREE.PointLight(0xffb06a, 0.86, 8.5, 2);
    light.position.y = -1.08;
    light.castShadow = false;
    g.add(light);
    const item = { key: 'pendant', group: g, lights: [light], baseLight: 1.55, on: true, glassMat, globe, interactive: null };
    g.position.set(0, 3.415, -0.25);
    return item;
  }

  /* ———————————————— 花瓶与干花 ———————————————— */
  function buildVase(M) {
    const g = new THREE.Group();
    const profile = [
      new THREE.Vector2(0.062, 0), new THREE.Vector2(0.092, 0.012), new THREE.Vector2(0.105, 0.07),
      new THREE.Vector2(0.088, 0.16), new THREE.Vector2(0.06, 0.24), new THREE.Vector2(0.047, 0.3),
      new THREE.Vector2(0.055, 0.34), new THREE.Vector2(0.061, 0.352)
    ];
    /* 青灰釉，不再用大面积奶白陶瓷：逆光时不会糊成一团白斑 */
    const vase = new THREE.Mesh(new THREE.LatheGeometry(profile, 30), M.ceramicBlue);
    vase.position.y = 0.0;
    vase.castShadow = true;
    g.add(vase);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.005, 6, 26), M.brassDark);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.352;
    g.add(lip);
    // 干花枝
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x81704c, roughness: 0.9 });
    const tuftMat = new THREE.MeshStandardMaterial({ color: 0xa88b60, roughness: 0.98 });
    const plumes = [];
    const rng = U.mulberry32(55);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rng() * 0.5;
      const lean = 0.1 + rng() * 0.17;
      const height = 0.46 + rng() * 0.24;
      const top = new THREE.Vector3(Math.cos(a) * lean, height, Math.sin(a) * lean);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, height, 5), stemMat);
      stem.position.set(top.x / 2, height / 2 + 0.3, top.z / 2);
      stem.rotation.z = -Math.atan2(top.x, height);
      stem.rotation.x = Math.atan2(top.z, height);
      stem.castShadow = true;
      g.add(stem);
      if (i < 3) {
        /* 立体的干草穗：几枚压扁的小椭球，比叠加的发光贴图更清楚也更耐看 */
        const plume = new THREE.Group();
        plume.position.copy(top).add(new THREE.Vector3(0, 0.32, 0));
        for (let k = 0; k < 4; k++) {
          const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.019, 6, 5), tuftMat);
          tuft.scale.set(0.8, 2.7, 0.8);
          tuft.position.set((rng() - 0.5) * 0.026, k * 0.02, (rng() - 0.5) * 0.026);
          tuft.rotation.z = (rng() - 0.5) * 0.5;
          tuft.castShadow = true;
          plume.add(tuft);
        }
        g.add(plume);
        plumes.push(plume);
      } else {
        // 尤加利叶
        for (let l = 0; l < 5; l++) {
          const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), M.leafDark);
          leaf.position.copy(top).add(new THREE.Vector3((rng() - 0.5) * 0.16, 0.02 + l * 0.075, (rng() - 0.5) * 0.1));
          leaf.rotation.set(rng() * 2, rng() * 3, rng());
          leaf.material.side = THREE.DoubleSide;
          g.add(leaf);
        }
      }
    }
    const item = {
      key: 'vase', group: g, lights: [], on: true, interactive: null, plumes,
      update(t) {
        if (!this.group.parent) return;
        this.group.rotation.z = Math.sin(t * 0.5) * 0.006;
        plumes.forEach((p, i) => {
          p.rotation.z = Math.sin(t * 0.4 + i) * 0.035;
        });
      }
    };
    g.position.set(-1.02, 0.462, -3.08);
    g.rotation.y = 0.3;
    return item;
  }

  /* ———————————————— 窗台猫 ———————————————— */
  function buildCat(M) {
    const g = new THREE.Group();
    g.userData.noMerge = true;
    // 小坐垫
    const cushion = new THREE.Mesh(U.roundedBoxGeometry(0.7, 0.07, 0.5, 0.12, 0.02), M.cushionGreen);
    cushion.position.set(0, 0.035, 0);
    cushion.castShadow = true;
    g.add(cushion);

    const cat = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), M.catFur);
    body.scale.set(1.5, 0.82, 1.05);
    body.position.set(0, 0.18, 0);
    body.castShadow = true;
    cat.add(body);
    /* 胸口的奶油毛只从下巴侧面露一点，别挡住脸 */
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), M.catCream);
    chest.scale.set(0.7, 0.6, 0.8);
    chest.position.set(-0.18, 0.13, 0.1);
    cat.add(chest);
    const head = new THREE.Group();
    /* 头探出身体左端并抬高，从窗外看不再是一团毛球 */
    head.position.set(-0.33, 0.285, 0.045);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.118, 20, 16), M.catFur);
    headMesh.scale.set(1.06, 0.94, 0.98);
    headMesh.castShadow = true;
    head.add(headMesh);
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), M.catCream);
    muzzle.scale.set(1.2, 0.74, 0.9);
    muzzle.position.set(-0.085, -0.022, 0.015);
    head.add(muzzle);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), M.catDark);
    nose.scale.set(1.35, 0.9, 0.9);
    nose.position.set(-0.148, -0.002, 0.018);
    head.add(nose);
    // 耳朵
    const ears = [];
    [-1, 1].forEach((s) => {
      const earPivot = new THREE.Group();
      earPivot.position.set(-0.005, 0.093, s * 0.055);
      earPivot.rotation.x = -s * 0.22;
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), M.catFur);
      ear.rotation.z = s * 0.12;
      earPivot.add(ear);
      const earIn = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.066, 4), M.catCream);
      earIn.position.set(-0.008, 0.0, s * 0.007);
      earIn.rotation.z = s * 0.12;
      earPivot.add(earIn);
      head.add(earPivot);
      ears.push(earPivot);
    });
    /* 闭着的眼睛：脸朝 -X，双眼必须贴在这个朝向的弧面上 */
    [-1, 1].forEach((s) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.catDark);
      eye.scale.set(0.35, 0.32, 1.05);
      eye.position.set(-0.099, 0.03, s * 0.048);
      eye.rotation.y = s * 0.35;
      head.add(eye);
    });
    // 胡须：一组线段，随头部轻微摆动
    const whiskerGeo = new THREE.BufferGeometry();
    const wpos = [];
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 3; i++) {
        wpos.push(-0.105, -0.008 + i * 0.012, s * 0.032);
        wpos.push(-0.215, -0.002 + i * 0.015, s * (0.08 + i * 0.018));
      }
    });
    whiskerGeo.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
    const whiskers = new THREE.LineSegments(whiskerGeo, new THREE.LineBasicMaterial({
      color: 0xe8d6b8, transparent: true, opacity: 0.38
    }));
    head.add(whiskers);
    cat.add(head);
    // 前爪
    [-1, 1].forEach((s) => {
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), M.catCream);
      paw.scale.set(1.25, 0.62, 0.9);
      paw.position.set(-0.3, 0.052, s * 0.09);
      cat.add(paw);
    });
    // 尾巴盘在身侧，根部留一个可摆动的枢轴
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0.25, 0.12, 0);
    const tailPts = [];
    for (let i = 0; i < 9; i++) {
      const a = -0.4 + i * 0.32;
      tailPts.push(new THREE.Vector3(0.02 + Math.cos(a) * 0.18, Math.sin(i * 0.7) * 0.02, Math.sin(a) * 0.2));
    }
    const tail = U.makeCurveTube(tailPts, 0.042, M.catFur, 30, 8);
    tail.castShadow = true;
    tailGroup.add(tail);
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), M.catDark);
    tailTip.position.copy(tailPts[tailPts.length - 1]);
    tailGroup.add(tailTip);
    cat.add(tailGroup);
    // 背上的一点深色虎斑
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), M.catDark);
      stripe.scale.set(1.6, 0.25, 0.75);
      stripe.position.set(-0.02 + i * 0.12, 0.33, (i - 1) * 0.09);
      stripe.material = stripe.material.clone();
      stripe.material.transparent = true;
      stripe.material.opacity = 0.35;
      cat.add(stripe);
    }
    cat.position.y = 0.07;
    g.add(cat);

    let lift = 0;
    let liftTarget = 0;
    const item = {
      key: 'cat', group: g, lights: [], on: true, interactive: 'cat',
      head, cat, tailGroup, ears, lift: 0,
      onClick() {
        liftTarget = 1;
        setTimeout(() => { liftTarget = 0; }, 2100);
      },
      update(t, dt) {
        lift = U.damp(lift, liftTarget, 5, dt);
        head.rotation.z = -lift * 0.32;
        head.rotation.x = lift * 0.2;
        head.rotation.y = 0.28 + Math.sin(t * 0.21) * 0.05 + Math.sin(t * 0.07) * 0.03;
        const breath = 1 + Math.sin(t * 1.35) * 0.012;
        cat.scale.set(1, breath, 1);
        tailGroup.rotation.y = Math.sin(t * 0.62) * 0.1;
        tailGroup.rotation.x = Math.sin(t * 0.37) * 0.035;
        // 偶尔动一下耳朵
        const flick = Math.sin(t * 0.6) > 0.985 ? Math.sin(t * 40) * 0.12 : 0;
        ears[0].rotation.x = flick;
        ears[1].rotation.x = flick * 0.6;
      }
    };
    g.userData.pickItem = item;
    g.position.set(0.6, 0.46, -3.2);
    g.rotation.y = -0.2;
    return item;
  }

  /* ———————————————— 吊挂绿植 ———————————————— */
  function buildPlant(M) {
    const g = new THREE.Group();
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14), M.brass);
    hook.position.y = 0;
    hook.rotation.x = Math.PI / 2;
    g.add(hook);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x9b8465, roughness: 0.92 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const top = new THREE.Vector3(0, -0.02, 0);
      const bot = new THREE.Vector3(Math.cos(a) * 0.13, -0.62, Math.sin(a) * 0.13);
      const len = top.distanceTo(bot);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 5), ropeMat);
      rope.position.copy(top.clone().add(bot).multiplyScalar(0.5));
      rope.lookAt(bot);
      rope.rotateX(Math.PI / 2);
      g.add(rope);
    }
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.23, 18), M.terracotta);
    pot.position.y = -0.73;
    pot.castShadow = true;
    g.add(pot);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.015, 16), M.soil);
    soil.position.y = -0.625;
    g.add(soil);
    // 叶球
    const leafGeo = new THREE.PlaneGeometry(0.16, 0.11);
    const rng = U.mulberry32(62);
    for (let i = 0; i < 22; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * 0.18;
      const leaf = new THREE.Mesh(leafGeo, rng() > 0.5 ? M.leaf : M.leafDark);
      leaf.position.set(Math.cos(a) * r, -0.53 + rng() * 0.2, Math.sin(a) * r);
      leaf.rotation.set(-0.6 + rng() * 1.2, rng() * 3, rng());
      g.add(leaf);
    }
    // 垂下的藤
    for (let v = 0; v < 5; v++) {
      const pts = [];
      const a = rng() * Math.PI * 2;
      const x0 = Math.cos(a) * 0.1;
      const z0 = Math.sin(a) * 0.1;
      for (let i = 0; i < 7; i++) {
        pts.push(new THREE.Vector3(x0 + Math.sin(i * 0.6 + v) * 0.05, -0.62 - i * 0.13, z0 + Math.cos(i * 0.7 + v) * 0.04));
      }
      const vine = U.makeCurveTube(pts, 0.003, new THREE.MeshStandardMaterial({ color: 0x354a31, roughness: 0.92 }), 24, 4);
      vine.castShadow = false;
      g.add(vine);
      for (let i = 1; i < 7; i++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.075), M.leaf);
        leaf.position.copy(pts[i]);
        leaf.rotation.set(-0.4 + rng(), rng() * 3, rng());
        g.add(leaf);
      }
    }
    const item = {
      key: 'plant', group: g, lights: [], on: true, interactive: null,
      update(t) { g.rotation.z = Math.sin(t * 0.45 + 0.5) * 0.012; g.rotation.x = Math.sin(t * 0.35) * 0.01; }
    };
    g.position.set(-2.28, 3.2, -0.72);
    return item;
  }

  /* ———————————————— 串灯 ———————————————— */
  function buildStringLights(M) {
    const g = new THREE.Group();
    const a = new THREE.Vector3(-2.55, 2.68, -3.28);
    const b = new THREE.Vector3(2.55, 2.68, -3.28);
    const mid = new THREE.Vector3(0, 2.47, -3.24);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.0035, 4, false), new THREE.MeshStandardMaterial({ color: 0x2e251b, roughness: 0.8 }));
    wire.castShadow = false;
    g.add(wire);
    const bulbs = [];
    const bulbGeo = new THREE.SphereGeometry(0.026, 8, 6);
    for (let i = 1; i < 18; i++) {
      const p = curve.getPoint(i / 18);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.022, 8), M.brassDark);
      cap.position.copy(p).add(new THREE.Vector3(0, -0.015, 0));
      g.add(cap);
      const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xffd29a }));
      bulb.position.copy(p).add(new THREE.Vector3(0, -0.045, 0));
      g.add(bulb);
      bulbs.push(bulb);
      const glow = U.sprite(M.glowTex, 0xffb86a, 0.55, 0.32);
      glow.position.copy(bulb.position);
      g.add(glow);
    }
    const item = {
      key: 'stringLights', group: g, lights: [], baseLight: 0, on: false, interactive: null,
      bulbs, mergeExclude: bulbs,
      update(t) {
        bulbs.forEach((b, i) => {
          const k = 0.82 + Math.sin(t * 2.2 + i * 1.7) * 0.1 + Math.sin(t * 7 + i) * 0.03;
          b.scale.setScalar(k);
        });
      }
    };
    return item;
  }

  /* ———————————————— 烛台 ———————————————— */
  function buildCandles(M) {
    const g = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.018, 28), M.brass);
    tray.position.y = 0.009;
    tray.castShadow = true;
    g.add(tray);
    const specs = [
      { x: -0.06, z: 0.03, h: 0.29, r: 0.04 },
      { x: 0.055, z: 0.02, h: 0.19, r: 0.035 },
      { x: 0.01, z: -0.07, h: 0.24, r: 0.032 }
    ];
    const flames = [];
    specs.forEach((s, i) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.026, 0.1, 12), M.brassDark);
      stem.position.set(s.x, 0.06, s.z);
      g.add(stem);
      const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.016, 16), M.brass);
      holder.position.set(s.x, 0.113, s.z);
      g.add(holder);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 0.96, s.h, 16), M.candleWax);
      candle.position.set(s.x, 0.12 + s.h / 2, s.z);
      candle.castShadow = true;
      g.add(candle);
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.018, 4), M.ebony);
      wick.position.set(s.x, 0.13 + s.h, s.z);
      g.add(wick);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 8), M.flame);
      flame.position.set(s.x, 0.16 + s.h, s.z);
      g.add(flame);
      const glow = U.sprite(M.glowTex, 0xffb35f, 0.5, 0.22);
      glow.position.set(s.x, 0.17 + s.h, s.z);
      g.add(glow);
      flames.push({ flame, glow, seed: i * 2.1 });
    });
    /* 烛光用一个贴地暖斑代替点光源：账面上少一盏灯，桌面仍然被烘暖 */
    const spill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.52),
      new THREE.MeshBasicMaterial({
        map: M.glowTex, color: 0xffa85c, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
      })
    );
    spill.rotation.x = -Math.PI / 2;
    spill.position.y = 0.004;
    g.add(spill);
    const item = {
      key: 'candles', group: g, lights: [], baseLight: 0, on: true, interactive: null, flames,
      mergeExclude: flames.map((f) => f.flame),
      update(t) {
        flames.forEach((f, i) => {
          const k = 1 + Math.sin(t * 8 + f.seed) * 0.08 + Math.sin(t * 17 + f.seed * 2) * 0.05;
          f.flame.scale.set(1, k, 1);
          f.flame.position.x = Math.sin(t * 5 + f.seed) * 0.002;
          f.glow.material.opacity = 0.4 + k * 0.08;
        });
        spill.material.opacity = 0.14 + Math.sin(t * 9) * 0.015;
      }
    };
    g.position.set(1.93, 0.462, -3.03);
    g.scale.setScalar(0.94);
    return item;
  }

  /* ———————————————— 茶几 ———————————————— */
  function buildCoffeeTable(M) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(U.roundedBoxGeometry(1.22, 0.055, 0.66, 0.16, 0.018), M.walnut);
    top.position.y = 0.38;
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);
    const apron = U.box(1.06, 0.06, 0.5, M.walnut, 0, 0.335, 0);
    g.add(apron);
    // 四条外撇腿
    [[-0.46, 0.22], [0.46, 0.22], [-0.46, -0.22], [0.46, -0.22]].forEach((p) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.33, 10), M.darkWood);
      leg.position.set(p[0], 0.165, p[1]);
      leg.rotation.z = p[0] * -0.18;
      leg.rotation.x = p[1] * 0.18;
      leg.castShadow = true;
      g.add(leg);
    });
    // 下层搁板
    const shelf = U.box(0.94, 0.02, 0.42, M.walnut, 0, 0.14, 0);
    g.add(shelf);
    // 摊开的书
    const bookGroup = new THREE.Group();
    const pageL = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.23), M.bookPage);
    pageL.rotation.x = -Math.PI / 2;
    pageL.position.set(-0.16, 0.414, 0.02);
    bookGroup.add(pageL);
    const pageR = pageL.clone();
    pageR.position.x = 0.16;
    pageR.rotation.z = 0.01;
    bookGroup.add(pageR);
    const bookSpine = U.box(0.016, 0.022, 0.24, M.velvetDeep, 0, 0.405, 0.02);
    bookGroup.add(bookSpine);
    bookGroup.rotation.y = 0.15;
    g.add(bookGroup);
    // 咖啡杯与茶碟
    const cupGroup = new THREE.Group();
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.072, 0.008, 24), M.ceramic);
    saucer.position.y = 0.406;
    cupGroup.add(saucer);
    const cup = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.025, 0), new THREE.Vector2(0.045, 0.005), new THREE.Vector2(0.05, 0.07),
      new THREE.Vector2(0.045, 0.085), new THREE.Vector2(0.046, 0.09)
    ], 20), M.ceramic);
    cup.position.y = 0.41;
    cup.castShadow = true;
    cupGroup.add(cup);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.043, 20), new THREE.MeshStandardMaterial({ color: 0x3b2013, roughness: 0.3 }));
    tea.rotation.x = -Math.PI / 2;
    tea.position.y = 0.492;
    cupGroup.add(tea);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.007, 6, 14, Math.PI * 1.5), M.ceramic);
    handle.position.set(0.055, 0.455, 0);
    handle.rotation.y = Math.PI / 2;
    cupGroup.add(handle);
    cupGroup.position.set(0.33, 0, 0.08);
    cupGroup.rotation.y = -0.6;
    g.add(cupGroup);
    // 蒸汽
    const steam = [];
    const steamMat = new THREE.SpriteMaterial({ map: M.steamTex, color: 0xeadfd0, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.NormalBlending });
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(steamMat.clone());
      sp.scale.set(0.12, 0.22, 1);
      sp.position.set(0.35 + (i - 2) * 0.01, 0.55, 0.1);
      sp.userData.seed = i;
      g.add(sp);
      steam.push(sp);
    }
    // 小铜碟
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.012, 20), M.brass);
    dish.position.set(-0.32, 0.41, -0.13);
    g.add(dish);
    // 一片落叶（季节感）
    const fallen = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.06), M.leafDark);
    fallen.rotation.set(-Math.PI / 2 + 0.1, 0.4, 0);
    fallen.position.set(-0.05, 0.413, 0.21);
    g.add(fallen);
    const item = {
      key: 'table', group: g, lights: [], on: true, interactive: null,
      update(t) {
        steam.forEach((sp, i) => {
          const k = (t * 0.16 + i * 0.23) % 1;
          sp.position.y = 0.52 + k * 0.33;
          sp.material.opacity = (1 - k) * 0.22;
          sp.position.x = 0.35 + Math.sin(t * 0.7 + i * 2) * 0.02 + (i - 2) * 0.008;
        });
      }
    };
    g.position.set(0.38, 0, 0.08);
    return item;
  }

  /* ———————————————— 望远镜 ———————————————— */
  function buildTelescope(M) {
    const g = new THREE.Group();
    const apex = new THREE.Vector3(0, 1.02, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.25;
      const foot = new THREE.Vector3(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36);
      const mid = apex.clone().add(foot).multiplyScalar(0.5);
      const len = apex.distanceTo(foot);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, len, 8), M.darkWood);
      leg.position.copy(mid);
      leg.lookAt(foot);
      leg.rotateX(Math.PI / 2);
      leg.castShadow = true;
      g.add(leg);
    }
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.08, 12), M.brassDark);
    mount.position.y = 1.04;
    g.add(mount);
    const tubeGroup = new THREE.Group();
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xb98f4f, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.2 });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 0.72, 20), tubeMat);
    tube.position.y = 0.36;
    tube.castShadow = true;
    tubeGroup.add(tube);
    const end1 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 20), M.brassDark);
    end1.position.y = 0.73;
    tubeGroup.add(end1);
    const end2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 18), M.brassDark);
    end2.position.y = 0.02;
    tubeGroup.add(end2);
    const finder = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 10), M.brass);
    finder.position.set(0.075, 0.58, 0);
    finder.rotation.z = -0.03;
    tubeGroup.add(finder);
    tubeGroup.position.copy(apex);
    /* 镜筒压低一点，正对着窗心：从椅背后看，也能看出它是在看窗外 */
    tubeGroup.rotation.x = -1.3;
    tubeGroup.rotation.z = 0.02;
    g.add(tubeGroup);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const item = { key: 'telescope', group: g, lights: [], on: true, interactive: 'telescope' };
    g.userData.pickItem = item;
    /* 靠右墙，与摇椅、扶手椅都留出一段取景距离 */
    g.position.set(3.8, 0, -1.34);
    g.rotation.y = 0.82;
    return item;
  }

  /* ———————————————— 墙画 ———————————————— */
  function frame(w, h, texture, M, depth) {
    const g = new THREE.Group();
    const d = depth || 0.035;
    const frameMat = M.brassDark;
    const fw = 0.045;
    g.add(U.box(w, fw, d, frameMat, 0, h / 2 - fw / 2, 0));
    g.add(U.box(w, fw, d, frameMat, 0, -h / 2 + fw / 2, 0));
    g.add(U.box(fw, h - fw * 2, d, frameMat, -w / 2 + fw / 2, 0, 0));
    g.add(U.box(fw, h - fw * 2, d, frameMat, w / 2 - fw / 2, 0, 0));
    const canvasMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62, metalness: 0 });
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(w - fw * 2, h - fw * 2), canvasMat);
    canvas.position.z = d / 2 - 0.002;
    g.add(canvas);
    const glazing = new THREE.Mesh(new THREE.PlaneGeometry(w - fw * 2, h - fw * 2), new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0.02, metalness: 0, envMapIntensity: 1.4
    }));
    glazing.position.z = d / 2 + 0.001;
    g.add(glazing);
    return g;
  }

  function buildWallArt(M) {
    const g = new THREE.Group();
    const f1 = frame(0.66, 0.84, M.paintingTex[0], M);
    f1.position.set(-0.24, 0.3, 0);
    f1.rotation.y = 0.02;
    g.add(f1);
    const f2 = frame(0.42, 0.34, M.paintingTex[1], M);
    f2.position.set(0.3, -0.26, 0.01);
    f2.rotation.z = 0.02;
    g.add(f2);
    // 小铭牌
    const plate = U.box(0.16, 0.022, 0.004, M.brass, -0.24, -0.23, 0.03);
    g.add(plate);
    const item = { key: 'wallArt', group: g, lights: [], on: true, interactive: null };
    g.position.set(-3.32, 2.22, WP.CONFIG.room.wallZ + 0.18);
    return item;
  }

  /* ———————————————— 靠在扶手椅边的木吉他 ———————————————— */
  function buildGuitar(M) {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    g.add(inner);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6e351c, roughness: 0.32, metalness: 0.06 });
    const topMat = new THREE.MeshStandardMaterial({ color: 0xc18a4a, roughness: 0.4, metalness: 0.02 });
    const neckMat = new THREE.MeshStandardMaterial({ color: 0x3a2114, roughness: 0.42 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x1b120c, roughness: 0.32 });
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd8c9a8, metalness: 0.9, roughness: 0.26 });
    const stringMat = new THREE.MeshStandardMaterial({ color: 0xdfe2dc, metalness: 0.82, roughness: 0.3 });

    /* 用一条带腰身的轮廓线挤出琴身：上窄下宽、腰部明显收进，
       比两个圆叠在一起更像一把真吉他 */
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.668);
    shape.bezierCurveTo(-0.09, 0.67, -0.128, 0.64, -0.13, 0.6);
    shape.bezierCurveTo(-0.132, 0.57, -0.11, 0.552, -0.097, 0.53);
    shape.bezierCurveTo(-0.084, 0.508, -0.083, 0.482, -0.09, 0.458);
    shape.bezierCurveTo(-0.1, 0.428, -0.2, 0.408, -0.204, 0.318);
    shape.bezierCurveTo(-0.208, 0.226, -0.158, 0.132, -0.06, 0.118);
    shape.quadraticCurveTo(0, 0.108, 0.06, 0.118);
    shape.bezierCurveTo(0.158, 0.132, 0.208, 0.226, 0.204, 0.318);
    shape.bezierCurveTo(0.2, 0.408, 0.1, 0.428, 0.09, 0.458);
    shape.bezierCurveTo(0.083, 0.482, 0.084, 0.508, 0.097, 0.53);
    shape.bezierCurveTo(0.11, 0.552, 0.132, 0.57, 0.13, 0.6);
    shape.bezierCurveTo(0.128, 0.64, 0.09, 0.67, 0, 0.668);

    const bodyGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.072, bevelEnabled: true, bevelSegments: 3,
      bevelSize: 0.008, bevelThickness: 0.011, curveSegments: 24, steps: 1
    });
    bodyGeo.translate(0, 0, -0.046);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    inner.add(body);

    /* 云杉面板：比琴身小一圈，露出深色包边 */
    const plate = new THREE.Mesh(new THREE.ShapeGeometry(shape, 26), topMat);
    plate.scale.set(0.935, 0.952, 1);
    plate.position.set(0, 0.388 * (1 - 0.952), 0.062);
    inner.add(plate);

    // 音孔与镶圈
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.049, 30), new THREE.MeshBasicMaterial({ color: 0x0a0604 }));
    hole.position.set(0, 0.455, 0.0635);
    inner.add(hole);
    const rosetteIn = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.0028, 6, 34), guardMat);
    rosetteIn.position.set(0, 0.455, 0.064);
    inner.add(rosetteIn);
    const rosetteOut = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.0022, 6, 34), topMat);
    rosetteOut.position.set(0, 0.455, 0.0638);
    inner.add(rosetteOut);

    // 琴桥、弦枕与护板
    inner.add(U.box(0.108, 0.023, 0.013, guardMat, 0, 0.335, 0.066));
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xd8cbb2, roughness: 0.5, metalness: 0.02 });
    inner.add(U.box(0.072, 0.0045, 0.005, boneMat, 0, 0.346, 0.069));
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xc9bca2, roughness: 0.55, metalness: 0.02 });
    /* 六枚弦钉，缩小并压暗，避免连成一条像琴键的白线 */
    for (let i = 0; i < 6; i++) {
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 6, 5), pinMat);
      pin.position.set(-0.033 + i * 0.0132, 0.3245, 0.0725);
      inner.add(pin);
    }
    /* 泪滴形护板：上尖贴着音孔下缘，外缘鼓向左下，底端收圆 */
    const guardShape = new THREE.Shape();
    guardShape.moveTo(0.05, 0.4);
    guardShape.bezierCurveTo(0.115, 0.398, 0.158, 0.355, 0.16, 0.305);
    guardShape.bezierCurveTo(0.162, 0.255, 0.135, 0.22, 0.105, 0.216);
    guardShape.bezierCurveTo(0.078, 0.212, 0.062, 0.234, 0.06, 0.262);
    guardShape.bezierCurveTo(0.058, 0.305, 0.046, 0.355, 0.05, 0.4);
    const guard = new THREE.Mesh(new THREE.ShapeGeometry(guardShape, 18), guardMat);
    guard.position.set(0, 0, 0.0638);
    inner.add(guard);

    // 琴颈与指板
    inner.add(U.box(0.056, 0.56, 0.03, neckMat, 0, 0.885, 0.012));
    inner.add(U.box(0.049, 0.525, 0.008, boardMat, 0, 0.9, 0.031));
    for (let i = 0; i < 12; i++) {
      const fret = U.box(0.048, 0.0018, 0.0018, stringMat, 0, 0.675 + i * 0.0425, 0.036);
      inner.add(fret);
    }
    inner.add(U.box(0.052, 0.008, 0.012, M.ivory || metalMat, 0, 1.17, 0.034));

    // 琴头与弦钮
    const head = U.box(0.092, 0.17, 0.026, neckMat, 0, 1.255, 0.008);
    head.rotation.x = -0.09;
    inner.add(head);
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 3; i++) {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.028, 8), metalMat);
        peg.rotation.z = Math.PI / 2;
        peg.position.set(s * 0.058, 1.2 + i * 0.05, 0.008);
        inner.add(peg);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), metalMat);
        knob.scale.set(0.7, 1, 1);
        knob.position.set(s * 0.078, 1.2 + i * 0.05, 0.008);
        inner.add(knob);
      }
    }
    // 六根弦
    for (let i = 0; i < 6; i++) {
      const x = -0.025 + i * 0.01;
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 0.825, 3), stringMat);
      str.position.set(x, 0.756, 0.042);
      str.rotation.x = -0.007;
      inner.add(str);
    }

    /* 落地支架：A 形木腿落在琴身两侧，前方的软托从琴底缘托住，不穿进面板 */
    const standMat = M.walnut || M.darkWood;
    const strut = (ax, ay, az, bx, by, bz, r) => {
      const a = new THREE.Vector3(ax, ay, az);
      const b = new THREE.Vector3(bx, by, bz);
      const len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), standMat);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.add(m);
      return m;
    };
    [-1, 1].forEach((s) => {
      strut(s * 0.17, 0, -0.19, s * 0.245, 0.44, -0.055, 0.012);
      strut(s * 0.17, 0, 0.13, s * 0.245, 0.44, -0.055, 0.0115);
      strut(s * 0.17, 0, 0.13, s * 0.17, 0.02, -0.19, 0.008);
      /* 前端短臂从腿的内侧伸到琴底前方 */
      strut(s * 0.199, 0.17, 0.059, s * 0.09, 0.152, 0.105, 0.01);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.026, 10), new THREE.MeshStandardMaterial({ color: 0x1d1713, roughness: 0.95 }));
      pad.rotation.x = Math.PI / 2;
      pad.position.set(s * 0.09, 0.152, 0.106);
      g.add(pad);
    });
    strut(-0.245, 0.44, -0.055, 0.245, 0.44, -0.055, 0.011);
    const felt = U.box(0.22, 0.018, 0.03, new THREE.MeshStandardMaterial({ color: 0x5a3a2b, roughness: 1 }), 0, 0.4, -0.04);
    g.add(felt);

    inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    let strum = 0;
    let strumT = 0;
    const item = {
      key: 'guitar', group: g, lights: [], on: true, interactive: 'guitar',
      strum() {
        strum = 1;
        strumT = 0;
        if (this.onStrum) this.onStrum();
      },
      update(t, dt) {
        strumT += dt;
        strum = Math.max(0, strum - dt * 1.4);
        const wob = strum * Math.sin(strumT * 34) * 0.02;
        inner.rotation.z = wob;
        inner.rotation.x = strum * Math.sin(strumT * 21 + 0.8) * 0.012;
      }
    };
    g.userData.pickItem = item;
    /* 扶手椅左侧的落地支架：从默认机位可见，和窗台小物错开深度 */
    g.position.set(1.5, 0, -2.45);
    g.rotation.y = 0.28;
    return item;
  }

  /* ———————————————— 窗台上的信笺与星图 ———————————————— */
  function buildLetters(M) {
    const g = new THREE.Group();
    const leather = new THREE.MeshStandardMaterial({ color: 0x4c3524, roughness: 0.72, metalness: 0.03 });
    const leatherDark = new THREE.MeshStandardMaterial({ color: 0x2f2117, roughness: 0.8 });
    const paper = new THREE.MeshStandardMaterial({ color: 0xf1e4c8, roughness: 0.92, metalness: 0 });
    const ink = new THREE.MeshStandardMaterial({ color: 0x2a2b26, roughness: 0.5 });
    const glassInk = new THREE.MeshPhysicalMaterial({ color: 0x141d22, roughness: 0.1, metalness: 0.1, clearcoat: 1 });

    // 摊开的皮质信夹
    const caseL = U.box(0.19, 0.014, 0.25, leather, -0.1, 0.007, 0);
    const caseR = U.box(0.19, 0.014, 0.25, leather, 0.1, 0.007, 0);
    caseL.rotation.y = 0.06;
    caseR.rotation.y = -0.06;
    g.add(caseL, caseR);
    g.add(U.box(0.02, 0.012, 0.25, leatherDark, 0, 0.008, 0));

    // 写了一半的信
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.22), paper);
    sheet.rotation.x = -Math.PI / 2;
    sheet.rotation.z = 0.08;
    sheet.position.set(0.08, 0.017, 0.005);
    g.add(sheet);
    for (let i = 0; i < 6; i++) {
      const line = U.box(0.12 - (i === 5 ? 0.045 : 0), 0.0012, 0.0022, ink, 0.075, 0.0185, -0.072 + i * 0.028);
      line.rotation.y = 0.08;
      g.add(line);
    }
    // 火漆印
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.006, 14), new THREE.MeshStandardMaterial({ color: 0x7d2a22, roughness: 0.5 }));
    wax.position.set(0.11, 0.017, 0.082);
    g.add(wax);
    // 信封叠
    for (let i = 0; i < 3; i++) {
      const env = U.box(0.16, 0.0035, 0.105, i === 1 ? paper : new THREE.MeshStandardMaterial({ color: 0xd9c7a4, roughness: 0.9 }), -0.08 + i * 0.004, 0.022 + i * 0.004, 0.06 - i * 0.015);
      env.rotation.y = 0.22 - i * 0.16;
      g.add(env);
    }
    // 墨水瓶与蘸水笔
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.034, 0.055, 16), glassInk);
    bottle.position.set(-0.16, 0.04, -0.06);
    g.add(bottle);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.022, 0.016, 14), M.brassDark);
    cap.position.set(-0.16, 0.075, -0.06);
    g.add(cap);
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.19, 8), leatherDark);
    pen.rotation.z = Math.PI / 2;
    pen.rotation.y = 0.38;
    pen.position.set(0.02, 0.026, -0.14);
    g.add(pen);
    const nib = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.03, 8), M.brass);
    nib.rotation.z = -Math.PI / 2;
    nib.rotation.y = 0.38;
    nib.position.set(0.128, 0.026, -0.097);
    g.add(nib);
    // 折叠的眼镜
    const lensGeo = new THREE.TorusGeometry(0.026, 0.0028, 6, 18);
    [-1, 1].forEach((s) => {
      const lens = new THREE.Mesh(lensGeo, M.brass);
      lens.rotation.x = -Math.PI / 2;
      lens.position.set(-0.11 + s * 0.03, 0.021, 0.092);
      g.add(lens);
    });
    g.add(U.box(0.012, 0.002, 0.004, M.brass, -0.11, 0.021, 0.092));
    const arm = U.box(0.002, 0.002, 0.07, M.brass, -0.08, 0.021, 0.06);
    arm.rotation.y = -0.35;
    g.add(arm);

    // 星图：小画布手绘星座
    const c = U.makeCanvas(256, 320);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e7dcc4';
    ctx.fillRect(0, 0, 256, 320);
    ctx.strokeStyle = 'rgba(110,92,66,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 236, 300);
    const rng = U.mulberry32(919);
    const stars = [];
    for (let i = 0; i < 30; i++) {
      stars.push([18 + rng() * 220, 20 + rng() * 280]);
    }
    ctx.strokeStyle = 'rgba(70,60,48,0.5)';
    stars.slice(0, 12).forEach((p, i, arr) => {
      if (i === 0) return;
      ctx.beginPath();
      ctx.moveTo(arr[i - 1][0], arr[i - 1][1]);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    });
    ctx.fillStyle = '#3d3428';
    stars.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p[0], p[1], i % 4 === 0 ? 2.2 : 1.1, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(80,64,46,0.6)';
    ctx.font = '9px monospace';
    ctx.fillText('CYGNUS · 秋', 24, 40);
    ctx.fillText('ORION', 170, 260);
    const mapTex = U.canvasTexture(c, { clamp: true, aniso: 4 });
    const chartMat = new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.9 });
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.225), chartMat);
    chart.rotation.x = -Math.PI / 2;
    chart.rotation.z = -0.35;
    chart.position.set(0.19, 0.019, -0.09);
    g.add(chart);
    g.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = false; } });

    const item = { key: 'letters', group: g, lights: [], on: true, interactive: null };
    g.position.set(1.47, 0.462, -3.05);
    g.rotation.y = -0.12;
    g.scale.setScalar(0.9);
    return item;
  }

  /* ———————————————— 扶手椅边的织物篮与拖鞋 ———————————————— */
  function buildKnitting(M) {
    const g = new THREE.Group();
    const straw = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
    const strawDark = new THREE.MeshStandardMaterial({ color: 0x8a673e, roughness: 0.95 });
    const woolRust = new THREE.MeshStandardMaterial({ color: 0xa85b47, roughness: 1 });
    const woolOlive = new THREE.MeshStandardMaterial({ color: 0x7c825e, roughness: 1 });
    const woolCream = new THREE.MeshStandardMaterial({ color: 0xd8c7a4, roughness: 1 });
    const knitMat = new THREE.MeshStandardMaterial({ map: M.clothMap, color: 0xc9b696, roughness: 0.98 });

    // 藤篮
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.145, 0.22, 20, 1, true), straw);
    basket.position.y = 0.115;
    g.add(basket);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.145, 20), strawDark);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = 0.006;
    g.add(bottom);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.012, 6, 24), strawDark);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.225;
    g.add(rim);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rib = U.box(0.014, 0.21, 0.006, strawDark, Math.cos(a) * 0.168, 0.115, Math.sin(a) * 0.168);
      rib.rotation.y = -a;
      g.add(rib);
    }
    // 两团毛线
    const ballA = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), woolRust);
    ballA.position.set(-0.055, 0.21, 0.02);
    ballA.scale.set(1, 0.9, 1);
    g.add(ballA);
    const ballB = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), woolOlive);
    ballB.position.set(0.075, 0.2, -0.035);
    g.add(ballB);
    const yarnA = U.makeCurveTube([
      new THREE.Vector3(-0.07, 0.245, 0.02), new THREE.Vector3(-0.13, 0.28, 0.05),
      new THREE.Vector3(-0.2, 0.16, 0.08), new THREE.Vector3(-0.26, 0.02, 0.11)
    ], 0.0035, woolRust, 30, 5);
    g.add(yarnA);
    // 织了一半的围巾搭在篮沿
    for (let i = 0; i < 5; i++) {
      const fold = new THREE.Mesh(U.roundedBoxGeometry(0.24 - i * 0.012, 0.016, 0.13, 0.006, 0.003), knitMat);
      fold.position.set(-0.02, 0.235 + i * 0.016, 0.15 + i * 0.012);
      fold.rotation.x = -0.22 - i * 0.16;
      fold.rotation.z = 0.05;
      g.add(fold);
    }
    // 毛线针
    [-1, 1].forEach((s) => {
      const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.42, 6), M.brass);
      needle.position.set(0.02 + s * 0.035, 0.36, 0.1);
      needle.rotation.z = 0.42 * s;
      needle.rotation.x = 0.28;
      g.add(needle);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M.brassDark);
      knob.position.set(0.02 + s * 0.11, 0.46, 0.16);
      g.add(knob);
    });
    // 一双毛毡拖鞋
    [-1, 1].forEach((s, i) => {
      const slipper = new THREE.Group();
      const sole = new THREE.Mesh(U.roundedBoxGeometry(0.17, 0.026, 0.1, 0.035, 0.008), strawDark);
      sole.position.y = 0.013;
      slipper.add(sole);
      const upper = new THREE.Mesh(U.roundedBoxGeometry(0.14, 0.055, 0.082, 0.03, 0.01), woolCream);
      upper.position.set(-0.008, 0.048, -0.012);
      slipper.add(upper);
      const band = new THREE.Mesh(U.roundedBoxGeometry(0.095, 0.03, 0.07, 0.02, 0.006), woolRust);
      band.position.set(0.012, 0.062, -0.018);
      slipper.add(band);
      slipper.position.set(0.33 + i * 0.02, 0, 0.2 + s * 0.13);
      slipper.rotation.y = 0.5 + s * 0.28;
      g.add(slipper);
    });
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    const item = { key: 'knitting', group: g, lights: [], on: true, interactive: null };
    /* 跟摇椅组成左前方的阅读角，钢琴前不再是一大片空地 */
    g.position.set(-2.55, 0, 1.5);
    g.rotation.y = 0.55;
    return item;
  }

  WP.buildFurniture = function (M) {
    const items = {};
    const add = (item) => {
      items[item.key] = item;
      return item;
    };
    add(buildRug(M));
    add(buildPiano(M));
    add(buildGuitar(M));
    add(buildArmchair(M));
    add(buildConsole(M));
    add(buildShelves(M));
    add(buildFloorLamp(M));
    add(buildPendant(M));
    add(buildVase(M));
    add(buildCat(M));
    add(buildPlant(M));
    add(buildStringLights(M));
    add(buildCandles(M));
    add(buildCoffeeTable(M));
    add(buildTelescope(M));
    add(buildWallArt(M));
    add(buildLetters(M));
    add(buildKnitting(M));

    /* 第二批陈设：玩偶、水族箱、八音盒、摇椅、边几、屏风与壁灯 */
    if (WP.buildFurnitureExtra) {
      const extra = WP.buildFurnitureExtra(M);
      Object.keys(extra).forEach((key) => add(extra[key]));
    }
    return items;
  };
})();
