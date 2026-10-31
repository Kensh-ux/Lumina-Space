/* 窗畔 · 房间：墙体、地板、窗、窗台与窗帘 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;
  const T = WP.Textures;

  WP.CONFIG = {
    room: { w: 8.8, d: 7.2, h: 3.42, wallZ: -3.6, backZ: 3.6 },
    window: { x0: -2.45, x1: 2.45, y0: 0.46, y1: 3.06, depth: 0.26 },
    camera: { pos: [0.12, 1.6, 2.94], look: [-0.26, 1.36, -3.6], fov: 58 },
    street: { near: -6.25, far: -12.8, facade: -16.4, groundY: -0.2 }
  };
  WP.clock = WP.clock || { time: { value: 0 }, wind: { value: 0 } };

  function makePanelRail(matTrim, matPanel, width, height, x, y, z, rotY) {
    // 一块墙裙：底板 + 线脚 + 内框凹槽
    const g = new THREE.Group();
    const panel = U.box(width, height, 0.035, matPanel, 0, 0, 0);
    panel.receiveShadow = true;
    panel.castShadow = false;
    g.add(panel);
    const frameW = 0.055;
    const innerW = width - 0.24;
    const innerH = height - 0.22;
    const t = 0.016;
    const base = U.box(innerW + frameW * 2, frameW, t, matTrim, 0, innerH / 2 + frameW * 0.5, 0.024);
    const bottom = U.box(innerW + frameW * 2, frameW, t, matTrim, 0, -innerH / 2 - frameW * 0.5, 0.024);
    const left = U.box(frameW, innerH, t, matTrim, -innerW / 2 - frameW / 2, 0, 0.024);
    const right = U.box(frameW, innerH, t, matTrim, innerW / 2 + frameW / 2, 0, 0.024);
    [base, bottom, left, right].forEach((m) => {
      m.castShadow = false;
      g.add(m);
    });
    // 中间微微凸起的芯板
    const inset = U.box(innerW, innerH, 0.018, matPanel, 0, 0, 0.014);
    inset.castShadow = false;
    g.add(inset);
    g.position.set(x, y, z);
    if (rotY) g.rotation.y = rotY;
    return g;
  }

  function makeWindowSash(MATS) {
    const C = WP.CONFIG.window;
    const group = new THREE.Group();
    const frameZ = WP.CONFIG.room.wallZ - 0.03;
    const W = C.x1 - C.x0;
    const H = C.y1 - C.y0;
    const cx = (C.x0 + C.x1) / 2;
    const cy = (C.y0 + C.y1) / 2;
    const sash = MATS.sash;
    const t = 0.075; // 框料宽
    const d = 0.085; // 框料深

    function bar(w, h, x, y, z, mat, depth) {
      const m = U.box(w, h, depth || d, mat || sash, x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
      return m;
    }

    // 外框
    bar(W, t, cx, C.y1 - t / 2, frameZ);
    bar(W, t, cx, C.y0 + t / 2, frameZ);
    bar(t, H, C.x0 + t / 2, cy, frameZ);
    bar(t, H, C.x1 - t / 2, cy, frameZ);

    // 竖梃（三分窗）
    const mull = 0.09;
    const innerL = C.x0 + t;
    const innerR = C.x1 - t;
    const split1 = -0.78;
    const split2 = 0.78;
    bar(mull, H - t * 2, split1, cy, frameZ, sash, d + 0.012);
    bar(mull, H - t * 2, split2, cy, frameZ, sash, d + 0.012);

    // 横梃
    const transomY = 2.26;
    bar(W - t * 2, mull * 0.9, cx, transomY, frameZ, sash, d + 0.012);

    // 每扇窗内再加一根细窗棂，形成古典分格
    const cols = [
      [innerL, split1 - mull / 2],
      [split1 + mull / 2, split2 - mull / 2],
      [split2 + mull / 2, innerR]
    ];
    cols.forEach((c) => {
      const w = c[1] - c[0];
      const x = (c[0] + c[1]) / 2;
      // 上扇短棂
      bar(0.05, C.y1 - t - transomY - 0.02, x, (transomY + C.y1 - t) / 2, frameZ, sash, d - 0.018);
      // 下扇长棂
      bar(0.05, transomY - C.y0 - t - 0.02, x, (C.y0 + t + transomY) / 2, frameZ, sash, d - 0.018);
    });

    // 玻璃
    const glassMat = MATS.glass;
    const panes = [];
    const rows = [
      [C.y0 + t, transomY - 0.035],
      [transomY + 0.035, C.y1 - t]
    ];
    rows.forEach((r) => {
      cols.forEach((c) => {
        const w = c[1] - c[0] - 0.01;
        const h = r[1] - r[0] - 0.01;
        const geo = new THREE.PlaneGeometry(w, h);
        const m = new THREE.Mesh(geo, glassMat);
        m.position.set((c[0] + c[1]) / 2, (r[0] + r[1]) / 2, frameZ - 0.055);
        m.renderOrder = 3;
        m.castShadow = false;
        m.receiveShadow = false;
        group.add(m);
        panes.push(m);
      });
    });

    // 窗棂上的黄铜插销
    const brass = new THREE.MeshStandardMaterial({ color: 0x9a7740, metalness: 0.9, roughness: 0.32 });
    for (let i = 0; i < 2; i++) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.075, 8), brass);
      h.rotation.z = Math.PI / 2;
      h.position.set(i ? split2 : split1, 1.45, frameZ - 0.055);
      group.add(h);
    }

    // 室内窗套线脚
    const trimMat = MATS.trim;
    const arch = 0.17;
    const archD = 0.05;
    const az = WP.CONFIG.room.wallZ + 0.17;
    group.add(U.box(W + arch * 2, arch, archD, trimMat, cx, C.y1 + arch / 2, az));
    group.add(U.box(arch, H + arch, archD, trimMat, C.x0 - arch / 2, cy + arch / 2, az));
    group.add(U.box(arch, H + arch, archD, trimMat, C.x1 + arch / 2, cy + arch / 2, az));
    group.add(U.box(W + arch * 2 + 0.06, 0.055, archD + 0.025, trimMat, cx, C.y1 + arch + 0.027, az + 0.012));
    // 顶部小檐口
    for (let i = 0; i < 3; i++) {
      group.add(U.box(W + 0.12 - i * 0.18, 0.032, 0.055 + i * 0.012, trimMat, cx, C.y1 + 0.055 + i * 0.045, az + 0.03 + i * 0.012));
    }
    // 室内窗台（深胡桃木窗板）
    const stool = U.box(W + 0.42, 0.052, 0.34, MATS.sill, cx, C.y0 - 0.026, WP.CONFIG.room.wallZ + 0.18);
    stool.castShadow = true;
    stool.receiveShadow = true;
    group.add(stool);
    // 窗台下的支撑线脚
    group.add(U.box(W + 0.3, 0.06, 0.06, MATS.trim, cx, C.y0 - 0.085, WP.CONFIG.room.wallZ + 0.32));

    return { group, panes };
  }

  function makeCurtainPanel(MATS, side) {
    const width = 0.9;
    const height = 3.2;
    const segX = 44, segY = 30;
    const geo = new THREE.PlaneGeometry(width, height, segX, segY);
    const pos = geo.attributes.position;
    const rng = U.mulberry32(side > 0 ? 8 : 12);
    const phases = [];
    for (let i = 0; i < 20; i++) phases.push(rng() * Math.PI * 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const v = (y + height / 2) / height; // 0 底 1 顶
      const gather = 0.56 + (1 - v) * 0.5; // 底摆更宽
      const fold = Math.sin(x * 24 + phases[0]) * 0.05 * (0.4 + v * 0.8) +
        Math.sin(x * 11 + phases[1]) * 0.035 +
        Math.sin(x * 43 + phases[2]) * 0.012;
      pos.setX(i, x * gather + Math.sin(x * 8 + phases[3]) * 0.015);
      pos.setZ(i, fold + Math.sin(v * 3 + phases[4]) * 0.015);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      map: MATS.clothMap,
      color: side > 0 ? 0xd8c9ae : 0xe1d3b9,
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = WP.clock.time;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float sway = sin(uTime * 0.55 + position.y * 1.6 + ${side > 0 ? '0.0' : '1.7'}) * 0.012;
         float depth = 0.55 + transformed.y * 0.1;
         transformed.x += sway * depth;
         transformed.z += sin(uTime * 0.37 + position.x * 2.0) * 0.008;`
      );
    };
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(side * 2.5, 1.63, WP.CONFIG.room.wallZ + 0.34);
    mesh.rotation.y = side > 0 ? -0.05 : 0.05;
    return mesh;
  }

  function buildWindowBox() {
    const C = WP.CONFIG.window;
    const W = C.x1 - C.x0;
    const g = new THREE.Group();
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x2f3a32, roughness: 0.75, metalness: 0.15 });
    const box = U.box(W - 0.1, 0.3, 0.32, boxMat, 0, 0.15, 0);
    g.add(box);
    const soil = U.box(W - 0.24, 0.03, 0.24, new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1 }), 0, 0.305, 0);
    g.add(soil);
    const rng = U.mulberry32(77);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4d663f, roughness: 0.85, side: THREE.DoubleSide });
    const flowerMats = [
      new THREE.MeshStandardMaterial({ color: 0xc0574a, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: 0xd4838c, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: 0xe0c28d, roughness: 0.7 })
    ];
    for (let i = 0; i < 42; i++) {
      const x = -W / 2 + 0.25 + rng() * (W - 0.5);
      const z = -0.1 + rng() * 0.2;
      const r = 0.06 + rng() * 0.08;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), leafMat);
      leaf.scale.set(1.2, 0.65 + rng() * 0.4, 0.9);
      leaf.position.set(x, 0.34 + rng() * 0.2, z);
      leaf.rotation.set(rng(), rng() * 3, rng());
      g.add(leaf);
      if (rng() > 0.45) {
        const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035 + rng() * 0.025, 0), flowerMats[Math.floor(rng() * 3)]);
        flower.position.set(x + (rng() - 0.5) * 0.12, 0.48 + rng() * 0.18, z + (rng() - 0.5) * 0.1);
        g.add(flower);
      }
    }
    g.position.set(0, C.y0 - 0.36, WP.CONFIG.room.wallZ - 0.22);
    return g;
  }

  WP.buildRoom = function (scene, MATS) {
    const C = WP.CONFIG;
    const room = new THREE.Group();
    room.name = 'room';
    const wallZ = C.room.wallZ;
    const w2 = C.room.w / 2;
    const d = C.room.d;
    const h = C.room.h;

    const wallMat = MATS.wall;
    const wainscotMat = MATS.wainscot;
    const trimMat = MATS.trim;

    // 地面
    const floorMat = new THREE.MeshStandardMaterial({
      map: MATS.floorMap,
      roughness: 0.6,
      metalness: 0.04,
      envMapIntensity: 0.35
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(C.room.w, d, 1, 1), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (C.room.backZ + wallZ) / 2 + 0.05);
    floor.receiveShadow = true;
    room.add(floor);

    // 天花板
    const ceil = U.box(C.room.w, 0.18, d, new THREE.MeshLambertMaterial({ color: 0xd9cdb9 }), 0, h + 0.09, (C.room.backZ + wallZ) / 2);
    ceil.castShadow = false;
    room.add(ceil);

    // 侧墙
    const leftWall = U.box(0.24, h, d, wallMat, -w2 - 0.12, h / 2, (C.room.backZ + wallZ) / 2);
    leftWall.receiveShadow = true;
    room.add(leftWall);
    const rightWall = U.box(0.24, h, d, wallMat, w2 + 0.12, h / 2, (C.room.backZ + wallZ) / 2);
    rightWall.receiveShadow = true;
    room.add(rightWall);
    // 后墙（相机身后，用于完整空间与反射）
    room.add(U.box(C.room.w + 0.4, h, 0.22, wallMat, 0, h / 2, C.room.backZ + 0.11));

    // 窗墙的四段
    const W = C.window.x1 - C.window.x0;
    const winSideW = (C.room.w - W) / 2;
    const winWallBase = wallZ - 0.13;
    const segL = U.box(winSideW, h, 0.26, wallMat, -W / 2 - winSideW / 2, h / 2, winWallBase);
    const segR = U.box(winSideW, h, 0.26, wallMat, W / 2 + winSideW / 2, h / 2, winWallBase);
    const segTop = U.box(W, h - C.window.y1, 0.26, wallMat, 0, (h + C.window.y1) / 2, winWallBase);
    const segBottom = U.box(W, C.window.y0, 0.26, wallMat, 0, C.window.y0 / 2, winWallBase);
    [segL, segR, segTop, segBottom].forEach((s) => {
      s.castShadow = true;
      s.receiveShadow = true;
      room.add(s);
    });

    // 踢脚线（侧墙 & 窗墙两端）
    const baseH = 0.13;
    const baseD = 0.045;
    room.add(U.box(0.045, baseH, d - 0.1, trimMat, -w2 + 0.02, baseH / 2, (C.room.backZ + wallZ) / 2));
    room.add(U.box(0.045, baseH, d - 0.1, trimMat, w2 - 0.02, baseH / 2, (C.room.backZ + wallZ) / 2));
    room.add(U.box(winSideW, baseH, 0.045, trimMat, -W / 2 - winSideW / 2, baseH / 2, wallZ + 0.19));
    room.add(U.box(winSideW, baseH, 0.045, trimMat, W / 2 + winSideW / 2, baseH / 2, wallZ + 0.19));

    // 墙裙（侧墙近窗段）
    const panelW = 4.05;
    const panelH = 0.92;
    const railZ = wallZ + 0.18 + panelW / 2;
    [-1, 1].forEach((side) => {
      const g = makePanelRail(trimMat, wainscotMat, panelW, panelH, side * (w2 - 0.045), panelH / 2 + 0.13, railZ, side > 0 ? -Math.PI / 2 : Math.PI / 2);
      g.children.forEach((c) => { c.castShadow = false; });
      room.add(g);
      // 顶部腰线
      room.add(U.box(0.06, 0.07, panelW + 0.05, trimMat, side * (w2 - 0.055), panelH + 0.16, railZ));
      // 墙裙上的壁灯座（仅右侧保留小铜钩）
      if (side > 0) {
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 16), MATS.brass);
        hook.position.set(w2 - 0.11, 1.62, -2.2);
        hook.rotation.y = Math.PI / 2;
        room.add(hook);
      }
    });

    // 窗墙两侧的墙裙（窗边小段）
    [-1, 1].forEach((side) => {
      const width = winSideW - 0.12;
      const g = makePanelRail(trimMat, wainscotMat, width, 0.88, side * (W / 2 + winSideW / 2), 0.57, wallZ + 0.18, 0);
      room.add(g);
      room.add(U.box(width + 0.04, 0.065, 0.05, trimMat, side * (W / 2 + winSideW / 2), 1.03, wallZ + 0.2));
    });

    // 顶角线（三面）
    const crownMat = trimMat;
    const crownH = 0.11;
    const crownD = 0.09;
    room.add(U.box(C.room.w, crownH, crownD, crownMat, 0, h - crownH / 2 - 0.005, wallZ + 0.16));
    room.add(U.box(crownD, crownH, d, crownMat, -w2 + crownD / 2, h - crownH / 2 - 0.005, (C.room.backZ + wallZ) / 2));
    room.add(U.box(crownD, crownH, d, crownMat, w2 - crownD / 2, h - crownH / 2 - 0.005, (C.room.backZ + wallZ) / 2));
    // 顶角线层次
    room.add(U.box(C.room.w, 0.035, 0.12, crownMat, 0, h - crownH - 0.025, wallZ + 0.2));

    // 窗
    const sash = makeWindowSash(MATS);
    room.add(sash.group);

    // 窗帘杆
    const rodMat = MATS.rod;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 5.55, 12), rodMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 3.25, wallZ + 0.35);
    rod.castShadow = true;
    room.add(rod);
    [-1, 1].forEach((side) => {
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), rodMat);
      finial.position.set(side * 2.79, 3.25, wallZ + 0.35);
      room.add(finial);
      const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8), rodMat);
      bracket.rotation.x = Math.PI / 2;
      bracket.position.set(side * 2.65, 3.25, wallZ + 0.27);
      room.add(bracket);
      // 窗帘环
      for (let i = 0; i < 6; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.006, 5, 14), MATS.brass);
        ring.position.set(side * (2.18 + i * 0.122), 3.25, wallZ + 0.35);
        room.add(ring);
      }
    });

    // 窗帘
    const curtainL = makeCurtainPanel(MATS, -1);
    const curtainR = makeCurtainPanel(MATS, 1);
    const curtainGroup = new THREE.Group();
    curtainGroup.add(curtainL, curtainR);
    curtainGroup.name = 'curtains';
    room.add(curtainGroup);

    // 窗下长凳
    const bench = new THREE.Group();
    bench.name = 'windowSeat';
    const benchW = W - 0.08;
    const benchD = 0.54;
    const benchZ = wallZ + 0.42;
    const benchBase = U.box(benchW, 0.34, benchD, MATS.wainscot, 0, 0.17, 0);
    bench.add(benchBase);
    // 抽屉面
    for (let i = 0; i < 3; i++) {
      const dw = benchW / 3 - 0.1;
      const dx = (i - 1) * (benchW / 3);
      const front = U.box(dw, 0.19, 0.022, MATS.wainscotLight, dx, 0.17, benchD / 2 + 0.012);
      front.castShadow = false;
      bench.add(front);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), MATS.brass);
      knob.position.set(dx, 0.18, benchD / 2 + 0.035);
      bench.add(knob);
    }
    // 坐垫
    const cushion = new THREE.Mesh(U.roundedBoxGeometry(benchW + 0.02, 0.12, benchD + 0.06, 0.045, 0.012), MATS.linenCream);
    cushion.position.set(0, 0.4, 0.02);
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    bench.add(cushion);
    // 抱枕：只留窗台右端一只，左端让给水族箱与花器，避免互相挤压
    const pillowSpecs = [
      { x: 1.98, color: MATS.linenCream, w: 0.44, h: 0.42, d: 0.14, rot: -0.08 }
    ];
    pillowSpecs.forEach((p) => {
      const pillow = new THREE.Mesh(U.roundedBoxGeometry(p.w, p.h, p.d, 0.11, 0.025), p.color);
      pillow.position.set(p.x, 0.63, -0.03);
      pillow.rotation.z = p.rot;
      pillow.rotation.x = -0.12;
      pillow.castShadow = true;
      bench.add(pillow);
    });
    bench.position.set(0, 0, benchZ - 0.02);
    room.add(bench);

    // 窗外的花箱
    room.add(buildWindowBox());

    // 室内外墙面之间的窗洞侧壁
    const revealMat = MATS.sash;
    const R = C.window;
    room.add(U.box(0.045, R.y1 - R.y0, R.depth, revealMat, R.x0 + 0.02, (R.y0 + R.y1) / 2, wallZ - 0.13));
    room.add(U.box(0.045, R.y1 - R.y0, R.depth, revealMat, R.x1 - 0.02, (R.y0 + R.y1) / 2, wallZ - 0.13));
    room.add(U.box(W, 0.045, R.depth, revealMat, 0, R.y1 - 0.02, wallZ - 0.13));
    room.add(U.box(W, 0.045, R.depth, revealMat, 0, R.y0 + 0.02, wallZ - 0.13));

    // 墙上小物：金色小挂钩与开关
    const switchPlate = U.box(0.075, 0.115, 0.012, new THREE.MeshStandardMaterial({ color: 0xd8cbb5, roughness: 0.5 }), 1.62, 1.18, wallZ + 0.19);
    room.add(switchPlate);
    const toggle = U.box(0.028, 0.045, 0.02, MATS.brass, 1.62, 1.18, wallZ + 0.2);
    room.add(toggle);

    room.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = o.castShadow && o.geometry.type !== 'PlaneGeometry';
      }
    });

    // 供外部使用
    room.userData = { curtains: curtainGroup, windowPanes: sash.panes, bench: bench };
    // 静态合批（窗帘顶点在着色器里摆动，保留独立）
    U.mergeStatic(room, { exclude: [curtainGroup] });
    return room;
  };

  WP.makeCurtainPanel = makeCurtainPanel;
})();
