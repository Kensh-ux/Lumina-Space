/* 窗畔 · 对街建筑：咖啡店、花房、旧书店、住宅、路灯与树 */
(function () {
  'use strict';
  window.WP = window.WP || {};
  const U = WP.U;
  const SK = WP.SK;
  const Z = -16.4;          // 对街立面
  const BASE = SK.BASE;     // 人行道面

  let ctx, R, M, T;

  function snowBox(parent, w, h, d, x, y, z) {
    const m = SK.box(parent, w, h, d, ctx.snowMat, x, y, z, false, false);
    ctx.addSnow(m);
    return m;
  }

  function cornice(parent, x, y, w, mat, z) {
    z = z === undefined ? Z + 0.06 : z;
    SK.box(parent, w + 0.16, 0.14, 0.3, mat, x, y, z);
    SK.box(parent, w + 0.34, 0.06, 0.4, mat, x, y + 0.1, z + 0.02);
    SK.box(parent, w + 0.04, 0.05, 0.46, mat, x, y + 0.17, z + 0.03);
    snowBox(parent, w + 0.2, 0.05, 0.2, x, y + 0.215, z + 0.06);
  }

  function planter(parent, x, y, z, w, seed, flowers) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    SK.box(g, w, 0.2, 0.24, M.planter, 0, 0.1, 0);
    SK.box(g, w - 0.04, 0.03, 0.2, new THREE.MeshStandardMaterial({ color: 0x2b2017, roughness: 1 }), 0, 0.205, 0);
    const rng = U.mulberry32(seed || 11);
    const leafMat = M.leafGreen;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.09), leafMat);
      leaf.position.set((rng() - 0.5) * (w - 0.12), 0.26 + rng() * 0.13, (rng() - 0.5) * 0.14);
      leaf.rotation.set(rng() * 2, rng() * 3, rng() * 1.6);
      leaf.castShadow = false;
      g.add(leaf);
    }
    if (flowers) {
      const cols = [0xc97d78, 0xe3c394, 0xc4a2b0, 0xd8a05d];
      for (let i = 0; i < 5; i++) {
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.026 + rng() * 0.018, 0),
          new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.7 }));
        b.position.set((rng() - 0.5) * (w - 0.16), 0.32 + rng() * 0.1, (rng() - 0.5) * 0.1);
        g.add(b);
      }
    }
    snowBox(g, w * 0.9, 0.035, 0.18, 0, 0.235, 0);
    return g;
  }

  /* 住宅窗：暖色室内 + 深色窗框 + 窗台 */
  function apartmentWindow(x, y, z, w, h, variant, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    g.position.set(x, y, z);
    R.add(g);
    const mat = M.aptMat[variant % M.aptMat.length];
    const glass = SK.plane(g, w, h, mat, 0, 0, 0);
    glass.castShadow = false;
    glass.receiveShadow = false;
    SK.frame(g, 0, 0, 0.055, w, h, opts.frame || M.aptFrame, 0.065, 0.1);
    // 中挺与横梃
    SK.box(g, 0.04, h - 0.13, 0.05, opts.frame || M.aptFrame, 0, 0, 0.06, false, false);
    SK.box(g, w - 0.13, 0.035, 0.05, opts.frame || M.aptFrame, 0, h * 0.14, 0.06, false, false);
    // 窗台
    SK.box(g, w + 0.24, 0.07, 0.16, opts.sill || M.cream, 0, -h / 2 - 0.035, 0.08);
    snowBox(g, w + 0.18, 0.03, 0.13, 0, -h / 2 + 0.02, 0.1);
    if (opts.planter) {
      planter(g, 0, -h / 2 - 0.19, 0.1, w + 0.06, 21 + variant, opts.flowers);
    }
    // 窗帘盒
    SK.box(g, w + 0.16, 0.09, 0.13, opts.frame || M.aptFrame, 0, h / 2 + 0.06, 0.05, false, false);
    return g;
  }

  /* 店铺橱窗 */
  function shopWindow(x, y, z, w, h, mat, frameMat, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    g.position.set(x, y, z);
    R.add(g);
    const glass = SK.plane(g, w, h, mat, 0, 0, 0);
    glass.castShadow = false;
    glass.receiveShadow = false;
    SK.frame(g, 0, 0, 0.06, w, h, frameMat, opts.frameW || 0.1, 0.14);
    // 竖梃
    const cols = opts.cols === undefined ? 3 : opts.cols;
    for (let i = 1; i < cols; i++) {
      SK.box(g, 0.045, h - 0.18, 0.06, frameMat, -w / 2 + (w / cols) * i, 0, 0.075, false, false);
    }
    // 横梃
    if (opts.transom !== false) {
      SK.box(g, w - 0.18, 0.05, 0.06, frameMat, 0, h / 2 - 0.36, 0.075, false, false);
    }
    // 宽厚窗台
    SK.box(g, w + 0.3, 0.1, 0.24, opts.sill || M.cream, 0, -h / 2 - 0.05, 0.09);
    snowBox(g, w + 0.24, 0.035, 0.18, 0, -h / 2 + 0.005, 0.12);
    // 底部木裙板
    SK.box(g, w + 0.16, 0.2, 0.08, frameMat, 0, -h / 2 - 0.19, 0.03);
    return g;
  }

  function door(x, y, z, w, h, glassMat, frameMat, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    g.position.set(x, y, z);
    R.add(g);
    // 门洞内的暗面
    SK.box(g, w + 0.22, h + 0.2, 0.12, new THREE.MeshStandardMaterial({ color: 0x171410, roughness: 0.9 }), 0, 0.02, -0.06, false, false);
    // 门扇
    SK.box(g, w, h, 0.07, opts.mat || M.darkGreen, 0, 0, 0);
    // 玻璃
    if (glassMat) {
      const glass = SK.plane(g, w * 0.66, h * 0.5, glassMat, 0, h * 0.16, 0.042);
      glass.castShadow = false;
      glass.receiveShadow = false;
    }
    // 门框
    SK.box(g, w + 0.2, 0.1, 0.16, frameMat, 0, h / 2 + 0.05, 0.02);
    SK.box(g, 0.1, h + 0.2, 0.16, frameMat, -w / 2 - 0.05, 0, 0.02);
    SK.box(g, 0.1, h + 0.2, 0.16, frameMat, w / 2 + 0.05, 0, 0.02);
    // 黄铜把手
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.brass);
    handle.position.set(w * 0.34, -0.05, 0.1);
    g.add(handle);
    const plate = SK.box(g, 0.08, 0.24, 0.015, M.brass, w * 0.34, 0.03, 0.055, false, false);
    plate.castShadow = false;
    // 踏脚铜片
    SK.box(g, w - 0.12, 0.09, 0.02, M.brassDark, 0, -h / 2 + 0.1, 0.045, false, false);
    // 台阶
    SK.box(g, w + 0.5, 0.12, 0.36, M.trimStone, 0, -h / 2 - 0.06, 0.3, false, true);
    SK.box(g, w + 0.34, 0.1, 0.24, M.trimStone, 0, -h / 2 - 0.17, 0.46, false, true);
    snowBox(g, w + 0.28, 0.035, 0.18, 0, -h / 2 + 0.015, 0.44);
    return g;
  }

  function awningSnow(g, w, depth, drop) {
    snowBox(g, w * 0.94, 0.045, 0.12, 0, 0.015, depth * 0.98);
    snowBox(g, w * 0.9, 0.04, 0.16, 0, -drop + 0.04, depth * 0.55);
  }

  function hangingSign(x, y, z, texture, w, h, opts) {
    opts = opts || {};
    const g = new THREE.Group();
    g.position.set(x, y, z);
    R.add(g);
    // 从墙面伸出的铁艺支架
    SK.box(g, 0.045, 0.045, 0.58, M.iron, 0, h / 2 + 0.2, -0.29);
    SK.box(g, 0.045, 0.045, 0.045, M.iron, 0, h / 2 + 0.2, -0.57);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 5), M.iron);
    strut.position.set(0, h / 2 - 0.12, -0.36);
    strut.rotation.x = Math.PI / 2.9;
    g.add(strut);
    // 吊链
    for (let i = 0; i < 2; i++) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), M.iron);
      chain.position.set(0.0, h / 2 + 0.1, (i ? 1 : -1) * w * 0.3);
      g.add(chain);
    }
    // 招牌：略微转向窗口，让斜对面也能读到
    const board = new THREE.Group();
    board.rotation.y = -0.78;
    g.add(board);
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    sign.rotation.y = Math.PI / 2;
    board.add(sign);
    // 细边框
    SK.box(board, 0.05, 0.05, w + 0.05, M.iron, 0, h / 2 + 0.025, 0, false, false);
    SK.box(board, 0.05, 0.05, w + 0.05, M.iron, 0, -h / 2 - 0.025, 0, false, false);
    SK.box(board, 0.05, h, 0.05, M.iron, 0, 0, w / 2 + 0.025, false, false);
    SK.box(board, 0.05, h, 0.05, M.iron, 0, 0, -w / 2 - 0.025, false, false);
    snowBox(board, 0.06, 0.03, w * 0.8, 0, h / 2 + 0.04, 0);
    return g;
  }

  /* ———————————————————— 咖啡店 ———————————————————— */
  function makeCafe() {
    const w = 4.3, h = 5.8, d = 4.2, x = -4.55;
    R.add(SK.box(R, w, h, d, M.brickCafe, x, BASE + h / 2, Z - d / 2));
    // 石质墙基
    SK.box(R, w + 0.08, 0.34, d + 0.06, M.trimStone, x, BASE + 0.17, Z - d / 2);
    // 店面木作
    SK.box(R, w - 0.12, 2.92, 0.09, M.darkGreen, x, BASE + 1.46, Z + 0.03);
    SK.box(R, 0.18, 3.05, 0.14, M.cream, x - w / 2 + 0.09, BASE + 1.525, Z + 0.08);
    SK.box(R, 0.18, 3.05, 0.14, M.cream, x + w / 2 - 0.09, BASE + 1.525, Z + 0.08);
    // 橱窗
    shopWindow(x - 0.5, BASE + 1.62, Z + 0.095, 2.5, 1.9, M.shopGlass.cafe, M.cream, { cols: 3, flowers: false });
    // 门
    door(x + 1.5, BASE + 1.15, Z + 0.11, 0.86, 2.28, M.shopGlass.cafe, M.cream, { mat: M.darkGreen });
    // 门上小招牌
    const open = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.16), M.signMat.signOpen);
    open.position.set(x + 1.5, BASE + 1.68, Z + 0.17);
    R.add(open);
    // 遮阳篷
    const aw = SK.awning(ctx, {
      x: x - 0.42, y: BASE + 3.04, z: Z + 0.07,
      w: 3.5, depth: 1.02, drop: 0.24, sag: 0.06,
      map: T.awningCafe, valance: T.valanceCafe, valanceH: 0.32, repeat: 2
    });
    awningSnow(aw, 3.5, 1.02, 0.24);
    // 店招
    SK.box(R, 3.24, 0.72, 0.12, M.cream, x - 0.35, BASE + 3.57, Z + 0.12);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 0.6), M.signMat.signCafe);
    sign.position.set(x - 0.35, BASE + 3.57, Z + 0.185);
    R.add(sign);
    // 吊挂小招牌
    hangingSign(x + 2.12, BASE + 2.47, Z + 0.55, T.signCafeSide, 0.42, 0.9, {});
    // 楼上窗
    apartmentWindow(x - 1.12, BASE + 4.66, Z + 0.055, 1.02, 1.36, 0, { planter: true, flowers: true });
    apartmentWindow(x + 1.05, BASE + 4.66, Z + 0.055, 1.02, 1.36, 2, { planter: true, flowers: true });
    // 壁灯
    const wl = new THREE.Group();
    wl.position.set(x + 1.94, BASE + 3.95, Z + 0.18);
    R.add(wl);
    SK.box(wl, 0.05, 0.05, 0.32, M.iron, 0, 0.18, -0.12);
    SK.box(wl, 0.12, 0.26, 0.12, M.lampGlass, 0, 0, 0.02, false, false);
    SK.box(wl, 0.16, 0.04, 0.16, M.iron, 0, 0.15, 0.02);
    SK.box(wl, 0.14, 0.03, 0.14, M.iron, 0, -0.15, 0.02);
    const wg = SK.glow(wl, ctx.glowTex, 0xffbd78, 0, 0.75, 0, 0, 0.02);
    ctx.addLamp({ glow: wg, glowBase: 0.42 });
    // 屋顶檐口
    cornice(R, x, BASE + h - 0.06, w, M.cream);
    // 烟囱
    const chim = SK.box(R, 0.56, 1.1, 0.62, M.brickCafe, x - 1.35, BASE + h + 0.55, Z - 1.8);
    SK.box(R, 0.7, 0.09, 0.76, M.trimStone, x - 1.35, BASE + h + 1.14, Z - 1.8);
    snowBox(R, 0.62, 0.05, 0.68, x - 1.35, BASE + h + 1.2, Z - 1.8);
    // 檐口下小灯串
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      pts.push(new THREE.Vector3(x - 1.85 + i * 0.92, BASE + 3.72 - (i === 0 || i === 4 ? 0 : 0.06), Z + 0.23));
    }
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x29241e, roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[i + 1];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const len = a.distanceTo(b);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 4), wireMat);
      seg.position.copy(mid);
      seg.rotation.z = Math.PI / 2;
      R.add(seg);
    }
    for (let i = 0; i < 4; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.027, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffdba8 }));
      bulb.position.set(x - 1.39 + i * 0.92, BASE + 3.67, Z + 0.23);
      R.add(bulb);
    }
    // 落水管
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h, 8), M.iron);
    pipe.position.set(x + w / 2 - 0.06, BASE + h / 2, Z + 0.11);
    pipe.castShadow = true;
    R.add(pipe);
    for (let i = 0; i < 3; i++) {
      SK.box(R, 0.1, 0.04, 0.1, M.iron, x + w / 2 - 0.06, BASE + 1.4 + i * 1.7, Z + 0.08);
    }
    // 门边盆栽
    planter(R, x + 2.28, BASE, Z + 0.72, 0.34, 31, true);
    // 墙上雨痕
    const stain = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6), new THREE.MeshBasicMaterial({
      map: T.stone({ seed: 55, repeat: [1, 1] }), color: 0x6e665b, transparent: true, opacity: 0.16, depthWrite: false
    }));
    stain.position.set(x - 1.95, BASE + 1.8, Z + 0.015);
    R.add(stain);
  }

  /* ———————————————————— 花房 ———————————————————— */
  function makeFlower() {
    const w = 2.95, h = 3.42, d = 3.6, x = 0.0;
    R.add(SK.box(R, w, h, d, M.plasterFlower, x, BASE + h / 2, Z - d / 2));
    SK.box(R, w + 0.06, 0.3, d + 0.04, M.trimStone, x, BASE + 0.15, Z - d / 2);
    // 店面
    SK.box(R, w - 0.1, 2.42, 0.09, M.greenPaint, x, BASE + 1.21, Z + 0.03);
    // 橱窗
    shopWindow(x - 0.38, BASE + 1.31, Z + 0.095, 1.82, 1.62, M.shopGlass.flower, M.cream, { cols: 2 });
    // 门
    door(x + 1.04, BASE + 1.02, Z + 0.11, 0.62, 2.02, M.shopGlass.flower, M.cream, { mat: M.greenPaint });
    // 遮阳篷
    const aw = SK.awning(ctx, {
      x: x - 0.1, y: BASE + 2.62, z: Z + 0.07,
      w: 2.75, depth: 0.82, drop: 0.2, sag: 0.05,
      map: T.awningFlower, valance: T.valanceFlower, valanceH: 0.28, repeat: 2
    });
    awningSnow(aw, 2.75, 0.82, 0.2);
    // 店招
    SK.box(R, 2.4, 0.46, 0.1, M.cream, x - 0.14, BASE + 3.02, Z + 0.11);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 0.4), M.signMat.signFlower);
    sign.position.set(x - 0.14, BASE + 3.02, Z + 0.17);
    R.add(sign);
    // 吊挂
    hangingSign(x + 1.62, BASE + 1.98, Z + 0.52, T.signFlowerSide, 0.44, 0.82, {});
    // 屋顶露台栏杆
    const railY = BASE + h + 0.34;
    SK.box(R, w - 0.16, 0.05, 0.1, M.cream, x, railY, Z + 0.2);
    SK.box(R, w - 0.16, 0.06, 0.12, M.cream, x, railY + 0.5, Z + 0.2);
    for (let i = 0; i < 9; i++) {
      const bx = x - (w - 0.4) / 2 + (i / 8) * (w - 0.4);
      SK.box(R, 0.035, 0.5, 0.035, M.iron, bx, railY + 0.25, Z + 0.2, false, false);
    }
    // 露台上的花箱
    for (let i = 0; i < 2; i++) {
      planter(R, x - 0.7 + i * 1.4, BASE + h + 0.02, Z + 0.35, 0.72, 61 + i, true);
    }
    snowBox(R, w - 0.2, 0.045, 0.1, x, railY + 0.53, Z + 0.2);
    // 露台爬藤
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x415a3c, roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 16; i++) {
      const vx = x - 1.1 + (i % 8) * 0.3;
      const vy = BASE + h - 0.06 - Math.floor(i / 8) * 0.16;
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.09), vineMat);
      leaf.position.set(vx, vy, Z + 0.22);
      leaf.rotation.set(Math.random() * 2, Math.random() * 3, Math.random());
      leaf.castShadow = false;
      R.add(leaf);
    }
    // 店前灯串
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x2d2a23, roughness: 0.8 });
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x - 1.32, BASE + 2.42, Z + 0.35),
      new THREE.Vector3(x, BASE + 2.22, Z + 0.4),
      new THREE.Vector3(x + 1.32, BASE + 2.42, Z + 0.35)
    );
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0045, 4, false), wireMat);
    R.add(wire);
    for (let i = 0; i <= 8; i++) {
      const p = curve.getPoint(i / 8);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a6 }));
      bulb.position.copy(p).add(new THREE.Vector3(0, -0.035, 0));
      R.add(bulb);
    }
    // 门牌
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), M.signMat.signAddress);
    plate.position.set(x + 1.04, BASE + 2.2, Z + 0.15);
    R.add(plate);
    // 屋顶檐口
    cornice(R, x, BASE + h - 0.05, w, M.cream);
    // 屋顶上的小烟囱 / 通风管
    SK.box(R, 0.3, 0.5, 0.3, M.plasterFlower, x + 0.95, BASE + h + 0.25, Z - 2.1);
    snowBox(R, 0.34, 0.04, 0.34, x + 0.95, BASE + h + 0.51, Z - 2.1);
    // 墙面小灯
    const wl = new THREE.Group();
    wl.position.set(x + 1.44, BASE + 2.28, Z + 0.14);
    R.add(wl);
    SK.box(wl, 0.08, 0.14, 0.08, M.brass, 0, 0.09, -0.03, false, false);
    SK.box(wl, 0.1, 0.16, 0.1, M.lampGlass, 0, -0.02, 0.02, false, false);
    const wg = SK.glow(wl, ctx.glowTex, 0xffc487, 0, 0.6, 0, 0, 0.03);
    ctx.addLamp({ glow: wg, glowBase: 0.35 });
  }

  /* ———————————————————— 旧书店 ———————————————————— */
  function makeBookstore() {
    const w = 4.3, h = 6.1, d = 4.2, x = 4.5;
    R.add(SK.box(R, w, h, d, M.plasterBook, x, BASE + h / 2, Z - d / 2));
    SK.box(R, w + 0.06, 0.32, d + 0.04, M.trimStone, x, BASE + 0.16, Z - d / 2);
    // 店面木作
    SK.box(R, w - 0.12, 2.94, 0.09, M.darkGreen, x, BASE + 1.47, Z + 0.03);
    SK.box(R, 0.2, 3.08, 0.16, M.cream, x - w / 2 + 0.1, BASE + 1.54, Z + 0.08);
    SK.box(R, 0.2, 3.08, 0.16, M.cream, x + w / 2 - 0.1, BASE + 1.54, Z + 0.08);
    // 橱窗与门
    shopWindow(x + 0.42, BASE + 1.62, Z + 0.095, 2.42, 1.98, M.shopGlass.book, M.cream, { cols: 3 });
    door(x - 1.52, BASE + 1.15, Z + 0.11, 0.84, 2.28, M.shopGlass.book, M.cream, { mat: M.darkGreen });
    // 遮阳篷
    const aw = SK.awning(ctx, {
      x: x + 0.36, y: BASE + 3.08, z: Z + 0.07,
      w: 3.4, depth: 0.95, drop: 0.22, sag: 0.05,
      map: T.awningBook, valance: T.valanceBook, valanceH: 0.3, repeat: 2
    });
    awningSnow(aw, 3.4, 0.95, 0.22);
    // 店招
    SK.box(R, 3.2, 0.68, 0.12, M.cream, x + 0.32, BASE + 3.58, Z + 0.12);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.02, 0.56), M.signMat.signBook);
    sign.position.set(x + 0.32, BASE + 3.58, Z + 0.185);
    R.add(sign);
    // 吊挂
    hangingSign(x + 2.14, BASE + 2.55, Z + 0.55, T.signBookSide, 0.42, 0.86, {});
    // 楼上窗
    apartmentWindow(x - 1.15, BASE + 4.7, Z + 0.055, 1.0, 1.3, 1, { planter: true, flowers: false });
    apartmentWindow(x + 1.12, BASE + 4.7, Z + 0.055, 1.0, 1.3, 4, { planter: true, flowers: true });
    // 壁灯
    const wl = new THREE.Group();
    wl.position.set(x - 2.03, BASE + 4.0, Z + 0.18);
    R.add(wl);
    SK.box(wl, 0.05, 0.05, 0.3, M.iron, 0, 0.16, -0.1);
    SK.box(wl, 0.12, 0.24, 0.12, M.lampGlass, 0, 0, 0.02, false, false);
    SK.box(wl, 0.16, 0.04, 0.16, M.iron, 0, 0.14, 0.02);
    const wg = SK.glow(wl, ctx.glowTex, 0xffbd78, 0, 0.7, 0, 0, 0.03);
    ctx.addLamp({ glow: wg, glowBase: 0.4 });
    // 檐口、烟囱
    cornice(R, x, BASE + h - 0.06, w, M.cream);
    const chim = SK.box(R, 0.6, 1.25, 0.65, M.plasterBook, x + 1.3, BASE + h + 0.62, Z - 2.0);
    SK.box(R, 0.74, 0.1, 0.8, M.trimStone, x + 1.3, BASE + h + 1.29, Z - 2.0);
    snowBox(R, 0.66, 0.05, 0.72, x + 1.3, BASE + h + 1.36, Z - 2.0);
    // 落水管
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h, 8), M.iron);
    pipe.position.set(x - w / 2 + 0.06, BASE + h / 2, Z + 0.11);
    pipe.castShadow = true;
    R.add(pipe);
    // 门边小书架
    const shelf = new THREE.Group();
    shelf.position.set(x - 2.45, BASE, Z + 0.62);
    R.add(shelf);
    SK.box(shelf, 1.0, 0.06, 0.38, M.woodDark, 0, 0.62, 0);
    SK.box(shelf, 1.0, 0.06, 0.38, M.woodDark, 0, 0.32, 0);
    SK.box(shelf, 0.06, 0.7, 0.38, M.woodDark, -0.47, 0.38, 0);
    SK.box(shelf, 0.06, 0.7, 0.38, M.woodDark, 0.47, 0.38, 0);
    const bookCols = [0x6e3c32, 0x34483d, 0x9a784c, 0x2f3f52, 0x74603f];
    const rng = U.mulberry32(88);
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < 7; i++) {
        const bw = 0.08 + rng() * 0.04;
        const bh = 0.2 + rng() * 0.06;
        const b = SK.box(shelf, bw, bh, 0.26, new THREE.MeshStandardMaterial({ color: bookCols[(i + s) % bookCols.length], roughness: 0.8 }),
          -0.42 + i * 0.12, (s ? 0.65 : 0.35) + bh / 2, 0);
        b.rotation.z = (rng() - 0.5) * 0.08;
      }
    }
    snowBox(shelf, 0.95, 0.035, 0.34, 0, 0.655, 0);
    // 雨痕
    const stain = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 2.0), new THREE.MeshBasicMaterial({
      map: T.stone({ seed: 56, repeat: [1, 1] }), color: 0x6a645b, transparent: true, opacity: 0.14, depthWrite: false
    }));
    stain.position.set(x + 1.95, BASE + 1.2, Z + 0.015);
    R.add(stain);
  }

  /* ———————————————————— 巷口 ———————————————————— */
  function makeAlley(x) {
    // 暗巷的底与侧壁
    const dark = new THREE.MeshStandardMaterial({ color: 0x191b19, roughness: 0.95 });
    const floor = SK.box(R, 0.92, 0.05, 2.4, dark, x, BASE + 0.02, Z - 1.1, false, true);
    const back = SK.box(R, 0.92, 4.4, 0.12, new THREE.MeshStandardMaterial({ color: 0x232521, roughness: 0.95 }), x, BASE + 2.2, Z - 2.3, false, true);
    // 巷内微光
    const lamp = SK.box(R, 0.16, 0.2, 0.12, M.lampGlass, x, BASE + 2.5, Z - 0.4, false, false);
    const glow = SK.glow(R, ctx.glowTex, 0xffb56f, 0.35, 0.8, x, BASE + 2.5, Z - 0.35);
    ctx.addLamp({ glow, glowBase: 0.32 });
    // 杂物
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x5a4934, roughness: 0.9 });
    SK.box(R, 0.4, 0.3, 0.36, crateMat, x - 0.18, BASE + 0.17, Z - 0.7);
    SK.box(R, 0.34, 0.24, 0.3, crateMat, x + 0.2, BASE + 0.13, Z - 1.0);
    snowBox(R, 0.36, 0.04, 0.32, x + 0.2, BASE + 0.27, Z - 1.0);
    snowBox(R, 0.38, 0.035, 0.34, x - 0.18, BASE + 0.335, Z - 0.7);
    // 排水管
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 4.2, 8), M.iron);
    pipe.position.set(x + 0.38, BASE + 2.1, Z + 0.06);
    R.add(pipe);
    // 猫影
    const cat = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0x141312 }));
    cat.scale.set(1.5, 1.0, 0.9);
    cat.position.set(x + 0.04, BASE + 0.16, Z - 0.35);
    R.add(cat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), cat.material);
    head.position.set(x - 0.12, BASE + 0.25, Z - 0.35);
    R.add(head);
  }

  /* ———————————————————— 路灯 ———————————————————— */
  function makeLamp(x, z, scale, withLight) {
    scale = scale || 1;
    const g = new THREE.Group();
    g.position.set(x, -0.155, z);
    g.scale.setScalar(scale);
    R.add(g);
    const iron = M.iron;
    // 基座
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.14, 12), iron);
    base.position.y = 0.07;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);
    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.34, 12), iron);
    base2.position.y = 0.3;
    base2.castShadow = true;
    g.add(base2);
    // 柱
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 2.92, 10), iron);
    post.position.y = 1.82;
    post.castShadow = true;
    g.add(post);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 5, 12), M.brassDark);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.62 + i * 0.9;
      g.add(ring);
    }
    // 灯头底托
    const lanternY = 3.5;
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.11, 0.1, 8), iron);
    bottom.position.y = lanternY - 0.28;
    bottom.castShadow = true;
    g.add(bottom);
    // 四面玻璃
    const glassMat = M.lampGlass.clone();
    for (let i = 0; i < 4; i++) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.42), glassMat);
      pane.position.set(Math.sin(i * Math.PI / 2) * 0.15, lanternY, Math.cos(i * Math.PI / 2) * 0.15);
      pane.rotation.y = i * Math.PI / 2;
      g.add(pane);
      const bar = SK.box(g, 0.022, 0.46, 0.022, iron,
        Math.sin(i * Math.PI / 2 + Math.PI / 4) * 0.2, lanternY, Math.cos(i * Math.PI / 2 + Math.PI / 4) * 0.2, false, false);
    }
    // 顶
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.22, 4), iron);
    cap.position.y = lanternY + 0.33;
    cap.rotation.y = Math.PI / 4;
    cap.castShadow = true;
    g.add(cap);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), iron);
    finial.position.y = lanternY + 0.47;
    g.add(finial);
    // 灯泡与光晕
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd7a0, transparent: true, opacity: 0.95 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), bulbMat);
    bulb.position.y = lanternY;
    g.add(bulb);
    const glow = SK.glow(g, ctx.glowTex, 0xffb66c, 0.5, 1.55, 0, lanternY, 0);
    // 雪帽
    snowBox(g, 0.32, 0.05, 0.2, 0, lanternY + 0.46, 0);
    // 点光源
    let light = null;
    if (withLight) {
      light = new THREE.PointLight(0xffab62, 1.05, 9.5, 2);
      light.position.y = lanternY - 0.05;
      g.add(light);
    }
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = o.castShadow && o.geometry.type !== 'PlaneGeometry';
      }
    });
    ctx.addLamp({ light, glow, glowBase: 0.48, bulbMat, glassMat, base: 1.05 });
  }

  /* ———————————————————— 树 ———————————————————— */
  function makeTree(x, z, scale, seed, autumn) {
    const g = new THREE.Group();
    g.position.set(x, -0.15, z);
    g.scale.setScalar(scale);
    R.add(g);
    const rng = U.mulberry32(seed);
    // 树干
    const segs = [
      [0, 1.25, 0.16, 0.12, 0.0, 0.0],
      [1.2, 2.35, 0.12, 0.085, 0.06, -0.03],
      [2.3, 3.15, 0.085, 0.05, 0.18, -0.04]
    ];
    segs.forEach((s) => {
      const hh = s[1] - s[0];
      const c = new THREE.Mesh(new THREE.CylinderGeometry(s[3], s[2], hh, 8), M.bark);
      c.position.set(s[4], (s[0] + s[1]) / 2, s[5]);
      c.rotation.z = -s[4] * 0.25;
      c.castShadow = true;
      c.receiveShadow = true;
      g.add(c);
    });
    // 枝
    const branchTo = [
      [-1.3, 4.0, 0.4], [1.25, 3.85, 0.2], [-0.35, 4.65, -0.8], [0.55, 4.45, 0.9], [-0.9, 3.55, -0.6]
    ];
    branchTo.forEach((b, i) => {
      const pts = [
        new THREE.Vector3(0.14, 2.7 + i * 0.05, -0.03),
        new THREE.Vector3(b[0] * 0.4, 2.95 + (b[1] - 2.95) * 0.35, b[2] * 0.4),
        new THREE.Vector3(b[0], b[1], b[2])
      ];
      const tube = U.makeCurveTube(pts, 0.035 - i * 0.003, M.bark, 20, 5);
      g.add(tube);
    });
    // 树冠
    const blobs = [
      [0, 4.0, 0, 1.55, 0.95, 1.35],
      [1.15, 3.6, 0.35, 1.05, 0.7, 0.95],
      [-1.0, 3.65, -0.2, 1.15, 0.75, 1.0],
      [0.25, 4.55, -0.4, 0.95, 0.62, 0.85],
      [0.35, 3.15, 0.95, 0.85, 0.55, 0.75],
      [-0.5, 3.25, 0.75, 0.8, 0.5, 0.7]
    ];
    const leafGeo = new THREE.PlaneGeometry(0.58, 0.44);
    const count = 330;
    const inst = new THREE.InstancedMesh(leafGeo, M.leafGreen, count);
    inst.castShadow = false;
    inst.receiveShadow = true;
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pcol = new THREE.Color();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const blob = blobs[Math.floor(rng() * blobs.length)];
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const rad = 0.55 + rng() * 0.48;
      pos.set(
        blob[0] + Math.sin(phi) * Math.cos(theta) * blob[3] * rad,
        blob[1] + Math.cos(phi) * blob[4] * rad,
        blob[2] + Math.sin(phi) * Math.sin(theta) * blob[5] * rad
      );
      e.set(rng() * Math.PI, rng() * Math.PI * 2, rng() * Math.PI);
      q.setFromEuler(e);
      const s = 0.72 + rng() * 0.6;
      scl.set(s, s, s);
      m4.compose(pos, q, scl);
      inst.setMatrixAt(i, m4);
      const lum = 0.72 + rng() * 0.3;
      pcol.setRGB(lum, lum * (0.94 + rng() * 0.08), lum * (0.8 + rng() * 0.16));
      inst.setColorAt(i, pcol);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    g.add(inst);

    // 少量秋叶
    if (autumn) {
      const inst2 = new THREE.InstancedMesh(leafGeo, M.leafAutumn, 44);
      inst2.castShadow = false;
      for (let i = 0; i < 44; i++) {
        const blob = blobs[Math.floor(rng() * blobs.length)];
        const theta = rng() * Math.PI * 2;
        const phi = Math.acos(2 * rng() - 1);
        const rad = 0.9 + rng() * 0.15;
        pos.set(
          blob[0] + Math.sin(phi) * Math.cos(theta) * blob[3] * rad,
          blob[1] + Math.cos(phi) * blob[4] * rad,
          blob[2] + Math.sin(phi) * Math.sin(theta) * blob[5] * rad
        );
        e.set(rng() * Math.PI, rng() * Math.PI * 2, rng() * Math.PI);
        q.setFromEuler(e);
        const s = 0.7 + rng() * 0.4;
        scl.set(s, s, s);
        m4.compose(pos, q, scl);
        inst2.setMatrixAt(i, m4);
      }
      inst2.instanceMatrix.needsUpdate = true;
      g.add(inst2);
    }
    // 积雪团
    const snowGeo = new THREE.SphereGeometry(0.2, 6, 5);
    const snowInst = new THREE.InstancedMesh(snowGeo, ctx.snowMat, 34);
    for (let i = 0; i < 34; i++) {
      const blob = blobs[Math.floor(rng() * blobs.length)];
      const theta = rng() * Math.PI * 2;
      const rad = 0.5 + rng() * 0.4;
      pos.set(
        blob[0] + Math.cos(theta) * blob[3] * rad,
        blob[1] + blob[4] * (0.45 + rng() * 0.35),
        blob[2] + Math.sin(theta) * blob[5] * rad
      );
      e.set(rng(), rng() * 3, rng());
      q.setFromEuler(e);
      const s = 0.45 + rng() * 0.8;
      scl.set(s * 1.4, s * 0.45, s * 1.1);
      m4.compose(pos, q, scl);
      snowInst.setMatrixAt(i, m4);
    }
    snowInst.instanceMatrix.needsUpdate = true;
    g.add(snowInst);
    ctx.addSnow(snowInst);

    // 树池
    const grate = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.55, 24), new THREE.MeshStandardMaterial({ color: 0x3b3934, roughness: 0.7, metalness: 0.4 }));
    grate.rotation.x = -Math.PI / 2;
    grate.position.y = 0.012;
    g.add(grate);
    const soil = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), new THREE.MeshStandardMaterial({ color: 0x2f2419, roughness: 1 }));
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.008;
    g.add(soil);
  }

  /* 窗外近处的枝条，增加景深 */
  function nearBranch() {
    const g = new THREE.Group();
    R.add(g);
    const rng = U.mulberry32(717);
    const pts = [
      new THREE.Vector3(-3.0, 3.55, -4.75),
      new THREE.Vector3(-2.55, 3.25, -4.6),
      new THREE.Vector3(-1.95, 3.02, -4.5),
      new THREE.Vector3(-1.35, 2.88, -4.42)
    ];
    const branch = U.makeCurveTube(pts, 0.028, M.bark, 20, 5);
    g.add(branch);
    const twigPts = [
      new THREE.Vector3(-2.1, 3.05, -4.52),
      new THREE.Vector3(-2.2, 3.4, -4.55),
      new THREE.Vector3(-2.35, 3.62, -4.6)
    ];
    g.add(U.makeCurveTube(twigPts, 0.012, M.bark, 12, 4));
    const leafGeo = new THREE.PlaneGeometry(0.16, 0.12);
    const count = 26;
    const inst = new THREE.InstancedMesh(leafGeo, M.leafGreen, count);
    inst.castShadow = true;
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const t = 0.05 + rng() * 0.95;
      const cp = new THREE.CatmullRomCurve3(pts).getPoint(t);
      p.set(cp.x + (rng() - 0.5) * 0.22, cp.y + (rng() - 0.2) * 0.28, cp.z + (rng() - 0.5) * 0.14);
      e.set(rng() * 2, rng() * 3, rng() * 2);
      q.setFromEuler(e);
      s.setScalar(0.7 + rng() * 0.8);
      m4.compose(p, q, s);
      inst.setMatrixAt(i, m4);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false;
    g.add(inst);
    // 枝条积雪
    const snowInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 5, 4), ctx.snowMat, 16);
    for (let i = 0; i < 16; i++) {
      const t = 0.1 + (i / 16) * 0.8;
      const cp = new THREE.CatmullRomCurve3(pts).getPoint(t);
      p.set(cp.x + (rng() - 0.5) * 0.05, cp.y + 0.035 + rng() * 0.03, cp.z);
      q.setFromEuler(new THREE.Euler(0, rng() * 3, 0));
      s.set(1.1 + rng(), 0.4, 0.8);
      m4.compose(p, q, s);
      snowInst.setMatrixAt(i, m4);
    }
    snowInst.instanceMatrix.needsUpdate = true;
    g.add(snowInst);
    ctx.addSnow(snowInst);
  }

  /* ———————————————————— 远景公寓 ———————————————————— */
  function bgBlock(x, z, w, h, d, color, rows, cols, seed, roofTank) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
    const g = new THREE.Group();
    R.add(g);
    const body = SK.box(g, w, h, d, mat, x, BASE + h / 2, z - d / 2);
    // 顶部檐
    SK.box(g, w + 0.2, 0.2, d + 0.2, M.trimStone, x, BASE + h + 0.1, z - d / 2);
    snowBox(g, w + 0.1, 0.05, 0.16, x, BASE + h + 0.23, z + 0.03);
    const rng = U.mulberry32(seed);
    const gapX = w / (cols + 0.6);
    const gapY = h / (rows + 1.2);
    const frontZ = z + 0.015;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x - w / 2 + gapX * (c + 0.8);
        const wy = BASE + h - gapY * (r + 0.8) - 0.3;
        if (rng() < 0.18) continue;
        const variant = Math.floor(rng() * 6);
        const ww = gapX * 0.46;
        const wh = gapY * 0.58;
        const planeMat = M.aptMat[variant];
        const win = SK.plane(g, ww, wh, planeMat, wx, wy, frontZ);
        win.castShadow = false;
        win.receiveShadow = false;
        SK.box(g, ww + 0.1, 0.035, 0.08, M.aptFrame, wx, wy - wh / 2 - 0.03, frontZ + 0.02, false, false);
      }
    }
    // 烟囱
    if (roofTank) {
      const tank = new THREE.Group();
      tank.position.set(x + w * 0.18, BASE + h + 0.2, z - d * 0.4);
      g.add(tank);
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6), M.iron);
        leg.position.set(Math.cos(i * Math.PI / 2 + 0.4) * 0.45, 0.55, Math.sin(i * Math.PI / 2 + 0.4) * 0.45);
        tank.add(leg);
      }
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.0, 14), M.woodDark);
      barrel.position.y = 1.55;
      barrel.castShadow = true;
      tank.add(barrel);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.4, 14), M.iron);
      roof.position.y = 2.22;
      tank.add(roof);
      snowBox(tank, 0.9, 0.45, 0.9, 0, 2.35, 0);
    }
  }

  /* ———————————————————— 主构建 ———————————————————— */
  WP.StreetBuildings = {
    build(c) {
      ctx = c;
      R = c.root;
      M = c.mats;
      // 街景共享贴图 + 少量全局程序贴图（石块、树叶）
      T = Object.assign({}, c.tex, {
        stone: WP.Textures.stone,
        leaf: WP.Textures.leaf
      });

      makeCafe();
      makeFlower();
      makeBookstore();
      makeAlley(-1.92);
      makeAlley(1.92);

      // 街灯：两盏近景，一盏远点
      makeLamp(-2.92, -7.12, 1.0, true);
      makeLamp(2.9, -7.3, 0.96, true);
      makeLamp(-5.7, -14.15, 1.02, false);

      // 行道树
      makeTree(-6.2, -13.35, 1.0, 501, true);
      makeTree(4.15, -6.45, 0.9, 502, true);
      nearBranch();

      // 远处住宅与天际线：压低轮廓，让黄昏的天空从花房屋顶上方露出来
      bgBlock(-0.4, -25.0, 8.6, 4.9, 4.2, 0x6d6358, 2, 5, 801, true);
      bgBlock(-10.6, -23.0, 7.8, 7.1, 4.4, 0x5f5b55, 2, 3, 802, false);
      bgBlock(9.3, -23.5, 8.4, 6.2, 4.4, 0x6a6057, 2, 4, 803, false);
      bgBlock(1.3, -33.0, 19.0, 4.1, 2.0, 0x3e4650, 2, 8, 804, false);

      // 屋顶杂物：小天线
      const antenna = new THREE.Group();
      antenna.position.set(4.2, BASE + 6.1 + 1.2, -18.2);
      R.add(antenna);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 2.4, 6), M.iron);
      mast.position.y = 0;
      antenna.add(mast);
      for (let i = 0; i < 3; i++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8 - i * 0.16, 4), M.iron);
        bar.rotation.z = Math.PI / 2;
        bar.position.y = -0.4 + i * 0.5;
        antenna.add(bar);
      }
      snowBox(antenna, 0.06, 0.03, 0.06, 0, 1.22, 0);

      // 屋檐下的燕子灯串（对街）
      const stringMat = new THREE.MeshStandardMaterial({ color: 0x2b2922, roughness: 0.8 });
      const c1 = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-6.7, BASE + 5.1, -16.22),
        new THREE.Vector3(-4.4, BASE + 4.92, -16.18),
        new THREE.Vector3(-2.42, BASE + 5.08, -16.22)
      );
      R.add(new THREE.Mesh(new THREE.TubeGeometry(c1, 26, 0.004, 4, false), stringMat));
      const c2 = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(2.4, BASE + 5.35, -16.22),
        new THREE.Vector3(4.6, BASE + 5.18, -16.18),
        new THREE.Vector3(6.62, BASE + 5.34, -16.22)
      );
      R.add(new THREE.Mesh(new THREE.TubeGeometry(c2, 26, 0.004, 4, false), stringMat));
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd8a6 });
      [c1, c2].forEach((curve) => {
        for (let i = 0; i <= 10; i++) {
          const p = curve.getPoint(i / 10);
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), bulbMat);
          b.position.copy(p).add(new THREE.Vector3(0, -0.045, 0));
          R.add(b);
        }
      });

      // 让建筑在光里有细微的呼吸（窗光闪烁）
      c.addUpdate((dt, t, st) => {
        // 猫影偶尔动一动
      });
    }
  };
})();
